function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Shared output bus for both decks. It owns the master gain, brick-wall style
 * limiter, metering analyser and the optional AudioWorklet insertion point.
 */
export class Mixer {
  constructor(context, {volume = 0.85} = {}) {
    if (!context) throw new TypeError('Mixer requires an AudioContext')
    this.context = context
    this.input = context.createGain()
    this.limiter = context.createDynamicsCompressor()
    this.analyser = context.createAnalyser()
    this.workletNode = null
    this.workletPromise = null
    this.workletMetrics = null

    this.input.gain.value = clamp(Number(volume || 0), 0, 1)
    this.limiter.threshold.value = -2
    this.limiter.knee.value = 0
    this.limiter.ratio.value = 20
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.2
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.82

    this.input.connect(this.limiter)
    this.limiter.connect(this.analyser)
    this.analyser.connect(context.destination)
  }

  setVolume(value) {
    const now = this.context.currentTime
    this.input.gain.cancelScheduledValues(now)
    this.input.gain.setTargetAtTime(clamp(Number(value || 0), 0, 1), now, 0.018)
  }

  async ensureWorklet() {
    if (this.workletNode) return true
    if (!this.context.audioWorklet || typeof AudioWorkletNode === 'undefined') return false
    if (this.workletPromise) return this.workletPromise

    this.workletPromise = this.context.audioWorklet
      .addModule(new URL('./worklets/automix-worklet.js', import.meta.url))
      .then(() => {
        const node = new AudioWorkletNode(this.context, 'aurora-automix-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        })
        node.port.onmessage = (event) => {
          if (event.data?.type !== 'meter') return
          this.workletMetrics = {
            rms: Number(event.data.rms || 0),
            peak: Number(event.data.peak || 0),
            currentFrame: Number(event.data.currentFrame || 0),
          }
        }
        this.limiter.disconnect(this.analyser)
        this.limiter.connect(node)
        node.connect(this.analyser)
        this.workletNode = node
        return true
      })
      .catch((error) => {
        console.warn('[AutoMix] AudioWorklet unavailable; native Web Audio graph remains active', error)
        return false
      })
      .finally(() => {
        this.workletPromise = null
      })
    return this.workletPromise
  }

  getWorkletMetrics() {
    return this.workletMetrics ? {...this.workletMetrics} : null
  }

  destroy() {
    if (this.workletNode) {
      try {
        this.workletNode.port.onmessage = null
        this.workletNode.disconnect()
      } catch {
        // The node can already be disconnected during page teardown.
      }
    }
    for (const node of [this.input, this.limiter, this.analyser]) {
      try {
        node.disconnect()
      } catch {
        // The context can already be closing.
      }
    }
    this.workletNode = null
    this.workletPromise = null
    this.workletMetrics = null
  }
}
