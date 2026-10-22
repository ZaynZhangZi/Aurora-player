export function virtualListRange(count, offset, viewport, rowHeight, overscan = 8) {
  const total = Math.max(0, Math.floor(Number(count) || 0))
  if (!total) return {start: 0, end: 0, top: 0, bottom: 0}
  const size = Math.max(1, Number(rowHeight) || 1)
  const extra = Math.max(0, Math.floor(Number(overscan) || 0))
  const visible = Math.max(1, Math.ceil(Math.max(0, Number(viewport) || 0) / size))
  const first = Math.min(total - 1, Math.max(0, Math.floor((Number(offset) || 0) / size)))
  const start = Math.max(0, first - extra)
  const end = Math.min(total, first + visible + extra)
  return {start, end, top: start * size, bottom: (total - end) * size}
}
