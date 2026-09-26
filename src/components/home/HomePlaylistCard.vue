<template>
  <article
    class="playlist-card"
    :class="{ 'is-search': variant === 'search' }"
  >
    <div class="playlist-artwork">
    <button
      class="playlist-cover"
      data-playlist-hero-cover
      :data-playlist-id="item?.id"
      type="button"
      :aria-label="`打开歌单：${item?.name || '未命名歌单'}`"
      @click="emit('open', item, $event)"
    >
      <SmartMedia
        :src="cover"
        :alt="`${item?.name || '歌单'}封面`"
        :image-width="480"
        sizes="(min-width: 1100px) 20vw, (min-width: 700px) 33vw, 72vw"
        class="playlist-image"
      />
    </button>
    <button v-if="playable" class="playlist-play" :class="{'is-active': playing || loading}" type="button" :aria-label="`${loading ? '正在加载' : playing ? '暂停' : '播放'}歌单：${item?.name || '未命名歌单'}`" :aria-busy="loading" :disabled="loading" @click="emit('play', item)">
      <HomePlaybackIcon :loading="loading" :playing="playing" />
    </button>
    </div>
    <button class="playlist-caption" type="button" :aria-label="`打开歌单：${item?.name || '未命名歌单'}`" @click="emit('open', item, $event)">
    <span class="playlist-title">{{ item?.name || '未命名歌单' }}</span>
    <span class="playlist-meta">{{ meta }}</span>
    </button>
  </article>
</template>

<script setup>
import {computed} from 'vue'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import HomePlaybackIcon from '@/components/home/HomePlaybackIcon.vue'

const props = defineProps({
  playable: Boolean,
  loading: Boolean,
  playing: Boolean,
  item: {
    type: Object,
    required: true,
  },
  variant: {
    type: String,
    default: 'default',
  },
})

const emit = defineEmits(['open', 'play'])
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
  width: 100%;
  padding: 0;
  cursor: pointer;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid rgba(24, 24, 27, 0.05);
  border-radius: 24px;
  background: #ececee;
  box-shadow: 0 14px 36px rgba(45, 36, 35, 0.07);
  transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 360ms ease;
}

.playlist-artwork { position: relative; }
.playlist-caption { display: block; width: 100%; min-width: 0; padding: 0; border: 0; background: transparent; text-align: left; font: inherit; cursor: pointer; }
.playlist-cover:focus-visible, .playlist-caption:focus-visible, .playlist-play:focus-visible { outline: 3px solid #e85769; outline-offset: 4px; }

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
  cursor: pointer;
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
.playlist-card:focus-within .playlist-play,
.playlist-play.is-active { opacity: 1; transform: translateY(0) scale(1); }
.playlist-play:disabled { cursor: wait; }

.playlist-card:focus-visible { outline: 3px solid rgba(232, 87, 105, 0.22); outline-offset: 5px; border-radius: 24px; }

/* 搜索页变体：更小圆角与更克制的浮起，贴合搜索工作台视觉 */
.playlist-card.is-search .playlist-cover { border-radius: 20px; box-shadow: 0 10px 26px rgba(45, 36, 35, 0.07); }
.playlist-card.is-search:hover .playlist-cover,
.playlist-card.is-search:focus-visible .playlist-cover { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(45, 36, 35, 0.12); }
.playlist-card.is-search:hover .playlist-image,
.playlist-card.is-search:focus-visible .playlist-image { transform: scale(1.025); }
.playlist-card.is-search:focus-visible { border-radius: 20px; }
.playlist-card.is-search .playlist-title { margin-top: 11px; font-size: 13px; }
.playlist-card.is-search:active .playlist-cover { transform: scale(0.985); }

@media (hover: none) {
  .playlist-play { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .playlist-cover,
  .playlist-image,
  .playlist-play { transition: none; }
}
</style>
