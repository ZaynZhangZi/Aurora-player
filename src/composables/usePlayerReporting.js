export function usePlayerReporting({reportApi, getCurrentSong, getCurrentAudio, getArtistNames, now = Date.now}) {
  let session = null
  let lastMediaTime = 0, lastSampleAt = 0
  const newId = () => globalThis.crypto?.randomUUID?.() || 'play_' + now().toString(36) + '_' + Math.random().toString(36).slice(2)
  function samplePlayback(force = false) {
    const audio = getCurrentAudio?.()
    if (!audio || !session || String(getCurrentSong?.()?.id || '') !== session.song.songId) return
    if (Number.isFinite(audio.duration)) session.duration = audio.duration
    const current = Number(audio.currentTime || 0), time = now()
    const elapsed = Math.max(0, (time - lastSampleAt) / 1000)
    const delta = current - lastMediaTime
    const rate = Math.max(0.1, Number(audio.playbackRate || 1))
    if ((force || !audio.paused) && delta > 0 && delta <= elapsed * rate + 0.75) session.heard += delta
    lastMediaTime = current
    lastSampleAt = time
  }
  function emit(completed = false) {
    if (!session || session.user !== String(reportApi.getUserKey?.() || '')) return
    const audio = getCurrentAudio?.()
    const sameSong = String(getCurrentSong?.()?.id || '') === session.song.songId
    const seconds = Math.max(session.duration, sameSong && Number.isFinite(audio?.duration) ? Number(audio.duration) : 0)
    const played = Math.max(0, Math.round(session.heard))
    const progress = seconds > 0 ? Math.min(1, played / seconds) : 0
    completed = completed && progress >= 0.9
    const signature = [played, completed, Math.round(seconds)].join(':')
    if (session.signature === signature) return
    session.signature = signature
    reportApi.reportPlayRecord({...session.song, sessionId: session.id, userId: session.user,
      duration: Math.round(seconds) || undefined, playDuration: played, playProgress: progress, completed})
  }
  function resetPlayRecordCache() {
    if (session && !session.ended) emit(false)
    session = null
    lastMediaTime = 0
    lastSampleAt = now()
  }
  function reportBehavior(actionType, actionTarget = '', actionDetail = {}) {
    reportApi.reportBehavior({actionType, actionTarget: String(actionTarget || ''), actionDetail: JSON.stringify(actionDetail || {})})
  }
  function reportCurrentPlayRecord({completed = false, started = false} = {}) {
    const song = getCurrentSong?.(), audio = getCurrentAudio?.()
    const songId = String(song?.id || '')
    if (!songId) return
    const user = String(reportApi.getUserKey?.() || '')
    if (!session || session.song.songId !== songId || session.user !== user || (started && session.ended)) {
      session = {id: newId(), user, heard: 0, duration: Number.isFinite(audio?.duration) ? audio.duration : 0, ended: false,
        song: {songId, songName: song.name, artist: (getArtistNames?.() || []).filter(Boolean).join(', '),
          album: song.album?.name || song.al?.name || '', coverUrl: song.cover}}
      lastMediaTime = Number(audio?.currentTime || 0)
      lastSampleAt = now()
    } else if (started) {
      lastMediaTime = Number(audio?.currentTime || 0)
      lastSampleAt = now()
    } else samplePlayback(true)
    emit(completed)
    if (completed) session.ended = true
  }
  return {reportBehavior, reportCurrentPlayRecord, resetPlayRecordCache, samplePlayback}
}
