<template>
  <div class="player-progress" :class="{ 'is-compact': compact }">
    <span class="progress-time is-current">{{ formatMs(displayTimeMs) }}</span>
    <div class="progress-control" :style="rangeStyle">
      <div class="progress-visual" aria-hidden="true">
        <span class="progress-rail">
          <span class="progress-fill"/>
        </span>
        <span class="progress-thumb"/>
      </div>
      <input
        class="progress-range"
        type="range"
        min="0"
        step="1"
        :max="Math.max(durationMs, 1)"
        :value="safeDisplayTimeMs"
        aria-label="播放进度"
        @pointerdown="beginSeeking"
        @pointerup="endSeeking"
        @pointercancel="endSeeking"
        @input="previewSeek"
        @change="commitSeek"
      >
    </div>
    <span class="progress-time is-duration">{{ formatMs(durationMs) }}</span>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {formatMs} from '@/utils/player/playerMedia.js'

const props = defineProps({
  currentTimeMs: {type: Number, default: 0},
  durationMs: {type: Number, default: 0},
  playing: {type: Boolean, default: false},
  clock: {type: Function, default: null},
  compact: {type: Boolean, default: false},
})

const emit = defineEmits(['seek'])
const displayTimeMs = ref(Math.max(0, Number(props.currentTimeMs || 0)))
const seeking = ref(false)
let clockFrame = 0

const safeDisplayTimeMs = computed(() => {
  const duration = Math.max(0, Number(props.durationMs || 0))
  return Math.min(Math.max(0, displayTimeMs.value), duration || 0)
})

const rangeStyle = computed(() => {
  const duration = Math.max(0, Number(props.durationMs || 0))
  const progress = duration > 0 ? Math.min(100, (safeDisplayTimeMs.value / duration) * 100) : 0
  return {
    '--progress': `${progress}%`,
    '--progress-scale': progress / 100,
    '--thumb-offset': `${-progress}%`,
  }
})

function readClock() {
  // The media element is still at zero while a saved, paused track is loading.
  if (!props.playing) return Number(props.currentTimeMs || 0)
  const liveTime = Number(props.clock?.())
  return Number.isFinite(liveTime) ? liveTime : Number(props.currentTimeMs || 0)
}

function syncFromClock() {
  if (seeking.value) return
  const duration = Math.max(0, Number(props.durationMs || 0))
  displayTimeMs.value = Math.min(Math.max(0, readClock()), duration || 0)
}

function tickClock() {
  syncFromClock()
  if (!props.playing) {
    clockFrame = 0
    return
  }
  clockFrame = window.requestAnimationFrame(tickClock)
}

function startClock() {
  if (clockFrame || typeof window === 'undefined') return
  clockFrame = window.requestAnimationFrame(tickClock)
}

function stopClock() {
  if (!clockFrame || typeof window === 'undefined') return
  window.cancelAnimationFrame(clockFrame)
  clockFrame = 0
}

function beginSeeking() {
  seeking.value = true
}

function previewSeek(event) {
  seeking.value = true
  const nextTime = Number(event?.target?.value || 0)
  displayTimeMs.value = nextTime
  emit('seek', nextTime)
}

function endSeeking() {
  seeking.value = false
  syncFromClock()
}

function commitSeek(event) {
  const nextTime = Number(event?.target?.value || 0)
  displayTimeMs.value = nextTime
  emit('seek', nextTime)
  endSeeking()
}

watch(() => props.playing, (playing) => {
  if (playing) startClock()
  else {
    stopClock()
    syncFromClock()
  }
}, {immediate: true})

watch(() => props.currentTimeMs, (nextTime) => {
  if (seeking.value) return
  if (!props.playing || Math.abs(Number(nextTime || 0) - displayTimeMs.value) > 1200) {
    displayTimeMs.value = Math.max(0, Number(nextTime || 0))
  }
})

watch(() => props.durationMs, () => syncFromClock())

onMounted(() => {
  syncFromClock()
  if (props.playing) startClock()
})

onBeforeUnmount(stopClock)
</script>

<style scoped>
.player-progress {
  box-sizing: border-box;
  display: grid;
  width: 100%;
  min-width: 0;
  align-items: center;
  grid-template-columns: max-content minmax(80px, 1fr) max-content;
  gap: 10px;
  padding-inline: 2px;
}

.progress-time {
  min-width: 32px;
  color: rgba(var(--player-fg-muted), 0.9);
  font-size: 10px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.progress-time.is-current { text-align: right; }
.progress-time.is-duration { text-align: left; }

.progress-control {
  --progress: 0%;
  --progress-scale: 0;
  --thumb-offset: 0%;

  position: relative;
  width: 100%;
  height: 20px;
  min-width: 0;
}

.progress-visual {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.progress-rail {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(var(--player-fg), 0.2);
  box-shadow: inset 0 1px 1px rgba(15, 23, 42, 0.08);
  transform: translateY(-50%);
}

.progress-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgba(var(--player-fg), 0.94);
  transform: scaleX(var(--progress-scale));
  transform-origin: left center;
  will-change: transform;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  left: var(--progress);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgb(var(--player-fg));
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.26);
  transform: translate3d(var(--thumb-offset), -50%, 0);
  will-change: left, transform;
  transition: box-shadow 160ms ease, scale 160ms ease;
}

.progress-range {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 20px;
  margin: 0;
  padding: 0;
  appearance: none;
  cursor: pointer;
  outline: none;
  opacity: 0;
  background: transparent;
}

.progress-control:hover .progress-thumb,
.progress-control:focus-within .progress-thumb {
  box-shadow: 0 0 0 4px rgba(var(--player-fg), 0.13), 0 2px 8px rgba(15, 23, 42, 0.28);
  scale: 1.08;
}

.progress-control:focus-within {
  border-radius: 999px;
  box-shadow: 0 0 0 3px rgba(var(--player-fg), 0.12);
}

.player-progress.is-compact {
  grid-template-columns: max-content minmax(60px, 1fr) max-content;
  gap: 7px;
}

.player-progress.is-compact .progress-time { font-size: 9px; }

@media (prefers-reduced-motion: reduce) {
  .progress-thumb { transition: none; }
}
</style>
