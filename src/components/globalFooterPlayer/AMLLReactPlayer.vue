<template>
  <div
    class="amll-wrapper"
    :class="{ 'is-opened': opened }"
    :aria-hidden="opened ? 'false' : 'true'"
    :inert="!opened"
    :style="{ zIndex: 3000 }"
  >
    <div
      ref="reactMountRef"
      class="amll-react-mount"
      data-player-amll-react-mount
      @pointerdown.capture="onLyricPointerDown"
      @pointermove.capture="onLyricPointerMove"
      @pointerup.capture="clearLongPress"
      @pointercancel.capture="clearLongPress"
      @click.capture="onCapturedClick"
    />
  </div>
</template>

<script setup>
import {createElement as createReactElement} from 'react'
import {flushSync} from 'react-dom'
import {createRoot} from 'react-dom/client'
import {Provider, createStore} from 'jotai'
import {
  PrebuiltLyricPlayer,
  RepeatMode,
  hideLyricViewAtom,
  isLyricPageOpenedAtom,
  isRepeatEnabledAtom,
  isShuffleActiveAtom,
  isShuffleEnabledAtom,
  lowFreqVolumeAtom,
  musicAlbumNameAtom,
  musicArtistsAtom,
  musicCoverAtom,
  musicCoverIsVideoAtom,
  musicDurationAtom,
  musicLyricLinesAtom,
  musicNameAtom,
  musicPlayingAtom,
  musicPlayingPositionAtom,
  musicQualityTagAtom,
  musicVolumeAtom,
  onChangeVolumeAtom,
  onClickAudioQualityTagAtom,
  onClickControlThumbAtom,
  onCycleRepeatModeAtom,
  onLyricLineClickAtom,
  onLyricLineContextMenuAtom,
  onPlayOrResumeAtom,
  onRequestNextSongAtom,
  onRequestOpenMenuAtom,
  onRequestPrevSongAtom,
  onSeekPositionAtom,
  onToggleShuffleAtom,
  repeatModeAtom,
} from '@applemusic-like-lyrics/react-full'
import {onBeforeUnmount, onMounted, ref, watch} from 'vue'

const props = defineProps({
  opened: {type: Boolean, default: false},
  musicName: {type: String, default: ''},
  musicArtists: {type: Array, default: () => []},
  musicAlbum: {type: String, default: ''},
  cover: {type: String, default: ''},
  coverIsVideo: {type: Boolean, default: false},
  lyricLines: {type: Array, default: () => []},
  currentTime: {type: Number, default: 0},
  duration: {type: Number, default: 0},
  playing: {type: Boolean, default: false},
  volume: {type: Number, default: 0.85},
  lowFreqVolume: {type: Number, default: 1},
  playMode: {type: String, default: 'sequence'},
  hideLyricView: {type: Boolean, default: false},
  shareAvailable: {type: Boolean, default: false},
})

const emit = defineEmits([
  'update:opened',
  'update:currentTime',
  'update:volume',
  'update:hideLyricView',
  'play-or-pause',
  'prev',
  'next',
  'line-click',
  'open-playlist',
  'toggle-shuffle',
  'cycle-repeat',
  'audio-quality-click',
  'renderer-error',
  'share-line',
])

const reactMountRef = ref(null)
const reactStore = createStore()
let reactRoot = null
let stopHideLyricsWatch = null
let longPressTimer = 0
let touchStart = null
let suppressClickUntil = 0

function clearLongPress() {
  clearTimeout(longPressTimer)
  touchStart = null
}
function onLyricPointerDown(event) {
  clearLongPress()
  if (event.pointerType === 'mouse' || !event.isPrimary || !props.opened || !props.shareAvailable) return
  const line = event.target.closest?.('.amll-lyric-player [class*="lyricLineWrapper"]')
  if (!line || line.className.includes('bottomLineWrapper')) return
  touchStart = {x: event.clientX, y: event.clientY}
  longPressTimer = window.setTimeout(() => {
    suppressClickUntil = performance.now() + 1000
    line.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true, clientX: event.clientX, clientY: event.clientY}))
    clearLongPress()
  }, 550)
}
function onLyricPointerMove(event) {
  if (touchStart && Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) > 10) clearLongPress()
}
function onCapturedClick(event) {
  if (performance.now() < suppressClickUntil && event.target.closest?.('.amll-lyric-player')) {
    event.preventDefault()
    event.stopImmediatePropagation()
  }
}

watch(() => props.opened, opened => { if (!opened) clearLongPress() })

function clampUnit(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : fallback
}

function normalizeArtists(artists) {
  return (Array.isArray(artists) ? artists : [])
    .map((artist, index) => {
      const name = typeof artist === 'string'
        ? artist.trim()
        : String(artist?.name || artist?.artistName || '').trim()
      if (!name) return null
      return {
        name,
        id: String(typeof artist === 'object' ? artist?.id || artist?.artistId || name : name || index),
      }
    })
    .filter(Boolean)
}

function syncMode() {
  const mode = props.playMode
  reactStore.set(isShuffleActiveAtom, mode === 'shuffle')
  reactStore.set(
    repeatModeAtom,
    mode === 'single' ? RepeatMode.One : RepeatMode.Off,
  )
  reactStore.set(isShuffleEnabledAtom, true)
  reactStore.set(isRepeatEnabledAtom, true)
}

function syncTrack() {
  reactStore.set(musicNameAtom, String(props.musicName || ''))
  reactStore.set(musicArtistsAtom, normalizeArtists(props.musicArtists))
  reactStore.set(musicAlbumNameAtom, String(props.musicAlbum || ''))
  reactStore.set(musicCoverAtom, String(props.cover || ''))
  reactStore.set(musicCoverIsVideoAtom, Boolean(props.coverIsVideo))
}

function configureCallbacks() {
  reactStore.set(onClickControlThumbAtom, {
    onEmit: () => emit('update:opened', false),
  })
  reactStore.set(onClickAudioQualityTagAtom, {
    onEmit: () => emit('audio-quality-click'),
  })
  reactStore.set(onRequestOpenMenuAtom, {
    onEmit: () => emit('open-playlist'),
  })
  reactStore.set(onPlayOrResumeAtom, {
    onEmit: () => emit('play-or-pause'),
  })
  reactStore.set(onRequestPrevSongAtom, {
    onEmit: () => emit('prev'),
  })
  reactStore.set(onRequestNextSongAtom, {
    onEmit: () => emit('next'),
  })
  reactStore.set(onSeekPositionAtom, {
    onEmit: (position) => emit('update:currentTime', Number(position) || 0),
  })
  reactStore.set(onLyricLineClickAtom, {
    onEmit: (event) => emit('line-click', event),
  })
  reactStore.set(onLyricLineContextMenuAtom, {
    onEmit: (event) => {
      event.preventDefault()
      event.stopPropagation()
      const line = event.line?.getLine?.()
      if (line && props.shareAvailable) emit('share-line', line)
    },
  })
  reactStore.set(onChangeVolumeAtom, {
    onEmit: (volume) => emit('update:volume', clampUnit(volume, props.volume)),
  })
  reactStore.set(onToggleShuffleAtom, {
    onEmit: () => emit('toggle-shuffle'),
  })
  reactStore.set(onCycleRepeatModeAtom, {
    onEmit: () => emit('cycle-repeat'),
  })
}

watch(
  () => [
    props.musicName,
    props.musicArtists,
    props.musicAlbum,
    props.cover,
    props.coverIsVideo,
  ],
  syncTrack,
  {immediate: true},
)

watch(
  () => props.lyricLines,
  (lines) => {
    // Vue props are reactive proxies. AMLL clones lyric data with the native
    // structuredClone API during render, which rejects proxies even for [].
    const plainLines = Array.isArray(lines) ? JSON.parse(JSON.stringify(lines)) : []
    reactStore.set(musicLyricLinesAtom, plainLines)
  },
  {immediate: true},
)

watch(
  () => props.currentTime,
  (time) => reactStore.set(musicPlayingPositionAtom, Math.max(0, Number(time) || 0)),
  {immediate: true},
)

watch(
  () => props.duration,
  (duration) => reactStore.set(musicDurationAtom, Math.max(0, Number(duration) || 0)),
  {immediate: true},
)

watch(
  () => props.playing,
  (playing) => reactStore.set(musicPlayingAtom, Boolean(playing)),
  {immediate: true},
)

watch(
  () => props.volume,
  (volume) => reactStore.set(musicVolumeAtom, clampUnit(volume, 0.85)),
  {immediate: true},
)

watch(
  () => props.lowFreqVolume,
  (volume) => reactStore.set(lowFreqVolumeAtom, clampUnit(volume, 1)),
  {immediate: true},
)

watch(
  () => props.opened,
  (opened) => reactStore.set(isLyricPageOpenedAtom, Boolean(opened)),
  {immediate: true},
)

watch(
  () => props.hideLyricView,
  (hidden) => reactStore.set(hideLyricViewAtom, Boolean(hidden)),
  {immediate: true},
)

watch(() => props.playMode, syncMode, {immediate: true})

onMounted(() => {
  try {
    configureCallbacks()
    reactStore.set(musicQualityTagAtom, null)
    stopHideLyricsWatch = reactStore.sub(hideLyricViewAtom, () => {
      emit('update:hideLyricView', reactStore.get(hideLyricViewAtom))
    })
    reactRoot = createRoot(reactMountRef.value, {onUncaughtError: () => emit('renderer-error')})
    // Commit the React tree before the Vue startup task reports readiness.
    flushSync(() => reactRoot.render(
      createReactElement(
        Provider,
        {store: reactStore},
        createReactElement(PrebuiltLyricPlayer, {
          id: 'amll-player-fullscreen',
          className: 'amll-prebuilt',
          style: {width: '100%', height: '100%', backgroundColor: '#222'},
        }),
      ),
    ))
  } catch {
    emit('renderer-error')
  }
})

onBeforeUnmount(() => {
  clearLongPress()
  reactStore.set(isLyricPageOpenedAtom, false)
  stopHideLyricsWatch?.()
  stopHideLyricsWatch = null
  reactRoot?.unmount()
  reactRoot = null
})
</script>

<style>
.amll-wrapper {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  width: 100dvw;
  height: 100dvh;
  isolation: isolate;
  transform-style: flat;
  pointer-events: none;
  transition:
    border-radius 250ms ease,
    transform 500ms cubic-bezier(0.25, 1, 0.5, 1);
  transform: translateY(100%);
  border-radius: 1em 1em 0 0;
  overflow: hidden;
  visibility: hidden;
  background-color: #222;
  color: #fff;
  z-index: 3000;
}

.amll-wrapper.is-opened {
  visibility: visible;
  pointer-events: auto;
  transition:
    border-radius 250ms 250ms ease,
    transform 500ms cubic-bezier(0.25, 1, 0.5, 1);
  transform: translateY(0);
  border-radius: 0;
}

.amll-react-mount {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.amll-wrapper .amll-lyric-player { -webkit-touch-callout: none; }

@media (prefers-reduced-motion: reduce) {
  .amll-wrapper,
  .amll-wrapper.is-opened {
    transition-duration: 1ms;
    transition-delay: 0ms;
  }
}
</style>
