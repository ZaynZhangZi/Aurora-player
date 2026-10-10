<template>
  <div class="lyric-share-preview">
    <svg v-if="layout" :viewBox="`0 0 ${layout.width} ${layout.height}`" role="img" :aria-label="`${song.name} 的歌词分享图片`" :style="{fontFamily: SHARE_FONT}">
      <defs>
        <linearGradient :id="`${uid}-base`" x1="0" y1="0" x2="1" y2="1"><stop :stop-color="rgb(layout.palette.base)" /><stop offset="1" :stop-color="rgb(layout.palette.base.map(channel => Math.round(channel * .62)))" /></linearGradient>
        <radialGradient :id="`${uid}-accent`" gradientUnits="userSpaceOnUse" cx="1360" cy="60" r="1300"><stop :stop-color="rgb(layout.palette.accent)" stop-opacity=".65" /><stop offset="1" :stop-color="rgb(layout.palette.accent)" stop-opacity="0" /></radialGradient>
        <radialGradient :id="`${uid}-glow`" gradientUnits="userSpaceOnUse" cx="80" :cy="layout.height * .72" r="1300"><stop :stop-color="rgb(layout.palette.glow)" stop-opacity=".65" /><stop offset="1" :stop-color="rgb(layout.palette.glow)" stop-opacity="0" /></radialGradient>
        <clipPath :id="`${uid}-cover`"><rect x="92" y="92" width="104" height="104" rx="16" /></clipPath>
      </defs>
      <rect :width="layout.width" :height="layout.height" :fill="`url(#${uid}-base)`" />
      <rect :width="layout.width" :height="layout.height" :fill="`url(#${uid}-accent)`" />
      <rect :width="layout.width" :height="layout.height" :fill="`url(#${uid}-glow)`" />
      <rect x="92" y="92" width="104" height="104" rx="16" :fill="rgb(layout.palette.accent)" />
      <image v-if="cover && !coverFailed" :href="cover" x="92" y="92" width="104" height="104" preserveAspectRatio="xMidYMid slice" :clip-path="`url(#${uid}-cover)`" @error="coverFailed = true" />
      <text v-else x="126" y="162" font-size="48" font-weight="700" fill="#fff" opacity=".8">{{ Array.from(song.name)[0] }}</text>
      <text x="226" y="133" font-size="42" font-weight="650" fill="#fff">{{ layout.name }}</text>
      <text x="226" y="179" font-size="32" font-weight="500" fill="#fff" opacity=".65">{{ layout.artists }}</text>
      <text v-for="(run, index) in layout.runs" :key="index" :x="run.x" :y="run.y" :font-size="run.size" :font-weight="run.weight" :text-anchor="run.align" fill="#fff" :opacity="run.opacity">{{ run.text }}</text>
    </svg>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, shallowRef, triggerRef, useId, watch} from 'vue'
import {createShareLayout, SHARE_FONT} from '@/utils/lyricShare.js'
import {getOptimizedImageUrl} from '@/utils/mediaUrl.js'

const props = defineProps({song: {type: Object, required: true}, lines: {type: Array, required: true}, options: {type: Object, required: true}})
const uid = `share-${useId().replace(/[^\w-]/g, '')}`
const ctx = shallowRef(null)
const coverFailed = ref(false)
const cover = computed(() => getOptimizedImageUrl(props.song.cover, {width: 480}))
const rgb = channels => `rgb(${channels.join(',')})`
const layout = computed(() => ctx.value && createShareLayout(props.song, props.lines, props.options, ctx.value))
let mounted = false
onMounted(() => {
  mounted = true
  ctx.value = document.createElement('canvas').getContext('2d')
  void document.fonts?.ready.then(() => { if (mounted) triggerRef(ctx) })
})
onBeforeUnmount(() => { mounted = false })
watch(cover, () => { coverFailed.value = false })
</script>

<style scoped>
.lyric-share-preview { width: 100%; overflow: hidden; border-radius: 22px; background: #292f41; box-shadow: 0 18px 48px rgb(0 0 0 / .16); }
.lyric-share-preview svg { display: block; width: 100%; height: auto; }
</style>
