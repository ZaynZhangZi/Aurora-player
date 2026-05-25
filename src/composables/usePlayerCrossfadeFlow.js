export function usePlayerCrossfadeFlow(options) {
  const {
    getActiveAudio,
    getIdleAudio,
    isCrossfadeActive,
    isCrossfadePreparing,
    setCrossfadeActive,
    setCrossfadePreparing,
    getCrossfadeTriggeredSongId,
    setCrossfadeTriggeredSongId,
    getHasSong,
    isAutomixEnabled,
    isSinglePlayMode,
    getCurrentSong,
    getPlayQueue,
    getCurrentQueueIndex,
    getCrossfadeTargetIndex,
    isPrewarmedMatch,
    getPrewarmedUrl,
    resolvePlayableUrlById,
    getLastAutomixAnalysis,
    getCurrentThemeSnapshot,
    resolveThemeFromCover,
    resolveSongCover,
    isVideoUrl,
    setCrossfadeVisualActive,
    setCrossfadeCoverState,
    waitAudioMetadata,
    sanitizePlaybackStartSec,
    resolveTempoRateForTransition,
    debugCrossfade,
    clamp,
    getVolume,
    applyThemeBlend,
    applyTheme,
    setSkipNextCoverThemePick,
    completeCrossfadeByDeckSwap,
    promoteCrossfadedTrack,
    setCrossfadeRafId,
    stopCrossfade,
    log,
  } = options

  async function tryStartAutomixCrossfade(currentSec) {
    const primary = getActiveAudio()
    const secondary = getIdleAudio()
    if (isCrossfadeActive() || isCrossfadePreparing() || !primary || !secondary || !getHasSong()) return false
    if (!isAutomixEnabled()) return false
    if (isSinglePlayMode()) return false

    const currentSongId = String(getCurrentSong()?.id || '')
    if (!currentSongId) return false
    if (getCrossfadeTriggeredSongId() === currentSongId) return false

    const analysis = getLastAutomixAnalysis()
    if (!analysis?.transition || String(analysis.currentTrackId || '') !== currentSongId) {
      return false
    }

    const transition = analysis.transition
    const mixOutStart = Number(transition.mix_out_start || 0)
    const mixInStart = Math.max(0, Number(transition.mix_in_start || 0))
    const crossfadeDuration = Math.max(0.4, Number(transition.crossfade_duration || 0))
    if (!Number.isFinite(mixOutStart) || !Number.isFinite(crossfadeDuration)) return false
    if (currentSec + 0.08 < mixOutStart) return false

    setCrossfadePreparing(true)
    try {
      const targetIndex = await getCrossfadeTargetIndex()
      const queue = getPlayQueue()
      if (targetIndex < 0 || targetIndex >= queue.length) return false
      if (targetIndex === getCurrentQueueIndex()) return false

      const targetSong = queue[targetIndex]
      const targetId = Number(targetSong?.id)
      if (!Number.isFinite(targetId) || targetId <= 0) return false

      const prewarmedMatch = isPrewarmedMatch(targetSong.id)
      const targetUrl = prewarmedMatch ? getPrewarmedUrl() : await resolvePlayableUrlById(targetId)
      if (!targetUrl || !primary || !secondary) return false

      const fromTheme = getCurrentThemeSnapshot()
      let toTheme = fromTheme
      resolveThemeFromCover(resolveSongCover(targetSong), targetSong?.name || '')
        .then((theme) => {
          if (theme) toTheme = theme
        })
        .catch(() => {})

      setCrossfadeActive(true)
      setCrossfadeVisualActive(true)
      setCrossfadeTriggeredSongId(currentSongId)
      const targetCover = resolveSongCover(targetSong)
      setCrossfadeCoverState({
        url: targetCover,
        isVideo: isVideoUrl(targetCover),
        progress: 0,
      })

      if (!prewarmedMatch || secondary.getAttribute('src') !== targetUrl) {
        secondary.src = targetUrl
        secondary.load()
      }

      await waitAudioMetadata(secondary)
      const safeMixInStart = sanitizePlaybackStartSec(secondary, mixInStart)
      const tempoRate = resolveTempoRateForTransition(getCurrentSong(), targetSong, transition)
      secondary.currentTime = safeMixInStart
      secondary.playbackRate = tempoRate
      secondary.volume = 0

      debugCrossfade('crossfadeStart', {
        fromTrackId: currentSongId,
        toTrackId: String(targetSong?.id || ''),
        currentQueueIndex: getCurrentQueueIndex(),
        targetQueueIndex: targetIndex,
        transitionMixOutStart: mixOutStart,
        transitionMixInStart: mixInStart,
        safeMixInStart,
        crossfadeDuration,
        tempoRate,
        secondaryDuration: Number(secondary?.duration || 0),
        prewarmedMatch,
      })

      try {
        await secondary.play()
      } catch {
        setCrossfadeActive(false)
        return false
      }

      const baseVolume = clamp(Number(getVolume() || 0.85), 0, 1)
      const startTs = performance.now()

      const step = async (now) => {
        if (!isCrossfadeActive() || !primary || !secondary) {
          stopCrossfade()
          return
        }

        const elapsed = (now - startTs) / 1000
        const progress = clamp(elapsed / crossfadeDuration, 0, 1)
        const fadeOutGain = Math.cos(progress * Math.PI * 0.5)
        const fadeInGain = Math.sin(progress * Math.PI * 0.5)

        primary.volume = baseVolume * fadeOutGain
        secondary.volume = baseVolume * fadeInGain
        applyThemeBlend(fromTheme, toTheme, progress)
        setCrossfadeCoverState({ progress })

        if (progress >= 1) {
          const promotedStartSec = Number(secondary.currentTime || safeMixInStart || 0)
          debugCrossfade('promoteCrossfadedTrack', {
            fromTrackId: currentSongId,
            toTrackId: String(targetSong?.id || ''),
            promotedStartSec,
            safeMixInStart,
            secondaryCurrentTime: Number(secondary.currentTime || 0).toFixed(3),
          })
          setSkipNextCoverThemePick(true)
          applyTheme(toTheme)
          completeCrossfadeByDeckSwap({
            fromTrackId: currentSongId,
            toTrackId: targetSong.id,
            mixOutStart,
            mixInStart: safeMixInStart,
            crossfadeDuration,
            promotedStartSec,
          })
          await promoteCrossfadedTrack(targetSong, targetUrl, promotedStartSec, targetIndex)
          return
        }

        setCrossfadeRafId(requestAnimationFrame((ts) => {
          step(ts).catch(() => {
            stopCrossfade()
          })
        }))
      }

      setCrossfadeRafId(requestAnimationFrame((ts) => {
        step(ts).catch(() => {
          stopCrossfade()
        })
      }))

      log('[Automix] crossfade started', {
        fromTrackId: currentSongId,
        toTrackId: targetSong.id,
        mixOutStart,
        mixInStart,
        crossfadeDuration,
        tempoRate,
      })

      return true
    } finally {
      setCrossfadePreparing(false)
    }
  }

  return {
    tryStartAutomixCrossfade,
  }
}
