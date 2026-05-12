<template>
  <div
    ref="wrapperRef"
    class="relative isolate select-none overflow-hidden"
    :style="wrapperStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 图片 -->
    <img
      v-if="mediaType === 'image'"
      :key="imgSrc"
      class="relative z-1 block w-full h-full"
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
      :key="videoPrimarySrc"
      class="relative z-1 block w-full h-full"
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
      @play="enforceVideoMuteIfNeeded"
      @volumechange="handleVideoVolumeChange"
      ref="videoRef"
    >
      <source
        v-for="(s, i) in videoSourceList"
        :key="i"
        :src="s.url"
        :type="s.type"
      />
      您的浏览器不支持视频播放。
    </video>

    <!-- ✅ 标题 + 内容覆盖层（居中，Tailwind） -->
    <div
      v-if="hasTextOverlay"
      class="absolute inset-0 z-10 flex flex-col items-center justify-center text-center pointer-events-none px-6"
      style="background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 90%);"
    >

      <div
        v-if="title"
        class="font-bold leading-tight tracking-wide drop-shadow-lg max-w-full text-white text-3xl md:text-5xl mb-4"
      >
        {{ title }}
      </div>

      <div
        v-if="!shouldScroll"
        class="max-w-[90%] text-white text-lg md:text-2xl leading-relaxed drop-shadow-md"
      >
        {{ contentList[0] || '' }}
      </div>

      <div
        v-else
        class="max-w-[90%] mt-4 text-white text-lg md:text-xl"
      >
        <div class="relative overflow-hidden" :style="{ height: (lineHeight + 8) + 'px' }">
          <div
            class="will-change-transform"
            :style="{
          transform: `translateY(${-scrollIndex * (lineHeight + 8)}px)`,
          transition: scrollNoTransition ? 'none' : `transform ${transitionMs}ms ease-out`
        }"
          >
            <div
              v-for="(t, i) in scrollLoop"
              :key="i"
              class="flex items-center justify-center text-pretty"
              :style="{ height: (lineHeight + 8) + 'px' }"
            >
              {{ t }}
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch, onBeforeUnmount, onMounted } from 'vue'

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

  // ✅ 标题与内容
  title: { type: String, default: '' },
  content: { type: [String, Array], default: '' }, // string | string[]

  // 图片
  alt: { type: String, default: '' },

  // 视频封面
  poster: { type: String, default: '' },
  mediaType: { type: String, default: '' },

  // 尺寸/适配
  objectFit: { type: String, default: 'cover' }, // cover/contain/fill/none/scale-down
  width: { type: [String, Number], default: '100%' },
  height: { type: [String, Number], default: '100%' },
  radius: { type: [String, Number], default: 0 },

  // 视频控制
  autoplay: { type: Boolean, default: true },
  loop: { type: Boolean, default: true },
  muted: { type: Boolean, default: true },
  lockMuted: { type: Boolean, default: false },
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
 * ✅ 文案滚动（全部滚动）
 */
const lineHeight = 22
const intervalMs = 3000
const transitionMs = 1000
const scrollIndex = ref(0)
const scrollNoTransition = ref(false)
let textTimer = null
let scrollResetTimer = null

const contentList = computed(() => {
  if (Array.isArray(props.content)) return props.content.filter(Boolean).map(v => String(v))
  if (props.content === null || props.content === undefined) return []
  const s = String(props.content).trim()
  return s ? [s] : []
})

const hasTextOverlay = computed(() => !!props.title || contentList.value.length > 0)
const shouldScroll = computed(() => contentList.value.length > 1)

const scrollLoop = computed(() => {
  const arr = contentList.value
  if (arr.length <= 1) return arr
  return [...arr, arr[0]] // 无缝：拼接第一条
})

function startTextScroll() {
  stopTextScroll()
  if (!shouldScroll.value) return
  const arr = contentList.value
  if (arr.length <= 1) return

  textTimer = window.setInterval(() => {
    scrollIndex.value += 1

    // 到达“复制的第一条”后：等待过渡结束，瞬间跳回 0
    if (scrollIndex.value >= arr.length) {
      scrollResetTimer = window.setTimeout(() => {
        scrollNoTransition.value = true
        scrollIndex.value = 0
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            scrollNoTransition.value = false
          })
        })
      }, transitionMs)
    }
  }, intervalMs)
}

function stopTextScroll() {
  if (textTimer) {
    clearInterval(textTimer)
    textTimer = null
  }
  if (scrollResetTimer) {
    clearTimeout(scrollResetTimer)
    scrollResetTimer = null
  }
  scrollIndex.value = 0
  scrollNoTransition.value = false
}

watch(contentList, () => {
  startTextScroll()
})

onMounted(() => {
  startTextScroll()
})

onBeforeUnmount(() => {
  stopTextScroll()
})

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
  if (IMAGE_EXTS.includes(ext)) return true
  if (VIDEO_EXTS.includes(ext)) return false
  // 很多 CDN 图片 URL 没有后缀，默认按图片处理
  return true
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
  const explicit = String(props.mediaType || '').toLowerCase()
  if (explicit === 'video') return 'video'
  if (explicit === 'image') return 'image'
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
const blobUrlCache = new WeakMap()
function toUrl(s) {
  if (isBlobLike(s)) {
    const cached = blobUrlCache.get(s)
    if (cached) return cached
    const url = URL.createObjectURL(s)
    blobUrlCache.set(s, url)
    createdUrls.add(url)
    return url
  }
  return s
}
function revokeAll() {
  createdUrls.forEach(u => {
    try { URL.revokeObjectURL(u) } catch (error) { void error }
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

function enforceVideoMuteIfNeeded() {
  if (!props.lockMuted || mediaType.value !== 'video') return
  const el = videoRef.value
  if (!el) return
  el.defaultMuted = true
  el.muted = true
  if (el.volume !== 0) {
    el.volume = 0
  }
}

function handleVideoVolumeChange() {
  enforceVideoMuteIfNeeded()
}

/**
 * src 变化：重置状态 & 回收旧 URL
 */
watch(srcList, () => {
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
  nextTick(() => {
    enforceVideoMuteIfNeeded()
  })

  if (props.scaleOnScroll) {
    attachScrollListener()
  }
})

watch([() => props.lockMuted, mediaType, videoPrimarySrc], () => {
  nextTick(() => {
    enforceVideoMuteIfNeeded()
  })
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
</style>
