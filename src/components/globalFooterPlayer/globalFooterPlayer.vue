<template>
  <div class="fixed inset-x-0 bottom-3 z-[70] px-3 sm:bottom-4 sm:px-4" role="region" aria-label="全局播放器">
    <div class="mx-auto max-w-6xl rounded-2xl border border-stone-200/90 bg-white/92 shadow-[0_10px_28px_rgba(15,23,42,0.16)] backdrop-blur-xl">
      <div class="hidden h-[86px] grid-cols-[minmax(0,1fr)_minmax(360px,520px)_minmax(0,1fr)] items-center gap-4 px-5 md:grid">
        <div class="flex min-w-0 items-center gap-3">
          <div class="h-12 w-12 overflow-hidden rounded-lg bg-stone-100">
            <img v-if="coverUrl" :src="coverUrl" alt="cover" class="h-full w-full object-cover" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-stone-900">{{ songName || '未在播放' }}</p>
            <ArtistLinks
              :artists="artistList"
              container-class="text-xs text-stone-500"
              link-class="hover:text-stone-800 hover:underline"
              separator-class="text-stone-400"
              fallback-class="text-stone-500"
            />
          </div>
        </div>

        <div class="flex flex-col items-center gap-1.5">
          <div class="flex items-center gap-4">
            <button
              class="grid h-8 w-8 place-items-center rounded-full border border-stone-300 text-stone-500 transition hover:bg-stone-100/80 disabled:opacity-50"
              type="button"
              disabled
            >
              <BackwardIcon class="h-4 w-4" />
            </button>
            <button
              class="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-stone-900 to-stone-700 text-white transition hover:from-black hover:to-stone-800 disabled:opacity-40"
              type="button"
              :disabled="!hasSong"
              @click="togglePlay"
            >
              <PauseIcon v-if="isPlaying" class="h-5 w-5" />
              <PlayIcon v-else class="h-5 w-5" />
            </button>
            <button
              class="grid h-8 w-8 place-items-center rounded-full border border-stone-300 text-stone-500 transition hover:bg-stone-100/80 disabled:opacity-50"
              type="button"
              disabled
            >
              <ForwardIcon class="h-4 w-4" />
            </button>
          </div>

          <div class="flex w-full items-center gap-2 text-[11px] text-stone-500">
            <span class="w-10 text-right">{{ formatMs(currentTimeMs) }}</span>
            <input
              class="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-stone-200 accent-rose-500"
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
          <SpeakerWaveIcon class="h-4 w-4 text-stone-500" />
          <input
            class="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-700"
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
        <div class="flex min-w-0 items-center gap-3">
          <div class="h-11 w-11 overflow-hidden rounded-lg bg-stone-100">
            <img v-if="coverUrl" :src="coverUrl" alt="cover" class="h-full w-full object-cover" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-stone-900">{{ songName || '未在播放' }}</p>
            <ArtistLinks
              :artists="artistList"
              container-class="text-xs text-stone-500"
              link-class="hover:text-stone-800 hover:underline"
              separator-class="text-stone-400"
              fallback-class="text-stone-500"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="grid h-9 w-9 place-items-center rounded-full border border-stone-300 bg-white text-stone-600"
            type="button"
            :disabled="!hasSong"
            @click="togglePlay"
          >
            <PauseIcon v-if="isPlaying" class="h-4 w-4" />
            <PlayIcon v-else class="h-4 w-4" />
          </button>
          <input
            class="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-700"
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

    <audio
      ref="audioRef"
      :src="audioSrc"
      preload="metadata"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="onPause"
    />
  </div>
</template>

<script setup>
import {computed, nextTick, ref, watch} from 'vue'
import {BackwardIcon, ForwardIcon, PauseIcon, PlayIcon, SpeakerWaveIcon} from '@heroicons/vue/24/solid'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import {usePlayerStore} from '@/stores/playerStore.js'

const playerStore = usePlayerStore()
const audioRef = ref(null)

const hasSong = computed(() => playerStore.hasSong)
const songName = computed(() => playerStore.currentSong?.name || '')
const artistList = computed(() => playerStore.currentSong?.artists || [])
const coverUrl = computed(() => playerStore.currentSong?.cover || '')
const audioSrc = computed(() => playerStore.currentSong?.url || '')
const isPlaying = computed(() => playerStore.isPlaying)
const currentTimeMs = computed(() => playerStore.currentTimeMs)
const durationMs = computed(() => playerStore.durationMs)
const volume = computed(() => playerStore.volume)

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
</script>
