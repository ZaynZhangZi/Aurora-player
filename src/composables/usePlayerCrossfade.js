export function usePlayerCrossfade(options) {
  const {
    playerStore,
    isSequenceMode,
    automixEnabled,
    getIdleAudio,
    isCrossfadeBusy,
    resolvePlayableUrlById,
    getLastAutomixAnalysis,
    recommendNextQueueIndex,
    log,
  } = options

  let crossfadePrewarmedSongId = ''
  let crossfadePrewarmedUrl = ''

  async function getCrossfadeTargetIndex() {
    const queue = playerStore.playQueue || []
    if (!queue.length || playerStore.currentQueueIndex < 0) return -1
    const currentIndex = playerStore.currentQueueIndex
    const sequenceMode = isSequenceMode()

    const analysis = getLastAutomixAnalysis()
    if (
      analysis?.currentTrackId &&
      String(analysis.currentTrackId) === String(playerStore.currentSong?.id) &&
      Number.isInteger(analysis.selectedQueueIndex) &&
      analysis.selectedQueueIndex >= 0
    ) {
      const selected = analysis.selectedQueueIndex
      if (!sequenceMode || selected > currentIndex) {
        return selected
      }
    }

    const suggested = await recommendNextQueueIndex(queue, currentIndex)
    if (!sequenceMode || suggested > currentIndex) {
      return suggested
    }

    return currentIndex < queue.length - 1 ? currentIndex + 1 : -1
  }

  async function prewarmCrossfadeDeck(reason = 'unknown') {
    const idle = getIdleAudio()
    if (!idle || isCrossfadeBusy()) return
    if (!automixEnabled()) return
    if (!playerStore.playQueue.length || playerStore.currentQueueIndex < 0) return

    const targetIndex = await getCrossfadeTargetIndex()
    if (targetIndex < 0 || targetIndex >= playerStore.playQueue.length) return
    if (targetIndex === playerStore.currentQueueIndex) return

    const targetSong = playerStore.playQueue[targetIndex]
    const targetId = Number(targetSong?.id)
    if (!Number.isFinite(targetId) || targetId <= 0) return

    const targetUrl = await resolvePlayableUrlById(targetId)
    if (!targetUrl || !idle || isCrossfadeBusy()) return

    if (crossfadePrewarmedSongId === String(targetSong.id) && crossfadePrewarmedUrl === targetUrl) {
      return
    }

    if (!idle.paused) return

    idle.src = targetUrl
    idle.load()
    crossfadePrewarmedSongId = String(targetSong.id)
    crossfadePrewarmedUrl = targetUrl

    log('[Automix/Warmup] deck prewarmed', {
      reason,
      targetId: targetSong.id,
      targetIndex,
    })
  }

  function isPrewarmedMatch(songId) {
    return crossfadePrewarmedSongId === String(songId) && Boolean(crossfadePrewarmedUrl)
  }

  function getPrewarmedUrl() {
    return crossfadePrewarmedUrl
  }

  function clearPrewarmed() {
    crossfadePrewarmedSongId = ''
    crossfadePrewarmedUrl = ''
  }

  return {
    getCrossfadeTargetIndex,
    prewarmCrossfadeDeck,
    isPrewarmedMatch,
    getPrewarmedUrl,
    clearPrewarmed,
  }
}
