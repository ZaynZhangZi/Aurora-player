<template>
  <div class="min-h-full overflow-y-auto text-stone-900 transition-colors duration-700" :style="pageStyle">
    <section class="relative flex min-h-[45vh] flex-col justify-end overflow-hidden px-6 pb-12 pt-24 sm:min-h-[55vh] sm:px-12 sm:pb-16">
      <div class="artist-hero-base absolute inset-0" />
      <canvas ref="heroCanvasRef" class="artist-hero-canvas absolute inset-0 mix-blend-screen" />

      <template v-if="hasHeroVideo">
        <video
          class="artist-hero-video absolute inset-0 object-cover"
          :class="heroVideoReady ? 'artist-hero-video-ready' : 'artist-hero-video-pending'"
          :src="heroBannerVideo"
          :poster="heroBannerPoster || artistAvatar"
          autoplay muted loop playsinline preload="metadata"
          @loadeddata="onHeroVideoLoaded"
          @error="onHeroVideoError"
        />
        <div
          class="artist-hero-video-mask absolute inset-0 transition-opacity duration-700"
          :class="heroVideoReady ? 'opacity-100' : 'opacity-0'"
        />
      </template>

      <div v-if="!hasHeroVideo || !heroVideoReady" class="absolute inset-0 z-10 flex items-center justify-center opacity-30 blur-[60px]">
        <img :src="artistAvatar" alt="" class="h-96 w-96 rounded-full object-cover" @error="onAvatarError" />
      </div>

      <div class="relative z-20 mx-auto w-full max-w-6xl">
        <div v-if="!hasHeroVideo || !heroVideoReady" class="mb-6 h-32 w-32 overflow-hidden rounded-full border-4 border-white/20 shadow-2xl sm:h-48 sm:w-48">
          <img :src="artistAvatar" alt="artist-avatar" class="h-full w-full object-cover" @error="onAvatarError" />
        </div>
        <h1 class="text-5xl font-black tracking-widest  text-white drop-shadow-2xl sm:text-7xl lg:text-8xl">
          {{ artistName || '歌手详情' }}
        </h1>
      </div>

      <div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent mix-blend-overlay" />
    </section>

    <main class="relative z-30 mx-auto max-w-6xl px-6 py-12 sm:px-12">
      <p v-if="loading" class="animate-pulse text-sm font-medium text-stone-500">正在加载歌手信息...</p>
      <p v-else-if="error" class="text-sm font-medium text-red-500">{{ error }}</p>

      <template v-else>
        <section class="mb-16">
          <div class="mb-6 flex items-end justify-between border-b border-stone-900/10 pb-4">
            <div class="flex items-center gap-4">
              <h2 class="text-3xl font-bold tracking-tight text-stone-900">歌曲</h2>
              <div class="flex items-center rounded-full bg-stone-900/5 p-1">
                <button
                  class="rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
                  :class="songViewMode === 'top50' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'"
                  @click="switchSongViewMode('top50')"
                >前50首</button>
                <button
                  class="rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
                  :class="songViewMode === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'"
                  @click="switchSongViewMode('all')"
                >全部</button>
              </div>
            </div>
          </div>

          <Transition name="song-page" mode="out-in">
            <div :key="`${songViewMode}-${currentSongPage}`" class="space-y-1" :style="songListStyle">
              <div
                v-for="(song, index) in visibleSongs"
                :key="song.id"
                class="group flex cursor-pointer items-center gap-4 rounded-xl px-3 py-2.5 transition-all hover:bg-white/60 hover:shadow-sm"
                @click="openSong(song, getSongQueueIndex(index), getSongQueue())"
              >
                <div class="flex w-8 justify-center">
                  <span class="text-sm font-medium tabular-nums text-stone-400 group-hover:hidden">{{ getSongDisplayIndex(index) }}</span>
                  <svg class="hidden text-stone-900 group-hover:block" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>

                <div class="flex min-w-0 flex-1 flex-col">
                  <span class="truncate text-base font-semibold text-stone-800">{{ song.name }}</span>
                  <ArtistLinks :artists="getSongArtistsPreview(song)" class="mt-0.5 truncate text-xs text-stone-500" />
                </div>

                <span class="text-sm font-medium tabular-nums text-stone-400">{{ formatDuration(song.dt) }}</span>
              </div>
            </div>
          </Transition>

          <div class="mt-6 flex items-center justify-end gap-3 text-sm">
            <span class="text-xs font-medium text-stone-400">第 {{ currentSongPage }} / {{ currentSongLoadedPages }} 页</span>
            <div class="flex items-center gap-1">
              <button
                class="flex h-8 w-8 items-center justify-center rounded-full bg-white/50 text-stone-700 shadow-sm backdrop-blur-md ring-1 ring-stone-900/5 transition hover:bg-white disabled:opacity-40"
                :disabled="currentSongPage <= 1" @click="prevSongPage"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-full bg-white/50 text-stone-700 shadow-sm backdrop-blur-md ring-1 ring-stone-900/5 transition hover:bg-white disabled:opacity-40"
                :disabled="!canNextSongPage" @click="nextSongPage"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </section>

        <section class="mb-16">
          <div class="mb-6 border-b border-stone-900/10 pb-4">
            <h2 class="text-2xl font-bold tracking-tight text-stone-900">代表专辑</h2>
          </div>
          <div class="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-6">
            <button
              v-for="(album, index) in featuredAlbums"
              :key="album.id"
              class="group text-left"
              @click="openAlbum(album)"
            >
              <div class="relative overflow-hidden rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
                <div v-if="index === 0" class="absolute left-2 top-2 z-10 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-stone-900 backdrop-blur-md">Latest</div>
                <img :src="album.picUrl" :alt="album.name" class="aspect-square w-full object-cover" @error="onBlockImageError" />
                <div class="absolute inset-0 rounded-[20px] ring-1 ring-inset ring-black/5" />
              </div>
              <p class="mt-3 truncate text-sm font-bold text-stone-800">{{ album.name }}</p>
              <p class="text-xs font-medium text-stone-500">{{ formatDate(album.publishTime) }}</p>
            </button>
          </div>
        </section>

        <section class="mb-16">
          <div class="mb-6 flex items-end justify-between border-b border-stone-900/10 pb-4">
            <h2 class="text-2xl font-bold tracking-tight text-stone-900">全部专辑</h2>
            <span class="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Discography</span>
          </div>

          <div class="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            <button
              v-for="album in pagedAlbums"
              :key="`all-${album.id}`"
              class="group text-left"
              type="button"
              @click="openAlbum(album)"
            >
              <div class="relative overflow-hidden rounded-2xl transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
                <img :src="album.picUrl" :alt="album.name" class="aspect-square w-full object-cover" @error="onBlockImageError" />
                <div class="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5" />
              </div>
              <p class="mt-2.5 truncate text-sm font-semibold text-stone-800">{{ album.name }}</p>
            </button>
          </div>

          <div class="mt-8 flex items-center justify-end gap-4">
            <p v-if="albumLoadingMore" class="animate-pulse text-xs font-medium text-stone-500">正在加载更多...</p>
            <span class="text-xs font-medium text-stone-400">第 {{ albumPage }} 页</span>

            <div class="flex items-center gap-2">
              <div class="flex items-center overflow-hidden rounded-full bg-white/40 ring-1 ring-stone-900/5 backdrop-blur-md transition-all focus-within:bg-white/70 focus-within:ring-stone-900/20">
                <input
                  v-model.trim="albumJumpInput"
                  type="number"
                  min="1"
                  placeholder="页码"
                  class="w-14 bg-transparent px-3 py-1.5 text-center text-xs font-medium text-stone-800 outline-none placeholder:text-stone-400"
                  @keyup.enter="jumpToAlbumPage"
                />
                <button
                  class="border-l border-stone-900/10 px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-white/50 hover:text-stone-900 disabled:opacity-40"
                  type="button"
                  :disabled="albumJumping"
                  @click="jumpToAlbumPage"
                >
                  跳转
                </button>
              </div>

              <button
                class="flex h-8 w-8 items-center justify-center rounded-full bg-white/40 text-stone-700 ring-1 ring-stone-900/5 backdrop-blur-md transition hover:bg-white hover:shadow-sm disabled:opacity-40"
                type="button"
                :disabled="albumPage <= 1"
                @click="prevAlbumPage"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-full bg-white/40 text-stone-700 ring-1 ring-stone-900/5 backdrop-blur-md transition hover:bg-white hover:shadow-sm disabled:opacity-40"
                type="button"
                :disabled="!canNextAlbumPage"
                @click="nextAlbumPage"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </section>

        <section v-if="pagedMvs.length" class="mb-16">
          <div class="mb-6 flex items-end justify-between border-b border-stone-900/10 pb-4">
            <h2 class="text-2xl font-bold tracking-tight text-stone-900">音乐视频</h2>
          </div>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <article v-for="mv in pagedMvs" :key="mv.id" class="group cursor-pointer" @click="openMv(mv)">
              <div class="relative overflow-hidden rounded-2xl shadow-md transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-xl">
                <img :src="getMvCover(mv)" :alt="mv.name" class="aspect-video w-full object-cover transition-transform duration-700 group-hover:scale-105" @error="onBlockImageError" />
                <div class="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
                <div class="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">MV</div>
              </div>
              <p class="mt-3 line-clamp-2 text-sm font-bold text-stone-800">{{ mv.name }}</p>
            </article>
          </div>
        </section>

        <section class="rounded-[32px] bg-white/40 p-8 shadow-sm ring-1 ring-white/60 backdrop-blur-xl sm:p-10">
          <h2 class="mb-6 text-xl font-bold tracking-tight text-stone-900">关于 {{ artistName }}</h2>
          <p class="whitespace-pre-line text-sm leading-relaxed text-stone-700 opacity-90">{{ artistDescription }}</p>
        </section>
      </template>
    </main>

    <Teleport to="body">
      <div
        v-if="mvPlayerOpen"
        class="fixed inset-0 z-[1002] bg-black/60 p-4 backdrop-blur-xl"
        @click.self="closeMvPlayer"
      >
        <div class="mx-auto mt-[8vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
          <div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
            <p class="truncate text-sm font-medium">{{ currentMv?.name || 'MV 播放' }}</p>
            <div class="flex items-center gap-2">
              <select
                v-if="mvResolutions.length"
                v-model="selectedMvResolution"
                class="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-xs text-white outline-none backdrop-blur-md"
                @change="changeMvResolution"
              >
                <option v-for="r in mvResolutions" :key="r" :value="r" class="bg-stone-900">{{ r }}P</option>
              </select>
              <button
                class="rounded-full border border-white/20 px-3 py-1 text-xs transition hover:bg-white/20"
                type="button"
                @click="closeMvPlayer"
              >
                关闭
              </button>
            </div>
          </div>

          <div class="aspect-video w-full bg-black">
            <div v-if="mvPlayerLoading" class="grid h-full place-items-center text-sm text-white/70">MV 加载中...</div>
            <div v-else-if="mvPlayerError" class="grid h-full place-items-center px-6 text-center text-sm text-red-400">{{ mvPlayerError }}</div>
            <video
              v-else-if="currentMvUrl"
              :src="currentMvUrl"
              :poster="getMvCover(currentMv)"
              controls
              autoplay
              playsinline
              class="h-full w-full"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import { markNavigatingBack } from '@/router/index.js'
import {artistApi} from '@/api/artistApi/artistApi.js'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import {usePlayerStore} from '@/stores/playerStore.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'
import {toBackendMediaUrl} from '@/utils/backendMedia.js'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()

const loading = ref(true)
const error = ref('')
const artistId = ref(null)
const artistName = ref('')
const artistProfile = ref(null)
const heroBannerVideo = ref('')
const heroBannerPoster = ref('')
const heroVideoReady = ref(false)

const hotSongs = ref([])
const allSongs = ref([])
const songHasMore = ref(false)
const songLoadingMore = ref(false)
const topSongPage = ref(1)
const allSongPage = ref(1)
const songPageSize = 10
const songRequestLimit = songPageSize
const songViewMode = ref('top50')
const songRequestOffset = ref(0)
const songAllRequestFailed = ref(false)
const allSongJumpInput = ref('')
const allSongJumping = ref(false)
const albums = ref([])
const mvs = ref([])
const albumPageSize = 12
const albumRequestLimit = albumPageSize
const albumPage = ref(1)
const albumOffset = ref(0)
const albumHasMore = ref(false)
const albumLoadingMore = ref(false)
const albumJumpInput = ref('')
const albumJumping = ref(false)
const mvPlayerOpen = ref(false)
const mvPlayerLoading = ref(false)
const mvPlayerError = ref('')
const currentMv = ref(null)
const currentMvUrl = ref('')
const mvResolutions = ref([])
const selectedMvResolution = ref(1080)
const shouldResumeMusicOnClose = ref(false)
const mvPage = ref(1)
const mvPageSize = 10
const mvOffset = ref(0)
const mvHasMore = ref(false)
const mvLoadingMore = ref(false)
const themeRgb = ref('56, 64, 82')
const animatedThemeRgb = ref(themeRgb.value)
const heroCanvasRef = ref(null)
let themeRaf = 0
let heroCanvasRaf = 0
let heroCanvasStart = 0
let heroCanvasResizeObserver = null

const heroLiquidBlobs = [
  {x: 0.12, y: 0.22, r: 0.5, dx: 0.14, dy: 0.1, speed: 0.00042, phase: 0.2, alpha: 0.44},
  {x: 0.84, y: 0.24, r: 0.42, dx: 0.16, dy: 0.14, speed: 0.00036, phase: 1.3, alpha: 0.4},
  {x: 0.62, y: 0.78, r: 0.48, dx: 0.2, dy: 0.12, speed: 0.0003, phase: 2.5, alpha: 0.34},
]

const topSongs = computed(() => {
  return mergeSongs([], hotSongs.value).slice(0, 50)
})
const topSongPages = computed(() => Math.max(1, Math.ceil(topSongs.value.length / songPageSize)))
const allSongLoadedPages = computed(() => Math.max(1, Math.ceil(allSongs.value.length / songPageSize)))
const currentSongPage = computed(() => (songViewMode.value === 'all' ? allSongPage.value : topSongPage.value))
const currentSongLoadedPages = computed(() => (songViewMode.value === 'all' ? allSongLoadedPages.value : topSongPages.value))
const canNextSongPage = computed(() => {
  if (songViewMode.value === 'all') {
    return allSongPage.value < allSongLoadedPages.value || songHasMore.value
  }
  return topSongPage.value < topSongPages.value
})
const visibleSongs = computed(() => {
  const page = currentSongPage.value
  const start = (page - 1) * songPageSize
  if (songViewMode.value === 'all') {
    return allSongs.value.slice(start, start + songPageSize)
  }
  return topSongs.value.slice(start, start + songPageSize)
})
const songListStyle = computed(() => {
  const itemHeight = 42
  const gap = 6
  const minHeight = (songPageSize * itemHeight) + ((songPageSize - 1) * gap)
  return {minHeight: `${minHeight}px`}
})
const songSectionLabel = computed(() => (songViewMode.value === 'all' ? `全部歌曲 ${allSongs.value.length}` : `前50首 ${topSongs.value.length}`))
const latestAlbum = computed(() => albums.value[0] || null)
const featuredAlbums = computed(() => albums.value.slice(0, 6))
const albumLoadedPages = computed(() => Math.max(1, Math.ceil(albums.value.length / albumPageSize)))
const pagedAlbums = computed(() => {
  const start = (albumPage.value - 1) * albumPageSize
  return albums.value.slice(start, start + albumPageSize)
})
const canNextAlbumPage = computed(() => albumPage.value < albumLoadedPages.value || albumHasMore.value)
const mvTotalPages = computed(() => Math.max(1, Math.ceil(mvs.value.length / mvPageSize)))
const mvLoadedPages = computed(() => Math.max(1, Math.ceil(mvs.value.length / mvPageSize)))
const pagedMvs = computed(() => {
  const start = (mvPage.value - 1) * mvPageSize
  return mvs.value.slice(start, start + mvPageSize)
})
const artistDescription = computed(() => {
  const text = String(artistProfile.value?.briefDesc || '').trim()
  if (text) return text
  return `${artistName.value || '这位艺人'}暂未提供详细简介。你可以先从热门歌曲和代表专辑开始听。`
})

const artistAvatar = computed(() => {
  return artistProfile.value?.avatar || artistProfile.value?.picUrl || artistProfile.value?.img1v1Url || ''
})

const hasHeroVideo = computed(() => Boolean(heroBannerVideo.value))

const pageStyle = computed(() => {
  const [r, g, b] = parseRgb(animatedThemeRgb.value)
  const softR = Math.min(245, Math.round((r + 242) / 2))
  const softG = Math.min(245, Math.round((g + 242) / 2))
  const softB = Math.min(245, Math.round((b + 242) / 2))
  return {
    background: `linear-gradient(180deg, rgba(${r},${g},${b},0.18) 0%, rgba(${softR},${softG},${softB},0.95) 280px, rgba(250,250,250,1) 620px)`,
  }
})

function buildHeroLiquidPalette() {
  const [r, g, b] = parseRgb(animatedThemeRgb.value)
  const dark = [
    Math.max(16, Math.round(r * 0.44)),
    Math.max(18, Math.round(g * 0.44)),
    Math.max(24, Math.round(b * 0.48)),
  ]
  const light = [
    Math.min(255, Math.round((r + 220) / 2)),
    Math.min(255, Math.round((g + 224) / 2)),
    Math.min(255, Math.round((b + 232) / 2)),
  ]
  const glow = [
    Math.min(255, Math.round((r + 244) / 2)),
    Math.min(255, Math.round((g + 248) / 2)),
    Math.min(255, Math.round((b + 250) / 2)),
  ]
  return {dark, light, glow}
}

function ensureHeroCanvasSize() {
  const canvas = heroCanvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const targetWidth = Math.round(width * dpr)
  const targetHeight = Math.round(height * dpr)

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth
    canvas.height = targetHeight
  }
}

function drawHeroCanvas(time) {
  const canvas = heroCanvasRef.value
  if (!canvas) return
  const context = canvas.getContext('2d')
  if (!context) return

  ensureHeroCanvasSize()

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = canvas.width / dpr
  const height = canvas.height / dpr
  if (width <= 0 || height <= 0) return

  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)

  const {dark, light, glow} = buildHeroLiquidPalette()
  const base = context.createLinearGradient(0, 0, width, height)
  base.addColorStop(0, `rgba(${dark[0]}, ${dark[1]}, ${dark[2]}, 0.9)`)
  base.addColorStop(1, `rgba(${light[0]}, ${light[1]}, ${light[2]}, 0.94)`)
  context.fillStyle = base
  context.fillRect(0, 0, width, height)

  context.save()
  context.globalCompositeOperation = 'screen'
  context.filter = 'blur(24px)'

  for (const blob of heroLiquidBlobs) {
    const elapsed = (time - heroCanvasStart) * blob.speed
    const x = width * (blob.x + Math.sin(elapsed + blob.phase) * blob.dx)
    const y = height * (blob.y + Math.cos(elapsed * 1.15 + blob.phase * 1.4) * blob.dy)
    const radius = Math.max(width, height) * (blob.r + Math.sin(elapsed * 1.8 + blob.phase) * 0.08)

    const gradient = context.createRadialGradient(x, y, radius * 0.14, x, y, radius)
    gradient.addColorStop(0, `rgba(${glow[0]}, ${glow[1]}, ${glow[2]}, ${blob.alpha * 1.08})`)
    gradient.addColorStop(0.45, `rgba(${light[0]}, ${light[1]}, ${light[2]}, ${blob.alpha * 0.84})`)
    gradient.addColorStop(1, `rgba(${dark[0]}, ${dark[1]}, ${dark[2]}, 0)`)

    context.fillStyle = gradient
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  context.restore()
}

function renderHeroCanvasStatic() {
  const now = performance.now()
  heroCanvasStart = now
  drawHeroCanvas(now)
}

function tickHeroCanvas(now) {
  drawHeroCanvas(now)
  heroCanvasRaf = requestAnimationFrame(tickHeroCanvas)
}

function startHeroCanvas() {
  stopHeroCanvas()
  renderHeroCanvasStatic()

  if (typeof requestAnimationFrame !== 'function') return

  const prefersStatic = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersStatic) return

  heroCanvasStart = performance.now()
  heroCanvasRaf = requestAnimationFrame(tickHeroCanvas)
}

function stopHeroCanvas() {
  if (!heroCanvasRaf) return
  cancelAnimationFrame(heroCanvasRaf)
  heroCanvasRaf = 0
}

function setupHeroCanvasObserver() {
  const canvas = heroCanvasRef.value
  if (!canvas || typeof ResizeObserver === 'undefined') return
  if (heroCanvasResizeObserver) {
    heroCanvasResizeObserver.disconnect()
    heroCanvasResizeObserver = null
  }
  heroCanvasResizeObserver = new ResizeObserver(() => {
    renderHeroCanvasStatic()
  })
  heroCanvasResizeObserver.observe(canvas)
}

function parseRgb(rgbString) {
  const parts = String(rgbString).split(',').map(v => Number(v.trim()))
  return [
    Number.isFinite(parts[0]) ? parts[0] : 56,
    Number.isFinite(parts[1]) ? parts[1] : 64,
    Number.isFinite(parts[2]) ? parts[2] : 82,
  ]
}

function colorFromSeed(seed) {
  const text = String(seed || 'artist')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
  }
  const r = 46 + (Math.abs(hash) % 80)
  const g = 56 + (Math.abs(hash >> 8) % 90)
  const b = 80 + (Math.abs(hash >> 16) % 100)
  return `${r}, ${g}, ${b}`
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3
}

function formatRgb(values) {
  return `${Math.round(values[0])}, ${Math.round(values[1])}, ${Math.round(values[2])}`
}

function normalizeMaybeUrl(value) {
  if (typeof value !== 'string') return ''
  const url = value.trim()
  if (!url) return ''
  if (url.startsWith('/')) return toBackendMediaUrl(url)
  if (/^https?:\/\//i.test(url)) return url
  return ''
}

function firstValidUrl(candidates = []) {
  for (const item of candidates) {
    const url = normalizeMaybeUrl(item)
    if (url) return url
  }
  return ''
}

function resolveArtistBanner(payload) {
  const root = payload?.data || payload || {}
  const primary = Array.isArray(root) ? (root[0] || {}) : root
  const nested = primary?.data || primary?.result || primary?.record || {}

  const bannerVideo = firstValidUrl([
    primary?.banner,
    primary?.bannerUrl,
    primary?.bannerVideo,
    primary?.videoUrl,
    primary?.url,
    primary?.video?.url,
    nested?.banner,
    nested?.bannerUrl,
    nested?.bannerVideo,
    nested?.videoUrl,
    nested?.url,
    nested?.video?.url,
  ])

  const bannerPoster = firstValidUrl([
    primary?.poster,
    primary?.posterUrl,
    primary?.cover,
    primary?.coverUrl,
    primary?.thumbnail,
    primary?.thumb,
    primary?.picUrl,
    nested?.poster,
    nested?.posterUrl,
    nested?.cover,
    nested?.coverUrl,
    nested?.thumbnail,
    nested?.thumb,
    nested?.picUrl,
  ])

  return {bannerVideo, bannerPoster}
}

function animateThemeTo(nextRgb, {duration = 460} = {}) {
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
    animatedThemeRgb.value = formatRgb([
      start[0] + (end[0] - start[0]) * eased,
      start[1] + (end[1] - start[1]) * eased,
      start[2] + (end[2] - start[2]) * eased,
    ])

    if (progress < 1) {
      themeRaf = requestAnimationFrame(tick)
    } else {
      themeRaf = 0
    }
  }

  themeRaf = requestAnimationFrame(tick)
}

async function pickThemeFromImage(imageUrl, seed) {
  if (!imageUrl) {
    themeRgb.value = colorFromSeed(seed)
    return
  }

  try {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.referrerPolicy = 'no-referrer'

    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
      image.src = imageUrl
    })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', {willReadFrequently: true})
    if (!context) throw new Error('canvas unavailable')

    const size = 48
    canvas.width = size
    canvas.height = size
    context.drawImage(image, 0, 0, size, size)

    const {data} = context.getImageData(0, 0, size, size)
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
    const rr = Math.min(185, Math.max(28, Math.round(r / count)))
    const gg = Math.min(185, Math.max(34, Math.round(g / count)))
    const bb = Math.min(205, Math.max(48, Math.round(b / count)))
    themeRgb.value = `${rr}, ${gg}, ${bb}`
  } catch {
    themeRgb.value = colorFromSeed(seed)
  }
}

function goBack() {
  markNavigatingBack()
  router.back()
}

function onHeroVideoError() {
  heroVideoReady.value = false
  heroBannerVideo.value = ''
}

function onHeroVideoLoaded() {
  heroVideoReady.value = true
}

function formatDuration(durationMs) {
  const total = Math.floor((durationMs || 0) / 1000)
  const minute = Math.floor(total / 60)
  const second = String(total % 60).padStart(2, '0')
  return `${minute}:${second}`
}

function formatDate(timestamp) {
  if (!timestamp) return '未知时间'
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function normalizeSongArtists(song) {
  return (song?.ar || song?.artists || [])
    .map(item => ({
      id: item?.id || item?.artistId || '',
      name: String(item?.name || item?.artistName || '').trim(),
    }))
    .filter(item => item.name)
}

function getSongArtistsPreview(song, maxVisible = 4) {
  return normalizeSongArtists(song).slice(0, maxVisible)
}

function getSongArtistsOmittedCount(song, maxVisible = 4) {
  return Math.max(0, normalizeSongArtists(song).length - maxVisible)
}

function shouldShowArtistsTooltip(song) {
  return normalizeSongArtists(song).length > 5
}

function getSongArtistsFullText(song) {
  const names = normalizeSongArtists(song).map(item => item.name)
  if (!names.length) return '未知歌手'
  return names.join(' / ')
}

async function openSong(song, index = 0, queue = topSongs.value) {
  await playSongWithQueue(song, queue, index)
}

function mergeSongs(base = [], incoming = []) {
  const existed = new Set(base.map(item => String(item?.id || '')))
  const merged = [...base]
  incoming.forEach((item) => {
    const key = String(item?.id || '')
    if (!key || existed.has(key)) return
    existed.add(key)
    merged.push(item)
  })
  return merged
}

function getMvCover(mv) {
  return mv?.imgurl16v9 || mv?.cover || mv?.picUrl || artistAvatar.value
}

function openAlbum(album) {
  if (!album?.id) return
  router.push({
    path: '/albumDetail',
    query: {id: album.id},
  })
}

function openMv(mv) {
  if (!mv?.id) return
  shouldResumeMusicOnClose.value = Boolean(playerStore.isPlaying && playerStore.hasSong)
  if (shouldResumeMusicOnClose.value) {
    playerStore.setPlaying(false)
  }
  currentMv.value = mv
  currentMvUrl.value = ''
  mvPlayerError.value = ''
  mvPlayerLoading.value = true
  mvPlayerOpen.value = true

  selectedMvResolution.value = 1080
  mvResolutions.value = [1080, 720, 480]

  artistApi.getMvDetail(mv.id)
    .then((res) => {
      const brs = res?.data?.data?.brs || {}
      const available = Object.keys(brs)
        .map(item => Number(item))
        .filter(item => Number.isFinite(item) && item > 0)
        .sort((a, b) => b - a)
      if (available.length) {
        mvResolutions.value = available
        selectedMvResolution.value = available[0]
      }
    })
    .catch(() => {
      mvResolutions.value = [1080, 720, 480]
    })
    .finally(() => {
      loadMvUrl(mv.id, selectedMvResolution.value)
    })
}

async function loadMvUrl(mvId, resolution) {
  mvPlayerLoading.value = true
  mvPlayerError.value = ''

  const candidates = Array.from(new Set([
    Number(resolution),
    ...mvResolutions.value.map(item => Number(item)),
    1080,
    720,
    480,
    240,
  ].filter(item => Number.isFinite(item) && item > 0))).sort((a, b) => b - a)

  try {
    for (const r of candidates) {
      const res = await artistApi.getMvUrl(mvId, r)
      const url = res?.data?.data?.url || ''
      if (!url) continue
      selectedMvResolution.value = r
      currentMvUrl.value = url
      return
    }

    mvPlayerError.value = '该 MV 暂无可播放地址'
  } catch {
    mvPlayerError.value = 'MV 加载失败，请稍后重试'
  } finally {
    mvPlayerLoading.value = false
  }
}

function changeMvResolution() {
  if (!currentMv.value?.id) return
  currentMvUrl.value = ''
  loadMvUrl(currentMv.value.id, Number(selectedMvResolution.value || 1080))
}

function closeMvPlayer() {
  mvPlayerOpen.value = false
  mvPlayerLoading.value = false
  mvPlayerError.value = ''
  currentMvUrl.value = ''
  mvResolutions.value = []
  if (shouldResumeMusicOnClose.value && playerStore.hasSong) {
    playerStore.setPlaying(true)
  }
  shouldResumeMusicOnClose.value = false
}

function switchSongViewMode(mode) {
  if (!['top50', 'all'].includes(mode)) return
  songViewMode.value = mode
  if (mode !== 'all') {
    allSongJumpInput.value = ''
  }
  if (mode === 'all' && songAllRequestFailed.value && allSongs.value.length <= topSongs.value.length) {
    loadMoreSongs()
  }
}

function getSongQueue() {
  return songViewMode.value === 'all' ? allSongs.value : topSongs.value
}

function getSongQueueIndex(index) {
  if (songViewMode.value === 'all') {
    return (allSongPage.value - 1) * songPageSize + index
  }
  return (topSongPage.value - 1) * songPageSize + index
}

function getSongDisplayIndex(index) {
  return getSongQueueIndex(index) + 1
}

function prevSongPage() {
  if (songViewMode.value === 'all') {
    if (allSongPage.value <= 1) return
    allSongPage.value -= 1
    return
  }
  if (topSongPage.value <= 1) return
  topSongPage.value -= 1
}

async function nextSongPage() {
  if (songViewMode.value !== 'all') {
    if (topSongPage.value < topSongPages.value) {
      topSongPage.value += 1
    }
    return
  }

  const next = allSongPage.value + 1
  if (next <= allSongLoadedPages.value) {
    allSongPage.value = next
    return
  }

  if (!songHasMore.value) return
  const ok = await loadMoreSongs()
  if (!ok) return
  if (next <= allSongLoadedPages.value) {
    allSongPage.value = next
  }
}

async function jumpToAllSongPage() {
  if (songViewMode.value !== 'all' || allSongJumping.value) return

  const target = Number(allSongJumpInput.value)
  if (!Number.isFinite(target) || target < 1) {
    allSongJumpInput.value = ''
    return
  }

  allSongJumping.value = true
  try {
    if (target <= allSongLoadedPages.value) {
      allSongPage.value = target
      return
    }

    while (allSongLoadedPages.value < target && songHasMore.value) {
      const ok = await loadMoreSongs()
      if (!ok) break
    }

    allSongPage.value = Math.min(target, allSongLoadedPages.value)
  } finally {
    allSongJumping.value = false
  }
}

async function loadMoreMvs() {
  if (!artistId.value || mvLoadingMore.value || !mvHasMore.value) return false

  mvLoadingMore.value = true
  try {
    const res = await artistApi.getArtistMv(artistId.value, {
      limit: mvPageSize * 2,
      offset: mvOffset.value,
    })
    const nextMvs = res?.data?.mvs || []
    if (nextMvs.length) {
      const existed = new Set(mvs.value.map(item => String(item?.id || '')))
      const merged = [...mvs.value]
      nextMvs.forEach((item) => {
        const key = String(item?.id || '')
        if (!key || existed.has(key)) return
        existed.add(key)
        merged.push(item)
      })
      mvs.value = merged
    }

    mvOffset.value = mvs.value.length
    mvHasMore.value = Boolean(res?.data?.hasMore)
    return true
  } catch {
    mvHasMore.value = false
    return false
  } finally {
    mvLoadingMore.value = false
  }
}

function prevAlbumPage() {
  if (albumPage.value <= 1) return
  albumPage.value -= 1
}

async function nextAlbumPage() {
  const next = albumPage.value + 1
  if (next <= albumLoadedPages.value) {
    albumPage.value = next
    return
  }

  if (!albumHasMore.value) return
  const ok = await loadMoreAlbums()
  if (!ok) return
  if (next <= albumLoadedPages.value) {
    albumPage.value = next
  }
}

async function jumpToAlbumPage() {
  if (albumJumping.value) return

  const target = Number(albumJumpInput.value)
  if (!Number.isFinite(target) || target < 1) {
    albumJumpInput.value = ''
    return
  }

  albumJumping.value = true
  try {
    if (target <= albumLoadedPages.value) {
      albumPage.value = target
      return
    }

    while (albumLoadedPages.value < target && albumHasMore.value) {
      const ok = await loadMoreAlbums()
      if (!ok) break
    }

    albumPage.value = Math.min(target, albumLoadedPages.value)
  } finally {
    albumJumping.value = false
  }
}

async function nextMvPage() {
  const next = mvPage.value + 1
  if (next <= mvLoadedPages.value) {
    mvPage.value = next
    return
  }

  if (!mvHasMore.value) return
  const ok = await loadMoreMvs()
  if (!ok) return
  if (next <= mvLoadedPages.value) {
    mvPage.value = next
  }
}

function prevMvPage() {
  if (mvPage.value <= 1) return
  mvPage.value -= 1
}

async function loadMoreSongs() {
  if (!artistId.value || songLoadingMore.value || !songHasMore.value) return false

  songLoadingMore.value = true
  try {
    const res = await artistApi.getArtistAllSongs(artistId.value, {
      limit: songRequestLimit,
      offset: songRequestOffset.value,
    })
    const nextSongs = res?.data?.songs || []
    songAllRequestFailed.value = false
    allSongs.value = mergeSongs(allSongs.value, nextSongs)
    songRequestOffset.value += nextSongs.length
    songHasMore.value = Boolean(res?.data?.more)
    return true
  } catch {
    songAllRequestFailed.value = true
    return false
  } finally {
    songLoadingMore.value = false
  }
}

function onAvatarError(event) {
  const target = event?.target
  if (!(target instanceof HTMLImageElement)) return
  target.src = 'https://p6.music.126.net/obj/wonDlsKUwrLClGjCm8Kx/14059035116/5f31/95e5/9f95/7fe59b3cb7d4f0f2ec87a066529f5909.png'
}

function onBlockImageError(event) {
  const target = event?.target
  if (!(target instanceof HTMLImageElement)) return
  target.src = artistAvatar.value
}

async function ensureArtistId() {
  const fromQueryId = route.query.id
  const fromQueryName = route.query.name

  if (fromQueryId) {
    artistId.value = Number(fromQueryId)
    artistName.value = String(fromQueryName || artistName.value || '')
    return
  }

  if (!fromQueryName) {
    artistId.value = null
    return
  }

  try {
    const searchRes = await artistApi.searchArtist(String(fromQueryName))
    const first = searchRes?.data?.result?.artists?.[0]
    if (first?.id) {
      artistId.value = first.id
      artistName.value = first.name || String(fromQueryName)
      return
    }
  } catch (e) {
    void e
  }

  artistId.value = null
  artistName.value = String(fromQueryName)
}

async function loadArtistPage() {
  loading.value = true
  error.value = ''
  hotSongs.value = []
  allSongs.value = []
  songHasMore.value = false
  songLoadingMore.value = false
  topSongPage.value = 1
  allSongPage.value = 1
  songRequestOffset.value = 0
  songAllRequestFailed.value = false
  allSongJumpInput.value = ''
  allSongJumping.value = false
  albums.value = []
  albumPage.value = 1
  albumOffset.value = 0
  albumHasMore.value = false
  albumLoadingMore.value = false
  albumJumpInput.value = ''
  albumJumping.value = false
  mvs.value = []
  mvPage.value = 1
  mvOffset.value = 0
  mvHasMore.value = false
  mvLoadingMore.value = false
  songViewMode.value = 'top50'
  artistProfile.value = null
  heroBannerVideo.value = ''
  heroBannerPoster.value = ''
  heroVideoReady.value = false

  await ensureArtistId()

  if (!artistId.value) {
    error.value = '未找到该歌手信息'
    loading.value = false
    return
  }

  try {
    const [infoRes, hotRes, allSongsRes, albumRes, mvRes] = await Promise.allSettled([
      artistApi.getArtistInfo(artistId.value),
      artistApi.getArtistHotSongs(artistId.value),
      artistApi.getArtistAllSongs(artistId.value, {limit: songRequestLimit, offset: 0}),
      artistApi.getArtistAlbum(artistId.value, {limit: albumRequestLimit, offset: 0}),
      artistApi.getArtistMv(artistId.value, {limit: mvPageSize * 2, offset: 0}),
    ])

    if (infoRes.status === 'fulfilled') {
      artistProfile.value = infoRes.value?.data?.data?.artist || null
      artistName.value = artistProfile.value?.name || artistName.value || String(route.query.name || '')
    }

    if (hotRes.status === 'fulfilled') {
      hotSongs.value = hotRes.value?.data?.songs || []
    }

    if (allSongsRes.status === 'fulfilled') {
      const initialSongs = allSongsRes.value?.data?.songs || []
      allSongs.value = mergeSongs([], initialSongs)
      songRequestOffset.value = initialSongs.length
      songHasMore.value = Boolean(allSongsRes.value?.data?.more)
    } else {
      songAllRequestFailed.value = true
      songHasMore.value = true
    }

    if (!allSongs.value.length) {
      allSongs.value = mergeSongs([], hotSongs.value)
      if (!songAllRequestFailed.value) {
        songHasMore.value = false
      }
    }

    if (albumRes.status === 'fulfilled') {
      const initialAlbums = albumRes.value?.data?.hotAlbums || []
      albums.value = initialAlbums
      albumOffset.value = initialAlbums.length
      albumHasMore.value = Boolean(albumRes.value?.data?.more)
    }

    if (mvRes.status === 'fulfilled') {
      const initialMvs = mvRes.value?.data?.mvs || []
      mvs.value = initialMvs
      mvOffset.value = initialMvs.length
      mvHasMore.value = Boolean(mvRes.value?.data?.hasMore)
    }

    const lookupName = String(
      artistProfile.value?.name
      || artistName.value
      || route.query.name
      || '',
    ).trim()

    if (lookupName) {
      try {
        const heroRes = await artistApi.getArtistVideo(lookupName)
        const {bannerVideo, bannerPoster} = resolveArtistBanner(heroRes)
        heroBannerVideo.value = bannerVideo
        heroBannerPoster.value = bannerPoster
        heroVideoReady.value = false
      } catch {
        heroBannerVideo.value = ''
        heroBannerPoster.value = ''
        heroVideoReady.value = false
      }
    }

    await pickThemeFromImage(
      heroBannerPoster.value || artistProfile.value?.cover || artistProfile.value?.picUrl,
      artistName.value,
    )
  } catch (err) {
    error.value = err?.message || '歌手数据加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function loadMoreAlbums() {
  if (!artistId.value || albumLoadingMore.value || !albumHasMore.value) return false

  albumLoadingMore.value = true
  try {
    const res = await artistApi.getArtistAlbum(artistId.value, {
      limit: albumRequestLimit,
      offset: albumOffset.value,
    })
    const nextAlbums = res?.data?.hotAlbums || []

    if (nextAlbums.length) {
      const existed = new Set(albums.value.map(item => String(item?.id || '')))
      const merged = [...albums.value]
      nextAlbums.forEach((item) => {
        const key = String(item?.id || '')
        if (!key || existed.has(key)) return
        existed.add(key)
        merged.push(item)
      })
      albums.value = merged
    }

    albumOffset.value = albums.value.length
    albumHasMore.value = Boolean(res?.data?.more)
    return true
  } catch {
    albumHasMore.value = false
    return false
  } finally {
    albumLoadingMore.value = false
  }
}

onMounted(async () => {
  await nextTick()
  ensureHeroCanvasSize()
  setupHeroCanvasObserver()
  startHeroCanvas()
  loadArtistPage()
})

onBeforeUnmount(() => {
  closeMvPlayer()
  if (themeRaf) {
    cancelAnimationFrame(themeRaf)
    themeRaf = 0
  }
  stopHeroCanvas()
  if (heroCanvasResizeObserver) {
    heroCanvasResizeObserver.disconnect()
    heroCanvasResizeObserver = null
  }
})

watch(
  themeRgb,
  (nextValue, prevValue) => {
    if (!prevValue || prevValue === nextValue) {
      animatedThemeRgb.value = nextValue
      return
    }
    animateThemeTo(nextValue)
  },
  {immediate: true},
)

watch(
  animatedThemeRgb,
  () => {
    if (!heroCanvasRaf) {
      renderHeroCanvasStatic()
    }
  },
)

watch(
  hasHeroVideo,
  async (nextValue) => {
    await nextTick()
    ensureHeroCanvasSize()
    setupHeroCanvasObserver()
    if (!nextValue || !heroVideoReady.value) {
      startHeroCanvas()
    }
  },
)

watch(
  heroVideoReady,
  (ready) => {
    if (hasHeroVideo.value && ready) {
      stopHeroCanvas()
      renderHeroCanvasStatic()
      return
    }
    startHeroCanvas()
  },
)

watch(
  () => [route.query.id, route.query.name],
  () => {
    loadArtistPage()
  },
)

watch(
  () => mvs.value.length,
  () => {
    if (mvPage.value > mvTotalPages.value) {
      mvPage.value = mvTotalPages.value
    }
  },
)

watch(
  () => topSongs.value.length,
  () => {
    if (topSongPage.value > topSongPages.value) {
      topSongPage.value = topSongPages.value
    }
  },
)

watch(
  () => allSongs.value.length,
  () => {
    if (allSongPage.value > allSongLoadedPages.value) {
      allSongPage.value = allSongLoadedPages.value
    }
  },
)

watch(
  () => albums.value.length,
  () => {
    if (albumPage.value > albumLoadedPages.value) {
      albumPage.value = albumLoadedPages.value
    }
  },
)
</script>

<style scoped>
.artist-hero-base {
  background: #17202c;
}

.artist-hero-video {
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 520ms ease, filter 520ms ease;
}

.artist-hero-video-pending {
  opacity: 0;
  filter: blur(2px);
}

.artist-hero-video-ready {
  opacity: 1;
  filter: blur(0);
}

.artist-hero-video-mask {
  z-index: 3;
  background:
    radial-gradient(130% 90% at 50% 0%, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.22) 70%),
    linear-gradient(180deg, rgba(8, 12, 18, 0.2) 0%, rgba(8, 12, 18, 0.5) 100%);
}

.artist-hero-canvas {
  z-index: 1;
  pointer-events: none;
  opacity: 0.98;
  display: block;
  width: 100%;
  height: 100%;
}

.song-page-enter-active,
.song-page-leave-active {
  transition: opacity 240ms ease, filter 240ms ease;
}

.song-page-enter-from,
.song-page-leave-to {
  opacity: 0;
  filter: blur(2px);
}
</style>
