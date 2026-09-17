import {resolveTransitionExecution} from '@/audio/transitions/index.js'
import {alignIncomingPlayback} from '@/audio/transitions/playbackSync.js'
import {
  sampleTransitionGain,
  softenTransitionForPlayback,
} from '@/audio/transitions/smoothTransition.js'

const FALLBACK_CROSSFADE_SECONDS = 3.4
const MIN_EMERGENCY_FADE_SECONDS = 0.8
const MAX_MUSICAL_BOUNDARY_LATENESS_SECONDS = 0.12
const BOUNDARY_SCHEDULE_LOOKAHEAD_SECONDS = 0.05
const LOOP_CAPTURE_MARGIN_SECONDS = 0.15

function loopLengthSeconds(transition) {
  const loopStart = Number(transition?.loop_start)
  const loopEnd = Number(transition?.loop_end)
  const length = loopEnd - loopStart
  return Number.isFinite(loopStart)
    && Number.isFinite(loopEnd)
    && length >= 0.5
    && length <= 10
    ? length
    : null
}

function transitionPrepareLeadSeconds(transition) {
  const duration = Math.max(0, Number(transition?.crossfade_duration || 0))
  const loopLength = loopLengthSeconds(transition) || 0
  return Math.max(12, duration + 3, loopLength + 4)
}

function createSafeFallbackTransition(media, options = {}) {
  const duration = Number(media?.duration || 0)
  if (!Number.isFinite(duration) || duration <= 1) return null
  const requestedStart = Number(options?.startSec)
  const end = Number.isFinite(Number(options?.endSec))
    ? Math.min(duration, Math.max(0, Number(options.endSec)))
    : duration
  const start = Number.isFinite(requestedStart)
    ? Math.min(end, Math.max(0, requestedStart))
    : null
  const available = start === null ? end : Math.max(0, end - start)
  const requestedDuration = Number(options?.durationSec)
  const naturalDuration = Math.min(
    FALLBACK_CROSSFADE_SECONDS,
    Math.max(1.8, duration * 0.018),
  )
  const crossfadeDuration = Number.isFinite(requestedDuration)
    ? Math.max(MIN_EMERGENCY_FADE_SECONDS, requestedDuration)
    : start === null
      ? naturalDuration
      : Math.max(MIN_EMERGENCY_FADE_SECONDS, Math.min(FALLBACK_CROSSFADE_SECONDS, available))
  return {
    kind: 'safe_fade',
    mix_out_start: start ?? Math.max(0, end - crossfadeDuration),
    mix_in_start: 0,
    crossfade_duration: crossfadeDuration,
    beat_aligned: false,
    incoming_rate: 1,
    confidence: 0.32,
    outgoing_eq: [],
    incoming_eq: [],
    outgoing_filter: [],
    incoming_filter: [],
    reason_codes: [String(options?.reason || 'runtime_safe_fallback')],
  }
}

function createLateBoundaryTransition(media, transition, context, lateness) {
  const now = Math.max(0, Number(media?.currentTime || 0))
  const plannedEnd = Math.max(
    now,
    Number(transition?.mix_out_start || 0) + Number(transition?.crossfade_duration || 0),
  )
  const available = Math.max(0, Math.min(Number(media?.duration || plannedEnd), plannedEnd) - now)
  const duration = Math.max(
    MIN_EMERGENCY_FADE_SECONDS,
    Math.min(FALLBACK_CROSSFADE_SECONDS, available),
  )
  const fallback = createSafeFallbackTransition(media, {
    startSec: now,
    endSec: plannedEnd,
    durationSec: duration,
    reason: 'late_boundary_transparent_fallback',
  })
  if (!fallback) return null
  const softened = softenTransitionForPlayback({
    ...transition,
    ...fallback,
    loop_start: null,
    loop_end: null,
    loop_repetitions: 0,
    loop_mode: null,
    reason_codes: [
      ...(Array.isArray(transition?.reason_codes) ? transition.reason_codes : []),
      ...fallback.reason_codes,
      `boundary_late_${Math.round(lateness * 1000)}ms`,
    ],
  }, {
    ...context,
    preserveBoundary: true,
    minimumDuration: duration,
  })
  return {...softened, mix_out_start: now, crossfade_duration: duration}
}

async function waitForPlaybackBoundary(media, targetSec) {
  if (!media || !Number.isFinite(targetSec)) return
  const startedAt = performance.now()
  const remainingSec = Math.max(0, targetSec - Number(media.currentTime || 0))
  const timeoutMs = Math.min(45_000, Math.max(2500, (remainingSec + 1.5) * 1000))
  await new Promise((resolve) => {
    const tick = () => {
      const current = Number(media.currentTime || 0)
      if (
        media.paused
        || current >= targetSec - BOUNDARY_SCHEDULE_LOOKAHEAD_SECONDS
        || performance.now() - startedAt >= timeoutMs
      ) {
        resolve()
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

export function createBeatLoopController(media, transition) {
  if (String(transition?.kind || '') !== 'loop_bridge') return null
  if (transition?.loop_mode === 'delay_line') return null
  const loopStart = Number(transition?.loop_start)
  const loopEnd = Number(transition?.loop_end)
  const repetitions = Math.trunc(Number(transition?.loop_repetitions || 0))
  const loopLength = loopEnd - loopStart
  if (!media || !Number.isFinite(loopStart) || !Number.isFinite(loopEnd)) return null
  if (loopStart < 0 || loopLength < 0.65 || loopLength > 8 || repetitions < 2) return null

  let wraps = 0
  let lastWrapAt = 0
  return {
    tick(now = performance.now()) {
      if (wraps >= repetitions - 1 || media.paused || media.seeking) return false
      const current = Number(media.currentTime || 0)
      if (current < loopEnd - 0.018 || now - lastWrapAt < 120) return false
      const overshoot = Math.max(0, current - loopEnd)
      const target = loopStart + Math.min(overshoot, loopLength * 0.12)
      try {
        media.currentTime = target
        wraps += 1
        lastWrapAt = now
        return true
      } catch {
        wraps = repetitions
        return false
      }
    },
    getWrapCount() {
      return wraps
    },
  }
}

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
    audioGraph,
    log,
  } = options

  let preparationAttempt = 0

  async function tryStartAutomixCrossfade(currentSec) {
    const primary = getActiveAudio()
    const secondary = getIdleAudio()
    let incomingPreRolling = false
    if (isCrossfadeActive() || isCrossfadePreparing() || !primary || !secondary || !getHasSong()) return false
    if (!isAutomixEnabled()) return false
    if (isSinglePlayMode()) return false

    const currentSongId = String(getCurrentSong()?.id || '')
    if (!currentSongId) return false
    if (getCrossfadeTriggeredSongId() === currentSongId) return false

    const analysis = getLastAutomixAnalysis()
    const hasCurrentAnalysis = Boolean(
      analysis?.transition
      && String(analysis.currentTrackId || '') === currentSongId,
    )
    const rawPlannedTransition = hasCurrentAnalysis
      ? analysis.transition
      : createSafeFallbackTransition(primary)
    const transitionContext = {
      currentTrack: analysis?.transitionContext?.currentTrack || getCurrentSong(),
      nextTrack: analysis?.transitionContext?.nextTrack || null,
    }
    const plannedTransition = rawPlannedTransition
      ? softenTransitionForPlayback(rawPlannedTransition, transitionContext)
      : null
    if (!plannedTransition) return false
    let transition = plannedTransition
    let transitionKind = String(transition.kind || 'safe_fade')
    let mixOutStart = Number(transition.mix_out_start || 0)
    let mixInStart = Math.max(0, Number(transition.mix_in_start || 0))
    let crossfadeDuration = Math.max(0.4, Number(transition.crossfade_duration || 0))
    if (!Number.isFinite(mixOutStart) || !Number.isFinite(crossfadeDuration)) return false
    // Resolve the URL and warm the decoder well before the musical boundary.
    // The old 1.25s window was too short whenever metadata or a CDN request was cold.
    if (currentSec + transitionPrepareLeadSeconds(plannedTransition) < mixOutStart) return false

    setCrossfadePreparing(true)
    const attempt = ++preparationAttempt
    const isCurrentAttempt = () => (
      attempt === preparationAttempt
      && isCrossfadePreparing()
      && isAutomixEnabled()
      && String(getCurrentSong()?.id || '') === currentSongId
    )
    try {
      const targetIndex = await getCrossfadeTargetIndex()
      if (!isCurrentAttempt()) return false
      const queue = getPlayQueue()
      if (targetIndex < 0 || targetIndex >= queue.length) return false
      if (targetIndex === getCurrentQueueIndex()) return false

      const targetSong = queue[targetIndex]
      const targetId = Number(targetSong?.id)
      if (!Number.isFinite(targetId) || targetId <= 0) return false

      const prewarmedMatch = isPrewarmedMatch(targetSong.id)
      const targetUrl = prewarmedMatch ? getPrewarmedUrl() : await resolvePlayableUrlById(targetId)
      if (!isCurrentAttempt()) return false
      if (!targetUrl || !primary || !secondary) return false

      const fromTheme = getCurrentThemeSnapshot()
      let toTheme = fromTheme
      resolveThemeFromCover(resolveSongCover(targetSong), targetSong?.name || '')
        .then((theme) => {
          if (theme) toTheme = theme
        })
        .catch(() => {})

      const targetCover = resolveSongCover(targetSong)

      if (!prewarmedMatch || secondary.getAttribute('src') !== targetUrl) {
        secondary.src = targetUrl
        secondary.load()
      }

      await waitAudioMetadata(secondary)
      if (!isCurrentAttempt()) return false
      let safeMixInStart = sanitizePlaybackStartSec(secondary, mixInStart)
      const baseVolume = clamp(Number(getVolume() || 0.85), 0, 1)
      const graphReady = Boolean(await audioGraph?.resume?.())
      const runtimeTransitionContext = {
        currentTrack: transitionContext.currentTrack || getCurrentSong(),
        nextTrack: transitionContext.nextTrack || targetSong,
      }
      let sampleAccurateLoop = false
      if (
        graphReady
        && String(plannedTransition?.kind || '') === 'loop_bridge'
        && audioGraph?.supportsSampleAccurateLoop?.()
      ) {
        sampleAccurateLoop = Boolean(
          audioGraph.isLoopTransitionReady?.(primary, plannedTransition),
        )
        if (!sampleAccurateLoop) {
          const loopLength = loopLengthSeconds(plannedTransition)
          const captureArmed = Boolean(
            audioGraph.prepareLoopTransition?.(primary, plannedTransition),
          )
          const mediaLead = mixOutStart - Number(primary.currentTime || 0)
          sampleAccurateLoop = Boolean(
            captureArmed
            && loopLength !== null
            && mediaLead >= loopLength + LOOP_CAPTURE_MARGIN_SECONDS,
          )
        }
      }
      transition = softenTransitionForPlayback(
        resolveTransitionExecution(plannedTransition, {
          webAudio: graphReady,
          audioWorklet: Boolean(audioGraph?.isWorkletReady?.()),
          sampleAccurateLoop,
        }),
        {
          ...runtimeTransitionContext,
          sampleAccurateLoop,
        },
      )
      transitionKind = String(transition.kind || 'safe_fade')
      crossfadeDuration = Math.max(0.4, Number(transition.crossfade_duration || crossfadeDuration))
      mixOutStart = Number(transition.mix_out_start || mixOutStart)
      mixInStart = Math.max(0, Number(transition.mix_in_start || mixInStart))
      safeMixInStart = sanitizePlaybackStartSec(secondary, mixInStart)
      const tempoRate = resolveTempoRateForTransition(getCurrentSong(), targetSong, transition)
      const incomingEqStart = Array.isArray(transition?.incoming_eq)
        ? transition.incoming_eq[0]
        : null
      if (graphReady) {
        audioGraph.setMasterVolume(baseVolume)
        audioGraph.prepareDeck(primary, {gain: 1})
        audioGraph.prepareDeck(secondary, {
          gain: 0,
          low: Number(incomingEqStart?.low || 0),
          mid: Number(incomingEqStart?.mid || 0),
          high: Number(incomingEqStart?.high || 0),
        })
      }
      secondary.currentTime = safeMixInStart
      secondary.playbackRate = tempoRate
      secondary.preservesPitch = true
      secondary.volume = graphReady ? 1 : 0

      try {
        await secondary.play()
        // Starting once warms the media decoder. Keeping the muted deck playing
        // for the whole prepare window forces a large seek at the boundary.
        secondary.pause()
        secondary.currentTime = safeMixInStart
      } catch {
        // The real play call at the boundary remains authoritative.
      }

      if (!isCurrentAttempt()) return false

      await waitForPlaybackBoundary(primary, mixOutStart)
      if (!isCurrentAttempt()) return false
      if (primary.paused && !primary.ended) return false
      if (
        transitionKind === 'loop_bridge'
        && !audioGraph?.isLoopTransitionReady?.(primary, plannedTransition)
      ) {
        sampleAccurateLoop = false
        transition = softenTransitionForPlayback(
          resolveTransitionExecution(plannedTransition, {
            webAudio: graphReady,
            audioWorklet: Boolean(audioGraph?.isWorkletReady?.()),
            sampleAccurateLoop: false,
          }),
          {...runtimeTransitionContext, sampleAccurateLoop: false},
        )
        transitionKind = String(transition.kind || 'safe_fade')
        crossfadeDuration = Math.max(
          0.4,
          Number(transition.crossfade_duration || crossfadeDuration),
        )
        mixOutStart = Number(transition.mix_out_start || mixOutStart)
        mixInStart = Math.max(0, Number(transition.mix_in_start || mixInStart))
        safeMixInStart = sanitizePlaybackStartSec(secondary, mixInStart)
      }
      const boundaryLateness = Math.max(0, Number(primary.currentTime || 0) - mixOutStart)

      setCrossfadeActive(true)
      setCrossfadeVisualActive(true)
      setCrossfadeTriggeredSongId(currentSongId)
      setCrossfadeCoverState({
        url: targetCover,
        isVideo: isVideoUrl(targetCover),
        progress: 0,
      })

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
        incomingPreRolling,
        transitionKind,
        fallbackPlan: !hasCurrentAnalysis,
        boundaryLateness,
        decisionConfidence: Number(analysis?.decisionConfidence || transition?.confidence || 0),
      })

      try {
        await secondary.play()
        incomingPreRolling = true
      } catch {
        setCrossfadeTriggeredSongId(null)
        stopCrossfade()
        return false
      }

      const phaseSync = await alignIncomingPlayback({
        outgoingMedia: primary,
        incomingMedia: secondary,
        mixOutStart,
        mixInStart: safeMixInStart,
        incomingRate: tempoRate,
        sanitize: sanitizePlaybackStartSec,
      })
      const finalBoundaryLateness = Math.max(
        boundaryLateness,
        Number(phaseSync?.lateness || 0),
        Number(primary.currentTime || 0) - mixOutStart,
      )
      if (finalBoundaryLateness > MAX_MUSICAL_BOUNDARY_LATENESS_SECONDS) {
        const lateFallback = createLateBoundaryTransition(
          primary,
          transition,
          runtimeTransitionContext,
          finalBoundaryLateness,
        )
        if (lateFallback) {
          transition = lateFallback
          transitionKind = 'safe_fade'
          crossfadeDuration = Number(lateFallback.crossfade_duration)
        }
      } else if (finalBoundaryLateness > 0) {
        crossfadeDuration = Math.max(0.4, crossfadeDuration - finalBoundaryLateness)
        transition = {...transition, crossfade_duration: crossfadeDuration}
      }

      let scheduled = graphReady
        ? audioGraph.scheduleTransition(primary, secondary, transition, crossfadeDuration)
        : null
      if (transitionKind === 'loop_bridge' && scheduled && !scheduled.loopActive) {
        transition = softenTransitionForPlayback(
          resolveTransitionExecution(plannedTransition, {
            webAudio: graphReady,
            audioWorklet: Boolean(audioGraph?.isWorkletReady?.()),
            sampleAccurateLoop: false,
          }),
          {...runtimeTransitionContext, sampleAccurateLoop: false},
        )
        transitionKind = String(transition.kind || 'safe_fade')
        crossfadeDuration = Math.max(
          0.4,
          Number(transition.crossfade_duration || crossfadeDuration),
        )
        scheduled = audioGraph.scheduleTransition(
          primary,
          secondary,
          transition,
          crossfadeDuration,
        )
      }
      const startTs = performance.now() + Number(scheduled?.startsInSec || 0) * 1000
      const beatLoop = createBeatLoopController(primary, transition)

      const step = async (now) => {
        if (!isCrossfadeActive() || !primary || !secondary) {
          stopCrossfade()
          return
        }

        const elapsed = (now - startTs) / 1000
        const progress = clamp(elapsed / crossfadeDuration, 0, 1)
        if (progress > 0 && progress < 0.985) {
          beatLoop?.tick(now)
        }
        const fadeOutGain = sampleTransitionGain(
          transition.outgoing_gain,
          progress,
          false,
        )
        const fadeInGain = sampleTransitionGain(
          transition.incoming_gain,
          progress,
          true,
        )

        if (!scheduled) {
          primary.volume = baseVolume * fadeOutGain
          secondary.volume = baseVolume * fadeInGain
        }
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
            loopWraps: beatLoop?.getWrapCount?.() || 0,
            delayLoopActive: Boolean(scheduled?.loopActive),
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

      log('[AutoMix] crossfade started', {
        fromTrackId: currentSongId,
        toTrackId: targetSong.id,
        mixOutStart,
        mixInStart,
        crossfadeDuration,
        tempoRate,
        transitionKind,
        playbackShape: transition?.playback_shape,
        phaseCorrection: phaseSync.correction,
        loopStart: Number(transition?.loop_start || 0),
        loopEnd: Number(transition?.loop_end || 0),
        loopRepetitions: Number(transition?.loop_repetitions || 0),
        loopMode: transition?.loop_mode || null,
        loopActive: Boolean(scheduled?.loopActive),
      })

      return true
    } finally {
      if (!isCrossfadeActive() && incomingPreRolling && secondary && !secondary.paused) {
        secondary.pause()
      }
      if (attempt === preparationAttempt) setCrossfadePreparing(false)
    }
  }

  return {
    tryStartAutomixCrossfade,
  }
}
