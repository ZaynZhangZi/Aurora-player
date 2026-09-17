const CURVE_POINT_COUNT = 25

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function finite(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function smootherStep(value) {
  const x = clamp(value, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

function profileOf(track) {
  if (!track || typeof track !== 'object') return {}
  return track.mixProfile && typeof track.mixProfile === 'object'
    ? {...track, ...track.mixProfile}
    : track
}

function curveEnergyAt(track, time, fallback = 0.5) {
  const profile = profileOf(track)
  const points = Array.isArray(profile.energy_curve)
    ? profile.energy_curve
        .map(point => ({time: finite(point?.time), value: finite(point?.value)}))
        .filter(point => point.time !== null && point.value !== null)
        .sort((left, right) => left.time - right.time)
    : []
  if (!points.length) return clamp(finite(profile.energy, fallback), 0, 1)
  if (time <= points[0].time) return clamp(points[0].value, 0, 1)
  for (let index = 1; index < points.length; index += 1) {
    const right = points[index]
    if (time > right.time) continue
    const left = points[index - 1]
    const span = Math.max(0.001, right.time - left.time)
    const progress = (time - left.time) / span
    return clamp(left.value + (right.value - left.value) * progress, 0, 1)
  }
  return clamp(points.at(-1).value, 0, 1)
}

function windowEnergy(track, start, duration, fallback) {
  const samples = 7
  let total = 0
  for (let index = 0; index < samples; index += 1) {
    total += curveEnergyAt(track, start + duration * index / (samples - 1), fallback)
  }
  return total / samples
}

function rangeCoverage(track, start, duration) {
  const profile = profileOf(track)
  const end = start + Math.max(0.01, duration)
  const covered = (Array.isArray(profile.vocal_regions) ? profile.vocal_regions : [])
    .reduce((total, range) => {
      const overlapStart = Math.max(start, finite(range?.start, end))
      const overlapEnd = Math.min(end, finite(range?.end, start))
      return total + Math.max(0, overlapEnd - overlapStart)
    }, 0)
  return clamp(covered / Math.max(0.01, duration), 0, 1)
}

function sectionAt(track, time) {
  const profile = profileOf(track)
  const section = (Array.isArray(profile.section_segments) ? profile.section_segments : [])
    .find(item => time >= Number(item?.start) && time < Number(item?.end))
  return String(section?.label || '').toLowerCase()
}

function minimumDurationFor(kind) {
  if (kind === 'beat_mix') return 6
  if (kind === 'phrase_crossfade') return 3.2
  if (kind === 'loop_bridge') return 2.4
  if (kind === 'echo_filter_out') return 4
  if (kind === 'quick_cut' || kind === 'safe_fade') return 2.8
  if (kind === 'vocal_safe_fade') return 3.4
  return 0
}

function quantizedBassCenter(center, bars) {
  const safeBars = Math.trunc(finite(bars, 0))
  if (safeBars < 4) return clamp(center, 0.42, 0.62)
  const quantum = 1 / Math.min(8, safeBars)
  return clamp(Math.round(center / quantum) * quantum, 0.375, 0.625)
}

function buildAdaptiveCurves(original, context, duration) {
  const kind = String(original.kind || '')
  const isLoop = kind === 'loop_bridge'
  const isBeatMix = kind === 'beat_mix'
  const isPhraseMix = kind === 'phrase_crossfade'
  const isTransparent = ['safe_fade', 'vocal_safe_fade', 'gapless'].includes(kind)
  const currentTrack = context?.currentTrack || context?.current || null
  const nextTrack = context?.nextTrack || context?.next || null
  const outStart = Math.max(0, finite(original.mix_out_start, 0))
  const inStart = Math.max(0, finite(original.mix_in_start, 0))
  const currentEnergy = clamp(finite(profileOf(currentTrack).energy, 0.5), 0, 1)
  const nextEnergy = clamp(finite(profileOf(nextTrack).energy, 0.5), 0, 1)
  const outgoingEnergy = windowEnergy(currentTrack, outStart, duration, currentEnergy)
  const incomingEnergy = windowEnergy(nextTrack, inStart, duration, nextEnergy)
  const outgoingVocal = rangeCoverage(currentTrack, outStart, duration)
  const incomingVocal = rangeCoverage(nextTrack, inStart, duration)
  const incomingSection = sectionAt(nextTrack, inStart)
  const outgoingSection = sectionAt(currentTrack, outStart)

  let handoffCenter = 0.5
  const energyDelta = incomingEnergy - outgoingEnergy
  handoffCenter += clamp(energyDelta * 0.16, -0.07, 0.07)
  if (incomingSection === 'intro') handoffCenter -= 0.035
  if (outgoingSection === 'outro') handoffCenter -= 0.018
  if (incomingVocal > 0.25) handoffCenter += 0.035
  if (outgoingVocal > 0.25 && incomingVocal > 0.25) handoffCenter += 0.045
  if (kind === 'vocal_safe_fade') handoffCenter += 0.055
  handoffCenter = isTransparent ? 0.5 : clamp(handoffCenter, 0.42, 0.62)

  const bassCenter = quantizedBassCenter(handoffCenter, original.bars)
  const combinedEnergy = (outgoingEnergy + incomingEnergy) * 0.5
  const bassCut = isLoop
    ? clamp(7.5 + combinedEnergy * 3, 7.5, 10.5)
    : isBeatMix
      ? clamp(5 + combinedEnergy * 2.5, 5, 7.5)
      : isPhraseMix
        ? clamp(2.2 + combinedEnergy * 1.6, 2.2, 3.8)
        : isTransparent
          ? 0
          : clamp(2.5 + combinedEnergy * 1.5, 2.5, 4)
  const bassWidth = clamp(0.46 - combinedEnergy * 0.14, 0.3, 0.44)
  const vocalRisk = Math.max(outgoingVocal, incomingVocal)
  const midCut = isTransparent
    ? 0
    : isLoop
      ? clamp(0.45 + vocalRisk * 1.1, 0.45, 1.55)
      : isPhraseMix
        ? clamp(0.25 + vocalRisk * 0.45, 0.25, 0.7)
        : clamp(0.45 + vocalRisk * 1.35, 0.45, 1.8)
  const centerExponent = Math.log(0.5) / Math.log(handoffCenter)
  const outgoingGain = []
  const incomingGain = []
  const outgoingEq = []
  const incomingEq = []

  for (let index = 0; index < CURVE_POINT_COUNT; index += 1) {
    const offset = index / (CURVE_POINT_COUNT - 1)
    const handoff = smootherStep(offset ** centerExponent)
    const bassHandoff = smootherStep(
      (offset - (bassCenter - bassWidth * 0.5)) / bassWidth,
    )
    const vocalHandoff = smootherStep(
      (offset - (handoffCenter - 0.25)) / 0.5,
    )
    // Give the two bass curves a short overlap window. Complementary cuts put
    // both decks at half-cut in the middle and create an audible hollow spot.
    const incomingBassRecovery = smootherStep(bassHandoff / 0.25)
    const outgoingBassCut = smootherStep((bassHandoff - 0.75) / 0.25)
    const useVocalSeparation = vocalRisk > 0.2
    const incomingMidRecovery = useVocalSeparation
      ? vocalHandoff
      : smootherStep(vocalHandoff / 0.48)
    const outgoingMidCut = useVocalSeparation
      ? vocalHandoff
      : smootherStep((vocalHandoff - 0.52) / 0.48)
    const loopTail = isLoop ? smootherStep((offset - 0.68) / 0.32) : 0
    const loopIntro = isLoop ? 1 - smootherStep(offset / 0.48) : 0
    outgoingGain.push({offset, value: Math.cos(handoff * Math.PI * 0.5)})
    incomingGain.push({offset, value: Math.sin(handoff * Math.PI * 0.5)})
    outgoingEq.push({
      offset,
      low: -bassCut * outgoingBassCut,
      mid: -midCut * outgoingMidCut - loopTail * 0.8,
      high: -loopTail * 1.5,
    })
    incomingEq.push({
      offset,
      low: -bassCut * (1 - incomingBassRecovery),
      mid: -midCut * (1 - incomingMidRecovery),
      high: -loopIntro * 0.5,
    })
  }

  return {
    outgoingGain,
    incomingGain,
    outgoingEq,
    incomingEq,
    shape: {
      mode: isTransparent ? 'transparent_equal_power' : 'content_adaptive',
      handoff_center: handoffCenter,
      bass_handoff_center: bassCenter,
      bass_handoff_width: bassWidth,
      outgoing_energy: outgoingEnergy,
      incoming_energy: incomingEnergy,
      outgoing_vocal_coverage: outgoingVocal,
      incoming_vocal_coverage: incomingVocal,
      outgoing_section: outgoingSection || null,
      incoming_section: incomingSection || null,
    },
  }
}

export function sampleTransitionGain(points, progress, incoming = false) {
  const safeProgress = clamp(progress, 0, 1)
  const fallback = incoming
    ? Math.sin(safeProgress * Math.PI * 0.5)
    : Math.cos(safeProgress * Math.PI * 0.5)
  if (!Array.isArray(points) || points.length < 2) return fallback
  const ordered = points
    .map(point => ({offset: finite(point?.offset), value: finite(point?.value)}))
    .filter(point => point.offset !== null && point.value !== null)
    .sort((left, right) => left.offset - right.offset)
  if (ordered.length < 2) return fallback
  if (safeProgress <= ordered[0].offset) return ordered[0].value
  for (let index = 1; index < ordered.length; index += 1) {
    const right = ordered[index]
    if (safeProgress > right.offset) continue
    const left = ordered[index - 1]
    const span = Math.max(0.0001, right.offset - left.offset)
    return left.value + (right.value - left.value) * ((safeProgress - left.offset) / span)
  }
  return ordered.at(-1).value
}

/**
 * Preserve the planner's musical boundary while adapting playback to both
 * tracks' local energy, structure and vocal occupancy.
 */
export function softenTransitionForPlayback(source = {}, context = {}) {
  const original = source && typeof source === 'object' ? source : {}
  const originalKind = String(original.kind || 'safe_fade')
  const confidence = Number(original.confidence || 0)
  const alignment = Number(original.alignment_confidence || 0)
  const rejectLoop = originalKind === 'loop_bridge'
    && context?.sampleAccurateLoop === false
  const rejectEcho = originalKind === 'echo_filter_out'
    && (confidence < 0.78 || alignment < 0.68)
  const rejectAdvanced = rejectLoop || rejectEcho
  const rejectQuickCut = originalKind === 'quick_cut'
  const kind = rejectAdvanced
    ? 'phrase_crossfade'
    : rejectQuickCut
      ? 'safe_fade'
      : originalKind
  const retainLoop = kind === 'loop_bridge' && !rejectLoop

  const oldDuration = Math.max(0.08, Number(original.crossfade_duration || 0))
  const duration = retainLoop
    ? clamp(oldDuration, 2.4, 24)
    : clamp(
        Math.max(
          oldDuration,
          finite(context?.minimumDuration, minimumDurationFor(kind)),
        ),
        0.08,
        24,
      )
  const originalStart = Math.max(0, Number(original.mix_out_start || 0))
  const preserveBoundary = context?.preserveBoundary === true
  const start = retainLoop || preserveBoundary
    ? originalStart
    : Math.max(0, originalStart - Math.max(0, duration - oldDuration))
  const normalized = {...original, kind, mix_out_start: start, crossfade_duration: duration}
  const adaptive = buildAdaptiveCurves(normalized, context, duration)
  const retainEcho = kind === 'echo_filter_out'
  const transparent = ['safe_fade', 'vocal_safe_fade', 'gapless'].includes(kind)
  const reasonCodes = Array.isArray(original.reason_codes) ? original.reason_codes : []

  return {
    ...normalized,
    loudness_gain_db: clamp(Number(original.loudness_gain_db || 0), transparent ? -1.5 : -2.5, transparent ? 1.5 : 2.5),
    outgoing_gain: adaptive.outgoingGain,
    incoming_gain: adaptive.incomingGain,
    outgoing_eq: transparent ? [] : adaptive.outgoingEq,
    incoming_eq: transparent ? [] : adaptive.incomingEq,
    outgoing_filter: retainEcho
      ? [
          {offset: 0, lowpass_hz: 20000, highpass_hz: 20},
          {offset: 0.62, lowpass_hz: 19000, highpass_hz: 20},
          {offset: 1, lowpass_hz: 9800, highpass_hz: 32},
        ]
      : retainLoop
        ? [
            {offset: 0, lowpass_hz: 20000, highpass_hz: 20},
            {offset: 0.7, lowpass_hz: 20000, highpass_hz: 20},
            {offset: 0.86, lowpass_hz: 15500, highpass_hz: 26},
            {offset: 1, lowpass_hz: 10500, highpass_hz: 38},
          ]
        : [],
    incoming_filter: [],
    outgoing_dry: retainEcho
      ? [{offset: 0, value: 1}, {offset: 0.78, value: 1}, {offset: 1, value: 0.86}]
      : [],
    outgoing_echo_wet: retainEcho
      ? [{offset: 0, value: 0}, {offset: 0.72, value: 0}, {offset: 0.9, value: 0.14}, {offset: 1, value: 0}]
      : [],
    outgoing_echo_feedback: retainEcho
      ? [{offset: 0, value: 0}, {offset: 0.76, value: 0}, {offset: 0.9, value: 0.2}, {offset: 1, value: 0}]
      : [],
    loop_start: retainLoop ? finite(original.loop_start) : null,
    loop_end: retainLoop ? finite(original.loop_end) : null,
    loop_repetitions: retainLoop
      ? Math.max(0, Math.trunc(finite(original.loop_repetitions, 0)))
      : 0,
    loop_mode: retainLoop ? 'delay_line' : null,
    playback_shape: adaptive.shape,
    reason_codes: [
      ...reasonCodes,
      ...(!reasonCodes.includes('adaptive_content_envelope') ? ['adaptive_content_envelope'] : []),
      ...(transparent && !reasonCodes.includes('transparent_gain_only')
        ? ['transparent_gain_only']
        : []),
      ...(retainLoop
        && context?.sampleAccurateLoop === true
        && !reasonCodes.includes('sample_accurate_delay_loop')
        ? ['sample_accurate_delay_loop']
        : []),
      ...(rejectAdvanced || rejectQuickCut ? [`smooth_mode_downgrade_${originalKind}`] : []),
    ],
  }
}
