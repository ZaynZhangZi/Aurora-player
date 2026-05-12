<template>
  <div class="min-h-screen bg-[#FAFAFA] text-stone-900 selection:bg-stone-900 selection:text-white">
    <section class="relative overflow-hidden pt-16 pb-12 sm:pt-24 sm:pb-20">
      <div class="profile-hero-flow absolute inset-0" />
      <canvas ref="heroCanvasRef" class="profile-hero-canvas absolute inset-0 mix-blend-multiply opacity-60" />

      <div class="absolute inset-0 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/60 to-transparent z-10" />

      <div class="relative z-20 mx-auto max-w-5xl px-6 sm:px-10">
        <div class="flex flex-col items-center text-center md:flex-row md:text-left md:gap-10">
          <div class="relative group shrink-0 mb-6 md:mb-0">
            <div class="absolute -inset-4 rounded-full bg-white/20 blur-2xl transition-all duration-700 group-hover:bg-white/40" />
            <img
              v-if="profile.avatarUrl"
              :src="profile.avatarUrl"
              alt="avatar"
              class="relative z-10 h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-white/60 object-cover shadow-[0_16px_40px_rgba(0,0,0,0.12)] transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          <div class="flex-1">
            <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500">Personal Center</p>
            <h1 class="mt-1 text-4xl font-black tracking-tight text-stone-900 sm:text-5xl md:text-6xl">{{ profile.nickname || '我的主页' }}</h1>

            <div class="mt-5 flex flex-wrap justify-center md:justify-start items-center gap-2 text-xs font-bold text-stone-700">
              <span class="rounded-full bg-white/60 backdrop-blur-md px-3.5 py-1.5 shadow-sm ring-1 ring-stone-900/5">UID {{ profile.userId || '-' }}</span>
              <span class="rounded-full bg-white/60 backdrop-blur-md px-3.5 py-1.5 shadow-sm ring-1 ring-stone-900/5">{{ certificationText }}</span>
              <span class="rounded-full bg-white/60 backdrop-blur-md px-3.5 py-1.5 shadow-sm ring-1 ring-stone-900/5">{{ locationText }}</span>
            </div>

            <div class="mt-3 flex flex-wrap justify-center md:justify-start items-center gap-2 text-xs font-bold text-stone-700">
              <span class="profile-kpi-pill rounded-full bg-stone-900 text-white px-4 py-1.5 shadow-md">关注 {{ formatCount(profile.follows) }}</span>
              <span class="profile-kpi-pill rounded-full bg-white/60 backdrop-blur-md px-4 py-1.5 shadow-sm ring-1 ring-stone-900/5">粉丝 {{ formatCount(profile.followeds) }}</span>
              <span class="profile-kpi-pill rounded-full bg-white/60 backdrop-blur-md px-4 py-1.5 shadow-sm ring-1 ring-stone-900/5">等级 Lv.{{ level.level || 0 }}</span>
            </div>

            <p class="mt-5 max-w-2xl text-sm font-medium leading-relaxed text-stone-600 opacity-90">
              {{ profile.signature || profile.description || '这个人很神秘，还没有留下简介。' }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <main class="relative z-30 mx-auto max-w-5xl px-6 pb-24 sm:px-10">

      <section class="mb-12 flex justify-center">
        <div class="inline-flex items-center rounded-full bg-stone-200/50 p-1.5 backdrop-blur-md shadow-inner">
          <button
            class="rounded-full px-6 py-2 text-sm font-bold transition-all duration-300"
            :class="activeTab === 'playlist' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'"
            type="button"
            @click="switchTab('playlist')"
          >
            歌单总览
          </button>
          <button
            class="rounded-full px-6 py-2 text-sm font-bold transition-all duration-300"
            :class="activeTab === 'cloud' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'"
            type="button"
            @click="switchTab('cloud')"
          >
            云盘管理
          </button>
          <button
            class="rounded-full px-6 py-2 text-sm font-bold transition-all duration-300"
            :class="activeTab === 'listening' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'"
            type="button"
            @click="switchTab('listening')"
          >
            听歌画像
          </button>
        </div>
      </section>

      <transition name="tab-panel" mode="out-in">

        <section v-if="activeTab === 'playlist'" key="playlist" class="w-full">
          <div class="mb-8 flex items-end justify-between">
            <h2 class="text-3xl font-bold tracking-tight text-stone-900">我的歌单</h2>
            <span class="text-xs font-bold text-stone-500">创建 {{ createdPlaylists.length }} · 收藏 {{ subscribedPlaylists.length }}</span>
          </div>

          <p v-if="loading" class="animate-pulse text-sm font-medium text-stone-500">加载中...</p>
          <p v-else-if="error" class="text-sm font-medium text-red-500">{{ error }}</p>

          <template v-else>
            <div class="mb-12">
              <h3 class="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">我创建的</h3>
              <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <article
                  v-for="item in createdPlaylists"
                  :key="`created-${item.id}`"
                  class="group flex cursor-pointer items-center gap-5 rounded-[24px] bg-white p-3 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)]"
                  @click="openPlaylist(item)"
                >
                  <div class="h-24 w-24 shrink-0 overflow-hidden rounded-[16px] shadow-sm">
                    <img :src="item.coverImgUrl" alt="playlist" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <div class="min-w-0 flex-1 pr-4">
                    <p class="truncate text-base font-bold text-stone-900">{{ item.name }}</p>
                    <p class="mt-1 text-xs font-medium text-stone-500">{{ item.trackCount || 0 }} 首音乐</p>
                    <p class="mt-2 line-clamp-1 text-xs font-medium text-stone-400">{{ item.description || '暂无简介' }}</p>
                  </div>
                </article>
              </div>
              <p v-if="!createdPlaylists.length" class="mt-4 text-sm font-medium text-stone-500">还没有创建歌单。</p>
            </div>

            <div>
              <h3 class="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">我收藏的</h3>
              <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <article
                  v-for="item in subscribedPlaylists"
                  :key="`sub-${item.id}`"
                  class="group flex cursor-pointer items-center gap-4 rounded-[20px] bg-white/60 p-2.5 shadow-sm ring-1 ring-stone-900/5 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md"
                  @click="openPlaylist(item)"
                >
                  <div class="h-16 w-16 shrink-0 overflow-hidden rounded-[12px]">
                    <img :src="item.coverImgUrl" alt="playlist" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <div class="min-w-0 flex-1 pr-4">
                    <p class="truncate text-sm font-bold text-stone-900">{{ item.name }}</p>
                    <p class="mt-0.5 text-xs font-medium text-stone-500">{{ item.trackCount || 0 }} 首音乐</p>
                  </div>
                </article>
              </div>
              <p v-if="!subscribedPlaylists.length" class="mt-4 text-sm font-medium text-stone-500">还没有收藏歌单。</p>
            </div>
          </template>
        </section>

        <section v-else-if="activeTab === 'cloud'" key="cloud" class="w-full">
          <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 class="text-3xl font-bold tracking-tight text-stone-900">音乐云盘</h2>
            <button
              class="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-sm ring-1 ring-stone-900/5 transition hover:bg-stone-50 hover:text-stone-900 disabled:opacity-50"
              type="button"
              :disabled="cloudLoading"
              @click="loadCloudSongs(cloudPage)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              刷新状态
            </button>
          </div>

          <div class="mb-10 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-stone-300 bg-stone-100/50 p-8 text-center transition-colors hover:border-stone-400 hover:bg-stone-100">
            <div class="mb-3 rounded-full bg-stone-200/50 p-3 text-stone-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <p class="text-sm font-bold text-stone-900">将本地音乐上传至云盘</p>
            <p class="mt-1 text-xs font-medium text-stone-500">支持 mp3, flac, wav, m4a, aac 格式</p>

            <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
              <label class="cursor-pointer rounded-full bg-stone-900 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-black hover:shadow-lg">
                选择文件
                <input
                  :key="cloudFileInputKey"
                  type="file"
                  accept=".mp3,.flac,.wav,.m4a,.aac"
                  class="hidden"
                  @change="onCloudFileChange"
                />
              </label>

              <button
                v-if="cloudUploadFile"
                class="rounded-full bg-white px-6 py-2.5 text-xs font-bold text-stone-800 shadow-sm ring-1 ring-stone-900/10 transition hover:bg-stone-50 disabled:opacity-50"
                type="button"
                :disabled="cloudUploading"
                @click="uploadCloudSong"
              >
                {{ cloudUploading ? '正在上传...' : '开始上传' }}
              </button>
            </div>
            <p v-if="cloudUploadMessage" class="mt-4 text-xs font-bold text-emerald-600">{{ cloudUploadMessage }}</p>
          </div>

          <p v-if="cloudLoading" class="animate-pulse text-sm font-medium text-stone-500">云盘加载中...</p>
          <p v-else-if="cloudError" class="text-sm font-medium text-red-500">{{ cloudError }}</p>

          <template v-else>
            <div v-if="cloudSongs.length" class="space-y-1">
              <article
                v-for="(item, index) in cloudSongs"
                :key="`cloud-${item.songId}`"
                class="group flex flex-col rounded-xl px-4 py-3 transition-colors hover:bg-white hover:shadow-sm"
              >
                <div class="flex items-center justify-between gap-4 cursor-pointer" @click="playCloudSong(item)">
                  <div class="flex items-center gap-4 min-w-0">
                    <div class="flex w-6 justify-center text-xs font-bold text-stone-400 group-hover:text-stone-900">
                      <span class="group-hover:hidden">{{ index + 1 + (cloudPage - 1) * cloudLimit }}</span>
                      <svg class="hidden group-hover:block" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-bold text-stone-900">{{ item.songName }}</p>
                      <p class="mt-0.5 truncate text-xs font-medium text-stone-500">{{ item.artistName }} · {{ item.albumName }}</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-6 shrink-0">
                    <span class="hidden text-xs font-medium text-stone-400 sm:block">{{ formatFileSize(item.fileSize) }}</span>
                    <span class="hidden text-xs font-medium text-stone-400 sm:block">{{ formatDateTime(item.addTime).split(' ')[0] }}</span>

                    <div class="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        class="rounded-full bg-white p-2 text-stone-500 shadow-sm ring-1 ring-stone-900/5 transition hover:text-stone-900 hover:bg-stone-50"
                        title="查看详情"
                        @click.stop="toggleCloudDetail(item)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      </button>
                      <button
                        class="rounded-full bg-white p-2 text-red-500 shadow-sm ring-1 ring-stone-900/5 transition hover:text-red-700 hover:bg-red-50"
                        title="删除歌曲"
                        @click.stop="deleteCloudSong(item)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="activeCloudDetailId === item.songId" class="mt-3 ml-10 rounded-xl bg-stone-100/60 p-4 text-xs font-medium text-stone-600 cursor-default">
                  <p v-if="cloudDetailLoadingId === item.songId" class="animate-pulse">数据加载中...</p>
                  <div v-else class="grid grid-cols-2 gap-y-2">
                    <p><span class="text-stone-400 mr-2">文件名</span> {{ cloudDetails[item.songId]?.fileName || item.fileName || '-' }}</p>
                    <p><span class="text-stone-400 mr-2">比特率</span> {{ cloudDetails[item.songId]?.bitrate || item.bitrate || '-' }} kbps</p>
                    <p><span class="text-stone-400 mr-2">音乐时长</span> {{ formatDuration(cloudDetails[item.songId]?.simpleSong?.dt || item.duration) }}</p>
                    <p><span class="text-stone-400 mr-2">平台 ID</span> {{ cloudDetails[item.songId]?.songId || item.songId }}</p>
                  </div>
                </div>
              </article>
            </div>
            <p v-else class="text-sm font-medium text-stone-500">云盘还没有歌曲。</p>

            <div class="mt-8 flex items-center justify-end gap-4 text-sm">
              <span class="text-xs font-medium text-stone-400">Page {{ cloudPage }}</span>
              <div class="flex items-center gap-2">
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm ring-1 ring-stone-900/5 transition hover:bg-stone-50 disabled:opacity-40"
                  type="button"
                  :disabled="cloudPage <= 1 || cloudLoading"
                  @click="prevCloudPage"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm ring-1 ring-stone-900/5 transition hover:bg-stone-50 disabled:opacity-40"
                  type="button"
                  :disabled="!cloudCanNextPage || cloudLoading"
                  @click="nextCloudPage"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </div>
          </template>
        </section>

        <section v-else-if="activeTab === 'listening'" key="listening" class="w-full">
          <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 class="text-3xl font-bold tracking-tight text-stone-900">听歌画像</h2>
            <div class="inline-flex rounded-full bg-stone-200/50 p-1">
              <button
                class="rounded-full px-5 py-1.5 text-xs font-bold transition-all"
                :class="listeningRange === 'week' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'"
                type="button"
                @click="setListeningRange('week')"
              >本周</button>
              <button
                class="rounded-full px-5 py-1.5 text-xs font-bold transition-all"
                :class="listeningRange === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'"
                type="button"
                @click="setListeningRange('all')"
              >全时段</button>
            </div>
          </div>

          <p v-if="listeningLoading" class="animate-pulse text-sm font-medium text-stone-500">正在分析你的听歌分布...</p>
          <p v-else-if="listeningError" class="text-sm font-medium text-red-500">{{ listeningError }}</p>

          <div v-else class="flex flex-col gap-8">
            <div class="listening-gradient-stage listening-gradient-stage-large shadow-[0_24px_50px_rgba(0,0,0,0.1)]" :style="listeningMeshStyle">
              <div class="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-white/20" />
              <div
                v-if="!listeningBuckets.length"
                class="absolute bottom-6 left-6 rounded-2xl bg-black/30 backdrop-blur-md px-5 py-3 text-xs font-medium text-white/90 ring-1 ring-white/10"
              >
                暂无可分析的听歌记录，先播放几首歌再回来看看。
              </div>
            </div>

            <div v-if="listeningBuckets.length" class="flex flex-wrap items-center justify-center gap-3 pt-4">
              <span
                v-for="item in listeningBuckets.slice(0, 5)"
                :key="item.key"
                class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-sm ring-1 ring-stone-900/5 transition-transform hover:scale-105"
              >
                <span class="inline-block h-2.5 w-2.5 rounded-full shadow-inner" :style="{ backgroundColor: item.color }" />
                {{ item.label }}
                <span class="text-stone-400 ml-1">{{ item.percent }}%</span>
              </span>
            </div>
            <p v-else class="text-center text-xs font-medium text-stone-400">当前暂无分布标签，系统会在有足够播放记录后自动生成。</p>
          </div>
        </section>
      </transition>
    </main>

    <ModalRouterView content-width="90vw" content-height="90vh" content-radius="24px" />
  </div>
</template>

<script setup>
defineOptions({ name: 'profile' })
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import { markNavigatingBack } from '@/router/index.js'
import chroma from 'chroma-js'
import {useCounterStore} from '@/stores/userStores.js'
import {userApi} from '@/api/userApi/userApi.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'
import {reportApi} from '@/api/reportApi/reportApi.js'
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
const listeningLoading = ref(false)
const listeningError = ref('')
const listeningRange = ref('week')
const listeningRecords = ref({week: [], all: []})
const listeningBuckets = ref([])
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

const LISTENING_BUCKET_META = {
  mellow: {label: '轻松治愈', color: '#F59E0B'},
  rhythm: {label: '节奏律动', color: '#3B82F6'},
  pop: {label: '流行热歌', color: '#22C55E'},
  electronic: {label: '电子/派对', color: '#A855F7'},
  travel: {label: '旅行公路', color: '#EAB308'},
  power: {label: '运动燃系', color: '#EF4444'},
  other: {label: '其他', color: '#06B6D4'},
}

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

function getListeningPaletteVectors() {
  if (!listeningBuckets.value.length) {
    return [
      {color: '#3B82F6', weight: 0.4},
      {color: '#A855F7', weight: 0.34},
      {color: '#22C55E', weight: 0.26},
    ]
  }

  const top = listeningBuckets.value.slice(0, 5)
  const sum = top.reduce((acc, item) => acc + item.percent, 0) || 1
  return top.map((item) => ({
    color: item.color,
    weight: item.percent / sum,
  }))
}

function frac(v) {
  return v - Math.floor(v)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

function hash2(x, y, seed = 0) {
  const n = x * 127.1 + y * 311.7 + seed * 74.7
  return frac(Math.sin(n) * 43758.5453123)
}

function valueNoise2D(x, y, seed = 0) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const xf = x - x0
  const yf = y - y0

  const n00 = hash2(x0, y0, seed)
  const n10 = hash2(x0 + 1, y0, seed)
  const n01 = hash2(x0, y0 + 1, seed)
  const n11 = hash2(x0 + 1, y0 + 1, seed)

  const u = smoothstep(xf)
  const v = smoothstep(yf)

  const nx0 = lerp(n00, n10, u)
  const nx1 = lerp(n01, n11, u)
  return lerp(nx0, nx1, v)
}

const listeningMeshStyle = computed(() => {
  const vectors = getListeningPaletteVectors()
  const weightSum = vectors.reduce((acc, item) => acc + item.weight, 0) || 1
  const normalizedWeights = vectors.map((item) => item.weight / weightSum)
  const lchBase = chroma.average(vectors.map(item => item.color), 'lch', normalizedWeights)
  const baseBright = lchBase.brighten(0.65).saturate(0.72)
  const baseDeep = lchBase.darken(0.78).saturate(0.18)

  const meshStops = []
  const meshCount = Math.max(6, vectors.length * 2)
  for (let i = 0; i < meshCount; i += 1) {
    const a = vectors[i % vectors.length]
    const b = vectors[(i + 1) % vectors.length]
    const noiseA = valueNoise2D(i * 0.87, 1.13, 11)
    const noiseB = valueNoise2D(i * 1.13, 2.07, 29)
    const blendT = 0.2 + noiseA * 0.58
    const mixed = chroma.mix(a.color, b.color, blendT, 'lch').saturate(0.9).brighten(0.2)
    const px = 8 + noiseA * 84
    const py = 8 + noiseB * 84
    const r = 18 + (a.weight + b.weight) * 34
    meshStops.push(`radial-gradient(circle at ${px.toFixed(2)}% ${py.toFixed(2)}%, ${mixed.alpha(0.62).css()} 0%, ${mixed.alpha(0.18).css()} ${r.toFixed(2)}%, ${mixed.alpha(0).css()} ${(r + 20).toFixed(2)}%)`)
  }

  const baseLayer = `linear-gradient(135deg, ${baseBright.alpha(0.96).css()} 0%, ${baseDeep.alpha(0.96).css()} 100%)`
  return {
    background: [
      ...meshStops,
      baseLayer,
    ].join(', '),
  }
})

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

function normalizeText(value) {
  return String(value || '').toLowerCase().trim()
}

function detectListeningBucket(record) {
  const song = record?.song || {}
  const title = normalizeText(song?.name)
  const album = normalizeText(song?.al?.name)
  const artists = (song?.ar || []).map(item => normalizeText(item?.name)).join(' ')
  const merged = `${title} ${album} ${artists}`

  const isPureMusic = merged.includes('纯音乐') || merged.includes('instrumental') || merged.includes('piano') || merged.includes('钢琴')
  const isElectronic = /(edm|house|techno|electro|trance|dubstep|remix|dj|电子|电音)/.test(merged)
  const isPower = /(workout|fitness|gym|运动|燃|battle|hardstyle|metal|摇滚|rock|punk|说唱|rap|hiphop)/.test(merged)
  const isTravel = /(旅行|公路|road|trip|sunset|city pop|citypop|民谣|folk|camp)/.test(merged)
  const isRhythm = /(dance|funk|r&b|rb|节奏|律动|groove|swing|city)/.test(merged)
  const isMellow = /(治愈|晚安|sleep|lofi|chill|ambient|study|学习|雨声|轻音乐)/.test(merged)

  if (isPureMusic || isMellow) return 'mellow'
  if (isElectronic) return 'electronic'
  if (isPower) return 'power'
  if (isTravel) return 'travel'
  if (isRhythm) return 'rhythm'

  const hasKana = /[\u3040-\u30ff]/.test(merged)
  const hasHangul = /[\uac00-\ud7af]/.test(merged)
  const hasCjk = /[\u4e00-\u9fff]/.test(merged)
  const hasLatin = /[a-z]/.test(merged)

  if (hasKana || hasHangul) return 'rhythm'
  if (hasCjk && !hasLatin) return 'pop'
  if (hasLatin && !hasCjk) return 'travel'
  if (hasLatin && hasCjk) return 'pop'

  return 'other'
}

function buildListeningProfile(records = []) {
  const bucketWeight = {
    mellow: 0,
    rhythm: 0,
    pop: 0,
    electronic: 0,
    travel: 0,
    power: 0,
    other: 0,
  }

  let total = 0
  for (const item of records) {
    const weight = Number(item?.playCount || item?.score || 1)
    if (!Number.isFinite(weight) || weight <= 0) continue
    const bucket = detectListeningBucket(item)
    bucketWeight[bucket] += weight
    total += weight
  }

  if (!total) {
    listeningBuckets.value = []
    return
  }

  const sorted = Object.entries(bucketWeight)
    .map(([key, weight]) => {
      const meta = LISTENING_BUCKET_META[key]
      return {
        key,
        label: meta.label,
        color: meta.color,
        weight,
        percent: Number(((weight / total) * 100).toFixed(1)),
      }
    })
    .filter(item => item.weight > 0)
    .sort((a, b) => b.weight - a.weight)

  let remains = 100
  const normalized = sorted.map((item, index) => {
    if (index === sorted.length - 1) {
      return {...item, percent: Number(remains.toFixed(1))}
    }
    const next = Math.min(remains, Math.max(0, item.percent))
    remains -= next
    return {...item, percent: Number(next.toFixed(1))}
  })

  listeningBuckets.value = normalized
}

async function ensureListeningRecords(type) {
  if (!userStore.userId) return []
  if (listeningRecords.value[type]?.length) {
    return listeningRecords.value[type]
  }

  const apiType = type === 'week' ? 1 : 0
  const res = await userApi.getUserRecord(userStore.userId, apiType)
  const payload = res?.data || {}
  const list = type === 'week'
    ? (payload.weekData || payload.allData || [])
    : (payload.allData || payload.weekData || [])

  listeningRecords.value = {
    ...listeningRecords.value,
    [type]: Array.isArray(list) ? list : [],
  }
  return listeningRecords.value[type]
}

async function setListeningRange(type) {
  if (listeningRange.value === type && listeningBuckets.value.length) return
  listeningRange.value = type
  listeningLoading.value = true
  listeningError.value = ''
  try {
    const records = await ensureListeningRecords(type)
    buildListeningProfile(records)
  } catch (error) {
    listeningError.value = error?.message || '听歌画像分析失败'
    listeningBuckets.value = []
  } finally {
    listeningLoading.value = false
  }
}

function goBack() {
  markNavigatingBack()
  router.back()
}

function switchTab(tab) {
  activeTab.value = tab
}

function openPlaylist(item) {
  const playlistId = Number(item?.id || item?.playlistId || item?.targetId || 0)
  if (!playlistId) return
  reportApi.reportBehavior({
    actionType: 'OPEN_PLAYLIST',
    actionTarget: String(playlistId),
    actionDetail: item?.name || item?.playlistName || '',
  })
  router.push({name: 'profilePlaylistDetail', query: {id: playlistId}})
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

    const syncedProfile = {
      userId: profile.value.userId,
      nickname: profile.value.nickname,
      avatarUrl: profile.value.avatarUrl,
    }
    userStore.setProfile(syncedProfile)
    reportApi.syncNeteaseUser(syncedProfile)

    level.value = {
      level: levelRes?.data?.data?.level || 0,
    }

    playlists.value = playlistRes?.data?.playlist || []
    await loadCloudSongs(1)
    await setListeningRange(listeningRange.value)
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
}

.listening-gradient-stage {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(circle at 18% 22%, rgba(59, 130, 246, 0.44), transparent 44%),
    radial-gradient(circle at 82% 18%, rgba(168, 85, 247, 0.4), transparent 46%),
    radial-gradient(circle at 60% 80%, rgba(34, 197, 94, 0.34), transparent 48%),
    #292929;
  min-height: 190px;
  background-size: cover;
  background-repeat: no-repeat;
}

.listening-gradient-stage-large {
  height: 280px;
  min-height: 280px;
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
