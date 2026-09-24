const ANALYSIS_SAMPLE_RATE = 11_025
const RHYTHM_SAMPLE_RATE = 44_100
const RHYTHM_WINDOW_SECONDS = 42

let essentiaPromise

async function loadEssentia() {
  if (!essentiaPromise) {
    essentiaPromise = Promise.all([
      import('essentia.js/dist/essentia.js-core.es.js'),
      import('essentia.js/dist/essentia-wasm.es.js'),
    ]).then(([core, wasm]) => new core.default(wasm.EssentiaWASM))
  }
  return essentiaPromise
}

function finite(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value))
}

function dispose(value) {
  if (value && typeof value.delete === 'function') value.delete()
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor
}

function chooseRhythmWindow(profile, duration) {
  const windowSeconds = Math.min(RHYTHM_WINDOW_SECONDS, duration)
  if (duration <= windowSeconds + 1) return {start: 0, duration: windowSeconds}

  const edge = Math.min(8, duration * 0.08)
  const lastStart = Math.max(edge, duration - edge - windowSeconds)
  const curve = Array.isArray(profile?.energy_curve) ? profile.energy_curve : []
  const candidates = Math.max(1, Math.floor((lastStart - edge) / 4))
  let bestStart = edge
  let bestScore = -Infinity

  for (let candidate = 0; candidate <= candidates; candidate += 1) {
    const start = edge + (lastStart - edge) * candidate / Math.max(1, candidates)
    const values = curve
      .filter(point => Number(point?.time) >= start && Number(point?.time) < start + windowSeconds)
      .map(point => Number(point?.value))
      .filter(Number.isFinite)
    if (values.length === 0) continue
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
    const score = mean - Math.sqrt(variance) * 0.22
    if (score > bestScore) {
      bestScore = score
      bestStart = start
    }
  }

  return {start: bestStart, duration: windowSeconds}
}

function median(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function circularPhase(ticks, period, offset) {
  let real = 0
  let imaginary = 0
  for (const tick of ticks) {
    const angle = modulo(tick + offset, period) / period * Math.PI * 2
    real += Math.cos(angle)
    imaginary += Math.sin(angle)
  }
  if (Math.hypot(real, imaginary) < 1e-8) return null
  return modulo(Math.atan2(imaginary, real) / (Math.PI * 2) * period, period)
}

function normalizeEssentiaTempo(rawTempo, currentTempo) {
  if (!Number.isFinite(rawTempo) || rawTempo < 70 || rawTempo > 190) return null
  if (!Number.isFinite(currentTempo) || currentTempo <= 0) return rawTempo

  const alternatives = [rawTempo, rawTempo / 2, rawTempo * 2]
    .filter(value => value >= 70 && value <= 190)
  const closest = alternatives
    .sort((left, right) => Math.abs(left - currentTempo) - Math.abs(right - currentTempo))[0]
  const relativeDifference = Math.abs(closest - currentTempo) / currentTempo
  return relativeDifference <= 0.1 ? closest : null
}

function replaceBeatGrid(profile, bpm, ticks, offset, duration, confidence) {
  const period = 60 / bpm
  const phase = circularPhase(ticks, period, offset)
  if (phase === null) return false

  const beats = []
  for (let time = phase; time <= duration; time += period) {
    if (time >= 0) beats.push(Number(time.toFixed(4)))
  }
  if (beats.length < 8) return false

  const previousBeats = Array.isArray(profile.beat_positions) ? profile.beat_positions : []
  const previousDownbeats = Array.isArray(profile.downbeat_positions) ? profile.downbeat_positions : []
  const previousPeriod = Number.isFinite(profile.bpm) && profile.bpm > 0 ? 60 / profile.bpm : period
  let downbeatOffset = 0
  if (previousBeats.length > 0 && previousDownbeats.length > 0) {
    const oldPhase = modulo(previousBeats[0], previousPeriod)
    const oldDownbeatPhase = modulo(previousDownbeats[0], previousPeriod * 4)
    downbeatOffset = Math.round(modulo(oldDownbeatPhase - oldPhase, previousPeriod * 4) / previousPeriod) % 4
  }

  profile.bpm = bpm
  profile.beat_positions = beats
  profile.downbeat_positions = beats.filter((_, index) => index % 4 === downbeatOffset)
  profile.confidence ||= {}
  profile.confidence.tempo = Math.max(Number(profile.confidence.tempo || 0), confidence)
  profile.confidence.beat_grid = Math.max(Number(profile.confidence.beat_grid || 0), confidence * 0.88)
  return true
}

async function analyzeRhythm(essentia, samples, profile) {
  const duration = samples.length / ANALYSIS_SAMPLE_RATE
  if (duration < 12) return false

  const window = chooseRhythmWindow(profile, duration)
  const start = Math.max(0, Math.floor(window.start * ANALYSIS_SAMPLE_RATE))
  const end = Math.min(samples.length, Math.floor((window.start + window.duration) * ANALYSIS_SAMPLE_RATE))
  const excerpt = samples.subarray(start, end)
  if (excerpt.length < ANALYSIS_SAMPLE_RATE * 12) return false

  let excerptVector
  let resampledVector
  let ticksVector
  try {
    excerptVector = essentia.arrayToVector(excerpt)
    const resampled = essentia.Resample(excerptVector, ANALYSIS_SAMPLE_RATE, RHYTHM_SAMPLE_RATE, 1)
    resampledVector = resampled.signal
    const result = essentia.RhythmExtractor2013(resampledVector, 190, 'multifeature', 70)
    ticksVector = result.ticks
    const ticks = Array.from(essentia.vectorToArray(ticksVector))
      .map(finite)
      .filter(value => value !== null && value >= 0 && value < window.duration)
      .sort((left, right) => left - right)
    const detectedTempo = finite(result.bpm)
    const tempo = normalizeEssentiaTempo(detectedTempo, finite(profile.bpm))
    if (!tempo || !detectedTempo || ticks.length < 12) return false

    // Rhythm trackers sometimes choose the half/double-time interpretation.
    // Adapt the tick train to the chosen grid before estimating its phase.
    const phaseTicks = tempo < detectedTempo * 0.75
      ? ticks.filter((_, index) => index % 2 === 0)
      : ticks
    if (phaseTicks.length < 8) return false

    const targetPeriod = 60 / tempo
    const intervals = phaseTicks.slice(1).map((tick, index) => tick - phaseTicks[index])
      .filter(interval => interval >= targetPeriod * 0.68 && interval <= targetPeriod * 1.32)
    const typicalInterval = median(intervals)
    if (!typicalInterval || Math.abs(typicalInterval - targetPeriod) > targetPeriod * 0.12) return false

    const deviations = intervals.map(interval => Math.abs(interval - typicalInterval))
    const irregularity = median(deviations) / typicalInterval
    const trackerConfidence = clamp((finite(result.confidence) || 0) / 5.32)
    const confidence = clamp(trackerConfidence * (1 - clamp(irregularity, 0, 0.65)))
    const acceptedTempo = normalizeEssentiaTempo(tempo, finite(profile.bpm))
    if (!acceptedTempo || confidence < 0.28) return false

    return replaceBeatGrid(profile, acceptedTempo, phaseTicks, window.start, duration, confidence)
  } finally {
    dispose(ticksVector)
    dispose(resampledVector)
    dispose(excerptVector)
  }
}

const KEY_TO_TONIC = new Map([
  ['C', 0], ['C#', 1], ['DB', 1], ['D', 2], ['D#', 3], ['EB', 3],
  ['E', 4], ['F', 5], ['F#', 6], ['GB', 6], ['G', 7], ['G#', 8],
  ['AB', 8], ['A', 9], ['A#', 10], ['BB', 10], ['B', 11],
])

async function analyzeKeyAndLoudness(essentia, samples, profile) {
  let fullVector
  let keyImproved = false
  let loudnessImproved = false
  try {
    fullVector = essentia.arrayToVector(samples)
    try {
      const result = essentia.KeyExtractor(
        fullVector,
        true,
        4096,
        2048,
        36,
        5000,
        60,
        27.5,
        0.1,
        'edma',
        ANALYSIS_SAMPLE_RATE,
      )
      const keyName = String(result.key || '').toUpperCase().replaceAll('♭', 'B').replaceAll('♯', '#')
      const tonic = KEY_TO_TONIC.get(keyName)
      const keyStrength = clamp(finite(result.strength) || 0)
      if (tonic !== undefined && keyStrength >= 0.28) {
        profile.key = {tonic, mode: String(result.scale || '').toLowerCase()}
        profile.confidence ||= {}
        profile.confidence.key = Math.max(Number(profile.confidence.key || 0), keyStrength)
        keyImproved = true
      }
    } catch {
      // Keep the Rust estimate when the audio is too short or the key is ambiguous.
    }

    try {
      const loudness = essentia.LoudnessEBUR128(
        fullVector,
        fullVector,
        0.1,
        ANALYSIS_SAMPLE_RATE,
        false,
      )
      const integrated = finite(loudness.integratedLoudness)
      const range = finite(loudness.loudnessRange)
      if (integrated !== null && integrated > -70 && integrated < 5) {
        profile.loudness_lufs = integrated
        profile.loudness_range_lu = range
        profile.confidence ||= {}
        profile.confidence.loudness = 0.76
        loudnessImproved = true
      }
      dispose(loudness.momentaryLoudness)
      dispose(loudness.shortTermLoudness)
    } catch {
      // Loudness data is optional; the transition engine already treats missing data safely.
    }
  } finally {
    dispose(fullVector)
  }

  return keyImproved || loudnessImproved
}

export async function enhanceAutomixProfile(samples, profile) {
  const essentia = await loadEssentia()
  let rhythmImproved = false
  let tonalOrLoudnessImproved = false
  try {
    rhythmImproved = await analyzeRhythm(essentia, samples, profile)
  } catch {
    // An unavailable rhythm algorithm must not discard the other descriptors.
  }
  try {
    tonalOrLoudnessImproved = await analyzeKeyAndLoudness(essentia, samples, profile)
  } catch {
    // Keep the Rust profile if the optional key/loudness algorithms fail.
  }

  profile.analysis_engine = rhythmImproved || tonalOrLoudnessImproved
    ? 'essentia-js+rust-wasm'
    : 'rust-wasm-fallback'
  return profile
}
