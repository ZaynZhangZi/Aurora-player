<template>
  <section class="song-section">
    <header v-if="title" class="song-head">
      <div class="song-head-text">
        <p v-if="eyebrow" class="song-eyebrow">{{ eyebrow }}</p>
        <h2 class="song-title">{{ title }}</h2>
      </div>
      <button
        v-if="viewAllLabel"
        type="button"
        class="song-viewall"
        @click="emit('view-all')"
      >
        {{ viewAllLabel }}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
    </header>

    <TransitionGroup name="search-item" tag="div" class="song-rows" appear>
      <HomeSongRow
        v-for="(song, index) in songs"
        :key="song.id"
        :song="song"
        :index="startIndex + index"
        :style="{ '--search-item-delay': `${Math.min(index, 10) * 26}ms` }"
        show-album
        @play="(entry, i) => emit('play', entry, i)"
      />
    </TransitionGroup>
  </section>
</template>

<script setup>
import HomeSongRow from '@/components/home/HomeSongRow.vue'

defineProps({
  songs: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 },
  eyebrow: { type: String, default: '' },
  title: { type: String, default: '' },
  viewAllLabel: { type: String, default: '' },
})

const emit = defineEmits(['play', 'view-all'])
</script>

<style scoped>
.song-section { min-width: 0; }

.song-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.song-eyebrow { margin: 0 0 4px; color: var(--sp-accent, #e85769); font-size: 10px; font-weight: 800; letter-spacing: 0.18em; }
.song-title { margin: 0; color: var(--sp-ink, #1b1b1f); font-size: 20px; font-weight: 820; letter-spacing: -0.03em; }

.song-viewall {
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
.song-viewall:hover { color: var(--sp-accent-ink, #d92c49); border-color: rgba(232, 87, 105, 0.28); transform: translateX(2px); }
.song-viewall:focus-visible { outline: 2px solid rgba(232, 87, 105, 0.4); outline-offset: 2px; }
.song-viewall svg { width: 14px; height: 14px; color: var(--sp-accent, #e85769); }

.song-rows { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2px; }
.search-item-enter-active { transition: opacity 320ms ease, transform 360ms cubic-bezier(0.22, 1, 0.36, 1); transition-delay: var(--search-item-delay, 0ms); }
.search-item-enter-from { opacity: 0; transform: translateY(7px); }

@media (prefers-reduced-motion: reduce) {
  .song-viewall,
  .song-viewall svg { transition: none; }
  .search-item-enter-active { transition: none; }
}
</style>
