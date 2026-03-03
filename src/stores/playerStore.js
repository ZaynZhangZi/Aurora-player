import {defineStore} from 'pinia'

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
  }),

  getters: {
    hasSong: (state) => Boolean(state.currentSong?.id && state.currentSong?.url),
  },

  actions: {
    setTrack(song, {autoplay = true, resetTime = true} = {}) {
      const next = {
        id: song?.id ?? null,
        name: song?.name || '',
        artists: song?.artists || [],
        cover: song?.cover || '',
        url: song?.url || '',
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
  },

  persist: {
    key: 'global-player-store',
    storage: localStorage,
    paths: ['currentSong', 'volume'],
  },
})
