// Compatibility facade: the Rust/WASM planner remains in one place while the
// player imports it through the audio-domain boundary.
export {
  analyzePcmForAutomix,
  getAutomixInitError,
  getLastAutomixAnalysis,
  planAutomixPath,
  recommendNextQueueIndex,
  resolveTempoRateForTransition,
  warmupAutomixRecommendation,
} from '@/utils/automixEngine.js'
