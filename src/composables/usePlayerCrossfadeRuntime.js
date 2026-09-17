export function usePlayerCrossfadeRuntime(options) {
  const {
    getCrossfadeRafId,
    setCrossfadeRafId,
    getActiveAudio,
    getIdleAudio,
    getVolume,
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
    audioGraph,
    debugCrossfade,
    log,
  } = options

  let playbackRateRelaxRafId = 0

  function stopPlaybackRateRelaxation() {
    if (!playbackRateRelaxRafId) return
    cancelAnimationFrame(playbackRateRelaxRafId)
    playbackRateRelaxRafId = 0
  }

  function relaxPlaybackRate(media, durationMs = 8000) {
    stopPlaybackRateRelaxation()
    const fromRate = Number(media?.playbackRate || 1)
    if (!media || !Number.isFinite(fromRate) || Math.abs(fromRate - 1) < 0.001) {
      if (media) media.playbackRate = 1
      return
    }

    const startedAt = performance.now()
    const step = (now) => {
      if (!media || media.paused) {
        if (media) media.playbackRate = 1
        playbackRateRelaxRafId = 0
        return
      }
      const progress = Math.min(1, Math.max(0, (now - startedAt) / durationMs))
      const eased = 1 - ((1 - progress) ** 3)
      media.playbackRate = fromRate + (1 - fromRate) * eased
      if (progress >= 1) {
        media.playbackRate = 1
        playbackRateRelaxRafId = 0
        return
      }
      playbackRateRelaxRafId = requestAnimationFrame(step)
    }
    playbackRateRelaxRafId = requestAnimationFrame(step)
  }

  function clearCrossfadeCoverSoon() {
    window.setTimeout(() => {
      setCrossfadeCoverState({ progress: 0, url: '', isVideo: false })
    }, 120)
  }

  function stopCrossfade({ keepCoverOverlay = false } = {}) {
    stopPlaybackRateRelaxation()
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
      active.playbackRate = 1
    }
    const graphReset = audioGraph?.reset?.(active, idle)
    if (graphReset) {
      if (active) active.volume = 1
      if (idle) idle.volume = 1
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

    audioGraph?.completeDeckSwap?.(oldActive, newActive)

    if (newActive) {
      newActive.volume = audioGraph?.isReady?.() ? 1 : getVolume()
      syncCurrentTimeMs(Math.floor((newActive.currentTime || 0) * 1000))
      relaxPlaybackRate(newActive)
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

    log('[AutoMix] crossfade complete', {
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
