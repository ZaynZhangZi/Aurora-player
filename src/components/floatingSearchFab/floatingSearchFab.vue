<template>
  <!-- 顶部导航 -->
  <div class="fixed inset-x-0 top-0 z-50 pointer-events-none">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        ref="shell"
        :class="expanded ? 'rounded-full pl-0 pr-4 sm:pr-6 h-12' : 'h-12 w-12 rounded-full'"
        class="mt-3 grid items-center overflow-hidden border border-white/10 shadow-lg ring-1 ring-white/10 bg-white/10 backdrop-blur-md backdrop-saturate-150 [grid-template-columns:48px_1fr] pointer-events-auto"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
      >
        <!-- 左侧按钮 -->
        <div class="col-[1/2] grid place-items-center size-12 shrink-0">
          <button
            ref="btn"
            :aria-pressed="expanded"
            :class="expanded ? 'scale-95' : 'scale-100'"
            class="grid place-items-center size-12 text-white/90 hover:text-white transition-transform duration-300 will-change-transform"
            type="button"
            @click="toggle()"
          >
            <span class="relative inline-flex items-center justify-center size-6 pointer-events-none">
              <Bars3Icon
                :class="expanded ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'"
                aria-hidden="true"
                class="absolute size-6 transition-all duration-300 ease-out"
              />
              <XMarkIcon
                :class="expanded ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'"
                aria-hidden="true"
                class="absolute size-6 transition-all duration-300 ease-out"
              />
            </span>
          </button>
        </div>

        <!-- 右侧内容 -->
        <div v-show="expanded" ref="content" class="col-[2/3] min-w-0 w-full flex items-center justify-between gap-4">
          <!-- 左插槽 -->
          <div class="hidden sm:block">
            <slot name="left"></slot>
          </div>

          <!-- 搜索 -->
          <div class="flex-1 hidden sm:flex">
            <div class="relative w-full h-full max-w-lg md:max-w-2xl transition-all duration-300 ease-out">
              <input
                ref="input"
                :placeholder="placeholder"
                class="w-full h-full text-sm text-white placeholder-white/60 bg-transparent outline-none ring-0 focus:ring-0 focus:outline-none transition-all duration-300"
                type="text"
                @keydown.enter="$emit('search', inputValue)"
                v-model="inputValue"
              />
            </div>
          </div>

          <!-- 登录 / 头像 -->
          <div v-if="showAuth" class="flex items-center space-x-4">
            <a
              v-if="!isLoggedIn"
              class="text-sm font-medium text-white/90 hover:text-white transition-colors whitespace-nowrap"
              @click="onClickSignIn"
            >
              {{ signInLabel }}
            </a>

            <div
              v-else
              class="flex items-center gap-2 rounded-full  text-white"
            >
              <img
                :src="avatarUrl || 'https://avatars.githubusercontent.com/u/0?v=4'"
                alt="avatar"
                class="size-7 rounded-full object-cover ring-1 ring-white/15"
              />
              <span class="text-sm font-medium max-w-[140px] truncate">{{ nickname }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 二维码登录弹窗：重构后的布局 -->
  <TailwindDialog v-model="visible" animation="scale">
    <!-- 标题区 -->
    <div class="px-1 sm:px-0">
      <h2 class="text-lg font-semibold">扫码登录</h2>
      <div class="mt-1 flex items-center gap-2">
        <span class="text-sm text-zinc-600">请使用 App 扫码登录</span>
        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          :class="badgeClass"
        >
          {{ qrStatusText }}
        </span>
      </div>
    </div>

    <!-- 主体：左二维码 / 右资料卡 -->
    <div class="mt-4 grid gap-6 sm:grid-cols-2">
      <!-- 二维码 -->
      <div class="flex items-center justify-center">
        <div class="w-[200px] h-[200px] rounded-2xl border border-zinc-200 grid place-items-center overflow-hidden bg-white">
          <template v-if="qrLoading">
            <span class="text-xs text-zinc-500">加载中...</span>
          </template>
          <template v-else-if="qrImg">
            <img :src="qrImg" alt="二维码" class="w-full h-full object-contain" />
          </template>
          <template v-else>
            <span class="text-xs text-zinc-400">二维码加载失败</span>
          </template>
        </div>
      </div>

      <!-- 资料卡：只显示头像+昵称；首次 802 锁定，不随轮询刷新 -->
      <div class="flex items-center">
        <div
          ref="cardRef"
          v-show="hasCard"
          class="w-full rounded-2xl border border-zinc-200 bg-white/80 backdrop-blur px-5 py-4 shadow-sm"
        >
          <div class="flex items-center gap-4">
            <img
              ref="avatarRef"
              :src="lockedPreview.avatarUrl || 'https://avatars.githubusercontent.com/u/0?v=4'"
              class="size-14 rounded-full object-cover ring-1 ring-zinc-200"
              alt="avatar"
            />
            <div class="min-w-0">
              <div ref="nameRef" class="text-base font-semibold truncate">{{ lockedPreview.nickname || '用户' }}</div>
              <div class="text-xs text-zinc-500 truncate">扫码成功后将自动登录</div>
            </div>
          </div>
        </div>

        <!-- 等待中展示引导 -->
        <div v-show="!hasCard" class="w-full rounded-2xl border border-dashed border-zinc-300 px-5 py-6 text-center text-sm text-zinc-500">
          等待扫码… 扫码后将在此显示你的头像与昵称
        </div>
      </div>
    </div>

    <!-- 操作区 -->
    <div class="mt-5 flex justify-end gap-3">
      <button class="px-3 py-2 rounded-lg border text-sm" type="button" @click="refreshQr" :disabled="qrLoading">
        刷新二维码
      </button>
      <button class="px-3 py-2 rounded-lg bg-black text-white text-sm" type="button" @click="visible = false">
        取消
      </button>
    </div>

    <template #footer />
  </TailwindDialog>
</template>

<script setup>
/**
 * 重构点：
 * - 弹窗布局：左二维码 / 右资料卡（头像+昵称）
 * - 首次进入 802 时锁定资料卡（hasCard+lockedPreview），之后轮询不再更新，避免头像抖动/动画重复
 * - 803 成功后 setLogin，头部从“登录”切换为头像+昵称
 */
import { ref, onMounted, onBeforeUnmount, watch, nextTick, defineExpose, computed } from 'vue'
import gsap from 'gsap'
import { XMarkIcon, Bars3Icon } from '@heroicons/vue/24/outline'
import TailwindDialog from '@/components/tailwindDialog/tailwindDialog.vue'
import { loginAPi } from '@/api/loginApi/loginAPi.js'
import {useCounterStore} from "@/stores/userStores.js";

const store = useCounterStore()

/* 头部登录切换 */
const isLoggedIn = computed(() => store.isLoggedIn)
const nickname   = computed(() => store.nickname)
const avatarUrl  = computed(() => store.avatarUrl)

/* 组件 props */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  autoExpandOnScroll: { type: Boolean, default: true },
  scrollThreshold: { type: Number, default: 24 },
  placeholder: { type: String, default: '搜索音乐、歌手或专辑' },
  signInLabel: { type: String, default: '登录' },
  signUpLabel: { type: String, default: '' },
  showAuth: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'expand', 'collapse', 'toggle', 'search', 'signin', 'signup'])

/* 原有导航动画状态 */
const shell = ref(null)
const content = ref(null)
const btn = ref(null)
const input = ref(null)
const expanded = ref(props.modelValue)
const hovering = ref(false)
const inputValue = ref('')
let navTl = null
let autoExpandByScroll = false

/* 登录弹窗状态 */
const visible = ref(false)
const qrKey = ref('')
const qrImg = ref('')
const qrStatusCode = ref(null)  // 800/801/802/803
const qrStatusText = ref('等待生成二维码…')
const qrLoading = ref(false)
let pollTimer = null

/* 只在首次 802 锁定的资料卡数据，避免轮询刷新抖动 */
const hasCard = ref(false)
const lockedPreview = ref({ userId: null, nickname: '', avatarUrl: '' })

/* GSAP refs */
const cardRef = ref(null)
const nameRef = ref(null)
const avatarRef = ref(null)

/* 状态徽标样式 */
const badgeClass = computed(() => {
  switch (qrStatusCode.value) {
    case 803: return 'bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200'
    case 802: return 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200'
    case 801: return 'bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200/60'
    case 800: return 'bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200'
    default:  return 'bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200'
  }
})

/* 打开登录 */
const onClickSignIn = () => { visible.value = true }

/* 弹窗开关：启动/清理二维码 */
watch(visible, async (v) => {
  if (v) {
    hasCard.value = false
    lockedPreview.value = { userId: null, nickname: '', avatarUrl: '' }
    await startQrLogin()
  } else {
    stopPolling()
    resetQrUi()
  }
})

function resetQrUi () {
  qrKey.value = ''
  qrImg.value = ''
  qrStatusCode.value = null
  qrStatusText.value = '等待生成二维码…'
}

/* 二维码流程 */
async function startQrLogin () {
  try {
    qrLoading.value = true
    qrStatusText.value = '生成 key…'
    // 1) key
    const keyRes = await loginAPi.getQrCodeKey()
    const key = keyRes?.data?.data?.unikey || keyRes?.data?.data?.key
    if (!key) throw new Error('未获取到 key')
    qrKey.value = key

    // 2) 二维码
    qrStatusText.value = '生成二维码…'
    const qrRes = await loginAPi.getQrCode(key)
    const img = qrRes?.data?.data?.qrimg
    if (!img) throw new Error('未获取到二维码图片')
    qrImg.value = img.startsWith('data:image') ? img : `data:image/png;base64,${img}`

    qrStatusCode.value = 801
    qrStatusText.value = '等待扫码'

    // 3) 轮询
    startPolling()
  } catch (e) {
    console.error(e)
    qrStatusText.value = '二维码生成失败'
  } finally {
    qrLoading.value = false
  }
}

function startPolling () {
  stopPolling()
  pollTimer = setInterval(checkQrStatus, 1500)
}
function stopPolling () {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

async function checkQrStatus () {
  if (!qrKey.value) return
  try {
    const res = await loginAPi.checkQrCode(qrKey.value)
    const data = res?.data || {}
    const code = data?.code
    qrStatusCode.value = code

    // 首次进入 802：锁定资料卡，不再随轮询改动，避免头像反复刷新
    if (code === 802 && !hasCard.value) {
      const avatar = data?.avatarUrl || data?.data?.avatarUrl
      const name   = data?.nickname  || data?.data?.nickname
      const uid    = data?.userId    || data?.data?.userId
      if (avatar || name) {
        lockedPreview.value = { userId: uid ?? null, nickname: name ?? '', avatarUrl: avatar ?? '' }
        hasCard.value = true
        revealCard()
      }
    }

    switch (code) {
      case 801:
        qrStatusText.value = '等待扫码'
        break
      case 802:
        qrStatusText.value = '授权中'
        break
      case 803: {
        qrStatusText.value = '登录成功'
        stopPolling()

        // 用 803 的数据兜底：若之前没锁定到头像/昵称，这里再取一次
        const avatar = data?.avatarUrl || data?.data?.avatarUrl || lockedPreview.value.avatarUrl
        const name   = data?.nickname  || data?.data?.nickname  || lockedPreview.value.nickname
        const uid    = data?.userId    || data?.data?.userId    || lockedPreview.value.userId
        const cookie = data?.cookie    || data?.data?.cookie    || ''

        store.setLogin(cookie, { userId: uid ?? null, nickname: name ?? '', avatarUrl: avatar ?? '' })

        // 关闭弹窗 → 头部自动切换（由 Pinia 计算属性驱动）
        setTimeout(() => {
          visible.value = false
          emit('signin')
        }, 300)
        break
      }
      case 800:
        qrStatusText.value = '二维码已过期，请刷新'
        stopPolling()
        break
      default:
        qrStatusText.value = `状态：${code ?? '未知'}`
    }
  } catch (err) {
    // 扫码后若 502，带 noCookie 再试一次
    try {
      if (String(err)?.includes('502')) {
        const res2 = await loginAPi.checkQrCode(`${qrKey.value}&noCookie=true`)
        const d2 = res2?.data || {}
        const code2 = d2?.code
        qrStatusCode.value = code2

        if (code2 === 803) {
          const avatar = d2?.avatarUrl || d2?.data?.avatarUrl || lockedPreview.value.avatarUrl
          const name   = d2?.nickname  || d2?.data?.nickname  || lockedPreview.value.nickname
          const uid    = d2?.userId    || d2?.data?.userId    || lockedPreview.value.userId
          const cookie = d2?.cookie    || d2?.data?.cookie    || ''
          store.setLogin(cookie, { userId: uid ?? null, nickname: name ?? '', avatarUrl: avatar ?? '' })
          qrStatusText.value = '登录成功'
          stopPolling()
          setTimeout(() => { visible.value = false; emit('signin') }, 300)
        }
      } else {
        console.error(err)
      }
    } catch (e2) {
      console.error('check with noCookie failed:', e2)
    }
  }
}

/* 刷新二维码（清空锁定，重新开始） */
async function refreshQr () {
  stopPolling()
  hasCard.value = false
  lockedPreview.value = { userId: null, nickname: '', avatarUrl: '' }
  await startQrLogin()
}

/* GSAP：卡片进场（只在首次 802 时播放一次） */
async function revealCard () {
  await nextTick()
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (cardRef.value) {
    tl.fromTo(cardRef.value, { y: 12, opacity: 0, filter: 'blur(4px)' }, { y: 0, opacity: 1, filter: 'blur(0)', duration: 0.35 })
  }
  if (avatarRef.value) {
    tl.fromTo(avatarRef.value, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25 }, '-=0.2')
  }
  if (nameRef.value) {
    tl.fromTo(nameRef.value, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.22 }, '-=0.15')
  }
}

/* ===== 下面保持你的原始导航动画逻辑 ===== */
watch(() => props.modelValue, (v) => {
  if (v !== expanded.value) animateExpand(v)
})

function measureExpandedWidth () {
  const el = shell.value
  if (!el) return 48
  const prev = { width: el.style.width }
  el.style.width = 'auto'
  const rect = el.getBoundingClientRect()
  el.style.width = prev.width
  return rect.width
}

function animateExpand (toExpand) {
  if (!shell.value) return
  navTl?.kill()
  const toWidth = toExpand ? measureExpandedWidth() : 48
  navTl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.5 } })
    .to(shell.value, {
      width: toWidth,
      height: 48,
      borderRadius: 9999,
      onStart: () => { if (toExpand) expanded.value = true },
      onComplete: () => {
        if (!toExpand) expanded.value = false
        navTl = null
        if (toExpand) input.value?.focus()
      },
    }, 0)

  if (toExpand) {
    navTl.fromTo(content.value, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.35 }, 0.1)
  } else {
    navTl.to(content.value, { opacity: 0, y: -6, duration: 0.2 }, 0)
  }

  emit('update:modelValue', toExpand)
  emit(toExpand ? 'expand' : 'collapse')
}

function expand () { animateExpand(true) }
function collapse () { animateExpand(false) }
function toggle  () { animateExpand(!expanded.value); emit('toggle', expanded.value) }

function onScroll () {
  if (!props.autoExpandOnScroll) return
  const y = window.scrollY || document.documentElement.scrollTop
  const nearTop = y <= props.scrollThreshold
  if (!nearTop && !expanded.value) {
    autoExpandByScroll = true; expand()
  } else if (nearTop && expanded.value && autoExpandByScroll && !hovering.value) {
    collapse(); autoExpandByScroll = false
  }
}

defineExpose({ expand, collapse, toggle, focus: () => input.value?.focus() })

onMounted(async () => {
  await nextTick()
  if (shell.value) gsap.set(shell.value, { width: 48, height: 48, borderRadius: 9999 })
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  navTl?.kill()
  window.removeEventListener('scroll', onScroll)
  stopPolling()
})
</script>

<style scoped>
button, svg { backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: translateZ(0); }
* { cursor: pointer; }
</style>
