<template>
  <div class="bg-white relative overflow-hidden rounded-2xl">
    <!-- ✅ 右上角关闭按钮 -->
    <button
      class="absolute top-4 right-4 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-black/25 backdrop-blur-md border border-white/20 text-white hover:bg-black/40 active:scale-95 transition-all"
      @click="router.back()"
      aria-label="关闭"
    >
      <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd"
              d="M10 8.586 15.293 3.293a1 1 0 1 1 1.414 1.414L11.414 10l5.293 5.293a1 1 0 0 1-1.414 1.414L10 11.414l-5.293 5.293A1 1 0 0 1 3.293 15.293L8.586 10 3.293 4.707A1 1 0 0 1 4.707 3.293L10 8.586z"
              clip-rule="evenodd"/>
      </svg>
    </button>

    <!-- 背景媒体 -->
    <div aria-hidden="true" class="relative">
      <SmartMedia
        :src="artistMedia"
        alt="Artist Cover"
        class="h-[480px] w-full object-cover sm:h-[560px] lg:h-[640px]"
      />
      <!-- Apple 风渐变层 -->
      <div class="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent "/>
    </div>

    <!-- 内容部分 -->
    <div
      class="relative mx-auto -mt-8 max-w-7xl px-4 pb-16 sm:-mt-10 sm:px-6 sm:pb-24 lg:-mt-12 lg:px-8">
      <div class="mx-auto max-w-2xl text-center lg:max-w-4xl">
        <h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{{
            artistName
          }}</h2>
        <p class="mt-4 text-gray-500">
          Organize is a system to keep your desk tidy and photo-worthy all day long.
          Procrastinate your work while you meticulously arrange items into dedicated trays.
        </p>
      </div>

      <dl
        class="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 sm:gap-y-16 lg:max-w-none lg:grid-cols-3 lg:gap-x-8">
        <div v-for="feature in features" :key="feature.name" class="border-t border-gray-200 pt-4">
          <dt class="font-medium text-gray-900">{{ feature.name }}</dt>
          <dd class="mt-2 text-sm text-gray-500">{{ feature.description }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup>
import { defineComponent, h, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { artistApi } from '@/api/artistApi/artistApi.js'

/* 智能媒体组件 SmartMedia：保持你的原样 */
const SmartMedia = defineComponent({
  name: 'SmartMedia',
  props: {
    src: { type: String, required: true },
    alt: { type: String, default: '' },
    class: { type: String, default: '' },
    autoplay: { type: Boolean, default: true },
    loop: { type: Boolean, default: true },
    muted: { type: Boolean, default: true },
    playsinline: { type: Boolean, default: true },
    poster: { type: String, default: '' },
  },
  setup(props) {
    const isVideo = /\.(mp4|webm|ogg|m4v|mov|m3u8)(\?.*)?$/i.test(props.src)
    const isImage = /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(props.src)

    const onVideoError = (e) => {
      e.currentTarget.outerHTML = `<img src="${props.src}" alt="${props.alt}" class="${props.class}" />`
    }
    const onImgError = (e) => {
      e.currentTarget.classList.add('bg-gray-200')
      e.currentTarget.removeAttribute('src')
    }

    return () => {
      if (isVideo) {
        return h('video', {
          src: props.src,
          class: props.class,
          autoplay: props.autoplay,
          muted: props.muted,
          loop: props.loop,
          playsinline: props.playsinline,
          'webkit-playsinline': props.playsinline,
          controls: false,
          poster: props.poster || undefined,
          onError: onVideoError,
        })
      } else if (isImage || !isVideo) {
        return h('img', {
          src: props.src,
          alt: props.alt,
          class: props.class,
          onError: onImgError,
          loading: 'lazy',
          decoding: 'async',
        })
      }
      return h('div', { class: `${props.class} bg-gray-100` })
    }
  },
})

/* 路由 + 展示信息 */
const router = useRouter()
const artistName = ref('')
const artistMedia = ref('')

/**
 * 这里你是从路由 state 里取初始信息（从上一个页面带过来的）
 */
const massgae = router.options.history.state?.massgae || null
if (massgae) {
  artistName.value = massgae.name
  artistMedia.value = massgae.imageSrc
}

/* 展示特性：静态假数据 */
const features = [
  { name: 'Origin', description: 'Designed by Good Goods, Inc.' },
  {
    name: 'Material',
    description:
      'Solid walnut base with rare earth magnets and polycarbonate add-ons.',
  },
  { name: 'Dimensions', description: '15" x 3.75" x .75"' },
  { name: 'Finish', description: 'Hand sanded and finished with natural oil' },
  {
    name: 'Includes',
    description:
      'Pen Tray, Phone Tray, Small Tray, Large Tray, Sticky Note Holder',
  },
  {
    name: 'Considerations',
    description:
      'Made from natural materials. Grain and color vary with each item.',
  },
]

/* === 网络请求逻辑 === */

const artistId = ref(null)

/**
 * 第一步：搜索歌手，返回 artistId
 */
function getArtistMsg() {
  return artistApi.searchArtist('RESCENE').then((res) => {
    const list = res?.data?.data?.list || []
    if (!list.length) {
      console.warn('searchArtist 返回空列表')
      artistId.value = null
      return null
    }

    const first = list[0]
    const idFromApi = first.artistId
    console.log('拿到 artistId:', idFromApi)

    artistId.value = idFromApi ?? null
    return artistId.value
  })
}

/**
 * 第二步：根据 artistId 拉详情
 */
function getArtistDetail(aid) {
  if (!aid) {
    console.warn('getArtistDetail 调用时没有传 aid')
    return Promise.resolve(null)
  }

  console.log('请求详情 aid =', aid)
  return artistApi.getArtistInfo(aid).then((res) => {
    console.log('歌手详情返回：', res)

    const detail = res?.data?.data || {}

    // 用接口返回的最终数据覆盖当前展示
    if (detail.name) {
      artistName.value = detail.name
    }
    if (detail.coverUrl || detail.imageSrc) {
      artistMedia.value = detail.coverUrl || detail.imageSrc
    }

    return detail
  })
}

/**
 * 主流程：按顺序执行
 */
function loadArtistInfo() {
  return getArtistMsg().then((aid) => {
    return getArtistDetail(aid)
  })
}

/**
 * ✅ 真正触发只放在 onMounted 里
 * 这样在生产和开发都能保持“组件挂载时运行一次”
 * 不会因为 <script setup> 初始化或热更新导致额外打接口
 */
onMounted(() => {
  loadArtistInfo()
})
</script>


<style scoped>
::-webkit-scrollbar {
  display: none;
}
</style>
