import {defineStore} from 'pinia'

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

function createDefaultPlayerState() {
  return {
    currentSong: {
      id: null,
      name: '',
      artists: [],
      cover: '',
      url: '',
    },
    isPlaying: false,
    currentTimeMs: 0,
    durationMs: 0,
    volume: 0.85,
    autoPlayOnLoad: false,
    playbackPendingId: null,
    playQueue: [],
    currentQueueIndex: -1,
    playMode: PLAY_MODE.SEQUENCE,
    playlistPanelOpen: false,
    automixEnabled: true,
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

    return {
      ...defaults,
      currentSong: saved?.currentSong && typeof saved.currentSong === 'object'
        ? {...defaults.currentSong, ...saved.currentSong}
        : defaults.currentSong,
      volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : defaults.volume,
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
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify({
      currentSong: store.currentSong,
      volume: store.volume,
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

function normalizeQueueItem(song, usedQueueEntryIds = new Set()) {
  const songDurationSec = Number(song?.dt) / 1000
  const durationCandidate = song?.mixProfile?.duration ?? song?.duration ?? songDurationSec
  const durationSecRaw = Number(durationCandidate)
  const durationSec = Number.isFinite(durationSecRaw) ? Math.max(0, durationSecRaw) : 0
  const introEndRaw = Number(song?.mixProfile?.intro_end ?? song?.intro_end)
  const outroStartRaw = Number(song?.mixProfile?.outro_start ?? song?.outro_start)

  const mixProfile = {
    bpm: Number(song?.mixProfile?.bpm ?? song?.bpm ?? song?.audioFeatures?.bpm),
    key: {
      tonic: Number(song?.mixProfile?.key?.tonic ?? song?.key?.tonic ?? song?.audioFeatures?.key?.tonic),
      mode: String((song?.mixProfile?.key?.mode ?? song?.key?.mode ?? song?.audioFeatures?.key?.mode) || '').toLowerCase(),
    },
    energy: Number(song?.mixProfile?.energy ?? song?.energy ?? song?.audioFeatures?.energy),
    duration: durationSec,
    intro_end: Number.isFinite(introEndRaw) ? Math.max(0, introEndRaw) : 0,
    outro_start: Number.isFinite(outroStartRaw) ? Math.max(0, outroStartRaw) : 0,
    beat_positions: Array.isArray(song?.mixProfile?.beat_positions) ? song.mixProfile.beat_positions : [],
    section_segments: Array.isArray(song?.mixProfile?.section_segments) ? song.mixProfile.section_segments : [],
  }

  return {
    queueEntryId: claimQueueEntryId(song?.queueEntryId, usedQueueEntryIds),
    id: song?.id ?? null,
    name: song?.name || '',
    artists: song?.artists || song?.ar || [],
    cover: normalizeCoverUrlProtocol(song?.cover || song?.coverImgUrl || song?.picUrl || song?.al?.picUrl || song?.album?.picUrl || ''),
    url: song?.url || '',
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
      const next = {
        id: song?.id ?? null,
        name: song?.name || '',
        artists: song?.artists || [],
        cover: normalizeCoverUrlProtocol(song?.cover || ''),
        url: song?.url || '',
        mixProfile: song?.mixProfile || null,
      }

      const sameTrack = this.currentSong.id && next.id && String(this.currentSong.id) === String(next.id)
      this.currentSong = next

      if (resetTime && !sameTrack) {
        this.currentTimeMs = 0
      }

      this.autoPlayOnLoad = autoplay
      if (!autoplay) {
        this.isPlaying = false
      }
      persistPlayerState(this)
    },

    setPlaying(value) {
      this.isPlaying = Boolean(value)
    },

    setPlaybackPendingId(songId) {
      const id = Number(songId)
      this.playbackPendingId = Number.isFinite(id) && id > 0 ? id : null
    },

    setCurrentTimeMs(value) {
      const ms = Number(value)
      this.currentTimeMs = Number.isFinite(ms) ? Math.max(0, ms) : 0
    },

    setDurationMs(value) {
      const ms = Number(value)
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
