<template>
  <div
    ref="containerRef"
    class="lazy-image-container"
    :class="{ 'lazy-image-loaded': isLoaded }"
  >
    <!-- 占位符 -->
    <div
      v-if="!isLoaded"
      class="lazy-image-placeholder"
      :style="placeholderStyle"
    />

    <!-- 实际图片 -->
    <img
      v-show="isLoaded"
      :src="currentSrc"
      :alt="alt"
      :class="imgClass"
      @load="onLoad"
      @error="onError"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { createImageObserver } from '@/utils/performanceOptimizer.js'

const props = defineProps({
  src: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    default: '',
  },
  imgClass: {
    type: String,
    default: '',
  },
  placeholderColor: {
    type: String,
    default: '#f0f0f0',
  },
  // 是否立即加载（不使用懒加载）
  eager: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['load', 'error'])

const containerRef = ref(null)
const currentSrc = ref('')
const isLoaded = ref(false)
const hasError = ref(false)
let observer = null

const placeholderStyle = computed(() => ({
  backgroundColor: props.placeholderColor,
}))

function loadImage() {
  if (!props.src || currentSrc.value === props.src) return

  currentSrc.value = props.src
  isLoaded.value = false
  hasError.value = false
}

function onLoad(event) {
  isLoaded.value = true
  emit('load', event)
}

function onError(event) {
  hasError.value = true
  emit('error', event)
}

function startObserving() {
  if (props.eager) {
    loadImage()
    return
  }

  observer = createImageObserver((target) => {
    if (target === containerRef.value) {
      loadImage()
      observer?.unobserve(target)
    }
  })

  if (observer && containerRef.value) {
    observer.observe(containerRef.value)
    return
  }

  loadImage()
}

function stopObserving() {
  observer?.disconnect()
  observer = null
}

watch(() => props.src, () => {
  if (props.eager) {
    loadImage()
  }
})

onMounted(() => {
  startObserving()
})

onBeforeUnmount(() => {
  stopObserving()
})
</script>

<style scoped>
.lazy-image-container {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.lazy-image-placeholder {
  position: absolute;
  inset: 0;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.lazy-image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lazy-image-loaded img {
  opacity: 1;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lazy-image-placeholder {
    animation: none;
  }

  .lazy-image-container img {
    transition: none;
  }
}
</style>
