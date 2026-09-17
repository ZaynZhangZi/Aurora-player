const SILENT_GAIN = 0.0001
const MAX_LOOP_SECONDS = 12
const LOOP_SWITCH_SECONDS = 0.032
const LOOP_READY_MARGIN_SECONDS = 0.05

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function setParam(param, value, atTime) {
  param.cancelScheduledValues(atTime)
  param.setValueAtTime(value, atTime)
}

/**
 * One persistent playback deck. The HTMLAudioElement owns network streaming,
 * while this class owns the Web Audio nodes for gain, EQ, filtering and echo.
 * A deck is created once per media element to avoid duplicate source-node errors.
 */
export class Deck {
  constructor(context, media, output) {
    if (!context || !media || !output) throw new TypeError('Deck requires context, media and output')
    this.context = context
    this.media = media
    this.source = context.createMediaElementSource(media)
    this.sourceDry = context.createGain()
    this.loopSend = context.createGain()
    this.loopDelay = context.createDelay(MAX_LOOP_SECONDS)
    this.loopFeedback = context.createGain()
    this.loopWet = context.createGain()
    this.low = context.createBiquadFilter()
    this.mid = context.createBiquadFilter()
    this.high = context.createBiquadFilter()
    this.highPass = context.createBiquadFilter()
    this.lowPass = context.createBiquadFilter()
    this.dry = context.createGain()
    this.echoDelay = context.createDelay(2)
    this.echoFeedback = context.createGain()
    this.echoWet = context.createGain()
    this.gain = context.createGain()

    this.sourceDry.gain.value = 1
    this.loopSend.gain.value = 1
    this.loopDelay.delayTime.value = 2
    this.loopFeedback.gain.value = 0
    this.loopWet.gain.value = 0
    this.loopState = null
    this.onLoopCaptureInterrupted = () => {
      if (this.loopState && !this.loopState.active) this.loopState.continuous = false
    }
    this.onLoopCaptureResumed = () => {
      if (!this.loopState || this.loopState.active) return
      this.restartLoopCapture()
    }
    this.onLoopRateChange = () => {
      if (!this.loopState || this.loopState.active) return
      this.restartLoopCapture()
    }
    this.media.addEventListener('pause', this.onLoopCaptureInterrupted)
    this.media.addEventListener('seeking', this.onLoopCaptureInterrupted)
    this.media.addEventListener('waiting', this.onLoopCaptureInterrupted)
    this.media.addEventListener('emptied', this.onLoopCaptureInterrupted)
    this.media.addEventListener('seeked', this.onLoopCaptureResumed)
    this.media.addEventListener('play', this.onLoopCaptureResumed)
    this.media.addEventListener('playing', this.onLoopCaptureResumed)
    this.media.addEventListener('ratechange', this.onLoopRateChange)

    this.low.type = 'lowshelf'
    this.low.frequency.value = 180
    this.mid.type = 'peaking'
    this.mid.frequency.value = 1200
    this.mid.Q.value = 0.72
    this.high.type = 'highshelf'
    this.high.frequency.value = 6200
    this.highPass.type = 'highpass'
    this.highPass.frequency.value = 20
    this.highPass.Q.value = 0.7
    this.lowPass.type = 'lowpass'
    this.lowPass.frequency.value = this.maxCutoff
    this.lowPass.Q.value = 0.7
    this.dry.gain.value = 1
    this.echoDelay.delayTime.value = 0.36
    this.echoFeedback.gain.value = 0
    this.echoWet.gain.value = 0

    // Keep a one-bar delay line filled while the normal source is playing.
    // At a loop boundary we crossfade from the live path to the delayed path
    // and close the feedback loop. Unlike media.currentTime seeking, this path
    // remains inside Web Audio and is sample-continuous.
    this.source.connect(this.sourceDry)
    this.sourceDry.connect(this.low)
    this.source.connect(this.loopSend)
    this.loopSend.connect(this.loopDelay)
    this.loopDelay.connect(this.loopWet)
    this.loopWet.connect(this.low)
    this.loopDelay.connect(this.loopFeedback)
    this.loopFeedback.connect(this.loopDelay)
    this.low.connect(this.mid)
    this.mid.connect(this.high)
    this.high.connect(this.highPass)
    this.highPass.connect(this.lowPass)
    this.lowPass.connect(this.dry)
    this.dry.connect(this.gain)
    this.lowPass.connect(this.echoDelay)
    this.echoDelay.connect(this.echoWet)
    this.echoWet.connect(this.gain)
    this.echoDelay.connect(this.echoFeedback)
    this.echoFeedback.connect(this.echoDelay)
    this.gain.connect(output)
    this.media.volume = 1
  }

  get maxCutoff() {
    return Math.min(20000, this.context.sampleRate * 0.48)
  }

  load(url) {
    if (typeof url === 'string' && this.media.src !== url) this.media.src = url
    this.media.load()
  }

  play() {
    return this.media.play()
  }

  pause() {
    this.media.pause()
  }

  stop() {
    this.media.pause()
    this.seek(0)
  }

  seek(time) {
    const duration = Number(this.media.duration)
    const upper = Number.isFinite(duration) && duration > 0 ? duration : Number.MAX_SAFE_INTEGER
    this.media.currentTime = clamp(Number(time || 0), 0, upper)
  }

  setGain(value, atTime = this.context.currentTime) {
    setParam(this.gain.gain, Math.max(SILENT_GAIN, Number(value || 0)), atTime)
  }

  setPlaybackRate(rate) {
    this.media.playbackRate = clamp(Number(rate || 1), 0.5, 2)
    if ('preservesPitch' in this.media) this.media.preservesPitch = true
  }

  getCurrentTime() {
    return Number(this.media.currentTime || 0)
  }

  getDuration() {
    return Number(this.media.duration || 0)
  }

  get loopSourceKey() {
    return String(this.media.currentSrc || this.media.getAttribute?.('src') || this.media.src || '')
  }

  restartLoopCapture() {
    const state = this.loopState
    if (!state || state.active) return false
    const now = this.context.currentTime
    const playbackRate = clamp(Number(this.media.playbackRate || 1), 0.5, 2)
    state.capturedFromContextTime = now
    state.capturedFromMediaTime = Number(this.media.currentTime || 0)
    state.delaySeconds = Math.round(
      state.loopLength / playbackRate * this.context.sampleRate,
    ) / this.context.sampleRate
    state.sourceKey = this.loopSourceKey
    state.continuous = !this.media.paused && !this.media.seeking
    setParam(this.loopDelay.delayTime, state.delaySeconds, now)
    return state.continuous
  }

  prepareLoop(loopLengthSec) {
    const loopLength = Number(loopLengthSec)
    if (!Number.isFinite(loopLength) || loopLength < 0.5 || loopLength > MAX_LOOP_SECONDS) {
      return false
    }

    const sourceKey = this.loopSourceKey
    const sameCapture = Boolean(
      this.loopState
      && !this.loopState.active
      && this.loopState.sourceKey === sourceKey
      && Math.abs(this.loopState.loopLength - loopLength) < 0.004,
    )
    if (sameCapture) return true

    const now = this.context.currentTime
    this.resetLoop(now)
    const playbackRate = clamp(Number(this.media.playbackRate || 1), 0.5, 2)
    const delaySeconds = Math.round(
      loopLength / playbackRate * this.context.sampleRate,
    ) / this.context.sampleRate
    this.loopState = {
      active: false,
      capturedFromContextTime: now,
      capturedFromMediaTime: Number(this.media.currentTime || 0),
      continuous: !this.media.paused && !this.media.seeking,
      delaySeconds,
      loopLength,
      sourceKey,
    }
    setParam(this.loopDelay.delayTime, this.loopState.delaySeconds, now)
    return true
  }

  isLoopReady(loopLengthSec) {
    const requestedLength = Number(loopLengthSec)
    const state = this.loopState
    if (!state || state.active || !state.continuous || this.media.paused || this.media.seeking) {
      return false
    }
    if (!Number.isFinite(requestedLength) || Math.abs(state.loopLength - requestedLength) >= 0.004) {
      return false
    }
    if (state.sourceKey !== this.loopSourceKey) return false

    const contextCaptured = this.context.currentTime - state.capturedFromContextTime
    const mediaCaptured = Number(this.media.currentTime || 0) - state.capturedFromMediaTime
    return contextCaptured >= state.delaySeconds + LOOP_READY_MARGIN_SECONDS
      && mediaCaptured >= state.loopLength - LOOP_READY_MARGIN_SECONDS
  }

  activateLoop(atTime = this.context.currentTime) {
    const state = this.loopState
    if (!state || state.active || !this.isLoopReady(state.loopLength)) return false

    const now = this.context.currentTime
    const startsAt = Math.max(now, Number(atTime || now))
    const dryCurve = new Float32Array([1, 0.9239, 0.7071, 0.3827, 0])
    const wetCurve = new Float32Array([0, 0.3827, 0.7071, 0.9239, 1])

    for (const param of [
      this.sourceDry.gain,
      this.loopSend.gain,
      this.loopWet.gain,
      this.loopFeedback.gain,
    ]) {
      param.cancelScheduledValues(now)
    }
    this.sourceDry.gain.setValueAtTime(1, now)
    this.loopSend.gain.setValueAtTime(1, now)
    this.loopWet.gain.setValueAtTime(0, now)
    this.loopFeedback.gain.setValueAtTime(0, now)
    this.sourceDry.gain.setValueCurveAtTime(dryCurve, startsAt, LOOP_SWITCH_SECONDS)
    this.loopWet.gain.setValueCurveAtTime(wetCurve, startsAt, LOOP_SWITCH_SECONDS)
    this.loopSend.gain.setValueAtTime(0, startsAt)
    this.loopFeedback.gain.setValueAtTime(0.997, startsAt)
    state.active = true
    state.activatedAt = startsAt
    return true
  }

  resetLoop(atTime = this.context.currentTime) {
    const now = Math.max(this.context.currentTime, Number(atTime || this.context.currentTime))
    setParam(this.sourceDry.gain, 1, now)
    setParam(this.loopSend.gain, 1, now)
    setParam(this.loopWet.gain, 0, now)
    setParam(this.loopFeedback.gain, 0, now)
    this.loopState = null
  }

  prepare({gain = 0, low = 0, mid = 0, high = 0} = {}) {
    const now = this.context.currentTime
    this.setGain(gain, now)
    setParam(this.low.gain, Number(low || 0), now)
    setParam(this.mid.gain, Number(mid || 0), now)
    setParam(this.high.gain, Number(high || 0), now)
    setParam(this.highPass.frequency, 20, now)
    setParam(this.lowPass.frequency, this.maxCutoff, now)
    setParam(this.dry.gain, 1, now)
    setParam(this.echoWet.gain, 0, now)
    setParam(this.echoFeedback.gain, 0, now)
    this.media.volume = 1
  }

  destroy() {
    this.media.removeEventListener('pause', this.onLoopCaptureInterrupted)
    this.media.removeEventListener('seeking', this.onLoopCaptureInterrupted)
    this.media.removeEventListener('waiting', this.onLoopCaptureInterrupted)
    this.media.removeEventListener('emptied', this.onLoopCaptureInterrupted)
    this.media.removeEventListener('seeked', this.onLoopCaptureResumed)
    this.media.removeEventListener('play', this.onLoopCaptureResumed)
    this.media.removeEventListener('playing', this.onLoopCaptureResumed)
    this.media.removeEventListener('ratechange', this.onLoopRateChange)
    for (const node of [
      this.source,
      this.sourceDry,
      this.loopSend,
      this.loopDelay,
      this.loopFeedback,
      this.loopWet,
      this.low,
      this.mid,
      this.high,
      this.highPass,
      this.lowPass,
      this.dry,
      this.echoDelay,
      this.echoFeedback,
      this.echoWet,
      this.gain,
    ]) {
      try {
        node.disconnect()
      } catch {
        // Nodes may already be disconnected while the AudioContext is closing.
      }
    }
  }
}

export {SILENT_GAIN}
