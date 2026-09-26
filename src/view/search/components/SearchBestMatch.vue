<template>
  <section class="best-match">
    <header class="best-match-head">
      <h2>最佳匹配</h2>
    </header>

    <button
      ref="cardRef"
      type="button"
      class="best-match-card"
      :style="cardThemeStyle"
      @mouseenter="playHoverAnimation"
      @mouseleave="resetHoverAnimation"
      @click="emit('open', match)"
    >
      <span v-if="cover" ref="ambientRef" class="best-match-ambient" aria-hidden="true">
        <SmartMedia
          :src="cover"
          alt=""
          :image-width="720"
          class="best-match-ambient-media"
        />
      </span>
      <span class="best-match-wash" aria-hidden="true" />
      <span v-if="type === 'artist'" class="best-match-fluid" aria-hidden="true">
        <i class="fluid-blob is-one" />
        <i class="fluid-blob is-two" />
        <i class="fluid-blob is-three" />
      </span>
      <span ref="sweepRef" class="best-match-light-sweep" aria-hidden="true" />
      <span ref="coverElementRef" class="best-match-cover" :class="{ 'is-round': type === 'artist' }">
        <SmartMedia
          :src="cover"
          :alt="`${name}${type === 'artist' ? '头像' : '封面'}`"
          :image-width="320"
          sizes="(min-width: 900px) 156px, 92px"
          class="best-match-cover-media"
        />
      </span>
      <span ref="copyRef" class="best-match-copy">
        <small>{{ typeLabel }}</small>
        <strong>{{ name }}</strong>
        <em v-if="type === 'song' || type === 'album'"><ArtistLinks :artists="artistItems" :fallback-text="subtitle" /></em>
        <em v-else>{{ subtitle }}</em>
      </span>
      <span ref="openRef" class="best-match-open" :class="{ 'is-play': type === 'song' }" aria-hidden="true">
        <svg v-if="type === 'song'" viewBox="0 0 24 24" fill="none"><path d="M8.2 6.85c0-1.03 1.12-1.67 2.02-1.16l8.18 4.65a1.9 1.9 0 0 1 0 3.32l-8.18 4.65c-.9.51-2.02-.13-2.02-1.16V6.85Z" fill="currentColor" /></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </span>
    </button>
  </section>
</template>

<script setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {gsap} from 'gsap'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import {usePlayerThemeFromCover} from '@/composables/usePlayerThemeFromCover.js'
import {createFallbackTheme} from '@/utils/player/playerTheme.js'

const props = defineProps({
  match: {type: Object, required: true},
})

const emit = defineEmits(['open'])
const {resolveThemeFromCover} = usePlayerThemeFromCover()
const cardRef = ref(null)
const ambientRef = ref(null)
const sweepRef = ref(null)
const coverElementRef = ref(null)
const copyRef = ref(null)
const openRef = ref(null)
const item = computed(() => props.match?.item || {})
const type = computed(() => props.match?.type || 'song')
const name = computed(() => item.value?.name || '未命名')
const artistItems = computed(() => {
  const artists = [item.value?.artists, item.value?.ar].find(items => Array.isArray(items) && items.length)
  return (Array.isArray(artists) && artists.length ? artists : null)
    || item.value?.artist
    || item.value?.artistName
    || []
})
const cover = computed(() => (
  item.value?.picUrl
  || item.value?.coverImgUrl
  || item.value?.img1v1Url
  || item.value?.al?.picUrl
  || item.value?.album?.picUrl
  || ''
))
const typeLabel = computed(() => ({
  song: '歌曲',
  artist: '艺人',
  album: '专辑',
  playlist: '歌单',
})[type.value] || '音乐')
const subtitle = computed(() => {
  if (type.value === 'artist') return item.value?.alias?.[0] || '查看艺人主页'
  if (type.value === 'playlist') {
    const total = Number(item.value?.trackCount || 0)
    return total ? `${total.toLocaleString()} 首歌曲` : item.value?.copywriter || '精选歌单'
  }
  const artists = [item.value?.artists, item.value?.ar].find(items => Array.isArray(items) && items.length) || []
  const artistText = item.value?.artist?.name || item.value?.artistName || artists.map(artist => artist?.name || artist).filter(Boolean).join(' / ')
  if (type.value === 'album') return artistText || '查看专辑'
  return artistText || item.value?.al?.name || '立即播放'
})

const cardTheme = ref(createFallbackTheme('best-match'))
let themeRequest = 0
let hoverTimeline = null

const cardThemeStyle = computed(() => ({
  '--match-base': cardTheme.value.base.join(', '),
  '--match-accent': cardTheme.value.accent.join(', '),
  '--match-glow': cardTheme.value.glow.join(', '),
}))

watch([cover, name], async ([nextCover, nextName]) => {
  const currentRequest = ++themeRequest
  cardTheme.value = createFallbackTheme(nextName)
  const nextTheme = await resolveThemeFromCover(nextCover, nextName)
  if (currentRequest === themeRequest) cardTheme.value = nextTheme
}, {immediate: true})

function animationTargets() {
  const openIcon = openRef.value?.querySelector('svg') || null
  return [cardRef.value, ambientRef.value, sweepRef.value, coverElementRef.value, copyRef.value, openRef.value, openIcon].filter(Boolean)
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function playHoverAnimation() {
  if (prefersReducedMotion()) return
  const card = cardRef.value
  const sweep = sweepRef.value
  const coverElement = coverElementRef.value
  const copy = copyRef.value
  const open = openRef.value
  const ambient = ambientRef.value
  const openIcon = open?.querySelector('svg') || null
  if (!card || !sweep || !coverElement || !copy || !open) return

  hoverTimeline?.kill()
  gsap.killTweensOf(animationTargets())

  const sweepWidth = Math.max(1, sweep.getBoundingClientRect().width)
  const sweepStart = -sweepWidth * 1.6
  const sweepEnd = card.clientWidth + sweepWidth * 0.6
  gsap.set(sweep, {x: sweepStart, skewX: -14, opacity: 0})

  hoverTimeline = gsap.timeline({defaults: {overwrite: 'auto'}})
  hoverTimeline
    .to(card, {y: -2, boxShadow: '0 22px 52px rgba(35, 31, 31, 0.16)', duration: 0.38, ease: 'power3.out'}, 0)
    .to(coverElement, {y: -2, scale: 1.045, rotation: -0.45, boxShadow: '0 18px 40px rgba(0, 0, 0, 0.28)', duration: 0.48, ease: 'back.out(1.35)'}, 0.01)
    .to(copy, {x: 7, duration: 0.44, ease: 'power3.out'}, 0.1)
    .to(open, {x: 2, scale: 1.08, duration: 0.4, ease: 'back.out(1.7)'}, 0.17)
    .to(openIcon, {x: 3, duration: 0.32, ease: 'power3.out'}, 0.22)
    .to(sweep, {x: sweepEnd, opacity: 0.72, duration: 0.82, ease: 'power2.inOut'}, 0.02)
    .to(sweep, {opacity: 0, duration: 0.16, ease: 'power1.out'}, 0.72)

  if (ambient) {
    hoverTimeline.to(ambient, {scale: 1.14, opacity: 0.42, duration: 0.74, ease: 'sine.out'}, 0)
  }
}

function resetHoverAnimation() {
  if (prefersReducedMotion()) return
  const card = cardRef.value
  const sweep = sweepRef.value
  const coverElement = coverElementRef.value
  const copy = copyRef.value
  const open = openRef.value
  const ambient = ambientRef.value
  const openIcon = open?.querySelector('svg') || null

  hoverTimeline?.kill()
  gsap.killTweensOf(animationTargets())
  hoverTimeline = gsap.timeline({defaults: {duration: 0.34, ease: 'power3.out', overwrite: 'auto'}})
  if (card) hoverTimeline.to(card, {y: 0, boxShadow: '0 16px 42px rgba(35, 31, 31, 0.11)'}, 0)
  if (ambient) hoverTimeline.to(ambient, {scale: 1.08, opacity: 0.32}, 0)
  if (coverElement) hoverTimeline.to(coverElement, {x: 0, y: 0, scale: 1, rotation: 0, boxShadow: '0 14px 32px rgba(0, 0, 0, 0.24)'}, 0)
  if (copy) hoverTimeline.to(copy, {x: 0}, 0.02)
  if (open) hoverTimeline.to(open, {x: 0, scale: 1}, 0.04)
  if (openIcon) hoverTimeline.to(openIcon, {x: 0}, 0.04)
  if (sweep) hoverTimeline.to(sweep, {opacity: 0, duration: 0.14}, 0)
}

onBeforeUnmount(() => {
  themeRequest += 1
  hoverTimeline?.kill()
  gsap.killTweensOf(animationTargets())
})
</script>

<style scoped>
.best-match { min-width: 0; }
.best-match-head { margin-bottom: 12px; }
.best-match-head h2 { margin: 0; color: var(--sp-ink, #1b1b1f); font-size: 20px; font-weight: 820; letter-spacing: -0.03em; }

.best-match-card {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 190px;
  align-items: center;
  grid-template-columns: clamp(124px, 15vw, 156px) minmax(0, 1fr) 48px;
  gap: clamp(20px, 3vw, 34px);
  overflow: hidden;
  padding: 18px 22px;
  text-align: left;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.64);
  border-radius: 24px;
  background:
    linear-gradient(112deg, rgba(var(--match-base, 36, 36, 40), 0.98), rgba(var(--match-accent, 54, 54, 62), 0.92) 58%, rgba(var(--match-base, 36, 36, 40), 0.96));
  box-shadow: 0 16px 42px rgba(35, 31, 31, 0.11);
  isolation: isolate;
  will-change: transform, box-shadow;
}
.best-match-card:focus-visible { outline: 3px solid rgba(232, 87, 105, 0.36); outline-offset: 3px; }

.best-match-ambient { position: absolute; inset: -34px; z-index: -3; display: block; overflow: hidden; filter: blur(38px) saturate(0.94); opacity: 0.32; transform: scale(1.08); pointer-events: none; will-change: transform, opacity; }
.best-match-ambient-media { width: 100% !important; height: 100% !important; }
.best-match-ambient-media :deep(img),
.best-match-ambient-media :deep(video) { width: 100%; height: 100%; object-fit: cover; }
.best-match-wash { position: absolute; inset: 0; z-index: -2; background: linear-gradient(90deg, rgba(12, 12, 16, 0.42), rgba(12, 12, 16, 0.2) 56%, rgba(12, 12, 16, 0.3)); }
.best-match-fluid {
  position: absolute;
  inset: -55%;
  z-index: -1;
  overflow: hidden;
  opacity: 0.78;
  filter: blur(34px) saturate(1.16);
  pointer-events: none;
  transform: translateZ(0);
}
.fluid-blob {
  position: absolute;
  display: block;
  aspect-ratio: 1;
  border-radius: 50%;
  mix-blend-mode: screen;
  will-change: transform;
}
.fluid-blob.is-one {
  top: 25%;
  left: 18%;
  width: 44%;
  background: rgba(var(--match-glow, 110, 110, 126), 0.5);
  animation: match-fluid-one 11s ease-in-out infinite alternate;
}
.fluid-blob.is-two {
  right: 12%;
  bottom: 15%;
  width: 50%;
  background: rgba(var(--match-accent, 72, 72, 86), 0.46);
  animation: match-fluid-two 14s ease-in-out infinite alternate;
}
.fluid-blob.is-three {
  top: 7%;
  right: 32%;
  width: 34%;
  background: rgba(var(--match-base, 36, 36, 40), 0.72);
  animation: match-fluid-three 17s ease-in-out infinite alternate;
}
@keyframes match-fluid-one {
  0% { transform: translate3d(-10%, -8%, 0) scale(0.92); }
  48% { transform: translate3d(38%, 14%, 0) scale(1.18); }
  100% { transform: translate3d(78%, -3%, 0) scale(1.02); }
}
@keyframes match-fluid-two {
  0% { transform: translate3d(12%, 10%, 0) scale(1.08); }
  52% { transform: translate3d(-36%, -16%, 0) scale(0.9); }
  100% { transform: translate3d(-70%, 8%, 0) scale(1.16); }
}
@keyframes match-fluid-three {
  0% { transform: translate3d(4%, -24%, 0) scale(0.88); }
  45% { transform: translate3d(-28%, 38%, 0) scale(1.24); }
  100% { transform: translate3d(48%, 24%, 0) scale(0.98); }
}
.best-match-light-sweep {
  position: absolute;
  top: -30%;
  bottom: -30%;
  left: 0;
  width: 28%;
  z-index: -1;
  background:
    linear-gradient(90deg, transparent, rgba(var(--match-glow, 110, 110, 126), 0.24) 32%, rgba(255, 255, 255, 0.2) 52%, rgba(var(--match-accent, 72, 72, 86), 0.16) 70%, transparent);
  filter: blur(8px);
  mix-blend-mode: screen;
  opacity: 0;
  pointer-events: none;
  will-change: transform, opacity;
}

.best-match-cover { display: block; width: 100%; min-width: 0; aspect-ratio: 1; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 17px; background: rgba(255, 255, 255, 0.14); box-shadow: 0 14px 32px rgba(0, 0, 0, 0.24); will-change: transform, box-shadow; }
.best-match-cover.is-round { border-radius: 50%; }
.best-match-cover-media { width: 100% !important; height: 100% !important; min-width: 0; }
.best-match-cover :deep(img),
.best-match-cover :deep(video) { width: 100%; height: 100%; object-fit: cover; }

.best-match-copy { display: block; min-width: 0; will-change: transform; }
.best-match-copy small,
.best-match-copy strong,
.best-match-copy em { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.best-match-copy small { color: rgba(255, 255, 255, 0.62); font-size: 10px; font-weight: 800; letter-spacing: 0.12em; }
.best-match-copy strong { margin-top: 8px; font-size: clamp(24px, 3.2vw, 36px); font-weight: 860; letter-spacing: -0.045em; }
.best-match-copy em { margin-top: 9px; color: rgba(255, 255, 255, 0.7); font-size: 13px; font-style: normal; font-weight: 620; }
.best-match-open { display: grid; width: 46px; aspect-ratio: 1; place-items: center; justify-self: end; color: #1f1f23; border-radius: 50%; background: rgba(255, 255, 255, 0.94); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16); will-change: transform; }
.best-match-open svg { width: 17px; height: 17px; will-change: transform; }
.best-match-open.is-play svg { width: 20px; height: 20px; }

@media (max-width: 560px) {
  .best-match-card { min-height: 132px; grid-template-columns: 92px minmax(0, 1fr) 38px; gap: 13px; padding: 14px; border-radius: 19px; }
  .best-match-cover { border-radius: 14px; }
  .best-match-copy small { font-size: 9px; }
  .best-match-copy strong { margin-top: 5px; font-size: 20px; }
  .best-match-copy em { margin-top: 6px; font-size: 11px; }
  .best-match-open { width: 38px; }
}

@media (prefers-reduced-motion: reduce) {
  .best-match-light-sweep { display: none; }
  .fluid-blob { animation: none; }
}
</style>
