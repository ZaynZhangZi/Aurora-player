export const SHARE_FONT = '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
export const DEFAULT_SHARE_OPTIONS = Object.freeze({showTranslation: true, showBackgroundVocals: true, boldText: true, scale: 1})
export const SHARE_WIDTH = 1500

const trimText = (value, limit = Infinity) => Array.from(String(value ?? '').trim()).slice(0, limit).join('')
export const shareLineText = line => trimText(Array.isArray(line?.words) ? line.words.map(word => word?.word || '').join('') : line?.text)

export function normalizeShareLines(lines) {
  return (Array.isArray(lines) ? lines : []).map((line, index) => ({
    id: `${Number(line?.startTime) || 0}:${index}`,
    timeMs: Math.max(0, Number(line?.startTime) || 0),
    text: shareLineText(line),
    translation: trimText(line?.translatedLyric),
    isBG: Boolean(line?.isBG),
    isDuet: Boolean(line?.isDuet),
  })).filter(line => Number.isFinite(line.timeMs) && line.text && !/^[\s·•…♪♫.\-]+$/u.test(line.text))
    .sort((a, b) => a.timeMs - b.timeMs)
}

export function normalizeShareSong(song) {
  const color = (value, fallback) => Array.isArray(value) && value.length === 3 && value.every(channel => Number.isFinite(Number(channel)))
    ? value.map(channel => Math.round(Math.min(255, Math.max(0, Number(channel))))) : fallback
  const cover = trimText(song?.cover, 2048)
  return {
    name: trimText(song?.name, 160) || '未知歌曲',
    artists: (Array.isArray(song?.artists) ? song.artists : []).map(artist => trimText(typeof artist === 'string' ? artist : artist?.name, 80)).filter(Boolean).join(' / ') || '未知艺人',
    cover: /^(https?:\/\/|\/[^/])/i.test(cover) ? cover : '',
    theme: {
      base: color(song?.theme?.base, [41, 47, 65]),
      accent: color(song?.theme?.accent, [105, 81, 113]),
      glow: color(song?.theme?.glow, [126, 140, 162]),
    },
  }
}

export function selectedShareLines(lines, selectedIds, options = DEFAULT_SHARE_OPTIONS) {
  const ids = new Set(selectedIds)
  // Backing vocals follow a selected lead line even if they were not clicked separately.
  let leadSelected = false
  return lines.filter(line => {
    const selected = ids.has(line.id)
    if (!line.isBG) leadSelected = selected
    return line.isBG ? options.showBackgroundVocals && (selected || leadSelected) : selected
  })
}

export function initialShareLine(lines, {line = null, timeMs = 0} = {}) {
  const direct = line && lines.find(item => item.timeMs === Number(line.startTime) && item.text === shareLineText(line))
  if (direct) return direct.id
  const leads = lines.filter(item => !item.isBG)
  return (leads.findLast(item => item.timeMs <= timeMs) || leads[0] || lines[0])?.id || ''
}

export function sharePalette(theme) {
  const darken = (channels, limit) => {
    const peak = Math.max(1, ...channels)
    return channels.map(channel => Math.round(channel * Math.min(1, limit / peak)))
  }
  return {base: darken(theme.base, 92), accent: darken(theme.accent, 148), glow: darken(theme.glow, 160)}
}

export function wrapShareText(ctx, text, width) {
  const rows = []
  for (const paragraph of String(text).split('\n')) {
    let row = ''
    const tokens = paragraph.match(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*|\s+|[^\s]/gu) || []
    for (const token of tokens) {
      if (ctx.measureText(token).width > width) {
        for (const character of Array.from(token)) {
          if (row && ctx.measureText(row + character).width > width) { rows.push(row.trim()); row = '' }
          row += character
        }
      } else if (row && ctx.measureText(row + token).width > width) {
        rows.push(row.trim())
        row = token.trimStart()
      } else row += token
    }
    if (row.trim()) rows.push(row.trim())
  }
  return rows
}

function fitHeader(ctx, value, width) {
  if (ctx.measureText(value).width <= width) return value
  const characters = Array.from(value)
  while (characters.length && ctx.measureText(`${characters.join('')}…`).width > width) characters.pop()
  return `${characters.join('')}…`
}

// SVG preview and Canvas export consume the same measured layout, including duet alignment.
export function createShareLayout(song, lines, options, ctx) {
  const runs = []
  let y = 316
  for (const [lineIndex, line] of lines.entries()) {
    const size = line.isBG ? 44 : 66
    const weight = options.boldText ? 750 : 500
    const lineHeight = Math.round(size * 1.35)
    const x = line.isDuet ? 1408 : line.isBG ? 130 : 92
    const width = line.isBG ? 1170 : 1316
    ctx.font = `${weight} ${size}px ${SHARE_FONT}`
    for (const text of wrapShareText(ctx, line.text, width)) {
      runs.push({text, x, y, size, weight, align: line.isDuet ? 'end' : 'start', opacity: line.isBG ? .72 : 1, lineIndex})
      y += lineHeight
    }
    if (options.showTranslation && line.translation) {
      ctx.font = `500 36px ${SHARE_FONT}`
      for (const text of wrapShareText(ctx, line.translation, width)) {
        runs.push({text, x, y: y - 5, size: 36, weight: 500, align: line.isDuet ? 'end' : 'start', opacity: .6, lineIndex})
        y += 50
      }
    }
    y += line.isBG ? 22 : 44
  }
  const height = Math.max(700, y + 158)
  ctx.font = `650 42px ${SHARE_FONT}`
  const name = fitHeader(ctx, song.name, 1110)
  ctx.font = `500 32px ${SHARE_FONT}`
  const artists = fitHeader(ctx, song.artists, 1110)
  return {width: SHARE_WIDTH, height, runs, name, artists, lineCount: lines.length, palette: sharePalette(song.theme)}
}

export function formatShareTime(timeMs) {
  const seconds = Math.floor(timeMs / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function shareFileName(song, format = 'jpg') {
  const name = Array.from(song.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim()).slice(0, 60).join('') || '歌曲'
  return `${name}-歌词分享.${format === 'gif' ? 'gif' : 'jpg'}`
}

export function shareExportSize(layout, scale = 1) {
  const safeScale = [1, 1.5, 2].includes(Number(scale)) ? Number(scale) : 1
  const width = Math.round(layout.width * safeScale)
  const height = Math.round(layout.height * safeScale)
  if (height > 16000 || width * height > 24_000_000) throw new Error('所选歌词太长，请减少几行或降低导出清晰度。')
  return {width, height, scale: safeScale}
}
