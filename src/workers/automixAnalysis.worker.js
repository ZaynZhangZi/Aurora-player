import initAutomix, {analyze_pcm_js, init_wasm} from '@/wasm/automix/automix.js'
import {enhanceAutomixProfile} from './essentiaAutomixEnhancement.js'

let readyPromise = null

function ensureReady() {
  if (!readyPromise) {
    readyPromise = initAutomix().then(() => {
      init_wasm()
      return true
    })
  }
  return readyPromise
}

self.onmessage = async (event) => {
  const {id, samples, sampleRate} = event.data || {}
  try {
    await ensureReady()
    const pcm = samples instanceof Float32Array ? samples : new Float32Array(samples)
    const profile = analyze_pcm_js(pcm, Number(sampleRate), 1)
    try {
      await enhanceAutomixProfile(pcm, profile)
    } catch {
      // Essentia is an optional quality layer: keep Rust analysis available on
      // browsers where its WASM backend cannot initialize.
      profile.analysis_engine = 'rust-wasm-fallback'
    }
    self.postMessage({id, ok: true, profile})
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: String(error?.message || error || 'PCM analysis failed'),
    })
  }
}
