<template>
  <div class="min-h-full overflow-y-auto text-[#161616]" :style="pageStyle">
    <section class="relative overflow-hidden px-4 pb-8 pt-4 text-white sm:px-8 sm:pb-10" :style="heroStyle">
      <div class="mx-auto flex max-w-7xl justify-end">

      </div>

      <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div class="h-32 w-32 overflow-hidden rounded-full border border-white/30 bg-white/10 shadow-xl sm:h-52 sm:w-52">
          <img
            :src="artistAvatar"
            alt="artist-avatar"
            class="h-full w-full object-cover"
            @error="onAvatarError"
          />
        </div>
      </div>

      <div class="relative z-20 mx-auto mt-8 flex max-w-7xl min-h-[340px] flex-col pb-2 sm:min-h-[520px]">
        <h1 class="mt-auto text-left text-3xl font-black tracking-tight sm:text-5xl">{{ artistName || '歌手详情' }}</h1>
      </div>
    </section>

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <p v-if="loading" class="text-sm text-stone-500">正在加载歌手信息...</p>
      <p v-else-if="error" class="text-sm text-red-500">{{ error }}</p>

      <template v-else>
        <section class="mb-6 grid gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm lg:grid-cols-[280px_1fr]">
          <article class="rounded-2xl bg-stone-50 p-4">
            <p class="text-xs uppercase tracking-[0.18em] text-stone-500">最新发布</p>
            <div class="mt-3 overflow-hidden rounded-xl bg-stone-200">
              <img
                :src="latestAlbum?.picUrl || artistAvatar"
                alt="latest-album"
                class="aspect-square w-full object-cover"
                @error="onBlockImageError"
              />
            </div>
            <p class="mt-3 truncate text-sm font-semibold">{{ latestAlbum?.name || '暂无专辑信息' }}</p>
            <p class="mt-1 text-xs text-stone-500">{{ latestAlbum ? formatDate(latestAlbum.publishTime) : '-' }}</p>
          </article>

          <article class="rounded-2xl bg-stone-50 p-4">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-xs uppercase tracking-[0.18em] text-stone-500">歌曲</p>
              <span class="text-xs text-stone-500">{{ songSectionLabel }}</span>
            </div>
            <div class="mb-3 flex items-center gap-2">
              <button
                class="rounded-full border px-3 py-1 text-xs font-medium transition"
                :class="songViewMode === 'top50' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'"
                type="button"
                @click="switchSongViewMode('top50')"
              >
                前50首
              </button>
              <button
                class="rounded-full border px-3 py-1 text-xs font-medium transition"
                :class="songViewMode === 'all' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'"
                type="button"
                @click="switchSongViewMode('all')"
              >
                全部歌曲
              </button>
            </div>
            <Transition name="song-page" mode="out-in">
              <div :key="`${songViewMode}-${currentSongPage}`" class="space-y-1.5" :style="songListStyle">
                <button
                  v-for="(song, index) in visibleSongs"
                  :key="song.id"
                  class="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 text-left transition hover:border-stone-300 hover:bg-stone-50"
                  type="button"
                  @click="openSong(song, getSongQueueIndex(index), getSongQueue())"
                >
                  <span class="w-6 shrink-0 text-xs text-stone-500">{{ getSongDisplayIndex(index) }}</span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium">{{ song.name }}</span>
                    <span class="block truncate text-xs text-stone-500">{{ getSongMeta(song) }}</span>
                  </span>
                  <span class="text-xs text-stone-500">{{ formatDuration(song.dt) }}</span>
                </button>
              </div>
            </Transition>
            <p v-if="songViewMode === 'all' && songLoadingMore" class="mt-2 text-right text-xs text-stone-500">正在加载更多歌曲...</p>
            <div class="mt-3 flex items-center justify-end gap-2 text-xs text-stone-600">
              <button
                class="rounded-full border border-stone-300 px-3 py-1 transition hover:bg-stone-100 disabled:opacity-40"
                type="button"
                :disabled="currentSongPage <= 1"
                @click="prevSongPage"
              >
                上一页
              </button>
              <span v-if="songViewMode === 'all'">第 {{ currentSongPage }} 页</span>
              <span v-else>第 {{ currentSongPage }} / {{ currentSongLoadedPages }} 页</span>
              <div v-if="songViewMode === 'all'" class="flex items-center gap-1">
                <input
                  v-model.trim="allSongJumpInput"
                  type="number"
                  min="1"
                  inputmode="numeric"
                  class="w-16 rounded-full border border-stone-300 bg-white px-2 py-1 text-center text-xs text-stone-700 outline-none transition focus:border-stone-500"
                  placeholder="页码"
                  @keyup.enter="jumpToAllSongPage"
                />
                <button
                  class="rounded-full border border-stone-300 px-2.5 py-1 transition hover:bg-stone-100 disabled:opacity-40"
                  type="button"
                  :disabled="allSongJumping"
                  @click="jumpToAllSongPage"
                >
                  跳转
                </button>
              </div>
              <button
                class="rounded-full border border-stone-300 px-3 py-1 transition hover:bg-stone-100 disabled:opacity-40"
                type="button"
                :disabled="!canNextSongPage"
                @click="nextSongPage"
              >
                下一页
              </button>
            </div>
          </article>
        </section>

        <section class="mb-6 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-bold">代表专辑</h2>
            <span class="text-xs uppercase tracking-[0.18em] text-stone-500">Albums</span>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <button
              v-for="album in featuredAlbums"
              :key="album.id"
              class="group text-left"
              type="button"
              @click="openAlbum(album)"
            >
              <div class="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                <img
                  :src="album.picUrl"
                  :alt="album.name"
                  class="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                  @error="onBlockImageError"
                />
              </div>
              <p class="mt-2 truncate text-sm font-medium">{{ album.name }}</p>
              <p class="text-xs text-stone-500">{{ formatDate(album.publishTime) }}</p>
            </button>
          </div>
        </section>

        <section class="mb-6 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-bold">音乐视频</h2>
            <span class="text-xs uppercase tracking-[0.18em] text-stone-500">Videos</span>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <article v-for="mv in pagedMvs" :key="mv.id" class="flex h-full flex-col rounded-xl border border-stone-200 bg-stone-50 p-3">
              <div class="overflow-hidden rounded-lg bg-stone-200">
                <img
                  :src="getMvCover(mv)"
                  :alt="mv.name"
                  class="aspect-video w-full object-cover transition duration-300 hover:scale-105"
                  @error="onBlockImageError"
                />
              </div>
              <p class="mt-2 line-clamp-1 text-sm font-semibold" :title="mv.name">{{ mv.name }}</p>
              <p class="mt-1 text-xs text-stone-500">播放 {{ (mv.playCount || 0).toLocaleString() }}</p>
              <button
                class="mt-auto self-start rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700 transition hover:bg-stone-100"
                type="button"
                @click="openMv(mv)"
              >
                播放 MV
              </button>
            </article>
          </div>
          <div v-if="mvs.length" class="mt-4 flex items-center justify-end gap-2 text-xs text-stone-600">
            <button
              class="rounded-full border border-stone-300 px-3 py-1 transition hover:bg-stone-100 disabled:opacity-40"
              type="button"
              :disabled="mvPage <= 1"
              @click="prevMvPage"
            >
              上一页
            </button>
            <span>第 {{ mvPage }} 页</span>
            <button
              class="rounded-full border border-stone-300 px-3 py-1 transition hover:bg-stone-100 disabled:opacity-40"
              type="button"
              :disabled="mvPage >= mvLoadedPages && !mvHasMore"
              @click="nextMvPage"
            >
              下一页
            </button>
          </div>
        </section>

        <section class="mb-6 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-bold">全部专辑</h2>
            <span class="text-xs uppercase tracking-[0.18em] text-stone-500">Discography</span>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <button
              v-for="album in pagedAlbums"
              :key="`all-${album.id}`"
              class="group text-left"
              type="button"
              @click="openAlbum(album)"
            >
              <div class="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                <img
                  :src="album.picUrl"
                  :alt="album.name"
                  class="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                  @error="onBlockImageError"
                />
              </div>
              <p class="mt-2 truncate text-xs font-medium">{{ album.name }}</p>
            </button>
          </div>

          <p v-if="albumLoadingMore" class="mt-3 text-right text-xs text-stone-500">正在加载更多专辑...</p>
          <div class="mt-4 flex items-center justify-end gap-2 text-xs text-stone-600">
            <button
              class="rounded-full border border-stone-300 px-3 py-1 transition hover:bg-stone-100 disabled:opacity-40"
              type="button"
              :disabled="albumPage <= 1"
              @click="prevAlbumPage"
            >
              上一页
            </button>
            <span>第 {{ albumPage }} 页</span>
            <div class="flex items-center gap-1">
              <input
                v-model.trim="albumJumpInput"
                type="number"
                min="1"
                inputmode="numeric"
                class="w-16 rounded-full border border-stone-300 bg-white px-2 py-1 text-center text-xs text-stone-700 outline-none transition focus:border-stone-500"
                placeholder="页码"
                @keyup.enter="jumpToAlbumPage"
              />
              <button
                class="rounded-full border border-stone-300 px-2.5 py-1 transition hover:bg-stone-100 disabled:opacity-40"
                type="button"
                :disabled="albumJumping"
                @click="jumpToAlbumPage"
              >
                跳转
              </button>
            </div>
            <button
              class="rounded-full border border-stone-300 px-3 py-1 transition hover:bg-stone-100 disabled:opacity-40"
              type="button"
              :disabled="!canNextAlbumPage"
              @click="nextAlbumPage"
            >
              下一页
            </button>
          </div>
        </section>

        <section class="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-bold">艺人简介</h2>
            <span class="text-xs uppercase tracking-[0.18em] text-stone-500">Biography</span>
          </div>
          <p class="whitespace-pre-line text-sm leading-7 text-stone-700">{{ artistDescription }}</p>
        </section>
      </template>
    </main>

    <Teleport to="body">
      <div
        v-if="mvPlayerOpen"
        class="fixed inset-0 z-[1002] bg-black/70 p-4 backdrop-blur-sm"
        @click.self="closeMvPlayer"
      >
        <div class="mx-auto mt-[8vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-2xl">
          <div class="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3 text-white">
            <p class="truncate text-sm font-medium">{{ currentMv?.name || 'MV 播放' }}</p>
            <div class="flex items-center gap-2">
              <select
                v-if="mvResolutions.length"
                v-model="selectedMvResolution"
                class="rounded-full border border-white/30 bg-black/45 px-2 py-1 text-xs text-white"
                @change="changeMvResolution"
              >
                <option v-for="r in mvResolutions" :key="r" :value="r">{{ r }}P</option>
              </select>
              <button
                class="rounded-full border border-white/30 px-3 py-1 text-xs transition hover:bg-white/10"
                type="button"
                @click="closeMvPlayer"
              >
                关闭
              </button>
            </div>
          </div>

          <div class="aspect-video w-full bg-black">
            <div v-if="mvPlayerLoading" class="grid h-full place-items-center text-sm text-white/70">MV 加载中...</div>
            <div v-else-if="mvPlayerError" class="grid h-full place-items-center px-6 text-center text-sm text-red-300">{{ mvPlayerError }}</div>
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
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {artistApi} from '@/api/artistApi/artistApi.js'
import {usePlayerStore} from '@/stores/playerStore.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()

const loading = ref(true)
const error = ref('')
const artistId = ref(null)
const artistName = ref('')
const artistProfile = ref(null)
const heroMedia = ref('')

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
let themeRaf = 0

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
  return artistProfile.value?.avatar || artistProfile.value?.picUrl || heroMedia.value
})

const pageStyle = computed(() => {
  const [r, g, b] = parseRgb(animatedThemeRgb.value)
  const softR = Math.min(245, Math.round((r + 242) / 2))
  const softG = Math.min(245, Math.round((g + 242) / 2))
  const softB = Math.min(245, Math.round((b + 242) / 2))
  return {
    background: `linear-gradient(180deg, rgba(${r},${g},${b},0.18) 0%, rgba(${softR},${softG},${softB},0.95) 280px, rgba(244,244,246,1) 620px)`,
  }
})

const heroStyle = computed(() => {
  const [r, g, b] = parseRgb(animatedThemeRgb.value)
  return {
    background: `linear-gradient(135deg, rgba(${r},${g},${b},0.86) 0%, rgba(${Math.max(14, Math.round(r * 0.42))},${Math.max(18, Math.round(g * 0.42))},${Math.max(22, Math.round(b * 0.46))},0.98) 100%)`,
  }
})

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
  router.back()
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

function getSongMeta(song) {
  const artists = (song?.ar || song?.artists || [])
    .map(item => String(item?.name || '').trim())
    .filter(Boolean)
    .join(' / ')
  const album = String(song?.al?.name || song?.album?.name || '').trim()
  if (artists && album) return `${artists} · ${album}`
  return artists || album || '未知歌手 · 未知专辑'
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

  await ensureArtistId()

  if (!artistId.value) {
    error.value = '未找到该歌手信息'
    loading.value = false
    return
  }

  try {
    const [infoRes, hotRes, allSongsRes, albumRes, mvRes, heroRes] = await Promise.allSettled([
      artistApi.getArtistInfo(artistId.value),
      artistApi.getArtistHotSongs(artistId.value),
      artistApi.getArtistAllSongs(artistId.value, {limit: songRequestLimit, offset: 0}),
      artistApi.getArtistAlbum(artistId.value, {limit: albumRequestLimit, offset: 0}),
      artistApi.getArtistMv(artistId.value, {limit: mvPageSize * 2, offset: 0}),
      artistApi.getArtistVideo(route.query.name || artistName.value),
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

    if (heroRes.status === 'fulfilled') {
      heroMedia.value = heroRes.value?.videoUrl || heroMedia.value
    }

    await pickThemeFromImage(
      artistProfile.value?.cover || artistProfile.value?.picUrl || heroMedia.value,
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

onMounted(() => {
  loadArtistPage()
})

onBeforeUnmount(() => {
  closeMvPlayer()
  if (themeRaf) {
    cancelAnimationFrame(themeRaf)
    themeRaf = 0
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
