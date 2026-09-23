<template>
  <button
    class="song-row"
    :class="{ 'song-row-compact': compact, 'song-row-album': showAlbum, 'is-current': isCurrent }"
    type="button"
    :aria-label="`播放歌曲：${title}`"
    :aria-current="isCurrent ? 'true' : undefined"
    :aria-busy="isStarting"
    :disabled="isStarting"
    @click="emit('play', song, index)"
  >
    <span v-if="showIndex" class="song-index">
      <span class="song-index-num">{{ String(index + 1).padStart(2, '0') }}</span>
      <span class="song-index-play" aria-hidden="true">
        <span v-if="isStarting" class="song-play-spinner" />
        <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      </span>
    </span>
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
      <ArtistLinks
        class="song-artist"
        :artists="artistItems"
        container-class="min-w-0 truncate"
        link-class="hover:text-zinc-800 hover:underline"
      />
    </span>
    <span v-if="showAlbum" class="song-album">{{ album }}</span>
    <span v-if="duration" class="song-duration">{{ duration }}</span>
    <span class="song-play" :class="{ 'is-loading': isStarting }" aria-hidden="true">
      <span v-if="isStarting" class="song-play-spinner" />
      <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
    </span>
  </button>
</template>

<script setup>
import {computed} from 'vue'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import {usePlayerStore} from '@/stores/playerStore.js'

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
  showAlbum: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['play'])
const playerStore = usePlayerStore()
const title = computed(() => props.song?.name || props.song?.song?.name || '未知歌曲')
const isStarting = computed(() => String(playerStore.playbackPendingId || '') === String(props.song?.id || ''))
const isCurrent = computed(() => Boolean(props.song?.id) && String(playerStore.currentSong?.id || '') === String(props.song?.id))
const cover = computed(() => (
  props.song?.cover
  || props.song?.picUrl
  || props.song?.al?.picUrl
  || props.song?.album?.picUrl
  || props.song?.song?.album?.picUrl
  || ''
))
const artistItems = computed(() => {
  const song = props.song?.song || props.song || {}
  const candidates = [props.song?.artists, props.song?.ar, song?.artists, song?.ar]
  return candidates.find(items => Array.isArray(items) && items.length) || song?.artistName || props.song?.artistName || []
})
const album = computed(() => (
  props.song?.album?.name
  || props.song?.al?.name
  || props.song?.song?.album?.name
  || ''
))
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

.song-row:disabled { cursor: wait; }

.song-index {
  position: relative;
  display: grid;
  place-items: center;
  width: 30px;
  height: 22px;
  color: #a1a1aa;
  font-size: 11px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.song-index-num,
.song-index-play { grid-area: 1 / 1; display: grid; place-items: center; transition: opacity 160ms ease, transform 160ms ease; }
.song-index-play { opacity: 0; transform: scale(0.82); color: #52525b; }
.song-index-play svg { width: 13px; height: 13px; margin-left: 1px; }

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

/* 搜索页专辑列变体：单列 + 序号⇄播放的 hover 变形（默认首页不受影响） */
.song-album { overflow: hidden; color: #a1a1aa; font-size: 11px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.song-row-album { grid-template-columns: 34px 52px minmax(0, 1.7fr) minmax(0, 1fr) 52px; }
.song-row-album .song-play { display: none; }
.song-row-album:hover .song-index-num,
.song-row-album.is-current .song-index-num { opacity: 0; transform: scale(0.82); }
.song-row-album:hover .song-index-play,
.song-row-album.is-current .song-index-play,
.song-row-album[aria-busy='true'] .song-index-play { opacity: 1; transform: none; }

/* 当前播放曲目：克制的强调态 */
.song-row.is-current { border-color: rgba(232, 87, 105, 0.14); background: rgba(232, 87, 105, 0.06); }
.song-row.is-current .song-title { color: #e85769; }
.song-row.is-current .song-index-num { color: #e85769; }

@media (hover: none) {
  .song-row-album { grid-template-columns: 52px minmax(0, 1fr) 34px; }
  .song-row-album .song-index,
  .song-row-album .song-album { display: none; }
  .song-row-album .song-play { display: grid; }
}

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
.song-play-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: song-play-spin 700ms linear infinite;
}

@keyframes song-play-spin { to { transform: rotate(360deg); } }

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
  .song-play-spinner { animation-duration: 1.4s; }
}
</style>
