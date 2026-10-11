export const SHARE_GIF_FRAME_COUNT = 75
export const SHARE_GIF_FRAME_DELAY = 80
export const SHARE_GIF_DURATION = SHARE_GIF_FRAME_COUNT * SHARE_GIF_FRAME_DELAY
export const SHARE_GIF_MAX_PIXELS = 1_500_000
export const SHARE_GIF_MAX_BYTES = 24 * 1024 * 1024

export function shareGifExportSize(layout, scale = 1) {
  const width = ({1: 480, 1.5: 720, 2: 960})[Number(scale)] || 480
  const height = Math.round(layout.height * width / layout.width)
  if (height > 2400 || width * height > SHARE_GIF_MAX_PIXELS) throw new Error('GIF 歌词太长，请减少几行或降低清晰度；高清长图仍可用“保存图片”。')
  return {width, height, scale: width / layout.width}
}

const smoothstep = value => {
  const t = Math.min(1, Math.max(0, value))
  return t * t * (3 - 2 * t)
}

// The loop starts/ends in the same state; wrapped lines and their translations reveal together.
export function shareGifFrameMotion(layout, frame, {reducedMotion = false} = {}) {
  const elapsed = (frame % SHARE_GIF_FRAME_COUNT) * SHARE_GIF_FRAME_DELAY
  // Keep the first-frame thumbnail fully readable on apps that don't autoplay GIFs.
  const time = (elapsed + 1800) % SHARE_GIF_DURATION
  const angle = elapsed / SHARE_GIF_DURATION * Math.PI * 2
  const dx = reducedMotion ? 0 : Math.sin(angle) * 140
  const dy = reducedMotion ? 0 : (1 - Math.cos(angle)) * 70
  return {
    washes: [[1360 - dx, 60 + dy], [80 + dx, layout.height * .72 - dy]],
    runs: layout.runs.map(run => {
      const delay = 200 + (run.lineIndex || 0) / Math.max(1, layout.lineCount - 1) * 700
      const entered = smoothstep((time - delay) / 450)
      return {opacity: entered * (1 - smoothstep((time - 5100) / 700)), y: reducedMotion ? 0 : (1 - entered) * 12}
    }),
  }
}
