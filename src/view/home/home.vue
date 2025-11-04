<template>
  <div class="bg-white">

    <div class="relative bg-gray-900 overflow-hidden">
    <!-- 背景层（包裹视频与遮罩：用于整体缩放/模糊/暗化） -->
    <div ref="heroBgLayerEl" class="absolute inset-0 will-change-transform ">
      <div aria-hidden="true" class="absolute inset-0 overflow-hidden">
        <SmartMedia :src="bannerMeadiasrc" scale-on-scroll/>
      </div>
      <div aria-hidden="true" class="absolute inset-0 bg-gray-900 opacity-50"/>
    </div>


    <div
      ref="heroSectionEl"
      class="relative mx-auto flex max-w-3xl flex-col items-center justify-center px-6 text-center lg:px-0 min-h-[70vh] sm:min-h-[90vh]"
      @click="goartistDetail"
    >
      <div ref="heroTextEl"
           class="flex flex-col items-center justify-center will-change-transform">
        <p ref="subtitleEl" class="text-xl text-white">{{ copy.hero.subtitle }}</p>
        <h1 ref="titleEl" class="mt-8 tracking-widest text-4xl font-bold text-white lg:text-6xl">
          <span>{{ tittle }}</span>
        </h1>
      </div>
    </div>
  </div>
  </div>


  <main>
    <kpop/>
    <homeCategorySection :title="'精品歌单'"/>
  </main>
</template>

<script setup>
import {ref, onMounted, nextTick, onUnmounted} from 'vue'
import gsap from 'gsap'
import router from '@/router/index.js'
import {playListsApi} from "@/api/playListsApi/playListsApi.js";
import HomeCategorySection from "@/components/homeCategorySection/homeCategorySection.vue";
import {aiAPi} from "@/api/aiApi/aiAPi.js";
import {homeIndexApi} from "@/api/home/homeIndexApi.js";
import Kpop from "@/components/kpop/kpop.vue";
import SmartMedia from "@/components/smartMedia/smartMedia.vue";

const copy = {
  brand: {name: '你的品牌'},
  common: {shopNow: '立即选购', search: '搜索', help: '帮助'},
  auth: {signIn: '登录', signUp: null},
  hero: {title: 'The &nbsp; Weeknd', subtitle: '今日推荐'},
}



/** ===== 顶部圆形→展开 动画逻辑 ===== */
const navShell = ref(null)
const navContent = ref(null)
const expanded = ref(false)
const hovering = ref(false)
let resizing = false
let autoExpandByScroll = false
let navTl = null

function measureExpandedSize() {
  const shell = navShell.value
  const content = navContent.value
  if (!shell || !content) return {w: 0, h: 48}
  const prev = {width: shell.style.width}
  shell.style.width = 'auto'
  const rect = shell.getBoundingClientRect()
  shell.style.width = prev.width
  return {w: rect.width, h: 48}
}

function animateExpand(toExpand) {
  if (resizing) return
  const shell = navShell.value
  if (!shell) return
  if (navTl) navTl.kill()

  const toSize = toExpand ? measureExpandedSize().w : 48

  navTl = gsap.timeline({defaults: {ease: 'power3.out', duration: 0.5}})
  navTl.to(
    shell,
    {
      width: toSize,
      borderRadius: 9999,
      onStart: () => {
        if (toExpand) expanded.value = true
      },
      onComplete: () => {
        if (!toExpand) expanded.value = false;
        navTl = null
      },
    },
    0,
  )
  if (toExpand) {
    navTl.fromTo(navContent.value, {opacity: 0, y: -6}, {opacity: 1, y: 0, duration: 0.35}, 0.1)
  } else {
    navTl.to(navContent.value, {opacity: 0, y: -6, duration: 0.2}, 0)
  }
}

function toggleExpand(force) {
  const to = typeof force === 'boolean' ? force : !expanded.value
  animateExpand(to)
}

function onScroll() {
  const y = window.scrollY || document.documentElement.scrollTop
  const threshold = 24
  const nearTop = y <= threshold
  if (!nearTop && !expanded.value) {
    autoExpandByScroll = true
    animateExpand(true)
  } else if (nearTop && expanded.value && autoExpandByScroll && !hovering.value) {
    animateExpand(false)
    autoExpandByScroll = false
  }
}

/** ===== GSAP：Hero 标题入场 ===== */
const subtitleEl = ref(null)
const titleEl = ref(null)
let tl = null

function splitTextToSpans(el) {
  if (!el) return []
  const text = el.textContent || ''
  el.textContent = ''
  const spans = []
  for (const ch of text) {
    const span = document.createElement('span')
    span.textContent = ch
    span.style.display = 'inline-block'
    span.style.willChange = 'transform, opacity, filter'
    el.appendChild(span)
    spans.push(span)
  }
  return spans
}

/** ===== 滚动触发：整块 Hero 背景缩放+模糊 + 文字放大上浮 ===== */
const heroBgLayerEl = ref(null)   // 背景（视频+遮罩）的容器
const heroSectionEl = ref(null)   // Hero 文本所在的块（用于定位）
const heroTextEl = ref(null)      // 文字整体容器

function onHeroParallaxScroll() {
  const bg = heroBgLayerEl.value
  const text = heroTextEl.value
  if (!bg || !text) return

  const scrollY = window.scrollY || document.documentElement.scrollTop
  const maxScroll = window.innerHeight * 0.8 // 动效完成的滚动距离

  const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1)

  // 背景：缩放、暗化、模糊
  gsap.to(bg, {
    scale: 1 + progress,        // 最多缩小 8%
    opacity: 1 - progress * 0.25,      // 暗化 25%
    filter: `blur(${progress * 6}px)`, // 最多 6px 模糊
    transformOrigin: 'center center',
    duration: 0.25,
    ease: 'power2.out',
  })

  // 文字：放大、上浮、轻微淡出
  gsap.to(text, {
    scale: 1 + progress * 0.25,        // 最多放大 1.25x
    y: -progress * 40,                 // 上浮 40px
    opacity: 1 - progress * 0.2,       // 轻微淡出
    transformOrigin: 'center center',
    duration: 0.25,
    ease: 'power2.out',
  })
}

onMounted(async () => {
  await nextTick()
  aiAPi.deepseekAPi()
  // 顶部导航：初始化为圆形（48px）
  const shell = navShell.value
  if (shell) {
    gsap.set(shell, {width: 48, height: 48, borderRadius: 9999})
  }
  window.addEventListener('scroll', onScroll, {passive: true})

  // Hero 入场（逐字）
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  if (!prefersReduced) {
    gsap.set(subtitleEl.value, {opacity: 0, y: 12, filter: 'blur(6px)'})
    const letterSpans = splitTextToSpans(titleEl.value)
    gsap.set(letterSpans, {opacity: 0, yPercent: 120, rotateX: -35})
    tl = gsap.timeline({defaults: {ease: 'power3.out'}})
    tl.to(subtitleEl.value, {opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8}, 0)
      .to(
        letterSpans,
        {
          opacity: 1,
          yPercent: 0,
          rotateX: 0,
          duration: 0.9,
          stagger: 0.06,
          ease: 'back.out(1.6)',
        },
        0.15,
      )
      .fromTo(titleEl.value, {scale: 0.98}, {scale: 1, duration: 0.6, ease: 'power2.out'}, '>-0.3')
  }

  // 初始状态：背景与文字的 transform
  if (heroBgLayerEl.value) {
    gsap.set(heroBgLayerEl.value, {scale: 1, opacity: 1, filter: 'blur(0px)'})
  }
  if (heroTextEl.value) {
    gsap.set(heroTextEl.value, {scale: 1, y: 0, opacity: 1})
  }

  // 注册滚动视差动效
  window.addEventListener('scroll', onHeroParallaxScroll, {passive: true})
  // 首次计算
  onHeroParallaxScroll()
})

onUnmounted(() => {
  tl && tl.kill()
  navTl && navTl.kill()
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('scroll', onHeroParallaxScroll)
})

let goartistDetail = () => {
  router.push({path: '/artistDetail'})
}

let getRecommendPlayListdata = ref();
let getRecommendPlayList = () => {
  playListsApi.getRecommendPlayList().then(res => {
    console.log(res.data.result);
    getRecommendPlayListdata.value = res.data.result
  })
}
getRecommendPlayList();


let tittle = ref('');
let bannerMeadiasrc = ref('');

function getBanner() {
  homeIndexApi.getBanner().then(res => {
    tittle.value = res[0].title;
    bannerMeadiasrc.value = res[0].mediaUrl;
  })
}

getBanner();

</script>

<style scoped>
/* 逐字动画柔和的光晕质感 */
h1 span {
  text-shadow: 0 1px 8px rgba(255, 255, 255, 0.15);
}

/* 抗抖动：在部分浏览器上减少亚像素抖动 */
button, svg {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
}
</style>
