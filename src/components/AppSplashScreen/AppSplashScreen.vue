<template>
  <Transition name="splash-fade" @after-leave="onSplashComplete">
    <div
      v-if="isVisible"
      class="splash-screen fixed inset-0 z-[9999] flex items-center justify-center bg-[#F5F5F7]"
    >
      <!-- 极简内容区 -->
      <div class="flex flex-col items-center">
        <!-- Logo -->
        <div class="splash-logo mb-8">
          <svg
            class="h-14 w-14 text-[#1D1D1F]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 18V6l10-2v12"
            />
            <circle cx="7" cy="18" r="2.4" fill="currentColor" stroke="none" />
            <circle cx="17" cy="16" r="2.4" fill="currentColor" stroke="none" />
          </svg>
        </div>

        <!-- 标题 -->
        <h1 class="splash-title text-[22px] font-semibold tracking-tight text-[#1D1D1F]">
          Aurora Player
        </h1>

        <!-- 极简进度指示：一条细线 -->
        <div class="splash-bar-track relative mt-10 h-[3px] w-40 overflow-hidden rounded-full bg-black/[0.06]">
          <div
            class="splash-bar-fill absolute inset-y-0 left-0 rounded-full bg-[#1D1D1F]"
            :style="{ width: `${progress}%` }"
          />
        </div>

        <!-- 加载文字 -->
        <p class="splash-text mt-4 text-[12px] font-medium tracking-wide text-[#86868B]">
          {{ loadingText }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { runAppBootstrap } from '@/utils/appBootstrap.js'

const props = defineProps({
  minDuration: {
    type: Number,
    default: 600,
  },
})

const emit = defineEmits(['complete'])

const router = useRouter()
const isVisible = ref(true)
const progress = ref(0)
const loadingText = ref('正在启动')

// 持续运行的动画循环，只暴露 setTarget 接口。
// 频繁调用 setTarget 只更新目标值，不打断循环。
let displayProgress = 0
let targetProgress = 0
let rafId = 0

function setTarget(value) {
  targetProgress = Math.max(targetProgress, Math.min(100, value))
  if (!rafId) runLoop()
}

function runLoop() {
  const tick = () => {
    const gap = targetProgress - displayProgress
    if (gap > 0.15) {
      displayProgress += Math.max(0.4, gap * 0.15)
      if (displayProgress > targetProgress) displayProgress = targetProgress
    } else {
      displayProgress = targetProgress
    }
    progress.value = Math.round(displayProgress)
    if (displayProgress < 100) {
      rafId = requestAnimationFrame(tick)
    } else {
      rafId = 0
    }
  }
  rafId = requestAnimationFrame(tick)
}

let startTime = 0

function finish() {
  const elapsed = Date.now() - startTime
  const remaining = Math.max(0, props.minDuration - elapsed)
  setTimeout(() => {
    setTarget(100)
    setTimeout(() => { isVisible.value = false }, 220)
  }, remaining)
}

function onSplashComplete() {
  emit('complete')
}

onMounted(async () => {
  startTime = Date.now()
  await runAppBootstrap({
    router,
    onProgress: (value, label) => {
      loadingText.value = label
      setTarget(value)
    },
  })
  finish()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  rafId = 0
})
</script>

<style scoped>
.splash-fade-leave-active {
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.splash-fade-leave-to {
  opacity: 0;
}

.splash-logo {
  animation: logoIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes logoIn {
  0% {
    opacity: 0;
    transform: translateY(6px) scale(0.92);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.splash-title {
  animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
}

.splash-bar-track {
  animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.16s both;
}

.splash-text {
  animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.22s both;
}

@keyframes fadeUp {
  0% {
    opacity: 0;
    transform: translateY(4px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.splash-bar-fill {
  transition: width 0.15s linear;
}

@media (prefers-reduced-motion: reduce) {
  .splash-fade-leave-active,
  .splash-logo,
  .splash-title,
  .splash-bar-track,
  .splash-text,
  .splash-bar-fill {
    animation: none !important;
    transition: none !important;
  }
}
</style>
