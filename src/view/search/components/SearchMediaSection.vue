<template>
  <section class="media-section">
    <header class="media-head">
      <div class="media-head-text">
        <p v-if="eyebrow" class="media-eyebrow">{{ eyebrow }}</p>
        <h2 class="media-title">{{ title }}</h2>
      </div>
      <button
        v-if="viewAllLabel"
        type="button"
        class="media-viewall"
        @click="emit('view-all')"
      >
        {{ viewAllLabel }}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
    </header>

    <TransitionGroup v-if="variant === 'playlist'" name="search-item" tag="div" class="media-grid" :class="`is-${variant}`" appear>
      <HomePlaylistCard
        v-for="(item, index) in items"
        :key="item.id || item.playlistId"
        :item="item"
        :style="{ '--search-item-delay': `${Math.min(index, 10) * 32}ms` }"
        variant="search"
        @open="(entry) => emit('open', entry)"
      />
    </TransitionGroup>

    <TransitionGroup v-else name="search-item" tag="div" class="media-grid" :class="`is-${variant}`" appear>
      <button
        v-for="(item, index) in items"
        :key="item.id"
        type="button"
        class="media-card"
        :aria-label="`打开${title}：${nameOf(item)}`"
        :style="{ '--search-item-delay': `${Math.min(index, 10) * 32}ms` }"
        @click="emit('open', item)"
      >
        <span class="media-cover" :class="{ 'is-round': variant === 'artist' }">
          <SmartMedia
            :src="coverOf(item)"
            :alt="`${nameOf(item)}${variant === 'artist' ? '头像' : '封面'}`"
            :image-width="variant === 'artist' ? 360 : 460"
            sizes="(min-width: 1100px) 18vw, (min-width: 700px) 30vw, 42vw"
            class="media-img"
          />
        </span>
        <span class="media-name">{{ nameOf(item) }}</span>
        <span class="media-sub">
          <ArtistLinks
            v-if="variant === 'album'"
            :artists="artistItemsOf(item)"
            fallback-text="未知艺人"
            link-class="hover:underline"
          />
          <template v-else>{{ subOf(item) }}</template>
        </span>
      </button>
    </TransitionGroup>
  </section>
</template>

<script setup>
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import HomePlaylistCard from '@/components/home/HomePlaylistCard.vue'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'

defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  variant: { type: String, default: 'album' },
  viewAllLabel: { type: String, default: '' },
})

const emit = defineEmits(['open', 'view-all'])

function nameOf(item) {
  return item?.name || item?.title || '未命名'
}

function coverOf(item) {
  return item?.picUrl || item?.coverImgUrl || item?.img1v1Url || item?.al?.picUrl || ''
}

function subOf(item) {
  if (Array.isArray(item?.alias) && item.alias[0]) return item.alias[0]
  return ''
}

function artistItemsOf(item) {
  return (Array.isArray(item?.artists) && item.artists.length ? item.artists : null)
    || item?.artist
    || item?.artistName
    || ''
}
</script>

<style scoped>
.media-section { min-width: 0; }

.media-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.media-eyebrow { margin: 0 0 4px; color: var(--sp-accent, #e85769); font-size: 10px; font-weight: 800; letter-spacing: 0.18em; }
.media-title { margin: 0; color: var(--sp-ink, #1b1b1f); font-size: 20px; font-weight: 820; letter-spacing: -0.03em; }

.media-viewall {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  color: var(--sp-muted, #86868f);
  border: 1px solid var(--sp-line, rgba(24, 24, 27, 0.075));
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  font-weight: 680;
  transition: color 180ms ease, border-color 180ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.media-viewall:hover { color: var(--sp-accent-ink, #d92c49); border-color: rgba(232, 87, 105, 0.28); transform: translateX(2px); }
.media-viewall:focus-visible { outline: 2px solid rgba(232, 87, 105, 0.4); outline-offset: 2px; }
.media-viewall svg { width: 14px; height: 14px; color: var(--sp-accent, #e85769); }

.media-grid { display: grid; gap: 26px 18px; }
.media-grid.is-album,
.media-grid.is-playlist { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.media-grid.is-artist { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 22px 18px; }
.search-item-enter-active { transition: opacity 340ms ease, transform 380ms cubic-bezier(0.22, 1, 0.36, 1); transition-delay: var(--search-item-delay, 0ms); }
.search-item-enter-from { opacity: 0; transform: translateY(8px); }

.media-card {
  display: block;
  min-width: 0;
  padding: 0;
  text-align: left;
  border: 0;
  background: transparent;
}
.media-card:focus-visible { outline: 2px solid rgba(232, 87, 105, 0.4); outline-offset: 4px; border-radius: 16px; }
.media-card:active .media-cover { transform: scale(0.985); }

.media-cover {
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid rgba(24, 24, 27, 0.05);
  border-radius: 17px;
  background: #e8e8ea;
  box-shadow: 0 10px 26px rgba(43, 37, 35, 0.07);
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 260ms ease;
}
.media-cover.is-round { border-radius: 50%; }
.media-img { width: 100%; height: 100%; object-fit: cover; transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1); }
.media-card:hover .media-cover { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(43, 37, 35, 0.12); }
.media-card:hover .media-img { transform: scale(1.025); }

.media-name,
.media-sub { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.media-name { margin-top: 11px; color: var(--sp-ink, #1b1b1f); font-size: 13px; font-weight: 720; }
.media-sub { margin-top: 4px; color: var(--sp-muted, #86868f); font-size: 11px; }
.media-grid.is-artist .media-name,
.media-grid.is-artist .media-sub { text-align: center; }

@media (max-width: 1080px) {
  .media-grid.is-album,
  .media-grid.is-playlist { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .media-grid.is-artist { grid-template-columns: repeat(5, minmax(0, 1fr)); }
}

@media (max-width: 820px) {
  .media-grid.is-album,
  .media-grid.is-playlist { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .media-grid.is-artist { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
  .media-head { align-items: flex-start; flex-direction: column; gap: 10px; }
  .media-grid.is-album,
  .media-grid.is-playlist { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 12px; }
  .media-grid.is-artist { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .media-cover,
  .media-img,
  .media-viewall,
  .media-viewall svg { transition: none; }
  .search-item-enter-active { transition: none; }
}
</style>
