<template>
  <div class="bg-gray-50">
    <div class="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14 lg:max-w-7xl lg:px-8">
      <h2 class="text-xl font-bold text-gray-900">今天，是KPOP</h2>

      <div
        class="mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
        <div @click="goArtistMassgage(product)" v-for="product in products" :key="product.id">
          <div class="relative">
            <div class="relative h-72 w-full overflow-hidden rounded-lg">
              <!-- ✅ 自动判断是图片还是视频 -->
              <SmartMedia
                :src="product.imageSrc"
                :alt="product.imageAlt"
                class="absolute object-cover h-full"
              />
            </div>

            <!-- 顶部对齐的价格层 & 渐变遮罩：保持不变 -->
            <div
              class="absolute inset-x-0 top-0 flex h-72 items-end justify-end overflow-hidden rounded-lg p-4">
              <div aria-hidden="true"
                   class="absolute inset-x-0 bottom-0 h-36 bg-linear-to-t from-black opacity-50"/>
              <p class="relative text-lg font-semibold text-white">{{ product.name }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>


  <router-view v-slot="{ Component }">
    <Teleport to="body" v-if="Component || isClosing">
      <div class="modal-overlay">
        <!-- 背景遮罩 -->
        <div class="modal-backdrop" @click="closeModal" />

        <!-- ✅ 固定在右上角的关闭按钮（不依赖子组件插槽/层级） -->
        <button
          class="modal-close"
          @click="closeModal"
          aria-label="关闭"
        >
          <!-- 简单的 X 图标；没有 tailwind 的 size-5 就用 w-5 h-5 -->
          <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 8.586 15.293 3.293a1 1 0 1 1 1.414 1.414L11.414 10l5.293 5.293a1 1 0 0 1-1.414 1.414L10 11.414l-5.293 5.293A1 1 0 0 1 3.293 15.293L8.586 10 3.293 4.707A1 1 0 0 1 4.707 3.293L10 8.586z" clip-rule="evenodd"/>
          </svg>
        </button>

        <!-- 内容过渡 -->
        <Transition @enter="enterAnim" @leave="leaveAnim" appear>
          <div class="modal-content" v-if="!isClosing">
            <component :is="Component" />
          </div>
        </Transition>
      </div>
    </Teleport>
  </router-view>


</template>

<script setup>
import {defineComponent, h, ref, watchEffect} from 'vue'
import router from "@/router/index.js";
import gsap from "gsap";

/**
 * ✅ 智能媒体组件：同一 src，自动用 <video> 或 <img> 渲染
 * - 先基于扩展名判断
 * - 如果按视频渲染失败，自动回退为图片
 * - 如果按图片渲染失败，给灰色占位
 */
const SmartMedia = defineComponent({
  name: 'SmartMedia',
  props: {
    src: {type: String, required: true},
    alt: {type: String, default: ''},
    class: {type: String, default: ''}, // 让你能继续传入 Tailwind 类（尺寸/裁切）
    poster: {type: String, default: ''}, // 可选：视频封面
    loop: {type: Boolean, default: true},
    muted: {type: Boolean, default: true},
    autoplay: {type: Boolean, default: true},
    playsinline: {type: Boolean, default: true}
  },
  setup(props) {
    const mediaType = ref('image') // 'video' | 'image' | 'fallback'
    const triedVideo = ref(false)

    const videoRe = /\.(mp4|webm|ogg|m3u8)(\?.*)?$/i
    const imgRe = /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i

    const detect = (url) => {
      if (videoRe.test(url)) return 'video'
      if (imgRe.test(url)) return 'image'
      // 默认按图片处理更稳妥（避免浏览器不支持但仍尝试 video 导致黑屏）
      return 'image'
    }

    watchEffect(() => {
      mediaType.value = detect(props.src)
      triedVideo.value = mediaType.value === 'video'
    })

    const onVideoError = () => {
      // 视频出错：自动回退到图片
      mediaType.value = 'image'
    }

    const onImgError = (e) => {
      // 图片也失败：显示占位
      mediaType.value = 'fallback'
    }

    return () => {
      if (mediaType.value === 'video') {
        return h('video', {
          src: props.src,
          poster: props.poster || undefined,
          class: props.class,
          autoplay: props.autoplay,
          muted: props.muted,
          loop: props.loop,
          playsinline: props.playsinline,
          // iOS/Safari 细节
          'webkit-playsinline': props.playsinline,
          // 避免出现控制条
          controls: false,
          // 错误时回退为图片
          onError: onVideoError
        })
      } else if (mediaType.value === 'image') {
        return h('img', {
          src: props.src,
          alt: props.alt,
          class: props.class,
          onError: onImgError,
          loading: 'lazy',
          decoding: 'async'
        })
      }
      // fallback 占位
      return h('div', {
        class: `${props.class} bg-gray-200`
      })
    }
  }
})

/* ====== 你的示例数据：不变，仅供演示 ====== */
const products = [
  {
    imageSrc: 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages221/v4/43/03/ce/4303ce27-7119-28b8-e88e-07eb1bfd83ed/ami-identity-34690deea0449c669300ad80b397d047-2025-06-27T02-32-06.719Z_cropped.png/2400x933vf-60.jpg',
    name: 'RESCENE'
  },
  {
    imageSrc: 'https://mvod.itunes.apple.com/itunes-assets/HLSMusic221/v4/0b/f2/65/0bf26555-b27f-382e-7a57-56df7948f25c/P866465489_Anull_video_gr598_sdr_3840x2160-.mp4',
    name: 'NewJeans'
  }, {
    imageSrc: 'https://mvod.itunes.apple.com/itunes-assets/HLSMusic126/v4/89/f9/ff/89f9ff70-4f13-bdc3-e6f0-d5f9381abc34/P599468517_Anull_video_gr598_sdr_3840x2160-.mp4',
    name: 'EXO'
  }, {
    imageSrc: 'https://is1-ssl.mzstatic.com/image/thumb/Features211/v4/c0/3e/b3/c03eb3d9-bd5d-d3ef-5e92-c6adba276f29/mzl.zqgqziid.jpg/2400x933vf-60.jpg',
    name: 'KISS OF LIFE'
  },
]

const isClosing = ref(false)

function closeModal() {
  if (isClosing.value) return
  isClosing.value = true
  setTimeout(() => {
    router.back()
    isClosing.value = false
  }, 500)
}

/** 弹窗进出场 */
function enterAnim(el, done) {
  gsap.fromTo(
    el,
    {y: '100%', opacity: 0},
    {y: '0%', opacity: 1, duration: 0.9, ease: 'elastic.out(1, 1)', onComplete: done}
  )
}

function leaveAnim(el, done) {
  gsap.to(el, {y: '100%', opacity: 0, duration: 0.5, ease: 'power2.in', onComplete: done})
}

let goArtistMassgage = (massgae) => {
  router.push({
    path: '/home/artist',
    state: { massgae } // ✅ 数据不会出现在地址栏中
  })
}
</script>


