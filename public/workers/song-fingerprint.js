let loadedRuntime = false

function toEightKhz(samples, sourceRate) {
  if (sourceRate === 8000) return samples
  const ratio = sourceRate / 8000
  const output = new Float32Array(Math.floor(samples.length / ratio))
  for (let index = 0; index < output.length; index += 1) {
    const from = Math.floor(index * ratio)
    const to = Math.max(from + 1, Math.floor((index + 1) * ratio))
    let sum = 0
    for (let cursor = from; cursor < to; cursor += 1) sum += samples[cursor] || 0
    output[index] = sum / (to - from)
  }
  return output
}

self.onmessage = async ({data}) => {
  if (data?.type !== 'fingerprint' && data?.type !== 'warmup') return
  try {
    if (!loadedRuntime) {
      // The music API ships the matching AFP runtime with its audio_match_demo.
      importScripts(`${data.assetBase}afp.wasm.js`, `${data.assetBase}afp.js`)
      loadedRuntime = true
    }
    if (data.type === 'warmup') {
      self.postMessage({type: 'ready'})
      return
    }
    const pcm = toEightKhz(new Float32Array(data.samples), Number(data.sampleRate))
    const fingerprint = await GenerateFP(pcm)
    if (!fingerprint) throw new Error('empty fingerprint')
    self.postMessage({type: 'result', id: data.id, fingerprint})
  } catch (error) {
    self.postMessage({type: 'error', id: data.id, message: String(error?.message || error)})
  }
}
