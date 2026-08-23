<template>
  <button
    class="playlist-card"
    type="button"
    :aria-label="`打开歌单：${item?.name || '未命名歌单'}`"
    @click="emit('open', item, $event)"
  >
    <span
      class="playlist-cover"
      data-playlist-hero-cover
      :data-playlist-id="item?.id"
    >
      <SmartMedia
        :src="cover"
        :alt="`${item?.name || '歌单'}封面`"
        :image-width="480"
        sizes="(min-width: 1100px) 20vw, (min-width: 700px) 33vw, 72vw"
        class="playlist-image"
      />
      <span class="playlist-play" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </span>
    <span class="playlist-title">{{ item?.name || '未命名歌单' }}</span>
    <span class="playlist-meta">{{ meta }}</span>
  </button>
</template>

<script setup>
import {computed} from 'vue'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['open'])
const cover = computed(() => props.item?.picUrl || props.item?.coverImgUrl || '')
const meta = computed(() => {
  const count = Number(props.item?.trackCount || 0)
  if (count > 0) return `${count.toLocaleString()} 首歌曲`
  return props.item?.copywriter || props.item?.description || '精选歌单'
})
</script>

<style scoped>
.playlist-card {
  display: block;
  min-width: 0;
  padding: 0;
  cursor: pointer;
  text-align: left;
  border: 0;
  background: transparent;
}

.playlist-cover {
  position: relative;
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid rgba(24, 24, 27, 0.05);
  border-radius: 24px;
  background: #ececee;
  box-shadow: 0 14px 36px rgba(45, 36, 35, 0.07);
  transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 360ms ease;
}

.playlist-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
}

.playlist-play {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: grid;
  width: 42px;
  aspect-ratio: 1;
  place-items: center;
  color: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 24px rgba(24, 24, 27, 0.15);
  opacity: 0;
  transform: translateY(6px) scale(0.88);
  transition: opacity 220ms ease, transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  backdrop-filter: blur(12px);
}

.playlist-play svg { width: 17px; height: 17px; margin-left: 2px; }

.playlist-title,
.playlist-meta { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.playlist-title {
  margin-top: 14px;
  color: #27272a;
  font-size: 14px;
  font-weight: 780;
  letter-spacing: -0.015em;
}

.playlist-meta {
  margin-top: 5px;
  color: #a1a1aa;
  font-size: 11px;
  font-weight: 650;
}

.playlist-card:hover .playlist-cover,
.playlist-card:focus-visible .playlist-cover {
  transform: translateY(-6px);
  box-shadow: 0 24px 48px rgba(45, 36, 35, 0.13);
}

.playlist-card:hover .playlist-image,
.playlist-card:focus-visible .playlist-image { transform: scale(1.04); }

.playlist-card:hover .playlist-play,
.playlist-card:focus-visible .playlist-play { opacity: 1; transform: translateY(0) scale(1); }

.playlist-card:focus-visible { outline: 3px solid rgba(232, 87, 105, 0.22); outline-offset: 5px; border-radius: 24px; }

@media (hover: none) {
  .playlist-play { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .playlist-cover,
  .playlist-image,
  .playlist-play { transition: none; }
}
</style>
