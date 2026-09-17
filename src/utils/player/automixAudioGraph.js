import {Deck, SILENT_GAIN} from '@/audio/Deck.js'
import {Mixer} from '@/audio/Mixer.js'

const CURVE_SAMPLES = 96

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function dbToGain(db) {
  return 10 ** (Number(db || 0) / 20)
}

function normalizeCurve(points, incoming) {
  const valid = Array.isArray(points)
    ? points
        .map(point => ({offset: Number(point?.offset), value: Number(point?.value)}))
        .filter(point => Number.isFinite(point.offset) && Number.isFinite(point.value))
        .sort((left, right) => left.offset - right.offset)
    : []

  const sample = (progress) => {
    if (valid.length < 2) {
      return incoming
        ? Math.sin(progress * Math.PI * 0.5)
        : Math.cos(progress * Math.PI * 0.5)
    }
    if (progress <= valid[0].offset) return valid[0].value
    for (let index = 1; index < valid.length; index += 1) {
      const right = valid[index]
      if (progress > right.offset) continue
      const left = valid[index - 1]
      const span = Math.max(0.0001, right.offset - left.offset)
      const local = (progress - left.offset) / span
      return left.value + (right.value - left.value) * local
    }
    return valid.at(-1).value
  }

  const curve = new Float32Array(CURVE_SAMPLES)
  for (let index = 0; index < CURVE_SAMPLES; index += 1) {
    curve[index] = clamp(sample(index / (CURVE_SAMPLES - 1)), 0, 1.5)
  }
  return curve
}

function normalizeEqCurve(points, band, fallback = 0) {
  const valid = Array.isArray(points)
    ? points
        .map(point => ({offset: Number(point?.offset), value: Number(point?.[band])}))
        .filter(point => Number.isFinite(point.offset) && Number.isFinite(point.value))
        .sort((left, right) => left.offset - right.offset)
    : []
  const curve = new Float32Array(CURVE_SAMPLES)

  for (let index = 0; index < CURVE_SAMPLES; index += 1) {
    const progress = index / (CURVE_SAMPLES - 1)
    let value = fallback
    if (valid.length === 1) {
      value = valid[0].value
    } else if (valid.length >= 2) {
      if (progress <= valid[0].offset) {
        value = valid[0].value
      } else {
        value = valid.at(-1).value
        for (let pointIndex = 1; pointIndex < valid.length; pointIndex += 1) {
          const right = valid[pointIndex]
          if (progress > right.offset) continue
          const left = valid[pointIndex - 1]
          const span = Math.max(0.0001, right.offset - left.offset)
          value = left.value + (right.value - left.value) * ((progress - left.offset) / span)
          break
        }
      }
    }
    curve[index] = clamp(value, -24, 9)
  }
  return curve
}

function normalizeParamCurve(points, key, fallback, min, max) {
  const valid = Array.isArray(points)
    ? points
        .map(point => ({offset: Number(point?.offset), value: Number(point?.[key] ?? point?.value)}))
        .filter(point => Number.isFinite(point.offset) && Number.isFinite(point.value))
        .sort((left, right) => left.offset - right.offset)
    : []
  const curve = new Float32Array(CURVE_SAMPLES)

  for (let index = 0; index < CURVE_SAMPLES; index += 1) {
    const progress = index / (CURVE_SAMPLES - 1)
    let value = fallback
    if (valid.length === 1) {
      value = valid[0].value
    } else if (valid.length >= 2) {
      if (progress <= valid[0].offset) {
        value = valid[0].value
      } else {
        value = valid.at(-1).value
        for (let pointIndex = 1; pointIndex < valid.length; pointIndex += 1) {
          const right = valid[pointIndex]
          if (progress > right.offset) continue
          const left = valid[pointIndex - 1]
          const span = Math.max(0.0001, right.offset - left.offset)
          value = left.value + (right.value - left.value) * ((progress - left.offset) / span)
          break
        }
      }
    }
    curve[index] = clamp(value, min, max)
  }
  return curve
}

function cancelAndSet(param, value, atTime) {
  param.cancelScheduledValues(atTime)
  param.setValueAtTime(value, atTime)
}

function resolveLoopLength(transition) {
  if (String(transition?.kind || '') !== 'loop_bridge') return null
  const loopStart = Number(transition?.loop_start)
  const loopEnd = Number(transition?.loop_end)
  const loopLength = loopEnd - loopStart
  return Number.isFinite(loopStart)
    && Number.isFinite(loopEnd)
    && loopStart >= 0
    && loopLength >= 0.5
    && loopLength <= 10
    ? loopLength
    : null
}

export function createAutomixAudioGraph({getPrimaryAudio, getSecondaryAudio, getVolume}) {
  let context = null
  let mixer = null
  let primaryDeck = null
  let secondaryDeck = null
  let initFailed = false

  function deckFor(media) {
    if (primaryDeck?.media === media) return primaryDeck
    if (secondaryDeck?.media === media) return secondaryDeck
    return null
  }

  function ensure() {
    if (context && primaryDeck && secondaryDeck) return true
    if (initFailed || typeof window === 'undefined') return false

    const primary = getPrimaryAudio?.()
    const secondary = getSecondaryAudio?.()
    const Context = window.AudioContext || window.webkitAudioContext
    if (!primary || !secondary || !Context) return false

    try {
      context = new Context({latencyHint: 'interactive'})
      mixer = new Mixer(context, {volume: getVolume?.() ?? 0.85})
      primaryDeck = new Deck(context, primary, mixer.input)
      secondaryDeck = new Deck(context, secondary, mixer.input)
      secondaryDeck.gain.gain.value = SILENT_GAIN
      return true
    } catch (error) {
      initFailed = true
      if (typeof console !== 'undefined') {
        console.warn('[AutoMix/AudioGraph] Web Audio unavailable, using media-volume fallback', error)
      }
      return false
    }
  }

  async function ensureWorklet() {
    return mixer?.ensureWorklet?.() || false
  }

  async function resume() {
    if (!ensure()) return false
    if (context.state === 'suspended') {
      try {
        await context.resume()
      } catch {
        return false
      }
    }
    await ensureWorklet()
    return context.state === 'running'
  }

  function setMasterVolume(value) {
    if (!ensure()) return false
    mixer.setVolume(value)
    return true
  }

  function prepareDeck(media, {gain = 0, low = 0, mid = 0, high = 0} = {}) {
    if (!ensure()) return false
    const deck = deckFor(media)
    if (!deck) return false
    deck.prepare({gain, low, mid, high})
    return true
  }

  function supportsSampleAccurateLoop() {
    return Boolean(ensure() && context?.createDelay)
  }

  function prepareLoopTransition(media, transition) {
    if (!supportsSampleAccurateLoop()) return false
    const deck = deckFor(media)
    const loopLength = resolveLoopLength(transition)
    if (!deck || loopLength === null) return false
    return deck.prepareLoop(loopLength)
  }

  function isLoopTransitionReady(media, transition) {
    if (!context || !primaryDeck || !secondaryDeck) return false
    const deck = deckFor(media)
    const loopLength = resolveLoopLength(transition)
    return Boolean(deck && loopLength !== null && deck.isLoopReady(loopLength))
  }

  function scheduleTransition(outgoingMedia, incomingMedia, transition = {}, durationSec = 2) {
    if (!ensure()) return null
    const outgoing = deckFor(outgoingMedia)
    const incoming = deckFor(incomingMedia)
    if (!outgoing || !incoming) return null

    const duration = clamp(Number(durationSec || 2), 0.08, 45)
    const startsAt = context.currentTime + 0.035
    const loopRequested = String(transition?.kind || '') === 'loop_bridge'
      && transition?.loop_mode === 'delay_line'
    const loopActive = loopRequested ? outgoing.activateLoop(startsAt) : false
    // Keep perceived-loudness compensation subtle. Large mid-transition boosts
    // are heard as a hard cut even when both deck envelopes are smooth.
    const loudnessGain = clamp(dbToGain(transition?.loudness_gain_db), 0.82, 1.18)
    const outgoingCurve = normalizeCurve(transition?.outgoing_gain, false)
    const incomingCurve = normalizeCurve(transition?.incoming_gain, true)
    for (let index = 0; index < incomingCurve.length; index += 1) {
      incomingCurve[index] *= loudnessGain
    }

    cancelAndSet(outgoing.gain.gain, Math.max(SILENT_GAIN, outgoing.gain.gain.value), context.currentTime)
    cancelAndSet(incoming.gain.gain, SILENT_GAIN, context.currentTime)
    outgoing.gain.gain.setValueCurveAtTime(outgoingCurve, startsAt, duration)
    incoming.gain.gain.setValueCurveAtTime(incomingCurve, startsAt, duration)

    const scheduleEq = (deck, points) => {
      for (const [node, band] of [[deck.low, 'low'], [deck.mid, 'mid'], [deck.high, 'high']]) {
        cancelAndSet(node.gain, node.gain.value, context.currentTime)
        node.gain.setValueCurveAtTime(normalizeEqCurve(points, band), startsAt, duration)
      }
    }
    scheduleEq(outgoing, transition?.outgoing_eq)
    scheduleEq(incoming, transition?.incoming_eq)

    const maxCutoff = Math.min(20000, context.sampleRate * 0.48)
    const scheduleFilter = (deck, points) => {
      cancelAndSet(deck.lowPass.frequency, deck.lowPass.frequency.value, context.currentTime)
      cancelAndSet(deck.highPass.frequency, deck.highPass.frequency.value, context.currentTime)
      deck.lowPass.frequency.setValueCurveAtTime(
        normalizeParamCurve(points, 'lowpass_hz', maxCutoff, 280, maxCutoff),
        startsAt,
        duration,
      )
      deck.highPass.frequency.setValueCurveAtTime(
        normalizeParamCurve(points, 'highpass_hz', 20, 20, 2400),
        startsAt,
        duration,
      )
    }
    scheduleFilter(outgoing, transition?.outgoing_filter)
    scheduleFilter(incoming, transition?.incoming_filter)

    cancelAndSet(outgoing.dry.gain, outgoing.dry.gain.value, context.currentTime)
    outgoing.dry.gain.setValueCurveAtTime(
      normalizeParamCurve(transition?.outgoing_dry, 'value', 1, 0, 1),
      startsAt,
      duration,
    )
    cancelAndSet(outgoing.echoWet.gain, 0, context.currentTime)
    outgoing.echoWet.gain.setValueCurveAtTime(
      normalizeParamCurve(transition?.outgoing_echo_wet, 'value', 0, 0, 0.72),
      startsAt,
      duration,
    )
    cancelAndSet(outgoing.echoFeedback.gain, 0, context.currentTime)
    outgoing.echoFeedback.gain.setValueCurveAtTime(
      normalizeParamCurve(transition?.outgoing_echo_feedback, 'value', 0, 0, 0.68),
      startsAt,
      duration,
    )
    cancelAndSet(
      outgoing.echoDelay.delayTime,
      clamp(Number(transition?.echo_delay_sec || 0.36), 0.08, 1.2),
      context.currentTime,
    )

    cancelAndSet(incoming.dry.gain, 1, context.currentTime)
    cancelAndSet(incoming.echoWet.gain, 0, context.currentTime)
    cancelAndSet(incoming.echoFeedback.gain, 0, context.currentTime)

    outgoingMedia.volume = 1
    incomingMedia.volume = 1
    return {
      startsAt,
      startsInSec: Math.max(0, startsAt - context.currentTime),
      duration,
      loudnessGain,
      loopActive,
    }
  }

  function completeDeckSwap(oldActive, newActive) {
    if (!ensure()) return false
    const now = context.currentTime
    const oldDeck = deckFor(oldActive)
    const newDeck = deckFor(newActive)
    if (oldDeck) {
      oldDeck.resetLoop(now)
      cancelAndSet(oldDeck.gain.gain, SILENT_GAIN, now)
      cancelAndSet(oldDeck.low.gain, 0, now)
      cancelAndSet(oldDeck.mid.gain, 0, now)
      cancelAndSet(oldDeck.high.gain, 0, now)
      cancelAndSet(oldDeck.highPass.frequency, 20, now)
      cancelAndSet(oldDeck.lowPass.frequency, Math.min(20000, context.sampleRate * 0.48), now)
      cancelAndSet(oldDeck.dry.gain, 1, now)
      cancelAndSet(oldDeck.echoWet.gain, 0, now)
      cancelAndSet(oldDeck.echoFeedback.gain, 0, now)
    }
    if (newDeck) {
      newDeck.resetLoop(now)
      const currentGain = clamp(Number(newDeck.gain.gain.value || 1), 0.82, 1.18)
      newDeck.gain.gain.cancelScheduledValues(now)
      newDeck.gain.gain.setValueAtTime(currentGain, now)
      newDeck.gain.gain.setTargetAtTime(1, now, 2.4)
      cancelAndSet(newDeck.low.gain, 0, now)
      cancelAndSet(newDeck.mid.gain, 0, now)
      cancelAndSet(newDeck.high.gain, 0, now)
      cancelAndSet(newDeck.highPass.frequency, 20, now)
      cancelAndSet(newDeck.lowPass.frequency, Math.min(20000, context.sampleRate * 0.48), now)
      cancelAndSet(newDeck.dry.gain, 1, now)
      cancelAndSet(newDeck.echoWet.gain, 0, now)
      cancelAndSet(newDeck.echoFeedback.gain, 0, now)
    }
    return true
  }

  function reset(activeMedia, idleMedia) {
    if (!isReady()) return false
    completeDeckSwap(idleMedia, activeMedia)
    setMasterVolume(getVolume?.() ?? 0.85)
    return true
  }

  function getAnalyserNode() {
    return ensure() ? mixer.analyser : null
  }

  function isReady() {
    return Boolean(context && primaryDeck && secondaryDeck)
  }

  function isWorkletReady() {
    return Boolean(mixer?.workletNode)
  }

  function getWorkletMetrics() {
    return mixer?.getWorkletMetrics?.() || null
  }

  function dispose() {
    for (const deck of [primaryDeck, secondaryDeck]) {
      deck?.destroy?.()
    }
    primaryDeck = null
    secondaryDeck = null
    mixer?.destroy?.()
    mixer = null
    if (context) {
      context.close().catch(() => {})
      context = null
    }
  }

  return {
    ensure,
    resume,
    setMasterVolume,
    prepareDeck,
    supportsSampleAccurateLoop,
    prepareLoopTransition,
    isLoopTransitionReady,
    scheduleTransition,
    completeDeckSwap,
    reset,
    getAnalyserNode,
    getWorkletMetrics,
    isReady,
    isWorkletReady,
    dispose,
  }
}
