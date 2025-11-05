<template>
  <div class="bg-gray-50">
    <!-- 支持多个区块：按 sections 渲染 -->
    <div
      v-for="section in sections"
      :key="section.id"
      class="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14 lg:max-w-7xl lg:px-8"
    >
      <h2 class="text-xl font-bold text-gray-900">
        {{ section.title || defaultTitle }}
      </h2>

      <div class="mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
        <div
          v-for="it in (section.subItems || [])"
          :key="it.id"
          @click="onCardClick(it)"
          class="cursor-pointer"
        >
          <div class="relative">
            <div class="relative h-72 w-full overflow-hidden rounded-lg">
              <!-- ✅ 自动判断 图片/视频；失败优雅降级 -->
              <SmartMedia
                :src="it.mediaUrl"
                :media-type="it.mediaType"
                :alt="it.name"
                class="absolute h-full w-full object-cover"
              />
            </div>

            <!-- 顶部遮罩 + 右下角标题（沿用你的布局） -->
            <div class="absolute inset-x-0 top-0 flex h-72 items-end justify-end overflow-hidden rounded-lg p-4">
              <div aria-hidden="true" class="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black opacity-50"></div>
              <p class="relative text-lg font-semibold text-white">{{ it.name }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 路由弹层：保持你原来的 Teleport + GSAP 过渡 -->
  <router-view v-slot="{ Component }">
    <Teleport to="body" v-if="Component || isClosing">
      <div class="modal-overlay">
        <!-- 背景遮罩 -->
        <div class="modal-backdrop" @click="closeModal" />

        <!-- 右上角固定关闭按钮 -->
        <button class="modal-close" @click="closeModal" aria-label="关闭">
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
/**
 * 用法：
 * <KpopGrid :sections="backendData" route-to="/home/artist" @item-click="(item)=>{}" />
 *
 * sections 结构示例：
 * [
 *   {
 *     id: 1,
 *     title: "今天，是Kpop",
 *     subItems: [
 *       { id: 1, name: "NewJeans", mediaUrl: "http://...mp4", mediaType: "VIDEO" }
 *     ]
 *   }
 * ]
 */
import { defineComponent, h, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import SmartMedia from '@/components/smartMedia/smartMedia.vue' // 你已有的 SmartMedia 组件（或改成你的真实路径）

const props = defineProps({
  /** 后端返回的区块数组 */
  sections: {
    type: Array,
    required: true,
    // [{ id, title, subItems: [{ id, name, mediaUrl, mediaType }] }]
  },
  /** 默认标题回退 */
  defaultTitle: {
    type: String,
    default: '今天，是KPOP'
  },
  /** 点击卡片时是否走路由（默认 true） */
  useRoute: {
    type: Boolean,
    default: true
  },
  /** 跳转路径（仅当 useRoute = true 时生效） */
  routeTo: {
    type: String,
    default: '/home/artist'
  },
})

const emit = defineEmits(['item-click'])

const router = useRouter()

function onCardClick(item) {
  emit('item-click', item)
  if (props.useRoute) {
    // 和你原逻辑一致：通过 state 传参，地址栏不污染
    router.push({ path: props.routeTo, state: { massgae: item } })
  }
}

/** === 弹层控制：保持原逻辑 === */
const isClosing = ref(false)
function closeModal() {
  if (isClosing.value) return
  isClosing.value = true
  setTimeout(() => {
    router.back()
    isClosing.value = false
  }, 500)
}

/** === GSAP 进出场 === */
function enterAnim(el, done) {
  gsap.fromTo(
    el,
    { y: '100%', opacity: 0 },
    { y: '0%', opacity: 1, duration: 0.9, ease: 'elastic.out(1, 1)', onComplete: done }
  )
}
function leaveAnim(el, done) {
  gsap.to(el, { y: '100%', opacity: 0, duration: 0.5, ease: 'power2.in', onComplete: done })
}
</script>

<style scoped>
/* Teleport 弹层样式（沿用你的样式） */
.modal-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-end;justify-content:center}
.modal-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(2px)}
.modal-content{position:relative;width:min(960px,92vw);max-height:88vh;overflow:auto;background:#fff;border-radius:1rem 1rem 0 0;padding:16px 16px 24px;box-shadow:0 -10px 40px rgba(0,0,0,.3)}
.modal-close{position:absolute;top:16px;right:16px;z-index:10;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;background:rgba(0,0,0,.25);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.2);color:#fff;transition:.2s}
.modal-close:hover{background:rgba(0,0,0,.4)}
.modal-close:active{transform:scale(.95)}
</style>
