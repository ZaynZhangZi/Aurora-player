class SongRecognitionRecorder extends AudioWorkletProcessor {
  constructor() {
    super()
    this.windowSamples = null
    this.position = 0
    this.totalSamples = 0
    this.nextWindowAt = 0
    this.windowStep = 0
    this.maxSamples = 0
    this.port.onmessage = ({data}) => {
      if (data?.type === 'start') {
        const windowLength = Math.max(1, Math.ceil(sampleRate * Number(data.windowSeconds || 3)))
        this.windowSamples = new Float32Array(windowLength)
        this.position = 0
        this.totalSamples = 0
        this.nextWindowAt = windowLength
        this.windowStep = Math.max(1, Math.ceil(sampleRate * Number(data.stepSeconds || 2)))
        this.maxSamples = Math.max(windowLength, Math.ceil(sampleRate * Number(data.maxSeconds || 12)))
      } else if (data?.type === 'stop') {
        this.windowSamples = null
      }
    }
  }

  process(inputs) {
    if (!this.windowSamples) return true

    const channel = inputs[0]?.[0]
    const remaining = this.maxSamples - this.totalSamples
    const count = Math.min(channel?.length || 128, remaining)
    const first = Math.min(count, this.windowSamples.length - this.position)
    if (channel) this.windowSamples.set(channel.subarray(0, first), this.position)
    else this.windowSamples.fill(0, this.position, this.position + first)
    if (count > first) {
      if (channel) this.windowSamples.set(channel.subarray(first, count), 0)
      else this.windowSamples.fill(0, 0, count - first)
    }
    this.position = (this.position + count) % this.windowSamples.length
    this.totalSamples += count

    if (this.totalSamples >= this.nextWindowAt) {
      const samples = new Float32Array(this.windowSamples.length)
      samples.set(this.windowSamples.subarray(this.position))
      samples.set(this.windowSamples.subarray(0, this.position), this.windowSamples.length - this.position)
      this.port.postMessage({type: 'window', samples, sampleRate}, [samples.buffer])
      this.nextWindowAt += this.windowStep
    }

    if (this.totalSamples >= this.maxSamples) {
      this.windowSamples = null
      this.port.postMessage({type: 'complete'})
    }
    return true
  }
}

registerProcessor('aurora-song-recognition-recorder', SongRecognitionRecorder)
