<template>
  <div class="album-page min-h-screen text-stone-900 transition-colors duration-700" :style="pageStyle">
    <nav class="sticky top-0 z-50 flex items-center justify-between px-6 py-4">
      <div class="h-5"></div>
    </nav>

    <main class="mx-auto max-w-6xl px-6 pb-24 pt-8 sm:px-10">
      <header class="flex flex-col items-center gap-8 md:flex-row md:items-end md:gap-12 md:pb-12">
        <div class="group relative shrink-0">
          <div
            class="absolute -inset-10 z-0 rounded-full blur-[60px] opacity-60 transition-all duration-700 group-hover:scale-110 group-hover:opacity-80"
            :style="{ backgroundColor: `rgb(${animatedThemeRgb})` }"
          />

          <div
            ref="albumHeroCoverRef"
            data-album-detail-hero-cover
            class="relative z-10 h-64 w-64 overflow-hidden rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.3)] md:h-72 md:w-72 lg:h-80 lg:w-80"
          >
            <video
              v-if="displayCoverIsVideo"
              :src="displayCoverUrl"
              :poster="album.cover"
              class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              autoplay
              muted
              loop
              playsinline
            />
            <img v-else-if="displayCoverUrl" :src="displayCoverUrl" alt="album-cover" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div class="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10" />
          </div>
        </div>

        <div class="flex-1 text-center md:text-left">
          <p class="mb-3 text-xs font-bold uppercase tracking-widest text-stone-600 sm:text-sm">Studio Album</p>
          <h1 class="text-4xl font-black tracking-tight text-stone-900 sm:text-5xl lg:text-7xl">
            {{ album.name || '加载中...' }}
          </h1>

          <div class="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium text-stone-700 md:justify-start lg:text-base">
            <span class="font-bold text-stone-900">{{ album.artistName || '未知艺人' }}</span>
            <span class="opacity-40">•</span>
            <span>{{ album.publishDate || '-' }}</span>
            <span class="opacity-40">•</span>
            <span>{{ songs.length }} 首歌, {{ totalDurationText }}</span>
          </div>

          <div class="mt-8 flex flex-col items-center gap-4 md:flex-row md:justify-start">
            <button
              class="flex items-center gap-2 rounded-full bg-stone-900 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-stone-900/20 transition-all hover:scale-105 hover:bg-black active:scale-95 disabled:pointer-events-none disabled:opacity-60"
              type="button"
              :disabled="!songs.length"
              @click="playAll"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              全部播放
            </button>
            <p v-if="playHint" class="text-sm font-medium text-amber-700">{{ playHint }}</p>
            <p v-else class="text-xs text-stone-600">由 {{ album.company || '未知唱片' }} 发行</p>
          </div>
        </div>
      </header>

      <div class="my-8 h-px w-full bg-stone-900/10" />

      <section class="grid gap-12 lg:grid-cols-[1fr_320px]">
        <article>
          <div class="mb-4 flex items-center justify-between px-2">
            <h2 class="text-xl font-bold text-stone-900">曲目</h2>
          </div>

          <div v-if="loading" class="animate-pulse space-y-3">
            <div v-for="i in 5" :key="i" class="h-14 w-full rounded-xl bg-white/30" />
          </div>
          <p v-else-if="error" class="text-sm font-medium text-red-600">{{ error }}</p>

          <TransitionGroup v-else name="album-track" tag="div" class="space-y-1" appear>
            <button
              v-for="(song, index) in songs"
              :key="song.id"
              class="group flex w-full items-center gap-4 rounded-xl px-2 py-3 text-left transition-colors hover:bg-white/50 focus:bg-white/60 focus:outline-none"
              type="button"
              @click="playSong(song, index)"
            >
              <div class="flex w-8 justify-center">
                <span class="text-sm font-medium text-stone-500 group-hover:hidden">{{ index + 1 }}</span>
                <svg class="hidden text-stone-900 group-hover:block" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>

              <div class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-base font-semibold text-stone-900">{{ song.name }}</span>
              </div>

              <span class="text-sm font-medium tabular-nums text-stone-500">{{ formatDuration(song.dt) }}</span>
            </button>
          </TransitionGroup>
        </article>

        <aside>
          <div class="sticky top-24 rounded-3xl bg-white/40 p-6 shadow-sm ring-1 ring-white/60 backdrop-blur-md">
            <h3 class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-stone-500">关于这张专辑</h3>

            <div class="relative">
              <p class="line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-stone-700 opacity-90">
                {{ albumDescriptionText }}
              </p>
            </div>

            <button
              v-if="isTextLong"
              @click="showModal = true"
              class="mt-4 text-xs font-bold text-stone-900 transition hover:text-stone-500 hover:underline underline-offset-4"
              type="button"
            >
              查看更多
            </button>
          </div>
        </aside>
      </section>
    </main>

    <Transition name="modal">
      <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
        <div class="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" @click="showModal = false" />

        <div class="modal-content relative flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
          <div class="flex items-center justify-between border-b border-stone-100 px-6 py-4 md:px-8 md:py-5">
            <h3 class="text-lg font-bold text-stone-900">关于这张专辑</h3>
            <button @click="showModal = false" class="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <div class="custom-scrollbar overflow-y-auto px-6 py-6 md:px-8 md:py-8">
            <p class="whitespace-pre-line text-base leading-relaxed text-stone-700">
              {{ albumDescriptionText }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import { markNavigatingBack } from '@/router/index.js'
import { artistApi } from '@/api/artistApi/artistApi.js'
import { songsApi } from '@/api/songsApi/songsApi.js'
import { playSongWithQueue } from '@/utils/globalPlayer.js'
import {setPendingTransition, consumePendingTransition, peekPendingTransition, playHeroEnter} from '@/utils/heroTransition.js'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const album = ref({
  id: null,
  name: '',
  cover: '',
  artistName: '',
  publishDate: '',
  company: '',
  description: '',
})
const songs = ref([])
const playHint = ref('')
const dynamicCover = ref({ url: '', isVideo: false })

// 主题色与弹窗状态控制
const themeRgb = ref('178, 154, 122')
const animatedThemeRgb = ref(themeRgb.value)
let themeRaf = 0

// 控制弹窗显示的变量
const showModal = ref(false)

// 监听弹窗状态，当打开时禁用底层页面的滚动条
watch(showModal, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

const totalDurationText = computed(() => {
  const totalMs = songs.value.reduce((sum, item) => sum + Number(item?.dt || 0), 0)
  const totalSeconds = Math.floor(totalMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  return `${hours}小时 ${String(remainMinutes).padStart(2, '0')}分钟`
})

const albumDescriptionText = computed(() => {
  const desc = String(album.value.description || '').trim()
  if (desc) return desc
  return '当前专辑暂无详细文案。你可以先从曲目列表开始，或点击“全部播放”沉浸式收听。'
})

// 判断文本是否过长，以此决定是否显示“查看更多”按钮
const isTextLong = computed(() => {
  const text = albumDescriptionText.value
  const lineBreaks = (text.match(/\n/g) || []).length
  return text.length > 150 || lineBreaks > 4
})

const displayCoverUrl = computed(() => String(dynamicCover.value.url || album.value.cover || '').trim())
const displayCoverIsVideo = computed(() => Boolean(dynamicCover.value.url && dynamicCover.value.isVideo))

// 重新设计的背景过渡渐变
const pageStyle = computed(() => {
  const [r, g, b] = parseRgb(animatedThemeRgb.value)
  // 计算一个极浅的同色系作为页面最底部的底色 (取代纯白)
  const lightR = Math.min(255, Math.round(r + (255 - r) * 0.92))
  const lightG = Math.min(255, Math.round(g + (255 - g) * 0.92))
  const lightB = Math.min(255, Math.round(b + (255 - b) * 0.92))

  return {
    // 顶部使用 0.65 的高透明度，在 500px 处平滑过渡，最后变为浅色底
    background: `linear-gradient(180deg, rgba(${r},${g},${b},0.65) 0%, rgba(${r},${g},${b},0.2) 500px, rgba(${lightR},${lightG},${lightB},1) 100vh)`,
  }
})

function parseRgb(rgbString) {
  const parts = String(rgbString).split(',').map(v => Number(v.trim()))
  return [
    Number.isFinite(parts[0]) ? parts[0] : 178,
    Number.isFinite(parts[1]) ? parts[1] : 154,
    Number.isFinite(parts[2]) ? parts[2] : 122,
  ]
}

function formatDuration(durationMs) {
  const total = Math.floor((durationMs || 0) / 1000)
  const minute = Math.floor(total / 60)
  const second = String(total % 60).padStart(2, '0')
  return `${minute}:${second}`
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getExt(url = '') {
  const clean = String(url).split('?')[0].split('#')[0].toLowerCase()
  const index = clean.lastIndexOf('.')
  return index >= 0 ? clean.slice(index + 1) : ''
}

function isVideoUrl(url = '') {
  return ['mp4', 'webm', 'm4v', 'mov', 'ogg', 'ogv'].includes(getExt(url))
}

function pickDynamicCover(payload) {
  const data = payload?.data ?? payload
  const root = data?.data ?? data ?? {}
  const hintedType = String(root?.type || root?.format || '').toLowerCase()
  const sources = [
    root?.videoPlayUrl,
    root?.url,
    root?.cover,
    root?.video,
    root?.videoUrl,
    root?.dynamicCover,
    root?.dynamicCoverUrl,
    root?.mvUrl,
    Array.isArray(root) ? root[0]?.videoPlayUrl : '',
    Array.isArray(root) ? root[0]?.url : '',
    Array.isArray(root) ? root[0]?.cover : '',
    Array.isArray(root?.list) ? root.list[0]?.videoPlayUrl : '',
    Array.isArray(root?.list) ? root.list[0]?.url : '',
    Array.isArray(root?.list) ? root.list[0]?.cover : '',
  ]

  for (const candidate of sources) {
    const url = String(candidate || '').trim()
    if (!url || !/^https?:\/\//i.test(url)) continue
    return {
      url,
      isVideo: hintedType.includes('video') || isVideoUrl(url),
    }
  }

  return { url: '', isVideo: false }
}

async function loadAlbumDynamicCover(trackList = []) {
  dynamicCover.value = { url: '', isVideo: false }
  const ids = trackList
    .map(item => Number(item?.id || 0))
    .filter(id => Number.isFinite(id) && id > 0)
    .slice(0, 6)

  for (const id of ids) {
    try {
      const res = await songsApi.getDynamicCover(id)
      const media = pickDynamicCover(res)
      if (media.url) {
        dynamicCover.value = media
        return
      }
    } catch {
    }
  }
}

async function playFromIndex(startIndex = 0) {
  if (!songs.value.length) return false

  for (let i = startIndex; i < songs.value.length; i += 1) {
    const targetSong = songs.value[i]
    const ok = await playSongWithQueue(targetSong, songs.value, i)
    if (ok) {
      if (i !== startIndex) {
        playHint.value = '首选曲目暂不可播放，已自动切换'
      } else {
        playHint.value = ''
      }
      return true
    }
  }

  playHint.value = '当前专辑歌曲暂时无法播放'
  return false
}

async function playSong(song, index = 0) {
  if (!song?.id) {
    playHint.value = '该歌曲缺少播放信息'
    return
  }
  await playFromIndex(index)
}

async function playAll() {
  if (!songs.value.length) return
  await playFromIndex(0)
}

/* ===== Hero 过渡 ===== */
const albumHeroCoverRef = ref(null)

function prepareAlbumHeroReturn() {
  const id = Number(route.query?.id || 0)
  if (!id) return
  const coverEl = albumHeroCoverRef.value
  if (!(coverEl instanceof HTMLElement)) return

  setPendingTransition('album', id, {
    coverRect: coverEl.getBoundingClientRect(),
    coverSrc: album.value.cover || album.value.coverImgUrl || '',
    name: album.value.name || '',
  })
}

async function runAlbumHeroFlipEnter() {
  const id = Number(route.query?.id || 0)
  if (!id) return
  const payload = consumePendingTransition('album', id)
  if (!payload) return

  await nextTick()

  const imgEl = albumHeroCoverRef.value?.querySelector('img, video')
  if (imgEl && !imgEl.complete) {
    await new Promise((resolve) => {
      imgEl.onload = resolve
      imgEl.onerror = resolve
    })
  }

  await playHeroEnter({
    payload,
    targetCoverEl: albumHeroCoverRef.value,
  })
}

function goBack() {
  markNavigatingBack()
  prepareAlbumHeroReturn()
  router.back()
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3
}

function animateThemeTo(nextRgb, {duration = 500} = {}) {
  const start = parseRgb(animatedThemeRgb.value)
  const end = parseRgb(nextRgb)

  if (themeRaf) {
    cancelAnimationFrame(themeRaf)
    themeRaf = 0
  }

  const startedAt = performance.now()
  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration)
    const eased = easeOutCubic(progress)
    animatedThemeRgb.value = `${Math.round(start[0] + (end[0] - start[0]) * eased)}, ${Math.round(start[1] + (end[1] - start[1]) * eased)}, ${Math.round(start[2] + (end[2] - start[2]) * eased)}`
    if (progress < 1) {
      themeRaf = requestAnimationFrame(tick)
    } else {
      themeRaf = 0
    }
  }

  themeRaf = requestAnimationFrame(tick)
}

async function pickThemeFromCover(coverUrl, seed = 'album') {
  if (!coverUrl) {
    themeRgb.value = '178, 154, 122'
    return
  }

  try {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.referrerPolicy = 'no-referrer'

    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
      image.src = coverUrl
    })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', {willReadFrequently: true})
    if (!context) throw new Error('canvas unavailable')
    canvas.width = 42
    canvas.height = 42
    context.drawImage(image, 0, 0, 42, 42)
    const {data} = context.getImageData(0, 0, 42, 42)

    let r = 0, g = 0, b = 0, count = 0
    for (let i = 0; i < data.length; i += 16) {
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      count += 1
    }
    if (!count) throw new Error('no pixels')

    // 重新放宽限制，保留真实色彩的鲜艳度和对比度
    themeRgb.value = `${Math.min(240, Math.max(40, Math.round(r / count)))}, ${Math.min(240, Math.max(40, Math.round(g / count)))}, ${Math.min(240, Math.max(40, Math.round(b / count)))}`
  } catch {
    const hash = Array.from(String(seed)).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    themeRgb.value = `${160 + (hash % 28)}, ${136 + (hash % 24)}, ${108 + (hash % 20)}`
  }
}

async function loadAlbum() {
  loading.value = true
  error.value = ''
  playHint.value = ''
  songs.value = []
  dynamicCover.value = { url: '', isVideo: false }
  showModal.value = false // 切换专辑时确保弹窗关闭

  const id = Number(route.query.id || 0)
  if (!id) {
    error.value = '缺少专辑 id'
    loading.value = false
    return
  }

  try {
    const res = await artistApi.getAlbumDetail(id)
    const albumData = res?.data?.album || {}
    const tracks = res?.data?.songs || []

    album.value = {
      id,
      name: albumData.name || '',
      cover: albumData.picUrl || '',
      artistName: albumData.artist?.name || albumData.artists?.[0]?.name || '',
      publishDate: formatDate(albumData.publishTime),
      company: albumData.company || '',
      description: albumData.description || '',
    }

    songs.value = tracks
    await loadAlbumDynamicCover(tracks)
    const themeCover = dynamicCover.value.isVideo ? album.value.cover : (dynamicCover.value.url || album.value.cover)
    await pickThemeFromCover(themeCover, album.value.name)
  } catch (err) {
    error.value = err?.message || '专辑加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAlbum()
  runAlbumHeroFlipEnter()
})

onBeforeRouteLeave((to) => {
  if (to?.name === 'artistDetailPage') {
    prepareAlbumHeroReturn()
  }
})

onBeforeUnmount(() => {
  if (themeRaf) {
    cancelAnimationFrame(themeRaf)
    themeRaf = 0
  }
  // 确保组件销毁时恢复滚动条
  document.body.style.overflow = ''
})

watch(themeRgb, (nextValue, prevValue) => {
  if (!prevValue || prevValue === nextValue) {
    animatedThemeRgb.value = nextValue
    return
  }
  animateThemeTo(nextValue)
}, {immediate: true})

watch(() => route.query.id, () => {
  loadAlbum()
})
</script>

<style scoped>
/* 曲目列表入场动画更平滑 */
.album-track-enter-active {
  transition: all 400ms cubic-bezier(0.34, 1.18, 0.64, 1);
}
.album-track-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.99);
}
.album-track-move {
  transition: transform 400ms cubic-bezier(0.34, 1.18, 0.64, 1);
}

/* 弹窗过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 300ms ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 300ms cubic-bezier(0.34, 1.18, 0.64, 1);
}
.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.96) translateY(12px);
}

/* 弹窗内定制滚动条，更加轻量现代 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #d6d3d1;
  border-radius: 20px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: #a8a29e;
}
</style>
