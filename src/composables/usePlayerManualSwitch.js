import {PLAY_MODE} from "@/stores/playerStore.js";

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
  waitAudioMetadata,
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
}) {
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
      const suggestedIndex = await recommendNextQueueIndex(queue, safeCurrent);
      const isForwardSequence =
        mode === PLAY_MODE.SEQUENCE
          ? suggestedIndex > safeCurrent
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
      const crossfadeDuration = 0.14;

      setCrossfadeActive(true);
      setCrossfadeVisualActive(false);
      setCrossfadeTriggeredSongId(fromTrackId || null);

      if (secondary.getAttribute("src") !== targetUrl) {
        secondary.src = targetUrl;
        secondary.load();
      }
      await waitAudioMetadata(secondary);
      secondary.currentTime = 0;
      secondary.playbackRate = 1;
      secondary.volume = 0;

      try {
        await secondary.play();
      } catch {
        setCrossfadeActive(false);
        return false;
      }

      const baseVolume = clamp(Number(getVolume() || 0.85), 0, 1);
      const startTs = performance.now();

      await new Promise((resolve) => {
        const step = (now) => {
          if (!primary || !secondary) {
            resolve();
            return;
          }
          const progress = clamp((now - startTs) / (crossfadeDuration * 1000), 0, 1);
          const fadeOutGain = Math.cos(progress * Math.PI * 0.5);
          const fadeInGain = Math.sin(progress * Math.PI * 0.5);
          primary.volume = baseVolume * fadeOutGain;
          secondary.volume = baseVolume * fadeInGain;
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
      await promoteCrossfadedTrack(
        targetSong,
        targetUrl,
        promotedStartSec,
        targetIndex,
      );
      completeCrossfadeByDeckSwap({
        fromTrackId,
        toTrackId: targetSong.id,
        mixOutStart: Number(primary.currentTime || 0),
        mixInStart: 0,
        crossfadeDuration,
        promotedStartSec,
      });

      requestAutomixWarmup("manual-seamless-switch");
      return true;
    } finally {
      setCrossfadePreparing(false);
    }
  }

  async function playPrevSong() {
    if (!canPlayPrev()) return;
    reportBehavior("QUEUE_PREV", playerStore.currentSong?.id || "", {
      currentQueueIndex: playerStore.currentQueueIndex,
    });
    const switched = await tryManualSeamlessSwitch("prev");
    if (switched) return;
    await playQueueByDirection("prev");
  }

  async function playNextSong() {
    if (!canPlayNext()) return;
    reportBehavior("QUEUE_NEXT", playerStore.currentSong?.id || "", {
      currentQueueIndex: playerStore.currentQueueIndex,
    });
    const switched = await tryManualSeamlessSwitch("next");
    if (switched) return;
    await playQueueByDirection("next");
  }

  async function playSongAtIndex(index) {
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
