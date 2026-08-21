<template>
  <Transition
    name="splash"
    @after-leave="onSplashComplete"
  >
    <div
      v-if="isVisible"
      class="splash-screen fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
    >
      <!-- 动态背景粒子 -->
      <div class="splash-particles absolute inset-0 overflow-hidden">
        <div
          v-for="i in 50"
          :key="i"
          class="splash-particle absolute rounded-full bg-white/20"
          :style="getParticleStyle(i)"
        />
      </div>

      <!-- 主内容 -->
      <div class="splash-content relative z-10 flex flex-col items-center">
        <!-- Logo 动画 -->
        <div class="splash-logo-wrapper mb-8">
          <div class="splash-logo relative">
            <!-- 外圈光环 -->
            <div class="splash-glow absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 blur-3xl opacity-60 animate-pulse" />

            <!-- Logo 图标 -->
            <div class="splash-icon relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 shadow-2xl">
              <svg class="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 应用名称 -->
        <h1 class="splash-title mb-2 text-4xl font-black tracking-tight text-white">
          Aurora Player
        </h1>
        <p class="splash-subtitle mb-12 text-sm font-medium tracking-wider text-purple-200/80">
          沉浸式音乐体验
        </p>

        <!-- 加载进度 -->
        <div class="splash-progress-wrapper w-64">
          <!-- 进度条背景 -->
          <div class="relative h-1.5 overflow-hidden rounded-full bg-white/10 backdrop-blur-sm">
            <!-- 进度条 -->
            <div
              class="splash-progress-bar absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 transition-all duration-300 ease-out"
              :style="{ width: `${progress}%` }"
            >
              <!-- 进度条光效 -->
              <div class="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </div>

          <!-- 加载状态文字 -->
          <div class="mt-4 flex items-center justify-between text-xs font-medium text-purple-200/60">
            <span>{{ loadingText }}</span>
            <span>{{ progress }}%</span>
          </div>
        </div>

        <!-- 提示文字 -->
        <p class="splash-tip mt-8 text-xs text-white/40 animate-pulse">
          {{ tipText }}
        </p>
      </div>

      <!-- 版本信息 -->
      <div class="absolute bottom-8 left-0 right-0 text-center">
        <p class="text-xs font-medium text-white/30">
          v{{ version }} · Powered by Vue 3
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { createAppPreloader, initResourcePreloading } from '@/utils/resourcePreloader.js'

const props = defineProps({
  version: {
    type: String,
    default: '1.0.0',
  },
  minDuration: {
    type: Number,
    default: 2000, // 最小显示时间（毫秒）
  },
  enableResourcePreload: {
    type: Boolean,
    default: true, // 是否启用资源预加载
  },
})

const emit = defineEmits(['complete'])

const isVisible = ref(true)
const progress = ref(0)
const currentStep = ref(0)

// 加载步骤
const loadingSteps = [
  { text: '初始化应用...', duration: 300 },
  { text: '加载核心模块...', duration: 400 },
  { text: '加载音频引擎...', duration: 500 },
  { text: '连接服务器...', duration: 400 },
  { text: '准备用户界面...', duration: 300 },
  { text: '启动完成', duration: 200 },
]

const loadingText = computed(() => {
  return loadingSteps[currentStep.value]?.text || '加载中...'
})

// 随机提示文字
const tips = [
  '发现更多音乐...',
  '探索你的音乐世界...',
  '享受沉浸式体验...',
  '为你推荐好音乐...',
  '连接你的音乐灵感...',
  '准备精彩的音乐旅程...',
]

const tipText = ref(tips[Math.floor(Math.random() * tips.length)])

let progressInterval = null
let stepTimeout = null
let startTime = 0
let preloader = null

// 生成粒子样式
function getParticleStyle(index) {
  const size = Math.random() * 4 + 2
  const x = Math.random() * 100
  const y = Math.random() * 100
  const duration = Math.random() * 20 + 10
  const delay = Math.random() * 5

  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${x}%`,
    top: `${y}%`,
    animation: `float ${duration}s ease-in-out ${delay}s infinite`,
  }
}

// 🔧 集成真实资源预加载
async function preloadResources() {
  if (!props.enableResourcePreload) {
    return
  }

  try {
    // 初始化预连接
    initResourcePreloading()

    // 创建预加载器
    preloader = createAppPreloader()

    // 监听预加载进度
    preloader.onProgress((resourceProgress) => {
      // 资源加载占总进度的 40%
      const baseProgress = 60
      const resourceWeight = 40
      const totalProgress = baseProgress + (resourceProgress * resourceWeight) / 100

      if (progress.value < totalProgress) {
        progress.value = Math.min(100, Math.round(totalProgress))
      }
    })

    // 开始预加载
    await preloader.load()
  } catch (error) {
    console.warn('[SplashScreen] Resource preloading failed:', error)
  }
}

// 模拟加载进度
function simulateLoading() {
  let stepIndex = 0
  let stepProgress = 0

  function nextStep() {
    if (stepIndex >= loadingSteps.length) {
      // 最后启动资源预加载
      preloadResources().finally(() => {
        completeLoading()
      })
      return
    }

    currentStep.value = stepIndex
    const step = loadingSteps[stepIndex]
    // 步骤只占 60% 的进度
    const targetProgress = ((stepIndex + 1) / loadingSteps.length) * 60
    const progressIncrement = (targetProgress - progress.value) / (step.duration / 16)

    progressInterval = setInterval(() => {
      stepProgress += progressIncrement
      progress.value = Math.min(Math.round(stepProgress), targetProgress)

      if (progress.value >= targetProgress) {
        clearInterval(progressInterval)
        stepIndex++
        stepTimeout = setTimeout(nextStep, 100)
      }
    }, 16)
  }

  nextStep()
}

// 完成加载
function completeLoading() {
  const elapsed = Date.now() - startTime
  const remaining = Math.max(0, props.minDuration - elapsed)

  setTimeout(() => {
    progress.value = 100
    currentStep.value = loadingSteps.length - 1

    setTimeout(() => {
      isVisible.value = false
    }, 500)
  }, remaining)
}

// 开屏动画完成
function onSplashComplete() {
  emit('complete')
}

onMounted(() => {
  startTime = Date.now()
  simulateLoading()

  // 监听真实页面加载状态
  if (document.readyState === 'complete') {
    // 已经加载完成
  } else {
    window.addEventListener('load', () => {
      // 确保进度至少到 80%
      if (progress.value < 80) {
        progress.value = 80
      }
    })
  }

  // 定期更换提示文字
  const tipInterval = setInterval(() => {
    const newTip = tips[Math.floor(Math.random() * tips.length)]
    if (newTip !== tipText.value) {
      tipText.value = newTip
    }
  }, 3000)

  // 清理定时器
  onBeforeUnmount(() => {
    clearInterval(tipInterval)
  })
})

onBeforeUnmount(() => {
  if (progressInterval) clearInterval(progressInterval)
  if (stepTimeout) clearTimeout(stepTimeout)
})
</script>

<style scoped>
/* 开屏动画过渡 */
.splash-enter-active {
  transition: opacity 0.5s ease;
}

.splash-leave-active {
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.splash-enter-from {
  opacity: 0;
}

.splash-leave-to {
  opacity: 0;
  transform: scale(1.1);
}

/* Logo 动画 */
.splash-logo-wrapper {
  animation: logoEntry 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes logoEntry {
  0% {
    opacity: 0;
    transform: scale(0.5) rotate(-180deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

.splash-icon {
  animation: iconFloat 3s ease-in-out infinite;
}

@keyframes iconFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* 标题动画 */
.splash-title {
  animation: titleEntry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
}

@keyframes titleEntry {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.splash-subtitle {
  animation: subtitleEntry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both;
}

@keyframes subtitleEntry {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 进度条动画 */
.splash-progress-wrapper {
  animation: progressEntry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.7s both;
}

@keyframes progressEntry {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(200%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

/* 提示文字动画 */
.splash-tip {
  animation: tipEntry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.9s both;
}

@keyframes tipEntry {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 粒子动画 */
@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translate(var(--x, 20px), var(--y, -30px)) scale(1.2);
    opacity: 0.6;
  }
}

.splash-particle:nth-child(odd) {
  --x: 30px;
  --y: -50px;
}

.splash-particle:nth-child(even) {
  --x: -30px;
  --y: -40px;
}

/* 禁用动画模式 */
@media (prefers-reduced-motion: reduce) {
  .splash-enter-active,
  .splash-leave-active,
  .splash-logo-wrapper,
  .splash-icon,
  .splash-title,
  .splash-subtitle,
  .splash-progress-wrapper,
  .splash-tip,
  .splash-particle {
    animation: none !important;
    transition: none !important;
  }

  .splash-leave-to {
    opacity: 0;
  }
}
</style>
