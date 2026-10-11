// Animate SVG coordinates, not its scale: the cover and text keep their size while the card grows.
export function createSharePreviewMotion(onHeight, {requestFrame, cancelFrame, duration = 320}) {
  let height = null
  let frame = null

  function stop() {
    if (frame !== null) cancelFrame(frame)
    frame = null
  }

  function setHeight(target, {animate = true} = {}) {
    stop()
    if (height === null || !animate || target === height) {
      height = target
      onHeight(height)
      return
    }
    const start = height
    let startedAt = null
    function tick(time) {
      frame = null
      startedAt ??= time
      const progress = Math.min(1, Math.max(0, (time - startedAt) / duration))
      const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2
      height = progress === 1 ? target : start + (target - start) * eased
      onHeight(height)
      if (progress < 1) frame = requestFrame(tick)
    }
    frame = requestFrame(tick)
  }

  return {setHeight, stop}
}
