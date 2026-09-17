import {ANALYZER_STATUS, AUTOMIX_STATE} from '@/audio/constants.js'
import {audioAnalyzer} from '@/audio/analysis/AudioAnalyzer.js'
import {transitionRegistry} from '@/audio/transitions/index.js'
import {getAudioCapabilities} from '@/audio/utils/getAudioCapabilities.js'

function trackIdOf(track) {
  return String(track?.id || '').trim()
}

function summarizeProfile(profile = {}) {
  return {
    bpm: Number(profile?.bpm || 0) || null,
    energy: Number(profile?.energy || 0) || null,
    beatConfidence: Number(profile?.confidence?.beat_grid || 0) || 0,
    analysisConfidence: Number(profile?.confidence?.overall || 0) || 0,
  }
}

function createAbortError() {
  if (typeof DOMException !== 'undefined') return new DOMException('Analysis aborted', 'AbortError')
  const error = new Error('Analysis aborted')
  error.name = 'AbortError'
  return error
}

export class AutoMixEngine {
  constructor({analyzer = audioAnalyzer} = {}) {
    this.analyzer = analyzer
    this.enabled = false
    this.state = AUTOMIX_STATE.IDLE
    this.currentTrackId = ''
    this.queueSignature = ''
    this.currentTransition = null
    this.analysisTasks = new Map()
    this.listeners = new Set()
    this.capabilities = getAudioCapabilities()
    this.debug = {
      analyzerStatus: ANALYZER_STATUS.IDLE,
      analyzerRole: '',
      current: summarizeProfile(),
      next: summarizeProfile(),
      transitionType: '',
      transitionFamily: '',
      transitionScore: 0,
      playbackRate: 1,
      duration: 0,
      lastFallback: '',
      lastError: '',
    }
  }

  snapshot() {
    return {
      enabled: this.enabled,
      state: this.state,
      currentTrackId: this.currentTrackId,
      currentTransition: this.currentTransition ? {...this.currentTransition} : null,
      capabilities: {...this.capabilities},
      debug: {
        ...this.debug,
        current: {...this.debug.current},
        next: {...this.debug.next},
      },
    }
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {}
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => this.listeners.delete(listener)
  }

  init() {
    this.capabilities = getAudioCapabilities({refresh: true})
    this.emit()
    return this.snapshot()
  }

  emit() {
    const snapshot = this.snapshot()
    for (const listener of this.listeners) listener(snapshot)
  }

  setState(state) {
    if (!Object.values(AUTOMIX_STATE).includes(state) || this.state === state) return
    this.state = state
    this.emit()
  }

  enable() {
    this.enabled = true
    this.setState(this.currentTrackId ? AUTOMIX_STATE.PLAYING : AUTOMIX_STATE.IDLE)
    this.emit()
  }

  disable() {
    this.enabled = false
    this.cancelAnalysis()
    this.currentTransition = null
    this.debug.transitionType = ''
    this.debug.transitionFamily = ''
    this.setState(AUTOMIX_STATE.IDLE)
    this.emit()
  }

  setQueue(queue = []) {
    const signature = (Array.isArray(queue) ? queue : [])
      .map(track => `${trackIdOf(track)}:${String(track?.queueEntryId || '')}`)
      .join('|')
    if (signature === this.queueSignature) return
    this.queueSignature = signature
    this.cancelAnalysis(role => role.startsWith('next'))
    this.currentTransition = null
    this.debug.next = summarizeProfile()
    this.debug.transitionType = ''
    this.debug.transitionFamily = ''
    this.setState(this.enabled && this.currentTrackId ? AUTOMIX_STATE.PLAYING : AUTOMIX_STATE.IDLE)
    this.emit()
  }

  setCurrentTrack(track) {
    const nextId = trackIdOf(track)
    if (nextId === this.currentTrackId) return
    this.currentTrackId = nextId
    this.cancelAnalysis()
    this.currentTransition = null
    this.debug.current = summarizeProfile(track?.mixProfile)
    this.debug.next = summarizeProfile()
    this.debug.transitionType = ''
    this.debug.transitionFamily = ''
    this.debug.lastError = ''
    this.setState(this.enabled && nextId ? AUTOMIX_STATE.PLAYING : AUTOMIX_STATE.IDLE)
    this.emit()
  }

  async analyzeTrack(track, audioUrl, {role = 'next-1', quality = 'exhigh'} = {}) {
    if (!this.enabled) throw createAbortError()
    const trackId = trackIdOf(track)
    if (!trackId || !audioUrl) return null

    const existing = this.analysisTasks.get(role)
    if (existing?.trackId === trackId) return existing.promise
    existing?.controller.abort()

    const controller = new AbortController()
    const task = {trackId, controller, promise: null}
    const updateStatus = (status, detail = {}) => {
      if (this.analysisTasks.get(role) !== task) return
      this.debug.analyzerStatus = status
      this.debug.analyzerRole = role
      if (detail?.fallback) this.debug.lastFallback = String(detail.fallback)
      if (status === ANALYZER_STATUS.LOADING
        || status === ANALYZER_STATUS.DECODING
        || status === ANALYZER_STATUS.ANALYZING) {
        this.setState(AUTOMIX_STATE.PREPARING)
      }
      this.emit()
    }

    task.promise = this.analyzer.analyze(track, audioUrl, {
      quality,
      signal: controller.signal,
      onStatus: updateStatus,
    }).then((profile) => {
      if (controller.signal.aborted || this.analysisTasks.get(role) !== task) throw createAbortError()
      if (role === 'current') this.debug.current = summarizeProfile(profile)
      else if (role === 'next-1') this.debug.next = summarizeProfile(profile)
      this.debug.analyzerStatus = ANALYZER_STATUS.COMPLETE
      this.debug.lastError = ''
      this.setState(role === 'current' ? AUTOMIX_STATE.PLAYING : AUTOMIX_STATE.READY)
      this.emit()
      return profile
    }).catch((error) => {
      if (error?.name === 'AbortError') {
        if (this.analysisTasks.get(role) === task) {
          this.debug.analyzerStatus = ANALYZER_STATUS.ABORTED
          this.emit()
        }
        throw error
      }
      this.debug.analyzerStatus = ANALYZER_STATUS.ERROR
      this.debug.lastError = String(error?.message || error || 'analysis failed')
      this.debug.lastFallback = 'crossfade'
      this.setState(AUTOMIX_STATE.ERROR)
      this.emit()
      throw error
    }).finally(() => {
      if (this.analysisTasks.get(role) === task) this.analysisTasks.delete(role)
    })

    this.analysisTasks.set(role, task)
    return task.promise
  }

  prepareNextTrack(track, audioUrl, options = {}) {
    return this.analyzeTrack(track, audioUrl, {...options, role: options.role || 'next-1'})
  }

  planTransition(plan = {}) {
    this.setTransitionPlan(plan)
    return this.currentTransition
  }

  async scheduleTransition(transition, scheduler) {
    if (typeof scheduler !== 'function') throw new TypeError('Transition scheduler is required')
    this.startTransition(transition)
    try {
      return await scheduler(transition)
    } catch (error) {
      this.cancelTransition('scheduler-error')
      throw error
    }
  }

  setTransitionPlan({transition, score, currentTrack, nextTrack} = {}) {
    if (!transition || typeof transition !== 'object') return
    const plugin = transitionRegistry.get(transition.kind)
    this.currentTransition = {...transition}
    this.debug.current = summarizeProfile(currentTrack)
    this.debug.next = summarizeProfile(nextTrack)
    this.debug.transitionType = String(transition.kind || 'safe_fade')
    this.debug.transitionFamily = String(plugin?.family || 'crossfade')
    this.debug.transitionScore = Number(score?.total || transition?.confidence || 0)
    this.debug.playbackRate = Number(transition?.incoming_rate || 1)
    this.debug.duration = Number(transition?.crossfade_duration || 0)
    this.debug.lastFallback = Array.isArray(transition?.reason_codes)
      && transition.reason_codes.includes('complex_mix_rejected')
      ? 'low-confidence'
      : ''
    if (this.enabled) this.setState(AUTOMIX_STATE.READY)
    this.emit()
  }

  startTransition(transition = this.currentTransition) {
    if (!this.enabled) return
    if (transition) this.currentTransition = {...transition}
    this.setState(AUTOMIX_STATE.TRANSITIONING)
    this.emit()
  }

  completeTransition() {
    this.currentTransition = null
    this.setState(this.enabled ? AUTOMIX_STATE.PLAYING : AUTOMIX_STATE.IDLE)
    this.emit()
  }

  cancelTransition(reason = 'cancelled') {
    this.debug.lastFallback = reason
    this.currentTransition = null
    this.setState(this.enabled ? AUTOMIX_STATE.PLAYING : AUTOMIX_STATE.IDLE)
    this.emit()
  }

  pause() {
    this.setState(AUTOMIX_STATE.PAUSED)
  }

  resume() {
    if (this.enabled && this.state === AUTOMIX_STATE.PAUSED) this.setState(AUTOMIX_STATE.PLAYING)
  }

  play() {
    this.resume()
  }

  async skip(handler) {
    this.cancelAnalysis(role => role.startsWith('next'))
    this.cancelTransition('manual-skip')
    return typeof handler === 'function' ? handler() : false
  }

  cancelAnalysis(predicate = null) {
    for (const [role, task] of this.analysisTasks) {
      if (predicate && !predicate(role, task)) continue
      task.controller.abort()
      this.analysisTasks.delete(role)
    }
  }

  destroy() {
    this.cancelAnalysis()
    this.listeners.clear()
    this.analyzer.destroy()
    this.enabled = false
    this.currentTrackId = ''
    this.currentTransition = null
    this.state = AUTOMIX_STATE.IDLE
  }
}

export const autoMixEngine = new AutoMixEngine()
