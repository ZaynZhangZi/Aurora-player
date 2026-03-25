import initAutomix, {
  choose_next_track_js,
  init_wasm,
  mix_score_js,
} from '@/wasm/automix/automix.js'

const DEFAULT_BPM = 124
const DEFAULT_ENERGY = 0.62
const BEATS_PER_BAR = 4
const MAX_AUTOMIX_CANDIDATES = 24

let automixReadyPromise = null
let recommendationCache = {
  signature: '',
  currentQueueIndex: -1,
  recommendedQueueIndex: -1,
}
let lastAutomixAnalysis = null

function hashNumber(input = '') {
  let hash = 0
  const source = String(input)
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function createQueueSignature(playQueue = []) {
  return playQueue
    .map((song) => String(song?.id || 'x'))
    .join('|')
}

async function ensureAutomixReady() {
  if (!automixReadyPromise) {
    automixReadyPromise = initAutomix()
      .then(() => {
        init_wasm()
        return true
      })
      .catch(() => false)
  }

  return automixReadyPromise
}

function normalizeMode(mode) {
  return String(mode || '').toLowerCase() === 'major' ? 'major' : 'minor'
}

function normalizeSectionLabel(label) {
  const value = String(label || '').toLowerCase()
  if (!value) return 'other'
  const allow = ['intro', 'verse', 'chorus', 'breakdown', 'build', 'drop', 'bridge', 'outro', 'other']
  return allow.includes(value) ? value : 'other'
}

function ensureBeatGrid(existingBeats, {duration, bpm}) {
  if (Array.isArray(existingBeats) && existingBeats.length >= 8) {
    return existingBeats
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 0)
      .sort((a, b) => a - b)
  }

  const safeDuration = clamp(Number(duration) || 0, 8, 3600)
  const safeBpm = clamp(Number(bpm) || DEFAULT_BPM, 60, 200)
  const beatSec = 60 / safeBpm
  const totalBeats = Math.max(8, Math.floor(safeDuration / beatSec))
  return Array.from({length: totalBeats}, (_, i) => i * beatSec)
}

function ensureSections(existingSections, {duration, introEnd, outroStart}) {
  if (Array.isArray(existingSections) && existingSections.length > 0) {
    const normalized = existingSections
      .map((segment) => ({
        start: Number(segment?.start),
        end: Number(segment?.end),
        label: normalizeSectionLabel(segment?.label),
      }))
      .filter((segment) => Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.end > segment.start)
      .sort((a, b) => a.start - b.start)

    if (normalized.length > 0) return normalized
  }

  const safeDuration = clamp(Number(duration) || 180, 8, 3600)
  const safeIntroEnd = clamp(Number(introEnd) || Math.min(24, safeDuration * 0.12), 0, safeDuration)
  const safeOutroStart = clamp(Number(outroStart) || Math.max(safeDuration - 32, safeIntroEnd), safeIntroEnd, safeDuration)

  return [
    {start: 0, end: safeIntroEnd, label: 'intro'},
    {start: safeIntroEnd, end: safeOutroStart, label: 'verse'},
    {start: safeOutroStart, end: safeDuration, label: 'outro'},
  ].filter((segment) => segment.end > segment.start)
}

function buildTrackForAutomix(song) {
  const id = song?.id
  if (!id) return null

  const profile = song?.mixProfile || {}
  const durationCandidate = Number(profile.duration ?? song?.duration ?? (Number(song?.dt) / 1000))
  const duration = Number.isFinite(durationCandidate) && durationCandidate > 0 ? durationCandidate : 180

  const seed = hashNumber(id)
  const bpmSeed = 112 + (seed % 36)
  const energySeed = 0.4 + (seed % 50) / 100

  const bpm = clamp(Number(profile.bpm) || bpmSeed, 60, 200)
  const energy = clamp(Number(profile.energy) || energySeed, 0.1, 1)

  const tonicRaw = Number(profile?.key?.tonic)
  const tonic = Number.isInteger(tonicRaw) ? ((tonicRaw % 12) + 12) % 12 : seed % 12
  const mode = normalizeMode(profile?.key?.mode)

  const introEnd = clamp(Number(profile.intro_end) || Math.min(24, duration * 0.12), 0, duration)
  const outroStart = clamp(Number(profile.outro_start) || Math.max(duration - 32, introEnd), introEnd, duration)
  const beat_positions = ensureBeatGrid(profile.beat_positions, {duration, bpm})
  const section_segments = ensureSections(profile.section_segments, {duration, introEnd, outroStart})

  return {
    id: String(id),
    bpm,
    key: {tonic, mode},
    energy,
    duration,
    intro_end: introEnd,
    outro_start: outroStart,
    beat_positions,
    section_segments,
  }
}

function buildCandidates(playQueue, currentQueueIndex) {
  return playQueue
    .map((song, index) => ({song, index}))
    .filter(({index}) => index !== currentQueueIndex)
    .map(({song, index}) => ({index, track: buildTrackForAutomix(song)}))
    .filter((item) => item.track)
    .slice(0, MAX_AUTOMIX_CANDIDATES)
}

async function analyzeNextTrack(playQueue = [], currentQueueIndex = -1, {logPrefix = '[Automix]'} = {}) {
  const list = Array.isArray(playQueue) ? playQueue : []
  if (list.length <= 1 || currentQueueIndex < 0 || currentQueueIndex >= list.length) {
    if (typeof console !== 'undefined') {
      console.log(`${logPrefix} skip: invalid queue state`, {
        queueLength: list.length,
        currentQueueIndex,
      })
    }
    return -1
  }

  const currentTrack = buildTrackForAutomix(list[currentQueueIndex])
  if (!currentTrack) {
    if (typeof console !== 'undefined') {
      console.log(`${logPrefix} skip: current track has no valid id`)
    }
    return -1
  }

  const candidates = buildCandidates(list, currentQueueIndex)
  if (!candidates.length) {
    if (typeof console !== 'undefined') {
      console.log(`${logPrefix} skip: no valid candidates`)
    }
    return -1
  }

  const ready = await ensureAutomixReady()
  if (!ready) {
    if (typeof console !== 'undefined') {
      console.log(`${logPrefix} skip: wasm init failed`)
    }
    return -1
  }

  try {
    const candidateAnalyses = candidates.map((item) => {
      try {
        const score = mix_score_js(currentTrack, item.track)
        return {
          queueIndex: item.index,
          trackId: item.track.id,
          bpm: item.track.bpm,
          energy: item.track.energy,
          scoreTotal: Number(score?.total ?? 0).toFixed(3),
          bpmScore: Number(score?.bpm_score ?? 0).toFixed(3),
          keyScore: Number(score?.key_score ?? 0).toFixed(3),
          energyScore: Number(score?.energy_score ?? 0).toFixed(3),
          structureScore: Number(score?.structure_score ?? 0).toFixed(3),
          tempoRatioDelta: Number(score?.tempo_ratio_delta ?? 0).toFixed(4),
        }
      } catch {
        return {
          queueIndex: item.index,
          trackId: item.track.id,
          bpm: item.track.bpm,
          energy: item.track.energy,
          scoreTotal: 'ERR',
          bpmScore: 'ERR',
          keyScore: 'ERR',
          energyScore: 'ERR',
          structureScore: 'ERR',
          tempoRatioDelta: 'ERR',
        }
      }
    })

    const choice = choose_next_track_js(
      currentTrack,
      candidates.map((item) => item.track),
    )
    const selectedId = choice?.track_id
    const selected = selectedId
      ? candidates.find((item) => String(item.track.id) === String(selectedId))
      : null
    const transition = choice?.transition || null

    lastAutomixAnalysis = {
      currentTrackId: currentTrack.id,
      selectedTrackId: selectedId || null,
      selectedQueueIndex: selected?.index ?? -1,
      transition,
      score: choice?.score || null,
    }

    if (typeof console !== 'undefined') {
      console.groupCollapsed(
        `${logPrefix} current=${currentTrack.id}, candidates=${candidates.length}, selected=${choice?.track_id || 'none'}`,
      )
      console.log(`${logPrefix} current track`, currentTrack)
      console.table(candidateAnalyses)
      if (choice) {
        console.log(`${logPrefix} selected detail`, choice)
        if (choice?.transition) {
          console.log(`${logPrefix} transition`, choice.transition)
          console.log(
            `${logPrefix} 过渡时机: 当前歌在 ${Number(choice.transition.mix_out_start || 0).toFixed(2)}s 开始混出；下一首从 ${Number(choice.transition.mix_in_start || 0).toFixed(2)}s 混入；交叉淡化 ${Number(choice.transition.crossfade_duration || 0).toFixed(2)}s`,
          )
        }
      } else {
        console.log(`${logPrefix} no candidate passed threshold`)
      }
      console.groupEnd()
    }

    if (!selectedId) return -1
    return selected?.index ?? -1
  } catch {
    if (typeof console !== 'undefined') {
      console.log(`${logPrefix} error: scoring failed`)
    }
    return -1
  }
}

export async function warmupAutomixRecommendation(playQueue = [], currentQueueIndex = -1) {
  const signature = createQueueSignature(playQueue)
  const recommendedQueueIndex = await analyzeNextTrack(playQueue, currentQueueIndex, {
    logPrefix: '[Automix/Warmup]',
  })

  recommendationCache = {
    signature,
    currentQueueIndex,
    recommendedQueueIndex,
  }

  return recommendedQueueIndex
}

export async function recommendNextQueueIndex(playQueue = [], currentQueueIndex = -1) {
  const signature = createQueueSignature(playQueue)
  if (
    recommendationCache.signature === signature &&
    recommendationCache.currentQueueIndex === currentQueueIndex
  ) {
    if (typeof console !== 'undefined') {
      console.log('[Automix] cache hit', {
        currentQueueIndex,
        recommendedQueueIndex: recommendationCache.recommendedQueueIndex,
      })
    }
    return recommendationCache.recommendedQueueIndex
  }

  const recommendedQueueIndex = await analyzeNextTrack(playQueue, currentQueueIndex, {logPrefix: '[Automix]'})
  recommendationCache = {
    signature,
    currentQueueIndex,
    recommendedQueueIndex,
  }
  return recommendedQueueIndex
}

export function estimateCrossfadeDurationMs(bpm = DEFAULT_BPM, bars = 8) {
  const safeBars = Math.max(1, Number(bars) || 8)
  const safeBpm = clamp(Number(bpm) || DEFAULT_BPM, 60, 200)
  return Math.round((safeBars * BEATS_PER_BAR * 60 * 1000) / safeBpm)
}

export function getLastAutomixAnalysis() {
  return lastAutomixAnalysis
}
