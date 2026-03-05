<template>
  <div class="album-page min-h-screen text-stone-900" :style="pageStyle">
    <main class="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-10">
      <section class="relative mb-7 mt-12 overflow-hidden rounded-[30px] border border-white/60 bg-white/72 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-6">
        <div class="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/55 blur-3xl" />

        <div class="mb-4 flex items-center justify-between">
          <p class="text-[11px] uppercase tracking-[0.24em] text-stone-500">Album Detail</p>
          <button
            class="rounded-full border border-stone-300 bg-white/85 px-4 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-white"
            type="button"
            @click="goBack"
          >
            返回
          </button>
        </div>

        <div class="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-end">
          <div class="mx-auto w-full max-w-[320px]">
            <div class="album-cover relative overflow-hidden rounded-[28px] border border-white/65 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
              <img v-if="album.cover" :src="album.cover" alt="album-cover" class="aspect-square w-full rounded-[22px] object-cover" />
            </div>
          </div>

          <div class="min-w-0 pb-1">
            <h1 class="text-3xl font-black leading-tight text-stone-900 sm:text-5xl">{{ album.name || '专辑详情' }}</h1>
            <p class="mt-3 text-sm text-stone-600 sm:text-base">{{ album.artistName || '-' }} · {{ album.publishDate || '-' }}</p>

            <div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <article class="rounded-2xl border border-stone-200 bg-white/90 px-3 py-2">
                <p class="text-[11px] uppercase tracking-wide text-stone-500">Tracks</p>
                <p class="mt-1 text-xl font-bold text-stone-900">{{ songs.length }}</p>
              </article>
              <article class="rounded-2xl border border-stone-200 bg-white/90 px-3 py-2">
                <p class="text-[11px] uppercase tracking-wide text-stone-500">Duration</p>
                <p class="mt-1 text-xl font-bold text-stone-900">{{ totalDurationText }}</p>
              </article>
              <article class="rounded-2xl border border-stone-200 bg-white/90 px-3 py-2">
                <p class="text-[11px] uppercase tracking-wide text-stone-500">Company</p>
                <p class="mt-1 truncate text-sm font-semibold text-stone-800">{{ album.company || '-' }}</p>
              </article>
              <article class="rounded-2xl border border-stone-200 bg-white/90 px-3 py-2">
                <p class="text-[11px] uppercase tracking-wide text-stone-500">Type</p>
                <p class="mt-1 text-sm font-semibold text-stone-800">Studio Album</p>
              </article>
            </div>

            <p class="mt-5 max-w-3xl text-sm leading-relaxed text-stone-700">{{ albumHeadline }}</p>

            <div class="mt-5 flex flex-wrap items-center gap-3">
              <button
                class="rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
                type="button"
                :disabled="!songs.length"
                @click="playAll"
              >
                全部播放
              </button>
              <span class="text-xs text-stone-500">点击任意歌曲可立即加入队列播放</span>
            </div>
            <p v-if="playHint" class="mt-2 text-xs text-amber-600">{{ playHint }}</p>
          </div>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article class="overflow-hidden rounded-[28px] border border-white/65 bg-white/78 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.1)] backdrop-blur-xl sm:p-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-bold text-stone-900 sm:text-xl">曲目列表</h2>
            <span class="text-[11px] uppercase tracking-[0.2em] text-stone-500">Tracklist</span>
          </div>

          <p v-if="loading" class="text-sm text-stone-500">专辑加载中...</p>
          <p v-else-if="error" class="text-sm text-red-500">{{ error }}</p>

          <TransitionGroup v-else name="album-track" tag="div" class="space-y-2" appear>
            <button
              v-for="(song, index) in songs"
              :key="song.id"
              class="group grid w-full grid-cols-[34px_minmax(0,1fr)_56px] items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-left transition hover:-translate-y-px hover:border-stone-300 hover:bg-stone-50"
              type="button"
              @click="playSong(song, index)"
            >
              <span class="text-xs text-stone-500">{{ formatTrackIndex(index + 1) }}</span>
              <span class="truncate text-sm font-medium text-stone-800">{{ song.name }}</span>
              <span class="text-right text-xs text-stone-500">{{ formatDuration(song.dt) }}</span>
            </button>
          </TransitionGroup>
        </article>

        <aside class="rounded-[28px] border border-white/65 bg-white/78 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.1)] backdrop-blur-xl">
          <h3 class="text-sm font-bold uppercase tracking-[0.2em] text-stone-500">Album Notes</h3>
          <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-700">{{ albumDescriptionText }}</p>
        </aside>
      </section>
    </main>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {artistApi} from '@/api/artistApi/artistApi.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'

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
const themeRgb = ref('178, 154, 122')
const animatedThemeRgb = ref(themeRgb.value)
let themeRaf = 0

const totalDurationText = computed(() => {
  const totalMs = songs.value.reduce((sum, item) => sum + Number(item?.dt || 0), 0)
  const totalSeconds = Math.floor(totalMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  return `${hours}h ${String(remainMinutes).padStart(2, '0')}m`
})

const albumHeadline = computed(() => {
  const desc = String(album.value.description || '').trim()
  if (desc) return desc.split('\n')[0]
  return `${album.value.artistName || '这位艺人'}在这张专辑里呈现了完整的声音叙事，建议按曲目顺序完整收听。`
})

const albumDescriptionText = computed(() => {
  const desc = String(album.value.description || '').trim()
  if (desc) return desc
  return '当前专辑暂无详细文案。你可以先从曲目列表开始，或点击“全部播放”沉浸式收听。'
})

const pageStyle = computed(() => {
  const [r, g, b] = parseRgb(animatedThemeRgb.value)
  const softR = Math.min(248, Math.round((r + 244) / 2))
  const softG = Math.min(246, Math.round((g + 240) / 2))
  const softB = Math.min(244, Math.round((b + 236) / 2))
  return {
    background: `linear-gradient(180deg, rgba(${r},${g},${b},0.20) 0%, rgba(${softR},${softG},${softB},0.94) 360px, rgba(244,242,238,1) 100%)`,
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

function formatTrackIndex(index) {
  return String(index).padStart(2, '0')
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function playFromIndex(startIndex = 0) {
  if (!songs.value.length) return false

  for (let i = startIndex; i < songs.value.length; i += 1) {
    const targetSong = songs.value[i]
    const ok = await playSongWithQueue(targetSong, songs.value, i)
    if (ok) {
      if (i !== startIndex) {
        playHint.value = '首选曲目暂不可播放，已自动切换到下一首可播放歌曲'
      } else {
        playHint.value = ''
      }
      return true
    }
  }

  playHint.value = '当前专辑歌曲暂时都无法播放，请稍后再试'
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

function goBack() {
  router.back()
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3
}

function animateThemeTo(nextRgb, {duration = 420} = {}) {
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

    let r = 0
    let g = 0
    let b = 0
    let count = 0
    for (let i = 0; i < data.length; i += 16) {
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      count += 1
    }
    if (!count) throw new Error('no pixels')

    themeRgb.value = `${Math.min(210, Math.max(118, Math.round(r / count)))}, ${Math.min(190, Math.max(102, Math.round(g / count)))}, ${Math.min(172, Math.max(86, Math.round(b / count)))}`
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
    await pickThemeFromCover(album.value.cover, album.value.name)
  } catch (err) {
    error.value = err?.message || '专辑加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAlbum()
})

onBeforeUnmount(() => {
  if (themeRaf) {
    cancelAnimationFrame(themeRaf)
    themeRaf = 0
  }
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
.album-cover::after {
  content: '';
  position: absolute;
  inset: 12px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  pointer-events: none;
}

.album-track-enter-active {
  transition: opacity 220ms ease, transform 220ms ease, filter 220ms ease;
}

.album-track-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.985);
  filter: blur(4px);
}

.album-track-move {
  transition: transform 220ms ease;
}
</style>
