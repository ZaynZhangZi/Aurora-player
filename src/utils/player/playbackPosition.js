const STORAGE_KEY = 'aurora-playback-position-v1'

export function normalizePlaybackPosition(positionMs, durationMs = 0) {
  const position = Math.max(0, Number(positionMs) || 0)
  const duration = Math.max(0, Number(durationMs) || 0)
  if (!Number.isFinite(position) || !Number.isFinite(duration)) return 0
  // A completed track starts again instead of immediately advancing on resume.
  return duration > 0 && position >= duration - 1000 ? 0 : Math.floor(position)
}

export function readPlaybackPosition(songId) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!songId || String(saved?.songId) !== String(songId)) return null
    const durationMs = Number(saved.durationMs)
    return {
      currentTimeMs: normalizePlaybackPosition(saved.currentTimeMs, durationMs),
      durationMs: Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0,
    }
  } catch { return null }
}

export function writePlaybackPosition(songId, currentTimeMs, durationMs) {
  if (!songId) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      songId,
      currentTimeMs: normalizePlaybackPosition(currentTimeMs, durationMs),
      durationMs: Math.max(0, Number(durationMs) || 0),
    }))
  } catch { /* Playback must work with storage disabled. */ }
}
