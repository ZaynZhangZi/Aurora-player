// Preserve Aurora's word boundaries and timing; upstream engines own segmentation/layout.
export function toFoliaLines(rawLines = []) {
  const converted = (Array.isArray(rawLines) ? rawLines : []).filter(Boolean).map((raw, index) => {
    const words = (raw.words || []).map(word => ({text: String(word.word ?? ''),
      startTime: Number(word.startTime || 0) / 1000, endTime: Number(word.endTime || 0) / 1000}))
    return {id: `${index}-${raw.startTime}`, words, fullText: words.map(word => word.text).join(''),
      startTime: Number(raw.startTime || 0) / 1000, endTime: Number(raw.endTime || 0) / 1000,
      translation: raw.translatedLyric || undefined, romanization: raw.romanLyric || undefined,
      agentId: raw.agentId || (raw.isDuet ? 'v2' : 'v1'), isBG: Boolean(raw.isBG)}
  }).filter(line => line.fullText.trim()).sort((a, b) => a.startTime - b.startTime)
  const leads = converted.filter(line => !line.isBG).map(line => {const lead = {...line}; delete lead.isBG; return lead})
  for (const harmony of converted.filter(line => line.isBG)) {
    const parent = leads.findLast(line => line.startTime <= harmony.startTime && line.endTime >= harmony.startTime)
      || leads.findLast(line => line.startTime <= harmony.startTime) || leads[0]
    if (!parent) continue
    const vocal = {text: harmony.fullText, words: harmony.words, startTime: harmony.startTime, endTime: harmony.endTime,
      translation: harmony.translation, romanization: harmony.romanization, agentId: harmony.agentId}
    parent.backgroundVocals = [...(parent.backgroundVocals || []), vocal]
  }
  return leads
}

export function foliaLineIndex(lines, seconds) {
  let low = 0, high = lines.length - 1, found = -1
  while (low <= high) {
    const middle = (low + high) >> 1
    if (lines[middle].startTime <= seconds) {found = middle; low = middle + 1}
    else high = middle - 1
  }
  // Match Folia's latest active line rule, including overlapping duet lines.
  for (let index = found; index >= 0; index--) {
    if (seconds <= (lines[index].renderHints?.renderEndTime ?? lines[index].endTime)) return index
  }
  return -1
}

export const FOLIA_MODE_MAP = Object.freeze({manuscript: 'fume', stage: 'classic', cadenza: 'cadenza', parata: 'partita', cappella: 'cappella', tilt: 'tilt', diorama: 'diorama', pendolo: 'pendolo'})

export function foliaPreviewTheme(mode) {
  const theme = {name: 'Folia Preview', backgroundColor: '#0f172a', primaryColor: '#f8fafc', accentColor: '#fbbf24',
    secondaryColor: '#38bdf8', fontStyle: ['fume', 'classic', 'cadenza', 'partita'].includes(mode) ? 'serif' : 'sans',
    animationIntensity: 'normal', fontWeight: 400, lyricsIcons: ['Sun', 'Flame', 'Wind']}
  if (mode === 'cappella') Object.assign(theme, {backgroundColor: '#101318', primaryColor: '#e2e8f0', accentColor: '#63c7eb', secondaryColor: '#65b3cf'})
  if (mode === 'tilt') Object.assign(theme, {backgroundColor: '#111827', accentColor: '#6dbbf4', secondaryColor: '#626b7e'})
  if (mode === 'diorama') Object.assign(theme, {backgroundColor: '#111827', primaryColor: '#a5b2c1', accentColor: '#e5f3ff', secondaryColor: '#334155', fontWeight: 300})
  if (mode === 'pendolo') Object.assign(theme, {backgroundColor: '#000000', primaryColor: '#b5d3d8', accentColor: '#ced8ed', secondaryColor: '#475569', fontWeight: 300})
  if (['tilt', 'diorama'].includes(mode)) theme.lyricsIcons = ['Heart', 'Waves', 'Star', 'Wind']
  if (mode === 'cappella') theme.lyricsIcons = ['Heart', 'Music', 'Sparkles']
  if (mode === 'pendolo') theme.lyricsIcons = ['Star']
  return theme
}
