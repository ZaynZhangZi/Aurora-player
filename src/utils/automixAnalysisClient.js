import {
  createAutomixProfileCacheKey,
  getCachedAutomixProfile,
  putCachedAutomixProfile,
} from '@/utils/automixProfileCache.js'
import {ANALYZER_STATUS} from '@/audio/constants.js'

export const AUTOMIX_ANALYSIS_VERSION = 8

const TARGET_SAMPLE_RATE = 11025
const MAX_AUDIO_BYTES = 48 * 1024 * 1024
const DOWNLOAD_TIMEOUT_MS = 45_000

let worker = null
let workerRequestId = 0
let analysisTail = Promise.resolve()
const pendingWorkerRequests = new Map()
const inFlightByKey = new Map()

function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function ensureWorker() {
  if (worker) return worker
  worker = new Worker(new URL('../workers/automixAnalysis.worker.js', import.meta.url), {
    type: 'module',
    name: 'aurora-automix-analysis',
  })
  worker.onmessage = (event) => {
    const {id, ok, profile, error} = event.data || {}
    const pending = pendingWorkerRequests.get(id)
    if (!pending) return
    pendingWorkerRequests.delete(id)
    if (ok) pending.resolve(profile)
    else pending.reject(new Error(error || 'PCM analysis failed'))
  }
  worker.onerror = (event) => {
    const error = new Error(event?.message || 'Automix analysis worker crashed')
    for (const pending of pendingWorkerRequests.values()) pending.reject(error)
    pendingWorkerRequests.clear()
    worker?.terminate()
    worker = null
  }
  return worker
}

function createAbortError() {
  if (typeof DOMException !== 'undefined') return new DOMException('Analysis aborted', 'AbortError')
  const error = new Error('Analysis aborted')
  error.name = 'AbortError'
  return error
}

function runWorkerAnalysis(samples, sampleRate, signal) {
  const targetWorker = ensureWorker()
  const id = ++workerRequestId
  return new Promise((resolve, reject) => {
    let settled = false
    const cleanup = () => signal?.removeEventListener('abort', abort)
    const abort = () => {
      if (settled) return
      settled = true
      cleanup()
      pendingWorkerRequests.delete(id)
      targetWorker.terminate()
      if (worker === targetWorker) worker = null
      reject(createAbortError())
    }
    if (signal?.aborted) {
      abort()
      return
    }
    pendingWorkerRequests.set(id, {
      resolve: (profile) => {
        if (settled) return
        settled = true
        cleanup()
        resolve(profile)
      },
      reject: (error) => {
        if (settled) return
        settled = true
        cleanup()
        reject(error)
      },
    })
    signal?.addEventListener('abort', abort, {once: true})
    targetWorker.postMessage({id, samples, sampleRate}, [samples.buffer])
  })
}

function enqueueAnalysis(task) {
  const result = analysisTail.catch(() => {}).then(task)
  analysisTail = result.catch(() => {})
  return result
}

async function downmixAndResample(audioBuffer, targetSampleRate = TARGET_SAMPLE_RATE, signal) {
  const sourceRate = Number(audioBuffer.sampleRate)
  const sourceLength = Number(audioBuffer.length)
  const channels = Number(audioBuffer.numberOfChannels)
  const ratio = sourceRate / targetSampleRate
  const targetLength = Math.max(1, Math.floor(sourceLength / ratio))
  const output = new Float32Array(targetLength)
  const channelData = Array.from({length: channels}, (_, index) => audioBuffer.getChannelData(index))

  // AudioBuffer itself cannot be transferred to a worker. Process it in bounded
  // chunks and yield between chunks so a six-minute track does not monopolize
  // the main thread while controls and animations are active.
  const chunkSize = 65_536
  for (let chunkStart = 0; chunkStart < targetLength; chunkStart += chunkSize) {
    if (signal?.aborted) throw createAbortError()
    const chunkEnd = Math.min(targetLength, chunkStart + chunkSize)
    for (let targetIndex = chunkStart; targetIndex < chunkEnd; targetIndex += 1) {
      const sourcePosition = targetIndex * ratio
      const leftIndex = Math.min(sourceLength - 1, Math.floor(sourcePosition))
      const rightIndex = Math.min(sourceLength - 1, leftIndex + 1)
      const fraction = sourcePosition - leftIndex
      let mixed = 0
      for (const data of channelData) {
        mixed += data[leftIndex] + (data[rightIndex] - data[leftIndex]) * fraction
      }
      output[targetIndex] = mixed / Math.max(1, channels)
    }
    if (chunkEnd < targetLength) await new Promise(resolve => window.setTimeout(resolve, 0))
  }
  return output
}

async function downloadAudio(url, externalSignal) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)
  const abortFromCaller = () => controller.abort()
  externalSignal?.addEventListener('abort', abortFromCaller, {once: true})
  let credentials = 'omit'
  try {
    // Same-origin Java/proxy endpoints keep the user's session cookie. Signed
    // third-party CDN URLs stay credential-free to avoid unnecessary CORS
    // preflight failures and cross-site cookie coupling.
    const requestUrl = new URL(url, window.location.href)
    credentials = requestUrl.origin === window.location.origin ? 'same-origin' : 'omit'
  } catch {
    // fetch() below reports malformed URLs through the normal fallback path.
  }

  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials,
      cache: 'force-cache',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`audio download failed: ${response.status}`)
    const declaredBytes = Number(response.headers.get('content-length') || 0)
    if (declaredBytes > MAX_AUDIO_BYTES) throw new Error('audio file is too large for browser analysis')
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength > MAX_AUDIO_BYTES) throw new Error('audio file is too large for browser analysis')
    return bytes
  } finally {
    window.clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', abortFromCaller)
  }
}

async function decodeToAnalysisPcm(bytes, signal) {
  if (signal?.aborted) throw createAbortError()
  const Context = window.AudioContext || window.webkitAudioContext
  if (!Context) throw new Error('Web Audio is unavailable')
  let context
  try {
    context = new Context({sampleRate: TARGET_SAMPLE_RATE})
  } catch {
    // Older Safari versions reject the constructor options object. Decoding at
    // the device rate is fine because downmixAndResample normalizes it below.
    context = new Context()
  }
  try {
    const audioBuffer = await context.decodeAudioData(bytes.slice(0))
    if (signal?.aborted) throw createAbortError()
    return await downmixAndResample(audioBuffer, TARGET_SAMPLE_RATE, signal)
  } finally {
    context.close().catch(() => {})
  }
}

function normalizeProfile(profile, song, quality) {
  const loudnessLufs = optionalNumber(profile?.loudness_lufs)
  const peakDbfs = optionalNumber(profile?.peak_dbfs)
  const introEnd = optionalNumber(profile?.intro_end)
  const outroStart = optionalNumber(profile?.outro_start)
  const firstMixIn = Array.isArray(profile?.mix_regions)
    ? profile.mix_regions.find(region => region?.direction === 'in')
    : null
  return {
    ...profile,
    version: AUTOMIX_ANALYSIS_VERSION,
    analysis_version: AUTOMIX_ANALYSIS_VERSION,
    sampleRate: TARGET_SAMPLE_RATE,
    sample_rate: TARGET_SAMPLE_RATE,
    bpmConfidence: Number(profile?.confidence?.tempo || 0),
    peak: peakDbfs === null ? null : 10 ** (peakDbfs / 20),
    rms: loudnessLufs === null ? null : 10 ** ((loudnessLufs + 0.691) / 20),
    beats: Array.isArray(profile?.beat_positions) ? profile.beat_positions : [],
    downbeats: Array.isArray(profile?.downbeat_positions) ? profile.downbeat_positions : [],
    intro: introEnd !== null ? {start: 0, end: introEnd} : null,
    outro: outroStart !== null
      ? {start: outroStart, end: Number(profile?.duration || outroStart)}
      : null,
    silence: {
      start: 0,
      end: Math.max(0, Number(firstMixIn?.start || 0)),
    },
    sections: Array.isArray(profile?.section_segments) ? profile.section_segments : [],
    album_id: song?.album?.id ?? song?.al?.id ?? song?.mixProfile?.album_id ?? null,
    tags: Array.isArray(song?.mixProfile?.tags) ? [...song.mixProfile.tags] : [],
    analysis_source: profile?.analysis_engine || 'browser-rust-wasm',
    audio_quality: quality,
    analyzed_at: Date.now(),
  }
}

function hashAudioUrl(url) {
  let hash = 2166136261
  const value = String(url || '')
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `url-${(hash >>> 0).toString(16)}`
}

function waitForPromiseWithSignal(promise, signal) {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(createAbortError())
  return new Promise((resolve, reject) => {
    const abort = () => reject(createAbortError())
    signal.addEventListener('abort', abort, {once: true})
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}

export async function analyzeSongForAutomix(song, audioUrl, {
  quality = 'exhigh',
  signal,
  onStatus,
} = {}) {
  const songId = String(song?.id || '').trim() || hashAudioUrl(audioUrl)
  if (!audioUrl || typeof window === 'undefined') return null
  const report = (status, detail = {}) => onStatus?.(status, {trackId: songId, ...detail})
  report(ANALYZER_STATUS.CACHE)
  const cacheKey = createAutomixProfileCacheKey(songId, quality, AUTOMIX_ANALYSIS_VERSION)
  const cached = await getCachedAutomixProfile(cacheKey)
  if (signal?.aborted) throw createAbortError()
  if (cached) {
    report(ANALYZER_STATUS.COMPLETE, {cacheHit: true})
    return cached
  }
  if (inFlightByKey.has(cacheKey)) {
    return waitForPromiseWithSignal(inFlightByKey.get(cacheKey), signal)
  }

  const job = enqueueAnalysis(async () => {
    if (signal?.aborted) throw createAbortError()
    report(ANALYZER_STATUS.LOADING)
    const bytes = await downloadAudio(audioUrl, signal)
    report(ANALYZER_STATUS.DECODING, {bytes: bytes.byteLength})
    const samples = await decodeToAnalysisPcm(bytes, signal)
    if (signal?.aborted) throw createAbortError()
    report(ANALYZER_STATUS.ANALYZING, {sampleCount: samples.length})
    const rawProfile = await runWorkerAnalysis(samples, TARGET_SAMPLE_RATE, signal)
    const profile = normalizeProfile(rawProfile, song, quality)
    report(ANALYZER_STATUS.CACHING)
    await putCachedAutomixProfile(cacheKey, profile)
    report(ANALYZER_STATUS.COMPLETE, {cacheHit: false})
    return profile
  }).catch((error) => {
    report(error?.name === 'AbortError' ? ANALYZER_STATUS.ABORTED : ANALYZER_STATUS.ERROR, {
      error: String(error?.message || error || 'analysis failed'),
    })
    throw error
  }).finally(() => {
    inFlightByKey.delete(cacheKey)
  })

  inFlightByKey.set(cacheKey, job)
  return job
}

export function disposeAutomixAnalysisWorker() {
  if (worker) worker.terminate()
  worker = null
  for (const pending of pendingWorkerRequests.values()) {
    pending.reject(new Error('Automix analysis worker disposed'))
  }
  pendingWorkerRequests.clear()
}
