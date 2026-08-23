<template>
  <button
    class="song-row"
    :class="{ 'song-row-compact': compact }"
    type="button"
    :aria-label="`播放歌曲：${title}`"
    @click="emit('play', song, index)"
  >
    <span v-if="showIndex" class="song-index">{{ String(index + 1).padStart(2, '0') }}</span>
    <span class="song-cover">
      <SmartMedia
        :src="cover"
        :alt="`${title}封面`"
        :image-width="128"
        sizes="56px"
        class="song-image"
      />
    </span>
    <span class="song-copy">
      <span class="song-title">{{ title }}</span>
      <span class="song-artist">{{ artist }}</span>
    </span>
    <span v-if="duration" class="song-duration">{{ duration }}</span>
    <span class="song-play" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
    </span>
  </button>
</template>

<script setup>
import {computed} from 'vue'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'

const props = defineProps({
  song: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    default: 0,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  showIndex: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['play'])
const title = computed(() => props.song?.name || props.song?.song?.name || '未知歌曲')
const cover = computed(() => (
  props.song?.cover
  || props.song?.picUrl
  || props.song?.al?.picUrl
  || props.song?.album?.picUrl
  || props.song?.song?.album?.picUrl
  || ''
))
const artist = computed(() => {
  const list = props.song?.artists || props.song?.ar || props.song?.song?.artists || props.song?.song?.ar || []
  const names = list.map((item) => item?.name || item).filter(Boolean)
  return names.join(' / ') || '未知艺人'
})
const duration = computed(() => {
  const milliseconds = Number(props.song?.dt || props.song?.duration || props.song?.song?.duration || 0)
  if (!milliseconds) return ''
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})
</script>

<style scoped>
.song-row {
  display: grid;
  grid-template-columns: 30px 52px minmax(0, 1fr) auto 38px;
  width: 100%;
  align-items: center;
  gap: 13px;
  padding: 10px 12px;
  cursor: pointer;
  text-align: left;
  border: 1px solid transparent;
  border-radius: 18px;
  background: transparent;
  transition: background 180ms ease, border-color 180ms ease, transform 180ms ease;
}

.song-row:hover,
.song-row:focus-visible {
  border-color: rgba(24, 24, 27, 0.045);
  background: rgba(255, 255, 255, 0.72);
  transform: translateX(3px);
  outline: none;
}

.song-index {
  color: #a1a1aa;
  font-size: 11px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.song-cover {
  display: block;
  width: 52px;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 13px;
  background: #e4e4e7;
  box-shadow: 0 7px 18px rgba(24, 24, 27, 0.09);
}

.song-image { width: 100%; height: 100%; object-fit: cover; }
.song-copy { min-width: 0; }
.song-title,
.song-artist { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.song-title { color: #27272a; font-size: 13px; font-weight: 780; }
.song-artist { margin-top: 4px; color: #a1a1aa; font-size: 11px; font-weight: 620; }
.song-duration { color: #a1a1aa; font-size: 11px; font-weight: 650; font-variant-numeric: tabular-nums; }

.song-play {
  display: grid;
  width: 32px;
  aspect-ratio: 1;
  place-items: center;
  color: #52525b;
  border: 1px solid rgba(24, 24, 27, 0.06);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.74);
}

.song-play svg { width: 12px; height: 12px; margin-left: 2px; }

.song-row-compact {
  grid-template-columns: 48px minmax(0, 1fr) 34px;
  padding: 9px 4px;
  border-radius: 14px;
}

.song-row-compact .song-cover { width: 48px; border-radius: 12px; }
.song-row-compact .song-index,
.song-row-compact .song-duration { display: none; }
.song-row-compact .song-play { width: 30px; }

@media (max-width: 560px) {
  .song-row { grid-template-columns: 44px minmax(0, 1fr) 34px; padding-inline: 6px; }
  .song-row .song-index,
  .song-row .song-duration { display: none; }
  .song-cover { width: 44px; border-radius: 11px; }
}

@media (prefers-reduced-motion: reduce) {
  .song-row { transition: none; }
}
</style>
