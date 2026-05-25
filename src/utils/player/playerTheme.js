function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function rgbToHsl(r, g, b) {
  const rn = clamp(r / 255, 0, 1)
  const gn = clamp(g / 255, 0, 1)
  const bn = clamp(b / 255, 0, 1)
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) return { h: 0, s: 0, l }

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let h = 0
  if (max === rn) h = (gn - bn) / delta + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / delta + 2
  else h = (rn - gn) / delta + 4

  return { h: h * 60, s, l }
}

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360
  const sat = clamp(s, 0, 1)
  const lig = clamp(l, 0, 1)
  const c = (1 - Math.abs(2 * lig - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lig - c / 2

  let rn = 0
  let gn = 0
  let bn = 0

  if (hue < 60) {
    rn = c
    gn = x
  } else if (hue < 120) {
    rn = x
    gn = c
  } else if (hue < 180) {
    gn = c
    bn = x
  } else if (hue < 240) {
    gn = x
    bn = c
  } else if (hue < 300) {
    rn = x
    bn = c
  } else {
    rn = c
    bn = x
  }

  return [
    Math.round((rn + m) * 255),
    Math.round((gn + m) * 255),
    Math.round((bn + m) * 255),
  ]
}

export function getRgbBrightness([r, g, b]) {
  return (r * 299 + g * 587 + b * 114) / 1000
}

function mixRgb(from, to, ratio) {
  const t = clamp(ratio, 0, 1)
  return [
    Math.round(from[0] * (1 - t) + to[0] * t),
    Math.round(from[1] * (1 - t) + to[1] * t),
    Math.round(from[2] * (1 - t) + to[2] * t),
  ]
}

function getYellowGreenBias(hue) {
  const d1 = Math.abs(hue - 78)
  const d2 = Math.abs(hue - 118)
  const nearest = Math.min(d1, d2)
  return clamp(1 - nearest / 65, 0, 1)
}

export function buildThemeByBase(baseRgb) {
  const [r, g, b] = baseRgb
  const hsl = rgbToHsl(r, g, b)
  const yellowGreenBias = getYellowGreenBias(hsl.h)
  const neutral = [48, 58, 84]

  const base = hslToRgb(
    hsl.h,
    clamp(hsl.s * (0.78 - yellowGreenBias * 0.14) + 0.06, 0.22, 0.62),
    clamp(hsl.l * (0.48 - yellowGreenBias * 0.08) + 0.08, 0.16, 0.38),
  )
  const accent = hslToRgb(
    hsl.h + 14,
    clamp(hsl.s * (0.62 - yellowGreenBias * 0.12) + 0.08, 0.2, 0.52),
    clamp(hsl.l * (0.62 - yellowGreenBias * 0.1) + 0.16, 0.3, 0.56),
  )
  const glow = hslToRgb(
    hsl.h - 8,
    clamp(hsl.s * (0.46 - yellowGreenBias * 0.12) + 0.06, 0.16, 0.42),
    clamp(hsl.l + 0.2 - yellowGreenBias * 0.12, 0.48, 0.74),
  )

  const mixedBase = mixRgb(base, neutral, 0.12 + yellowGreenBias * 0.2)
  const mixedAccent = mixRgb(accent, neutral, 0.08 + yellowGreenBias * 0.16)
  const mixedGlow = mixRgb(glow, neutral, 0.05 + yellowGreenBias * 0.12)

  return {
    base: mixedBase,
    accent: mixedAccent,
    glow: mixedGlow,
    isDark: getRgbBrightness(mixedBase) < 146,
  }
}

export function blendTheme(fromTheme, toTheme, ratio) {
  const t = clamp(ratio, 0, 1)
  const base = mixRgb(fromTheme.base, toTheme.base, t)
  const accent = mixRgb(fromTheme.accent, toTheme.accent, t)
  const glow = mixRgb(fromTheme.glow, toTheme.glow, t)
  return {
    base,
    accent,
    glow,
    isDark: getRgbBrightness(base) < 146,
  }
}

export function createFallbackTheme(seedText = '') {
  const text = String(seedText || 'player')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  const fallbackBase = hslToRgb(hue, 0.56, 0.44)
  return buildThemeByBase(fallbackBase)
}
