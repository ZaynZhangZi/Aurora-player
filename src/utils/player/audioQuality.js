export const AUDIO_QUALITY_OPTIONS = Object.freeze([
  {level: 'standard', label: '标准', detail: '流畅播放', rank: 0, revealMs: 650},
  {level: 'exhigh', label: '极高', detail: '更丰富的细节', rank: 2, revealMs: 1000},
  {level: 'lossless', label: '无损', detail: '保留原始细节', rank: 3, revealMs: 1450},
  {level: 'hires', label: 'Hi-Res', detail: '高解析度音频', rank: 4, revealMs: 1850},
])

const QUALITY_RANK = Object.freeze({legacy: 0, standard: 0, higher: 1, exhigh: 2, lossless: 3, hires: 4})
const QUALITY_FALLBACKS = Object.freeze({
  standard: ['standard', 'legacy'],
  exhigh: ['exhigh', 'higher', 'standard', 'legacy'],
  lossless: ['lossless', 'exhigh', 'higher', 'standard', 'legacy'],
  hires: ['hires', 'lossless', 'exhigh', 'higher', 'standard', 'legacy'],
})

export function normalizeAudioQuality(value) {
  return AUDIO_QUALITY_OPTIONS.some(option => option.level === value) ? value : 'exhigh'
}

export function qualityFallbackLevels(value) {
  return QUALITY_FALLBACKS[normalizeAudioQuality(value)]
}

export function qualityRank(value) {
  return QUALITY_RANK[String(value || '').toLowerCase()] ?? -1
}

export function qualityLabel(value) {
  if (value === 'higher') return '较高'
  if (value === 'legacy') return '标准'
  return AUDIO_QUALITY_OPTIONS.find(option => option.level === value)?.label || '未知'
}

export function actualAudioQuality(entry, requestedLevel) {
  const reported = String(entry?.level || '').toLowerCase()
  if (qualityRank(reported) >= 0) return reported

  const bitrate = Number(entry?.br || entry?.bitrate || 0)
  if (bitrate >= 900000) return 'lossless'
  if (bitrate >= 280000) return 'exhigh'
  if (bitrate >= 180000) return 'higher'
  if (bitrate > 0) return 'standard'
  return requestedLevel
}
