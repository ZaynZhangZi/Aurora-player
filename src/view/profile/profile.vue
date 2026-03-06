<template>
  <div class="min-h-screen bg-stone-100 text-stone-900">
    <section class="relative overflow-hidden border-b border-stone-200 bg-white">
      <div class="profile-hero-flow absolute inset-0" />
      <canvas ref="heroCanvasRef" class="profile-hero-canvas absolute inset-0" />
      <div class="pointer-events-none absolute -left-16 top-10 h-44 w-44 rounded-full bg-white/25 blur-2xl" />
      <div class="pointer-events-none absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-stone-100/40 blur-2xl" />
      <div class="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-8">
        <div class="mb-4 flex justify-end">
          <button
            class="rounded-full border border-stone-300 bg-white/90 px-4 py-1.5 text-sm text-stone-700 transition hover:-translate-y-0.5 hover:bg-white"
            type="button"
            @click="goBack"
          >
            返回
          </button>
        </div>

        <div class="grid gap-6 lg:grid-cols-[140px_1fr] lg:items-center">
          <img
            v-if="profile.avatarUrl"
            :src="profile.avatarUrl"
            alt="avatar"
            class="h-32 w-32 rounded-3xl border border-white/70 object-cover shadow-xl shadow-stone-300/40"
          />

          <div>
            <p class="text-xs uppercase tracking-[0.22em] text-stone-600">Personal Center</p>
            <h1 class="mt-2 text-4xl font-black leading-tight text-stone-900">{{ profile.nickname || '我的主页' }}</h1>

            <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span class="rounded-full border border-stone-300 bg-white/85 px-3 py-1">UID {{ profile.userId || '-' }}</span>
              <span class="rounded-full border border-stone-300 bg-white/85 px-3 py-1">{{ certificationText }}</span>
              <span class="rounded-full border border-stone-300 bg-white/85 px-3 py-1">地区 {{ locationText }}</span>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span class="profile-kpi-pill rounded-full border border-stone-300 bg-white/85 px-3 py-1">关注 {{ formatCount(profile.follows) }}</span>
              <span class="profile-kpi-pill rounded-full border border-stone-300 bg-white/85 px-3 py-1">粉丝 {{ formatCount(profile.followeds) }}</span>
              <span class="profile-kpi-pill rounded-full border border-stone-300 bg-white/85 px-3 py-1">等级 Lv.{{ level.level || 0 }}</span>
            </div>

            <p class="mt-4 max-w-3xl rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm leading-relaxed text-stone-700">
              {{ profile.signature || profile.description || '这个人很神秘，还没有留下简介。' }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <section class="mb-5 flex items-center gap-5 border-b border-stone-200">
        <div class="flex items-center gap-4">
          <button
            class="-mb-px border-b-2 px-1 pb-3 pt-1 text-sm font-semibold transition"
            :class="activeTab === 'playlist' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-700'"
            type="button"
            @click="switchTab('playlist')"
          >
            歌单总览
          </button>
          <button
            class="-mb-px border-b-2 px-1 pb-3 pt-1 text-sm font-semibold transition"
            :class="activeTab === 'cloud' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-700'"
            type="button"
            @click="switchTab('cloud')"
          >
            云盘管理
          </button>
        </div>
      </section>

      <transition name="tab-panel" mode="out-in">
        <section v-if="activeTab === 'playlist'" key="playlist" class="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-2xl font-bold">我的歌单</h2>
          <span class="text-xs text-stone-500">创建 {{ createdPlaylists.length }} · 收藏 {{ subscribedPlaylists.length }}</span>
        </div>

        <p v-if="loading" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="error" class="text-sm text-red-500">{{ error }}</p>

        <template v-else>
          <div class="mb-6">
            <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">我创建的歌单</h3>
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <article
                v-for="item in createdPlaylists"
                :key="`created-${item.id}`"
                class="group flex cursor-pointer gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-3 transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white"
                @click="openPlaylist(item)"
              >
                <div class="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                  <img :src="item.coverImgUrl" alt="playlist" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-base font-semibold">{{ item.name }}</p>
                  <p class="mt-1 text-xs text-stone-500">{{ item.trackCount || 0 }} 首音乐</p>
                  <p class="mt-3 line-clamp-2 text-xs text-stone-600">{{ item.description || '还没有写歌单简介。' }}</p>
                </div>
              </article>
            </div>
            <p v-if="!createdPlaylists.length" class="text-sm text-stone-500">还没有创建歌单。</p>
          </div>

          <div>
            <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">我收藏的歌单</h3>
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <article
                v-for="item in subscribedPlaylists"
                :key="`sub-${item.id}`"
                class="group flex cursor-pointer gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-3 transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white"
                @click="openPlaylist(item)"
              >
                <div class="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                  <img :src="item.coverImgUrl" alt="playlist" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold">{{ item.name }}</p>
                  <p class="mt-1 text-xs text-stone-500">{{ item.trackCount || 0 }} 首音乐</p>
                </div>
              </article>
            </div>
            <p v-if="!subscribedPlaylists.length" class="text-sm text-stone-500">还没有收藏歌单。</p>
          </div>
        </template>
        </section>

        <section v-else key="cloud" class="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-2xl font-bold">云盘</h2>
          <button
            class="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
            type="button"
            :disabled="cloudLoading"
            @click="loadCloudSongs(cloudPage)"
          >
            刷新
          </button>
        </div>

        <div class="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-3">
          <p class="mb-2 text-xs uppercase tracking-wide text-stone-500">云盘上传</p>
          <div class="flex flex-wrap items-center gap-2">
            <input
              :key="cloudFileInputKey"
              type="file"
              accept=".mp3,.flac,.wav,.m4a,.aac"
              class="max-w-[260px] rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs"
              @change="onCloudFileChange"
            />
            <button
              class="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-40"
              type="button"
              :disabled="cloudUploading || !cloudUploadFile"
              @click="uploadCloudSong"
            >
              {{ cloudUploading ? '上传中...' : '上传到云盘' }}
            </button>
            <span v-if="cloudUploadMessage" class="text-xs text-stone-600">{{ cloudUploadMessage }}</span>
          </div>
        </div>

        <p v-if="cloudLoading" class="text-sm text-stone-500">云盘加载中...</p>
        <p v-else-if="cloudError" class="text-sm text-red-500">{{ cloudError }}</p>

        <template v-else>
          <div v-if="cloudSongs.length" class="space-y-2">
            <article
              v-for="item in cloudSongs"
              :key="`cloud-${item.songId}`"
              class="cursor-pointer rounded-2xl border border-stone-100 bg-stone-50 p-3 transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white"
              @click="playCloudSong(item)"
            >
              <div class="flex flex-wrap items-start gap-3">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold">{{ item.songName }}</p>
                  <p class="mt-1 truncate text-xs text-stone-500">{{ item.artistName }} · {{ item.albumName }}</p>
                  <p class="mt-1 text-xs text-stone-500">ID {{ item.songId }} · {{ formatFileSize(item.fileSize) }} · {{ formatDateTime(item.addTime) }}</p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <button
                    class="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs transition hover:bg-stone-100 disabled:opacity-40"
                    type="button"
                    :disabled="cloudDetailLoadingId === item.songId"
                    @click.stop="toggleCloudDetail(item)"
                  >
                    {{ activeCloudDetailId === item.songId ? '收起详情' : '云盘数据详情' }}
                  </button>
                  <button
                    class="rounded-full border border-red-300 bg-white px-3 py-1 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                    type="button"
                    :disabled="cloudDeletingId === item.songId"
                    @click.stop="deleteCloudSong(item)"
                  >
                    {{ cloudDeletingId === item.songId ? '删除中...' : '云盘歌曲删除' }}
                  </button>
                </div>
              </div>

              <div v-if="activeCloudDetailId === item.songId" class="mt-3 rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-600">
                <p v-if="cloudDetailLoadingId === item.songId">详情加载中...</p>
                <template v-else>
                  <p>文件名：{{ cloudDetails[item.songId]?.fileName || item.fileName || '-' }}</p>
                  <p class="mt-1">比特率：{{ cloudDetails[item.songId]?.bitrate || item.bitrate || '-' }}</p>
                  <p class="mt-1">时长：{{ formatDuration(cloudDetails[item.songId]?.simpleSong?.dt || item.duration) }}</p>
                  <p class="mt-1">歌曲 ID：{{ cloudDetails[item.songId]?.songId || item.songId }}</p>
                </template>
              </div>
            </article>
          </div>

          <p v-else class="text-sm text-stone-500">云盘还没有歌曲。</p>

          <div class="mt-4 flex items-center justify-end gap-2 text-xs text-stone-600">
            <span class="mr-2">每页 10 首</span>
            <button
              class="rounded-full border border-stone-300 px-3 py-1 transition hover:bg-stone-100 disabled:opacity-40"
              type="button"
              :disabled="cloudPage <= 1 || cloudLoading"
              @click="prevCloudPage"
            >
              上一页
            </button>
            <span>第 {{ cloudPage }} 页</span>
            <button
              class="rounded-full border border-stone-300 px-3 py-1 transition hover:bg-stone-100 disabled:opacity-40"
              type="button"
              :disabled="!cloudCanNextPage || cloudLoading"
              @click="nextCloudPage"
            >
              下一页
            </button>
          </div>
        </template>
        </section>
      </transition>
    </main>

    <ModalRouterView content-width="90vw" content-height="90vh" content-radius="16px" />
  </div>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {useCounterStore} from '@/stores/userStores.js'
import {userApi} from '@/api/userApi/userApi.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'
import ModalRouterView from '@/components/modalRouterView/ModalRouterView.vue'

const router = useRouter()
const userStore = useCounterStore()

const loading = ref(true)
const error = ref('')
const activeTab = ref('playlist')

const profile = ref({
  userId: userStore.userId,
  nickname: userStore.nickname,
  avatarUrl: userStore.avatarUrl,
  follows: 0,
  followeds: 0,
  signature: '',
  description: '',
  province: null,
  city: null,
  authStatus: 0,
  userType: 0,
})

const level = ref({
  level: 0,
})

const playlists = ref([])
const cloudSongs = ref([])
const cloudLoading = ref(false)
const cloudError = ref('')
const cloudLimit = 10
const cloudPage = ref(1)
const cloudHasMore = ref(false)
const cloudDetailLoadingId = ref(null)
const cloudDeletingId = ref(null)
const cloudPlayingId = ref(null)
const cloudDetails = ref({})
const activeCloudDetailId = ref(null)
const cloudUploadFile = ref(null)
const cloudUploading = ref(false)
const cloudUploadMessage = ref('')
const cloudFileInputKey = ref(0)
const themeRgb = ref('214, 219, 228')
const animatedThemeRgb = ref(themeRgb.value)
const heroCanvasRef = ref(null)
let themeTweenFrame = 0
let heroCanvasFrame = 0
let heroCanvasTimeStart = 0
let heroResizeObserver = null

const liquidBlobs = [
  {x: 0.16, y: 0.2, r: 0.46, dx: 0.14, dy: 0.11, speed: 0.00044, phase: 0.2, alpha: 0.48},
  {x: 0.84, y: 0.3, r: 0.38, dx: 0.16, dy: 0.14, speed: 0.00037, phase: 1.4, alpha: 0.42},
  {x: 0.6, y: 0.8, r: 0.42, dx: 0.19, dy: 0.12, speed: 0.00033, phase: 2.4, alpha: 0.38},
]

const createdPlaylists = computed(() => playlists.value.filter(item => item.creator?.userId === profile.value.userId))
const subscribedPlaylists = computed(() => playlists.value.filter(item => item.creator?.userId !== profile.value.userId))
const cloudCanNextPage = computed(() => cloudHasMore.value)

const PROVINCE_NAME_MAP = {
  110000: '北京',
  120000: '天津',
  130000: '河北',
  140000: '山西',
  150000: '内蒙古',
  210000: '辽宁',
  220000: '吉林',
  230000: '黑龙江',
  310000: '上海',
  320000: '江苏',
  330000: '浙江',
  340000: '安徽',
  350000: '福建',
  360000: '江西',
  370000: '山东',
  410000: '河南',
  420000: '湖北',
  430000: '湖南',
  440000: '广东',
  450000: '广西',
  460000: '海南',
  500000: '重庆',
  510000: '四川',
  520000: '贵州',
  530000: '云南',
  540000: '西藏',
  610000: '陕西',
  620000: '甘肃',
  630000: '青海',
  640000: '宁夏',
  650000: '新疆',
  710000: '台湾',
  810000: '香港',
  820000: '澳门',
}

const CITY_NAME_MAP = {
  110100: '北京市',
  120100: '天津市',
  310100: '上海市',
  500100: '重庆市',
}

const certificationText = computed(() => {
  const isArtist = profile.value.userType === 4 || profile.value.authStatus === 1
  return isArtist ? '网易云音乐人认证' : '普通用户'
})

function resolveRegionName(regionCode, type = 'province') {
  const raw = Number(regionCode)
  if (!Number.isFinite(raw) || raw <= 0) {
    return regionCode ? String(regionCode) : ''
  }

  const normalized = Number(String(Math.trunc(raw)).padEnd(6, '0').slice(0, 6))
  if (type === 'city') {
    const cityName = CITY_NAME_MAP[normalized]
    if (cityName) return cityName
  }

  const provinceCode = Math.floor(normalized / 10000) * 10000
  return PROVINCE_NAME_MAP[provinceCode] || ''
}

const locationText = computed(() => {
  const provinceName = resolveRegionName(profile.value.province, 'province')
  const cityName = resolveRegionName(profile.value.city, 'city')

  if (!provinceName && !cityName) return '未设置'
  if (provinceName && cityName && provinceName !== cityName) {
    return `${provinceName} ${cityName}`
  }
  return provinceName || cityName
})

function buildLiquidPalette() {
  const [r, g, b] = parseRgb(animatedThemeRgb.value)
  const base = rgbToHsl(r, g, b)
  const c1 = hslToRgb(base.h - 12, clamp(base.s * 0.95 + 0.12, 0.38, 0.74), clamp(base.l - 0.05, 0.32, 0.54))
  const c2 = hslToRgb(base.h + 28, clamp(base.s * 0.82 + 0.12, 0.34, 0.64), clamp(base.l + 0.32, 0.72, 0.9))
  const c3 = hslToRgb(base.h + 2, clamp(base.s * 0.3 + 0.05, 0.12, 0.3), 0.94)
  return {c1, c2, c3}
}

function ensureHeroCanvasSize() {
  const canvas = heroCanvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const targetWidth = Math.round(width * dpr)
  const targetHeight = Math.round(height * dpr)

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth
    canvas.height = targetHeight
  }
}

function drawLiquidBackground(time) {
  const canvas = heroCanvasRef.value
  if (!canvas) return
  const context = canvas.getContext('2d')
  if (!context) return

  ensureHeroCanvasSize()

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = canvas.width / dpr
  const height = canvas.height / dpr
  if (width <= 0 || height <= 0) return

  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)

  const {c1, c2, c3} = buildLiquidPalette()

  const bg = context.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, 0.86)`)
  bg.addColorStop(1, `rgba(${c2[0]}, ${c2[1]}, ${c2[2]}, 0.95)`)
  context.fillStyle = bg
  context.fillRect(0, 0, width, height)

  context.save()
  context.filter = 'blur(22px)'
  context.globalCompositeOperation = 'screen'

  for (const blob of liquidBlobs) {
    const elapsed = (time - heroCanvasTimeStart) * blob.speed
    const x = width * (blob.x + Math.sin(elapsed + blob.phase) * blob.dx)
    const y = height * (blob.y + Math.cos(elapsed * 1.1 + blob.phase * 1.6) * blob.dy)
    const radius = Math.max(width, height) * (blob.r + Math.sin(elapsed * 1.8 + blob.phase) * 0.08)

    const gradient = context.createRadialGradient(x, y, radius * 0.12, x, y, radius)
    gradient.addColorStop(0, `rgba(${c3[0]}, ${c3[1]}, ${c3[2]}, ${blob.alpha * 1.08})`)
    gradient.addColorStop(0.46, `rgba(${c2[0]}, ${c2[1]}, ${c2[2]}, ${blob.alpha * 0.86})`)
    gradient.addColorStop(1, `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, 0)`)

    context.fillStyle = gradient
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  context.restore()

  const sheen = context.createRadialGradient(width * 0.2, height * 0.16, 8, width * 0.2, height * 0.16, Math.max(width, height) * 0.86)
  sheen.addColorStop(0, `rgba(${c3[0]}, ${c3[1]}, ${c3[2]}, 0.28)`)
  sheen.addColorStop(1, `rgba(${c3[0]}, ${c3[1]}, ${c3[2]}, 0)`)
  context.fillStyle = sheen
  context.fillRect(0, 0, width, height)
}

function renderHeroCanvasStatic() {
  const now = performance.now()
  heroCanvasTimeStart = now
  drawLiquidBackground(now)
}

function tickHeroCanvas(now) {
  drawLiquidBackground(now)
  heroCanvasFrame = requestAnimationFrame(tickHeroCanvas)
}

function startHeroCanvas() {
  stopHeroCanvas()
  renderHeroCanvasStatic()

  if (typeof requestAnimationFrame !== 'function') {
    return
  }

  const preferStatic = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (preferStatic) {
    return
  }

  heroCanvasTimeStart = performance.now()
  heroCanvasFrame = requestAnimationFrame(tickHeroCanvas)
}

function stopHeroCanvas() {
  if (!heroCanvasFrame) return
  cancelAnimationFrame(heroCanvasFrame)
  heroCanvasFrame = 0
}

function setupHeroCanvasObserver() {
  const canvas = heroCanvasRef.value
  if (!canvas || typeof ResizeObserver === 'undefined') return
  heroResizeObserver = new ResizeObserver(() => {
    renderHeroCanvasStatic()
  })
  heroResizeObserver.observe(canvas)
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3
}

function formatRgb(rgbArray) {
  return `${Math.round(rgbArray[0])}, ${Math.round(rgbArray[1])}, ${Math.round(rgbArray[2])}`
}

function animateThemeColor(nextRgb, {duration = 420} = {}) {
  const start = parseRgb(animatedThemeRgb.value)
  const end = parseRgb(nextRgb)

  if (themeTweenFrame) {
    cancelAnimationFrame(themeTweenFrame)
    themeTweenFrame = 0
  }

  const startedAt = performance.now()

  const tick = (now) => {
    const elapsed = now - startedAt
    const progress = Math.min(1, elapsed / duration)
    const eased = easeOutCubic(progress)

    animatedThemeRgb.value = formatRgb([
      start[0] + (end[0] - start[0]) * eased,
      start[1] + (end[1] - start[1]) * eased,
      start[2] + (end[2] - start[2]) * eased,
    ])

    if (progress < 1) {
      themeTweenFrame = requestAnimationFrame(tick)
    } else {
      themeTweenFrame = 0
    }
  }

  themeTweenFrame = requestAnimationFrame(tick)
}

function parseRgb(rgbString) {
  const parts = String(rgbString).split(',').map(v => Number(v.trim()))
  return [
    Number.isFinite(parts[0]) ? parts[0] : 214,
    Number.isFinite(parts[1]) ? parts[1] : 219,
    Number.isFinite(parts[2]) ? parts[2] : 228,
  ]
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function rgbToHsl(r, g, b) {
  const rn = clamp(r / 255, 0, 1)
  const gn = clamp(g / 255, 0, 1)
  const bn = clamp(b / 255, 0, 1)
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) {
    return {h: 0, s: 0, l}
  }

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let h = 0
  if (max === rn) {
    h = (gn - bn) / delta + (gn < bn ? 6 : 0)
  } else if (max === gn) {
    h = (bn - rn) / delta + 2
  } else {
    h = (rn - gn) / delta + 4
  }

  return {h: h * 60, s, l}
}

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360
  const sat = clamp(s, 0, 1)
  const lig = clamp(l, 0, 1)

  const c = (1 - Math.abs(2 * lig - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lig - c / 2

  let rn = 0
  let gn = 0
  let bn = 0

  if (hue < 60) {
    rn = c
    gn = x
  } else if (hue < 120) {
    rn = x
    gn = c
  } else if (hue < 180) {
    gn = c
    bn = x
  } else if (hue < 240) {
    gn = x
    bn = c
  } else if (hue < 300) {
    rn = x
    bn = c
  } else {
    rn = c
    bn = x
  }

  return [
    Math.round((rn + m) * 255),
    Math.round((gn + m) * 255),
    Math.round((bn + m) * 255),
  ]
}

function tuneThemeColor(rgb) {
  const [r, g, b] = rgb
  const hsl = rgbToHsl(r, g, b)
  const tunedS = clamp(hsl.s * 0.8 + 0.16, 0.26, 0.58)
  const tunedL = clamp(hsl.l * 0.74 + 0.2, 0.44, 0.66)
  return hslToRgb(hsl.h, tunedS, tunedL)
}

function colorFromSeed(seed) {
  const text = String(seed || 'profile')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  const saturation = 0.32 + (Math.abs(hash >> 6) % 20) / 100
  const lightness = 0.52 + (Math.abs(hash >> 12) % 12) / 100
  return formatRgb(hslToRgb(hue, saturation, lightness))
}

function pickDominantAvatarColor(data) {
  const bucketSize = 24
  const buckets = new Map()

  for (let i = 0; i < data.length; i += 16) {
    const alpha = data[i + 3] / 255
    if (alpha < 0.08) continue

    const pr = data[i]
    const pg = data[i + 1]
    const pb = data[i + 2]
    const hsl = rgbToHsl(pr, pg, pb)
    if (hsl.s < 0.1 || hsl.l < 0.08 || hsl.l > 0.92) continue

    const lightBalance = 1 - Math.abs(hsl.l - 0.56)
    const weight = alpha * (0.35 + hsl.s * 1.15 + lightBalance * 0.75)
    const key = `${Math.round(pr / bucketSize)}-${Math.round(pg / bucketSize)}-${Math.round(pb / bucketSize)}`
    const group = buckets.get(key) || {r: 0, g: 0, b: 0, score: 0}

    group.r += pr * weight
    group.g += pg * weight
    group.b += pb * weight
    group.score += weight

    buckets.set(key, group)
  }

  let picked = null
  for (const value of buckets.values()) {
    if (!picked || value.score > picked.score) picked = value
  }

  if (!picked || picked.score <= 0) return null

  return [
    Math.round(picked.r / picked.score),
    Math.round(picked.g / picked.score),
    Math.round(picked.b / picked.score),
  ]
}

async function pickAvatarTheme(avatarUrl, seed) {
  if (!avatarUrl) {
    themeRgb.value = colorFromSeed(seed)
    return
  }

  try {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.referrerPolicy = 'no-referrer'

    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
      image.src = avatarUrl
    })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', {willReadFrequently: true})
    if (!context) throw new Error('canvas unavailable')

    const size = 40
    canvas.width = size
    canvas.height = size
    context.drawImage(image, 0, 0, size, size)

    const {data} = context.getImageData(0, 0, size, size)
    const dominant = pickDominantAvatarColor(data)
    if (!dominant) throw new Error('no pixels')
    themeRgb.value = formatRgb(tuneThemeColor(dominant))
  } catch {
    themeRgb.value = colorFromSeed(seed)
  }
}

function formatCount(value) {
  const num = Number(value || 0)
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}亿`
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return String(num)
}

function goBack() {
  router.back()
}

function switchTab(tab) {
  activeTab.value = tab
}

function openPlaylist(item) {
  router.push({
    path: '/profile/playlistDetail',
    query: {id: item.id},
  })
}

function normalizeCloudSong(item = {}) {
  const simple = item.simpleSong || {}
  const ar = simple.ar || []
  const artists = ar.map(artist => artist?.name).filter(Boolean).join(' / ')
  return {
    songId: Number(item.songId || simple.id || item.id || 0),
    songName: item.songName || simple.name || item.fileName || '未知歌曲',
    artistName: item.artist || artists || '未知歌手',
    albumName: item.album || simple?.al?.name || '未知专辑',
    fileName: item.fileName || '',
    fileSize: Number(item.fileSize || 0),
    bitrate: Number(item.bitrate || 0),
    addTime: Number(item.addTime || 0),
    duration: Number(simple.dt || 0),
    coverUrl: simple?.al?.picUrl || '',
  }
}

function toCloudQueueItem(song) {
  const artistNames = String(song?.artistName || '')
    .split(' / ')
    .map(name => name.trim())
    .filter(Boolean)

  return {
    id: Number(song?.songId || 0),
    name: song?.songName || '未知歌曲',
    artists: artistNames.map(name => ({name})),
    cover: song?.coverUrl || '',
  }
}

function formatFileSize(size) {
  const value = Number(size || 0)
  if (value <= 0) return '-'
  if (value >= 1024 ** 3) return `${(value / (1024 ** 3)).toFixed(2)} GB`
  if (value >= 1024 ** 2) return `${(value / (1024 ** 2)).toFixed(2)} MB`
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${value} B`
}

function formatDateTime(timestamp) {
  const value = Number(timestamp || 0)
  if (!value) return '未知时间'
  const d = new Date(value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function formatDuration(durationMs) {
  const total = Math.floor(Number(durationMs || 0) / 1000)
  const minute = Math.floor(total / 60)
  const second = String(total % 60).padStart(2, '0')
  return `${minute}:${second}`
}

async function loadCloudSongs(page = 1) {
  if (!userStore.userId) return

  cloudLoading.value = true
  cloudError.value = ''
  try {
    const offset = (Math.max(1, page) - 1) * cloudLimit
    const res = await userApi.getUserCloud(cloudLimit, offset)
    const list = res?.data?.data || []
    cloudSongs.value = list.map(normalizeCloudSong)
    cloudPage.value = Math.max(1, page)
    cloudHasMore.value = Boolean(res?.data?.hasMore)
    if (!cloudSongs.value.length && cloudPage.value > 1) {
      await loadCloudSongs(cloudPage.value - 1)
    }
  } catch (err) {
    cloudError.value = err?.message || '云盘加载失败'
  } finally {
    cloudLoading.value = false
  }
}

async function prevCloudPage() {
  if (cloudPage.value <= 1) return
  await loadCloudSongs(cloudPage.value - 1)
}

async function nextCloudPage() {
  if (!cloudCanNextPage.value) return
  await loadCloudSongs(cloudPage.value + 1)
}

function onCloudFileChange(event) {
  const target = event?.target
  if (!(target instanceof HTMLInputElement)) return
  const file = target.files?.[0] || null
  cloudUploadFile.value = file
  cloudUploadMessage.value = file ? `已选择 ${file.name}` : ''
}

async function uploadCloudSong() {
  if (!cloudUploadFile.value || cloudUploading.value) return

  cloudUploading.value = true
  cloudUploadMessage.value = ''
  try {
    await userApi.uploadCloudSong(cloudUploadFile.value)
    cloudUploadMessage.value = '上传成功'
    cloudUploadFile.value = null
    cloudFileInputKey.value += 1
    await loadCloudSongs(1)
  } catch (err) {
    cloudUploadMessage.value = err?.message || '上传失败'
  } finally {
    cloudUploading.value = false
  }
}

async function toggleCloudDetail(item) {
  const sid = Number(item?.songId || 0)
  if (!sid) return

  if (activeCloudDetailId.value === sid) {
    activeCloudDetailId.value = null
    return
  }

  activeCloudDetailId.value = sid
  if (cloudDetails.value[sid]) return

  cloudDetailLoadingId.value = sid
  try {
    const res = await userApi.getUserCloudDetail(String(sid))
    const detail = (res?.data?.data || [])[0] || null
    cloudDetails.value = {
      ...cloudDetails.value,
      [sid]: detail,
    }
  } catch {
    cloudDetails.value = {
      ...cloudDetails.value,
      [sid]: null,
    }
  } finally {
    cloudDetailLoadingId.value = null
  }
}

async function deleteCloudSong(item) {
  const sid = Number(item?.songId || 0)
  if (!sid || cloudDeletingId.value) return
  if (!window.confirm(`确定删除云盘歌曲《${item.songName}》吗？`)) return

  cloudDeletingId.value = sid
  try {
    await userApi.deleteUserCloudSong(String(sid))
    await loadCloudSongs(cloudPage.value)
  } catch (err) {
    cloudError.value = err?.message || '云盘歌曲删除失败'
  } finally {
    cloudDeletingId.value = null
  }
}

async function playCloudSong(item) {
  const sid = Number(item?.songId || 0)
  if (!sid || cloudPlayingId.value === sid) return

  cloudPlayingId.value = sid
  cloudError.value = ''
  try {
    const queue = cloudSongs.value.map(toCloudQueueItem).filter(song => song.id > 0)
    const queueIndex = Math.max(0, queue.findIndex(song => song.id === sid))
    const ok = await playSongWithQueue(toCloudQueueItem(item), queue, queueIndex)
    if (!ok) {
      cloudError.value = '当前云盘歌曲暂时无法播放'
    }
  } finally {
    cloudPlayingId.value = null
  }
}

async function loadProfilePage() {
  if (!userStore.userId) {
    error.value = '请先登录再查看个人中心'
    loading.value = false
    return
  }

  try {
    const [detailRes, levelRes, playlistRes] = await Promise.all([
      userApi.getUserDetail(userStore.userId),
      userApi.getUserLevel(),
      userApi.getUserPlaylist(userStore.userId, 40, 0),
    ])

    const detailProfile = detailRes?.data?.profile || {}
    profile.value = {
      userId: detailProfile.userId || userStore.userId,
      nickname: detailProfile.nickname || userStore.nickname,
      avatarUrl: detailProfile.avatarUrl || userStore.avatarUrl,
      follows: detailProfile.follows || 0,
      followeds: detailProfile.followeds || 0,
      signature: detailProfile.signature || '',
      description: detailProfile.description || '',
      province: detailProfile.province || null,
      city: detailProfile.city || null,
      authStatus: detailProfile.authStatus || 0,
      userType: detailProfile.userType || 0,
    }

    await pickAvatarTheme(profile.value.avatarUrl, profile.value.nickname)

    userStore.setProfile({
      userId: profile.value.userId,
      nickname: profile.value.nickname,
      avatarUrl: profile.value.avatarUrl,
    })

    level.value = {
      level: levelRes?.data?.data?.level || 0,
    }

    playlists.value = playlistRes?.data?.playlist || []
    await loadCloudSongs(1)
  } catch (err) {
    error.value = err?.message || '个人中心加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await nextTick()
  ensureHeroCanvasSize()
  setupHeroCanvasObserver()
  startHeroCanvas()
  loadProfilePage()
})

onBeforeUnmount(() => {
  if (themeTweenFrame) {
    cancelAnimationFrame(themeTweenFrame)
    themeTweenFrame = 0
  }
  stopHeroCanvas()
  if (heroResizeObserver) {
    heroResizeObserver.disconnect()
    heroResizeObserver = null
  }
})

watch(
  themeRgb,
  (nextValue, prevValue) => {
    if (!prevValue || prevValue === nextValue) {
      animatedThemeRgb.value = nextValue
      return
    }
    animateThemeColor(nextValue)
  },
  {immediate: true},
)

watch(
  animatedThemeRgb,
  () => {
    if (!heroCanvasFrame) {
      renderHeroCanvasStatic()
    }
  },
)
</script>

<style scoped>
.profile-hero-flow {
  z-index: 0;
  background: transparent;
}

.profile-hero-canvas {
  z-index: 1;
  pointer-events: none;
  opacity: 0.96;
  display: block;
  width: 100%;
  height: 100%;
}

.profile-kpi-pill {
  transition: transform 220ms ease, box-shadow 220ms ease;
  animation: kpi-rise 360ms ease both;
}

.profile-kpi-pill:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(28, 25, 23, 0.08);
}

@keyframes kpi-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tab-panel-enter-active,
.tab-panel-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.tab-panel-enter-from,
.tab-panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
