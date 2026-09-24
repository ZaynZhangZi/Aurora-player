export function usePlayerManualSwitch({
  playerStore,
  canPlayPrev,
  canPlayNext,
  reportBehavior,
  playQueueByDirection,
  playQueueByIndex,
  closePlaylistPanel,
  onManualSkip,
}) {
  async function playPrevSong() {
    if (!canPlayPrev()) return;
    onManualSkip?.("previous");
    reportBehavior("QUEUE_PREV", playerStore.currentSong?.id || "", {
      currentQueueIndex: playerStore.currentQueueIndex,
    });
    await playQueueByDirection("prev");
  }

  async function playNextSong() {
    if (!canPlayNext()) return;
    onManualSkip?.("next");
    reportBehavior("QUEUE_NEXT", playerStore.currentSong?.id || "", {
      currentQueueIndex: playerStore.currentQueueIndex,
    });
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
