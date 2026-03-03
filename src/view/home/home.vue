<template>
  <div class="min-h-screen bg-stone-50 text-stone-900">
    <section class="relative h-[56vh] min-h-[360px] overflow-hidden sm:h-[84vh]">
      <SmartMedia
        class="absolute inset-0 h-full w-full"
        :src="hero.media"
        :title="hero.title"
        :content="hero.subtitle"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/40" />
      <div class="relative mx-auto flex h-full max-w-7xl items-end px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8">
        <div class="max-w-2xl rounded-2xl border border-white/30 bg-black/20 px-5 py-4 text-white backdrop-blur-md sm:px-6 sm:py-5">
          <p class="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/80 sm:text-xs">My Music Demo</p>
          <h1 class="text-3xl font-black leading-[1.1] sm:max-w-[12ch] sm:text-5xl">今天听点什么</h1>
          <p class="mt-3 max-w-[34ch] text-sm leading-relaxed text-white/90 sm:text-base">从网友精选碟开始，接着切到新歌与热门歌手，30 秒帮你进入听歌状态。</p>
        </div>
      </div>
    </section>

    <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section class="mb-10">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">推荐歌单</h2>
        </div>
        <p v-if="loading.recommend" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.recommend" class="text-sm text-red-500">{{ errors.recommend }}</p>
        <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <article
            v-for="item in recommendPlaylists"
            :key="item.id"
            class="group cursor-pointer"
            @click="openPlaylist(item)"
          >
            <div class="relative aspect-square overflow-hidden rounded-2xl bg-stone-200">
              <SmartMedia :src="item.picUrl" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <p class="mt-2 truncate text-sm font-medium">{{ item.name }}</p>
          </article>
        </div>
      </section>

      <section class="mb-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">网友精选碟</h2>
          <span class="text-xs uppercase tracking-[0.2em] text-stone-400">Top Playlist</span>
        </div>
        <div class="mb-4 flex flex-wrap gap-2">
          <button
            v-for="tag in playlistTags"
            :key="tag"
            :class="activePlaylistTag === tag ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'"
            class="rounded-full border px-3 py-1 text-xs font-medium transition"
            type="button"
            @click="changePlaylistTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
        <p v-if="loading.top" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.top" class="text-sm text-red-500">{{ errors.top }}</p>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in topPlaylists"
            :key="item.id"
            class="group flex cursor-pointer gap-3 rounded-2xl border border-stone-100 p-3 transition hover:border-stone-300 hover:bg-stone-50"
            @click="openPlaylist(item)"
          >
            <div class="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-200">
              <SmartMedia :src="item.coverImgUrl" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ item.name }}</p>
              <p class="mt-1 line-clamp-2 text-xs text-stone-500">{{ item.copywriter || item.description || '精选音乐集合' }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="mb-10">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">推荐新音乐</h2>
        </div>
        <p v-if="loading.songs" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.songs" class="text-sm text-red-500">{{ errors.songs }}</p>
        <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="song in newSongs"
            :key="song.id"
            class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left transition hover:border-stone-400"
            type="button"
            @click="openSong(song)"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ song.name }}</p>
              <ArtistLinks
                :artists="getSongArtists(song)"
                container-class="text-xs text-stone-500"
                link-class="hover:text-stone-800 hover:underline"
                separator-class="text-stone-400"
                fallback-class="text-stone-500"
              />
            </div>
            <span class="ml-4 text-xs text-stone-400">播放</span>
          </button>
        </div>
      </section>

      <section class="mb-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">热门榜单</h2>
          <span class="text-xs uppercase tracking-[0.2em] text-stone-400">Top Charts</span>
        </div>
        <p v-if="loading.rank" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.rank" class="text-sm text-red-500">{{ errors.rank }}</p>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="rank in topRanks"
            :key="rank.id"
            class="group cursor-pointer overflow-hidden rounded-2xl border border-stone-100 bg-stone-50"
            @click="openPlaylist(rank)"
          >
            <div class="flex gap-3 p-3">
              <div class="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                <SmartMedia :src="rank.coverImgUrl" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold">{{ rank.name }}</p>
                <p class="mt-1 text-xs text-stone-500">{{ rank.updateFrequency || '实时更新' }}</p>
                <div class="mt-2 space-y-1">
                  <p
                    v-for="(item, idx) in rank.tracks || []"
                    :key="`${rank.id}-${idx}`"
                    class="truncate text-xs text-stone-600"
                  >
                    {{ idx + 1 }}. {{ item.first }} - {{ item.second }}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="mb-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">精选播客</h2>
          <span class="text-xs uppercase tracking-[0.2em] text-stone-400">Podcast</span>
        </div>
        <p v-if="loading.podcast" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.podcast" class="text-sm text-red-500">{{ errors.podcast }}</p>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in podcastPrograms"
            :key="item.id"
            class="group cursor-pointer overflow-hidden rounded-2xl border border-stone-100 bg-stone-50"
            @click="openPodcast(item)"
          >
            <div class="aspect-[16/10] overflow-hidden bg-stone-200">
              <SmartMedia :src="item.picUrl" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <div class="p-3">
              <p class="line-clamp-2 text-sm font-semibold">{{ item.name }}</p>
              <p class="mt-1 truncate text-xs text-stone-500">{{ item.program?.radio?.name || item.program?.dj?.nickname || '电台节目' }}</p>
              <p class="mt-1 text-xs text-stone-500">{{ formatPodcastDuration(item.program?.duration) }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="mb-10">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">热门歌手</h2>
        </div>
        <p v-if="loading.artist" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.artist" class="text-sm text-red-500">{{ errors.artist }}</p>
        <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <article
            v-for="artist in hotArtists"
            :key="artist.id"
            class="group cursor-pointer text-center"
            @click="openArtist(artist)"
          >
            <div class="mx-auto aspect-square w-full max-w-[170px] overflow-hidden rounded-full border border-stone-200 bg-stone-200">
              <SmartMedia :src="artist.picUrl" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <p class="mt-2 truncate text-sm font-medium">{{ artist.name }}</p>
          </article>
        </div>
      </section>

      <section class="mb-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">高品质歌单</h2>
          <span class="text-xs uppercase tracking-[0.2em] text-stone-400">High Quality</span>
        </div>
        <p v-if="loading.hq" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.hq" class="text-sm text-red-500">{{ errors.hq }}</p>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article
            v-for="item in highQualityPlaylists"
            :key="item.id"
            class="group cursor-pointer overflow-hidden rounded-2xl border border-stone-100 bg-stone-50"
            @click="openPlaylist(item)"
          >
            <div class="aspect-[4/3] overflow-hidden bg-stone-200">
              <SmartMedia :src="item.coverImgUrl" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <div class="p-3">
              <p class="truncate text-sm font-semibold">{{ item.name }}</p>
              <p class="mt-1 line-clamp-2 text-xs text-stone-500">{{ item.copywriter || item.description || '高品质歌单推荐' }}</p>
            </div>
          </article>
        </div>
      </section>

    </main>

    <ModalRouterView content-width="90vw" content-height="90vh" />
  </div>
</template>

<script setup>
import {onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import ModalRouterView from '@/components/modalRouterView/ModalRouterView.vue'
import {playListsApi} from '@/api/playListsApi/playListsApi.js'
import {songsApi} from '@/api/songsApi/songsApi.js'
import {artistApi} from '@/api/artistApi/artistApi.js'
import {playSongById} from '@/utils/globalPlayer.js'

const router = useRouter()

const hero = {
  media: 'https://pic1.imgdb.cn/item/653e20bdc458853aef7b97e7.jpg',
  title: 'Now Playing',
}

const recommendPlaylists = ref([])
const topPlaylists = ref([])
const newSongs = ref([])
const topRanks = ref([])
const podcastPrograms = ref([])
const hotArtists = ref([])
const highQualityPlaylists = ref([])
const playlistTags = ['全部', '华语', '欧美', '流行', '电子']
const activePlaylistTag = ref('全部')

const loading = ref({
  recommend: true,
  top: true,
  songs: true,
  rank: true,
  podcast: true,
  artist: true,
  hq: true,
})

const errors = ref({
  recommend: '',
  top: '',
  songs: '',
  rank: '',
  podcast: '',
  artist: '',
  hq: '',
})

function openArtist(artist) {
  router.push({
    path: '/artistDetial',
    query: {id: artist.id || ''},
  })
}

function openPlaylist(playlist) {
  router.push({
    path: '/home/playlistDetail',
    query: {id: playlist.id},
  })
}

async function openSong(song) {
  await playSongById(song)
}

function getSongArtists(song) {
  return song?.artists || song?.ar || []
}

async function openPodcast(item) {
  const id = item?.program?.mainSong?.id || item?.program?.id || null
  if (!id) return
  await playSongById({
    id,
    name: item?.name || item?.program?.name || '播客节目',
    artists: item?.program?.mainSong?.ar || [],
    cover: item?.picUrl || item?.program?.coverUrl || '',
  })
}

function formatPodcastDuration(durationMs) {
  const total = Math.floor((durationMs || 0) / 1000)
  const minute = Math.floor(total / 60)
  const second = String(total % 60).padStart(2, '0')
  return `${minute}:${second}`
}

async function loadRecommendPlaylists() {
  try {
    const res = await playListsApi.getRecommendPlayList()
    recommendPlaylists.value = res?.data?.result || []
  } catch (error) {
    errors.value.recommend = '推荐歌单加载失败'
  } finally {
    loading.value.recommend = false
  }
}

async function loadTopPlaylists(tag = activePlaylistTag.value) {
  loading.value.top = true
  errors.value.top = ''
  try {
    const res = await playListsApi.getPlayList(tag, 9, 0)
    topPlaylists.value = res?.data?.playlists || []
  } catch (error) {
    errors.value.top = '网友精选碟加载失败'
  } finally {
    loading.value.top = false
  }
}

function changePlaylistTag(tag) {
  if (activePlaylistTag.value === tag) return
  activePlaylistTag.value = tag
  loadTopPlaylists(tag)
}

async function loadNewSongs() {
  try {
    const res = await songsApi.getNewSongs()
    newSongs.value = res?.data?.result || []
  } catch (error) {
    errors.value.songs = '新音乐加载失败'
  } finally {
    loading.value.songs = false
  }
}

async function loadTopRanks() {
  try {
    const res = await songsApi.getTopListDetail()
    const list = res?.data?.list || []
    topRanks.value = list
      .filter(item => item?.id && item?.coverImgUrl)
      .slice(0, 6)
  } catch (error) {
    errors.value.rank = '榜单加载失败'
  } finally {
    loading.value.rank = false
  }
}

async function loadPodcastPrograms() {
  try {
    const res = await songsApi.getPodcastPrograms(6)
    podcastPrograms.value = res?.data?.result || []
  } catch (error) {
    errors.value.podcast = '播客加载失败'
  } finally {
    loading.value.podcast = false
  }
}

async function loadHotArtists() {
  try {
    const res = await artistApi.getHotArtist()
    hotArtists.value = res?.data?.artists || []
  } catch (error) {
    errors.value.artist = '热门歌手加载失败'
  } finally {
    loading.value.artist = false
  }
}

async function loadHighQualityPlaylists() {
  try {
    const res = await songsApi.getHighQualitySongs()
    highQualityPlaylists.value = res?.data?.playlists || []
  } catch (error) {
    errors.value.hq = '高品质歌单加载失败'
  } finally {
    loading.value.hq = false
  }
}

onMounted(() => {
  loadRecommendPlaylists()
  loadTopPlaylists()
  loadNewSongs()
  loadTopRanks()
  loadPodcastPrograms()
  loadHotArtists()
  loadHighQualityPlaylists()
})
</script>
