import { buildThemeByBase, createFallbackTheme } from '@/utils/player/playerTheme.js'

export function usePlayerThemeFromCover() {
  let themePickToken = 0

  async function extractDominantBaseColorFromCover(cover) {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.referrerPolicy = 'no-referrer'

    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
      image.src = cover
    })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('canvas unavailable')

    const size = 52
    canvas.width = size
    canvas.height = size
    ctx.drawImage(image, 0, 0, size, size)

    const { data } = ctx.getImageData(0, 0, size, size)
    const bucketMap = new Map()

    for (let i = 0; i < data.length; i += 16) {
      const alpha = data[i + 3] / 255
      if (alpha < 0.08) continue

      const pr = data[i]
      const pg = data[i + 1]
      const pb = data[i + 2]
      const max = Math.max(pr, pg, pb)
      const min = Math.min(pr, pg, pb)
      const sat = max === 0 ? 0 : (max - min) / max
      const light = (max + min) / 510
      if (light < 0.06 || light > 0.94) continue

      const weight = alpha * (0.3 + sat * 1.2 + (1 - Math.abs(light - 0.48)) * 0.75)
      const key = `${Math.round(pr / 24)}-${Math.round(pg / 24)}-${Math.round(pb / 24)}`
      const current = bucketMap.get(key) || { r: 0, g: 0, b: 0, w: 0 }
      current.r += pr * weight
      current.g += pg * weight
      current.b += pb * weight
      current.w += weight
      bucketMap.set(key, current)
    }

    let best = null
    for (const item of bucketMap.values()) {
      if (!best || item.w > best.w) best = item
    }
    if (!best || best.w <= 0) throw new Error('no color')

    return [
      Math.round(best.r / best.w),
      Math.round(best.g / best.w),
      Math.round(best.b / best.w),
    ]
  }

  async function resolveThemeFromCover(cover, fallbackSeed = '') {
    if (!cover) {
      return createFallbackTheme(fallbackSeed)
    }

    try {
      const dominant = await extractDominantBaseColorFromCover(cover)
      return buildThemeByBase(dominant)
    } catch {
      return createFallbackTheme(fallbackSeed)
    }
  }

  async function pickThemeFromCover(cover, fallbackSeed, applyTheme) {
    if (!cover) {
      applyTheme(createFallbackTheme(fallbackSeed))
      return
    }

    const currentToken = ++themePickToken
    try {
      const theme = await resolveThemeFromCover(cover, fallbackSeed)
      if (currentToken !== themePickToken) return
      applyTheme(theme)
    } catch {
      if (currentToken !== themePickToken) return
      applyTheme(createFallbackTheme(fallbackSeed))
    }
  }

  return {
    resolveThemeFromCover,
    pickThemeFromCover,
  }
}
