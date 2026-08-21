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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { createAppPreloader, initResourcePreloading } from '@/utils/resourcePreloader.js'

const props = defineProps({
  minDuration: {
    type: Number,
    default: 900,
  },
  enableResourcePreload: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['complete'])

const isVisible = ref(true)
const progress = ref(0)

const loadingSteps = [
  '正在启动',
  '加载资源',
  '准备就绪',
]
const stepIndex = ref(0)
const loadingText = computed(() => loadingSteps[stepIndex.value] || '正在启动')

let progressRaf = 0
let startTime = 0
let preloader = null
let stepTimer = null

function tickProgress(targetCeiling) {
  const step = () => {
    progress.value += Math.max(0.4, (targetCeiling - progress.value) * 0.06)
    if (progress.value >= targetCeiling - 0.5) {
      progress.value = targetCeiling
      return
    }
    progressRaf = requestAnimationFrame(step)
  }
  cancelAnimationFrame(progressRaf)
  progressRaf = requestAnimationFrame(step)
}

async function preloadResources() {
  if (!props.enableResourcePreload) return
  try {
    initResourcePreloading()
    preloader = createAppPreloader()
    preloader.onProgress((resourceProgress) => {
      const target = 70 + (resourceProgress * 30) / 100
      tickProgress(target)
    })
    await preloader.load()
  } catch {
    // 预加载失败不阻断启动
  }
}

function runLoadingSequence() {
  tickProgress(45)
  stepTimer = setTimeout(() => {
    stepIndex.value = 1
    tickProgress(70)
    preloadResources().finally(() => {
      stepIndex.value = 2
      finish()
    })
  }, 380)
}

function finish() {
  const elapsed = Date.now() - startTime
  const remaining = Math.max(0, props.minDuration - elapsed)
  setTimeout(() => {
    tickProgress(100)
    setTimeout(() => {
      isVisible.value = false
    }, 260)
  }, remaining)
}

function onSplashComplete() {
  emit('complete')
}

onMounted(() => {
  startTime = Date.now()
  runLoadingSequence()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(progressRaf)
  if (stepTimer) clearTimeout(stepTimer)
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
