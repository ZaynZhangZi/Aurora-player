<template>
  <div class="bg-white">
    <!-- Mobile menu -->
    <TransitionRoot :show="mobileMenuOpen" as="template">
      <Dialog class="relative z-40 lg:hidden" @close="mobileMenuOpen = false">
        <TransitionChild
          as="template"
          enter="transition-opacity ease-linear duration-300"
          enter-from="opacity-0"
          enter-to=""
          leave="transition-opacity ease-linear duration-300"
          leave-from=""
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/25"/>
        </TransitionChild>
        <div class="fixed inset-0 z-40 flex">
          <TransitionChild
            as="template"
            enter="transition ease-in-out duration-300 transform"
            enter-from="-translate-x-full"
            enter-to="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leave-from="translate-x-0"
            leave-to="-translate-x-full"
          >
            <DialogPanel
              class="relative flex w-full max-w-xs flex-col overflow-y-auto bg-white pb-12 shadow-xl"
            >
              <div class="flex px-4 pt-5 pb-2">
                <button
                  class="relative -m-2 inline-flex items-center justify-center rounded-md p-2 text-gray-400"
                  type="button"
                  @click="mobileMenuOpen = false"
                >
                  <span class="absolute -inset-0.5"/>
                  <span class="sr-only">{{ copy.a11y.closeMenu }}</span>
                  <XMarkIcon aria-hidden="true" class="size-6"/>
                </button>
              </div>

              <!-- Links（按需补） -->
              <div class="space-y-6 border-t border-gray-200 px-4 py-6"></div>

              <div class="space-y-6 border-t border-gray-200 px-4 py-6">
                <div class="flow-root">
                  <a class="-m-2 block p-2 font-medium text-gray-900" href="#"
                  >{{ copy.auth.signUp }}</a>
                </div>
                <div class="flow-root">
                  <a class="-m-2 block p-2 font-medium text-gray-900" href="#"
                  >{{ copy.auth.signIn }}</a>
                </div>
              </div>

              <div class="space-y-6 border-t border-gray-200 px-4 py-6">
                <!-- Currency selector -->
                <form>
                  <div class="-ml-2 inline-grid grid-cols-1"></div>
                </form>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

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
      <header class="relative z-10">
        <nav :aria-label="copy.a11y.topNav">
          <div class="fixed inset-x-0 top-0 z-50">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <!-- 外壳：grid 两列，左 48px 固定按钮，右侧自适应内容 -->
              <div
                ref="navShell"
                :class="expanded ? 'rounded-full pl-0 pr-4 sm:pr-6 h-12' : 'h-12 w-12 rounded-full'"
                class="mt-3 grid items-center overflow-hidden border border-white/10 shadow-lg ring-1 ring-white/10 bg-white/10 backdrop-blur-md backdrop-saturate-150 [grid-template-columns:48px_1fr]"
                @mouseenter="hovering = true"
                @mouseleave="hovering = false"
              >
                <!-- 固定占位容器：按钮不会被右侧内容挤动 -->
                <div class="col-[1/2] grid place-items-center size-12 shrink-0">
                  <button
                    ref="fabBtn"
                    :aria-label="expanded ? copy.a11y.closeMenu : copy.a11y.openMenu"
                    :aria-pressed="expanded"
                    :class="expanded ? 'scale-95' : 'scale-100'"
                    class="grid place-items-center size-12 text-white/90 hover:text-white transition-transform duration-300 will-change-transform"
                    style="transform-origin:center center; translate: 0;"
                    @click="toggleExpand()"
                  >
                    <span
                      class="relative inline-flex items-center justify-center size-6 pointer-events-none">
                      <!-- Bars3：收起态 -->
                      <Bars3Icon
                        :class="expanded ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'"
                        aria-hidden="true"
                        class="absolute size-6 transition-all duration-300 ease-out"
                      />
                      <!-- X：展开态 -->
                      <XMarkIcon
                        :class="expanded ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'"
                        aria-hidden="true"
                        class="absolute size-6 transition-all duration-300 ease-out"
                      />
                    </span>
                  </button>
                </div>

                <!-- 展开态内容：锁定第二列 -->
                <div
                  v-show="expanded"
                  ref="navContent"
                  class="col-[2/3] min-w-0 w-full flex items-center justify-between gap-4"
                >
                  <!-- 左侧（示例：货币选择器占位） -->
                  <form class="hidden sm:block">
                    <div class="-ml-1 inline-grid grid-cols-1">
                      <!-- 可放下拉等 -->
                    </div>
                  </form>


                  <div class="flex-1 hidden sm:flex ">
                    <div
                      class="relative w-full h-full max-w-lg md:max-w-2xl transition-all duration-300 ease-out">
                      <input
                        class="w-full h-full
                              text-sm text-white placeholder-white/60
                               outline-none ring-0 focus:ring-0 focus:outline-none
                                transition-all duration-300"
                        placeholder="搜索音乐、歌手或专辑"
                        type="text"
                      />
                    </div>
                  </div>

                  <!-- 右侧 登录 / 创建账户 -->
                  <div class="flex items-center space-x-4">
                    <a
                      class="text-sm font-medium text-white/90 hover:text-white transition-colors whitespace-nowrap"
                      href="#">
                      {{ copy.auth.signIn }}
                    </a>
                    <a
                      class="text-sm font-medium text-white/90 hover:text-white transition-colors whitespace-nowrap"
                      href="#">
                      {{ copy.auth.signUp }}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Secondary navigation（预留） -->
        </nav>
      </header>

      <!-- Hero 主要内容（整块参与滚动动效：文字放大上浮；背景由 heroBgLayerEl 处理） -->
      <div
        ref="heroSectionEl"
        class="relative mx-auto flex max-w-3xl flex-col items-center justify-center px-6 text-center lg:px-0 min-h-[70vh] sm:min-h-[90vh]"
        @click="goartistDetail"
      >
        <!-- 用一个容器包裹标题文字，便于整体放大/上浮 -->
        <div ref="heroTextEl"
             class="flex flex-col items-center justify-center will-change-transform">
          <p ref="subtitleEl" class="text-xl text-white">{{ copy.hero.subtitle }}</p>
          <h1 ref="titleEl" class="mt-8 tracking-widest text-4xl font-bold text-white lg:text-6xl">
            {{ copy.hero.title }}
          </h1>
        </div>
      </div>
    </div>

    <main>
      <!-- Category section -->
      <section aria-labelledby="category-heading"
               class="pt-24 sm:pt-32 xl:mx-auto xl:max-w-7xl xl:px-8">
        <div class="px-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8 xl:px-0">
          <h2 id="category-heading" class="text-2xl font-bold tracking-tight text-gray-900">
            {{ copy.category.heading }}
          </h2>
          <a class="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:block"
             href="#">
            {{ copy.category.browseAll }}
            <span aria-hidden="true"> →</span>
          </a>
        </div>

        <div class="mt-4 flow-root">
          <div class="-my-2">
            <div class="relative py-2">
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                <div
                  v-for="category in getRecommendPlayListdata"
                  :key="category.name"
                  class="relative flex h-80 flex-col overflow-hidden rounded-lg p-6"
                >
                  <span aria-hidden="true" class="absolute inset-0">
<!--                    <img :src="category.picUrl"-->
<!--                         class="size-full object-cover"-->
<!--                    />-->
                    <othersss :src="category.picUrl"/>
                  </span>
                  <span aria-hidden="true"
                        class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-gray-800 opacity-50"/>
                  <span
                    class="relative mt-auto text-center text-xl font-bold text-white inline-block max-w-full whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    {{ category.name }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 px-4 sm:hidden">
          <a class="block text-sm font-semibold text-indigo-600 hover:text-indigo-500" href="#">
            {{ copy.category.browseAll }}
            <span aria-hidden="true"> →</span>
          </a>
        </div>
      </section>

      <!-- Featured section 1 -->
      <section aria-labelledby="social-impact-heading"
               class="mx-auto max-w-7xl px-4 pt-24 sm:px-6 sm:pt-32 lg:px-8">
        <div class="relative overflow-hidden rounded-lg">
          <div class="absolute inset-0">
            <img
              alt=""
              class="size-full object-cover"
              src="https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-01-feature-section-01.jpg"
            />
          </div>
        </div>
        <div class="relative bg-gray-900/75 px-6 py-32 sm:px-12 sm:py-40 lg:px-16 rounded-b-lg">
          <div class="relative mx-auto flex max-w-3xl flex-col items-center text-center">
            <h2 id="social-impact-heading"
                class="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              <span class="block sm:inline">{{ copy.feature1.titleLine1 }}</span>
              <span class="block sm:inline">{{ copy.feature1.titleLine2 }}</span>
            </h2>
            <p class="mt-3 text-xl text-white">{{ copy.feature1.desc }}</p>
            <a
              class="mt-8 block w-full rounded-md border border-transparent bg-white px-8 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 sm:w-auto"
              href="#"
            >
              {{ copy.feature1.cta }}
            </a>
          </div>
        </div>
      </section>

      <!-- Collection section -->
      <section aria-labelledby="collection-heading"
               class="mx-auto max-w-xl px-4 pt-24 sm:px-6 sm:pt-32 lg:max-w-7xl lg:px-8">
        <h2 id="collection-heading" class="text-2xl font-bold tracking-tight text-gray-900">
          {{ copy.collection.heading }}
        </h2>
        <p class="mt-4 text-base text-gray-500">{{ copy.collection.subheading }}</p>

        <div class="mt-10 space-y-12 lg:grid lg:grid-cols-3 lg:space-y-0 lg:gap-x-8">
          <a v-for="collection in collections" :key="collection.name" :href="collection.href"
             class="group block">
            <img
              :alt="collection.imageAlt"
              :src="collection.imageSrc"
              class="aspect-3/2 w-full rounded-lg object-cover group-hover:opacity-75 lg:aspect-5/6"
            />
            <h3 class="mt-4 text-base font-semibold text-gray-900">{{ collection.name }}</h3>
            <p class="mt-2 text-sm text-gray-500">{{ collection.description }}</p>
          </a>
        </div>
      </section>

      <!-- Featured section 2 -->
      <section aria-labelledby="comfort-heading"
               class="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div class="relative overflow-hidden rounded-lg">
          <div class="absolute inset-0">
            <img
              alt=""
              class="size-full object-cover"
              src="https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-01-feature-section-02.jpg"
            />
          </div>
        </div>
        <div class="relative bg-gray-900/75 px-6 py-32 sm:px-12 sm:py-40 lg:px-16 rounded-b-lg">
          <div class="relative mx-auto flex max-w-3xl flex-col items-center text-center">
            <h2 id="comfort-heading"
                class="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {{ copy.feature2.title }}
            </h2>
            <p class="mt-3 text-xl text-white">{{ copy.feature2.desc }}</p>
            <a
              class="mt-8 block w-full rounded-md border border-transparent bg-white px-8 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 sm:w-auto"
              href="#"
            >
              {{ copy.feature2.cta }}
            </a>
          </div>
        </div>
      </section>
    </main>

    <footer aria-labelledby="footer-heading" class="bg-gray-900">
      <h2 id="footer-heading" class="sr-only">{{ copy.a11y.footer }}</h2>
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="py-20 xl:grid xl:grid-cols-3 xl:gap-8">
          <div class="grid grid-cols-2 gap-8 xl:col-span-2">
            <div class="space-y-12 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
              <div>
                <h3 class="text-sm font-medium text-white">{{ copy.footer.headings.shop }}</h3>
                <ul class="mt-6 space-y-6" role="list">
                  <li v-for="item in footerNavigation.shop" :key="item.name" class="text-sm">
                    <a :href="item.href" class="text-gray-300 hover:text-white">{{ item.name }}</a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 class="text-sm font-medium text-white">{{ copy.footer.headings.company }}</h3>
                <ul class="mt-6 space-y-6" role="list">
                  <li v-for="item in footerNavigation.company" :key="item.name" class="text-sm">
                    <a :href="item.href" class="text-gray-300 hover:text-white">{{ item.name }}</a>
                  </li>
                </ul>
              </div>
            </div>
            <div class="space-y-12 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
              <div>
                <h3 class="text-sm font-medium text-white">{{ copy.footer.headings.account }}</h3>
                <ul class="mt-6 space-y-6" role="list">
                  <li v-for="item in footerNavigation.account" :key="item.name" class="text-sm">
                    <a :href="item.href" class="text-gray-300 hover:text-white">{{ item.name }}</a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 class="text-sm font-medium text-white">{{ copy.footer.headings.connect }}</h3>
                <ul class="mt-6 space-y-6" role="list">
                  <li v-for="item in footerNavigation.connect" :key="item.name" class="text-sm">
                    <a :href="item.href" class="text-gray-300 hover:text-white">{{ item.name }}</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div class="mt-12 md:mt-16 xl:mt-0">
            <h3 class="text-sm font-medium text-white">{{ copy.footer.newsletter.title }}</h3>
            <p class="mt-6 text-sm text-gray-300">{{ copy.footer.newsletter.desc }}</p>
            <form class="mt-2 flex sm:max-w-md">
              <input
                id="email-address"
                :aria-label="copy.a11y.email"
                :placeholder="copy.footer.newsletter.placeholder"
                autocomplete="email"
                class="block w-full rounded-md bg-white px-4 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-offset-2 focus:outline-white"
                required
                type="text"
              />
              <div class="ml-4 shrink-0">
                <button
                  class="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-xs hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-hidden"
                  type="submit"
                >
                  {{ copy.footer.newsletter.cta }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div class="border-t border-gray-800 py-10">
          <p class="text-sm text-gray-400">{{ copy.footer.copyright }}</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import {ref, onMounted, nextTick, onUnmounted} from 'vue'
import {Dialog, DialogPanel, TransitionChild, TransitionRoot} from '@headlessui/vue'
import {XMarkIcon, Bars3Icon} from '@heroicons/vue/24/outline'
import gsap from 'gsap'
import PlaylistCover from '@/components/playlistCover/playlistCover.vue'
import router from '@/router/index.js'
import {playListsApi} from "@/api/playListsApi/playListsApi.js";
import Othersss from "@/components/playlistCover/othersss.vue";

const copy = {
  brand: {name: '你的品牌'},
  common: {shopNow: '立即选购', search: '搜索', help: '帮助'},
  auth: {signIn: '登录', signUp: null},
  hero: {title: 'ILLIT', subtitle: '今日推荐'},
  category: {heading: '今日推荐歌单', browseAll: '查看更多'},
  feature1: {
    titleLine1: '升级你的',
    titleLine2: '桌搭',
    desc: '让你的桌面更美也更井井有条。发个照片到社交平台，收获比“人生大事”还多的点赞。',
    cta: '选购桌搭',
  },
  collection: {
    heading: '按系列选购',
    subheading: '每一季，我们都与世界级设计师合作，灵感取自自然万物。',
  },
  feature2: {
    title: '极简效率系统',
    desc: '任务无穷无尽，时间总是有限。放下复杂看板与流程，用一个小小的圆圈，找回完成的成就感。',
    cta: '选购 Focus 系列',
  },
  footer: {
    headings: {shop: '商店', company: '公司', account: '账户', connect: '关注我们'},
    newsletter: {
      title: '订阅我们的邮件',
      desc: '每周为你送上最新折扣与精选好物。',
      placeholder: '填写你的邮箱',
      cta: '订阅',
    },
    copyright: 'Copyright © 2021 Your Company, Inc.',
  },
  a11y: {
    closeMenu: '关闭菜单',
    openMenu: '打开菜单',
    search: '搜索',
    help: '帮助',
    itemsInCart: '购物车中的商品，查看购物袋',
    email: '邮箱地址',
    currency: '货币',
    footer: '页脚',
    topNav: '主导航',
  },
}

const categories = [
  {
    name: 'New Arrivals',
    href: '#',
    imageSrc: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-01-category-01.jpg'
  },
  {
    name: 'Productivity',
    href: '#',
    imageSrc: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-01-category-02.jpg'
  },
  {
    name: 'Workspace',
    href: '#',
    imageSrc: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-01-category-04.jpg'
  },
  {
    name: 'Accessories',
    href: '#',
    imageSrc: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-01-category-05.jpg'
  },
]

const collections = [
  {
    name: 'Handcrafted Collection',
    href: '#',
    imageSrc: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-01-collection-01.jpg',
    imageAlt: 'Brown leather key ring with brass metal loops and rivets on wood table.',
    description: 'Keep your phone, keys, and wallet together, so you can lose everything at once.',
  },
  {
    name: 'Organized Desk Collection',
    href: '#',
    imageSrc: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-01-collection-02.jpg',
    imageAlt: 'Natural leather mouse pad on white desk next to porcelain mug and keyboard.',
    description: 'The rest of the house will still be a mess, but your desk will look great.',
  },
  {
    name: 'Focus Collection',
    href: '#',
    imageSrc: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-01-collection-03.jpg',
    imageAlt: 'Person placing task list card into walnut card holder next to felt carrying case on leather desk pad.',
    description: 'Be more productive than enterprise project managers with a single piece of paper.',
  },
]

const footerNavigation = {
  shop: [
    {name: 'Bags', href: '#'},
    {name: 'Tees', href: '#'},
    {name: 'Objects', href: '#'},
    {name: 'Home Goods', href: '#'},
    {name: 'Accessories', href: '#'},
  ],
  company: [
    {name: 'Who we are', href: '#'},
    {name: 'Sustainability', href: '#'},
    {name: 'Press', href: '#'},
    {name: 'Careers', href: '#'},
    {name: 'Terms & Conditions', href: '#'},
    {name: 'Privacy', href: '#'},
  ],
  account: [
    {name: 'Manage Account', href: '#'},
    {name: 'Returns & Exchanges', href: '#'},
    {name: 'Redeem a Gift Card', href: '#'},
  ],
  connect: [
    {name: 'Contact Us', href: '#'},
    {name: 'Facebook', href: '#'},
    {name: 'Instagram', href: '#'},
    {name: 'Pinterest', href: '#'},
  ],
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
