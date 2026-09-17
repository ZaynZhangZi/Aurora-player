let cachedCapabilities = null

export function getAudioCapabilities({refresh = false} = {}) {
  if (cachedCapabilities && !refresh) return {...cachedCapabilities}

  const root = typeof window !== 'undefined' ? window : globalThis
  const AudioContextClass = root?.AudioContext || root?.webkitAudioContext
  let preservesPitch = false
  if (typeof document !== 'undefined') {
    const media = document.createElement('audio')
    preservesPitch = 'preservesPitch' in media
      || 'webkitPreservesPitch' in media
      || 'mozPreservesPitch' in media
  }

  cachedCapabilities = Object.freeze({
    webAssembly: typeof WebAssembly !== 'undefined',
    audioContext: Boolean(AudioContextClass),
    mediaElementSource: Boolean(AudioContextClass?.prototype?.createMediaElementSource),
    audioWorklet: Boolean(AudioContextClass && root?.AudioWorkletNode),
    worker: typeof Worker !== 'undefined',
    indexedDB: typeof indexedDB !== 'undefined',
    preservesPitch,
    abortController: typeof AbortController !== 'undefined',
  })

  return {...cachedCapabilities}
}

export function canRunAutomixAnalysis(capabilities = getAudioCapabilities()) {
  return Boolean(
    capabilities.webAssembly
    && capabilities.audioContext
    && capabilities.worker,
  )
}

export function canRunRealtimeAutomix(capabilities = getAudioCapabilities()) {
  return Boolean(capabilities.audioContext && capabilities.mediaElementSource)
}
