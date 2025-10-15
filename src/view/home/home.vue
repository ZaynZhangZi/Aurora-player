<template>
  <div class="bg-white">
    <!-- Mobile menu -->


    <!-- Hero section -->
    <div class="relative bg-gray-900 overflow-hidden">
      <!-- 背景层（包裹视频与遮罩：用于整体缩放/模糊/暗化） -->
      <div ref="heroBgLayerEl" class="absolute inset-0 will-change-transform ">
        <div aria-hidden="true" class="absolute inset-0 overflow-hidden">
          <video
            autoplay
            class="object-cover w-full h-full"
            loop
            muted
            playsinline
            src="https://mvod.itunes.apple.com/itunes-assets/HLSMusic211/v4/ad/6b/bf/ad6bbf41-f62f-b4ab-116b-2d3516f3d85b/P854854673_Anull_video_gr598_sdr_3840x2160-.mp4"
          />
        </div>
        <div aria-hidden="true" class="absolute inset-0 bg-gray-900 opacity-50"/>
      </div>

      <!-- 顶部悬浮导航：圆形→展开 -->
<!--      <header class="relative z-10">-->
<!--        <nav>-->
<!--          <div class="fixed inset-x-0 top-0 z-50">-->
<!--            <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">-->
<!--              &lt;!&ndash; 外壳：grid 两列，左 48px 固定按钮，右侧自适应内容 &ndash;&gt;-->
<!--              <div-->
<!--                ref="navShell"-->
<!--                :class="expanded ? 'rounded-full pl-0 pr-4 sm:pr-6 h-12' : 'h-12 w-12 rounded-full'"-->
<!--                class="mt-3 grid items-center overflow-hidden border border-white/10 shadow-lg ring-1 ring-white/10 bg-white/10 backdrop-blur-md backdrop-saturate-150 [grid-template-columns:48px_1fr]"-->
<!--                @mouseenter="hovering = true"-->
<!--                @mouseleave="hovering = false"-->
<!--              >-->
<!--                &lt;!&ndash; 固定占位容器：按钮不会被右侧内容挤动 &ndash;&gt;-->
<!--                <div class="col-[1/2] grid place-items-center size-12 shrink-0">-->
<!--                  <button-->
<!--                    ref="fabBtn"-->
<!--                    :aria-pressed="expanded"-->
<!--                    :class="expanded ? 'scale-95' : 'scale-100'"-->
<!--                    class="grid place-items-center size-12 text-white/90 hover:text-white transition-transform duration-300 will-change-transform"-->
<!--                    style="transform-origin:center center; translate: 0;"-->
<!--                    @click="toggleExpand()"-->
<!--                  >-->
<!--                    <span-->
<!--                      class="relative inline-flex items-center justify-center size-6 pointer-events-none">-->
<!--                      &lt;!&ndash; Bars3：收起态 &ndash;&gt;-->
<!--                      <Bars3Icon-->
<!--                        :class="expanded ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'"-->
<!--                        aria-hidden="true"-->
<!--                        class="absolute size-6 transition-all duration-300 ease-out"-->
<!--                      />-->
<!--                      &lt;!&ndash; X：展开态 &ndash;&gt;-->
<!--                      <XMarkIcon-->
<!--                        :class="expanded ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'"-->
<!--                        aria-hidden="true"-->
<!--                        class="absolute size-6 transition-all duration-300 ease-out"-->
<!--                      />-->
<!--                    </span>-->
<!--                  </button>-->
<!--                </div>-->

<!--                &lt;!&ndash; 展开态内容：锁定第二列 &ndash;&gt;-->
<!--                <div-->
<!--                  v-show="expanded"-->
<!--                  ref="navContent"-->
<!--                  class="col-[2/3] min-w-0 w-full flex items-center justify-between gap-4"-->
<!--                >-->
<!--                  &lt;!&ndash; 左侧（示例：货币选择器占位） &ndash;&gt;-->
<!--                  <form class="hidden sm:block">-->
<!--                    <div class="-ml-1 inline-grid grid-cols-1">-->
<!--                      &lt;!&ndash; 可放下拉等 &ndash;&gt;-->
<!--                    </div>-->
<!--                  </form>-->


<!--                  <div class="flex-1 hidden sm:flex ">-->
<!--                    <div-->
<!--                      class="relative w-full h-full max-w-lg md:max-w-2xl transition-all duration-300 ease-out">-->
<!--                      <input-->
<!--                        class="w-full h-full-->
<!--                              text-sm text-white placeholder-white/60-->
<!--                               outline-none ring-0 focus:ring-0 focus:outline-none-->
<!--                                transition-all duration-300"-->
<!--                        placeholder="搜索音乐、歌手或专辑"-->
<!--                        type="text"-->
<!--                      />-->
<!--                    </div>-->
<!--                  </div>-->

<!--                  &lt;!&ndash; 右侧 登录 / 创建账户 &ndash;&gt;-->
<!--                  <div class="flex items-center space-x-4">-->
<!--                    <a-->
<!--                      class="text-sm font-medium text-white/90 hover:text-white transition-colors whitespace-nowrap"-->
<!--                      href="#">-->
<!--                      {{ copy.auth.signIn }}-->
<!--                    </a>-->
<!--                    <a-->
<!--                      class="text-sm font-medium text-white/90 hover:text-white transition-colors whitespace-nowrap"-->
<!--                      href="#">-->
<!--                      {{ copy.auth.signUp }}-->
<!--                    </a>-->
<!--                  </div>-->
<!--                </div>-->
<!--              </div>-->
<!--            </div>-->
<!--          </div>-->
<!--          &lt;!&ndash; Secondary navigation（预留） &ndash;&gt;-->
<!--        </nav>-->
<!--      </header>-->

      <div
        ref="heroSectionEl"
        class="relative mx-auto flex max-w-3xl flex-col items-center justify-center px-6 text-center lg:px-0 min-h-[70vh] sm:min-h-[90vh]"
        @click="goartistDetail"
      >
        <div ref="heroTextEl"
             class="flex flex-col items-center justify-center will-change-transform">
          <p ref="subtitleEl" class="text-xl text-white">{{ copy.hero.subtitle }}</p>
          <h1 ref="titleEl" class="mt-8 tracking-widest text-4xl font-bold text-white lg:text-6xl">
            {{ copy.hero.title }}
          </h1>
        </div>
      </div>
    </div>
  </div>


  <main>
    <homeCategorySection/>
  </main> d
</template>

<script setup>
import {ref, onMounted, nextTick, onUnmounted} from 'vue'

import gsap from 'gsap'
import router from '@/router/index.js'
import {playListsApi} from "@/api/playListsApi/playListsApi.js";
import HomeCategorySection from "@/components/homeCategorySection/homeCategorySection.vue";

const copy = {
  brand: {name: '你的品牌'},
  common: {shopNow: '立即选购', search: '搜索', help: '帮助'},
  auth: {signIn: '登录', signUp: null},
  hero: {title: 'ILLIT', subtitle: '今日推荐'},
}



const mobileMenuOpen = ref(false)

/** ===== 顶部圆形→展开 动画逻辑 ===== */
const navShell = ref(null)
const navContent = ref(null)
const fabBtn = ref(null)
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
    scale: 1 + progress * 1,        // 最多缩小 8%
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
