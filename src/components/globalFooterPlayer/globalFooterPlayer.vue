<template>
  <div ref="playerRootRef" class="fixed inset-x-0 bottom-3 z-[79] px-3 sm:bottom-4 sm:px-4" role="region" aria-label="全局播放器">
    <div class="mx-auto max-w-6xl rounded-2xl border border-white/25 bg-black/38 shadow-[0_14px_40px_rgba(15,23,42,0.30)] backdrop-blur-2xl">
      <div class="hidden h-[86px] grid-cols-[minmax(0,1fr)_minmax(360px,520px)_minmax(0,1fr)] items-center gap-4 px-5 md:grid">
        <Transition name="track-swap" mode="out-in">
          <div :key="songTransitionKey" class="flex min-w-0 items-center gap-3">
            <div class="h-12 w-12 overflow-hidden rounded-lg bg-white/20">
              <img v-if="coverUrl" :src="coverUrl" alt="cover" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-white">{{ songName || '未在播放' }}</p>
              <ArtistLinks
                :artists="artistList"
                container-class="text-xs text-white/72"
                link-class="hover:text-white hover:underline"
                separator-class="text-white/55"
                fallback-class="text-white/72"
              />
            </div>
          </div>
        </Transition>

        <div class="flex flex-col items-center gap-1.5">
          <div class="flex items-center gap-4">
            <button
              class="grid h-8 w-8 place-items-center rounded-full border border-white/35 text-white/85 transition hover:bg-white/12 disabled:opacity-50"
              type="button"
              :disabled="!canPlayPrev"
              @click="playPrevSong"
            >
              <BackwardIcon class="h-4 w-4" />
            </button>
            <button
              class="grid h-10 w-10 place-items-center rounded-full bg-white text-stone-900 transition hover:bg-white/90 disabled:opacity-40"
              type="button"
              :disabled="!hasSong"
              @click="togglePlay"
            >
              <PauseIcon v-if="isPlaying" class="h-5 w-5" />
              <PlayIcon v-else class="h-5 w-5" />
            </button>
            <button
              class="grid h-8 w-8 place-items-center rounded-full border border-white/35 text-white/85 transition hover:bg-white/12 disabled:opacity-50"
              type="button"
              :disabled="!canPlayNext"
              @click="playNextSong"
            >
              <ForwardIcon class="h-4 w-4" />
            </button>
          </div>

          <div class="flex w-full items-center gap-2 text-[11px] text-white/72">
            <span class="w-10 text-right">{{ formatMs(currentTimeMs) }}</span>
            <input
              class="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/22 accent-white"
              type="range"
              min="0"
              :max="Math.max(durationMs, 1)"
              :value="Math.min(currentTimeMs, durationMs || 0)"
              @input="seekByInput"
            />
            <span class="w-10">{{ formatMs(durationMs) }}</span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2">
          <button
            class="rounded-full border border-white/35 px-2 py-1 text-[11px] text-white/85 transition hover:bg-white/12"
            type="button"
            @click="cyclePlayMode"
          >
            {{ playModeLabel }}
          </button>
          <button
            class="rounded-full border border-white/35 px-2 py-1 text-[11px] text-white/85 transition hover:bg-white/12"
            type="button"
            @click="togglePlaylistPanel"
          >
            播放列表
          </button>
          <SpeakerWaveIcon class="h-4 w-4 text-white/70" />
          <input
            class="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-white/22 accent-white"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="volume"
            @input="changeVolume"
          />
        </div>
      </div>

      <div class="flex h-[84px] items-center justify-between gap-3 px-3 md:hidden">
        <Transition name="track-swap" mode="out-in">
          <div :key="songTransitionKey" class="flex min-w-0 items-center gap-3">
            <div class="h-11 w-11 overflow-hidden rounded-lg bg-white/20">
              <img v-if="coverUrl" :src="coverUrl" alt="cover" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-white">{{ songName || '未在播放' }}</p>
              <ArtistLinks
                :artists="artistList"
                container-class="text-xs text-white/72"
                link-class="hover:text-white hover:underline"
                separator-class="text-white/55"
                fallback-class="text-white/72"
              />
            </div>
          </div>
        </Transition>

        <div class="flex items-center gap-2">
          <button
            class="grid h-8 w-8 place-items-center rounded-full border border-white/35 bg-white/8 text-white disabled:opacity-50"
            type="button"
            :disabled="!canPlayPrev"
            @click="playPrevSong"
          >
            <BackwardIcon class="h-4 w-4" />
          </button>
          <button
            class="grid h-9 w-9 place-items-center rounded-full border border-white/35 bg-white text-stone-900"
            type="button"
            :disabled="!hasSong"
            @click="togglePlay"
          >
            <PauseIcon v-if="isPlaying" class="h-4 w-4" />
            <PlayIcon v-else class="h-4 w-4" />
          </button>
          <button
            class="grid h-8 w-8 place-items-center rounded-full border border-white/35 bg-white/8 text-white disabled:opacity-50"
            type="button"
            :disabled="!canPlayNext"
            @click="playNextSong"
          >
            <ForwardIcon class="h-4 w-4" />
          </button>
          <button
            class="rounded-full border border-white/35 px-2 py-1 text-[10px] text-white/85"
            type="button"
            @click="cyclePlayMode"
          >
            {{ playModeLabel }}
          </button>
          <button
            class="rounded-full border border-white/35 px-2 py-1 text-[10px] text-white/85"
            type="button"
            @click="togglePlaylistPanel"
          >
            列表
          </button>
          <input
            class="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-white/22 accent-white"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="volume"
            @input="changeVolume"
          />
        </div>
      </div>

    </div>

    <Teleport to="body">
      <Transition name="playlist-dialog">
        <div
          v-if="playlistPanelOpen"
          class="playlist-dialog-backdrop fixed inset-0 z-[1001] bg-black/35 p-4 backdrop-blur-[2px]"
          @click.self="closePlaylistPanel"
        >
          <div class="playlist-dialog-panel mx-auto mt-[12vh] w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
            <div class="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <div>
                <p class="text-sm font-semibold text-stone-900">播放列表</p>
                <p class="text-xs text-stone-500">队列 {{ playQueue.length }} 首 · {{ playModeLabel }}</p>
              </div>
              <button
                class="grid h-8 w-8 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100"
                type="button"
                @click="closePlaylistPanel"
              >
                <XMarkIcon class="h-4 w-4" />
              </button>
            </div>

            <div class="max-h-[56vh] overflow-y-auto p-2">
              <button
                v-for="(song, index) in playQueue"
                :key="song.id || index"
                class="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition"
                :class="index === currentQueueIndex ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'"
                type="button"
                @click="playSongAtIndex(index)"
              >
                <span class="w-5 shrink-0 text-xs">{{ index + 1 }}</span>
                <span class="truncate text-sm">{{ song.name || '未知歌曲' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <audio
      ref="audioRef"
      :src="audioSrc"
      preload="metadata"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
    />
  </div>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {XMarkIcon} from '@heroicons/vue/24/outline'
import {BackwardIcon, ForwardIcon, PauseIcon, PlayIcon, SpeakerWaveIcon} from '@heroicons/vue/24/solid'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import {PLAY_MODE, usePlayerStore} from '@/stores/playerStore.js'
import {playQueueByDirection, playQueueByIndex} from '@/utils/globalPlayer.js'

const playerStore = usePlayerStore()
const audioRef = ref(null)
const playerRootRef = ref(null)
let playerResizeObserver = null

const hasSong = computed(() => playerStore.hasSong)
const songName = computed(() => playerStore.currentSong?.name || '')
const artistList = computed(() => playerStore.currentSong?.artists || [])
const coverUrl = computed(() => playerStore.currentSong?.cover || '')
const audioSrc = computed(() => playerStore.currentSong?.url || '')
const isPlaying = computed(() => playerStore.isPlaying)
const currentTimeMs = computed(() => playerStore.currentTimeMs)
const durationMs = computed(() => playerStore.durationMs)
const volume = computed(() => playerStore.volume)
const playQueue = computed(() => playerStore.playQueue)
const currentQueueIndex = computed(() => playerStore.currentQueueIndex)
const playlistPanelOpen = computed(() => playerStore.playlistPanelOpen)
const songTransitionKey = computed(() => {
  const song = playerStore.currentSong || {}
  return `${song.id || 'none'}-${song.url || ''}-${song.name || ''}`
})

const playModeLabel = computed(() => {
  if (playerStore.playMode === PLAY_MODE.SINGLE) return '单曲循环'
  if (playerStore.playMode === PLAY_MODE.SHUFFLE) return '随机播放'
  return '顺序播放'
})

const canPlayPrev = computed(() => {
  if (!playQueue.value.length) return false
  if (playerStore.playMode === PLAY_MODE.SHUFFLE) return playQueue.value.length > 1
  return currentQueueIndex.value > 0
})

const canPlayNext = computed(() => {
  if (!playQueue.value.length) return false
  if (playerStore.playMode === PLAY_MODE.SHUFFLE) return playQueue.value.length > 1
  return currentQueueIndex.value >= 0 && currentQueueIndex.value < playQueue.value.length - 1
})

function formatMs(ms) {
  const sec = Math.floor((ms || 0) / 1000)
  const min = Math.floor(sec / 60)
  const remain = String(sec % 60).padStart(2, '0')
  return `${min}:${remain}`
}

function syncAudioVolume() {
  if (!audioRef.value) return
  audioRef.value.volume = volume.value
}

async function ensurePlaybackState() {
  if (!audioRef.value) return
  if (playerStore.autoPlayOnLoad || playerStore.isPlaying) {
    try {
      await audioRef.value.play()
      playerStore.autoPlayOnLoad = false
    } catch {
      playerStore.setPlaying(false)
    }
  } else {
    audioRef.value.pause()
  }
}

function togglePlay() {
  if (!audioRef.value || !hasSong.value) return
  if (audioRef.value.paused) {
    audioRef.value.play().catch(() => {})
  } else {
    audioRef.value.pause()
  }
}

function seekByInput(event) {
  if (!audioRef.value) return
  const nextMs = Number(event?.target?.value || 0)
  audioRef.value.currentTime = nextMs / 1000
  playerStore.setCurrentTimeMs(nextMs)
}

function changeVolume(event) {
  playerStore.setVolume(event?.target?.value)
  syncAudioVolume()
}

function cyclePlayMode() {
  playerStore.cyclePlayMode()
}

function togglePlaylistPanel() {
  playerStore.togglePlaylistPanel()
}

function closePlaylistPanel() {
  playerStore.setPlaylistPanelOpen(false)
}

async function playPrevSong() {
  if (!canPlayPrev.value) return
  await playQueueByDirection('prev')
}

async function playNextSong() {
  if (!canPlayNext.value) return
  await playQueueByDirection('next')
}

async function playSongAtIndex(index) {
  await playQueueByIndex(index)
  closePlaylistPanel()
}

function onLoadedMetadata() {
  if (!audioRef.value) return
  playerStore.setDurationMs(Math.floor((audioRef.value.duration || 0) * 1000))
  syncAudioVolume()
}

function onTimeUpdate() {
  if (!audioRef.value) return
  playerStore.setCurrentTimeMs(Math.floor((audioRef.value.currentTime || 0) * 1000))
}

function onPlay() {
  playerStore.setPlaying(true)
}

function onPause() {
  playerStore.setPlaying(false)
}

function updatePlayerSpaceVar() {
  const el = playerRootRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const bottom = Number.parseFloat(getComputedStyle(el).bottom || '0') || 0
  const safeSpace = Math.ceil(rect.height + bottom + 8)
  document.documentElement.style.setProperty('--global-player-space', `${safeSpace}px`)
}

async function onEnded() {
  if (!audioRef.value) return

  if (playerStore.playMode === PLAY_MODE.SINGLE && hasSong.value) {
    audioRef.value.currentTime = 0
    audioRef.value.play().catch(() => {})
    return
  }

  const played = await playQueueByDirection('next', {trigger: 'ended'})
  if (!played) {
    playerStore.setPlaying(false)
  }
}

watch(
  audioSrc,
  async () => {
    playerStore.setDurationMs(0)
    playerStore.setCurrentTimeMs(0)
    await nextTick()
    syncAudioVolume()
    ensurePlaybackState()
  },
  {immediate: true},
)

watch(
  () => playerStore.isPlaying,
  () => {
    ensurePlaybackState()
  },
)

onMounted(() => {
  updatePlayerSpaceVar()
  playerResizeObserver = new ResizeObserver(() => {
    updatePlayerSpaceVar()
  })
  if (playerRootRef.value) {
    playerResizeObserver.observe(playerRootRef.value)
  }
  window.addEventListener('resize', updatePlayerSpaceVar)
})

onBeforeUnmount(() => {
  if (playerResizeObserver) {
    playerResizeObserver.disconnect()
    playerResizeObserver = null
  }
  window.removeEventListener('resize', updatePlayerSpaceVar)
})
</script>

<style scoped>
.track-swap-enter-active,
.track-swap-leave-active {
  transition: opacity 0.2s ease, transform 0.24s ease;
}

.track-swap-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}

.track-swap-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.playlist-dialog-enter-active,
.playlist-dialog-leave-active {
  transition: opacity 0.22s ease;
}

.playlist-dialog-enter-from,
.playlist-dialog-leave-to {
  opacity: 0;
}

.playlist-dialog-enter-active .playlist-dialog-panel,
.playlist-dialog-leave-active .playlist-dialog-panel {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.playlist-dialog-enter-from .playlist-dialog-panel,
.playlist-dialog-leave-to .playlist-dialog-panel {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}
</style>
