<template>
  <div class="artist-page" :style="pageStyle">
    <section class="artist-hero" :class="{'artist-hero--video': hasHeroVideo}">
      <div class="artist-hero-base" />

      <!-- 整页路由模式下的返回入口（悬浮层模式由关闭按钮负责） -->
      <button
        v-if="!isOverlay"
        class="artist-round-action artist-hero-back"
        type="button"
        aria-label="返回上一页"
        @click="goBack"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9"/></svg>
      </button>

      <template v-if="hasHeroVideo">
        <video
          class="artist-hero-video"
          :class="heroVideoReady ? 'artist-hero-video-ready' : 'artist-hero-video-pending'"
          :src="heroBannerVideo"
          :poster="heroBannerPoster || artistAvatar"
          autoplay muted loop playsinline preload="metadata"
          @loadeddata="onHeroVideoLoaded"
          @error="onHeroVideoError"
        />
        <div class="artist-hero-video-mask" :class="{'is-ready': heroVideoReady}" />
      </template>

      <div v-else-if="!loading" class="artist-hero-ambient" aria-hidden="true">
        <img :src="artistAvatar" alt="" @error="onAvatarError" />
      </div>

      <div class="artist-hero-content">
        <div
          v-if="!loading && !hasHeroVideo"
          ref="artistHeroCoverRef"
          data-artist-detail-hero-cover
          class="artist-portrait"
        >
          <img :src="artistAvatar" :alt="artistName" @error="onAvatarError" />
        </div>

        <h1 :class="{'is-loading': loading}">{{ loading ? '' : (artistName || '歌手详情') }}</h1>

        <div v-if="!loading" class="artist-hero-actions">
          <button class="artist-round-action artist-round-action--quiet" type="button" aria-label="查看艺人简介" @click="scrollToAbout">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 10.8v6.1m0-10.1h.01" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>
          </button>
          <button class="artist-round-action artist-round-action--play" type="button" aria-label="播放艺人热门歌曲" :disabled="!topSongs.length" @click="playArtist">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5Z" fill="currentColor"/></svg>
          </button>
          <button class="artist-round-action artist-round-action--quiet" type="button" aria-label="收藏艺人" disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.8 2.45 4.96 5.48.8-3.97 3.86.94 5.46L12 16.3l-4.9 2.58.94-5.46L4.07 9.56l5.48-.8Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.45"/></svg>
          </button>
        </div>
      </div>
    </section>

    <main class="artist-content">
      <div v-if="loading" class="artist-loading" aria-live="polite">
        <div class="artist-loading-line artist-loading-line--short" />
        <div class="artist-loading-line" />
        <div class="artist-loading-line" />
      </div>
      <p v-else-if="error" class="artist-error">{{ error }}</p>

      <template v-else>
        <section class="artist-overview">
          <article v-if="latestAlbum" class="latest-release">
            <h2>最新发行</h2>
            <button class="latest-release-card" type="button" @click="openAlbum(latestAlbum, $event)">
              <div class="latest-release-cover" data-album-hero-cover :data-album-id="latestAlbum.id">
                <img :src="latestAlbum.picUrl" :alt="latestAlbum.name" @error="onBlockImageError" />
              </div>
              <div class="latest-release-copy">
                <span>{{ formatDate(latestAlbum.publishTime) }}</span>
                <strong>{{ latestAlbum.name }}</strong>
                <span>{{ getAlbumTrackLabel(latestAlbum) }}</span>
              </div>
            </button>
          </article>

          <section class="song-ranking">
            <div class="artist-section-heading artist-section-heading--ranking">
              <button class="artist-heading-link" type="button" @click="switchSongViewMode(songViewMode === 'top50' ? 'all' : 'top50')">
                <h2>歌曲排行</h2>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>
              </button>
              <div class="section-paging">
                <button type="button" aria-label="上一页歌曲" :disabled="currentSongPage <= 1" @click="prevSongPage">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>
                </button>
                <button type="button" aria-label="下一页歌曲" :disabled="!canNextSongPage" @click="nextSongPage">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>
                </button>
              </div>
            </div>

            <Transition name="song-page" mode="out-in">
              <div :key="`${songViewMode}-${currentSongPage}`" class="ranking-grid">
                <button
                  v-for="(song, index) in visibleSongs"
                  :key="song.id"
                  class="ranking-song"
                  type="button"
                  @click="openSong(song, getSongQueueIndex(index), getSongQueue())"
                >
                  <span class="ranking-song-cover">
                    <img :src="getSongCover(song)" :alt="song.name" @error="onBlockImageError" />
                    <span class="ranking-song-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5Z" fill="currentColor"/></svg></span>
                  </span>
                  <span class="ranking-song-copy">
                    <strong>{{ song.name }}</strong>
                    <span>{{ getSongAlbumLabel(song) }}</span>
                  </span>
                  <span class="ranking-song-more" aria-hidden="true">•••</span>
                </button>
              </div>
            </Transition>
          </section>
        </section>

        <section v-if="pagedAlbums.length" class="artist-library-section">
          <div class="artist-section-heading">
            <div class="artist-heading-link">
              <h2>专辑</h2>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>
            </div>
            <div class="section-paging">
              <button type="button" aria-label="上一页专辑" :disabled="albumPage <= 1" @click="prevAlbumPage">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>
              </button>
              <button type="button" aria-label="下一页专辑" :disabled="!canNextAlbumPage" @click="nextAlbumPage">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>
              </button>
            </div>
          </div>

          <div class="album-grid">
            <button v-for="album in pagedAlbums" :key="album.id" class="album-card" type="button" @click="openAlbum(album, $event)">
              <span class="album-card-cover" data-album-hero-cover :data-album-id="album.id">
                <img :src="album.picUrl" :alt="album.name" @error="onBlockImageError" />
                <span class="album-card-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5Z" fill="currentColor"/></svg></span>
              </span>
              <strong>{{ album.name }}</strong>
              <span>{{ formatYear(album.publishTime) }}</span>
            </button>
          </div>
          <p v-if="albumLoadingMore" class="artist-inline-loading">正在加载更多发行...</p>
        </section>

        <section v-if="pagedMvs.length" class="artist-library-section">
          <div class="artist-section-heading">
            <div class="artist-heading-link">
              <h2>音乐视频</h2>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>
            </div>
            <div class="section-paging">
              <button type="button" aria-label="上一页视频" :disabled="mvPage <= 1" @click="prevMvPage">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>
              </button>
              <button type="button" aria-label="下一页视频" :disabled="!mvHasMore && mvPage >= mvLoadedPages" @click="nextMvPage">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>
              </button>
            </div>
          </div>
          <div class="mv-grid">
            <button v-for="mv in pagedMvs" :key="mv.id" class="mv-card" type="button" @click="openMv(mv)">
              <span class="mv-card-cover">
                <img :src="getMvCover(mv)" :alt="mv.name" @error="onBlockImageError" />
                <span class="mv-card-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5Z" fill="currentColor"/></svg></span>
              </span>
              <strong>{{ mv.name }}</strong>
              <span>音乐视频</span>
            </button>
          </div>
        </section>

        <section ref="aboutRef" class="artist-about">
          <h2>{{ artistName }} 简介</h2>
          <p>{{ artistDescription }}</p>
        </section>
      </template>
    </main>

    <Teleport to="body">
      <div
        v-if="mvPlayerOpen"
        class="fixed inset-0 z-[1002] overflow-y-auto overscroll-contain bg-black/60 p-4 backdrop-blur-xl"
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
import {computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import {useRoute} from 'vue-router'
import { markNavigatingBack } from '@/router/index.js'
import { DETAIL_OVERLAY_MODE_KEY, useDetailNavigation } from '@/composables/useDetailNavigation.js'
import {artistApi} from '@/api/artistApi/artistApi.js'
import chroma from 'chroma-js'
import {usePlayerStore} from '@/stores/playerStore.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'
import {toBackendMediaUrl} from '@/utils/backendMedia.js'
import {setPendingTransition, consumePendingTransition, peekPendingTransition, playHeroEnter} from '@/utils/heroTransition.js'

const route = useRoute()
const { closeDetail, openDetail } = useDetailNavigation()
// 悬浮模式（DetailOverlayHost 注入）；整页模式为 false。
const isOverlay = Boolean(inject(DETAIL_OVERLAY_MODE_KEY, false))
// 详情 id：规范 URL 用 params，旧地址回退 query。
const detailId = computed(() => String(route.params?.id || route.query?.id || ''))
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
const songPageSize = 8
const songRequestLimit = songPageSize
const songViewMode = ref('top50')
const songRequestOffset = ref(0)
const songAllRequestFailed = ref(false)
const allSongJumpInput = ref('')
const allSongJumping = ref(false)
const albums = ref([])
const mvs = ref([])
const albumPageSize = 6
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
const mvPageSize = 4
const mvOffset = ref(0)
const mvHasMore = ref(false)
const mvLoadingMore = ref(false)
const themeRgb = ref('56, 64, 82')
const animatedThemeRgb = ref(themeRgb.value)
const heroCanvasRef = ref(null)
const artistHeroCoverRef = ref(null)
const aboutRef = ref(null)
let themeRaf = 0
let heroCanvasRaf = 0
let heroCanvasStart = 0
let heroCanvasResizeObserver = null
let heroCanvasVisibilityObserver = null
let heroCanvasContext = null
let heroCanvasVisible = true
let heroCanvasLastFrameAt = 0

const HERO_CANVAS_FRAME_INTERVAL = 1000 / 24
const HERO_CANVAS_MAX_PIXELS = 1_100_000

function resolveHeroCanvasDpr(width, height) {
  const deviceDpr = Math.min(window.devicePixelRatio || 1, 1.5)
  const budgetDpr = Math.sqrt(HERO_CANVAS_MAX_PIXELS / Math.max(1, width * height))
  return Math.min(deviceDpr, Math.max(0.75, budgetDpr))
}

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
const latestAlbum = computed(() => albums.value[0] || null)
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
  const base = [r, g, b]
  const glow = base.map(value => Math.min(255, Math.round(value + (255 - value) * 0.14)))
  const deep = base.map(value => Math.max(0, Math.round(value * (isOverlay ? 0.76 : 0.72))))
  return {
    '--artist-rgb': `${r}, ${g}, ${b}`,
    '--artist-hero-rgb': glow.join(', '),
    '--artist-deep-rgb': deep.join(', '),
    '--artist-body-rgb': base.join(', '),
    backgroundColor: `rgb(${base.join(', ')})`,
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
  if (!canvas) return null

  const rect = canvas.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))
  const dpr = resolveHeroCanvasDpr(width, height)
  const targetWidth = Math.round(width * dpr)
  const targetHeight = Math.round(height * dpr)

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth
    canvas.height = targetHeight
  }

  return {width, height, dpr}
}

function drawHeroCanvas(time) {
  const canvas = heroCanvasRef.value
  if (!canvas) return
  const context = heroCanvasContext || canvas.getContext('2d', {alpha: false})
  if (!context) return
  heroCanvasContext = context

  const size = ensureHeroCanvasSize()
  if (!size) return
  const {width, height, dpr} = size

  context.setTransform(dpr, 0, 0, dpr, 0, 0)

  const {dark, light, glow} = buildHeroLiquidPalette()
  const base = context.createLinearGradient(0, 0, width, height)
  base.addColorStop(0, `rgba(${dark[0]}, ${dark[1]}, ${dark[2]}, 0.9)`)
  base.addColorStop(1, `rgba(${light[0]}, ${light[1]}, ${light[2]}, 0.94)`)
  context.fillStyle = base
  context.fillRect(0, 0, width, height)

  context.save()
  context.globalCompositeOperation = 'screen'

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
  if (!heroCanvasVisible) {
    heroCanvasRaf = 0
    return
  }

  if (!heroCanvasLastFrameAt || now - heroCanvasLastFrameAt >= HERO_CANVAS_FRAME_INTERVAL) {
    drawHeroCanvas(now)
    heroCanvasLastFrameAt = now - ((now - heroCanvasLastFrameAt) % HERO_CANVAS_FRAME_INTERVAL)
  }
  heroCanvasRaf = requestAnimationFrame(tickHeroCanvas)
}

function startHeroCanvas() {
  if (
    heroCanvasRaf
    || !heroCanvasVisible
    || (hasHeroVideo.value && heroVideoReady.value)
  ) return
  renderHeroCanvasStatic()

  if (typeof requestAnimationFrame !== 'function') return

  const prefersStatic = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersStatic) return

  heroCanvasStart = performance.now()
  heroCanvasLastFrameAt = 0
  heroCanvasRaf = requestAnimationFrame(tickHeroCanvas)
}

function stopHeroCanvas() {
  if (!heroCanvasRaf) return
  cancelAnimationFrame(heroCanvasRaf)
  heroCanvasRaf = 0
  heroCanvasLastFrameAt = 0
}

function setupHeroCanvasObserver() {
  const canvas = heroCanvasRef.value
  if (!canvas || typeof ResizeObserver === 'undefined') return
  if (heroCanvasResizeObserver) {
    heroCanvasResizeObserver.disconnect()
    heroCanvasResizeObserver = null
  }
  heroCanvasResizeObserver = new ResizeObserver(() => {
    if (heroCanvasVisible) renderHeroCanvasStatic()
  })
  heroCanvasResizeObserver.observe(canvas)

  if (heroCanvasVisibilityObserver) {
    heroCanvasVisibilityObserver.disconnect()
    heroCanvasVisibilityObserver = null
  }
  if (typeof IntersectionObserver === 'function') {
    heroCanvasVisibilityObserver = new IntersectionObserver(([entry]) => {
      heroCanvasVisible = Boolean(entry?.isIntersecting)
      if (heroCanvasVisible) startHeroCanvas()
      else stopHeroCanvas()
    }, {rootMargin: '120px 0px'})
    heroCanvasVisibilityObserver.observe(canvas)
  }
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
    const buckets = new Map()

    // Apple Music 的页面底色接近封面中占比最高的深色，而不是所有像素的平均色。
    // 量化后按饱和度加权，可以避开肤色、高光和大面积灰白带来的“脏灰”结果。
    for (let i = 0; i < data.length; i += 12) {
      if (data[i + 3] < 180) continue
      const red = data[i]
      const green = data[i + 1]
      const blue = data[i + 2]
      const high = Math.max(red, green, blue)
      const low = Math.min(red, green, blue)
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
      if (luminance < 8 || luminance > 242) continue

      const saturation = high ? (high - low) / high : 0
      const key = `${red >> 4}-${green >> 4}-${blue >> 4}`
      const weight = (0.7 + saturation * 1.8) * (luminance > 215 ? 0.45 : 1)
      const bucket = buckets.get(key) || {score: 0, red: 0, green: 0, blue: 0, weight: 0}
      bucket.score += weight
      bucket.red += red * weight
      bucket.green += green * weight
      bucket.blue += blue * weight
      bucket.weight += weight
      buckets.set(key, bucket)
    }

    const dominant = [...buckets.values()].sort((a, b) => b.score - a.score)[0]
    if (!dominant?.weight) throw new Error('no pixels')

    const sampled = chroma([
      dominant.red / dominant.weight,
      dominant.green / dominant.weight,
      dominant.blue / dominant.weight,
    ])
    let [hue, saturation, lightness] = sampled.hsl()
    if (!Number.isFinite(hue)) hue = chroma(parseRgb(colorFromSeed(seed))).get('hsl.h') || 220
    saturation = Math.min(0.84, Math.max(0.34, saturation * 1.12))
    lightness = Math.min(0.27, Math.max(0.12, lightness * 0.62))
    const [rr, gg, bb] = chroma.hsl(hue, saturation, lightness).rgb()
    themeRgb.value = `${Math.round(rr)}, ${Math.round(gg)}, ${Math.round(bb)}`
  } catch {
    themeRgb.value = colorFromSeed(seed)
  }
}

/* ===== Hero 过渡 ===== */

function prepareArtistHeroReturn() {
  const id = Number(detailId.value || 0)
  if (!id) return
  const coverEl = artistHeroCoverRef.value
  if (!(coverEl instanceof HTMLElement)) return

  setPendingTransition('artist', id, {
    coverRect: coverEl.getBoundingClientRect(),
    coverSrc: artistAvatar.value || '',
    name: artistName.value || '',
  })
}

async function runArtistHeroFlipEnter() {
  const id = Number(detailId.value || 0)
  if (!id) return
  const payload = consumePendingTransition('artist', id)
  if (!payload) return

  await nextTick()

  const imgEl = artistHeroCoverRef.value?.querySelector('img')
  if (imgEl && !imgEl.complete) {
    await new Promise((resolve) => {
      imgEl.onload = resolve
      imgEl.onerror = resolve
    })
  }

  await playHeroEnter({
    payload,
    targetCoverEl: artistHeroCoverRef.value,
  })
}

async function runAlbumHeroReturn() {
  const payload = consumePendingTransition('album')
  if (!payload?.id) return

  await nextTick()
  // 找专辑封面元素：artist 页的专辑列表中的第一个匹配
  const targetCoverEl = document.querySelector(`[data-album-hero-cover][data-album-id="${payload.id}"]`)
  if (!(targetCoverEl instanceof HTMLElement)) return

  await playHeroEnter({payload, targetCoverEl})
}

/* ===== 导航 ===== */

function goBack() {
  markNavigatingBack()
  prepareArtistHeroReturn()
  // 统一关闭：悬浮层 back 弹出一条历史；整页直接访问回退首页兜底。
  closeDetail()
}

function onHeroVideoError() {
  heroVideoReady.value = false
  heroBannerVideo.value = ''
}

function onHeroVideoLoaded() {
  heroVideoReady.value = true
}

function formatDate(timestamp) {
  if (!timestamp) return '未知时间'
  const d = new Date(timestamp)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatYear(timestamp) {
  if (!timestamp) return '未知年份'
  return String(new Date(timestamp).getFullYear())
}

function getAlbumTrackLabel(album) {
  const size = Number(album?.size || album?.trackCount || album?.songs?.length || 0)
  if (size > 0) return `${size} 首歌曲`
  return album?.type || '最新发行'
}

function getSongCover(song) {
  return song?.al?.picUrl
    || song?.album?.picUrl
    || song?.picUrl
    || artistAvatar.value
}

function getSongAlbumLabel(song) {
  const album = String(song?.al?.name || song?.album?.name || '').trim()
  const yearSource = song?.publishTime || song?.album?.publishTime || song?.al?.publishTime
  const year = yearSource ? new Date(yearSource).getFullYear() : ''
  return [album || artistName.value, year].filter(Boolean).join(' · ')
}

function scrollToAbout() {
  aboutRef.value?.scrollIntoView({behavior: 'smooth', block: 'start'})
}

async function playArtist() {
  if (!topSongs.value.length) return
  await openSong(topSongs.value[0], 0, topSongs.value)
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

function openAlbum(album, event) {
  const albumId = Number(album?.id || 0)
  if (!albumId) return

  const cardEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  const coverEl = cardEl ? cardEl.querySelector('img') : null
  if (coverEl instanceof HTMLElement) {
    setPendingTransition('album', albumId, {
      coverRect: coverEl.getBoundingClientRect(),
      coverSrc: album.picUrl || '',
      name: album.name || '',
    })
  }

  // 统一详情入口：从歌手页打开专辑，作为悬浮层叠加（历史记录正确）
  openDetail('album', albumId)
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
  const fromQueryId = detailId.value
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
  runArtistHeroFlipEnter()
  runAlbumHeroReturn()
})

onBeforeRouteLeave(() => {
  // 无论返回哪个背景页，都准备封面 Hero 返回动画（由背景页消费）。
  prepareArtistHeroReturn()
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
  if (heroCanvasVisibilityObserver) {
    heroCanvasVisibilityObserver.disconnect()
    heroCanvasVisibilityObserver = null
  }
  heroCanvasContext = null
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
    if (!heroCanvasRaf && heroCanvasVisible) {
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
  () => [detailId.value, route.query.name],
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
.artist-page {
  min-height: 100%;
  height: 100%;
  overflow-y: auto;
  color: rgba(255, 255, 255, 0.96);
  isolation: isolate;
  scrollbar-gutter: stable;
  background-color: rgb(var(--artist-body-rgb));
}

.artist-hero {
  position: relative;
  min-height: 540px;
  overflow: clip visible;
}

.artist-hero--video {
  min-height: 620px;
}

.artist-hero-base {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-color: rgb(var(--artist-body-rgb));
}

.artist-hero-ambient {
  position: absolute;
  top: -130px;
  right: -18%;
  left: -18%;
  z-index: 1;
  display: grid;
  height: 1160px;
  place-items: center;
  pointer-events: none;
  opacity: 0.28;
  filter: blur(60px) saturate(1.12);
  transform: scale(1.16);
  mask-image: radial-gradient(ellipse 72% 63% at 50% 22%, #000 0%, #000 48%, rgba(0, 0, 0, 0.58) 64%, transparent 82%);
  -webkit-mask-image: radial-gradient(ellipse 72% 63% at 50% 22%, #000 0%, #000 48%, rgba(0, 0, 0, 0.58) 64%, transparent 82%);
}

.artist-hero-ambient img {
  width: min(63vw, 720px);
  aspect-ratio: 1;
  border-radius: 50%;
  object-fit: cover;
}

.artist-hero-video {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 28%;
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
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0;
  background:
    linear-gradient(90deg, rgba(10, 8, 9, 0.1), transparent 30%, transparent 70%, rgba(10, 8, 9, 0.1)),
    linear-gradient(180deg, rgba(7, 6, 7, 0.08) 16%, rgba(var(--artist-body-rgb), 0.2) 56%, rgb(var(--artist-body-rgb)) 100%);
  transition: opacity 520ms ease;
}

.artist-hero-video-mask.is-ready {
  opacity: 1;
}

.artist-hero-content {
  position: relative;
  z-index: 3;
  display: flex;
  min-height: 540px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 72px 32px 54px;
  text-align: center;
}

.artist-hero--video .artist-hero-content {
  min-height: 620px;
  justify-content: flex-end;
  padding-bottom: 62px;
}

.artist-portrait {
  width: clamp(150px, 16vw, 202px);
  aspect-ratio: 1;
  overflow: hidden;
  margin-bottom: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 70px rgba(8, 7, 8, 0.28), inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.artist-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.artist-hero-content h1 {
  max-width: min(900px, 90vw);
  margin: 0;
  min-width: 0;
  font-size: clamp(2.4rem, 4vw, 3.25rem);
  font-weight: 760;
  line-height: 1.02;
  letter-spacing: -0.045em;
  text-wrap: balance;
  text-shadow: 0 4px 24px rgba(0, 0, 0, 0.32);
}

.artist-hero-content h1.is-loading {
  width: 180px;
  height: 46px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
}

.artist-hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 24px;
}

.artist-round-action {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  color: #fff;
  background: rgba(255, 255, 255, 0.11);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: transform 180ms ease, background-color 180ms ease, opacity 180ms ease;
}

.artist-round-action:hover:not(:disabled) {
  transform: scale(1.06);
  background: rgba(255, 255, 255, 0.19);
}

.artist-round-action:active:not(:disabled) {
  transform: scale(0.96);
}

.artist-round-action:disabled {
  cursor: default;
  opacity: 0.42;
}

.artist-round-action svg {
  width: 21px;
  height: 21px;
}

.artist-round-action--play {
  width: 58px;
  height: 58px;
  border: 0;
  color: rgb(var(--artist-deep-rgb));
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);
}

.artist-round-action--play:hover:not(:disabled) {
  background: #fff;
}

.artist-round-action--play svg {
  width: 28px;
  height: 28px;
  margin-left: 2px;
}

/* 整页详情返回按钮：浮在 Hero 左上角，随视频/环境背景一起可读 */
.artist-hero-back {
  position: absolute;
  top: 22px;
  left: 24px;
  z-index: 6;
}

.artist-hero-back svg {
  width: 22px;
  height: 22px;
}

.artist-content {
  position: relative;
  z-index: 4;
  width: min(100%, 1240px);
  box-sizing: border-box;
  margin: -1px auto 0;
  padding: 24px 42px 96px;
}

.artist-loading {
  display: grid;
  gap: 14px;
  padding: 32px 0;
}

.artist-loading-line {
  width: 100%;
  height: 58px;
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.07));
  background-size: 220% 100%;
  animation: artist-shimmer 1.4s linear infinite;
}

.artist-loading-line--short {
  width: 34%;
}

.artist-error {
  padding: 36px 0;
  color: rgba(255, 214, 214, 0.96);
  font-size: 0.9rem;
}

.artist-overview {
  display: grid;
  grid-template-columns: minmax(250px, 0.82fr) minmax(0, 1.9fr);
  gap: clamp(34px, 5vw, 72px);
  align-items: start;
}

.latest-release h2,
.artist-section-heading h2 {
  margin: 0;
  color: #fff;
  font-size: 1.22rem;
  font-weight: 720;
  line-height: 1.2;
  letter-spacing: -0.025em;
}

.latest-release h2 {
  margin-bottom: 18px;
}

.latest-release-card {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(124px, 168px) minmax(0, 1fr);
  align-items: end;
  gap: 18px;
  color: inherit;
  text-align: left;
}

.latest-release-cover {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 15px 32px rgba(0, 0, 0, 0.16), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.latest-release-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.latest-release-card:hover .latest-release-cover img {
  transform: scale(1.025);
}

.latest-release-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding-bottom: 5px;
}

.latest-release-copy strong {
  overflow: hidden;
  margin: 5px 0 2px;
  font-size: 1rem;
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.latest-release-copy span {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.77rem;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artist-section-heading {
  display: flex;
  min-height: 40px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.artist-section-heading p {
  margin: 5px 0 0;
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.76rem;
}

.artist-section-heading--ranking {
  align-items: center;
}

.artist-heading-link {
  display: flex;
  align-items: center;
  gap: 3px;
  color: inherit;
  text-align: left;
}

.artist-heading-link svg {
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.56);
  transition: transform 160ms ease, color 160ms ease;
}

button.artist-heading-link:hover svg {
  color: rgba(255, 255, 255, 0.9);
  transform: translateX(2px);
}

.section-paging {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 7px;
}

.section-paging > span {
  margin-right: 3px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.69rem;
  font-variant-numeric: tabular-nums;
}

.section-paging button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.09);
  transition: background-color 160ms ease, opacity 160ms ease, transform 160ms ease;
}

.section-paging button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.16);
  transform: scale(1.04);
}

.section-paging button:disabled {
  opacity: 0.28;
}

.section-paging svg {
  width: 16px;
  height: 16px;
}

.ranking-grid {
  display: grid;
  min-height: 232px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 22px;
}

.ranking-song {
  display: flex;
  min-width: 0;
  height: 58px;
  align-items: center;
  gap: 11px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.095);
  color: inherit;
  text-align: left;
  transition: background-color 180ms ease;
}

.ranking-song:hover {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.07), transparent 92%);
}

.ranking-song-cover {
  position: relative;
  display: block;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  overflow: hidden;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.08);
}

.ranking-song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ranking-song-play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.36);
  opacity: 0;
  transition: opacity 160ms ease;
}

.ranking-song:hover .ranking-song-play {
  opacity: 1;
}

.ranking-song-play svg {
  width: 20px;
  height: 20px;
}

.ranking-song-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.ranking-song-copy strong,
.album-card strong,
.mv-card strong {
  overflow: hidden;
  font-size: 0.82rem;
  font-weight: 640;
  line-height: 1.38;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-song-copy > span,
.album-card > span:last-child,
.mv-card > span:last-child {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.7rem;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-song-more {
  margin-left: 4px;
  padding: 0 8px;
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.artist-library-section {
  margin-top: 58px;
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 30px 18px;
}

.album-card,
.mv-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  color: inherit;
  text-align: left;
}

.album-card-cover,
.mv-card-cover {
  position: relative;
  display: block;
  overflow: hidden;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.075);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.13), inset 0 0 0 1px rgba(255, 255, 255, 0.075);
}

.album-card-cover {
  aspect-ratio: 1;
  border-radius: 10px;
}

.album-card-cover img,
.mv-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1), filter 220ms ease;
}

.album-card:hover img,
.mv-card:hover img {
  transform: scale(1.035);
  filter: brightness(0.84);
}

.album-card-play,
.mv-card-play {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 50%;
  color: rgb(var(--artist-deep-rgb));
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.24);
  opacity: 0;
  transform: translateY(5px) scale(0.92);
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.album-card:hover .album-card-play,
.mv-card:hover .mv-card-play {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.album-card-play svg,
.mv-card-play svg {
  width: 20px;
  height: 20px;
  margin-left: 1px;
}

.album-card > span:last-child,
.mv-card > span:last-child {
  margin-top: 2px;
}

.artist-inline-loading {
  margin: 18px 0 0;
  color: rgba(255, 255, 255, 0.46);
  font-size: 0.72rem;
}

.mv-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.mv-card-cover {
  aspect-ratio: 16 / 9;
  border-radius: 11px;
}

.artist-about {
  scroll-margin-top: 30px;
  margin-top: 64px;
  padding-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.11);
}

.artist-about h2 {
  margin: 0 0 16px;
  font-size: 1.35rem;
  font-weight: 720;
  letter-spacing: -0.025em;
}

.artist-about p {
  max-width: 920px;
  margin: 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.88rem;
  line-height: 1.85;
  white-space: pre-line;
}

@keyframes artist-shimmer {
  to { background-position: -220% 0; }
}

.song-page-enter-active,
.song-page-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.song-page-enter-from,
.song-page-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (max-width: 1120px) {
  .artist-overview {
    grid-template-columns: 1fr;
  }

  .latest-release-card {
    max-width: 430px;
  }

  .album-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .artist-hero-back {
    top: 14px;
    left: 14px;
  }

  .artist-hero,
  .artist-hero--video,
  .artist-hero-content,
  .artist-hero--video .artist-hero-content {
    min-height: 440px;
  }

  .artist-hero-content,
  .artist-hero--video .artist-hero-content {
    padding: 64px 20px 46px;
  }

  .artist-portrait {
    width: 144px;
    margin-bottom: 24px;
  }

  .artist-hero-content h1 {
    font-size: clamp(2.25rem, 11vw, 3.2rem);
  }

  .artist-content {
    padding: 20px 20px 80px;
  }

  .latest-release-card {
    grid-template-columns: 126px minmax(0, 1fr);
  }

  .artist-section-heading--ranking {
    align-items: flex-start;
  }

  .ranking-grid {
    grid-template-columns: 1fr;
  }

  .album-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px 14px;
  }

  .mv-grid {
    grid-template-columns: 1fr;
  }

  .artist-library-section {
    margin-top: 46px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .artist-page,
  .artist-hero-video,
  .artist-hero-video-mask,
  .latest-release-cover img,
  .album-card-cover img,
  .mv-card-cover img,
  .album-card-play,
  .mv-card-play,
  .song-page-enter-active,
  .song-page-leave-active {
    transition: none;
  }

  .artist-loading-line {
    animation: none;
  }
}
</style>
