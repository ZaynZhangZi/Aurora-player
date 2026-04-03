import {defineStore} from 'pinia'

export const PLAY_MODE = {
  SEQUENCE: 'sequence',
  SINGLE: 'single',
  SHUFFLE: 'shuffle',
}

function normalizeQueueItem(song) {
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
    id: song?.id ?? null,
    name: song?.name || '',
    artists: song?.artists || song?.ar || [],
    cover: song?.cover || song?.coverImgUrl || song?.picUrl || song?.al?.picUrl || song?.album?.picUrl || '',
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
        cover: song?.cover || '',
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
      const normalized = Array.isArray(queue)
        ? queue
            .map(normalizeQueueItem)
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
    paths: ['currentSong', 'volume', 'playQueue', 'currentQueueIndex', 'playMode', 'automixEnabled', 'lyricTranslateEnabled'],
  },
})
