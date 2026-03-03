<template>
  <div class="min-h-full overflow-y-auto text-[#161616]" :style="pageStyle">
    <section class="relative overflow-hidden px-4 pb-8 pt-4 text-white sm:px-8 sm:pb-10" :style="heroStyle">
      <div class="mx-auto flex max-w-7xl justify-end">
        <button
          class="rounded-full border border-white/35 bg-white/10 px-4 py-1.5 text-sm backdrop-blur transition hover:bg-white/20"
          type="button"
          @click="goBack"
        >
          完成
        </button>
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
              <p class="text-xs uppercase tracking-[0.18em] text-stone-500">热门歌曲</p>
              <span class="text-xs text-stone-500">Top 10</span>
            </div>
            <div class="space-y-1.5">
              <button
                v-for="(song, index) in topSongs"
                :key="song.id"
                class="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 text-left transition hover:border-stone-300 hover:bg-stone-50"
                type="button"
                @click="openSong(song)"
              >
                <span class="w-6 shrink-0 text-xs text-stone-500">{{ index + 1 }}</span>
                <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ song.name }}</span>
                <span class="text-xs text-stone-500">{{ formatDuration(song.dt) }}</span>
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
            <article v-for="mv in mvs.slice(0, 5)" :key="mv.id" class="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p class="line-clamp-2 text-sm font-semibold">{{ mv.name }}</p>
              <p class="mt-1 text-xs text-stone-500">播放 {{ (mv.playCount || 0).toLocaleString() }}</p>
              <button
                class="mt-3 rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700 transition hover:bg-stone-100"
                type="button"
                @click="openMv(mv)"
              >
                打开 MV
              </button>
            </article>
          </div>
        </section>

        <section class="mb-6 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-bold">全部专辑</h2>
            <span class="text-xs uppercase tracking-[0.18em] text-stone-500">Discography</span>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <button
              v-for="album in albums"
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
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {artistApi} from '@/api/artistApi/artistApi.js'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const artistId = ref(null)
const artistName = ref('')
const artistProfile = ref(null)
const heroMedia = ref('')

const hotSongs = ref([])
const albums = ref([])
const mvs = ref([])
const themeRgb = ref('56, 64, 82')
const animatedThemeRgb = ref(themeRgb.value)
let themeRaf = 0

const topSongs = computed(() => hotSongs.value.slice(0, 10))
const latestAlbum = computed(() => albums.value[0] || null)
const featuredAlbums = computed(() => albums.value.slice(0, 6))
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

function getSongDetailPath() {
  if (route.path.startsWith('/home/')) return '/home/songDetail'
  if (route.path.startsWith('/profile/')) return '/profile/songDetail'
  return '/songDetail'
}

function openSong(song) {
  router.push({
    path: getSongDetailPath(),
    query: {id: song.id},
  })
}

function openAlbum(album) {
  if (!album?.id) return
  window.open(`https://music.163.com/#/album?id=${album.id}`, '_blank', 'noopener,noreferrer')
}

function openMv(mv) {
  if (!mv?.id) return
  window.open(`https://music.163.com/#/mv?id=${mv.id}`, '_blank', 'noopener,noreferrer')
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
  albums.value = []
  mvs.value = []
  artistProfile.value = null

  await ensureArtistId()

  if (!artistId.value) {
    error.value = '未找到该歌手信息'
    loading.value = false
    return
  }

  try {
    const [infoRes, hotRes, albumRes, mvRes, heroRes] = await Promise.allSettled([
      artistApi.getArtistInfo(artistId.value),
      artistApi.getArtistHotSongs(artistId.value),
      artistApi.getArtistAlbum(artistId.value, 0),
      artistApi.getArtistMv(artistId.value, 0),
      artistApi.getArtistVideo(route.query.name || artistName.value),
    ])

    if (infoRes.status === 'fulfilled') {
      artistProfile.value = infoRes.value?.data?.data?.artist || null
      artistName.value = artistProfile.value?.name || artistName.value || String(route.query.name || '')
    }

    if (hotRes.status === 'fulfilled') {
      hotSongs.value = hotRes.value?.data?.songs || []
    }

    if (albumRes.status === 'fulfilled') {
      albums.value = albumRes.value?.data?.hotAlbums || []
    }

    if (mvRes.status === 'fulfilled') {
      mvs.value = mvRes.value?.data?.mvs || []
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

onMounted(() => {
  loadArtistPage()
})

onBeforeUnmount(() => {
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
</script>
