<template>
  <Teleport to="body">
    <div class="recognition-backdrop" @pointerdown.self="emit('close')">
      <section ref="dialogRef" class="recognition-dialog" role="dialog" aria-modal="true" aria-labelledby="recognition-title" aria-describedby="recognition-description">
        <article ref="featureRef" class="recognition-feature" aria-live="polite">
          <div class="recognition-theme-layer" :class="{ 'is-visible': visualState === 'result' && paletteReady }" :style="matchThemeStyle" aria-hidden="true" />
          <div ref="featureContentRef" class="recognition-feature-inner">
            <header class="recognition-header">
              <span class="recognition-brand"><i aria-hidden="true" /> 听歌识曲</span>
              <button ref="closeButtonRef" class="recognition-close" type="button" aria-label="关闭听歌识曲" @click="emit('close')">×</button>
            </header>

            <div v-if="visualState === 'result' && primaryMatch" class="recognition-main recognition-main-result">
              <div class="recognition-art" aria-hidden="true">
                <svg class="recognition-art-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>
                <img v-if="displayCover" ref="coverImageRef" class="recognition-art-image" :class="{ 'is-ready': coverReady }" :src="displayCoverUrl" alt="" loading="eager" decoding="async" fetchpriority="high" @load="onCoverLoaded" />
              </div>
              <div class="recognition-copy">
                <span class="recognition-eyebrow">识别成功</span>
                <h2 id="recognition-title">{{ primaryMatch.name }}</h2>
                <p id="recognition-description">{{ artistLabel(primaryMatch) }}</p>
              </div>
              <div class="recognition-actions">
                <button class="recognition-primary-action" type="button" :disabled="playingId === primaryMatch.id" @click="playMatch(primaryMatch, 0)">
                  <span v-if="playingId === primaryMatch.id" class="recognition-spinner" aria-hidden="true" />
                  <svg v-else viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.5 4.5a1 1 0 0 1 1.5-.86l8 5.5a1 1 0 0 1 0 1.72l-8 5.5a1 1 0 0 1-1.5-.86v-11Z"/></svg>
                  播放歌曲
                </button>
                <button class="recognition-secondary-action" type="button" @click="searchSong(primaryMatch)">搜索歌曲</button>
              </div>
              <div v-if="matches.length > 1" class="recognition-alternatives">
                <p>其他可能</p>
                <button v-for="(song, index) in matches.slice(1)" :key="song.id" type="button" class="recognition-alternative" :disabled="Boolean(playingId)" :aria-label="`播放${song.name}`" @click="playMatch(song, index + 1)">
                  <span class="recognition-alternative-cover"><SmartMedia v-if="song.cover" :src="song.cover" :alt="`${song.name}封面`" :image-width="96" sizes="40px" /></span>
                  <span class="recognition-alternative-copy"><strong>{{ song.name }}</strong><small>{{ artistLabel(song) }}</small></span>
                  <span aria-hidden="true">▶</span>
                </button>
              </div>
            </div>

            <div v-else-if="visualState === 'active'" class="recognition-main recognition-main-active">
              <div class="recognition-symbol recognition-symbol-listening" aria-hidden="true">
                <span class="recognition-listening-ring" /><span class="recognition-listening-ring" />
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="12" y="4" width="8" height="16" rx="4"/><path d="M8 15a8 8 0 0 0 16 0M16 23v5m-5 0h10" stroke-linecap="round"/></svg>
              </div>
              <div class="recognition-copy">
                <h2 id="recognition-title">正在识别</h2>
                <p id="recognition-description">{{ stageDescription }}</p>
              </div>
            </div>

            <div v-else class="recognition-main recognition-main-empty">
              <div class="recognition-symbol" aria-hidden="true">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M18 33V13l18-4v19"/><circle cx="13" cy="34" r="5"/><circle cx="31" cy="29" r="5"/><path d="M8 14c2-3 5-5 8-6M33 38c3-1 5-3 7-6" stroke-linecap="round"/></svg>
              </div>
              <div class="recognition-copy">
                <h2 id="recognition-title">{{ stageTitle }}</h2>
                <p id="recognition-description">{{ stageDescription }}</p>
              </div>
              <button class="recognition-primary-action recognition-retry-action" type="button" @click="startRecognition">再试一次</button>
            </div>

            <footer class="recognition-footer">
              <span>不会保存录音</span>
              <button v-if="visualState === 'result'" type="button" @click="startRecognition">重新识别</button>
            </footer>
          </div>
        </article>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import apiClient from '@/axios/apiClient.js'
import {searchApi} from '@/api/searchApi/searchApi.js'
import {songsApi} from '@/api/songsApi/songsApi.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import {usePlayerThemeFromCover} from '@/composables/usePlayerThemeFromCover.js'
import {createFallbackTheme} from '@/utils/player/playerTheme.js'
import {getOptimizedImageUrl} from '@/utils/mediaUrl.js'

const emit = defineEmits(['close', 'search'])
const windowSeconds = 3
const stepSeconds = 2
const maxCaptureSeconds = 12
const stage = ref('authorizing')
const errorMessage = ref('')
const matches = ref([])
const matchTheme = ref(createFallbackTheme('aurora-recognition'))
const paletteReady = ref(false)
const displayCover = ref('')
const coverReady = ref(false)
const coverImageRef = ref(null)
const playingId = ref(null)
const closeButtonRef = ref(null)
const dialogRef = ref(null)
const featureRef = ref(null)
const featureContentRef = ref(null)
let recognitionToken = 0
let capture = null
let fingerprintWorker = null
let pendingFingerprint = null
let fingerprintSequence = 0
let matchRequest = null
let latestWindow = null
let checkingWindow = false
let captureComplete = false
let previousBodyOverflow = ''
let themeRequestToken = 0
let displayedSongId = null
let contentResizeObserver = null
const {resolveThemeFromCover} = usePlayerThemeFromCover()

const primaryMatch = computed(() => matches.value[0] || null)
const visualState = computed(() => {
  if (stage.value === 'results' && primaryMatch.value) return 'result'
  if (stage.value === 'empty' || stage.value === 'error') return 'empty'
  return 'active'
})
const matchThemeStyle = computed(() => ({
  '--card-base': matchTheme.value.base.join(', '),
  '--card-accent': matchTheme.value.accent.join(', '),
  '--card-glow': matchTheme.value.glow.join(', '),
}))
const displayCoverUrl = computed(() => getOptimizedImageUrl(displayCover.value, {width: 420, height: 420}))

watch(() => [primaryMatch.value?.id, primaryMatch.value?.cover], ([id, cover]) => {
  if (id !== displayedSongId) {
    displayedSongId = id
    displayCover.value = ''
    coverReady.value = false
  }
  if (cover && !displayCover.value) displayCover.value = cover
})

async function onCoverLoaded(event) {
  const image = event.target
  try { await image.decode() } catch { /* A loaded image can still be displayed. */ }
  if (image === coverImageRef.value && image.naturalWidth > 0) coverReady.value = true
}

watch(displayCover, async cover => {
  const token = ++themeRequestToken
  if (!cover) {
    paletteReady.value = false
    return
  }
  if (paletteReady.value) return
  const theme = await resolveThemeFromCover(getOptimizedImageUrl(cover, {width: 96, height: 96}), primaryMatch.value?.name)
  if (token !== themeRequestToken) return
  matchTheme.value = theme
  await nextTick()
  if (token === themeRequestToken) window.requestAnimationFrame(() => {
    if (token === themeRequestToken) paletteReady.value = true
  })
})

function syncFeatureHeight() {
  const feature = featureRef.value
  const content = featureContentRef.value
  if (!feature || !content) return
  const nextHeight = Math.ceil(content.getBoundingClientRect().height)
  if (nextHeight > 0 && feature.style.height !== `${nextHeight}px`) {
    feature.style.height = `${nextHeight}px`
  }
}

watch(() => [visualState.value, matches.value.length], () => {
  void nextTick(syncFeatureHeight)
}, {flush: 'post'})

const stageTitle = computed(() => {
  return stage.value === 'empty' ? '还没找到这首歌' : '暂时无法识别'
})

const stageDescription = computed(() => {
  if (stage.value === 'authorizing') return '请允许使用麦克风，识别会自动开始。'
  if (stage.value === 'listening') return '让音乐靠近设备，找到后会自动出现。'
  if (stage.value === 'matching') return '再等一下，正在确认这首歌。'
  if (stage.value === 'empty') return '靠近声源或调高一点音量，再试一次。'
  return errorMessage.value || '请稍后再试。'
})

function stopCapture() {
  if (!capture) return
  const current = capture
  capture = null
  current.node?.port.postMessage({type: 'stop'})
  current.node?.disconnect()
  current.source?.disconnect()
  current.silent?.disconnect()
  current.stream?.getTracks().forEach(track => track.stop())
  if (current.context?.state !== 'closed') void current.context?.close().catch(() => {})
}

function cancelCurrent() {
  recognitionToken += 1
  matchRequest?.abort()
  matchRequest = null
  stopCapture()
  disposeFingerprintWorker()
  latestWindow = null
  checkingWindow = false
  captureComplete = false
}

function assetBaseUrl() {
  const apiBase = String(apiClient.defaults.baseURL || '/api').replace(/\/?$/, '/')
  return new URL('audio_match_demo/', new URL(apiBase, window.location.href)).href
}

function disposeFingerprintWorker() {
  if (pendingFingerprint) {
    window.clearTimeout(pendingFingerprint.timer)
    pendingFingerprint.reject(new Error('识别已取消'))
    pendingFingerprint = null
  }
  fingerprintWorker?.terminate()
  fingerprintWorker = null
}

function failRecognition(token, message) {
  if (token !== recognitionToken) return
  cancelCurrent()
  errorMessage.value = message
  stage.value = 'error'
}

function ensureFingerprintWorker(token) {
  if (fingerprintWorker) return fingerprintWorker
  const worker = new Worker(`${import.meta.env.BASE_URL}workers/song-fingerprint.js`)
  fingerprintWorker = worker
  worker.onmessage = ({data}) => {
    if (token !== recognitionToken) return
    if (data?.type === 'error' && data.id == null) {
      failRecognition(token, '识别组件加载失败，请稍后重试。')
      return
    }
    if (!pendingFingerprint || data?.id !== pendingFingerprint.id) return
    const pending = pendingFingerprint
    pendingFingerprint = null
    window.clearTimeout(pending.timer)
    if (data.type === 'result') pending.resolve(data.fingerprint)
    else pending.reject(new Error(data.message || '指纹生成失败'))
  }
  worker.onerror = () => failRecognition(token, '识别组件加载失败，请稍后重试。')
  worker.postMessage({type: 'warmup', assetBase: assetBaseUrl()})
  return worker
}

function createFingerprint(samples, sampleRate, token) {
  return new Promise((resolve, reject) => {
    const worker = ensureFingerprintWorker(token)
    const id = ++fingerprintSequence
    const timer = window.setTimeout(() => {
      if (pendingFingerprint?.id !== id) return
      pendingFingerprint = null
      reject(new Error('指纹生成超时，请重试'))
    }, 15000)
    pendingFingerprint = {id, resolve, reject, timer}
    worker.postMessage({type: 'fingerprint', id, samples: samples.buffer, sampleRate, assetBase: assetBaseUrl()}, [samples.buffer])
  })
}

function normalizeMatch(entry) {
  const source = entry?.song || entry
  const id = Number(source?.id)
  if (!Number.isFinite(id) || id <= 0) return null
  const album = source?.al || source?.album || {}
  const artists = source?.ar || source?.artists || []
  return {
    ...source,
    id,
    name: source?.name || '未知歌曲',
    ar: artists,
    al: album,
    cover: source?.cover || source?.picUrl || album?.picUrl || '',
  }
}

async function hydrateMatches(token) {
  const ids = matches.value.map(song => song.id).join(',')
  if (!ids) return
  try {
    const response = await songsApi.getSongDetail(ids)
    if (token !== recognitionToken) return
    const details = new Map((response?.data?.songs || []).map(song => [Number(song.id), song]))
    matches.value = matches.value.map(song => {
      const detail = details.get(song.id)
      return detail ? {...song, ...detail, cover: song.cover || detail?.al?.picUrl} : song
    })
  } catch {
    // The recognition response already contains enough information to play or search.
  }
}

async function processAvailableWindows(token) {
  if (checkingWindow || token !== recognitionToken) return
  checkingWindow = true
  try {
    while (latestWindow && token === recognitionToken) {
      const {samples, sampleRate} = latestWindow
      latestWindow = null
      const fingerprint = await createFingerprint(samples, sampleRate, token)
      if (token !== recognitionToken) return

      const controller = new AbortController()
      matchRequest = controller
      let response
      try {
        response = await searchApi.recognizeFingerprint(fingerprint, windowSeconds, {signal: controller.signal})
      } finally {
        if (matchRequest === controller) matchRequest = null
      }
      if (token !== recognitionToken) return
      if (response?.data?.code && Number(response.data.code) !== 200) throw new Error('识别服务返回错误')
      const seen = new Set()
      const raw = response?.data?.data?.result
      const found = (Array.isArray(raw) ? raw : []).map(normalizeMatch).filter(song => {
        if (!song || seen.has(song.id)) return false
        seen.add(song.id)
        return true
      }).slice(0, 3)
      if (found.length) {
        matches.value = found
        latestWindow = null
        captureComplete = true
        stopCapture()
        disposeFingerprintWorker()
        stage.value = 'results'
        void hydrateMatches(token)
        return
      }
    }

    if (captureComplete && token === recognitionToken) {
      disposeFingerprintWorker()
      stage.value = 'empty'
    }
  } catch (error) {
    if (token !== recognitionToken) return
    failRecognition(token, error?.message?.includes('指纹生成超时')
      ? error.message
      : '识别服务暂时不可用，请再试一次。')
  } finally {
    if (token === recognitionToken) checkingWindow = false
  }
}

async function startRecognition() {
  cancelCurrent()
  const token = recognitionToken
  stage.value = 'authorizing'
  matches.value = []
  errorMessage.value = ''

  if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) {
    errorMessage.value = '当前浏览器不支持麦克风识曲，请在 HTTPS 或 localhost 页面使用最新版浏览器。'
    stage.value = 'error'
    return
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) throw new Error('浏览器不支持音频采集')
    let context
    try { context = new AudioContextClass({sampleRate: 8000}) }
    catch { context = new AudioContextClass() }
    capture = {context, stream: null, source: null, node: null, silent: null}

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1},
    })
    if (token !== recognitionToken) {
      stream.getTracks().forEach(track => track.stop())
      return
    }
    capture.stream = stream
    await context.audioWorklet.addModule(`${import.meta.env.BASE_URL}worklets/song-recognition-recorder.js`)
    if (token !== recognitionToken) return

    const source = context.createMediaStreamSource(stream)
    const node = new AudioWorkletNode(context, 'aurora-song-recognition-recorder')
    const silent = context.createGain()
    silent.gain.value = 0
    capture.source = source
    capture.node = node
    capture.silent = silent
    source.connect(node)
    node.connect(silent)
    silent.connect(context.destination)
    node.port.onmessage = ({data}) => {
      if (token !== recognitionToken || stage.value === 'results' || stage.value === 'error') return
      if (data?.type === 'window') {
        latestWindow = {samples: data.samples, sampleRate: data.sampleRate}
        void processAvailableWindows(token)
      } else if (data?.type === 'complete') {
        captureComplete = true
        stopCapture()
        stage.value = 'matching'
        void processAvailableWindows(token)
      }
    }
    await context.resume()
    if (token !== recognitionToken) return
    stage.value = 'listening'
    ensureFingerprintWorker(token)
    node.port.postMessage({type: 'start', windowSeconds, stepSeconds, maxSeconds: maxCaptureSeconds})
  } catch (error) {
    if (token !== recognitionToken) return
    stopCapture()
    errorMessage.value = error?.name === 'NotAllowedError'
      ? '麦克风权限未开启，请在浏览器地址栏允许访问后重试。'
      : error?.name === 'NotFoundError'
        ? '没有找到可用的麦克风，请检查设备连接。'
        : error?.message || '无法开始录音，请检查麦克风设置。'
    stage.value = 'error'
  }
}

function artistLabel(song) {
  const artists = song?.ar || song?.artists || []
  if (Array.isArray(artists) && artists.length) return artists.map(artist => artist?.name).filter(Boolean).join(' / ')
  return song?.artistName || song?.al?.name || '未知艺人'
}

async function playMatch(song, index) {
  if (playingId.value) return
  playingId.value = song.id
  try { await playSongWithQueue(song, matches.value, index) }
  finally { playingId.value = null }
}

function searchSong(song) {
  emit('search', song.name)
}

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
  if (event.key !== 'Tab') return
  const buttons = [...(dialogRef.value?.querySelectorAll('button:not(:disabled)') || [])]
  if (!buttons.length) return
  const first = buttons[0]
  const last = buttons.at(-1)
  if (event.shiftKey && (document.activeElement === first || !dialogRef.value.contains(document.activeElement))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.value.contains(document.activeElement))) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKeydown)
  void nextTick(() => {
    syncFeatureHeight()
    if (typeof ResizeObserver !== 'undefined' && featureContentRef.value) {
      contentResizeObserver = new ResizeObserver(syncFeatureHeight)
      contentResizeObserver.observe(featureContentRef.value)
    }
    closeButtonRef.value?.focus()
  })
  void startRecognition()
})

onBeforeUnmount(() => {
  cancelCurrent()
  contentResizeObserver?.disconnect()
  document.body.style.overflow = previousBodyOverflow
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.recognition-backdrop { position: fixed; inset: 0; z-index: 3400; display: grid; place-items: center; overflow-y: auto; padding: 22px; background: rgba(18, 17, 23, .64); animation: recognition-backdrop-in 180ms ease both; }
.recognition-dialog { box-sizing: border-box; width: min(100%, 500px); max-height: calc(100dvh - 44px); overflow-y: auto; color: #fff; border-radius: 28px; background: #353453; box-shadow: 0 28px 80px rgba(13, 10, 16, .3); animation: recognition-dialog-in 260ms cubic-bezier(.22, 1, .36, 1) both; }
.recognition-feature { position: relative; overflow: hidden; isolation: isolate; color: #fff; border-radius: inherit; background: linear-gradient(145deg, #514367, #282d4c 78%); transition: height 480ms cubic-bezier(.22, 1, .36, 1); }
.recognition-feature::before { position: absolute; z-index: 1; inset: 0; background: radial-gradient(circle at 78% 4%, rgba(255, 255, 255, .17), transparent 41%), linear-gradient(180deg, rgba(14, 11, 26, .05), rgba(14, 11, 26, .36)); content: ''; pointer-events: none; }
.recognition-theme-layer { position: absolute; z-index: 0; inset: 0; opacity: 0; background: radial-gradient(circle at 48% 16%, rgba(var(--card-glow), .5), transparent 53%), linear-gradient(150deg, rgb(var(--card-accent)), rgb(var(--card-base)) 78%); transition: opacity 620ms ease; pointer-events: none; }
.recognition-theme-layer.is-visible { opacity: 1; }
.recognition-feature-inner { position: relative; z-index: 2; box-sizing: border-box; display: flex; min-height: 450px; flex-direction: column; padding: 23px 27px 16px; }
.recognition-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.recognition-brand { display: inline-flex; align-items: center; gap: 9px; color: rgba(255, 255, 255, .94); font-size: 12px; font-weight: 760; letter-spacing: .04em; }
.recognition-brand i { width: 8px; height: 8px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 4px rgba(255, 255, 255, .16); }
.recognition-close { display: grid; width: 34px; height: 34px; place-items: center; padding: 0; color: #fff; border: 1px solid rgba(255, 255, 255, .24); border-radius: 50%; background: rgba(255, 255, 255, .12); font-size: 22px; line-height: 1; cursor: pointer; }
.recognition-close:hover { background: rgba(255, 255, 255, .25); }
.recognition-main { display: flex; min-width: 0; flex: 1; align-items: center; flex-direction: column; justify-content: center; padding: 26px 0 14px; text-align: center; animation: recognition-content-in 360ms ease-out both; }
.recognition-main-result { padding-top: 22px; }
.recognition-art { position: relative; display: grid; width: 186px; height: 186px; overflow: hidden; flex: none; place-items: center; color: rgba(255, 255, 255, .75); border: 1px solid rgba(255, 255, 255, .26); border-radius: 20px; background: rgba(255, 255, 255, .14); box-shadow: 0 18px 44px rgba(10, 8, 22, .28); }
.recognition-art-placeholder { width: 54px; height: 54px; }
.recognition-art-image { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 320ms ease; }
.recognition-art-image.is-ready { opacity: 1; }
.recognition-copy { min-width: 0; max-width: 100%; margin-top: 25px; }
.recognition-copy h2 { max-width: 430px; overflow-wrap: anywhere; margin: 0; font-size: clamp(30px, 5vw, 38px); font-weight: 820; letter-spacing: -.04em; line-height: 1.18; text-wrap: balance; }
.recognition-copy p { max-width: 390px; margin: 10px auto 0; color: rgba(255, 255, 255, .78); font-size: 14px; line-height: 1.6; }
.recognition-eyebrow { display: block; margin-bottom: 10px; color: rgba(255, 255, 255, .76); font-size: 11px; font-weight: 780; letter-spacing: .08em; }
.recognition-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 25px; }
.recognition-primary-action, .recognition-secondary-action { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 8px; padding: 0 19px; border-radius: 999px; font-size: 12px; font-weight: 780; cursor: pointer; transition: background 180ms ease, transform 180ms ease; }
.recognition-primary-action { color: #242333; border: 1px solid #fff; background: #fff; }
.recognition-primary-action:hover { background: #f1eef7; transform: translateY(-2px); }
.recognition-primary-action svg { width: 17px; height: 17px; }
.recognition-secondary-action { color: #fff; border: 1px solid rgba(255, 255, 255, .34); background: rgba(255, 255, 255, .1); }
.recognition-secondary-action:hover { background: rgba(255, 255, 255, .2); transform: translateY(-2px); }
.recognition-symbol { position: relative; display: grid; width: 124px; height: 124px; flex: none; place-items: center; color: #fff; border: 1px solid rgba(255, 255, 255, .34); border-radius: 50%; background: rgba(255, 255, 255, .12); box-shadow: 0 16px 36px rgba(18, 12, 26, .13); }
.recognition-symbol svg { width: 46px; height: 46px; }
.recognition-listening-ring { position: absolute; inset: -16px; border: 1px solid rgba(255, 255, 255, .27); border-radius: 50%; animation: recognition-breathe 2.7s ease-in-out infinite; }
.recognition-listening-ring:nth-child(2) { inset: -33px; opacity: .52; animation-delay: -1.3s; }
.recognition-retry-action { margin-top: 26px; }
.recognition-alternatives { width: min(100%, 410px); margin-top: 29px; text-align: left; }
.recognition-alternatives > p { margin: 0 0 6px; color: rgba(255, 255, 255, .69); font-size: 11px; font-weight: 750; letter-spacing: .04em; }
.recognition-alternative { display: flex; width: 100%; min-width: 0; align-items: center; gap: 11px; padding: 9px 2px; color: #fff; border: 0; border-top: 1px solid rgba(255, 255, 255, .18); background: transparent; text-align: left; cursor: pointer; }
.recognition-alternative:hover { background: rgba(255, 255, 255, .08); }
.recognition-alternative-cover { display: block; width: 40px; height: 40px; overflow: hidden; flex: none; border-radius: 8px; background: rgba(255, 255, 255, .18); }
.recognition-alternative-cover :deep(img), .recognition-alternative-cover :deep(> div) { width: 100%; height: 100%; object-fit: cover; }
.recognition-alternative-copy { display: grid; min-width: 0; flex: 1; gap: 2px; }
.recognition-alternative-copy strong, .recognition-alternative-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recognition-alternative-copy strong { font-size: 12px; }
.recognition-alternative-copy small { color: rgba(255, 255, 255, .72); font-size: 11px; }
.recognition-alternative > span:last-child { padding-right: 7px; color: rgba(255, 255, 255, .8); font-size: 13px; }
.recognition-spinner { width: 16px; height: 16px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: recognition-spin 700ms linear infinite; }
.recognition-footer { display: flex; min-height: 34px; align-items: center; justify-content: space-between; gap: 15px; margin-top: 4px; padding-top: 9px; border-top: 1px solid rgba(255, 255, 255, .16); }
.recognition-footer span { color: rgba(255, 255, 255, .6); font-size: 11px; }
.recognition-footer button { padding: 7px 10px; color: #fff; border: 0; border-radius: 9px; background: transparent; font-size: 12px; font-weight: 700; cursor: pointer; }
.recognition-footer button:hover { background: rgba(255, 255, 255, .15); }
.recognition-dialog button:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
@keyframes recognition-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes recognition-dialog-in { from { opacity: 0; transform: translateY(12px) scale(.985); } to { opacity: 1; transform: none; } }
@keyframes recognition-content-in { from { transform: translateY(7px); } to { transform: none; } }
@keyframes recognition-breathe { 50% { opacity: .35; transform: scale(1.06); } }
@keyframes recognition-spin { to { transform: rotate(360deg); } }
@media (max-width: 560px) {
  .recognition-backdrop { align-items: end; padding: 0; }
  .recognition-dialog { width: 100%; max-height: 94dvh; border-radius: 26px 26px 0 0; }
  .recognition-feature-inner { min-height: 425px; padding: 20px 22px calc(14px + env(safe-area-inset-bottom)); }
  .recognition-art { width: 160px; height: 160px; border-radius: 18px; }
  .recognition-copy h2 { font-size: clamp(28px, 8vw, 36px); }
  .recognition-main-result { padding-top: 19px; }
}
@media (max-width: 380px) {
  .recognition-feature-inner { min-height: 405px; padding-right: 19px; padding-left: 19px; }
  .recognition-art { width: 145px; height: 145px; }
  .recognition-copy { margin-top: 19px; }
}
@media (prefers-reduced-motion: reduce) {
  .recognition-backdrop, .recognition-dialog, .recognition-main, .recognition-listening-ring, .recognition-spinner { animation: none !important; }
  .recognition-feature, .recognition-theme-layer, .recognition-art-image, .recognition-primary-action, .recognition-secondary-action { transition: none !important; }
}
</style>
