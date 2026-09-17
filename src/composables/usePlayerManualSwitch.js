import {PLAY_MODE} from "@/stores/playerStore.js";
import {resolveTransitionExecution} from "@/audio/transitions/index.js";
import {alignIncomingPlayback} from "@/audio/transitions/playbackSync.js";
import {
  sampleTransitionGain,
  softenTransitionForPlayback,
} from "@/audio/transitions/smoothTransition.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pickRandomQueueIndex(length, currentIndex) {
  if (length <= 1) return currentIndex;
  let nextIndex = currentIndex;
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * length);
  }
  return nextIndex;
}

export function usePlayerManualSwitch({
  playerStore,
  automixEnabled,
  canPlayPrev,
  canPlayNext,
  hasSong,
  getActiveAudio,
  getIdleAudio,
  getCrossfadeActive,
  getCrossfadePreparing,
  setCrossfadeActive,
  setCrossfadePreparing,
  setCrossfadeVisualActive,
  setCrossfadeTriggeredSongId,
  getVolume,
  resolvePlayableUrlById,
  recommendNextQueueIndex,
  getLastAutomixAnalysis,
  waitAudioMetadata,
  sanitizePlaybackStartSec,
  resolveTempoRateForTransition,
  resolveSongCover,
  pickThemeFromCover,
  getSongName,
  applyTheme,
  setSkipNextCoverThemePick,
  promoteCrossfadedTrack,
  completeCrossfadeByDeckSwap,
  requestAutomixWarmup,
  reportBehavior,
  playQueueByDirection,
  playQueueByIndex,
  closePlaylistPanel,
  onManualSkip,
  audioGraph,
}) {
  function resolvePlannedManualTransition(targetSong, targetIndex, direction) {
    if (direction !== "next" || !automixEnabled()) return null;
    const analysis = getLastAutomixAnalysis?.();
    if (!analysis?.transition) return null;
    if (String(analysis.currentTrackId || "") !== String(playerStore.currentSong?.id || "")) return null;
    const matchesIndex = Number(analysis.selectedQueueIndex) === Number(targetIndex);
    const matchesTrack = String(analysis.selectedTrackId || "") === String(targetSong?.id || "");
    return matchesIndex || matchesTrack ? analysis.transition : null;
  }

  function resolveManualDuration(transition) {
    const kind = String(transition?.kind || "");
    const planned = Number(transition?.crossfade_duration || 0);
    if (kind === "loop_bridge" && Number.isFinite(planned) && planned > 0) {
      return clamp(planned, 2.4, 12);
    }
    if (kind === "beat_mix" || kind === "phrase_crossfade") {
      const bpm = Number(playerStore.currentSong?.mixProfile?.bpm || 0);
      if (bpm >= 40 && bpm <= 240) {
        const bars = kind === "beat_mix" ? 4 : 2;
        return clamp(Math.max(planned || 0, bars * 4 * 60 / bpm), 4.8, 9.5);
      }
    }
    if (Number.isFinite(planned) && planned > 0) return clamp(planned, 0.8, 8);
    return automixEnabled() ? 4.8 : 0.65;
  }

  function nextNearbyDownbeat(media) {
    const current = Number(media?.currentTime || 0);
    const downbeats = playerStore.currentSong?.mixProfile?.downbeat_positions;
    if (!Array.isArray(downbeats)) return null;
    const candidate = downbeats
      .map(Number)
      .find(value => Number.isFinite(value) && value >= current + 0.12);
    return Number.isFinite(candidate) && candidate - current <= 2.4 ? candidate : null;
  }

  async function waitForMediaTime(media, targetSec) {
    if (!Number.isFinite(targetSec)) return;
    await new Promise((resolve) => {
      const startedAt = performance.now();
      const tick = () => {
        if (!media || media.paused || Number(media.currentTime || 0) >= targetSec - 0.025) {
          resolve();
          return;
        }
        if (performance.now() - startedAt >= 2600) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  async function resolveManualDirectionTargetIndex(direction = "next") {
    const queue = playerStore.playQueue || [];
    const length = queue.length;
    if (!length) return -1;

    const currentIndex = Number.isInteger(playerStore.currentQueueIndex)
      ? playerStore.currentQueueIndex
      : 0;
    const safeCurrent = Math.min(Math.max(currentIndex, 0), length - 1);
    const mode =
      playerStore.playMode === PLAY_MODE.SINGLE
        ? PLAY_MODE.SEQUENCE
        : playerStore.playMode;

    if (direction === "prev") {
      if (mode === PLAY_MODE.SHUFFLE) {
        return pickRandomQueueIndex(length, safeCurrent);
      }
      return safeCurrent > 0 ? safeCurrent - 1 : -1;
    }

    if (automixEnabled()) {
      const suggestedIndex = await recommendNextQueueIndex(queue, safeCurrent, {
        forwardOnly: mode === PLAY_MODE.SEQUENCE,
        preserveOrder: mode === PLAY_MODE.SEQUENCE,
      });
      const isForwardSequence =
        mode === PLAY_MODE.SEQUENCE
          ? suggestedIndex === safeCurrent + 1
          : suggestedIndex !== safeCurrent;
      if (
        suggestedIndex >= 0 &&
        suggestedIndex < length &&
        isForwardSequence
      ) {
        return suggestedIndex;
      }
    }

    if (mode === PLAY_MODE.SHUFFLE) {
      return pickRandomQueueIndex(length, safeCurrent);
    }
    return safeCurrent < length - 1 ? safeCurrent + 1 : -1;
  }

  async function tryManualSeamlessSwitch(direction = "next") {
    const primary = getActiveAudio();
    const secondary = getIdleAudio();
    let switchCompleted = false;
    if (!primary || !secondary || !hasSong()) return false;
    if (getCrossfadeActive() || getCrossfadePreparing()) return false;

    setCrossfadePreparing(true);
    try {
      const targetIndex = await resolveManualDirectionTargetIndex(direction);
      if (targetIndex < 0 || targetIndex >= playerStore.playQueue.length) return false;
      if (targetIndex === playerStore.currentQueueIndex) return false;

      const targetSong = playerStore.playQueue[targetIndex];
      const targetId = Number(targetSong?.id);
      if (!Number.isFinite(targetId) || targetId <= 0) return false;

      const targetUrl = await resolvePlayableUrlById(targetId);
      if (!targetUrl || !primary || !secondary) return false;

      const fromTrackId = String(playerStore.currentSong?.id || "");
      const rawPlannedTransition = resolvePlannedManualTransition(targetSong, targetIndex, direction);
      const analysis = getLastAutomixAnalysis?.();
      const transitionContext = {
        currentTrack: analysis?.transitionContext?.currentTrack || playerStore.currentSong,
        nextTrack: analysis?.transitionContext?.nextTrack || targetSong,
      };
      const plannedTransition = rawPlannedTransition
        ? softenTransitionForPlayback(rawPlannedTransition, transitionContext)
        : null;
      let crossfadeDuration = resolveManualDuration(plannedTransition);
      const mixInStart = Math.max(0, Number(plannedTransition?.mix_in_start || 0));

      if (secondary.getAttribute("src") !== targetUrl) {
        secondary.src = targetUrl;
        secondary.load();
      }
      await waitAudioMetadata(secondary);
      const baseVolume = clamp(Number(getVolume() || 0.85), 0, 1);
      const graphReady = Boolean(await audioGraph?.resume?.());
      let sampleAccurateLoop = false;
      if (
        graphReady
        && String(plannedTransition?.kind || "") === "loop_bridge"
        && audioGraph?.supportsSampleAccurateLoop?.()
      ) {
        sampleAccurateLoop = Boolean(
          audioGraph.isLoopTransitionReady?.(primary, plannedTransition),
        );
        if (!sampleAccurateLoop) {
          audioGraph.prepareLoopTransition?.(primary, plannedTransition);
        }
      }
      const executableTransition = plannedTransition
        ? softenTransitionForPlayback(
            resolveTransitionExecution(plannedTransition, {
              webAudio: graphReady,
              audioWorklet: Boolean(audioGraph?.isWorkletReady?.()),
              sampleAccurateLoop,
            }),
            {...transitionContext, sampleAccurateLoop},
          )
        : null;
      crossfadeDuration = resolveManualDuration(executableTransition || plannedTransition);
      const incomingEqStart = Array.isArray(executableTransition?.incoming_eq)
        ? executableTransition.incoming_eq[0]
        : null;
      if (graphReady) {
        audioGraph.setMasterVolume(baseVolume);
        audioGraph.prepareDeck(primary, {gain: 1});
        audioGraph.prepareDeck(secondary, {
          gain: 0,
          low: Number(incomingEqStart?.low ?? (automixEnabled() && direction === "next" ? -12 : 0)),
          mid: Number(incomingEqStart?.mid ?? (automixEnabled() && direction === "next" ? -2 : 0)),
          high: Number(incomingEqStart?.high || 0),
        });
      }
      secondary.currentTime = sanitizePlaybackStartSec?.(secondary, mixInStart) ?? mixInStart;
      const tempoRate = executableTransition
        ? resolveTempoRateForTransition?.(playerStore.currentSong, targetSong, executableTransition) || 1
        : 1;
      secondary.playbackRate = tempoRate;
      secondary.preservesPitch = true;
      secondary.volume = graphReady ? 1 : 0;

      // Prime the decoder while the deck is silent so the musical boundary is not
      // missed by a cold media-element start.
      try {
        await secondary.play();
      } catch {
        // The actual switch below still has a chance to play after user interaction.
      }

      const nearbyDownbeat = nextNearbyDownbeat(primary);
      await waitForMediaTime(primary, nearbyDownbeat);
      const manualBoundary = Number.isFinite(nearbyDownbeat)
        ? nearbyDownbeat
        : Number(primary.currentTime || 0);
      setCrossfadeActive(true);
      setCrossfadeVisualActive(false);
      setCrossfadeTriggeredSongId(fromTrackId || null);

      try {
        await secondary.play();
      } catch {
        setCrossfadeActive(false);
        return false;
      }

      let manualTransition = executableTransition || (
        automixEnabled() && direction === "next"
          ? softenTransitionForPlayback({
              kind: "safe_fade",
              crossfade_duration: crossfadeDuration,
              loudness_gain_db: 0,
              confidence: 0.3,
              reason_codes: ["manual_safe_fallback"],
            }, transitionContext)
          : {}
      );
      if (
        String(manualTransition?.kind || "") === "loop_bridge"
        && !audioGraph?.isLoopTransitionReady?.(primary, plannedTransition)
      ) {
        manualTransition = softenTransitionForPlayback(
          resolveTransitionExecution(plannedTransition, {
            webAudio: graphReady,
            audioWorklet: Boolean(audioGraph?.isWorkletReady?.()),
            sampleAccurateLoop: false,
          }),
          {...transitionContext, sampleAccurateLoop: false},
        );
      }
      crossfadeDuration = resolveManualDuration(manualTransition);
      await alignIncomingPlayback({
        outgoingMedia: primary,
        incomingMedia: secondary,
        mixOutStart: manualBoundary,
        mixInStart,
        incomingRate: tempoRate,
        sanitize: sanitizePlaybackStartSec,
      });
      let scheduled = graphReady
        ? audioGraph.scheduleTransition(primary, secondary, manualTransition, crossfadeDuration)
        : null;
      if (
        String(manualTransition?.kind || "") === "loop_bridge"
        && scheduled
        && !scheduled.loopActive
      ) {
        manualTransition = softenTransitionForPlayback(
          resolveTransitionExecution(plannedTransition, {
            webAudio: graphReady,
            audioWorklet: Boolean(audioGraph?.isWorkletReady?.()),
            sampleAccurateLoop: false,
          }),
          {...transitionContext, sampleAccurateLoop: false},
        );
        crossfadeDuration = resolveManualDuration(manualTransition);
        scheduled = audioGraph.scheduleTransition(
          primary,
          secondary,
          manualTransition,
          crossfadeDuration,
        );
      }
      const startTs = performance.now() + Number(scheduled?.startsInSec || 0) * 1000;

      await new Promise((resolve) => {
        const step = (now) => {
          if (!primary || !secondary) {
            resolve();
            return;
          }
          const progress = clamp((now - startTs) / (crossfadeDuration * 1000), 0, 1);
          const fadeOutGain = sampleTransitionGain(
            manualTransition.outgoing_gain,
            progress,
            false,
          );
          const fadeInGain = sampleTransitionGain(
            manualTransition.incoming_gain,
            progress,
            true,
          );
          if (!scheduled) {
            primary.volume = baseVolume * fadeOutGain;
            secondary.volume = baseVolume * fadeInGain;
          }
          if (progress >= 1) {
            resolve();
            return;
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });

      const promotedStartSec = Number(secondary.currentTime || 0);
      setSkipNextCoverThemePick(true);
      pickThemeFromCover(resolveSongCover(targetSong), getSongName(), applyTheme);
      completeCrossfadeByDeckSwap({
        fromTrackId,
        toTrackId: targetSong.id,
        mixOutStart: Number(primary.currentTime || 0),
        mixInStart,
        crossfadeDuration,
        promotedStartSec,
      });
      switchCompleted = true;
      await promoteCrossfadedTrack(
        targetSong,
        targetUrl,
        promotedStartSec,
        targetIndex,
      );

      requestAutomixWarmup("manual-seamless-switch");
      return true;
    } finally {
      if (!switchCompleted && !getCrossfadeActive() && secondary && !secondary.paused) {
        secondary.pause();
      }
      setCrossfadePreparing(false);
    }
  }

  async function playPrevSong() {
    if (!canPlayPrev()) return;
    onManualSkip?.("previous");
    reportBehavior("QUEUE_PREV", playerStore.currentSong?.id || "", {
      currentQueueIndex: playerStore.currentQueueIndex,
    });
    const switched = await tryManualSeamlessSwitch("prev");
    if (switched) return;
    await playQueueByDirection("prev");
  }

  async function playNextSong() {
    if (!canPlayNext()) return;
    onManualSkip?.("next");
    reportBehavior("QUEUE_NEXT", playerStore.currentSong?.id || "", {
      currentQueueIndex: playerStore.currentQueueIndex,
    });
    const switched = await tryManualSeamlessSwitch("next");
    if (switched) return;
    await playQueueByDirection("next");
  }

  async function playSongAtIndex(index) {
    onManualSkip?.("queue-select");
    const targetSong = playerStore.playQueue?.[index];
    reportBehavior("QUEUE_SELECT", targetSong?.id || "", {queueIndex: index});
    await playQueueByIndex(index);
    closePlaylistPanel();
  }

  return {
    playPrevSong,
    playNextSong,
    playSongAtIndex,
  };
}
