export function usePlayerCrossfadeRuntime(options) {
  const {
    getCrossfadeRafId,
    setCrossfadeRafId,
    getActiveAudio,
    getIdleAudio,
    getVolume,
    getCrossfadeCoverState,
    setCrossfadeCoverState,
    setCrossfadeActive,
    setCrossfadeVisualActive,
    flipActiveDeck,
    syncCurrentTimeMs,
    onCrossfadeCompleted,
    setupMediaSessionHandlers,
    startRhythmLoop,
    updateMediaSessionPlaybackState,
    requestAutomixWarmup,
    resetTriggeredSong,
    onResumePlayFailed,
    debugCrossfade,
    log,
  } = options

  function clearCrossfadeCoverSoon() {
    window.setTimeout(() => {
      setCrossfadeCoverState({ progress: 0, url: '', isVideo: false })
    }, 120)
  }

  function stopCrossfade({ keepCoverOverlay = false } = {}) {
    const rafId = getCrossfadeRafId()
    if (rafId) {
      cancelAnimationFrame(rafId)
      setCrossfadeRafId(0)
    }

    const active = getActiveAudio()
    const idle = getIdleAudio()
    if (idle) {
      idle.pause()
      idle.playbackRate = 1
      idle.removeAttribute('src')
      idle.load()
    }
    if (active) {
      active.volume = getVolume()
    }

    if (!keepCoverOverlay) {
      setCrossfadeCoverState({ progress: 0, url: '', isVideo: false })
    }

    setCrossfadeActive(false)
    setCrossfadeVisualActive(false)
  }

  function completeCrossfadeByDeckSwap({
    fromTrackId,
    toTrackId,
    mixOutStart,
    mixInStart,
    crossfadeDuration,
    promotedStartSec,
  }) {
    const oldActive = getActiveAudio()
    flipActiveDeck()
    const newActive = getActiveAudio()

    if (newActive) {
      newActive.volume = getVolume()
      syncCurrentTimeMs(Math.floor((newActive.currentTime || 0) * 1000))
    }

    if (oldActive) {
      oldActive.pause()
      oldActive.removeAttribute('src')
      oldActive.load()
    }

    setCrossfadeActive(false)
    setCrossfadeVisualActive(false)
    clearCrossfadeCoverSoon()

    onCrossfadeCompleted()
    setupMediaSessionHandlers()
    startRhythmLoop()
    updateMediaSessionPlaybackState()
    requestAutomixWarmup('crossfade-complete')
    resetTriggeredSong()

    if (newActive?.paused) {
      newActive.play().catch(() => {
        onResumePlayFailed()
      })
    }

    debugCrossfade('completeCrossfadeByDeckSwap', {
      fromTrackId,
      toTrackId,
      promotedStartSec,
      mixInStart,
      mixOutStart,
      crossfadeDuration,
      newActiveCurrentTime: Number(newActive?.currentTime || 0).toFixed(3),
    })

    log('[Automix] crossfade complete', {
      fromTrackId,
      toTrackId,
      mixOutStart,
      mixInStart,
      crossfadeDuration,
      promotedStartSec,
    })
  }

  return {
    stopCrossfade,
    clearCrossfadeCoverSoon,
    completeCrossfadeByDeckSwap,
  }
}
