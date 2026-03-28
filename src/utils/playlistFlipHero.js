const pendingHeroMap = new Map()

function toRect(rect) {
  if (!rect) return null
  const left = Number(rect.left)
  const top = Number(rect.top)
  const width = Number(rect.width)
  const height = Number(rect.height)
  if (![left, top, width, height].every(Number.isFinite)) return null
  if (width <= 0 || height <= 0) return null
  return {left, top, width, height}
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function waitFrames(count = 1) {
  return new Promise((resolve) => {
    let left = Math.max(1, Number(count) || 1)
    const tick = () => {
      left -= 1
      if (left <= 0) {
        resolve()
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

export function setPendingPlaylistHeroTransition(id, payload = {}) {
  const num = Number(id)
  if (!Number.isFinite(num) || num <= 0) return

  pendingHeroMap.set(num, {
    id: num,
    coverRect: toRect(payload.coverRect),
    coverSrc: String(payload.coverSrc || ''),
    playlistName: String(payload.playlistName || ''),
    at: Date.now(),
  })
}

export function consumeLatestPendingPlaylistHeroTransition({maxAge = 2500} = {}) {
  let latestKey = null
  let latestPayload = null

  pendingHeroMap.forEach((payload, key) => {
    const createdAt = Number(payload?.at || 0)
    if (Date.now() - createdAt > maxAge) {
      pendingHeroMap.delete(key)
      return
    }

    if (!latestPayload || createdAt > Number(latestPayload.at || 0)) {
      latestPayload = payload
      latestKey = key
    }
  })

  if (!latestPayload || latestKey === null) return null
  pendingHeroMap.delete(latestKey)
  return latestPayload
}

export function peekPendingPlaylistHeroTransition(id, {maxAge = 2500} = {}) {
  const num = Number(id)
  if (!Number.isFinite(num) || num <= 0) return null
  const payload = pendingHeroMap.get(num)
  if (!payload) return null
  if (Date.now() - Number(payload.at || 0) > maxAge) {
    pendingHeroMap.delete(num)
    return null
  }
  return payload
}

export function consumePendingPlaylistHeroTransition(id, {maxAge = 2500} = {}) {
  const num = Number(id)
  if (!Number.isFinite(num) || num <= 0) return null
  const payload = pendingHeroMap.get(num)
  pendingHeroMap.delete(num)
  if (!payload) return null
  if (Date.now() - Number(payload.at || 0) > maxAge) return null
  return payload
}

export async function playPlaylistHeroEnter({
  payload,
  targetCardEl,
  targetCoverEl,
  duration = 540,
  easing = 'cubic-bezier(0.32, 0.72, 0, 1)',
} = {}) {
  void targetCardEl
  if (!payload || !targetCoverEl || prefersReducedMotion()) return

  const from = payload.coverRect
  if (!from) return

  await waitFrames(2)
  const to = toRect(targetCoverEl.getBoundingClientRect())
  if (!to) return

  const dx = from.left - to.left
  const dy = from.top - to.top
  const sx = from.width / to.width
  const sy = from.height / to.height

  const overlay = document.createElement('div')
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.background = 'rgba(0, 0, 0, 0.06)'
  overlay.style.opacity = '0'
  overlay.style.pointerEvents = 'none'
  overlay.style.zIndex = '1200'
  overlay.style.willChange = 'opacity'
  document.body.appendChild(overlay)

  targetCoverEl.style.transformOrigin = 'top left'
  targetCoverEl.style.willChange = 'transform, opacity'

  const animations = [
    targetCoverEl.animate(
      [
        {transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.98},
        {transform: 'translate(0px, 0px) scale(1, 1)', opacity: 1},
      ],
      {duration, easing, fill: 'both'},
    ),
    overlay.animate(
      [{opacity: 0}, {opacity: 1}, {opacity: 0}],
      {duration: Math.round(duration * 0.72), easing, fill: 'both'},
    ),
  ]

  try {
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})))
  } finally {
    targetCoverEl.style.willChange = ''
    targetCoverEl.style.transformOrigin = ''
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
  }
}
