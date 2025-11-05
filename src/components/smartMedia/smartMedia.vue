<!-- MediaAuto.vue（纯 JS 版） -->
<template>
  <div
    class="media-auto"
    :style="wrapperStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    ref="wrapperRef"
  >

    <img
      v-if="mediaType === 'image'"
      :src="imgSrc"
      :alt="alt"
      :decoding="decoding"
      :loading="imgLoading"
      :referrerpolicy="referrerPolicy"
      :style="mediaStyle"
      @load="onLoaded"
      @error="onErrored"
    />

    <!-- 视频 -->
    <video
      v-else-if="mediaType === 'video'"
      :src="videoPrimarySrc"
      :poster="poster"
      :autoplay="autoplay"
      :muted="muted"
      :loop="loop"
      :controls="controls"
      :playsinline="playsinline"
      :preload="preload"
      :style="mediaStyle"
      @canplay="onLoaded"
      @error="onErrored"
      ref="videoRef"
    >
      <!-- 如果传了多个源，自动生成 <source> 做格式兼容（避免重复 createObjectURL） -->
      <source
        v-for="(s, i) in videoSourceList"
        :key="i"
        :src="s.url"
        :type="s.type"
      />
      您的浏览器不支持视频播放。
    </video>

    <!-- 兜底（未知类型） -->
    <slot v-else>不支持的媒体类型</slot>
  </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount, onMounted } from 'vue'

/**
 * 允许的扩展名
 */
const IMAGE_EXTS = ['jpg','jpeg','png','webp','gif','bmp','svg','avif']
const VIDEO_EXTS = ['mp4','webm','ogg','ogv','mov','m4v','avi','mkv']

/**
 * Props（JS 运行时声明）
 */
const props = defineProps({
  // 字符串 URL、File、Blob，或它们的数组
  src: { type: [String, Object, Array], required: true },

  // 图片
  alt: { type: String, default: '' },

  // 视频封面
  poster: { type: String, default: '' },

  // 尺寸/适配
  objectFit: { type: String, default: 'cover' }, // cover/contain/fill/none/scale-down
  width: { type: [String, Number], default: '100%' },
  height: { type: [String, Number], default: '100%' },
  radius: { type: [String, Number], default: 0 },

  // 视频控制
  autoplay: { type: Boolean, default: true },
  loop: { type: Boolean, default: true },
  muted: { type: Boolean, default: true },
  controls: { type: Boolean, default: false },
  playsinline: { type: Boolean, default: true },
  preload: { type: String, default: 'metadata' }, // auto/metadata/none

  // 图片控制
  imgLoading: { type: String, default: 'lazy' }, // eager/lazy
  decoding: { type: String, default: 'auto' }, // sync/async/auto
  referrerPolicy: { type: String, default: undefined },

  // 交互
  hoverPlay: { type: Boolean, default: false },
  scaleOnScroll: { type: Boolean, default: false }
})

const emit = defineEmits(['loaded', 'error'])

const loading = ref(true)
const error = ref(false)
const videoRef = ref(null)
const wrapperRef = ref(null)
const scrollScale = ref(1)
let scrollListenerAttached = false
let rafId = null

/**
 * 把 src 统一为数组
 */
const srcList = computed(() => {
  if (Array.isArray(props.src)) return props.src
  return props.src ? [props.src] : []
})

/**
 * 从 URL/路径取扩展名
 */
function getExtFromUrl(url) {
  try {
    const u = new URL(url, window.location.origin)
    const path = u.pathname.toLowerCase()
    const dot = path.lastIndexOf('.')
    return dot >= 0 ? path.slice(dot + 1) : ''
  } catch {
    const clean = String(url).split('?')[0].split('#')[0]
    const dot = clean.lastIndexOf('.')
    return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : ''
  }
}

/**
 * 判断图片 / 视频
 */
function isBlobLike(v) {
  return v instanceof Blob // File 继承 Blob
}
function isImageSrc(s) {
  if (isBlobLike(s)) return s.type?.startsWith?.('image/')
  const ext = getExtFromUrl(s)
  return IMAGE_EXTS.includes(ext)
}
function isVideoSrc(s) {
  if (isBlobLike(s)) return s.type?.startsWith?.('video/')
  const ext = getExtFromUrl(s)
  return VIDEO_EXTS.includes(ext)
}

/**
 * 媒体类型
 */
const mediaType = computed(() => {
  if (!srcList.value.length) return 'unknown'
  const hasVideo = srcList.value.some(isVideoSrc)
  const hasImage = srcList.value.some(isImageSrc)
  if (hasVideo && !hasImage) return 'video'
  if (hasImage && !hasVideo) return 'image'
  if (hasVideo && hasImage) return 'video' // 混合时优先视频
  return 'unknown'
})

/**
 * createObjectURL 管理，避免内存泄漏
 */
const createdUrls = new Set()
function toUrl(s) {
  if (isBlobLike(s)) {
    const url = URL.createObjectURL(s)
    createdUrls.add(url)
    return url
  }
  return s
}
function revokeAll() {
  createdUrls.forEach(u => {
    try { URL.revokeObjectURL(u) } catch {}
  })
  createdUrls.clear()
}

/**
 * 主图/主视频 src
 */
const imgSrc = computed(() => {
  const firstImg = srcList.value.find(isImageSrc)
  return firstImg ? toUrl(firstImg) : (srcList.value[0] ? toUrl(srcList.value[0]) : '')
})

const rawVideoSources = computed(() => srcList.value.filter(isVideoSrc))

const videoPrimarySrc = computed(() => {
  if (rawVideoSources.value.length) return toUrl(rawVideoSources.value[0])
  return srcList.value[0] ? toUrl(srcList.value[0]) : ''
})

/**
 * <source> 列表（避免在模板里重复调用 toUrl 导致多次 createObjectURL）
 */
const videoSourceList = computed(() => {
  return rawVideoSources.value.map(s => {
    const url = toUrl(s)
    return { url, type: guessMimeFromUrl(url) }
  })
})

/**
 * 样式
 */
function formatSize(v) {
  return typeof v === 'number' ? `${v}px` : v
}
const mediaStyle = computed(() => ({
  width: '100%',
  height: '100%',
  objectFit: props.objectFit,
  display: 'block',
  borderRadius: formatSize(props.radius)
}))
const wrapperStyle = computed(() => {
  const style = {
    width: formatSize(props.width),
    height: formatSize(props.height),
    borderRadius: formatSize(props.radius),
    overflow: 'hidden',
    position: 'relative',
    background: '#f6f7f9'
  }

  if (props.scaleOnScroll) {
    style.transform = `scale(${scrollScale.value})`
    style.transition = 'transform 0.45s ease-out'
    style.willChange = 'transform'
  }

  return style
})

/**
 * 事件
 */
function onLoaded() {
  loading.value = false
  error.value = false
  emit('loaded')
}
function onErrored(e) {
  loading.value = false
  error.value = true
  emit('error', e)
}

/**
 * 悬停播放
 */
function handleMouseEnter() {
  if (!props.hoverPlay || mediaType.value !== 'video') return
  videoRef.value?.play?.().catch(() => {})
}
function handleMouseLeave() {
  if (!props.hoverPlay || mediaType.value !== 'video') return
  if (!props.autoplay) videoRef.value?.pause?.()
}

/**
 * src 变化：重置状态 & 回收旧 URL
 */
watch(() => props.src, () => {
  loading.value = true
  error.value = false
  revokeAll()
}, { deep: true })

onBeforeUnmount(() => {
  revokeAll()
  detachScrollListener()
})

function updateScrollScale() {
  if (!wrapperRef.value) return
  const rect = wrapperRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1
  const center = rect.top + rect.height / 2
  const distance = Math.abs(viewportHeight / 2 - center)
  const clamped = Math.min(distance / (viewportHeight / 2 || 1), 1)
  const progress = 1 - clamped
  const target = 1 + progress * 0.25
  scrollScale.value = Number(target.toFixed(3))
}

function handleScroll() {
  if (rafId) return
  rafId = window.requestAnimationFrame(() => {
    rafId = null
    updateScrollScale()
  })
}

function attachScrollListener() {
  if (scrollListenerAttached || !props.scaleOnScroll) return
  scrollListenerAttached = true
  updateScrollScale()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleScroll)
}

function detachScrollListener() {
  if (!scrollListenerAttached) return
  scrollListenerAttached = false
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleScroll)
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

onMounted(() => {
  if (props.scaleOnScroll) {
    attachScrollListener()
  }
})

watch(() => props.scaleOnScroll, (enabled) => {
  if (enabled) {
    attachScrollListener()
  } else {
    detachScrollListener()
    scrollScale.value = 1
  }
})

/**
 * 猜测 MIME（<source type> 提示）
 */
function guessMimeFromUrl(url) {
  const ext = getExtFromUrl(url)
  if (ext === 'mp4' || ext === 'm4v') return 'video/mp4'
  if (ext === 'webm') return 'video/webm'
  if (ext === 'ogv' || ext === 'ogg') return 'video/ogg'
  if (ext === 'mov') return 'video/quicktime'
  return ''
}
</script>

<style scoped>
.media-auto {
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
</style>
