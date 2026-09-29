import {acceptHMRUpdate, defineStore} from 'pinia'
import {readPlaybackPosition, writePlaybackPosition} from '@/utils/player/playbackPosition.js'
import {normalizeAudioQuality} from '@/utils/player/audioQuality.js'

export const PLAY_MODE = {
  SEQUENCE: 'sequence',
  SINGLE: 'single',
  SHUFFLE: 'shuffle',
}

let queueEntrySequence = 0

function createQueueEntryId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    try {
      return `queue-${globalThis.crypto.randomUUID()}`
    } catch {
      // Fall through to the browser-compatible fallback below.
    }
  }

  // 🔧 防止内存泄漏：每 100 万次重置计数器
  if (queueEntrySequence > 1_000_000) {
    queueEntrySequence = 0
  }

  queueEntrySequence += 1
  const timestamp = Date.now().toString(36)
  const sequence = queueEntrySequence.toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `queue-${timestamp}-${sequence}-${random}`
}

function claimQueueEntryId(candidate, usedIds) {
  const requestedId = String(candidate || '').trim()
  let queueEntryId = requestedId

  while (!queueEntryId || usedIds.has(queueEntryId)) {
    queueEntryId = createQueueEntryId()
  }

  usedIds.add(queueEntryId)
  return queueEntryId
}

function ensureQueueEntryIds(queue = []) {
  const usedIds = new Set()
  return (Array.isArray(queue) ? queue : []).map(item => ({
    ...(item && typeof item === 'object' ? item : {}),
    queueEntryId: claimQueueEntryId(item?.queueEntryId, usedIds),
  }))
}

const PLAYER_STORAGE_KEY = 'global-player-store'
let volumePersistTimer = 0
const positionPersistTimes = new WeakMap()

function createDefaultPlayerState() {
  return {
    currentSong: {
      id: null,
      name: '',
      artists: [],
      cover: '',
      url: '',
      qualityLevel: '',
    },
    isPlaying: false,
    currentTimeMs: 0,
    durationMs: 0,
    pendingResumeMs: null,
    volume: 0.85,
    audioQuality: 'exhigh',
    autoPlayOnLoad: false,
    playbackPendingId: null,
    playQueue: [],
    currentQueueIndex: -1,
    playMode: PLAY_MODE.SEQUENCE,
    playlistPanelOpen: false,
    automixEnabled: true,
    automixStatus: 'IDLE',
    currentTransition: null,
    automixCapabilities: {},
    automixDebug: {
      analyzerStatus: 'idle',
      analyzerRole: '',
      current: {},
      next: {},
      transitionType: '',
      transitionFamily: '',
      transitionScore: 0,
      playbackRate: 1,
      duration: 0,
      lastFallback: '',
      lastError: '',
    },
    lyricTranslateEnabled: false,
  }
}

function createInitialPlayerState() {
  const defaults = createDefaultPlayerState()
  if (typeof localStorage === 'undefined') return defaults

  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY)
    if (!raw) return defaults
    const saved = JSON.parse(raw)
    const playQueue = ensureQueueEntryIds(saved?.playQueue)
    const storedIndex = Number(saved?.currentQueueIndex)
    const currentQueueIndex = Number.isInteger(storedIndex)
      && storedIndex >= 0
      && storedIndex < playQueue.length
      ? storedIndex
      : (playQueue.length ? 0 : -1)
    const volume = Number(saved?.volume)
    const position = readPlaybackPosition(saved?.currentSong?.id)

    return {
      ...defaults,
      ...(position || {}),
      pendingResumeMs: position?.currentTimeMs > 0 ? position.currentTimeMs : null,
      currentSong: saved?.currentSong && typeof saved.currentSong === 'object'
        ? {...defaults.currentSong, ...saved.currentSong}
        : defaults.currentSong,
      volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : defaults.volume,
      audioQuality: normalizeAudioQuality(saved?.audioQuality),
      playQueue,
      currentQueueIndex,
      playMode: Object.values(PLAY_MODE).includes(saved?.playMode)
        ? saved.playMode
        : defaults.playMode,
      automixEnabled: saved?.automixEnabled !== false,
      lyricTranslateEnabled: Boolean(saved?.lyricTranslateEnabled),
    }
  } catch {
    return defaults
  }
}

function persistPlayerState(store) {
  if (typeof localStorage === 'undefined') return
  if (volumePersistTimer) {
    clearTimeout(volumePersistTimer)
    volumePersistTimer = 0
  }

  try {
    store.persistPlaybackPosition()
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify({
      currentSong: store.currentSong,
      volume: store.volume,
      audioQuality: store.audioQuality,
      playQueue: store.playQueue,
      currentQueueIndex: store.currentQueueIndex,
      playMode: store.playMode,
      automixEnabled: store.automixEnabled,
      lyricTranslateEnabled: store.lyricTranslateEnabled,
    }))
  } catch {
    // Storage can be unavailable in privacy mode; playback should keep working.
  }
}

function persistVolumeLater(store) {
  if (typeof window === 'undefined') return
  if (volumePersistTimer) clearTimeout(volumePersistTimer)
  volumePersistTimer = window.setTimeout(() => {
    volumePersistTimer = 0
    persistPlayerState(store)
  }, 160)
}

function normalizeCoverUrlProtocol(url = '') {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (raw.startsWith('//')) return `https:${raw}`
  return raw.replace(/^http:\/\//i, 'https://')
}

function normalizeOptionalNumber(value, {min = -Infinity, max = Infinity} = {}) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max ? number : null
}

function normalizeQueueItem(song, usedQueueEntryIds = new Set()) {
  const songDurationSec = Number(song?.dt) / 1000
  const durationCandidate = song?.mixProfile?.duration ?? song?.duration ?? songDurationSec
  const durationSecRaw = Number(durationCandidate)
  const durationSec = Number.isFinite(durationSecRaw) ? Math.max(0, durationSecRaw) : 0
  const introEndRaw = Number(song?.mixProfile?.intro_end ?? song?.intro_end)
  const outroStartRaw = Number(song?.mixProfile?.outro_start ?? song?.outro_start)

  const mixProfile = {
    bpm: normalizeOptionalNumber(song?.mixProfile?.bpm ?? song?.bpm ?? song?.audioFeatures?.bpm, {min: 40, max: 240}),
    key: {
      tonic: normalizeOptionalNumber(song?.mixProfile?.key?.tonic ?? song?.key?.tonic ?? song?.audioFeatures?.key?.tonic, {min: 0, max: 11}),
      mode: String((song?.mixProfile?.key?.mode ?? song?.key?.mode ?? song?.audioFeatures?.key?.mode) || '').toLowerCase(),
    },
    energy: normalizeOptionalNumber(song?.mixProfile?.energy ?? song?.energy ?? song?.audioFeatures?.energy, {min: 0, max: 1}),
    duration: durationSec,
    intro_end: Number.isFinite(introEndRaw) && introEndRaw > 0 ? Math.max(0, introEndRaw) : null,
    outro_start: Number.isFinite(outroStartRaw) && outroStartRaw > 0 ? Math.max(0, outroStartRaw) : null,
    beat_positions: Array.isArray(song?.mixProfile?.beat_positions) ? song.mixProfile.beat_positions : [],
    downbeat_positions: Array.isArray(song?.mixProfile?.downbeat_positions) ? song.mixProfile.downbeat_positions : [],
    section_segments: Array.isArray(song?.mixProfile?.section_segments) ? song.mixProfile.section_segments : [],
    energy_curve: Array.isArray(song?.mixProfile?.energy_curve) ? song.mixProfile.energy_curve : [],
    vocal_regions: Array.isArray(song?.mixProfile?.vocal_regions) ? song.mixProfile.vocal_regions : [],
    mix_regions: Array.isArray(song?.mixProfile?.mix_regions) ? song.mixProfile.mix_regions : [],
    loudness_lufs: normalizeOptionalNumber(song?.mixProfile?.loudness_lufs, {min: -80, max: 3}),
    peak_dbfs: normalizeOptionalNumber(song?.mixProfile?.peak_dbfs, {min: -120, max: 6}),
    confidence: song?.mixProfile?.confidence && typeof song.mixProfile.confidence === 'object'
      ? {...song.mixProfile.confidence}
      : {},
    analysis_version: normalizeOptionalNumber(song?.mixProfile?.analysis_version, {min: 1, max: 100000}),
    album_id: song?.mixProfile?.album_id ?? song?.album?.id ?? song?.al?.id ?? null,
    tags: Array.isArray(song?.mixProfile?.tags) ? [...song.mixProfile.tags] : [],
  }

  return {
    queueEntryId: claimQueueEntryId(song?.queueEntryId, usedQueueEntryIds),
    id: song?.id ?? null,
    name: song?.name || '',
    artists: song?.artists || song?.ar || [],
    cover: normalizeCoverUrlProtocol(song?.cover || song?.coverImgUrl || song?.picUrl || song?.al?.picUrl || song?.album?.picUrl || ''),
    url: song?.url || '',
    qualityLevel: song?.qualityLevel || '',
    mixProfile,
  }
}

export const usePlayerStore = defineStore('global-player', {
  state: createInitialPlayerState,

  getters: {
    hasSong: (state) => Boolean(state.currentSong?.id && state.currentSong?.url),
    queueLength: (state) => state.playQueue.length,
  },

  actions: {
    setTrack(song, {autoplay = true, resetTime = true} = {}) {
      const sameTrack = this.currentSong.id && song?.id && String(this.currentSong.id) === String(song.id)
      const next = {
        id: song?.id ?? null,
        name: song?.name || '',
        artists: song?.artists || [],
        cover: normalizeCoverUrlProtocol(song?.cover || ''),
        url: song?.url || '',
        qualityLevel: song?.qualityLevel || (sameTrack ? this.currentSong.qualityLevel : '') || '',
        mixProfile: song?.mixProfile || null,
      }

      this.currentSong = next

      if (resetTime && !sameTrack) {
        this.currentTimeMs = 0
        this.durationMs = 0
        this.pendingResumeMs = null
      }

      this.autoPlayOnLoad = autoplay
      if (!autoplay) {
        this.isPlaying = false
      }
      persistPlayerState(this)
    },

    setAudioQuality(level) {
      const next = normalizeAudioQuality(level)
      if (next === this.audioQuality) return
      this.audioQuality = next
      persistPlayerState(this)
    },

    setCurrentSongQualityLevel(level) {
      if (!this.currentSong?.id) return
      this.currentSong.qualityLevel = level || ''
      persistPlayerState(this)
    },

    setCurrentSongSource(url, qualityLevel, {resumeMs = 0, autoplay = false} = {}) {
      if (!this.currentSong?.id || !url) return false
      this.pendingResumeMs = Math.max(0, Number(resumeMs) || 0)
      this.autoPlayOnLoad = Boolean(autoplay)
      this.currentSong = {...this.currentSong, url, qualityLevel: qualityLevel || ''}
      if (!autoplay) this.isPlaying = false
      persistPlayerState(this)
      return true
    },

    setPlaying(value) {
      this.isPlaying = Boolean(value)
      if (!this.isPlaying) this.persistPlaybackPosition()
    },

    setPlaybackPendingId(songId) {
      const id = Number(songId)
      this.playbackPendingId = Number.isFinite(id) && id > 0 ? id : null
    },

    setCurrentTimeMs(value) {
      if (this.pendingResumeMs !== null) return
      const ms = Number(value)
      this.currentTimeMs = Number.isFinite(ms) ? Math.max(0, ms) : 0
      if (Date.now() - (positionPersistTimes.get(this) || 0) >= 3000) this.persistPlaybackPosition()
    },

    persistPlaybackPosition() {
      writePlaybackPosition(this.currentSong?.id, this.pendingResumeMs ?? this.currentTimeMs, this.durationMs)
      positionPersistTimes.set(this, Date.now())
    },

    setDurationMs(value) {
      const ms = Number(value)
      if (this.pendingResumeMs !== null && !(ms > 0)) return
      this.durationMs = Number.isFinite(ms) ? Math.max(0, ms) : 0
    },

    setVolume(value) {
      const v = Number(value)
      if (!Number.isFinite(v)) return
      this.volume = Math.min(1, Math.max(0, v))
      persistVolumeLater(this)
    },

    setQueue(queue = [], {startIndex = 0} = {}) {
      const usedQueueEntryIds = new Set()
      const normalized = Array.isArray(queue)
        ? queue
            .map(song => normalizeQueueItem(song, usedQueueEntryIds))
            .filter(item => Number.isFinite(Number(item.id)) && Number(item.id) > 0)
        : []
      this.playQueue = normalized

      if (!normalized.length) {
        this.currentQueueIndex = -1
        persistPlayerState(this)
        return
      }

      const nextIndex = Number(startIndex)
      if (Number.isInteger(nextIndex) && nextIndex >= 0 && nextIndex < normalized.length) {
        this.currentQueueIndex = nextIndex
        persistPlayerState(this)
        return
      }

      this.currentQueueIndex = 0
      persistPlayerState(this)
    },

    setCurrentQueueIndex(index) {
      const nextIndex = Number(index)
      if (!Number.isInteger(nextIndex)) return
      if (nextIndex < 0 || nextIndex >= this.playQueue.length) return
      this.currentQueueIndex = nextIndex
      persistPlayerState(this)
    },

    setSongMixProfile(songId, mixProfile) {
      const id = String(songId || '').trim()
      if (!id || !mixProfile || typeof mixProfile !== 'object') return false
      let updated = false
      this.playQueue = this.playQueue.map((song) => {
        if (String(song?.id || '') !== id) return song
        updated = true
        return {...song, mixProfile: {...mixProfile}}
      })
      if (String(this.currentSong?.id || '') === id) {
        this.currentSong = {...this.currentSong, mixProfile: {...mixProfile}}
        updated = true
      }
      return updated
    },

    syncQueueIndexBySongId(songId) {
      const id = String(songId || '')
      if (!id || !this.playQueue.length) return
      const nextIndex = this.playQueue.findIndex(item => String(item.id) === id)
      if (nextIndex >= 0) {
        this.currentQueueIndex = nextIndex
        persistPlayerState(this)
      }
    },

    removeQueueEntry(queueEntryId) {
      const targetEntryId = String(queueEntryId || '').trim()
      if (!targetEntryId || !this.playQueue.length) return false

      const targetIndex = this.playQueue.findIndex(
        item => String(item?.queueEntryId || '') === targetEntryId,
      )
      if (targetIndex < 0) return false

      const storedCurrentIndex = Number(this.currentQueueIndex)
      const hasValidCurrentIndex =
        Number.isInteger(storedCurrentIndex) &&
        storedCurrentIndex >= 0 &&
        storedCurrentIndex < this.playQueue.length
      const inferredCurrentIndex = hasValidCurrentIndex
        ? storedCurrentIndex
        : this.playQueue.findIndex(
            item => String(item?.id || '') === String(this.currentSong?.id || ''),
          )

      if (targetIndex === inferredCurrentIndex) return false

      this.playQueue.splice(targetIndex, 1)

      if (inferredCurrentIndex >= 0) {
        this.currentQueueIndex =
          targetIndex < inferredCurrentIndex
            ? inferredCurrentIndex - 1
            : inferredCurrentIndex
      } else if (!this.playQueue.length) {
        this.currentQueueIndex = -1
      }

      persistPlayerState(this)
      return true
    },

    clearQueueExceptCurrent() {
      if (!this.playQueue.length) {
        this.currentQueueIndex = -1
        persistPlayerState(this)
        return 0
      }

      const storedCurrentIndex = Number(this.currentQueueIndex)
      const hasValidCurrentIndex =
        Number.isInteger(storedCurrentIndex) &&
        storedCurrentIndex >= 0 &&
        storedCurrentIndex < this.playQueue.length
      const currentIndex = hasValidCurrentIndex
        ? storedCurrentIndex
        : this.playQueue.findIndex(
            item => String(item?.id || '') === String(this.currentSong?.id || ''),
          )

      if (currentIndex < 0) return 0

      const currentEntry = this.playQueue[currentIndex]
      const removedCount = this.playQueue.length - 1
      this.playQueue = [currentEntry]
      this.currentQueueIndex = 0
      persistPlayerState(this)
      return removedCount
    },

    setPlayMode(mode) {
      const allow = [PLAY_MODE.SEQUENCE, PLAY_MODE.SINGLE, PLAY_MODE.SHUFFLE]
      if (!allow.includes(mode)) return
      this.playMode = mode
      persistPlayerState(this)
    },

    cyclePlayMode() {
      const order = [PLAY_MODE.SEQUENCE, PLAY_MODE.SINGLE, PLAY_MODE.SHUFFLE]
      const current = order.indexOf(this.playMode)
      const nextIndex = current < 0 ? 0 : (current + 1) % order.length
      this.playMode = order[nextIndex]
      persistPlayerState(this)
    },

    setPlaylistPanelOpen(value) {
      this.playlistPanelOpen = Boolean(value)
    },

    togglePlaylistPanel() {
      this.playlistPanelOpen = !this.playlistPanelOpen
    },

    setAutomixEnabled(value) {
      this.automixEnabled = Boolean(value)
      persistPlayerState(this)
    },

    toggleAutomixEnabled() {
      this.automixEnabled = !this.automixEnabled
      persistPlayerState(this)
    },

    setAutomixRuntimeSnapshot(snapshot = {}) {
      this.automixStatus = String(snapshot?.state || 'IDLE')
      this.currentTransition = snapshot?.currentTransition
        ? {...snapshot.currentTransition}
        : null
      this.automixCapabilities = snapshot?.capabilities
        ? {...snapshot.capabilities}
        : {}
      this.automixDebug = snapshot?.debug
        ? {
            ...snapshot.debug,
            current: {...snapshot.debug.current},
            next: {...snapshot.debug.next},
          }
        : {...this.automixDebug}
    },

    setLyricTranslateEnabled(value) {
      this.lyricTranslateEnabled = Boolean(value)
      persistPlayerState(this)
    },

    toggleLyricTranslateEnabled() {
      this.lyricTranslateEnabled = !this.lyricTranslateEnabled
      persistPlayerState(this)
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(usePlayerStore, import.meta.hot))
}
