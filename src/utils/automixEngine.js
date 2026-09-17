import initAutomix, {
  analyze_pcm_js,
  compute_transition_plan_v2_js,
  engine_version_js,
  init_wasm,
  mix_score_js,
  plan_track_path_js,
} from '@/wasm/automix/automix.js'
import {autoMixEngine} from '@/audio/AutoMixEngine.js'

const DEFAULT_BPM = 124
const BEATS_PER_BAR = 4
const MAX_AUTOMIX_CANDIDATES = 48
const DEFAULT_PATH_HORIZON = 4
const DEFAULT_BEAM_WIDTH = 7
const MIN_PATH_CONFIDENCE = 0.62
const MIN_STEP_CONFIDENCE = 0.60
const MIN_STEP_TOTAL = 0.62
const MIN_REORDER_ADVANTAGE = 0.08

let automixReadyPromise = null
let automixInitError = null
let automixEngineVersion = ''
let recommendationCache = {
  signature: '',
  currentQueueIndex: -1,
  recommendedQueueIndex: -1,
  forwardOnly: false,
  preserveOrder: false,
}
let lastAutomixAnalysis = null

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function finiteNumber(value, {min = -Infinity, max = Infinity} = {}) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < min || number > max) return null
  return number
}

function normalizedConfidence(value) {
  const number = finiteNumber(value, {min: 0, max: 1})
  return number === null ? null : number
}

function normalizeMode(mode) {
  const value = String(mode || '').trim().toLowerCase()
  return value === 'major' || value === 'minor' ? value : null
}

function normalizePositions(values, duration) {
  if (!Array.isArray(values)) return []
  const upper = Number.isFinite(duration) && duration > 0 ? duration + 0.25 : Infinity
  return [...new Set(values
    .map(value => finiteNumber(value, {min: 0, max: upper}))
    .filter(value => value !== null)
    .sort((a, b) => a - b))]
}

function normalizeSections(values, duration) {
  if (!Array.isArray(values)) return []
  return values
    .map(segment => ({
      start: finiteNumber(segment?.start, {min: 0, max: duration}),
      end: finiteNumber(segment?.end, {min: 0, max: duration}),
      label: String(segment?.label || 'other').trim().toLowerCase() || 'other',
      confidence: normalizedConfidence(segment?.confidence),
    }))
    .filter(segment => segment.start !== null && segment.end !== null && segment.end > segment.start)
    .sort((a, b) => a.start - b.start)
}

function normalizeRanges(values, duration) {
  if (!Array.isArray(values)) return []
  return values
    .map(range => ({
      start: finiteNumber(range?.start, {min: 0, max: duration}),
      end: finiteNumber(range?.end, {min: 0, max: duration}),
    }))
    .filter(range => range.start !== null && range.end !== null && range.end > range.start)
    .sort((a, b) => a.start - b.start)
}

function normalizeMixRegions(values, duration) {
  if (!Array.isArray(values)) return []
  return values
    .map(region => ({
      start: finiteNumber(region?.start, {min: 0, max: duration}),
      end: finiteNumber(region?.end, {min: 0, max: duration}),
      direction: String(region?.direction || '').trim().toLowerCase(),
      confidence: normalizedConfidence(region?.confidence),
    }))
    .filter(region => (
      region.start !== null &&
      region.end !== null &&
      region.end > region.start &&
      ['in', 'out'].includes(region.direction)
    ))
    .sort((a, b) => a.start - b.start)
}

function normalizeEnergyCurve(values, duration) {
  if (!Array.isArray(values)) return []
  return values
    .map(point => ({
      time: finiteNumber(point?.time, {min: 0, max: duration}),
      value: finiteNumber(point?.value, {min: 0, max: 1}),
    }))
    .filter(point => point.time !== null && point.value !== null)
    .sort((a, b) => a.time - b.time)
}

function normalizeConfidence(profile = {}) {
  const confidence = profile?.confidence || profile?.feature_confidence || {}
  return {
    tempo: normalizedConfidence(confidence.tempo),
    beat_grid: normalizedConfidence(confidence.beat_grid),
    key: normalizedConfidence(confidence.key),
    energy: normalizedConfidence(confidence.energy),
    loudness: normalizedConfidence(confidence.loudness),
    structure: normalizedConfidence(confidence.structure),
    vocal: normalizedConfidence(confidence.vocal),
    overall: normalizedConfidence(confidence.overall),
  }
}

function createQueueSignature(playQueue = []) {
  return playQueue
    .map((song) => {
      const profile = song?.mixProfile || {}
      return [
        song?.id || 'x',
        profile.analysis_version || 0,
        finiteNumber(profile.bpm, {min: 40, max: 240}) ?? 'x',
        finiteNumber(profile.energy, {min: 0, max: 1}) ?? 'x',
        Array.isArray(profile.beat_positions) ? profile.beat_positions.length : 0,
        finiteNumber(profile.loudness_lufs, {min: -80, max: 3}) ?? 'x',
      ].join(':')
    })
    .join('|')
}

async function ensureAutomixReady() {
  if (!automixReadyPromise) {
    automixInitError = null
    automixReadyPromise = initAutomix()
      .then(() => {
        init_wasm()
        automixEngineVersion = engine_version_js()
        return true
      })
      .catch((error) => {
        automixReadyPromise = null
        automixInitError = error
        return false
      })
  }

  return automixReadyPromise
}

function buildTrackForAutomix(song) {
  const id = song?.id
  if (!id) return null

  const profile = song?.mixProfile || {}
  const durationCandidate = profile.duration ?? song?.duration ?? (Number(song?.dt) / 1000)
  const duration = finiteNumber(durationCandidate, {min: 1, max: 14400}) || 180
  const bpm = finiteNumber(profile.bpm ?? song?.bpm ?? song?.audioFeatures?.bpm, {min: 40, max: 240})
  const energy = finiteNumber(profile.energy ?? song?.energy ?? song?.audioFeatures?.energy, {min: 0, max: 1})
  const tonic = finiteNumber(profile?.key?.tonic ?? song?.key?.tonic ?? song?.audioFeatures?.key?.tonic, {min: 0, max: 11})
  const mode = normalizeMode(profile?.key?.mode ?? song?.key?.mode ?? song?.audioFeatures?.key?.mode)
  const introEnd = finiteNumber(profile.intro_end ?? song?.intro_end, {min: 0.001, max: duration})
  const outroStart = finiteNumber(profile.outro_start ?? song?.outro_start, {min: 0.001, max: duration})
  const artists = song?.artists || song?.ar || []
  const album = song?.album || song?.al || {}

  return {
    id: String(id),
    bpm,
    key: tonic !== null && Number.isInteger(tonic) && mode ? {tonic, mode} : null,
    energy,
    duration,
    intro_end: introEnd,
    outro_start: outroStart,
    beat_positions: normalizePositions(profile.beat_positions, duration),
    downbeat_positions: normalizePositions(profile.downbeat_positions, duration),
    section_segments: normalizeSections(profile.section_segments, duration),
    energy_curve: normalizeEnergyCurve(profile.energy_curve, duration),
    vocal_regions: normalizeRanges(profile.vocal_regions, duration),
    mix_regions: normalizeMixRegions(profile.mix_regions, duration),
    loudness_lufs: finiteNumber(profile.loudness_lufs, {min: -80, max: 3}),
    peak_dbfs: finiteNumber(profile.peak_dbfs, {min: -120, max: 6}),
    confidence: normalizeConfidence(profile),
    artist_ids: artists.map(artist => String(artist?.id || '')).filter(Boolean),
    album_id: String(profile.album_id || album?.id || song?.albumId || '').trim() || null,
    tags: Array.isArray(profile.tags) ? profile.tags.map(String).filter(Boolean) : [],
    analysis_version: finiteNumber(profile.analysis_version, {min: 1, max: 100000}),
  }
}

function buildPlaybackTransitionProfile(track) {
  if (!track) return null
  return {
    id: track.id,
    bpm: track.bpm,
    energy: track.energy,
    duration: track.duration,
    intro_end: track.intro_end,
    outro_start: track.outro_start,
    energy_curve: track.energy_curve,
    vocal_regions: track.vocal_regions,
    section_segments: track.section_segments,
    confidence: track.confidence,
  }
}

function buildCandidates(playQueue, currentQueueIndex, {forwardOnly = false} = {}) {
  const indexes = []
  for (let index = currentQueueIndex + 1; index < playQueue.length; index += 1) indexes.push(index)
  if (!forwardOnly) {
    for (let index = 0; index < currentQueueIndex; index += 1) indexes.push(index)
  }

  return indexes
    .map(index => ({index, track: buildTrackForAutomix(playQueue[index])}))
    .filter(item => item.track)
    .slice(0, MAX_AUTOMIX_CANDIDATES)
}

function analyzeCandidateScores(currentTrack, candidates) {
  return candidates.map(item => {
    try {
      const score = mix_score_js(currentTrack, item.track)
      return {
        queueIndex: item.index,
        trackId: item.track.id,
        bpm: item.track.bpm ?? '—',
        energy: item.track.energy ?? '—',
        scoreTotal: Number(score?.total ?? 0).toFixed(3),
        confidence: Number(score?.confidence_score ?? 0).toFixed(3),
        strategyReady: Boolean(score?.reliable),
        reasons: Array.isArray(score?.reason_codes) ? score.reason_codes.join(', ') : '',
      }
    } catch {
      return {queueIndex: item.index, trackId: item.track.id, scoreTotal: 'ERR'}
    }
  })
}

async function analyzeNextTrack(
  playQueue = [],
  currentQueueIndex = -1,
  {logPrefix = '[AutoMix]', forwardOnly = false, preserveOrder = false} = {},
) {
  const list = Array.isArray(playQueue) ? playQueue : []
  if (list.length <= 1 || currentQueueIndex < 0 || currentQueueIndex >= list.length) return -1

  const currentTrack = buildTrackForAutomix(list[currentQueueIndex])
  if (!currentTrack) return -1
  const candidates = buildCandidates(list, currentQueueIndex, {forwardOnly})
  if (!candidates.length) return -1
  const queueNext = candidates.find(item => item.index === currentQueueIndex + 1) || null
  if (preserveOrder && !queueNext) return -1

  const ready = await ensureAutomixReady()
  if (!ready) return -1

  try {
    const candidateAnalyses = analyzeCandidateScores(currentTrack, candidates)
    const path = plan_track_path_js({
      current: currentTrack,
      candidate_tracks: candidates.map(item => item.track),
      horizon: Math.min(DEFAULT_PATH_HORIZON, candidates.length),
      beam_width: DEFAULT_BEAM_WIDTH,
      context: {
        max_tempo_shift: 0.06,
        avoid_vocal_overlap: true,
        preferred_bars: [4, 8],
        min_beatmix_confidence: 0.82,
      },
    })
    const plannedStep = path?.steps?.[0] || null
    const pathConfidence = Number(path?.confidence || 0)
    const stepConfidence = Number(plannedStep?.score?.confidence_score || 0)
    const stepTotal = Number(plannedStep?.score?.total || 0)
    const pathIsReliable = Boolean(
      plannedStep
      && pathConfidence >= MIN_PATH_CONFIDENCE
      && plannedStep?.score?.reliable === true
      && stepConfidence >= MIN_STEP_CONFIDENCE
      && stepTotal >= MIN_STEP_TOTAL
    )
    const plannedId = String(plannedStep?.track_id || '')
    const plannedCandidate = candidates.find(item => String(item.track.id) === plannedId) || null
    const sequentialCandidate = queueNext || candidates[0]
    const sequentialScore = mix_score_js(currentTrack, sequentialCandidate.track)
    const changesQueueOrder = Boolean(
      plannedCandidate && plannedCandidate.index !== sequentialCandidate.index,
    )
    const reorderAdvantage = plannedCandidate
      ? stepTotal - Number(sequentialScore?.total || 0)
      : Number.NEGATIVE_INFINITY
    const reorderIsJustified = !changesQueueOrder
      || (!preserveOrder && reorderAdvantage >= MIN_REORDER_ADVANTAGE)
    const usePlannedSelection = Boolean(
      pathIsReliable && plannedCandidate && reorderIsJustified,
    )
    const selected = preserveOrder
      ? sequentialCandidate
      : usePlannedSelection
        ? plannedCandidate
        : sequentialCandidate
    const selectedUsesPlannedStep = Boolean(
      pathIsReliable
      && plannedCandidate
      && plannedCandidate.index === selected.index
      && plannedStep?.transition,
    )
    const fallbackScore = selected.index === sequentialCandidate.index
      ? sequentialScore
      : mix_score_js(currentTrack, selected.track)
    const transition = selectedUsesPlannedStep
      ? plannedStep.transition
      : compute_transition_plan_v2_js(currentTrack, selected.track)
    const score = selectedUsesPlannedStep && plannedStep?.score ? plannedStep.score : fallbackScore
    const reasonCodes = [
      ...(Array.isArray(score?.reason_codes) ? score.reason_codes : []),
      ...(preserveOrder ? ['queue_order_preserved'] : []),
      ...(!pathIsReliable ? ['path_confidence_rejected'] : []),
      ...(pathIsReliable && changesQueueOrder && !reorderIsJustified
        ? ['path_reorder_margin_rejected']
        : []),
    ]

    lastAutomixAnalysis = {
      engineVersion: automixEngineVersion,
      currentTrackId: currentTrack.id,
      selectedTrackId: selected.track.id,
      selectedQueueIndex: selected.index,
      transition,
      score,
      path,
      decisionConfidence: Number(
        selectedUsesPlannedStep ? pathConfidence : transition?.confidence || 0,
      ),
      usesAnalyzedFeatures: Boolean(score?.reliable),
      selectionPolicy: preserveOrder ? 'queue_order' : 'confidence_margin',
      reasonCodes,
      transitionContext: {
        currentTrack: buildPlaybackTransitionProfile(currentTrack),
        nextTrack: buildPlaybackTransitionProfile(selected.track),
      },
    }
    autoMixEngine.setTransitionPlan({
      transition,
      score,
      currentTrack,
      nextTrack: selected.track,
    })

    if (typeof console !== 'undefined') {
      console.groupCollapsed(
        `${logPrefix} v${automixEngineVersion || '?'} current=${currentTrack.id}, selected=${selected.track.id}, strategy=${transition?.kind || 'safe_fade'}`,
      )
      console.table(candidateAnalyses)
      console.log(`${logPrefix} path`, path)
      console.log(`${logPrefix} decision`, lastAutomixAnalysis)
      console.groupEnd()
    }

    return selected.index
  } catch (error) {
    autoMixEngine.cancelTransition('planner-error')
    if (typeof console !== 'undefined') console.warn(`${logPrefix} planning failed`, error)
    return -1
  }
}

export async function warmupAutomixRecommendation(playQueue = [], currentQueueIndex = -1, options = {}) {
  const signature = createQueueSignature(playQueue)
  const forwardOnly = Boolean(options?.forwardOnly)
  const preserveOrder = Boolean(options?.preserveOrder)
  const recommendedQueueIndex = await analyzeNextTrack(playQueue, currentQueueIndex, {
    logPrefix: '[AutoMix/Warmup]',
    forwardOnly,
    preserveOrder,
  })

  recommendationCache = {
    signature,
    currentQueueIndex,
    recommendedQueueIndex,
    forwardOnly,
    preserveOrder,
  }
  return recommendedQueueIndex
}

export function prewarmAutomixEngine({idle = true} = {}) {
  const trigger = () => ensureAutomixReady().catch(() => false)
  if (!idle) {
    trigger()
    return
  }
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(trigger)
  } else if (typeof window !== 'undefined') {
    window.setTimeout(trigger, 0)
  } else {
    trigger()
  }
}

export async function recommendNextQueueIndex(playQueue = [], currentQueueIndex = -1, options = {}) {
  const signature = createQueueSignature(playQueue)
  const forwardOnly = Boolean(options?.forwardOnly)
  const preserveOrder = Boolean(options?.preserveOrder)
  if (
    recommendationCache.signature === signature &&
    recommendationCache.currentQueueIndex === currentQueueIndex &&
    recommendationCache.forwardOnly === forwardOnly &&
    recommendationCache.preserveOrder === preserveOrder
  ) {
    return recommendationCache.recommendedQueueIndex
  }

  const recommendedQueueIndex = await analyzeNextTrack(playQueue, currentQueueIndex, {
    logPrefix: '[AutoMix]',
    forwardOnly,
    preserveOrder,
  })
  recommendationCache = {
    signature,
    currentQueueIndex,
    recommendedQueueIndex,
    forwardOnly,
    preserveOrder,
  }
  return recommendedQueueIndex
}

export function estimateCrossfadeDurationMs(bpm = DEFAULT_BPM, bars = 8) {
  const safeBars = Math.max(1, Number(bars) || 8)
  const safeBpm = clamp(Number(bpm) || DEFAULT_BPM, 60, 200)
  return Math.round((safeBars * BEATS_PER_BAR * 60 * 1000) / safeBpm)
}

function chooseBestBpmMatch(currentBpm, nextBpm) {
  const multipliers = [0.5, 1, 2]
  let best = {adjustedBpm: nextBpm, ratioDelta: Number.POSITIVE_INFINITY}
  for (const multiplier of multipliers) {
    const adjustedBpm = nextBpm * multiplier
    const ratioDelta = Math.abs((adjustedBpm - currentBpm) / currentBpm)
    if (ratioDelta < best.ratioDelta) best = {adjustedBpm, ratioDelta}
  }
  return best
}

export function resolveTempoRateForTransition(
  currentSong,
  nextSong,
  transition = null,
  {maxAdjustRatio = 0.06, minRate = 0.92, maxRate = 1.08} = {},
) {
  if (!transition?.tempo_adjust_required) return 1

  const plannedRate = finiteNumber(transition?.incoming_rate, {min: minRate, max: maxRate})
  if (plannedRate !== null && Math.abs(plannedRate - 1) <= maxAdjustRatio + 0.001) {
    return plannedRate
  }

  const currentTrack = buildTrackForAutomix(currentSong)
  const nextTrack = buildTrackForAutomix(nextSong)
  if (!currentTrack?.bpm || !nextTrack?.bpm) return 1
  const match = chooseBestBpmMatch(currentTrack.bpm, nextTrack.bpm)
  if (!Number.isFinite(match.ratioDelta) || match.ratioDelta > maxAdjustRatio || !match.adjustedBpm) return 1
  return clamp(currentTrack.bpm / match.adjustedBpm, minRate, maxRate)
}

export function getLastAutomixAnalysis() {
  return lastAutomixAnalysis
}

export async function planAutomixPath(
  playQueue = [],
  currentQueueIndex = -1,
  {horizon = 4, beamWidth = 7, forwardOnly = false, targetEnergyCurve = []} = {},
) {
  const list = Array.isArray(playQueue) ? playQueue : []
  if (!list.length || currentQueueIndex < 0 || currentQueueIndex >= list.length) return null
  const current = buildTrackForAutomix(list[currentQueueIndex])
  const candidateTracks = buildCandidates(list, currentQueueIndex, {forwardOnly}).map(item => item.track)
  if (!current || !candidateTracks.length || !(await ensureAutomixReady())) return null

  try {
    return plan_track_path_js({
      current,
      candidate_tracks: candidateTracks,
      horizon: Number(horizon) || 4,
      beam_width: Number(beamWidth) || 7,
      context: {
        target_energy_curve: Array.isArray(targetEnergyCurve) ? targetEnergyCurve : [],
        max_tempo_shift: 0.06,
        avoid_vocal_overlap: true,
        preferred_bars: [4, 8],
        min_beatmix_confidence: 0.82,
      },
    })
  } catch {
    return null
  }
}

export async function analyzePcmForAutomix(samples, sampleRate, channels = 1) {
  if (!(samples instanceof Float32Array)) throw new TypeError('samples must be a Float32Array')
  if (!(await ensureAutomixReady())) throw automixInitError || new Error('Automix WASM unavailable')
  return analyze_pcm_js(samples, Number(sampleRate), Number(channels))
}

export function getAutomixInitError() {
  return automixInitError
}
