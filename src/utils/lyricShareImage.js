import {createShareLayout, SHARE_FONT, shareExportSize} from '@/utils/lyricShare.js'
import {getOptimizedImageUrl} from '@/utils/mediaUrl.js'

const covers = new Map()
const rgb = (channels, opacity = 1) => `rgba(${channels.join(',')},${opacity})`

function loadCover(url) {
  if (!url) return Promise.resolve(null)
  if (covers.has(url)) return covers.get(url)
  const request = new Promise(resolve => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.referrerPolicy = 'no-referrer'
    const finish = result => { clearTimeout(timer); image.onload = image.onerror = null; resolve(result) }
    const timer = setTimeout(() => finish(null), 4500)
    image.onload = () => finish(image)
    image.onerror = () => finish(null)
    image.src = getOptimizedImageUrl(url, {width: 480})
  })
  if (covers.size >= 8) covers.delete(covers.keys().next().value)
  covers.set(url, request)
  return request
}

function checkAborted(signal) { if (signal?.aborted) throw new DOMException('分享已取消', 'AbortError') }
const toBlob = (canvas, type) => new Promise((resolve, reject) => {
  canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片生成失败，请重试。')), type, .95)
})

export async function renderLyricShareImage(song, lines, options, {type = 'image/jpeg', signal} = {}) {
  if (!lines.length) throw new Error('请先选择要分享的歌词。')
  checkAborted(signal)
  // Let the busy state paint; selection/preview themselves never rasterize an image.
  await new Promise(resolve => setTimeout(resolve, 0))
  await document.fonts?.ready
  checkAborted(signal)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持生成图片。')
  const layout = createShareLayout(song, lines, options, ctx)
  const size = shareExportSize(layout, options.scale)
  const image = await loadCover(song.cover)
  checkAborted(signal)
  canvas.width = size.width
  canvas.height = size.height
  ctx.scale(size.scale, size.scale)
  const {base, accent, glow} = layout.palette
  const gradient = ctx.createLinearGradient(0, 0, 1500, layout.height)
  gradient.addColorStop(0, rgb(base))
  gradient.addColorStop(1, rgb(base.map(channel => Math.round(channel * .62))))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1500, layout.height)
  for (const [x, y, color] of [[1360, 60, accent], [80, layout.height * .72, glow]]) {
    const wash = ctx.createRadialGradient(x, y, 0, x, y, 1300)
    wash.addColorStop(0, rgb(color, .65))
    wash.addColorStop(1, rgb(color, 0))
    ctx.fillStyle = wash
    ctx.fillRect(0, 0, 1500, layout.height)
  }
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#fff'
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(92, 92, 104, 104, 16)
  ctx.clip()
  ctx.fillStyle = rgb(accent)
  ctx.fillRect(92, 92, 104, 104)
  if (image) {
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 92, 92, 104, 104)
  } else {
    ctx.font = `700 48px ${SHARE_FONT}`
    ctx.fillStyle = 'rgba(255,255,255,.8)'
    ctx.fillText(Array.from(song.name)[0] || '♪', 126, 162)
  }
  ctx.restore()
  ctx.fillStyle = '#fff'
  ctx.font = `650 42px ${SHARE_FONT}`
  ctx.fillText(layout.name, 226, 133)
  ctx.fillStyle = 'rgba(255,255,255,.65)'
  ctx.font = `500 32px ${SHARE_FONT}`
  ctx.fillText(layout.artists, 226, 179)
  for (const run of layout.runs) {
    ctx.font = `${run.weight} ${run.size}px ${SHARE_FONT}`
    ctx.textAlign = run.align === 'end' ? 'right' : 'left'
    ctx.fillStyle = `rgba(255,255,255,${run.opacity})`
    ctx.fillText(run.text, run.x, run.y)
  }
  checkAborted(signal)
  const blob = await toBlob(canvas, type === 'image/png' ? 'image/png' : 'image/jpeg')
  checkAborted(signal)
  return {blob, width: size.width, height: size.height, coverUnavailable: Boolean(song.cover && !image)}
}
