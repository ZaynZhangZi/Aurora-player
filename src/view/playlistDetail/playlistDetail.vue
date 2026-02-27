<template>
  <div class="relative min-h-screen w-full overflow-y-auto text-white transition-colors duration-500" :style="pageStyle">
    <button
      class="absolute right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full border border-white/35 bg-black/20 text-white backdrop-blur-md transition hover:bg-black/35"
      type="button"
      @click="goBack"
    >
      <XMarkIcon class="h-5 w-5" />
    </button>

    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div class="mb-8 grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-5 sm:grid-cols-[220px_1fr]">
        <div class="aspect-square overflow-hidden rounded-2xl bg-white/10">
          <img v-if="playlist.coverImgUrl" :src="playlist.coverImgUrl" alt="playlist-cover" class="h-full w-full object-cover" />
        </div>

        <div class="min-w-0">
          <p class="mb-2 text-xs uppercase tracking-[0.2em] text-white/60">Playlist</p>
          <h2 class="truncate text-3xl font-black">{{ playlist.name || '歌单详情' }}</h2>
          <p class="mt-2 text-sm text-white/70">
            {{ playlist.creatorName ? `by ${playlist.creatorName}` : '来自网易云音乐' }}
          </p>

          <div class="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/70">
            <span class="rounded-full border border-white/20 px-3 py-1">{{ playlist.trackCount || tracks.length }} 首歌曲</span>
            <span class="rounded-full border border-white/20 px-3 py-1">播放 {{ formatCount(playlist.playCount) }}</span>
            <span class="rounded-full border border-white/20 px-3 py-1">收藏 {{ formatCount(playlist.subscribedCount) }}</span>
          </div>

          <p v-if="playlist.description" class="mt-4 line-clamp-3 text-sm leading-relaxed text-white/80">
            {{ playlist.description }}
          </p>

        </div>
      </div>

      <p v-if="loading" class="text-sm text-white/60">正在加载歌单...</p>
      <p v-else-if="error" class="text-sm text-red-300">{{ error }}</p>

      <section v-else class="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-lg font-semibold">歌曲列表</h3>
          <span class="text-xs text-white/60">共 {{ tracks.length }} 首</span>
        </div>

        <TransitionGroup name="track-item" tag="div" class="space-y-2" appear>
          <button
            v-for="(track, index) in tracks"
            :key="track.id"
            :style="getTrackItemStyle(index)"
            class="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-left transition hover:bg-black/40"
            type="button"
            @click="openSong(track)"
          >
            <span class="mr-3 w-7 shrink-0 text-xs text-white/60">{{ index + 1 }}</span>
            <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ track.name }}</span>
            <span class="ml-4 truncate text-xs text-white/60">{{ getArtistName(track) }}</span>
            <span class="ml-4 w-12 shrink-0 text-right text-xs text-white/50">{{ formatDuration(track.dt) }}</span>
          </button>
        </TransitionGroup>
      </section>
    </div>
  </div>
</template>

<script setup>
import {computed, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {XMarkIcon} from '@heroicons/vue/24/outline'
import {playListsApi} from '@/api/playListsApi/playListsApi.js'

const route = useRoute()
const router = useRouter()

const playlist = ref({
  name: '',
  coverImgUrl: '',
  creatorName: '',
  description: '',
  trackCount: 0,
  playCount: 0,
  subscribedCount: 0,
})
const tracks = ref([])
const loading = ref(true)
const error = ref('')
const themeRgb = ref('92, 107, 192')

const pageStyle = computed(() => ({
  background: buildPageGradient(themeRgb.value),
}))

function parseRgb(rgbString) {
  const parts = String(rgbString)
    .split(',')
    .map(v => Number(v.trim()))
  return [
    Number.isFinite(parts[0]) ? parts[0] : 92,
    Number.isFinite(parts[1]) ? parts[1] : 107,
    Number.isFinite(parts[2]) ? parts[2] : 192,
  ]
}

function buildPageGradient(rgbString) {
  const [r, g, b] = parseRgb(rgbString)

  const deepR = Math.max(34, Math.round(r * 0.44))
  const deepG = Math.max(40, Math.round(g * 0.42))
  const deepB = Math.max(64, Math.round(b * 0.52))

  const midR = Math.max(54, Math.round((r + deepR) / 2))
  const midG = Math.max(62, Math.round((g + deepG) / 2))
  const midB = Math.max(90, Math.round((b + deepB) / 2))

  return `linear-gradient(180deg, rgba(${r},${g},${b},0.44) 0%, rgba(${midR},${midG},${midB},0.92) 42%, rgba(${deepR},${deepG},${deepB},1) 100%)`
}

function getArtistName(track) {
  return track?.ar?.[0]?.name || track?.artists?.[0]?.name || '未知歌手'
}

function formatDuration(durationMs) {
  const total = Math.floor((durationMs || 0) / 1000)
  const minute = Math.floor(total / 60)
  const second = String(total % 60).padStart(2, '0')
  return `${minute}:${second}`
}

function formatCount(value) {
  const num = Number(value || 0)
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}亿`
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return String(num)
}

function goBack() {
  router.back()
}

function openSong(track) {
  let songPath = '/songDetail'
  if (route.path.startsWith('/home/')) songPath = '/home/songDetail'
  if (route.path.startsWith('/profile/')) songPath = '/profile/songDetail'
  router.push({
    path: songPath,
    query: {
      id: track.id,
    },
  })
}

function getTrackItemStyle(index) {
  const delay = Math.min(index, 24) * 22
  return {
    '--item-delay': `${delay}ms`,
  }
}

async function fetchAllPlaylistSongs(playlistId, expectedTotal = 0) {
  const pageSize = 500
  let offset = 0
  const merged = []

  while (true) {
    const res = await playListsApi.getPlayListSongs(playlistId, pageSize, offset)
    const chunk = res?.data?.songs || []
    if (!chunk.length) break

    merged.push(...chunk)

    if (chunk.length < pageSize) break
    if (expectedTotal > 0 && merged.length >= expectedTotal) break

    offset += pageSize
  }

  const map = new Map()
  merged.forEach(song => {
    if (song?.id && !map.has(song.id)) {
      map.set(song.id, song)
    }
  })

  return Array.from(map.values())
}

function colorFromString(seed) {
  const text = String(seed || 'playlist')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
  }
  const r = 80 + (Math.abs(hash) % 120)
  const g = 70 + (Math.abs(hash >> 8) % 110)
  const b = 90 + (Math.abs(hash >> 16) % 120)
  return `${r}, ${g}, ${b}`
}

async function pickThemeColor(coverUrl, seedName) {
  if (!coverUrl) {
    themeRgb.value = colorFromString(seedName)
    return
  }

  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'

    const loaded = await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = coverUrl
    })
    void loaded

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', {willReadFrequently: true})
    if (!ctx) throw new Error('canvas context unavailable')

    const sampleSize = 48
    canvas.width = sampleSize
    canvas.height = sampleSize
    ctx.drawImage(img, 0, 0, sampleSize, sampleSize)

    const {data} = ctx.getImageData(0, 0, sampleSize, sampleSize)
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

    if (!count) throw new Error('no sampled pixels')

    const rr = Math.min(220, Math.round(r / count))
    const gg = Math.min(220, Math.round(g / count))
    const bb = Math.min(220, Math.round(b / count))

    themeRgb.value = `${rr}, ${gg}, ${bb}`
  } catch (_error) {
    themeRgb.value = colorFromString(seedName)
  }
}

async function loadPlaylist() {
  loading.value = true
  error.value = ''
  tracks.value = []

  const id = route.query.id
  if (!id) {
    error.value = '缺少歌单 id'
    loading.value = false
    return
  }

  try {
    const detailRes = await playListsApi.getPlayListDetail(id)
    const detailPlaylist = detailRes?.data?.playlist || {}

    playlist.value = {
      name: detailPlaylist.name || '',
      coverImgUrl: detailPlaylist.coverImgUrl || '',
      creatorName: detailPlaylist.creator?.nickname || '',
      description: detailPlaylist.description || '',
      trackCount: detailPlaylist.trackCount || 0,
      playCount: detailPlaylist.playCount || 0,
      subscribedCount: detailPlaylist.subscribedCount || 0,
    }

    await pickThemeColor(playlist.value.coverImgUrl, playlist.value.name)

    tracks.value = detailPlaylist.tracks || []

    const allSongs = await fetchAllPlaylistSongs(id, detailPlaylist.trackCount || 0)
    if (allSongs.length) {
      tracks.value = allSongs
    }
  } catch (err) {
    error.value = err?.message || '歌单加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPlaylist()
})

watch(
  () => route.query.id,
  () => {
    loadPlaylist()
  },
)
</script>

<style scoped>
.track-item-enter-active {
  transition: opacity 260ms ease, transform 260ms ease, filter 260ms ease;
  transition-delay: var(--item-delay, 0ms);
}

.track-item-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.track-item-enter-from,
.track-item-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.99);
  filter: blur(5px);
}

.track-item-move {
  transition: transform 220ms ease;
}
</style>
