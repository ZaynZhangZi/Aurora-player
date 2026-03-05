<template>
  <div class="min-h-screen bg-stone-100 text-stone-900">
    <section class="relative overflow-hidden border-b border-stone-200 bg-white">
      <div class="absolute inset-0" :style="heroStyle" />
      <div class="relative mx-auto max-w-7xl px-4 py-10 sm:px-8">
        <div class="mb-4 flex justify-end">
          <button
            class="rounded-full border border-stone-300 bg-white/90 px-4 py-1.5 text-sm transition hover:bg-white"
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
            class="h-32 w-32 rounded-3xl border border-white/70 object-cover shadow-lg"
          />

          <div>
            <p class="text-xs uppercase tracking-[0.22em] text-stone-500">Personal Center</p>
            <h1 class="mt-2 text-4xl font-black leading-tight">{{ profile.nickname || '我的主页' }}</h1>

            <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span class="rounded-full border border-stone-300 bg-white/85 px-3 py-1">UID {{ profile.userId || '-' }}</span>
              <span class="rounded-full border border-stone-300 bg-white/85 px-3 py-1">{{ certificationText }}</span>
              <span class="rounded-full border border-stone-300 bg-white/85 px-3 py-1">地区 {{ locationText }}</span>
            </div>

            <p class="mt-4 max-w-3xl rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm leading-relaxed text-stone-700">
              {{ profile.signature || profile.description || '这个人很神秘，还没有留下简介。' }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <section class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p class="text-xs text-stone-500">歌单</p>
          <p class="mt-2 text-2xl font-bold">{{ formatCount(subCount.playlistCount) }}</p>
        </article>
        <article class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p class="text-xs text-stone-500">关注</p>
          <p class="mt-2 text-2xl font-bold">{{ formatCount(profile.follows) }}</p>
        </article>
        <article class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p class="text-xs text-stone-500">粉丝</p>
          <p class="mt-2 text-2xl font-bold">{{ formatCount(profile.followeds) }}</p>
        </article>
        <article class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p class="text-xs text-stone-500">等级</p>
          <p class="mt-2 text-2xl font-bold">Lv.{{ level.level || 0 }}</p>
        </article>
      </section>

      <section class="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
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
                class="group flex cursor-pointer gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-3 transition hover:border-stone-300 hover:bg-white"
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
                class="group flex cursor-pointer gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-3 transition hover:border-stone-300 hover:bg-white"
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

      <section class="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
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
              class="rounded-2xl border border-stone-100 bg-stone-50 p-3"
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
                    @click="toggleCloudDetail(item)"
                  >
                    {{ activeCloudDetailId === item.songId ? '收起详情' : '云盘数据详情' }}
                  </button>
                  <button
                    class="rounded-full border border-red-300 bg-white px-3 py-1 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                    type="button"
                    :disabled="cloudDeletingId === item.songId"
                    @click="deleteCloudSong(item)"
                  >
                    {{ cloudDeletingId === item.songId ? '删除中...' : '云盘歌曲删除' }}
                  </button>
                </div>
              </div>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <input
                  v-model.trim="cloudMatchInputs[item.songId]"
                  type="number"
                  min="0"
                  inputmode="numeric"
                  placeholder="填写 asid"
                  class="w-32 rounded-full border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 outline-none transition focus:border-stone-500"
                />
                <button
                  class="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs transition hover:bg-stone-100 disabled:opacity-40"
                  type="button"
                  :disabled="cloudMatchLoadingId === item.songId"
                  @click="correctCloudSongMatch(item)"
                >
                  歌曲信息匹配纠正
                </button>
                <button
                  class="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs transition hover:bg-stone-100 disabled:opacity-40"
                  type="button"
                  :disabled="cloudMatchLoadingId === item.songId"
                  @click="correctCloudSongMatch(item, 0)"
                >
                  取消匹配
                </button>
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
    </main>

    <ModalRouterView content-width="90vw" content-height="90vh" content-radius="16px" />
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {useCounterStore} from '@/stores/userStores.js'
import {userApi} from '@/api/userApi/userApi.js'
import ModalRouterView from '@/components/modalRouterView/ModalRouterView.vue'

const router = useRouter()
const userStore = useCounterStore()

const loading = ref(true)
const error = ref('')

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

const subCount = ref({
  playlistCount: 0,
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
const cloudMatchLoadingId = ref(null)
const cloudDetails = ref({})
const activeCloudDetailId = ref(null)
const cloudMatchInputs = ref({})
const cloudUploadFile = ref(null)
const cloudUploading = ref(false)
const cloudUploadMessage = ref('')
const cloudFileInputKey = ref(0)
const themeRgb = ref('214, 219, 228')
const animatedThemeRgb = ref(themeRgb.value)
let themeTweenFrame = 0

const createdPlaylists = computed(() => playlists.value.filter(item => item.creator?.userId === profile.value.userId))
const subscribedPlaylists = computed(() => playlists.value.filter(item => item.creator?.userId !== profile.value.userId))
const cloudCanNextPage = computed(() => cloudHasMore.value)

const certificationText = computed(() => {
  const isArtist = profile.value.userType === 4 || profile.value.authStatus === 1
  return isArtist ? '网易云音乐人认证' : '普通用户'
})

const locationText = computed(() => {
  if (!profile.value.province && !profile.value.city) return '未设置'
  if (profile.value.province && profile.value.city) {
    return `${profile.value.province}-${profile.value.city}`
  }
  return String(profile.value.province || profile.value.city)
})

const heroStyle = computed(() => {
  const [r, g, b] = parseRgb(animatedThemeRgb.value)
  const softR = Math.min(255, Math.round((r + 245) / 2))
  const softG = Math.min(255, Math.round((g + 245) / 2))
  const softB = Math.min(255, Math.round((b + 245) / 2))
  return {
    background: `linear-gradient(135deg, rgba(${r},${g},${b},0.60), rgba(${softR},${softG},${softB},0.88))`,
  }
})

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

function colorFromSeed(seed) {
  const text = String(seed || 'profile')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
  }
  const r = 140 + (Math.abs(hash) % 70)
  const g = 150 + (Math.abs(hash >> 8) % 70)
  const b = 165 + (Math.abs(hash >> 16) % 70)
  return `${r}, ${g}, ${b}`
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
    let r = 0
    let g = 0
    let b = 0
    let count = 0

    for (let i = 0; i < data.length; i += 16) {
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      count += 1
    }

    if (!count) throw new Error('no pixels')

    themeRgb.value = `${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}`
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

async function correctCloudSongMatch(item, forcedAsid = null) {
  const sid = Number(item?.songId || 0)
  if (!sid || cloudMatchLoadingId.value) return

  const raw = forcedAsid ?? cloudMatchInputs.value[sid]
  const asid = Number(raw)
  if (!Number.isFinite(asid) || asid < 0) {
    cloudError.value = '请输入合法 asid（0 或 正整数）'
    return
  }

  cloudMatchLoadingId.value = sid
  try {
    await userApi.correctCloudSongMatch(profile.value.userId, sid, asid)
    cloudError.value = ''
    cloudDetails.value = {
      ...cloudDetails.value,
      [sid]: null,
    }
    if (activeCloudDetailId.value === sid) {
      cloudDetailLoadingId.value = sid
      const detailRes = await userApi.getUserCloudDetail(String(sid))
      const detail = (detailRes?.data?.data || [])[0] || null
      cloudDetails.value = {
        ...cloudDetails.value,
        [sid]: detail,
      }
      cloudDetailLoadingId.value = null
    }
  } catch (err) {
    cloudError.value = err?.message || '云盘歌曲信息匹配纠正失败'
  } finally {
    if (cloudDetailLoadingId.value === sid) {
      cloudDetailLoadingId.value = null
    }
    cloudMatchLoadingId.value = null
  }
}

async function loadProfilePage() {
  if (!userStore.userId) {
    error.value = '请先登录再查看个人中心'
    loading.value = false
    return
  }

  try {
    const [detailRes, subRes, levelRes, playlistRes] = await Promise.all([
      userApi.getUserDetail(userStore.userId),
      userApi.getUserSubCount(),
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

    subCount.value = {
      playlistCount: subRes?.data?.createdPlaylistCount || subRes?.data?.playlistCount || 0,
    }

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

onMounted(() => {
  loadProfilePage()
})

onBeforeUnmount(() => {
  if (themeTweenFrame) {
    cancelAnimationFrame(themeTweenFrame)
    themeTweenFrame = 0
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
</script>
