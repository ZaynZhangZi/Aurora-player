<template>
  <Teleport to="body">
    <Transition
      :css="false"
      @enter="handleEnter"
      @leave="handleLeave"
      @after-leave="handleAfterLeave"
    >
      <div
        v-if="overlay"
        :key="overlayKey"
        class="detail-overlay-layer"
        :class="{ 'is-mobile': isMobile }"
      >
        <div class="detail-overlay-backdrop" @click="handleBackdropClick" />

        <div
          ref="dialogRef"
          class="detail-overlay-dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="dialogLabel"
          tabindex="-1"
          @keydown="handleDialogKeydown"
        >
          <button
            ref="closeButtonRef"
            type="button"
            class="detail-overlay-close"
            aria-label="关闭详情"
            @click="handleClose"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m7.5 7.5 9 9m0-9-9 9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
            </svg>
          </button>

          <div class="detail-overlay-scroll">
            <component
              :is="overlay.comp"
              v-if="overlay.comp"
              class="detail-overlay-page"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * DetailOverlayHost — 全局唯一的实体详情悬浮层宿主。
 *
 * 取代「每个父路由各挂一个 ModalRouterView + 各自声明详情子路由」的旧结构。
 * App.vue 的背景状态机决定当前详情是「悬浮模式」还是「整页模式」，
 * 只有悬浮模式会把 overlay 对象传进来，由本组件渲染。
 *
 * 职责：
 *  - 统一的桌面尺寸/圆角/遮罩/动画；移动端近全屏。
 *  - 单一主滚动容器（.detail-overlay-scroll），避免双滚动条。
 *  - 遮罩点击、关闭按钮、Escape、浏览器返回（由路由驱动）、鼠标返回键（App 手势）关闭。
 *  - 打开锁定底层滚动（嵌套安全），关闭还原。
 *  - role=dialog / aria-modal / 焦点进入 / 焦点锁定 / 关闭后焦点恢复。
 *  - prefers-reduced-motion 降级。
 *  - 感知封面 Hero 过渡：有 pending hero 时跳过缩放/模糊入场，避免裁切飞入的封面。
 *  - 向详情组件提供 matchedRouteKey 等注入，保证 onBeforeRouteLeave 正常。
 */
import { computed, nextTick, onBeforeUnmount, provide, ref, watch } from 'vue'
import { gsap } from 'gsap'
import {
  matchedRouteKey,
  routerViewLocationKey,
  viewDepthKey,
} from 'vue-router'
import { DETAIL_OVERLAY_MODE_KEY, DETAIL_TYPES } from '@/composables/useDetailNavigation.js'
import { peekPendingTransition } from '@/utils/heroTransition.js'
import { lockScroll, unlockScroll } from '@/utils/scrollLock.js'

const props = defineProps({
  // { comp, record, route, type, id } | null
  overlay: { type: Object, default: null },
})

const emit = defineEmits(['request-close'])

const dialogRef = ref(null)
const closeButtonRef = ref(null)
let lastFocusedEl = null
let escBound = false

const isMobile = ref(false)
if (typeof window !== 'undefined' && window.matchMedia) {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}

const overlayKey = computed(() => props.overlay?.route?.fullPath || 'detail-overlay')

const dialogLabel = computed(() => {
  const type = props.overlay?.type
  const title = type && DETAIL_TYPES[type] ? DETAIL_TYPES[type].title : '详情'
  return `${title}详情`
})

// ── 向详情组件提供路由上下文，保证 onBeforeRouteLeave / useRoute 正常 ──
provide(DETAIL_OVERLAY_MODE_KEY, true)
provide(matchedRouteKey, computed(() => props.overlay?.record || null))
provide(routerViewLocationKey, computed(() => props.overlay?.route || null))
provide(viewDepthKey, 0)

/* ── 滚动锁：按「悬浮层是否存在」管理，而非按过渡钩子。
   详情 -> 详情切换（如歌手页点专辑）时，旧层 leave 与新层 enter 并发，
   若在 after-leave 里解锁会把计数清零导致底层可滚动。这里只在
   null <-> 非 null 边界各加/解一次锁，切换期间计数保持不变。
   详情内部的二级弹窗（如专辑信息弹窗）仍通过 scrollLock 计数嵌套叠加。 */
let overlayLockActive = false
watch(
  () => Boolean(props.overlay),
  (open) => {
    if (open && !overlayLockActive) {
      lockScroll()
      overlayLockActive = true
    } else if (!open && overlayLockActive) {
      unlockScroll()
      overlayLockActive = false
    }
  },
  { flush: 'post' },
)

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

function hasPendingHero() {
  const type = props.overlay?.type
  const id = props.overlay?.id
  if (!type || !id) return false
  return Boolean(peekPendingTransition(type, id))
}

/* ── 焦点管理 ── */
const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

function focusFirstInDialog() {
  const el = dialogRef.value
  if (!el) return
  // 优先聚焦关闭按钮，行为可预期且不会误触页面内操作
  if (closeButtonRef.value) {
    closeButtonRef.value.focus()
    return
  }
  const first = el.querySelector(FOCUSABLE)
  if (first) first.focus()
  else el.focus()
}

function handleDialogKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    handleClose()
    return
  }
  if (event.key !== 'Tab') return

  const el = dialogRef.value
  if (!el) return
  const focusables = [...el.querySelectorAll(FOCUSABLE)].filter(
    (node) => node.offsetParent !== null || node === document.activeElement,
  )
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function handleDocumentKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    handleClose()
  }
}

function bindEscape() {
  if (escBound) return
  window.addEventListener('keydown', handleDocumentKeydown, true)
  escBound = true
}

function unbindEscape() {
  if (!escBound) return
  window.removeEventListener('keydown', handleDocumentKeydown, true)
  escBound = false
}

/* ── 关闭 ── */
function handleClose() {
  emit('request-close')
}

function handleBackdropClick() {
  emit('request-close')
}

/* ── 动画 ── */
function handleEnter(el, done) {
  lastFocusedEl = document.activeElement
  bindEscape()

  const backdrop = el.querySelector('.detail-overlay-backdrop')
  const dialog = el.querySelector('.detail-overlay-dialog')

  if (prefersReducedMotion()) {
    gsap.set([backdrop, dialog], { opacity: 1, scale: 1, y: 0, filter: 'none' })
    nextTick(focusFirstInDialog)
    done()
    return
  }

  // 有封面 Hero 飞入时：不做缩放/模糊（会裁切飞入的封面），只做遮罩淡入。
  if (hasPendingHero()) {
    const prevOverflow = dialog.style.overflow
    dialog.style.overflow = 'visible'
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' })
    gsap.set(dialog, { opacity: 1, scale: 1, y: 0 })
    nextTick(focusFirstInDialog)
    window.setTimeout(() => {
      dialog.style.overflow = prevOverflow || ''
    }, 880)
    done()
    return
  }

  gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power2.out' })
  gsap.fromTo(
    dialog,
    { opacity: 0, scale: 0.965, y: 24, filter: 'blur(8px)' },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.6,
      ease: 'back.out(0.82)',
      onComplete: done,
    },
  )
  nextTick(focusFirstInDialog)
}

function handleLeave(el, done) {
  unbindEscape()
  const backdrop = el.querySelector('.detail-overlay-backdrop')
  const dialog = el.querySelector('.detail-overlay-dialog')

  if (prefersReducedMotion()) {
    done()
    return
  }

  gsap.to(backdrop, { opacity: 0, duration: 0.22, ease: 'power2.in' })
  gsap.to(dialog, {
    opacity: 0,
    scale: 0.975,
    y: 12,
    filter: 'blur(4px)',
    duration: 0.26,
    ease: 'power3.in',
    onComplete: done,
  })
}

function handleAfterLeave() {
  // 详情 -> 详情切换时旧层也会触发 after-leave，此时仍有新层打开，
  // 不应把焦点弹回背景；只有真正关闭（overlay 为空）才恢复焦点。
  if (props.overlay) return
  if (lastFocusedEl && typeof lastFocusedEl.focus === 'function' && document.contains(lastFocusedEl)) {
    lastFocusedEl.focus()
  }
  lastFocusedEl = null
}

onBeforeUnmount(() => {
  unbindEscape()
  if (overlayLockActive) {
    unlockScroll()
    overlayLockActive = false
  }
})
</script>

<style scoped>
.detail-overlay-layer {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 底部避让全局播放器，播放器不被遮挡且可继续操作 */
  padding: 24px 24px calc(var(--global-player-space, 92px) + 24px) 24px;
  box-sizing: border-box;
}

.detail-overlay-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  /* 遮罩铺满全屏统一压暗；播放器层级（z-1210）高于悬浮层，仍浮在遮罩之上可操作，
     避免播放器两侧露出未压暗的底层页面形成一条白底 */
  bottom: 0;
  background: rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}

.detail-overlay-dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  /* 三种实体共用同一套容器尺寸 */
  width: 80vw;
  /* 先用 vh 兜底，支持 dvh 的浏览器用动态视口高度：
     移动端地址栏/工具栏不应把弹窗底部顶出可视区，否则内容看起来「滚不到」 */
  height: min(86vh, calc(100vh - var(--global-player-space, 92px) - 72px));
  height: min(86dvh, calc(100dvh - var(--global-player-space, 92px) - 72px));
  overflow: hidden;
  border-radius: 26px;
  /* 与详情页基底色一致，避免内容未铺满时露出刺眼纯白 */
  background: #fafafa;
  box-shadow: 0 32px 90px rgba(20, 16, 14, 0.32), 0 4px 16px rgba(20, 16, 14, 0.12);
  outline: none;
  will-change: transform, opacity;
}

/* 单一主滚动容器：详情组件内部的固定头部 + 该滚动区，避免双滚动条 */
.detail-overlay-scroll {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  overscroll-behavior: contain;
}

.detail-overlay-page {
  width: 100%;
  height: 100%;
  /* 注意：这里不要声明 display，
     它会被作用到详情组件根节点上，并覆盖组件自己的 display:flex
     （未分层的 scoped 样式优先级高于 Tailwind 的 @layer utilities），
     曾导致歌单详情页 flex 布局失效、内部滚动区塌陷而无法滚动。 */
}

.detail-overlay-close {
  position: absolute;
  top: 14px;
  right: 14px;
  /* 高于详情页内部内容/吸顶导航（最大 z-50），但低于详情页自身的全屏弹层
     （album showModal z-100 / artist 灯箱 z-1002），避免吸顶头部盖住关闭按钮导致点击失效 */
  z-index: 60;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  color: rgba(28, 25, 23, 0.72);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 4px 14px rgba(20, 16, 14, 0.14);
  transition: background-color 180ms ease, color 180ms ease, transform 180ms ease;
}

.detail-overlay-close:hover {
  background: #fff;
  color: rgb(28, 25, 23);
}

.detail-overlay-close:active {
  transform: scale(0.92);
}

.detail-overlay-close svg {
  width: 20px;
  height: 20px;
}

/* 移动端：近全屏详情层，避免狭窄居中弹窗 */
.detail-overlay-layer.is-mobile {
  padding: 0 0 calc(var(--global-player-space, 82px)) 0;
}

.detail-overlay-layer.is-mobile .detail-overlay-dialog {
  width: 100vw;
  height: calc(100vh - var(--global-player-space, 82px));
  height: calc(100dvh - var(--global-player-space, 82px));
  border-radius: 20px 20px 0 0;
}

@media (max-width: 768px) {
  .detail-overlay-layer {
    padding: 0 0 calc(var(--global-player-space, 82px)) 0;
  }

  .detail-overlay-dialog {
    width: 100vw;
    height: calc(100vh - var(--global-player-space, 82px));
    height: calc(100dvh - var(--global-player-space, 82px));
    border-radius: 20px 20px 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail-overlay-dialog {
    transition: none;
  }
}
</style>
