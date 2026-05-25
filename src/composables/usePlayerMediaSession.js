export function usePlayerMediaSession(options) {
  const {
    getSongName,
    getArtistNames,
    getAlbumName,
    getArtworkSrc,
    getHasSong,
    getIsPlaying,
    getDurationMs,
    getCurrentTimeMs,
    getPlayQueueLength,
    getCanPlayPrev,
    getCanPlayNext,
    playPrev,
    playNext,
    getActiveAudio,
    onPlayFailed,
    onPause,
    setCurrentTimeMs,
  } = options

  let mediaSessionHandlersBound = false
  let mediaSessionPositionUpdateTimer = 0

  function updateMediaSessionMetadata() {
    if (typeof navigator === 'undefined') return
    if (!('mediaSession' in navigator)) return
    const title = getSongName() || '未在播放'
    const artist = getArtistNames().join(' / ')
    const artworkSrc = getArtworkSrc()
    if (typeof window.MediaMetadata !== 'function') return
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title,
        artist,
        album: getAlbumName() || '',
        artwork: artworkSrc
          ? [
            { src: artworkSrc, sizes: '96x96' },
            { src: artworkSrc, sizes: '128x128' },
            { src: artworkSrc, sizes: '192x192' },
            { src: artworkSrc, sizes: '256x256' },
            { src: artworkSrc, sizes: '384x384' },
            { src: artworkSrc, sizes: '512x512' },
          ]
          : [],
      })
    } catch {
      // noop
    }
  }

  function updateMediaSessionPlaybackState() {
    if (typeof navigator === 'undefined') return
    if (!('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.playbackState = getHasSong() && getIsPlaying() ? 'playing' : 'paused'
    } catch {
      // noop
    }
  }

  function updateMediaSessionPositionState() {
    if (typeof navigator === 'undefined') return
    if (!('mediaSession' in navigator)) return
    if (typeof navigator.mediaSession.setPositionState !== 'function') return
    const durationSec = Math.max(0, Number(getDurationMs() || 0) / 1000)
    const positionSec = Math.max(0, Number(getCurrentTimeMs() || 0) / 1000)
    if (!Number.isFinite(durationSec) || !Number.isFinite(positionSec)) return
    if (durationSec <= 0) return
    try {
      navigator.mediaSession.setPositionState({
        duration: durationSec,
        position: Math.min(positionSec, durationSec),
        playbackRate: 1,
      })
    } catch {
      // noop
    }
  }

  function scheduleMediaSessionPositionStateUpdate() {
    if (mediaSessionPositionUpdateTimer) return
    mediaSessionPositionUpdateTimer = window.setTimeout(() => {
      mediaSessionPositionUpdateTimer = 0
      updateMediaSessionPositionState()
    }, 800)
  }

  function clearScheduledPositionStateUpdate() {
    if (!mediaSessionPositionUpdateTimer) return
    window.clearTimeout(mediaSessionPositionUpdateTimer)
    mediaSessionPositionUpdateTimer = 0
  }

  function setupMediaSessionHandlers({ force = false } = {}) {
    if (typeof navigator === 'undefined') return
    if (!('mediaSession' in navigator)) return
    if (force && mediaSessionHandlersBound) clearMediaSessionHandlers()
    if (mediaSessionHandlersBound) return

    const setHandler = (action, handler) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        // noop
      }
    }

    const handlePrevTrack = async () => {
      if (!getPlayQueueLength()) return
      if (!getCanPlayPrev()) return
      await playPrev()
    }

    const handleNextTrack = async () => {
      if (!getPlayQueueLength()) return
      if (!getCanPlayNext()) return
      await playNext()
    }

    setHandler('play', async () => {
      const active = getActiveAudio()
      if (!active || !getHasSong()) return
      try {
        await active.play()
      } catch {
        onPlayFailed()
      }
    })

    setHandler('pause', () => {
      onPause()
      getActiveAudio()?.pause()
    })

    setHandler('previoustrack', getCanPlayPrev() ? handlePrevTrack : null)
    setHandler('nexttrack', getCanPlayNext() ? handleNextTrack : null)
    setHandler('seekbackward', null)
    setHandler('seekforward', null)
    setHandler('seekto', (details = {}) => {
      const active = getActiveAudio()
      if (!active) return
      const seekTime = Number(details.seekTime)
      if (!Number.isFinite(seekTime)) return
      active.currentTime = Math.max(0, seekTime)
      setCurrentTimeMs(Math.floor((active.currentTime || 0) * 1000))
      updateMediaSessionPositionState()
    })

    mediaSessionHandlersBound = true
  }

  function clearMediaSessionHandlers() {
    if (typeof navigator === 'undefined') return
    if (!('mediaSession' in navigator)) return
    const actions = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekbackward', 'seekforward', 'seekto']
    actions.forEach((action) => {
      try {
        navigator.mediaSession.setActionHandler(action, null)
      } catch {
        // noop
      }
    })
    mediaSessionHandlersBound = false
  }

  return {
    updateMediaSessionMetadata,
    updateMediaSessionPlaybackState,
    updateMediaSessionPositionState,
    scheduleMediaSessionPositionStateUpdate,
    clearScheduledPositionStateUpdate,
    setupMediaSessionHandlers,
    clearMediaSessionHandlers,
  }
}
