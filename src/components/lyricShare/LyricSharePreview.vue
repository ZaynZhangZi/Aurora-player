<template>
  <div class="lyric-share-preview">
    <svg v-if="layout" :viewBox="`0 0 ${layout.width} ${previewHeight ?? layout.height}`" role="img" :aria-label="`${song.name} 的歌词分享图片`" :style="{fontFamily: SHARE_FONT}">
      <defs>
        <linearGradient :id="`${uid}-base`" x1="0" y1="0" x2="1" y2="1"><stop :stop-color="rgb(layout.palette.base)" /><stop offset="1" :stop-color="rgb(layout.palette.base.map(channel => Math.round(channel * .62)))" /></linearGradient>
        <radialGradient :id="`${uid}-accent`" gradientUnits="userSpaceOnUse" cx="1360" cy="60" r="1300"><stop :stop-color="rgb(layout.palette.accent)" stop-opacity=".65" /><stop offset="1" :stop-color="rgb(layout.palette.accent)" stop-opacity="0" /></radialGradient>
        <radialGradient :id="`${uid}-glow`" gradientUnits="userSpaceOnUse" cx="80" :cy="(previewHeight ?? layout.height) * .72" r="1300"><stop :stop-color="rgb(layout.palette.glow)" stop-opacity=".65" /><stop offset="1" :stop-color="rgb(layout.palette.glow)" stop-opacity="0" /></radialGradient>
        <clipPath :id="`${uid}-cover`"><rect x="92" y="92" width="104" height="104" rx="16" /></clipPath>
      </defs>
      <rect :width="layout.width" :height="previewHeight ?? layout.height" :fill="`url(#${uid}-base)`" />
      <rect :width="layout.width" :height="previewHeight ?? layout.height" :fill="`url(#${uid}-accent)`" />
      <rect :width="layout.width" :height="previewHeight ?? layout.height" :fill="`url(#${uid}-glow)`" />
      <rect x="92" y="92" width="104" height="104" rx="16" :fill="rgb(layout.palette.accent)" />
      <image v-if="cover && !coverFailed" :href="cover" x="92" y="92" width="104" height="104" preserveAspectRatio="xMidYMid slice" :clip-path="`url(#${uid}-cover)`" @error="coverFailed = true" />
      <text v-else x="126" y="162" font-size="48" font-weight="700" fill="#fff" opacity=".8">{{ Array.from(song.name)[0] }}</text>
      <text x="226" y="133" font-size="42" font-weight="650" fill="#fff">{{ layout.name }}</text>
      <text x="226" y="179" font-size="32" font-weight="500" fill="#fff" opacity=".65">{{ layout.artists }}</text>
      <Transition name="share-preview-lyrics">
        <g :key="lyricKey">
          <text v-for="(run, index) in layout.runs" :key="index" :x="run.x" :y="run.y" :font-size="run.size" :font-weight="run.weight" :text-anchor="run.align" fill="#fff" :opacity="run.opacity">{{ run.text }}</text>
        </g>
      </Transition>
    </svg>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, shallowRef, triggerRef, useId, watch} from 'vue'
import {createShareLayout, SHARE_FONT} from '@/utils/lyricShare.js'
import {getOptimizedImageUrl} from '@/utils/mediaUrl.js'
import {createSharePreviewMotion} from '@/utils/lyricSharePreviewMotion.js'

const props = defineProps({song: {type: Object, required: true}, lines: {type: Array, required: true}, options: {type: Object, required: true}})
const uid = `share-${useId().replace(/[^\w-]/g, '')}`
const ctx = shallowRef(null)
const previewHeight = ref(null)
const coverFailed = ref(false)
const cover = computed(() => getOptimizedImageUrl(props.song.cover, {width: 480}))
const rgb = channels => `rgb(${channels.join(',')})`
const layout = computed(() => ctx.value && createShareLayout(props.song, props.lines, props.options, ctx.value))
// Cross-fade only the lyrics, so the background, cover and metadata never flash.
const lyricKey = computed(() => JSON.stringify(layout.value?.runs))
let mounted = false
let motion = null
let motionQuery = null
function onMotionPreferenceChanged() {
  if (layout.value) motion?.setHeight(layout.value.height, {animate: false})
}
watch(layout, next => {
  if (next) motion?.setHeight(next.height, {animate: !motionQuery?.matches})
}, {flush: 'sync'})
onMounted(() => {
  mounted = true
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', onMotionPreferenceChanged)
  motion = createSharePreviewMotion(value => { previewHeight.value = value }, {
    requestFrame: callback => requestAnimationFrame(callback),
    cancelFrame: frame => cancelAnimationFrame(frame),
  })
  ctx.value = document.createElement('canvas').getContext('2d')
  void document.fonts?.ready.then(() => { if (mounted) triggerRef(ctx) })
})
onBeforeUnmount(() => {
  mounted = false
  motion?.stop()
  motionQuery?.removeEventListener('change', onMotionPreferenceChanged)
})
watch(cover, () => { coverFailed.value = false })
</script>

<style scoped>
.lyric-share-preview { width: 100%; overflow: hidden; border-radius: 22px; background: #292f41; box-shadow: 0 18px 48px rgb(0 0 0 / .16); }
.lyric-share-preview svg { display: block; width: 100%; height: auto; }
.share-preview-lyrics-enter-active, .share-preview-lyrics-leave-active { transition: opacity 240ms ease; }
.share-preview-lyrics-enter-from, .share-preview-lyrics-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .share-preview-lyrics-enter-active, .share-preview-lyrics-leave-active { transition: none; } }
</style>
