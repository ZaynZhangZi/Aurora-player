<template>
  <div class="bg-gray-50">
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div class="sm:flex sm:items-baseline sm:justify-between">
        <h2 class="text-2xl font-bold tracking-tight text-gray-900">{{title}}</h2>
        <a href="#" class="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:block">
          {{more}}
          <span v-if="more" aria-hidden="true"> &rarr;</span>
        </a>
      </div>

      <div @click="router.push('/home/playList')" class="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:grid-rows-2 sm:gap-x-6 lg:gap-8">
        <div class="group relative aspect-2/1 overflow-hidden rounded-lg sm:row-span-2 sm:aspect-square">
          <img src="https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-03-featured-category.jpg" alt="Two models wearing women's black cotton crewneck tee and off-white cotton crewneck tee." class="absolute size-full object-cover group-hover:opacity-75" />
          <div aria-hidden="true" class="absolute inset-0 bg-linear-to-b from-transparent to-black opacity-50" />
          <div class="absolute inset-0 flex items-end p-6">
            <div>
              <h3 class="font-semibold text-white">
                <a href="#">
                  <span class="absolute inset-0" />
                  New Arrivals
                </a>
              </h3>
              <p aria-hidden="true" class="mt-1 text-sm text-white">Shop now</p>
            </div>
          </div>
        </div>
        <div class="group relative aspect-2/1 overflow-hidden rounded-lg sm:aspect-auto">
          <img src="https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-03-category-01.jpg" alt="Wooden shelf with gray and olive drab green baseball caps, next to wooden clothes hanger with sweaters." class="absolute size-full object-cover group-hover:opacity-75" />
          <div aria-hidden="true" class="absolute inset-0 bg-linear-to-b from-transparent to-black opacity-50" />
          <div class="absolute inset-0 flex items-end p-6">
            <div>
              <h3 class="font-semibold text-white">
                <a href="#">
                  <span class="absolute inset-0" />
                  Accessories
                </a>
              </h3>
              <p aria-hidden="true" class="mt-1 text-sm text-white">Shop now</p>
            </div>
          </div>
        </div>
        <div class="group relative aspect-2/1 overflow-hidden rounded-lg sm:aspect-auto">
          <img src="https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-03-category-02.jpg" alt="Walnut desk organizer set with white modular trays, next to porcelain mug on wooden desk." class="absolute size-full object-cover group-hover:opacity-75" />
          <div aria-hidden="true" class="absolute inset-0 bg-linear-to-b from-transparent to-black opacity-50" />
          <div class="absolute inset-0 flex items-end p-6">
            <div>
              <h3 class="font-semibold text-white">
                <a href="#">
                  <span class="absolute inset-0" />
                  Workspace
                </a>
              </h3>
              <p aria-hidden="true" class="mt-1 text-sm text-white">Shop now</p>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 sm:hidden">
        <a href="#" class="block text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          Browse all categories
          <span aria-hidden="true"> &rarr;</span>
        </a>
      </div>
    </div>
  </div>


  <router-view v-slot="{ Component }">
    <Teleport to="body" v-if="Component || isClosing">
      <div class="modal-overlay">
        <div class="modal-backdrop" @click="closeModal" />
        <Transition @enter="enterAnim" @leave="leaveAnim" appear>
          <component :is="Component" class="modal-content" v-if="!isClosing" />
        </Transition>
      </div>
    </Teleport>
  </router-view>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import gsap from 'gsap'
import router from "@/router/index.js";

const root = ref(null)
const cleanups = []
const route = useRoute()

const props = defineProps({
  title: {
    type: String,
    default: '这个是标题'
  },
  more:{
    type: String,
    default: ''
  }
})

onMounted(() => {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (coarse || reduced) return

  const scope = root.value ?? document
  const cards = scope.querySelectorAll('.group.relative')

  cards.forEach((card) => {
    const textWrap = card.querySelector('.flex.items-end > div')
    if (!textWrap) return

    // 初始：清晰静止
    gsap.set(textWrap, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      willChange: 'transform, filter, opacity'
    })

    let tl

    // ✅ 移入时：轻微上浮、透明度微调（不模糊）
    const enter = () => {
      tl?.kill()
      tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        .to(textWrap, {
          duration: 0.35,
          opacity: 1,
          y: -4,
          filter: 'blur(0px)'
        })
    }

    // ✅ 移出时：模糊 → 滚动一圈 → 清晰归位
    const leave = () => {
      tl?.kill()
      tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } })
        .to(textWrap, { duration: 0.25, opacity: 0.8, filter: 'blur(4px)', y: 10 })
        .to(textWrap, {
          duration: 0.8,
          y: '-100%',
          opacity: 0,
          filter: 'blur(8px)',
          ease: 'power2.inOut'
        })
        .set(textWrap, { y: '100%' }) // 瞬间到底部（实现完整一圈）
        .to(textWrap, {
          duration: 0.6,
          y: '0%',
          opacity: 1,
          filter: 'blur(0px)',
          ease: 'power3.out'
        })
    }

    card.addEventListener('pointerenter', enter)
    card.addEventListener('pointerleave', leave)
    cleanups.push(() => {
      card.removeEventListener('pointerenter', enter)
      card.removeEventListener('pointerleave', leave)
    })
  })
})

// 监听路由变化，控制背景滚动
watch(() => route.matched.length > 1, (hasModal) => {
  if (hasModal) {
    // 弹窗打开：禁止背景滚动
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`
  } else {
    // 弹窗关闭：恢复背景滚动
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  }
}, { immediate: true })

const isClosing = ref(false)

function closeModal() {
  if (isClosing.value) return
  isClosing.value = true

  // 等待动画完成后再关闭路由
  setTimeout(() => {
    router.back()
    isClosing.value = false
  }, 500) // 与 leaveAnim 的 duration 一致
}

function enterAnim(el, done) {
  gsap.fromTo(
    el,
    {
      y: '100%',
      opacity: 0,
    },
    {
      y: '0%',
      opacity: 1,
      duration: 0.9,
      ease: 'elastic.out(1, 1)',
      onComplete: done
    }
  )
}

function leaveAnim(el, done) {
  gsap.to(el, {
    y: '100%',
    opacity: 0,
    duration: 0.5,
    ease: 'power2.in',
    onComplete: done
  })
}

onBeforeUnmount(() => {
  cleanups.forEach(fn => fn())
  // 组件卸载时确保恢复滚动
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})
</script>

<style scoped>
.group.relative .flex.items-end > div {
  will-change: transform, filter, opacity;
  transform-origin: center;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9;
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
}

.modal-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 1440px;
  height: 80vh;
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

</style>
