<template>
  <!-- 固定在顶部：你也可以通过 props 改位置/宽度 -->
  <div class="fixed inset-x-0 top-0 z-50 pointer-events-none">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- 外壳：grid 两列，左 48px 固定按钮，右侧自适应内容 -->
      <div
        ref="shell"
        :class="expanded ? 'rounded-full pl-0 pr-4 sm:pr-6 h-12' : 'h-12 w-12 rounded-full'"
        class="mt-3 grid items-center overflow-hidden border border-white/10 shadow-lg ring-1 ring-white/10 bg-white/10 backdrop-blur-md backdrop-saturate-150 [grid-template-columns:48px_1fr] pointer-events-auto"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
      >
        <!-- 固定占位容器：按钮不会被右侧内容挤动 -->
        <div class="col-[1/2] grid place-items-center size-12 shrink-0">
          <button
            ref="btn"
            :aria-pressed="expanded"
            :class="expanded ? 'scale-95' : 'scale-100'"
            class="grid place-items-center size-12 text-white/90 hover:text-white transition-transform duration-300 will-change-transform"
            type="button"
            @click="toggle()"
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
          ref="content"
          class="col-[2/3] min-w-0 w-full flex items-center justify-between gap-4"
        >
          <!-- 左侧插槽（可选：比如货币/分类） -->
          <div class="hidden sm:block">
            <slot name="left"></slot>
          </div>

          <!-- 搜索框 -->
          <div class="flex-1 hidden sm:flex">
            <div
              class="relative w-full h-full max-w-lg md:max-w-2xl transition-all duration-300 ease-out">
              <input
                ref="input"
                :placeholder="placeholder"
                class="w-full h-full text-sm text-white placeholder-white/60 bg-transparent
                       outline-none ring-0 focus:ring-0 focus:outline-none transition-all duration-300"
                type="text"
                @keydown.enter="$emit('search', inputValue)"
                v-model="inputValue"
              />
            </div>
          </div>

          <!-- 右侧 登录 / 注册（可隐藏） -->
          <div v-if="showAuth" class="flex items-center space-x-4">
            <a
              class="text-sm font-medium text-white/90 hover:text-white transition-colors whitespace-nowrap"
             @click="isLogin">
              {{ signInLabel }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>



  <Dialog :open="isOpen" @close="setIsOpen">
    <DialogPanel>
      <DialogTitle>Deactivate account</DialogTitle>
      <DialogDescription>
        This will permanently deactivate your account
      </DialogDescription>

      <p>
        Are you sure you want to deactivate your account? All of your data will be
        permanently removed. This action cannot be undone.
      </p>

      <button @click="setIsOpen(false)">Deactivate</button>
      <button @click="setIsOpen(false)">Cancel</button>
    </DialogPanel>
  </Dialog>
</template>

<script setup>
/**
 * 独立可复用的 “悬浮圆形 → 展开的搜索栏”
 * - 不依赖页面其它 DOM
 * - 支持自动滚动展开（autoExpandOnScroll）
 * - 暴露 expand/collapse/toggle 方法
 */
import {ref, onMounted, onBeforeUnmount, watch, nextTick, defineExpose} from 'vue'
import gsap from 'gsap'
import {XMarkIcon, Bars3Icon} from '@heroicons/vue/24/outline'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@headlessui/vue'

const props = defineProps({
  modelValue: {type: Boolean, default: false},          // 受控展开
  autoExpandOnScroll: {type: Boolean, default: true},   // 滚动后自动展开
  scrollThreshold: {type: Number, default: 24},         // 触发的滚动阈值
  placeholder: {type: String, default: '搜索音乐、歌手或专辑'},
  signInLabel: {type: String, default: '登录'},
  signUpLabel: {type: String, default: ''},             // 不传则不展示
  showAuth: {type: Boolean, default: true},
})

const emit = defineEmits(['update:modelValue', 'expand', 'collapse', 'toggle', 'search', 'signin', 'signup'])

const shell = ref(null)
const content = ref(null)
const btn = ref(null)
const input = ref(null)

const expanded = ref(props.modelValue)
const hovering = ref(false)
const inputValue = ref('')

let navTl = null
let autoExpandByScroll = false
let resizing = false

watch(() => props.modelValue, (v) => {
  if (v !== expanded.value) animateExpand(v)
})

function measureExpandedWidth() {
  const el = shell.value
  const cnt = content.value
  if (!el || !cnt) return 48
  const prev = {width: el.style.width}
  el.style.width = 'auto'
  const rect = el.getBoundingClientRect()
  el.style.width = prev.width
  return rect.width
}

function animateExpand(toExpand) {
  if (!shell.value) return
  navTl?.kill()

  const toWidth = toExpand ? measureExpandedWidth() : 48

  navTl = gsap.timeline({defaults: {ease: 'power3.out', duration: 0.5}})
    .to(shell.value, {
      width: toWidth,
      height: 48,
      borderRadius: 9999,
      onStart: () => {
        if (toExpand) expanded.value = true
      },
      onComplete: () => {
        if (!toExpand) expanded.value = false
        navTl = null
        if (toExpand) input.value?.focus()
      },
    }, 0)

  if (toExpand) {
    navTl.fromTo(content.value, {opacity: 0, y: -6}, {opacity: 1, y: 0, duration: 0.35}, 0.1)
  } else {
    navTl.to(content.value, {opacity: 0, y: -6, duration: 0.2}, 0)
  }

  emit('update:modelValue', toExpand)
  emit(toExpand ? 'expand' : 'collapse')
}

function expand() {
  animateExpand(true)
}

function collapse() {
  animateExpand(false)
}

function toggle() {
  animateExpand(!expanded.value);
  emit('toggle', expanded.value)
}

function onScroll() {
  if (!props.autoExpandOnScroll) return
  const y = window.scrollY || document.documentElement.scrollTop
  const nearTop = y <= props.scrollThreshold
  if (!nearTop && !expanded.value) {
    autoExpandByScroll = true
    expand()
  } else if (nearTop && expanded.value && autoExpandByScroll && !hovering.value) {
    collapse()
    autoExpandByScroll = false
  }
}

defineExpose({expand, collapse, toggle, focus: () => input.value?.focus()})

onMounted(async () => {
  await nextTick()
  if (shell.value) gsap.set(shell.value, {width: 48, height: 48, borderRadius: 9999})
  window.addEventListener('scroll', onScroll, {passive: true})
})

onBeforeUnmount(() => {
  navTl?.kill()
  window.removeEventListener('scroll', onScroll)
})

let isLogin = () => {
  console.log(1)
  setIsOpen();
}
const isOpen = ref(true)

function setIsOpen(value) {
  isOpen.value = value
}
</script>

<style scoped>
/* 抗抖动：在部分浏览器减少亚像素抖动 */
button, svg {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
}
</style>
