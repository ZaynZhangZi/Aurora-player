import {getAudioCapabilities} from '@/audio/utils/getAudioCapabilities.js'
import {createAutomixAudioGraph} from '@/utils/player/automixAudioGraph.js'

export class AudioEngine {
  constructor(options) {
    this.capabilities = getAudioCapabilities()
    this.graph = createAutomixAudioGraph(options)
  }

  init() { return this.graph.ensure() }
  ensure() { return this.graph.ensure() }
  resume() { return this.graph.resume() }
  setMasterVolume(value) { return this.graph.setMasterVolume(value) }
  prepareDeck(media, options) { return this.graph.prepareDeck(media, options) }
  supportsSampleAccurateLoop() { return Boolean(this.graph.supportsSampleAccurateLoop?.()) }
  prepareLoopTransition(media, transition) {
    return Boolean(this.graph.prepareLoopTransition?.(media, transition))
  }
  isLoopTransitionReady(media, transition) {
    return Boolean(this.graph.isLoopTransitionReady?.(media, transition))
  }
  scheduleTransition(outgoing, incoming, transition, duration) {
    return this.graph.scheduleTransition(outgoing, incoming, transition, duration)
  }
  completeDeckSwap(outgoing, incoming) { return this.graph.completeDeckSwap(outgoing, incoming) }
  reset(active, idle) { return this.graph.reset(active, idle) }
  getAnalyserNode() { return this.graph.getAnalyserNode() }
  getWorkletMetrics() { return this.graph.getWorkletMetrics?.() || null }
  isWorkletReady() { return Boolean(this.graph.isWorkletReady?.()) }
  isReady() { return this.graph.isReady() }
  destroy() { this.graph.dispose() }
  dispose() { this.destroy() }
}
