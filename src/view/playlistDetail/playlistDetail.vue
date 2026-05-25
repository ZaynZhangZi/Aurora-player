<template>
  <div
    ref="playlistScrollRootRef"
    class="relative w-full overflow-y-auto text-stone-900 transition-colors duration-700"
    :class="isModalPlaylistDetail ? 'min-h-full' : 'min-h-screen'"
    :style="pageStyle"
  >
    <nav class="sticky top-0 z-50 flex items-center px-6 py-4">

    </nav>

    <main class="mx-auto max-w-6xl px-6 pb-24 pt-4 sm:px-10">

      <header ref="playlistHeroCardRef" class="flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-12 md:pb-12" :style="playlistCardTransitionStyle">
        <div class="group relative shrink-0">
          <div
            class="absolute -inset-12 z-0 rounded-full blur-[70px] opacity-40 mix-blend-multiply transition-all duration-700 group-hover:scale-110 group-hover:opacity-50"
            :style="{ backgroundColor: `rgb(${animatedThemeRgb})` }"
          />

          <div ref="playlistHeroCoverRef" data-playlist-detail-hero-cover class="relative z-10 h-64 w-64 overflow-hidden rounded-[24px] shadow-[0_24px_50px_rgba(0,0,0,0.15)] md:h-72 md:w-72 lg:h-80 lg:w-80" :style="playlistCoverTransitionStyle">
            <img v-if="playlist.coverImgUrl" :src="playlist.coverImgUrl" alt="playlist-cover" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div class="absolute inset-0 rounded-[24px] ring-1 ring-inset ring-black/5" />
          </div>
        </div>

        <div class="relative z-10 flex-1 text-center md:min-h-[280px] md:text-left">
          <p class="mb-3 text-xs font-black uppercase tracking-[0.2em] text-stone-500">Playlist</p>
          <h1 class="text-4xl font-black tracking-tight text-stone-900 sm:text-6xl lg:text-7xl">{{ playlist.name || '歌单详情' }}</h1>

          <div class="mt-4 flex min-h-[24px] flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium text-stone-600 md:justify-start">
            <span class="font-bold text-stone-900">{{ playlist.creatorName ? `${playlist.creatorName}` : '网易云音乐' }}</span>
            <span class="opacity-40">•</span>
            <span>{{ playlist.trackCount || tracks.length }} 首歌曲</span>
            <span class="opacity-40">•</span>
            <span>{{ formatCount(playlist.playCount) }} 次播放</span>
          </div>

          <p
            class="mt-5 min-h-[42px] max-w-2xl line-clamp-2 text-sm leading-relaxed text-stone-600 transition-opacity duration-200"
            :class="playlist.description ? 'opacity-100' : 'opacity-0'"
          >
            {{ playlist.description || 'placeholder' }}
          </p>

          <div class="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <button
              class="flex items-center gap-2 rounded-full bg-stone-900 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-stone-900/10 transition-all hover:scale-105 hover:bg-black active:scale-95 disabled:pointer-events-none disabled:opacity-60"
              type="button"
              :disabled="!tracks.length"
              @click="playAllTracks"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              全部播放
            </button>

            <button
              class="flex h-12 w-12 items-center justify-center rounded-full bg-white/50 backdrop-blur-md transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 ring-1 ring-stone-900/5 shadow-sm"
              type="button"
              :disabled="subscribing"
              :title="playlist.subscribed ? '取消收藏' : '收藏歌单'"
              @click="toggleSubscribePlaylist"
            >
              <HeartSolidIcon v-if="playlist.subscribed" class="h-6 w-6 text-rose-500" />
              <HeartOutlineIcon v-else class="h-6 w-6 text-stone-700" />
            </button>
          </div>
          <p v-if="actionFeedback" class="mt-3 text-xs font-medium text-amber-600">{{ actionFeedback }}</p>
        </div>
      </header>

      <div class="my-8 h-px w-full bg-stone-900/5" />

      <p v-if="loading" class="animate-pulse text-sm font-medium text-stone-500">正在加载歌单...</p>
      <p v-else-if="error" class="text-sm font-medium text-red-500">{{ error }}</p>

      <section v-else class="relative z-10">
        <div class="mb-4 flex items-center justify-between px-4">
          <h3 class="text-lg font-bold text-stone-900">曲目列表</h3>
          <span class="text-xs font-semibold text-stone-500">已加载 {{ tracks.length }} / {{ playlist.trackCount || 0 }}</span>
        </div>

        <div class="space-y-1">
          <div
            v-for="(track, index) in tracks"
            :key="track.id"
            :style="getTrackItemStyle(index)"
            class="group flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-white/60 hover:shadow-sm focus:outline-none"
            @click="openSong(track, index)"
          >
            <div class="flex min-w-0 flex-1 items-center gap-4">
              <div class="flex w-8 justify-center">
                <span class="text-sm font-medium tabular-nums text-stone-400 group-hover:hidden">{{ index + 1 }}</span>
                <svg class="hidden text-stone-900 group-hover:block" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>

              <div class="min-w-0 flex-1">
                <p class="truncate text-base font-bold text-stone-800" :title="track.name || '未知歌曲'">{{ track.name || '未知歌曲' }}</p>
                <div class="mt-0.5 flex min-w-0 items-center gap-1 text-sm font-medium text-stone-500" :title="getTrackArtistsFullText(track)">
                  <ArtistLinks
                    :artists="getTrackArtistsPreview(track)"
                    container-class="min-w-0 truncate"
                    link-class="hover:text-stone-900 hover:underline"
                    separator-class="text-stone-300"
                    fallback-class="text-stone-500"
                  />
                  <span v-if="getTrackArtistsOmittedCount(track) > 0" class="shrink-0 text-stone-400">等{{ getTrackArtistsOmittedCount(track) }}位</span>
                </div>
              </div>
            </div>

            <div class="ml-4 flex shrink-0 items-center gap-6">
              <button
                class="flex items-center justify-center p-1 transition"
                type="button"
                :disabled="likeLoadingSongId === track.id"
                :title="isSongLiked(track.id) ? '取消喜欢' : '喜欢歌曲'"
                @click.stop="toggleSongLike(track)"
              >
                <HeartSolidIcon v-if="isSongLiked(track.id)" class="h-5 w-5 text-rose-500 transition-transform hover:scale-110" />
                <HeartOutlineIcon v-else class="h-5 w-5 text-stone-300 opacity-0 transition-all hover:scale-110 hover:text-stone-600 group-hover:opacity-100" />
              </button>
              <span class="w-10 text-right text-sm font-medium tabular-nums text-stone-400">{{ formatDuration(track.dt) }}</span>
            </div>
          </div>
        </div>
        <div class="h-8 w-full" />
        <div v-if="tracksLoadingMore" class="px-4 py-2 text-xs font-medium text-stone-500">正在加载更多曲目...</div>
        <div v-else-if="hasMoreTracksToLoad" class="px-4 py-2 text-xs font-medium text-stone-500">向下滚动继续加载（每次 100 首）</div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { markNavigatingBack } from '@/router/index.js'
import { HeartIcon as HeartOutlineIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/vue/24/solid'
import { playListsApi } from '@/api/playListsApi/playListsApi.js'
import { reportApi } from '@/api/reportApi/reportApi.js'
import { songsApi } from '@/api/songsApi/songsApi.js'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import {
  consumePendingPlaylistHeroTransition,
  peekPendingPlaylistHeroTransition,
  playPlaylistHeroEnter,
  setPendingPlaylistHeroTransition,
} from '@/utils/playlistFlipHero.js'
import { playSongWithQueue } from '@/utils/globalPlayer.js'
import { useCounterStore } from '@/stores/userStores.js'

const route = useRoute()
const router = useRouter()
const userStore = useCounterStore()
const isModalPlaylistDetail = computed(() => ['playlistDetail', 'profilePlaylistDetail'].includes(String(route.name || '')))
const playlistHeroCardRef = ref(null)
const playlistHeroCoverRef = ref(null)
let heroEnterDone = Promise.resolve()
let resolveHeroEnterGate = null
const pendingResolvedCoverUrl = ref('')

const playlist = ref({
  id: null,
  name: '',
  coverImgUrl: '',
  creatorName: '',
  description: '',
  trackCount: 0,
  playCount: 0,
  subscribedCount: 0,
  subscribed: false,
})
const tracks = ref([])
const loading = ref(true)
const tracksLoadingMore = ref(false)
const hasMoreTracksToLoad = ref(false)
const error = ref('')
const actionFeedback = ref('')
const subscribing = ref(false)
const likedSongIdSet = ref(new Set())
const likeLoadingSongId = ref(null)
const themeRgb = ref('178, 154, 122') // 默认色调回到偏暖的灰色
const animatedThemeRgb = ref(themeRgb.value)
let themeTweenFrame = 0
const playlistScrollRootRef = ref(null)
let trackListScrollTicking = false
let currentPlaylistId = 0
let trackFetchOffset = 0
const TRACK_FETCH_SIZE = 100

// 【核心修改点】明亮模式渐变背景
const pageStyle = computed(() => {
  const [r, g, b] = parseRgb(animatedThemeRgb.value)
  // 基底颜色使用通透的浅白 #FAFAFA
  const baseColor = '#FAFAFA'

  return {
    backgroundColor: baseColor,
    // 顶部用 0.35 透明度起手，往下平滑消散，不影响文字阅读
    backgroundImage: `linear-gradient(180deg, rgba(${r},${g},${b},0.35) 0%, rgba(${r},${g},${b},0.08) 350px, ${baseColor} 700px)`,
  }
})

const playlistCardTransitionStyle = computed(() => {
  return {}
})

const playlistCoverTransitionStyle = computed(() => {
  return {}
})

function parseRgb(rgbString) {
  const parts = String(rgbString)
    .split(',')
    .map(v => Number(v.trim()))
  return [
    Number.isFinite(parts[0]) ? parts[0] : 178,
    Number.isFinite(parts[1]) ? parts[1] : 154,
    Number.isFinite(parts[2]) ? parts[2] : 122,
  ]
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3
}

function formatRgb(rgbArray) {
  return `${Math.round(rgbArray[0])}, ${Math.round(rgbArray[1])}, ${Math.round(rgbArray[2])}`
}

function animateThemeColor(nextRgb, {duration = 420} = {}) {
  const start = parseRgb(animatedThemeRgb.value)
  const end = parseRgb(nextRgb)

  if (themeTweenFrame) {
    cancelAnimationFrame(themeTweenFrame)
    themeTweenFrame = 0
  }

  const startAt = performance.now()

  const tick = (now) => {
    const elapsed = now - startAt
    const progress = Math.min(1, elapsed / duration)
    const eased = easeOutCubic(progress)

    animatedThemeRgb.value = formatRgb([
      start[0] + (end[0] - start[0]) * eased,
      start[1] + (end[1] - start[1]) * eased,
      start[2] + (end[2] - start[2]) * eased,
    ])

    if (progress < 1) {
      themeTweenFrame = requestAnimationFrame(tick)
    } else {
      themeTweenFrame = 0
    }
  }

  themeTweenFrame = requestAnimationFrame(tick)
}

function getTrackArtists(track) {
  return track?.ar || track?.artists || []
}

function normalizeTrackArtistNameList(track) {
  return getTrackArtists(track)
    .map(item => String(item?.name || item?.artistName || '').trim())
    .filter(Boolean)
}

function getTrackArtistsPreview(track, maxVisible = 4) {
  return getTrackArtists(track).slice(0, maxVisible)
}

function getTrackArtistsOmittedCount(track, maxVisible = 4) {
  return Math.max(0, getTrackArtists(track).length - maxVisible)
}

function getTrackArtistsFullText(track) {
  const artistNames = normalizeTrackArtistNameList(track)
  if (!artistNames.length) return '未知歌手'
  return artistNames.join('、')
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

function preparePlaylistHeroReturn() {
  const id = Number(route.query.id || playlist.value.id || 0)
  if (!id) return

  const coverEl = playlistHeroCoverRef.value
  if (!(coverEl instanceof HTMLElement)) return

  setPendingPlaylistHeroTransition(id, {
    coverRect: coverEl.getBoundingClientRect(),
    coverSrc: playlist.value.coverImgUrl || '',
    playlistName: playlist.value.name || '',
  })
}

function resolveBackTarget() {
  const matched = route.matched || []
  if (matched.length > 1) {
    const parent = matched[matched.length - 2]
    if (parent?.name) {
      return {name: parent.name}
    }
    if (parent?.path) {
      return parent.path
    }
  }

  return null
}

async function goBack() {
  markNavigatingBack()
  preparePlaylistHeroReturn()
  const target = resolveBackTarget()

  if (target) {
    await router.push(target)
    return
  }

  if (window.history.length > 1) {
    router.back()
    return
  }

  await router.push('/home')
}

onBeforeRouteLeave((to) => {
  if (to?.name === 'home') {
    preparePlaylistHeroReturn()
  }
})

async function openSong(track, index = 0) {
  await ensureAllTracksLoaded()
  await playSongWithQueue(track, tracks.value, index)
}

function isSongLiked(songId) {
  return likedSongIdSet.value.has(String(songId || ''))
}

async function playAllTracks() {
  if (!tracks.value.length) return
  await ensureAllTracksLoaded()
  reportApi.reportBehavior({
    actionType: 'PLAY_PLAYLIST',
    actionTarget: String(playlist.value.id || route.query.id || ''),
    actionDetail: JSON.stringify({name: playlist.value.name || '', trackCount: tracks.value.length}),
  })
  await playSongWithQueue(tracks.value[0], tracks.value, 0)
}

async function loadLikedSongs() {
  if (!userStore.isLoggedIn) {
    likedSongIdSet.value = new Set()
    return
  }

  try {
    const res = await songsApi.getLikeSongs()
    const ids = res?.data?.ids || []
    likedSongIdSet.value = new Set(ids.map(id => String(id)))
  } catch {
    likedSongIdSet.value = new Set()
  }
}

async function toggleSongLike(track) {
  if (!track?.id) return
  if (!userStore.isLoggedIn) {
    actionFeedback.value = '请先登录后再操作喜欢歌曲'
    return
  }

  const songId = Number(track.id)
  const liked = isSongLiked(songId)
  likeLoadingSongId.value = songId
  actionFeedback.value = ''
  try {
    await songsApi.likeSongs(songId, liked ? 'false' : 'true')
    const next = new Set(likedSongIdSet.value)
    if (liked) next.delete(String(songId))
    else next.add(String(songId))
    likedSongIdSet.value = next
    if (!liked) {
      reportApi.reportLikedSong({
        songId,
        songName: track.name,
        artist: normalizeTrackArtistNameList(track).join(', '),
        album: track.al?.name || track.album?.name || '',
        duration: Math.round(Number(track.dt || track.duration || 0) / 1000) || undefined,
        coverUrl: track.al?.picUrl || track.cover || track.coverImgUrl || '',
      })
    }
    actionFeedback.value = liked ? '已取消喜欢歌曲' : '已添加到我喜欢的音乐'
  } catch {
    actionFeedback.value = '操作失败，请稍后重试'
  } finally {
    likeLoadingSongId.value = null
  }
}

async function toggleSubscribePlaylist() {
  if (!playlist.value.id) return
  if (!userStore.isLoggedIn) {
    actionFeedback.value = '请先登录后再收藏歌单'
    return
  }

  subscribing.value = true
  actionFeedback.value = ''

  try {
    const shouldSubscribe = !playlist.value.subscribed
    await playListsApi.subscribePlayList(playlist.value.id, shouldSubscribe ? 1 : 2)
    playlist.value.subscribed = shouldSubscribe
    playlist.value.subscribedCount = Math.max(0, Number(playlist.value.subscribedCount || 0) + (shouldSubscribe ? 1 : -1))
    if (shouldSubscribe) {
      reportApi.reportCollection({
        collectionType: 'PLAYLIST',
        targetId: playlist.value.id,
        targetName: playlist.value.name,
        coverUrl: playlist.value.coverImgUrl,
      })
    }
    actionFeedback.value = shouldSubscribe ? '已收藏歌单' : '已取消收藏歌单'
  } catch {
    actionFeedback.value = '歌单收藏操作失败，请稍后再试'
  } finally {
    subscribing.value = false
  }
}

function getTrackItemStyle(index) {
  const delay = Math.min(index, 24) * 22
  return {
    '--item-delay': `${delay}ms`,
  }
}

function appendTracksChunk(chunk = []) {
  if (!Array.isArray(chunk) || !chunk.length) return
  const map = new Map(tracks.value.map(song => [song?.id, song]))
  chunk.forEach(song => {
    if (song?.id && !map.has(song.id)) {
      map.set(song.id, song)
    }
  })
  tracks.value = Array.from(map.values())
}

async function loadMoreTracks() {
  if (!currentPlaylistId || tracksLoadingMore.value || !hasMoreTracksToLoad.value) return
  tracksLoadingMore.value = true
  try {
    const res = await playListsApi.getPlayListSongs(
      currentPlaylistId,
      TRACK_FETCH_SIZE,
      trackFetchOffset,
    )
    const chunk = res?.data?.songs || []
    if (!chunk.length) {
      hasMoreTracksToLoad.value = false
      return
    }
    appendTracksChunk(chunk)
    trackFetchOffset += chunk.length
    if (chunk.length < TRACK_FETCH_SIZE || trackFetchOffset >= Number(playlist.value.trackCount || 0)) {
      hasMoreTracksToLoad.value = false
    }
  } finally {
    tracksLoadingMore.value = false
  }
}

async function ensureAllTracksLoaded() {
  while (hasMoreTracksToLoad.value) {
    await loadMoreTracks()
  }
}

function maybeLoadMoreByScroll() {
  const rootEl = playlistScrollRootRef.value
  if (!(rootEl instanceof HTMLElement)) return
  const remain = rootEl.scrollHeight - rootEl.scrollTop - rootEl.clientHeight
  if (remain <= 320) {
    loadMoreTracks()
  }
}

function onTrackRootScroll() {
  if (trackListScrollTicking) return
  trackListScrollTicking = true
  requestAnimationFrame(() => {
    trackListScrollTicking = false
    maybeLoadMoreByScroll()
  })
}

function colorFromString(seed) {
  const text = String(seed || 'playlist')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
  }
  const r = 160 + (Math.abs(hash) % 40)
  const g = 150 + (Math.abs(hash >> 8) % 50)
  const b = 140 + (Math.abs(hash >> 16) % 60)
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
    let r = 0, g = 0, b = 0, count = 0

    for (let i = 0; i < data.length; i += 16) {
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      count += 1
    }

    if (!count) throw new Error('no sampled pixels')

    // 明亮模式下，放宽色彩上限，避免过于暗沉
    const rr = Math.min(240, Math.max(60, Math.round(r / count)))
    const gg = Math.min(240, Math.max(60, Math.round(g / count)))
    const bb = Math.min(240, Math.max(60, Math.round(b / count)))

    themeRgb.value = `${rr}, ${gg}, ${bb}`
  } catch {
    themeRgb.value = colorFromString(seedName)
  }
}

async function loadPlaylist() {
  loading.value = true
  error.value = ''
  tracks.value = []
  hasMoreTracksToLoad.value = false
  tracksLoadingMore.value = false
  trackFetchOffset = 0

  const id = route.query.id
  if (!id) {
    error.value = '缺少歌单 id'
    loading.value = false
    return
  }

  const preview = peekPendingPlaylistHeroTransition(id)
  const hasPreviewCover = Boolean(preview?.coverSrc)
  if (preview) {
    heroEnterDone = new Promise((resolve) => {
      resolveHeroEnterGate = resolve
    })

    playlist.value = {
      ...playlist.value,
      id: Number(id),
      name: preview.playlistName || playlist.value.name,
      coverImgUrl: preview.coverSrc || playlist.value.coverImgUrl,
    }
  } else {
    heroEnterDone = Promise.resolve()
    resolveHeroEnterGate = null
  }

  try {
    const detailRes = await playListsApi.getPlayListDetail(id)
    const detailPlaylist = detailRes?.data?.playlist || {}

    await heroEnterDone

    const resolvedCover = detailPlaylist.coverImgUrl || ''
    playlist.value = {
      id: Number(detailPlaylist.id || id),
      name: detailPlaylist.name || '',
      coverImgUrl: hasPreviewCover ? String(preview.coverSrc || '') : resolvedCover,
      creatorName: detailPlaylist.creator?.nickname || '',
      description: detailPlaylist.description || '',
      trackCount: detailPlaylist.trackCount || 0,
      playCount: detailPlaylist.playCount || 0,
      subscribedCount: detailPlaylist.subscribedCount || 0,
      subscribed: Boolean(detailPlaylist.subscribed),
    }
    pendingResolvedCoverUrl.value =
      hasPreviewCover && resolvedCover && resolvedCover !== String(preview.coverSrc || '')
        ? resolvedCover
        : ''

    await pickThemeColor(playlist.value.coverImgUrl, playlist.value.name)

    currentPlaylistId = Number(detailPlaylist.id || id || 0)
    appendTracksChunk(detailPlaylist.tracks || [])
    trackFetchOffset = tracks.value.length
    hasMoreTracksToLoad.value = trackFetchOffset < Number(detailPlaylist.trackCount || 0)

    if (hasMoreTracksToLoad.value) {
      await loadMoreTracks()
    }
    loadLikedSongs()
  } catch (err) {
    error.value = err?.message || '歌单加载失败'
  } finally {
    loading.value = false
  }
}

async function runHeroFlipEnter() {
  const id = Number(route.query.id || playlist.value.id || 0)
  if (!id) return
  const payload = consumePendingPlaylistHeroTransition(id)
  if (!payload) {
    if (typeof resolveHeroEnterGate === 'function') {
      resolveHeroEnterGate()
      resolveHeroEnterGate = null
    }
    return
  }

  const runner = (async () => {
    await nextTick()
    await playPlaylistHeroEnter({
      payload,
      targetCardEl: playlistHeroCardRef.value,
      targetCoverEl: playlistHeroCoverRef.value,
    })
  })()

  heroEnterDone = runner

  try {
    await runner
  } finally {
    if (pendingResolvedCoverUrl.value) {
      playlist.value = {
        ...playlist.value,
        coverImgUrl: pendingResolvedCoverUrl.value,
      }
      pendingResolvedCoverUrl.value = ''
    }
    if (typeof resolveHeroEnterGate === 'function') {
      resolveHeroEnterGate()
      resolveHeroEnterGate = null
    }
  }
}

onMounted(() => {
  loadPlaylist()
  runHeroFlipEnter()
  nextTick(() => maybeLoadMoreByScroll())
  playlistScrollRootRef.value?.addEventListener('scroll', onTrackRootScroll, {passive: true})
})

onBeforeUnmount(() => {
  if (themeTweenFrame) {
    cancelAnimationFrame(themeTweenFrame)
    themeTweenFrame = 0
  }
  playlistScrollRootRef.value?.removeEventListener('scroll', onTrackRootScroll)
})

watch(
  themeRgb,
  (nextValue, prevValue) => {
    if (!prevValue || prevValue === nextValue) {
      animatedThemeRgb.value = nextValue
      return
    }
    animateThemeColor(nextValue)
  },
  {immediate: true},
)

watch(
  () => route.query.id,
  () => {
    actionFeedback.value = ''
    loadPlaylist()
    runHeroFlipEnter()
    nextTick(() => maybeLoadMoreByScroll())
  },
)

watch(
  [playlistScrollRootRef, loading],
  () => {
    if (loading.value) return
    nextTick(() => maybeLoadMoreByScroll())
  },
)

watch(
  () => userStore.isLoggedIn,
  (loggedIn) => {
    actionFeedback.value = ''
    if (loggedIn) {
      loadLikedSongs()
      return
    }
    likedSongIdSet.value = new Set()
  },
)
</script>

<style scoped>
.track-item-enter-active {
  transition: opacity 300ms cubic-bezier(0.34, 1.18, 0.64, 1), transform 300ms cubic-bezier(0.34, 1.18, 0.64, 1), filter 420ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--item-delay, 0ms);
}
.track-item-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.track-item-enter-from,
.track-item-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.99);
  filter: blur(4px);
}
.track-item-move {
  transition: transform 300ms cubic-bezier(0.34, 1.18, 0.64, 1);
}
</style>
