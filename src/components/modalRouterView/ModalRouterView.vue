<template>
  <RouterView v-slot="{ Component }">
    <Teleport :to="to" v-if="Component">
      <div class="modal-overlay">
        <div class="modal-backdrop" @click="handleBackdropClick" />

        <Transition
          :appear="appear"
          @enter="handleEnter"
          @leave="handleLeave"
        >
          <div
            v-if="Component"
            class="modal-content"
            :style="{
              width: props.contentWidth,
              height: props.contentHeight,
              borderRadius: props.contentRadius,
            }"
          >
            <component :is="Component" class="modal-page" />
          </div>
        </Transition>
      </div>
    </Teleport>
  </RouterView>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { markNavigatingBack } from '@/router/index.js'
import { gsap } from 'gsap'
import {
  peekPendingPlaylistHeroTransition,
  setPendingPlaylistHeroTransition,
} from '@/utils/playlistFlipHero.js'

const props = defineProps({
  to: { type: String, default: 'body' },
  appear: { type: Boolean, default: true },
  closeOnBackdrop: { type: Boolean, default: true },
  contentWidth: { type: String, default: '90vw' },
  contentHeight: { type: String, default: '90vh' },
  contentRadius: { type: String, default: '18px' },

  /** 允许用户覆盖默认动画 */
  enterAnim: { type: Function, default: null },
  leaveAnim: { type: Function, default: null },
})

const emit = defineEmits(['closed', 'backdrop-click'])

const router = useRouter()
const route = useRoute()

// 记录原始 body overflow，避免影响别的页面
const originalBodyOverflow = ref('')

function lockScroll() {
  if (typeof window === 'undefined') return
  originalBodyOverflow.value = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function unlockScroll() {
  if (typeof window === 'undefined') return
  document.body.style.overflow = originalBodyOverflow.value || ''
}

function closeModal() {
  markNavigatingBack()
  const id = Number(route.query?.id || 0)
  const coverEl = document.querySelector('[data-playlist-detail-hero-cover]')
  if (id > 0 && coverEl instanceof HTMLElement) {
    const coverImg = coverEl.querySelector('img')
    setPendingPlaylistHeroTransition(id, {
      coverRect: coverEl.getBoundingClientRect(),
      coverSrc: coverImg?.getAttribute('src') || '',
    })
  }

  const matched = route.matched || []
  let target = null

  if (matched.length > 1) {
    const parent = matched[matched.length - 2]
    if (parent?.name) {
      target = {name: parent.name}
    } else if (parent?.path) {
      target = parent.path
    }
  }

  if (target) {
    router.push(target)
    return
  }

  if (window.history.length > 1) {
    router.back()
    return
  }

  router.push('/home')
}

function handleBackdropClick() {
  emit('backdrop-click')
  if (props.closeOnBackdrop) closeModal()
}

/* ============================
   🌟 默认入场动画（Apple风格）
============================ */
function defaultEnter(el, done) {
  gsap.fromTo(
    el,
    { opacity: 0, scale: 0.965, y: 24, filter: 'blur(8px)' },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.62,
      ease: 'back.out(0.82)',
      onComplete: done,
    },
  )
}

/* ============================
   🌟 默认离场动画
============================ */
function defaultLeave(el, done) {
  gsap.to(el, {
    opacity: 0,
    scale: 0.97,
    y: 10,
    filter: 'blur(5px)',
    duration: 0.24,
    ease: 'power3.in',
    onComplete: done,
  })
}

/* ============================
   统一入口：决定用默认还是自定义
============================ */
function handleEnter(el, done) {
  lockScroll()

  if (peekPendingPlaylistHeroTransition(route.query?.id)) {
    // Hero 过渡：封面会从 modal 外部飞入，需要临时取消 overflow 裁剪
    const origOverflow = el.style.overflow
    el.style.overflow = 'visible'

    gsap.set(el, {opacity: 1, scale: 1, y: 0})
    done()

    // 等 Hero 动画（~680ms）结束后恢复 overflow
    setTimeout(() => {
      el.style.overflow = origOverflow || ''
    }, 880)

    return
  }

  if (props.enterAnim) props.enterAnim(el, done)
  else defaultEnter(el, done)
}

function handleLeave(el, done) {
  const wrappedDone = () => {
    unlockScroll()
    emit('closed')
    done()
  }

  if (props.leaveAnim) props.leaveAnim(el, wrappedDone)
  else defaultLeave(el, wrappedDone)
}

onBeforeUnmount(() => {
  unlockScroll()
})

watch(
  () => router.currentRoute.value.fullPath,
  async () => {
    await nextTick()
    if (typeof window === 'undefined') return
    const hasModal = Boolean(document.querySelector('.modal-overlay'))
    if (!hasModal) {
      unlockScroll()
    }
  },
)
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 给一点内边距，避免 90% 高度贴边太死 */
  padding: 16px;
  box-sizing: border-box;

}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(3px);
}

/* 90% 宽高，居中 */
.modal-content {
  position: relative;
  overflow: auto;
  /* 如果你内部没设背景，这里最好给个底色 */
  background: #fff;
}

.modal-page {
  width: 100%;
  min-height: 100%;
}
</style>
