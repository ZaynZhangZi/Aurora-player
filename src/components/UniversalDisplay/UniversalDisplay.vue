<template>
  <div class="bg-white">
    <div class="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-16 lg:max-w-7xl lg:px-8">
      <!-- 标题 + 查看更多 -->
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-bold text-gray-900">
          {{ finalData.title }}
        </h2>

        <span
          v-if="more"
          class="text-sm font-medium transition cursor-pointer text-indigo-600 hover:text-indigo-500"
          @click="emit('view-more')"
        >
          查看更多
        </span>
      </div>

      <!-- 关键：一个相对定位的容器，骨架和内容都 absolute 叠在里面 -->
      <div class="relative min-h-[18rem]">
        <!-- 骨架屏 -->
        <div
          ref="skeletonRef"
          class="absolute inset-0 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8"
        >
          <div v-for="n in 4" :key="'skeleton-' + n" class="space-y-4">
            <div class="h-72 w-full rounded-lg overflow-hidden bg-gray-200">
              <div
                class="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse"
              ></div>
            </div>
          </div>
        </div>

        <!-- 正式内容 -->
        <div
          ref="contentRef"
          class="absolute inset-0 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8"
        >
          <div
            v-for="product in finalData.subItems"
            :key="product.id"
            @click="handleItemClick(product)"
          >
            <div class="relative group h-72 w-full cursor-pointer">
              <div class="relative h-full w-full overflow-hidden rounded-lg">
                <SmartMedia
                  :src="product.mediaUrl"
                  class="size-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>

              <div
                class="absolute inset-x-0 top-0 flex h-full items-end justify-end overflow-hidden rounded-lg p-4"
              >
                <div
                  aria-hidden="true"
                  class="absolute inset-x-0 bottom-0 h-36 bg-linear-to-t from-black opacity-50"
                ></div>
                <p class="relative text-lg font-semibold text-white">
                  {{ product.name }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <!-- /内容层 -->
      </div>
    </div>
  </div>

  <ModalRouterView />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { gsap } from 'gsap'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import ModalRouterView from '@/components/modalRouterView/ModalRouterView.vue'
import router from '@/router/index.js'

const emit = defineEmits(['view-more'])

const props = defineProps({
  // 结构：{ title: string, subItems: [] }
  data: {
    type: Object,
    default: () => ({}),
  },
  more: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  /**
   * 自定义卡片点击的路由函数：
   *   (item) => { ... }
   * 在父组件里可以这样用：
   *   :routeFn="item => router.push({ name: 'artistDetail', params: { id: item.id } })"
   *
   * 如果不传，就走默认的 router.push('/home/artistDetial')
   */
  routeFn: {
    type: Function,
    default: null,
  },
})

// 默认占位数据
const defaultData = {
  title: 'Customers also bought',
  subItems: [
    {
      id: 1,
      name: 'Zip Tote Basket',
      mediaUrl:
        'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-03-related-product-01.jpg',
    },
    {
      id: 2,
      name: 'Zip High Wall Tote',
      mediaUrl:
        'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-03-related-product-02.jpg',
    },
    {
      id: 3,
      name: 'Halfsize Tote',
      mediaUrl:
        'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-03-related-product-03.jpg',
    },
    {
      id: 4,
      name: 'High Wall Tote',
      mediaUrl:
        'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-03-related-product-04.jpg',
    },
  ],
}

const finalData = computed(() => {
  if (!props.data || !Array.isArray(props.data.subItems) || props.data.subItems.length === 0) {
    return defaultData
  }
  return props.data
})

const skeletonRef = ref(null)
const contentRef = ref(null)

/** 卡片点击统一入口：优先用父组件传进来的 routeFn，否则用默认跳转 */
const handleItemClick = (item) => {
  if (typeof props.routeFn === 'function') {
    // 父组件完全控制跳转逻辑
    props.routeFn(item)
  } else {

  }
}

/** 初始化：根据 loading 决定谁显谁隐 */
onMounted(() => {
  if (props.loading) {
    if (skeletonRef.value) gsap.set(skeletonRef.value, { opacity: 1 })
    if (contentRef.value) gsap.set(contentRef.value, { opacity: 0 })
  } else {
    if (skeletonRef.value) gsap.set(skeletonRef.value, { opacity: 0 })
    if (contentRef.value) gsap.set(contentRef.value, { opacity: 1 })
  }
})

/** 监听 loading 做原地交叉渐变 */
watch(
  () => props.loading,
  (newVal, oldVal) => {
    // true -> false：骨架 → 内容
    if (oldVal === true && newVal === false) {
      const tl = gsap.timeline()
      if (skeletonRef.value) {
        tl.to(skeletonRef.value, {
          opacity: 0,
          duration: 0.25,
          ease: 'power1.out',
        })
      }
      if (contentRef.value) {
        tl.to(
          contentRef.value,
          {
            opacity: 1,
            duration: 0.25,
            ease: 'power1.out',
          },
          '<'
        )
      }
    }

    // false -> true：内容 → 骨架
    if (oldVal === false && newVal === true) {
      const tl = gsap.timeline()
      if (contentRef.value) {
        tl.to(contentRef.value, {
          opacity: 0,
          duration: 0.2,
          ease: 'power1.out',
        })
      }
      if (skeletonRef.value) {
        tl.to(
          skeletonRef.value,
          {
            opacity: 1,
            duration: 0.2,
            ease: 'power1.out',
          },
          '<'
        )
      }
    }
  }
)
</script>
