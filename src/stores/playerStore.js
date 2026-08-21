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
  state: () => ({
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
    playQueue: [],
    currentQueueIndex: -1,
    playMode: PLAY_MODE.SEQUENCE,
    playlistPanelOpen: false,
    automixEnabled: true,
    lyricTranslateEnabled: false,
  }),

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
    },

    setPlaying(value) {
      this.isPlaying = Boolean(value)
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
        return
      }

      const nextIndex = Number(startIndex)
      if (Number.isInteger(nextIndex) && nextIndex >= 0 && nextIndex < normalized.length) {
        this.currentQueueIndex = nextIndex
        return
      }

      this.currentQueueIndex = 0
    },

    setCurrentQueueIndex(index) {
      const nextIndex = Number(index)
      if (!Number.isInteger(nextIndex)) return
      if (nextIndex < 0 || nextIndex >= this.playQueue.length) return
      this.currentQueueIndex = nextIndex
    },

    syncQueueIndexBySongId(songId) {
      const id = String(songId || '')
      if (!id || !this.playQueue.length) return
      const nextIndex = this.playQueue.findIndex(item => String(item.id) === id)
      if (nextIndex >= 0) this.currentQueueIndex = nextIndex
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

      return true
    },

    clearQueueExceptCurrent() {
      if (!this.playQueue.length) {
        this.currentQueueIndex = -1
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
      return removedCount
    },

    setPlayMode(mode) {
      const allow = [PLAY_MODE.SEQUENCE, PLAY_MODE.SINGLE, PLAY_MODE.SHUFFLE]
      if (!allow.includes(mode)) return
      this.playMode = mode
    },

    cyclePlayMode() {
      const order = [PLAY_MODE.SEQUENCE, PLAY_MODE.SINGLE, PLAY_MODE.SHUFFLE]
      const current = order.indexOf(this.playMode)
      const nextIndex = current < 0 ? 0 : (current + 1) % order.length
      this.playMode = order[nextIndex]
    },

    setPlaylistPanelOpen(value) {
      this.playlistPanelOpen = Boolean(value)
    },

    togglePlaylistPanel() {
      this.playlistPanelOpen = !this.playlistPanelOpen
    },

    setAutomixEnabled(value) {
      this.automixEnabled = Boolean(value)
    },

    toggleAutomixEnabled() {
      this.automixEnabled = !this.automixEnabled
    },

    setLyricTranslateEnabled(value) {
      this.lyricTranslateEnabled = Boolean(value)
    },

    toggleLyricTranslateEnabled() {
      this.lyricTranslateEnabled = !this.lyricTranslateEnabled
    },
  },

  persist: {
    key: 'global-player-store',
    storage: localStorage,
    paths: [
      'currentSong',
      'volume',
      'playQueue',
      'currentQueueIndex',
      'playMode',
      'automixEnabled',
      'lyricTranslateEnabled',
    ],
    afterHydrate(ctx) {
      ctx.store.isPlaying = false
      ctx.store.autoPlayOnLoad = false
      ctx.store.playQueue = ensureQueueEntryIds(ctx.store.playQueue)
    },
  },
})
