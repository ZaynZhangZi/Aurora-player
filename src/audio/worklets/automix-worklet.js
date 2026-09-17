class AuroraAutomixProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.samplesSinceReport = 0
    this.sumSquares = 0
    this.peak = 0
  }

  process(inputs, outputs) {
    const input = inputs[0] || []
    const output = outputs[0] || []
    const channelCount = Math.max(input.length, output.length)

    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const source = input[channelIndex] || input[0]
      const target = output[channelIndex]
      if (!target) continue
      if (!source) {
        target.fill(0)
        continue
      }

      target.set(source)
      for (let sampleIndex = 0; sampleIndex < source.length; sampleIndex += 1) {
        const sample = source[sampleIndex]
        this.sumSquares += sample * sample
        this.peak = Math.max(this.peak, Math.abs(sample))
      }
      this.samplesSinceReport += source.length
    }

    if (this.samplesSinceReport >= 4096) {
      this.port.postMessage({
        type: 'meter',
        rms: Math.sqrt(this.sumSquares / Math.max(1, this.samplesSinceReport)),
        peak: this.peak,
        currentFrame,
      })
      this.samplesSinceReport = 0
      this.sumSquares = 0
      this.peak = 0
    }
    return true
  }
}

registerProcessor('aurora-automix-processor', AuroraAutomixProcessor)
