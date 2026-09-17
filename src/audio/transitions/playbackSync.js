function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function waitForSeek(media, timeoutMs = 180) {
  if (!media?.seeking) return Promise.resolve()
  return new Promise((resolve) => {
    let settled = false
    let timeoutId = 0
    const finish = () => {
      if (settled) return
      settled = true
      media.removeEventListener?.('seeked', finish)
      clearTimeout(timeoutId)
      resolve()
    }
    timeoutId = setTimeout(finish, timeoutMs)
    media.addEventListener?.('seeked', finish, {once: true})
  })
}

/** Re-align the silent incoming deck after its real decoder start. */
export async function alignIncomingPlayback({
  outgoingMedia,
  incomingMedia,
  mixOutStart,
  mixInStart,
  incomingRate = 1,
  sanitize,
}) {
  if (!outgoingMedia || !incomingMedia) return {lateness: 0, correction: 0}
  const rate = clamp(Number(incomingRate || 1), 0.5, 2)
  let totalCorrection = 0
  let lateness = 0

  for (let attempt = 0; attempt < 2; attempt += 1) {
    lateness = Math.max(0, Number(outgoingMedia.currentTime || 0) - Number(mixOutStart || 0))
    const rawTarget = Math.max(0, Number(mixInStart || 0) + lateness * rate)
    const target = typeof sanitize === 'function'
      ? sanitize(incomingMedia, rawTarget)
      : rawTarget
    const correction = target - Number(incomingMedia.currentTime || 0)
    if (!Number.isFinite(correction) || Math.abs(correction) < 0.025) break
    try {
      incomingMedia.currentTime = target
      totalCorrection += correction
      await waitForSeek(incomingMedia)
    } catch {
      break
    }
  }

  return {lateness, correction: totalCorrection}
}
