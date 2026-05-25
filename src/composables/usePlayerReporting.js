export function usePlayerReporting({
  reportApi,
  getCurrentSong,
  getCurrentAudio,
  getArtistNames,
}) {
  let reportedPlayRecordKeys = new Set();

  function resetPlayRecordCache() {
    reportedPlayRecordKeys = new Set();
  }

  function reportBehavior(actionType, actionTarget = "", actionDetail = {}) {
    reportApi.reportBehavior({
      actionType,
      actionTarget: String(actionTarget || ""),
      actionDetail: JSON.stringify(actionDetail || {}),
    });
  }

  function reportCurrentPlayRecord({completed = false, started = false} = {}) {
    const song = getCurrentSong?.();
    const songId = String(song?.id || "");
    if (!songId) return;

    const active = getCurrentAudio?.();
    const durationSec = Math.round(Number(active?.duration || 0));
    const playDuration = Math.round(Number(active?.currentTime || 0));
    const progress =
      durationSec > 0 ? Math.min(1, playDuration / durationSec) : 0;

    if (!started && !completed && playDuration < 30 && progress < 0.5) return;

    const reportType = started ? "started" : completed ? "completed" : "partial";
    const reportKey = `${songId}:${reportType}:${started ? 0 : Math.floor(playDuration / 15)}`;
    if (reportedPlayRecordKeys.has(reportKey)) return;
    reportedPlayRecordKeys.add(reportKey);

    reportApi.reportPlayRecord({
      songId,
      songName: song?.name,
      artist: (getArtistNames?.() || []).filter(Boolean).join(", "),
      album: song?.album?.name || song?.al?.name || "",
      duration: durationSec || undefined,
      coverUrl: song?.cover,
      playDuration,
      playProgress: progress,
      completed,
    });
  }

  return {
    reportBehavior,
    reportCurrentPlayRecord,
    resetPlayRecordCache,
  };
}
