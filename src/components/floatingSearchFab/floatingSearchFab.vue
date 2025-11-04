<template>
  <!-- 固定在顶部：你也可以通过 props 改位置/宽度 -->
  <div class="fixed inset-x-0 top-0 z-50 pointer-events-none">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- 外壳：grid 两列，左 48px 固定按钮，右侧自适应内容 -->
      <div
        ref="shell"
        :class="expanded ? 'rounded-full pl-0 pr-4 sm:pr-6 h-12' : 'h-12 w-12 rounded-full'"
        class="mt-3 grid items-center overflow-hidden border border-white/10 shadow-lg ring-1 ring-white/10 bg-white/10 backdrop-blur-md backdrop-saturate-150 [grid-template-columns:48px_1fr] pointer-events-auto"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
      >
        <!-- 固定占位容器：按钮不会被右侧内容挤动 -->
        <div class="col-[1/2] grid place-items-center size-12 shrink-0">
          <button
            ref="btn"
            :aria-pressed="expanded"
            :class="expanded ? 'scale-95' : 'scale-100'"
            class="grid place-items-center size-12 text-white/90 hover:text-white transition-transform duration-300 will-change-transform"
            type="button"
            @click="toggle()"
          >
            <span
              class="relative inline-flex items-center justify-center size-6 pointer-events-none">
              <!-- Bars3：收起态 -->
              <Bars3Icon
                :class="expanded ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'"
                aria-hidden="true"
                class="absolute size-6 transition-all duration-300 ease-out"
              />
              <!-- X：展开态 -->
              <XMarkIcon
                :class="expanded ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'"
                aria-hidden="true"
                class="absolute size-6 transition-all duration-300 ease-out"
              />
            </span>
          </button>
        </div>

        <!-- 展开态内容：锁定第二列 -->
        <div
          v-show="expanded && contentVisible"
          ref="content"
          class="col-[2/3] min-w-0 w-full flex items-center justify-between gap-4"
        >
          <!-- 左侧插槽（可选：比如货币/分类） -->
          <div class="hidden sm:block">
            <slot name="left"></slot>
          </div>

          <!-- 搜索框 -->
          <div class="flex-1 hidden sm:flex">
            <div
              class="relative w-full h-full max-w-lg md:max-w-2xl transition-all duration-300 ease-out">
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

          <!-- 右侧 登录 / 注册（可隐藏） -->
          <div v-if="showAuth" class="flex items-center space-x-4 cursor-pointer">
            <button
              v-if="!isLoggedIn"
              class="text-sm font-medium text-white/90 hover:text-white transition-colors whitespace-nowrap"
              type="button"
              @click="openLoginDialog"
            >
              {{ signInLabel }}
            </button>
            <div
              v-else
              class="flex items-center gap-2 rounded-full bg-white/20 px-2 py-1 text-white/90"
            >
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt="用户头像"
                class="size-6 rounded-full object-cover"
              />
              <span class="text-xs">{{ userNickname || '已登录' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 登录对话框 -->
  <Dialog :open="isOpen" @close="setIsOpen">
    <div ref="dialogOverlay" class="fixed inset-0 bg-black/40 backdrop-blur-sm"
         aria-hidden="true"></div>
    <div class="fixed inset-0 flex items-center justify-center p-4">
      <DialogPanel
        ref="dialogPanel"
        class="panel-anim relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button
          ref="closeBtn"
          :class="[
            'absolute right-4 top-4 text-gray-400 transition-transform hover:scale-110 hover:text-gray-600 focus:outline-none',
            { 'no-hover': isClosing }
          ]"
          type="button"
          @click="setIsOpen(false)"
        >
          <XMarkIcon class="size-5"/>
        </button>

        <DialogTitle class="text-lg font-semibold text-gray-900">扫码登录</DialogTitle>
        <DialogDescription class="mt-1 text-sm text-gray-500">
          使用网易云音乐 App 扫码登录，授权后即可同步你的歌单与账号信息
        </DialogDescription>

        <div class="mt-6 flex flex-col items-center gap-4">
          <div class="relative size-52 overflow-hidden rounded-2xl bg-gray-100 p-3">
            <div
              v-if="qrState === 'loading'"
              class="flex h-full w-full items-center justify-center text-sm text-gray-500"
            >
              正在生成二维码...
            </div>
            <img
              v-else-if="qrImage"
              :src="qrImage"
              alt="登录二维码"
              class="h-full w-full rounded-lg bg-white object-contain"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-sm text-gray-400"
            >
              暂无二维码
            </div>

            <div
              v-if="qrState === 'expired'"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white"
            >
              <span class="text-sm">二维码已过期</span>
              <button
                class="rounded-full bg-white/90 px-4 py-1 text-xs font-medium text-black"
                type="button"
                @click="refreshQr"
              >
                重新获取
              </button>
            </div>

            <div
              v-else-if="qrState === 'success'"
              class="absolute inset-0 flex items-center justify-center bg-green-600/90 text-base font-semibold text-white"
            >
              登录成功
            </div>
            <div
              v-else-if="qrState === 'confirm' && confirmProfile"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center text-white"
            >
              <img
                v-if="confirmProfile.avatarUrl"
                :src="confirmProfile.avatarUrl"
                alt="扫码用户头像"
                class="size-14 rounded-full border-2 border-white/90 object-cover"
              />
              <div class="flex flex-col items-center gap-1">
                <span class="text-sm font-semibold">
                  {{ confirmProfile.nickname || '已扫码' }}
                </span>
                <span class="text-xs text-white/70">请在手机端确认登录授权</span>
              </div>
            </div>
          </div>

          <p class="text-sm text-gray-600">{{ qrStatusText }}</p>
          <p v-if="qrError" class="text-xs text-red-500">{{ qrError }}</p>
        </div>

        <div class="mt-6 flex items-center justify-between text-sm">
          <button
            class="text-gray-500 transition-colors hover:text-gray-900"
            type="button"
            :disabled="qrState === 'loading'"
            @click="refreshQr"
          >
            换一个二维码
          </button>
          <button
            class="rounded-full bg-gray-900 px-5 py-2 text-white transition-colors hover:bg-gray-800"
            type="button"
            @click="setIsOpen(false)"
          >
            关闭
          </button>
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount, watch, nextTick, defineExpose, computed} from 'vue'
import gsap from 'gsap'
import {XMarkIcon, Bars3Icon} from '@heroicons/vue/24/outline'
import {Dialog, DialogPanel, DialogTitle, DialogDescription} from '@headlessui/vue'
import {userApi} from '@/api/userApi/userApi.js'
import {useCounterStore} from '@/stores/userStores.js'

const props = defineProps({
  modelValue: {type: Boolean, default: false},          // 受控展开
  autoExpandOnScroll: {type: Boolean, default: true},   // 滚动后自动展开
  scrollThreshold: {type: Number, default: 24},         // 触发的滚动阈值
  placeholder: {type: String, default: '搜索音乐、歌手或专辑'},
  signInLabel: {type: String, default: '登录'},
  signUpLabel: {type: String, default: ''},             // 不传则不展示
  showAuth: {type: Boolean, default: true},
})

const emit = defineEmits(['update:modelValue', 'expand', 'collapse', 'toggle', 'search', 'signin', 'signup'])

const shell = ref(null)
const content = ref(null)
const btn = ref(null)
const input = ref(null)
const dialogOverlay = ref(null)
const dialogPanel = ref(null)
const closeBtn = ref(null)

const expanded = ref(props.modelValue)
const contentVisible = ref(props.modelValue)
const hovering = ref(false)
const inputValue = ref('')

const confirmProfile = ref(null)
const isOpen = ref(false)
const qrKey = ref('')
const qrImage = ref('')
const qrState = ref('idle') // idle | loading | wait | confirm | expired | success | error
const qrError = ref('')
const pollingTimer = ref(null)
const useNoCookie = ref(false)
const isClosing = ref(false)

const userStore = useCounterStore()
const isLoggedIn = computed(() => userStore.isLoggedIn)
const avatarUrl = computed(() => userStore.avatarUrl)
const userNickname = computed(() => userStore.nickname)

let navTl = null
let autoExpandByScroll = false

watch(() => props.modelValue, (v) => {
  if (v !== expanded.value) animateExpand(v)
})

function measureExpandedWidth() {
  const el = shell.value
  const cnt = content.value
  if (!el || !cnt) return 48
  const prev = {width: el.style.width}
  el.style.width = 'auto'
  const rect = el.getBoundingClientRect()
  el.style.width = prev.width
  return rect.width
}

function animateExpand(toExpand) {
  if (!shell.value) return
  navTl?.kill()

  const toWidth = toExpand ? measureExpandedWidth() : 48
  if (toExpand) {
    contentVisible.value = true
    expanded.value = true
  }

  navTl = gsap.timeline({
    defaults: {ease: 'power3.out'},
    onComplete: () => {
      if (!toExpand) expanded.value = false
      navTl = null
      if (toExpand) input.value?.focus()
    },
  })

  if (toExpand) {
    navTl.to(shell.value, {
      width: toWidth,
      height: 48,
      borderRadius: 9999,
      duration: 0.5,
    }, 0)
    navTl.fromTo(content.value, {opacity: 0, y: -6}, {opacity: 1, y: 0, duration: 0.35}, 0.1)
  } else {
    navTl.to(content.value, {
      opacity: 0,
      y: -6,
      duration: 0.2,
      onComplete: () => {
        contentVisible.value = false
      },
    }, 0)
    navTl.to(shell.value, {
      width: toWidth,
      height: 48,
      borderRadius: 9999,
      duration: 0.45,
    }, 0.2)
  }

  emit('update:modelValue', toExpand)
  emit(toExpand ? 'expand' : 'collapse')
}

function expand() {
  animateExpand(true)
}

function collapse() {
  animateExpand(false)
}

function toggle() {
  const next = !expanded.value
  animateExpand(next)
  emit('toggle', next) // 修正：抛出目标状态
}

function onScroll() {
  if (!props.autoExpandOnScroll) return
  const y = window.scrollY || document.documentElement.scrollTop
  const nearTop = y <= props.scrollThreshold
  if (!nearTop && !expanded.value) {
    autoExpandByScroll = true
    expand()
  } else if (nearTop && expanded.value && autoExpandByScroll && !hovering.value) {
    collapse()
    autoExpandByScroll = false
  }
}

defineExpose({expand, collapse, toggle, focus: () => input.value?.focus()})

onMounted(async () => {
  await nextTick()
  if (shell.value) gsap.set(shell.value, {width: 48, height: 48, borderRadius: 9999})
  window.addEventListener('scroll', onScroll, {passive: true})
})

onBeforeUnmount(() => {
  navTl?.kill()
  window.removeEventListener('scroll', onScroll)
  stopQrPolling()
})

watch(isOpen, (open) => {
  if (open) {
    startQrLogin()
  } else {
    stopQrPolling()
    resetQrState()
  }
})

const qrStatusText = computed(() => {
  switch (qrState.value) {
    case 'loading':
      return '正在生成二维码，请稍候...'
    case 'wait':
      return '打开网易云音乐 App 扫码登录'
    case 'confirm':
      return '已扫码，请在手机端确认授权'
    case 'success':
      return '登录成功，正在同步资料...'
    case 'expired':
      return '二维码已过期，请重新获取'
    case 'error':
      return '二维码生成失败，请稍后重试'
    default:
      return '扫码登录更安全快捷'
  }
})

function openLoginDialog() {
  setIsOpen(true)
}

async function setIsOpen(value) {
  if (value) {
    if (isOpen.value) return
    isOpen.value = true
    await nextTick()
    animateDialogIn()
    return
  }
  if (!isOpen.value) return
  await animateDialogOut()
  isOpen.value = false
}

function resetQrState() {
  qrKey.value = ''
  qrImage.value = ''
  qrState.value = 'idle'
  qrError.value = ''
  useNoCookie.value = false
  confirmProfile.value = null
}

async function startQrLogin() {
  resetQrState()
  qrState.value = 'loading'
  try {
    const keyRes = await userApi.getQrKey()
    const key = keyRes?.data?.data?.unikey
    if (!key) throw new Error('未获取到二维码 key')
    qrKey.value = key

    const qrRes = await userApi.getQrCode(key)
    const qrImg = qrRes?.data?.data?.qrimg
    if (!qrImg) throw new Error('未获取到二维码图片')
    qrImage.value = qrImg
    qrState.value = 'wait'
    startQrPolling()
  } catch (error) {
    qrState.value = 'error'
    qrError.value = error?.message || '二维码生成失败'
  }
}

function startQrPolling() {
  stopQrPolling()
  fetchQrStatus()
  pollingTimer.value = window.setInterval(fetchQrStatus, 2000)
}

function stopQrPolling() {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

async function fetchQrStatus() {
  if (!qrKey.value) return
  try {
    const res = await userApi.checkQrCode(qrKey.value, {noCookie: useNoCookie.value})
    const code = res?.data?.code
    const qrData = res?.data || {}
    switch (code) {
      case 800:
        qrState.value = 'expired'
        stopQrPolling()
        break
      case 801:
        qrState.value = 'wait'
        break
      case 802:
        qrState.value = 'confirm'
        confirmProfile.value = {
          avatarUrl: qrData.avatarUrl || '',
          nickname: qrData.nickname || '',
        }
        break
      case 803:
        await handleLoginSuccess(res?.data)
        break
      case 502:
        useNoCookie.value = true
        break
      default:
        if (code && code !== 200) {
          qrState.value = 'error'
          qrError.value = res?.data?.message || `登录失败，错误码：${code}`
          stopQrPolling()
        }
    }
  } catch (error) {
    qrState.value = 'error'
    qrError.value = error?.message || '二维码状态获取失败'
    stopQrPolling()
  }
}

async function handleLoginSuccess(payload) {
  qrState.value = 'success'
  stopQrPolling()
  const cookie = payload?.cookie || payload?.data?.cookie
  if (cookie) {
    userStore.setLogin(cookie)
    try {
      const infoRes = await userApi.getUserInfo()
      const profile = buildProfile(infoRes?.data)
      userStore.setProfile(profile)
      emit('signin', profile)
    } catch (error) {
      console.error('获取用户信息失败', error)
      if (confirmProfile.value) {
        userStore.setProfile({
          userId: null,
          nickname: confirmProfile.value.nickname || '',
          avatarUrl: confirmProfile.value.avatarUrl || '',
        })
      }
    }
  }
  setTimeout(() => setIsOpen(false), 800)
}

function refreshQr() {
  if (qrState.value === 'loading') return
  startQrLogin()
}

function buildProfile(data) {
  const profileSource = data?.profile || data || {}
  return {
    userId: profileSource.userId ?? profileSource.id ?? null,
    nickname: profileSource.nickname ?? profileSource.userName ?? confirmProfile.value?.nickname ?? '',
    avatarUrl: profileSource.avatarUrl ?? confirmProfile.value?.avatarUrl ?? '',
  }
}

/** 进场动画：固定 transformOrigin，轻微缩放+模糊 */
function animateDialogIn() {
  const overlay = dialogOverlay.value
  const panel = dialogPanel.value
  if (!overlay && !panel) return
  gsap.killTweensOf([overlay, panel])

  const tl = gsap.timeline({defaults: {ease: 'power3.out'}})

  if (overlay) {
    gsap.set(overlay, {opacity: 0})
    tl.to(overlay, {opacity: 1, duration: 0.22}, 0)
  }

  if (panel) {
    gsap.set(panel, {opacity: 0, scale: 0.98, filter: 'blur(8px)', transformOrigin: '50% 20%'})
    tl.to(panel, {opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.28}, 0.02)
  }
}

/** 退场动画：不做 y 位移；关闭期间禁用 hover 放大 */
function animateDialogOut() {
  const overlay = dialogOverlay.value
  const panel = dialogPanel.value
  if (!overlay && !panel) return Promise.resolve()

  isClosing.value = true

  return new Promise((resolve) => {
    gsap.killTweensOf([overlay, panel])

    const tl = gsap.timeline({
      defaults: {ease: 'power2.in', duration: 0.18},
      onComplete: () => {
        isClosing.value = false
        gsap.set([overlay, panel], {clearProps: 'all'})
        resolve()
      },
    })

    if (panel) {
      tl.to(panel, {opacity: 0, scale: 0.98, filter: 'blur(8px)', transformOrigin: '50% 20%'}, 0)
    }
    if (overlay) tl.to(overlay, {opacity: 0}, 0)
  })
}
</script>

<style scoped>
/* 抗抖动：在部分浏览器减少亚像素抖动 */
button, svg {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
}

/* 关闭动画期间，锁定按钮 hover，避免与父级缩放叠加造成“弹回”视觉 */
.no-hover:hover {
  transform: none !important;
}

/* 稳定绘制，减少合成抖动（给 DialogPanel 一个静态类以便 scoped 匹配） */
.panel-anim {
  will-change: transform, opacity, filter;
}
</style>
