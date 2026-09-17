export class TransitionRegistry {
  constructor() {
    this.plugins = new Map()
  }

  register(kind, plugin) {
    const key = String(kind || '').trim()
    if (!key) throw new TypeError('Transition kind is required')
    if (!plugin || typeof plugin !== 'object') throw new TypeError('Transition plugin is required')
    this.plugins.set(key, Object.freeze({kind: key, ...plugin}))
    return this
  }

  get(kind) {
    return this.plugins.get(String(kind || '')) || this.plugins.get('safe_fade') || null
  }

  resolveExecution(transition, capabilities = {}) {
    const source = transition && typeof transition === 'object' ? transition : {}
    let plugin = this.get(source.kind)
    if (!plugin) return source

    const fallbackReasons = []
    const visited = new Set()
    while (plugin && !visited.has(plugin.kind)) {
      visited.add(plugin.kind)
      const unavailable = [
        plugin.requiresWebAudio && !capabilities.webAudio ? 'web_audio' : '',
        plugin.requiresAudioWorklet && !capabilities.audioWorklet ? 'audio_worklet' : '',
        plugin.requiresBeatGrid && !source.beat_aligned ? 'beat_grid' : '',
        plugin.requiresSampleAccurateLoop && !capabilities.sampleAccurateLoop
          ? 'sample_accurate_loop'
          : '',
      ].filter(Boolean)
      if (!unavailable.length) break
      fallbackReasons.push(`runtime_fallback_${plugin.kind}_${unavailable.join('_')}`)
      plugin = this.get(plugin.fallback || 'safe_fade')
    }

    if (!fallbackReasons.length) return source
    return {
      ...source,
      kind: plugin?.kind || 'safe_fade',
      loop_start: null,
      loop_end: null,
      loop_repetitions: 0,
      loop_mode: null,
      outgoing_gain: [],
      incoming_gain: [],
      outgoing_eq: [],
      incoming_eq: [],
      outgoing_filter: [],
      incoming_filter: [],
      outgoing_dry: [],
      outgoing_echo_wet: [],
      outgoing_echo_feedback: [],
      echo_delay_sec: 0,
      reason_codes: [
        ...(Array.isArray(source.reason_codes) ? source.reason_codes : []),
        ...fallbackReasons,
      ],
    }
  }

  list() {
    return [...this.plugins.values()]
  }
}
