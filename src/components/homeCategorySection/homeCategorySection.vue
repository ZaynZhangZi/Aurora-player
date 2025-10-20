<template>
  <div class="bg-gray-50" ref="root">
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div class="sm:flex sm:items-baseline sm:justify-between">
        <h2 class="text-2xl font-bold tracking-tight text-gray-900">{{ title }}</h2>
        <a href="#"
           class="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:block">
          {{ more }}
          <span v-if="more" aria-hidden="true"> &rarr;</span>
        </a>
      </div>

      <!-- 网格：保持你的原布局不变 -->
      <div
        @click="router.push('/home/playList')"
        class="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:grid-rows-2 sm:gap-x-6 lg:gap-8"
      >
        <!-- ========== 骨架屏（加载中） ========== -->
        <template v-if="loading">
          <!-- 左侧大卡（两行） -->
          <div
            class="group relative aspect-2/1 overflow-hidden rounded-lg sm:row-span-2 sm:aspect-square">
            <div class="skeleton-block absolute inset-0"></div>
            <div class="absolute inset-0 flex items-end p-6">
              <div class="w-full">
                <div class="skeleton-line h-5 w-2/5"></div>
                <div class="mt-2 skeleton-line h-3 w-1/4"></div>
              </div>
            </div>
          </div>
          <!-- 右上小卡 -->
          <div class="group relative aspect-2/1 overflow-hidden rounded-lg sm:aspect-auto">
            <div class="skeleton-block absolute inset-0"></div>
            <div class="absolute inset-0 flex items-end p-6">
              <div class="w-full">
                <div class="skeleton-line h-5 w-1/3"></div>
                <div class="mt-2 skeleton-line h-3 w-1/5"></div>
              </div>
            </div>
          </div>
          <!-- 右下小卡 -->
          <div class="group relative aspect-2/1 overflow-hidden rounded-lg sm:aspect-auto">
            <div class="skeleton-block absolute inset-0"></div>
            <div class="absolute inset-0 flex items-end p-6">
              <div class="w-full">
                <div class="skeleton-line h-5 w-1/3"></div>
                <div class="mt-2 skeleton-line h-3 w-1/5"></div>
              </div>
            </div>
          </div>
        </template>

        <!-- ========== 真实内容（加载完） ========== -->
        <template v-else>
          <!-- 左侧大卡（两行） -->
          <div
            class="real-card group relative aspect-2/1 overflow-hidden rounded-lg sm:row-span-2 sm:aspect-square">
            <img
              :src="cardImages[0]"
              alt="featured"
              class="absolute size-full object-cover group-hover:opacity-75"
            />
            <div aria-hidden="true"
                 class="absolute inset-0 bg-linear-to-b from-transparent to-black opacity-50"/>
            <div class="absolute inset-0 flex items-end p-6">
              <div>
                <h3 class="font-semibold text-white">
                  <a href="#"><span class="absolute inset-0"/>{{ playlists[0].name }}</a>
                </h3>
                <p aria-hidden="true" class="mt-1 text-sm text-white">{{
                    playlists[0].copywriter
                  }}</p>
              </div>
            </div>
          </div>

          <!-- 右上小卡 -->
          <div
            class="real-card group relative aspect-2/1 overflow-hidden rounded-lg sm:aspect-auto">
            <img
              :src="cardImages[1]"
              alt="category-01"
              class="absolute size-full object-cover group-hover:opacity-75"
            />
            <div aria-hidden="true"
                 class="absolute inset-0 bg-linear-to-b from-transparent to-black opacity-50"/>
            <div class="absolute inset-0 flex items-end p-6">
              <div>
                <h3 class="font-semibold text-white">
                  <a href="#"><span class="absolute inset-0"/>{{ playlists[1].name }}</a>
                </h3>
                <p aria-hidden="true" class="mt-1 text-sm text-white">{{
                    playlists[1].copywriter
                  }}</p>
              </div>
            </div>
          </div>

          <!-- 右下小卡 -->
          <div
            class="real-card group relative aspect-2/1 overflow-hidden rounded-lg sm:aspect-auto">
            <img
              :src="cardImages[2]"
              alt="category-02"
              class="absolute size-full object-cover group-hover:opacity-75"
            />
            <div aria-hidden="true"
                 class="absolute inset-0 bg-linear-to-b from-transparent to-black opacity-50"/>
            <div class="absolute inset-0 flex items-end p-6">
              <div>
                <h3 class="font-semibold text-white">
                  <a href="#"><span class="absolute inset-0"/>{{ playlists[2].name }}</a>
                </h3>
                <p aria-hidden="true" class="mt-1 text-sm text-white">{{
                    playlists[2].copywriter
                  }}</p>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="mt-6 sm:hidden">
        <a href="#" class="block text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          Browse all categories
          <span aria-hidden="true"> &rarr;</span>
        </a>
      </div>
    </div>
  </div>

  <!-- 路由弹窗区（原样保留） -->
  <router-view v-slot="{ Component }">
    <Teleport to="body" v-if="Component || isClosing">
      <div class="modal-overlay">
        <div class="modal-backdrop" @click="closeModal"/>
        <Transition @enter="enterAnim" @leave="leaveAnim" appear>
          <component :is="Component" class="modal-content" v-if="!isClosing"/>
        </Transition>
      </div>
    </Teleport>
  </router-view>
</template>

<script setup>
import {onMounted, onBeforeUnmount, ref, watch, nextTick} from 'vue'
import {useRoute} from 'vue-router'
import gsap from 'gsap'
import router from '@/router/index.js'
import {songsApi} from '@/api/songsApi/songsApi.js'

/** props */
const props = defineProps({
  title: {type: String, default: '这个是标题'},
  more: {type: String, default: ''}
})

/** refs/state */
const root = ref(null)
const cleanups = []
const route = useRoute()

const loading = ref(true)
const playlists = ref([])
/** 用你的接口数据替换封面；这里只是兜底处理：如果接口没图也能显示 */
const cardImages = ref([
  'https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-03-featured-category.jpg',
  'https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-03-category-01.jpg',
  'https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-03-category-02.jpg'
])

/** 数据获取 */
async function getNewSongs() {
  try {
    loading.value = true
    const res = await songsApi.getHighQualitySongs()
    console.log(res)
    playlists.value = res?.data?.playlists ?? []
    if (playlists.value.length >= 3) {
      cardImages.value = [
        playlists.value[0]?.coverImgUrl ?? cardImages.value[0],
        playlists.value[1]?.coverImgUrl ?? cardImages.value[1],
        playlists.value[2]?.coverImgUrl ?? cardImages.value[2]
      ]
    }
  } catch (e) {
    console.error('getHighQualitySongs error:', e)
  } finally {
    loading.value = false
  }
}

/** 挂载时拉取数据 */
onMounted(() => {
  getNewSongs()
})

/** hover 动效：只在加载完成后挂 */
function mountHover() {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (coarse || reduced) return

  const scope = root.value ?? document
  const cards = scope.querySelectorAll('.real-card.group.relative')

  cards.forEach((card) => {
    const textWrap = card.querySelector('.flex.items-end > div')
    if (!textWrap) return

    gsap.set(textWrap, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      willChange: 'transform, filter, opacity'
    })

    let tl
    const enter = () => {
      tl?.kill()
      tl = gsap.timeline({defaults: {ease: 'power3.out'}})
        .to(textWrap, {duration: 0.35, opacity: 1, y: -4, filter: 'blur(0px)'})
    }
    const leave = () => {
      tl?.kill()
      tl = gsap.timeline({defaults: {ease: 'power2.inOut'}})
        .to(textWrap, {duration: 0.25, opacity: 0.86, filter: 'blur(4px)', y: 10})
        .to(textWrap, {
          duration: 0.8,
          y: '-100%',
          opacity: 0,
          filter: 'blur(8px)',
          ease: 'power2.inOut'
        })
        .set(textWrap, {y: '100%'})
        .to(textWrap, {duration: 0.6, y: '0%', opacity: 1, filter: 'blur(0px)', ease: 'power3.out'})
    }

    card.addEventListener('pointerenter', enter)
    card.addEventListener('pointerleave', leave)
    cleanups.push(() => {
      card.removeEventListener('pointerenter', enter)
      card.removeEventListener('pointerleave', leave)
    })
  })
}

/** 骨架屏 -> 真实内容：GSAP 丝滑过渡 */
watch(loading, async (isLoading) => {
  await nextTick()
  if (!isLoading) {
    const scope = root.value ?? document
    const skeletons = scope.querySelectorAll('.skeleton-block, .skeleton-line')
    const cards = scope.querySelectorAll('.real-card')

    // 1) 骨架淡出 + 模糊消散
    gsap.to(skeletons, {
      opacity: 0,
      filter: 'blur(6px)',
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => skeletons.forEach(el => (el.style.display = 'none'))
    })

    // 2) 真实内容淡入 + 上浮
    gsap.fromTo(
      cards,
      {opacity: 0, y: 20, filter: 'blur(8px)'},
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.1,
        delay: 0.15
      }
    )

    // 3) 加载后再挂 hover 动效
    mountHover()
  } else {
    // 回到 loading（极少见，比如手动刷新）时清理事件
    cleanups.forEach(fn => fn())
    cleanups.length = 0
  }
}, {immediate: false})

/** 路由弹窗：禁止背景滚动 */
watch(() => route.matched.length > 1, (hasModal) => {
  if (hasModal) {
    const sw = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${sw}px`
  } else {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  }
}, {immediate: true})

/** 弹窗控制（与你原逻辑一致） */
const isClosing = ref(false)

function closeModal() {
  if (isClosing.value) return
  isClosing.value = true
  setTimeout(() => {
    router.back()
    isClosing.value = false
  }, 500)
}

/** 弹窗进出场 */
function enterAnim(el, done) {
  gsap.fromTo(
    el,
    {y: '100%', opacity: 0},
    {y: '0%', opacity: 1, duration: 0.9, ease: 'elastic.out(1, 1)', onComplete: done}
  )
}

function leaveAnim(el, done) {
  gsap.to(el, {y: '100%', opacity: 0, duration: 0.5, ease: 'power2.in', onComplete: done})
}

/** 卸载清理 */
onBeforeUnmount(() => {
  cleanups.forEach(fn => fn())
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})
</script>

<style scoped>
/* 你的原样式：文字块的渲染优化 */
.group.relative .flex.items-end > div {
  will-change: transform, filter, opacity;
  transform-origin: center;
}

/* 骨架屏（同尺寸占位，不改变布局） */
.skeleton-block {
  --base: 230, 231, 235;
  background: linear-gradient(
    90deg,
    rgba(var(--base), 0.15) 25%,
    rgba(var(--base), 0.35) 37%,
    rgba(var(--base), 0.15) 63%
  );
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.2s infinite linear;
}

.skeleton-line {
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    rgba(230, 231, 235, 0.35) 25%,
    rgba(230, 231, 235, 0.6) 37%,
    rgba(230, 231, 235, 0.35) 63%
  );
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.2s infinite linear;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 弹窗（保留） */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9;
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
}

.modal-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 1440px;
  height: 80vh;
  background: white;
  border-radius: 1rem;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
</style>
