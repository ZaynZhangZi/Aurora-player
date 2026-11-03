<template>
  <span v-if="loading" class="playback-spinner" aria-hidden="true" />
  <AppIcon v-else :name="playing ? 'pause' : 'play'" class="playback-icon" :class="{'is-play':!playing}" filled aria-hidden="true" />
</template>

<script setup>
import AppIcon from '@/components/icons/AppIcon.vue'
defineProps({loading: Boolean, playing: Boolean})
</script>

<style scoped>
.playback-icon, .playback-spinner { display: block; width: 20px; height: 20px; flex: none; }
.is-play { transform: translateX(1px); }
.playback-spinner { box-sizing: border-box; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: playback-spin 750ms linear infinite; }
@keyframes playback-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .playback-spinner { animation: none; } }
</style>
