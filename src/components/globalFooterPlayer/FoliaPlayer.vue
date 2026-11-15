<template>
  <section class="folia-player amll-wrapper" :class="{'is-opened': opened, 'has-pointer-activity': exitVisible}" :aria-hidden="!opened" :inert="!opened" @pointermove.capture="showExitButton" @pointerdown.capture="showExitButton" @pointerleave="hideExitButton">
    <div v-if="opened" ref="surface" class="folia-surface" tabindex="-1" data-folia-surface />
    <button v-if="opened" type="button" class="folia-exit" data-player-close aria-label="退出全屏播放器" @click.stop="emit('close')">
      <ChevronDownIcon aria-hidden="true" /><span>退出全屏</span>
    </button>
    <p v-if="error" class="folia-error" role="alert">主题加载失败 <button type="button" @click="mountRenderer">重新加载</button></p>
  </section>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, ref, watch} from 'vue'
import {ChevronDownIcon} from '@/components/icons'
import {toFoliaLines} from '@/utils/player/foliaTimeline.js'
import {usePlayerAppearance} from '@/composables/usePlayerAppearance.js'
import {useCappellaAvatars} from '@/composables/useCappellaAvatars.js'

const props = defineProps({opened: Boolean, playing: Boolean, mode: {type: String, default: 'stage'},
  musicName: {type: String, default: ''}, musicArtists: {type: Array, default: () => []}, cover: {type: String, default: ''},
  trackKey: {type: String, default: ''}, prevTitle: {type: String, default: ''}, nextTitle: {type: String, default: ''},
  lyricLines: {type: Array, default: () => []}, currentTimeMs: {type: Number, default: 0}, duration: {type: Number, default: 0},
  playMode: {type: String, default: 'sequence'}, canPrev: Boolean, canNext: Boolean,
  clock: {type: Function, default: null}, bands: {type: Function, default: null},
  lyricLeadMs: {type: Number, default: 320}, reducedMotion: Boolean,
})
const emit = defineEmits(['close', 'play-or-pause', 'prev', 'next', 'seek', 'cycle-repeat', 'open-playlist'])
const surface = ref(null)
const error = ref(false)
const exitVisible = ref(false)
let exitHideTimer = 0
function hideExitButton() {
  clearTimeout(exitHideTimer)
  exitHideTimer = 0
  exitVisible.value = false
}
function showExitButton() {
  if (!props.opened) return
  clearTimeout(exitHideTimer)
  exitVisible.value = true
  exitHideTimer = window.setTimeout(hideExitButton, 2500)
}
const lines = computed(() => toFoliaLines(props.lyricLines))
const {foliaBackground} = usePlayerAppearance()
const {userAvatar, artistAvatar} = useCappellaAvatars(props)
const callbacks = {onClose: () => emit('close'), onTogglePlay: () => emit('play-or-pause'), onPrev: () => emit('prev'),
  onNext: () => emit('next'), onSeek: ms => emit('seek', ms), onCycleRepeat: () => emit('cycle-repeat'),
  onPlaylist: () => emit('open-playlist'), onReady: () => {
    error.value = false
    requestAnimationFrame(() => {
      if (!props.opened || surface.value?.closest('[data-player-amll-host]')?.contains(document.activeElement)) return
      surface.value?.querySelector('.folia-play-button')?.focus({preventScroll: true})
      if (!surface.value?.contains(document.activeElement)) surface.value?.focus({preventScroll: true})
    })
  }, onError: failure => {console.error('Folia renderer', failure); error.value = true}}
const options = computed(() => ({...props, backgroundMode: foliaBackground.value, lines: lines.value,
  userAvatar: userAvatar.value, artistAvatar: artistAvatar.value,
  artistNames: props.musicArtists.map(artist => typeof artist === 'string' ? artist : artist?.name || artist?.artistName).filter(Boolean).join(' / '), ...callbacks}))
let renderer = null
let turn = 0
async function mountRenderer() {
  const generation = ++turn
  renderer?.dispose(); renderer = null; error.value = false
  if (!props.opened) return
  await nextTick()
  try {
    const {createFoliaRenderer} = await import('./folia/createFoliaRenderer.js')
    if (generation !== turn || !props.opened || !surface.value) return
    renderer = createFoliaRenderer(surface.value, options.value)
  } catch (failure) {
    if (generation === turn && props.opened) callbacks.onError(failure)
  }
}
watch(() => props.opened, opened => {
  hideExitButton()
  if (opened) showExitButton()
  void mountRenderer()
}, {immediate: true})
watch(options, next => renderer?.update(next))
onBeforeUnmount(() => {turn++; hideExitButton(); renderer?.dispose()})
</script>

<style scoped>
.folia-player { position: fixed; inset: 0; z-index: 1300; overflow: hidden; background: #0f172a; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .3s ease; }
.folia-player.is-opened { opacity: 1; visibility: visible; pointer-events: auto; }
.folia-exit { position: absolute; top: max(24px, env(safe-area-inset-top)); left: max(24px, env(safe-area-inset-left)); z-index: 80; display: flex; min-height: 44px; align-items: center; gap: 8px; padding: 10px 16px; border: 1px solid rgb(255 255 255 / .24); border-radius: 999px; color: #fff; background: rgb(15 23 42 / .72); box-shadow: 0 4px 20px rgb(0 0 0 / .2); backdrop-filter: blur(12px); font: 600 14px/1.5 system-ui, sans-serif; cursor: pointer; opacity: 0; transform: translateY(-4px); pointer-events: none; transition: opacity 180ms ease, transform 180ms ease, background 150ms ease; }
.folia-exit svg { width: 20px; height: 20px; flex-shrink: 0; }
.has-pointer-activity .folia-exit, .folia-exit:focus-visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
.folia-exit:hover { background: rgb(30 41 59 / .9); }
.folia-exit:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
.folia-error { position: absolute; inset: 45% 20%; z-index: 80; text-align: center; color: white; }
.folia-error button { margin-left: 12px; text-decoration: underline; }
@media (max-width: 640px) { .folia-exit { top: max(16px, env(safe-area-inset-top)); left: max(16px, env(safe-area-inset-left)); } }
@media (hover: none) { .folia-exit { opacity: 1; transform: none; pointer-events: auto; } }
@media (prefers-reduced-motion: reduce) { .folia-player, .folia-exit { transition: none; } }
</style>
