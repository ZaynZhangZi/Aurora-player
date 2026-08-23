const NETEASE_IMAGE_HOST_PATTERN = /(^|\.)music\.126\.net$/i
const DEFAULT_RESPONSIVE_WIDTHS = [160, 240, 320, 480, 640, 960, 1280, 1600]

function currentPageUsesHttps() {
  return typeof window !== 'undefined' && window.location?.protocol === 'https:'
}

function toPositiveInteger(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 0
  return Math.round(number)
}

export function normalizeMediaUrl(value) {
  const raw = String(value || '').trim()
  if (!raw || /^(blob:|data:)/i.test(raw)) return raw
  if (raw.startsWith('//')) return `${currentPageUsesHttps() ? 'https:' : 'http:'}${raw}`

  try {
    const url = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'https://localhost')
    const isNeteaseMedia = NETEASE_IMAGE_HOST_PATTERN.test(url.hostname)
    if (url.protocol === 'http:' && (isNeteaseMedia || currentPageUsesHttps())) {
      url.protocol = 'https:'
    }
    return /^[a-z][a-z\d+.-]*:/i.test(raw) ? url.toString() : raw
  } catch {
    if (currentPageUsesHttps()) return raw.replace(/^http:\/\//i, 'https://')
    return raw
  }
}

export function isNeteaseImageUrl(value) {
  const normalized = normalizeMediaUrl(value)
  if (!normalized || /^(blob:|data:)/i.test(normalized)) return false
  try {
    return NETEASE_IMAGE_HOST_PATTERN.test(new URL(normalized).hostname)
  } catch {
    return false
  }
}

export function getOptimizedImageUrl(value, {width = 0, height = width} = {}) {
  const normalized = normalizeMediaUrl(value)
  const targetWidth = toPositiveInteger(width)
  const targetHeight = toPositiveInteger(height) || targetWidth
  if (!targetWidth || !isNeteaseImageUrl(normalized)) return normalized

  const url = new URL(normalized)
  url.protocol = 'https:'
  url.searchParams.set('param', `${targetWidth}y${targetHeight}`)
  return url.toString()
}

export function buildImageSrcSet(value, widths = DEFAULT_RESPONSIVE_WIDTHS) {
  if (!isNeteaseImageUrl(value)) return ''
  const normalizedWidths = [...new Set((Array.isArray(widths) ? widths : DEFAULT_RESPONSIVE_WIDTHS)
    .map(toPositiveInteger)
    .filter(Boolean))]
    .sort((a, b) => a - b)

  return normalizedWidths
    .map((width) => `${getOptimizedImageUrl(value, {width})} ${width}w`)
    .join(', ')
}

