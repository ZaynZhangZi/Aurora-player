<template>
  <div
    ref="playlistPageRef"
    class="relative w-full text-stone-900 transition-colors duration-700"
    :class="usesPageScroll
      ? `${isModalPlaylistDetail ? 'h-full' : 'h-screen'} min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain`
      : 'flex h-screen flex-col overflow-hidden'"
    :style="pageStyle"
  >
    <nav class="shrink-0 flex items-center px-6 py-4">

    </nav>

    <main
      class="mx-auto flex w-full max-w-6xl flex-col px-6 pb-6 pt-4 sm:px-10"
      :class="usesPageScroll ? '' : 'min-h-0 flex-1'"
    >

      <header ref="playlistHeroCardRef" class="shrink-0 flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-12 md:pb-12" :style="playlistCardTransitionStyle">
        <div class="group relative shrink-0">
          <div
            class="absolute -inset-12 z-0 rounded-full blur-[70px] opacity-40 mix-blend-multiply transition-all duration-700 group-hover:scale-110 group-hover:opacity-50"
            :style="{ backgroundColor: `rgb(${animatedThemeRgb})` }"
          />

          <div ref="playlistHeroCoverRef" data-playlist-detail-hero-cover class="relative z-10 h-64 w-64 overflow-hidden rounded-[24px] shadow-[0_24px_50px_rgba(0,0,0,0.15)] md:h-72 md:w-72 lg:h-80 lg:w-80" :style="playlistCoverTransitionStyle">
            <img v-if="playlist.coverImgUrl" v-bind="responsiveImageAttrs(playlist.coverImgUrl, {width: 640, sizes: '(min-width: 1024px) 320px, (min-width: 768px) 288px, 256px'})" alt="playlist-cover" fetchpriority="high" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
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
              <AppIcon name="play" width="20" height="20" />
              全部播放
            </button>

            <button
              class="like-button flex h-12 w-12 items-center justify-center rounded-full bg-white/50 backdrop-blur-md transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 ring-1 ring-stone-900/5 shadow-sm"
              :class="[playlistLikeAnimationClass, subscribing ? 'like-button--loading' : '']"
              type="button"
              :disabled="subscribing"
              :title="playlist.subscribed ? '取消收藏' : '收藏歌单'"
              @click="toggleSubscribePlaylist"
            >
              <Transition name="heart-switch" mode="out-in">
                <AppIcon name="heart" :filled="playlist.subscribed" class="relative z-10 h-6 w-6" :class="playlist.subscribed ? 'text-rose-500' : 'text-stone-700'" />
              </Transition>
            </button>
          </div>
          <p v-if="actionFeedback" class="mt-3 text-xs font-medium text-amber-600">{{ actionFeedback }}</p>
        </div>
      </header>

      <div class="my-8 h-px w-full shrink-0 bg-stone-900/5" />

      <p v-if="loading" class="shrink-0 animate-pulse text-sm font-medium text-stone-500">正在加载歌单...</p>
      <p v-else-if="error" class="shrink-0 text-sm font-medium text-red-500">{{ error }}</p>

      <section
        v-else
        class="relative z-10 flex flex-col"
        :class="usesPageScroll ? '' : 'min-h-0 flex-1'"
      >
        <div class="mb-4 flex shrink-0 items-center justify-between px-4">
          <h3 class="text-lg font-bold text-stone-900">曲目列表</h3>
        </div>

        <TransitionGroup
          ref="trackListRef"
          name="track-item"
          :css="tracks.length <= 80"
          tag="div"
          role="list"
          aria-label="歌单曲目，使用上下方向键浏览，回车播放"
          class="playlist-track-scroll pb-24 pr-1"
          :class="usesPageScroll ? '' : 'min-h-0 flex-1 overflow-y-auto'"
          appear
        >
          <div v-if="virtualized && trackRange.top" key="top-spacer" :style="{height: `${trackRange.top}px`}" aria-hidden="true" />
          <div
            v-for="({track, index}) in visibleTracks"
            :key="track.id"
            :style="getTrackItemStyle(index)"
            class="playlist-track-row group flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-white/60 hover:shadow-sm"
            :data-track-index="index"
            role="listitem"
            :aria-posinset="index + 1"
            :aria-setsize="tracks.length"
            :tabindex="virtualized ? (tabbableTrackIndex === index ? 0 : -1) : 0"
            :aria-label="`播放第 ${index + 1} 首：${track.name || '未知歌曲'}`"
            :class="{ 'track-playback-pending': Number(playerStore.playbackPendingId) === Number(track.id) }"
            @click="openSong(track, index)"
            @focus="focusedTrackIndex = index"
            @keydown="handleTrackKeydown($event, index)"
          >
            <div class="flex min-w-0 flex-1 items-center gap-4">
              <div class="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors group-hover:bg-stone-900/5 group-focus-visible:bg-stone-900/5" aria-hidden="true">
                <span class="text-[13px] font-medium tabular-nums text-stone-400 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">{{ index + 1 }}</span>
                <span class="pointer-events-none absolute inset-0 grid place-items-center text-stone-800 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <AppIcon name="play" :size="14" filled />
                </span>
              </div>

              <div class="min-w-0 flex-1">
                <p class="truncate text-base font-bold text-stone-800" :title="track.name || '未知歌曲'">{{ track.name || '未知歌曲' }}</p>
                <div class="playlist-track-artists mt-0.5 flex min-w-0 items-center gap-1 text-sm font-medium text-stone-500" :title="getTrackArtistsFullText(track)">
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
                class="like-button flex items-center justify-center p-1 transition"
                :class="[getSongLikeAnimationClass(track.id), likeLoadingSongId === Number(track.id) ? 'like-button--loading' : '']"
                type="button"
                :disabled="likeLoadingSongId === Number(track.id)"
                :title="isSongLiked(track.id) ? '取消喜欢' : '喜欢歌曲'"
                @click.stop="toggleSongLike(track)"
              >
                <Transition name="heart-switch" mode="out-in">
                  <AppIcon name="heart" :filled="isSongLiked(track.id)" class="relative z-10 h-5 w-5 transition-all hover:scale-110" :class="isSongLiked(track.id) ? 'text-rose-500' : 'text-stone-300 opacity-0 hover:text-stone-600 group-hover:opacity-100'" />
                </Transition>
              </button>
              <span class="w-10 text-right text-sm font-medium tabular-nums text-stone-400">{{ formatDuration(track.dt) }}</span>
            </div>
          </div>
          <div v-if="virtualized && trackRange.bottom" key="bottom-spacer" :style="{height: `${trackRange.bottom}px`}" aria-hidden="true" />
        </TransitionGroup>
      </section>
    </main>
  </div>
</template>

<script setup>
import AppIcon from "@/components/icons/AppIcon.vue"
import {loadPlaylistPages} from '@/utils/playlistPages.js'
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { DETAIL_OVERLAY_MODE_KEY } from '@/composables/useDetailNavigation.js'
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
import { usePlayerStore } from '@/stores/playerStore.js'
import {responsiveImageAttrs, getOptimizedImageUrl} from '@/utils/mediaUrl.js'
import {loadImageAsset} from '@/utils/loadImageAsset.js'
import {useVirtualTrackList} from '@/composables/useVirtualTrackList.js'

const route = useRoute()
const userStore = useCounterStore()
const playerStore = usePlayerStore()
// 悬浮模式由 DetailOverlayHost 注入；整页模式（直接访问/刷新）为 false。
// 详情组件挂载期间模式不变，用静态布尔即可。
const isModalPlaylistDetail = Boolean(inject(DETAIL_OVERLAY_MODE_KEY, false))
// 详情 id：规范 URL 用 params，旧地址回退 query。
const detailId = computed(() => String(route.params?.id || route.query?.id || ''))
const playlistHeroCardRef = ref(null)
const playlistHeroCoverRef = ref(null)
let heroEnterDone = Promise.resolve()
let resolveHeroEnterGate = null
let playlistLoadGeneration = 0
let playlistLoadController = null

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
const playlistPageRef = ref(null)
const trackListRef = ref(null)
const focusedTrackIndex = ref(0)
const narrowLayout = ref(typeof window !== 'undefined' && window.innerWidth < 768)
const usesPageScroll = computed(() => isModalPlaylistDetail || narrowLayout.value)
const trackScrollRoot = computed(() => usesPageScroll.value ? playlistPageRef.value : null)
const {virtualized, range: trackRange, visibleItems: visibleTracks, focusIndex} = useVirtualTrackList({
  items: tracks, listRef: trackListRef, externalRoot: trackScrollRoot,
  getBottomInset: root => {
    const space = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--global-player-space')) || 104
    return Math.max(0, root.getBoundingClientRect().bottom - (window.innerHeight - space))
  },
})
const tabbableTrackIndex = computed(() => focusedTrackIndex.value >= trackRange.value.start && focusedTrackIndex.value < trackRange.value.end
  ? focusedTrackIndex.value : trackRange.value.start)
function updateNarrowLayout() { narrowLayout.value = window.innerWidth < 768 }
onMounted(() => window.addEventListener('resize', updateNarrowLayout, {passive: true}))
onBeforeUnmount(() => window.removeEventListener('resize', updateNarrowLayout))
async function handleTrackKeydown(event, index) {
  if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return
  const destinations = {ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: tracks.value.length - 1}
  if (event.key in destinations) {
    event.preventDefault()
    focusedTrackIndex.value = Math.min(tracks.value.length - 1, Math.max(0, destinations[event.key]))
    await focusIndex(focusedTrackIndex.value)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    void openSong(tracks.value[index], index)
  }
}
const loading = ref(true)
const error = ref('')
const actionFeedback = ref('')
const subscribing = ref(false)
const likedSongIdSet = ref(new Set())
const likeLoadingSongId = ref(null)
const songLikeAnimationMap = ref({})
const playlistLikeAnimationClass = ref('')
const themeRgb = ref('178, 154, 122')
const animatedThemeRgb = ref(themeRgb.value)

let themeTweenFrame = 0
let playlistLikeAnimationTimer = 0
const songLikeAnimationTimers = new Map()

const pageStyle = computed(() => {
  const [r, g, b] = parseRgb(animatedThemeRgb.value)
  const baseColor = '#FAFAFA'

  // 悬浮层高度远小于整页，固定 px/100vh 的渐变停止点会提前走到近白底色，
  // 导致弹窗下半截出现一块平白。悬浮模式改用百分比停止点，让主题色铺满容器。
  if (isModalPlaylistDetail) {
    return {
      backgroundColor: baseColor,
      backgroundImage: `linear-gradient(180deg, rgba(${r},${g},${b},0.35) 0%, rgba(${r},${g},${b},0.12) 42%, rgba(${r},${g},${b},0.07) 100%)`,
    }
  }

  return {
    backgroundColor: baseColor,
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

function getSongLikeAnimationClass(songId) {
  return songLikeAnimationMap.value[String(songId || '')] || ''
}

function triggerSongLikeAnimation(songId, liked) {
  const key = String(songId || '')
  if (!key) return

  const nextClass = liked ? 'like-button--liked-pop' : 'like-button--unliked-pop'

  if (songLikeAnimationTimers.has(key)) {
    clearTimeout(songLikeAnimationTimers.get(key))
    songLikeAnimationTimers.delete(key)
  }

  songLikeAnimationMap.value = {
    ...songLikeAnimationMap.value,
    [key]: nextClass,
  }

  const timer = window.setTimeout(() => {
    const next = {...songLikeAnimationMap.value}
    delete next[key]
    songLikeAnimationMap.value = next
    songLikeAnimationTimers.delete(key)
  }, 560)

  songLikeAnimationTimers.set(key, timer)
}

function triggerPlaylistLikeAnimation(subscribed) {
  if (playlistLikeAnimationTimer) {
    clearTimeout(playlistLikeAnimationTimer)
    playlistLikeAnimationTimer = 0
  }

  playlistLikeAnimationClass.value = subscribed ? 'like-button--liked-pop' : 'like-button--unliked-pop'

  playlistLikeAnimationTimer = window.setTimeout(() => {
    playlistLikeAnimationClass.value = ''
    playlistLikeAnimationTimer = 0
  }, 560)
}

function preparePlaylistHeroReturn() {
  const id = Number(detailId.value || playlist.value.id || 0)
  if (!id) return

  const coverEl = playlistHeroCoverRef.value
  if (!(coverEl instanceof HTMLElement)) return

  setPendingPlaylistHeroTransition(id, {
    coverRect: coverEl.getBoundingClientRect(),
    coverSrc: playlist.value.coverImgUrl || '',
    playlistName: playlist.value.name || '',
  })
}

onBeforeRouteLeave(() => {
  // 无论返回哪个背景页，都准备封面 Hero 返回动画（由背景页消费）。
  preparePlaylistHeroReturn()
})

async function openSong(track, index = 0) {
  await playSongWithQueue(track, tracks.value, index, {maintenanceTargets: ['page.playlist']})
}

function isSongLiked(songId) {
  return likedSongIdSet.value.has(String(songId || ''))
}

async function playAllTracks() {
  if (!tracks.value.length) return
  reportApi.reportBehavior({
    actionType: 'PLAY_PLAYLIST',
    actionTarget: String(playlist.value.id || detailId.value || ''),
    actionDetail: JSON.stringify({name: playlist.value.name || '', trackCount: tracks.value.length}),
  })
  await playSongWithQueue(tracks.value[0], tracks.value, 0, {maintenanceTargets: ['page.playlist']})
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
  const nextLiked = !liked
  const requestedUser = userStore.userId

  likeLoadingSongId.value = songId
  actionFeedback.value = ''

  try {
    await songsApi.likeSongs(songId, liked ? 'false' : 'true')
    if (userStore.userId !== requestedUser) return

    const next = new Set(likedSongIdSet.value)
    if (liked) next.delete(String(songId))
    else next.add(String(songId))
    likedSongIdSet.value = next

    triggerSongLikeAnimation(songId, nextLiked)

    {
      reportApi.reportLikedSong({
        liked: nextLiked,
        songId,
        songName: track.name,
        artist: normalizeTrackArtistNameList(track).join(', '),
        album: track.al?.name || track.album?.name || '',
        duration: Math.round(Number(track.dt || track.duration || 0) / 1000) || undefined,
        coverUrl: track.al?.picUrl || track.cover || track.coverImgUrl || '',
      })
    }
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

  const targetPlaylist = playlist.value
  const requestedId = targetPlaylist.id
  const requestedUser = userStore.userId
  subscribing.value = true
  actionFeedback.value = ''

  try {
    const shouldSubscribe = !targetPlaylist.subscribed
    await playListsApi.subscribePlayList(requestedId, shouldSubscribe ? 1 : 2)
    reportApi.reportCollection({collectionType: 'PLAYLIST', targetId: requestedId, targetName: targetPlaylist.name, coverUrl: targetPlaylist.coverImgUrl, collected: shouldSubscribe, userId: requestedUser})
    if (playlist.value !== targetPlaylist || userStore.userId !== requestedUser) return

    playlist.value.subscribed = shouldSubscribe
    playlist.value.subscribedCount = Math.max(0, Number(playlist.value.subscribedCount || 0) + (shouldSubscribe ? 1 : -1))

    triggerPlaylistLikeAnimation(shouldSubscribe)


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

async function fetchAllPlaylistSongs(playlistId, expectedTotal = 0, signal, initial = []) {
  return loadPlaylistPages({initial, total: expectedTotal, signal,
    fetchPage: (limit, offset) => playListsApi.getPlayListSongs(playlistId, limit, offset, {signal}).then(response => response?.data?.songs || []),
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

let themePickGeneration = 0
async function pickThemeColor(coverUrl, seedName, {signal, isCurrent: isLoadCurrent}) {
  const generation = ++themePickGeneration
  const isCurrent = () => isLoadCurrent() && generation === themePickGeneration
  if (!isCurrent()) return
  if (!coverUrl) {
    themeRgb.value = colorFromString(seedName)
    return
  }

  try {
    const img = await loadImageAsset(getOptimizedImageUrl(coverUrl, {width: 96}), {signal, crossOrigin: 'anonymous'})
    if (!isCurrent()) return
    if (!img) throw new Error('cover unavailable')

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

    const rr = Math.min(240, Math.max(60, Math.round(r / count)))
    const gg = Math.min(240, Math.max(60, Math.round(g / count)))
    const bb = Math.min(240, Math.max(60, Math.round(b / count)))

    themeRgb.value = `${rr}, ${gg}, ${bb}`
  } catch {
    if (isCurrent()) themeRgb.value = colorFromString(seedName)
  }
}

async function loadPlaylist() {
  const generation = ++playlistLoadGeneration
  playlistLoadController?.abort()
  resolveHeroEnterGate?.()
  playlistLoadController = new AbortController()
  const {signal} = playlistLoadController
  const isCurrent = () => generation === playlistLoadGeneration && !signal.aborted
  focusedTrackIndex.value = 0
  loading.value = true
  error.value = ''
  tracks.value = []

  const id = detailId.value
  if (!id) {
    error.value = '缺少歌单 id'
    loading.value = false
    return
  }

  const preview = peekPendingPlaylistHeroTransition(id)
  let heroPreviewCoverUrl = ''
  if (preview) {
    heroPreviewCoverUrl = preview.coverSrc || ''
    heroEnterDone = new Promise((resolve) => {
      resolveHeroEnterGate = resolve
    })

    playlist.value = {
      ...playlist.value,
      id: Number(id),
      name: preview.playlistName || playlist.value.name,
      coverImgUrl: heroPreviewCoverUrl,
    }
  } else {
    heroEnterDone = Promise.resolve()
    resolveHeroEnterGate = null
  }

  try {
    const detailRes = await playListsApi.getPlayListDetail(id, {signal})
    if (!isCurrent()) return
    const detailPlaylist = detailRes?.data?.playlist || {}

    const apiCoverUrl = detailPlaylist.coverImgUrl || ''
    const needsCoverSwap = heroPreviewCoverUrl && apiCoverUrl && apiCoverUrl !== heroPreviewCoverUrl

    playlist.value = {
      id: Number(detailPlaylist.id || id),
      name: detailPlaylist.name || '',
      coverImgUrl: heroPreviewCoverUrl || apiCoverUrl,
      creatorName: detailPlaylist.creator?.nickname || '',
      description: detailPlaylist.description || '',
      trackCount: detailPlaylist.trackCount || 0,
      playCount: detailPlaylist.playCount || 0,
      subscribedCount: detailPlaylist.subscribedCount || 0,
      subscribed: Boolean(detailPlaylist.subscribed),
    }

    // 立即展示初始歌曲，不阻塞
    tracks.value = detailPlaylist.tracks || []
    void pickThemeColor(playlist.value.coverImgUrl, playlist.value.name, {signal, isCurrent})
    loading.value = false

    // Preserve the flying cover through its Hero transition; artwork loading
    // runs separately from metadata, initial tracks and the remaining pages.
    if (needsCoverSwap) {
      void (async () => {
        await heroEnterDone
        if (!isCurrent()) return
        const image = await loadImageAsset(getOptimizedImageUrl(apiCoverUrl, {width: 640}), {signal})
        if (!image || !isCurrent()) return
        playlist.value = {...playlist.value, coverImgUrl: apiCoverUrl}
        void pickThemeColor(apiCoverUrl, playlist.value.name, {signal, isCurrent})
      })()
    }

    // 后台并行拉取剩余歌曲
    try {
      const allSongs = await fetchAllPlaylistSongs(id, detailPlaylist.trackCount || 0, signal, detailPlaylist.tracks || [])
      if (isCurrent() && allSongs.length) {
        tracks.value = allSongs
      }
    } catch {
      // 剩余歌曲加载失败不影响已有展示
    }
    if (isCurrent()) loadLikedSongs()
  } catch (err) {
    if (isCurrent()) error.value = err?.message || '歌单加载失败'
  } finally {
    if (isCurrent()) loading.value = false
  }
}

async function runHeroFlipEnter() {
  const id = Number(detailId.value || playlist.value.id || 0)
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

    const imgEl = playlistHeroCoverRef.value?.querySelector('img')
    if (imgEl && !imgEl.complete) {
      await new Promise((resolve) => {
        imgEl.onload = resolve
        imgEl.onerror = resolve
      })
    }

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
    if (typeof resolveHeroEnterGate === 'function') {
      resolveHeroEnterGate()
      resolveHeroEnterGate = null
    }
  }
}

onMounted(() => {
  loadPlaylist()
  runHeroFlipEnter()
})

onBeforeUnmount(() => {
  playlistLoadGeneration += 1
  playlistLoadController?.abort()
  resolveHeroEnterGate?.()
  if (themeTweenFrame) {
    cancelAnimationFrame(themeTweenFrame)
    themeTweenFrame = 0
  }

  if (playlistLikeAnimationTimer) {
    clearTimeout(playlistLikeAnimationTimer)
    playlistLikeAnimationTimer = 0
  }

  songLikeAnimationTimers.forEach(timer => clearTimeout(timer))
  songLikeAnimationTimers.clear()
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
  () => detailId.value,
  () => {
    actionFeedback.value = ''
    playlistLikeAnimationClass.value = ''
    songLikeAnimationMap.value = {}
    loadPlaylist()
    runHeroFlipEnter()
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
.playlist-track-scroll {
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.playlist-track-scroll > * {
  content-visibility: auto;
  contain-intrinsic-size: auto 54px;
}

.playlist-track-scroll > [aria-hidden="true"] { content-visibility: visible; }
.playlist-track-row { height: 70px; margin-bottom: 4px; box-sizing: border-box; }
.playlist-track-row:focus-visible { outline: 2px solid #78716c; outline-offset: -2px; }
.playlist-track-artists { height: 20px; overflow: hidden; }

.track-playback-pending {
  cursor: wait;
  background: rgba(255, 255, 255, 0.72);
  opacity: 0.72;
}

.playlist-track-scroll::-webkit-scrollbar {
  display: none;
}

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

.like-button {
  position: relative;
  border-radius: 9999px;
  transform-origin: center;
}

.like-button::before {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 9999px;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.55);
  background: radial-gradient(circle, rgba(244, 63, 94, 0.2) 0%, rgba(244, 63, 94, 0.1) 35%, rgba(244, 63, 94, 0) 70%);
}

.like-button--liked-pop {
  animation: heart-pop 520ms cubic-bezier(0.2, 1.4, 0.32, 1);
}

.like-button--liked-pop::before {
  animation: heart-bloom 520ms ease-out;
}

.like-button--unliked-pop {
  animation: heart-away 380ms ease-out;
}

.like-button--unliked-pop::before {
  background: radial-gradient(circle, rgba(120, 113, 108, 0.18) 0%, rgba(120, 113, 108, 0.08) 35%, rgba(120, 113, 108, 0) 70%);
  animation: heart-bloom 420ms ease-out;
}

.like-button--loading {
  animation: heart-breath 900ms ease-in-out infinite;
}

.heart-switch-enter-active {
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.2, 1.35, 0.32, 1);
}

.heart-switch-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.heart-switch-enter-from {
  opacity: 0;
  transform: scale(0.45) rotate(-12deg);
}

.heart-switch-leave-to {
  opacity: 0;
  transform: scale(0.7) rotate(12deg);
}

@keyframes heart-pop {
  0% {
    transform: scale(1);
  }
  38% {
    transform: scale(1.28);
  }
  68% {
    transform: scale(0.94);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes heart-away {
  0% {
    transform: scale(1);
  }
  42% {
    transform: scale(0.78);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes heart-bloom {
  0% {
    opacity: 0;
    transform: scale(0.45);
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(1.65);
  }
}

@keyframes heart-breath {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.86);
  }
}
</style>
