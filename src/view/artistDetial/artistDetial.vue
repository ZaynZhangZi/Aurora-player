<template>
  <div class="h-full w-full overflow-y-auto bg-stone-950 text-white">
    <section class="relative h-[40vh] min-h-[280px] overflow-hidden">
      <SmartMedia :src="heroMedia" class="absolute inset-0 h-full w-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/75" />

      <div class="relative mx-auto flex h-full max-w-6xl items-end justify-between px-4 pb-6 sm:px-8">
        <div class="max-w-2xl">
          <p class="mb-2 text-xs uppercase tracking-[0.2em] text-white/70">Artist</p>
          <h1 class="text-3xl font-black sm:text-5xl">{{ artistName || '歌手详情' }}</h1>
          <p v-if="artistProfile?.briefDesc" class="mt-3 line-clamp-2 text-sm text-white/80">
            {{ artistProfile.briefDesc }}
          </p>
        </div>

        <button
          class="rounded-full border border-white/35 bg-black/25 px-4 py-1.5 text-sm backdrop-blur hover:bg-black/35"
          type="button"
          @click="goBack"
        >
          关闭
        </button>
      </div>
    </section>

    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <p v-if="loading" class="text-sm text-white/70">正在加载歌手信息...</p>
      <p v-else-if="error" class="text-sm text-red-300">{{ error }}</p>

      <template v-else>
        <section class="mb-8 grid gap-4 sm:grid-cols-3">
          <article class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-xs text-white/60">热门单曲</p>
            <p class="mt-2 text-2xl font-bold">{{ hotSongs.length }}</p>
          </article>
          <article class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-xs text-white/60">专辑</p>
            <p class="mt-2 text-2xl font-bold">{{ albums.length }}</p>
          </article>
          <article class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-xs text-white/60">MV</p>
            <p class="mt-2 text-2xl font-bold">{{ mvs.length }}</p>
          </article>
        </section>

        <section class="mb-8 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-bold">热门歌曲</h2>
          </div>
          <div class="space-y-2">
            <button
              v-for="(song, index) in hotSongs.slice(0, 10)"
              :key="song.id"
              class="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left hover:bg-black/35"
              type="button"
              @click="openSong(song)"
            >
              <span class="mr-3 text-xs text-white/60">{{ index + 1 }}</span>
              <span class="flex-1 truncate text-sm">{{ song.name }}</span>
              <span class="ml-3 text-xs text-white/60">{{ formatDuration(song.dt) }}</span>
            </button>
          </div>
        </section>

        <section class="mb-8 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-bold">专辑</h2>
          </div>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <article v-for="album in albums.slice(0, 8)" :key="album.id" class="rounded-xl border border-white/10 bg-black/20 p-2">
              <div class="aspect-square overflow-hidden rounded-lg bg-white/10">
                <SmartMedia :src="album.picUrl" class="h-full w-full object-cover" />
              </div>
              <p class="mt-2 truncate text-sm font-semibold">{{ album.name }}</p>
              <p class="text-xs text-white/60">{{ formatDate(album.publishTime) }}</p>
            </article>
          </div>
        </section>

        <section class="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-bold">MV</h2>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article v-for="mv in mvs.slice(0, 6)" :key="mv.id" class="rounded-xl border border-white/10 bg-black/20 p-3">
              <p class="truncate text-sm font-semibold">{{ mv.name }}</p>
              <p class="mt-1 text-xs text-white/60">播放量 {{ (mv.playCount || 0).toLocaleString() }}</p>
            </article>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import {onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import {artistApi} from '@/api/artistApi/artistApi.js'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const artistId = ref(null)
const artistName = ref('')
const artistProfile = ref(null)
const heroMedia = ref('https://pic1.imgdb.cn/item/653e20bdc458853aef7b97e7.jpg')

const hotSongs = ref([])
const albums = ref([])
const mvs = ref([])

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

function openSong(song) {
  router.push({
    path: '/home/songDetail',
    query: {id: song.id},
  })
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
  } catch (_error) {
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
  } catch (_error) {
    error.value = '歌手数据加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadArtistPage()
})

watch(
  () => [route.query.id, route.query.name],
  () => {
    loadArtistPage()
  },
)
</script>
