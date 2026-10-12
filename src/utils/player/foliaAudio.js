// Folia usePlaybackVisualizerBridge's band ranges and response curves (0..255).
// Compute bin width from the existing audio context instead of assuming 44.1kHz.
export function foliaAudioBands(spectrum, sampleRate, fftSize) {
  const binHz = sampleRate / fftSize
  const average = (low, high) => {
    const from = Math.max(0, Math.floor(low / binHz))
    const to = Math.min(spectrum.length - 1, Math.floor(high / binHz))
    let sum = 0
    for (let index = from; index <= to; index++) sum += spectrum[index]
    return sum / Math.max(1, to - from + 1)
  }
  const bass = average(20, 150), lowMid = average(150, 400)
  const process = (value, boost) => Math.pow(value / 255, boost) * 255
  return {power: process((bass + lowMid) / 2, 3), bass: process(bass, 1.8), lowMid: process(lowMid, 2),
    mid: process(average(400, 1200), 2), vocal: process(average(1000, 3500), 1.5),
    treble: process(average(3500, 12000), 2), spectrum}
}
