<template>
  <div class="min-h-screen bg-stone-50 text-stone-900">
    <section class="relative h-[56vh] min-h-[360px] overflow-hidden sm:h-[84vh]">
      <SmartMedia
        class="absolute inset-0 h-full w-full"
        :src="hero.media"
        :title="hero.title"
        :content="hero.subtitle"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/40" />
      <div class="relative mx-auto flex h-full max-w-7xl items-end px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8">
        <div class="max-w-2xl rounded-2xl border border-white/30 bg-black/20 px-5 py-4 text-white backdrop-blur-md sm:px-6 sm:py-5">
          <p class="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/80 sm:text-xs">My Music Demo</p>
          <h1 class="text-3xl font-black leading-[1.1] sm:max-w-[12ch] sm:text-5xl">今天听点什么</h1>
          <p class="mt-3 max-w-[34ch] text-sm leading-relaxed text-white/90 sm:text-base">{{ hero.subtitle }}</p>
        </div>
      </div>
    </section>

    <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section class="motion-section mb-10">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">推荐歌单</h2>
        </div>
        <p v-if="loading.recommend" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.recommend" class="text-sm text-red-500">{{ errors.recommend }}</p>
        <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <article
            v-for="item in recommendPlaylists"
            :key="item.id"
            class="motion-card group cursor-pointer"
            :style="getPlaylistCardTransitionStyle(item)"
            @click="openPlaylist(item)"
          >
            <div class="relative aspect-square overflow-hidden rounded-2xl bg-stone-200" :style="getPlaylistCoverTransitionStyle(item)">
              <SmartMedia :src="item.picUrl" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <p class="mt-2 truncate text-sm font-medium">{{ item.name }}</p>
          </article>
        </div>
      </section>

      <section class="motion-section mb-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">网友精选碟</h2>
          <span class="text-xs uppercase tracking-[0.2em] text-stone-400">Top Playlist</span>
        </div>
        <div class="mb-4 flex flex-wrap gap-2">
          <button
            v-for="tag in playlistTags"
            :key="tag"
            :class="activePlaylistTag === tag ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'"
            class="rounded-full border px-3 py-1 text-xs font-medium transition"
            type="button"
            @click="changePlaylistTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
        <p v-if="loading.top" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.top" class="text-sm text-red-500">{{ errors.top }}</p>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in topPlaylists"
            :key="item.id"
            class="motion-card group flex cursor-pointer gap-3 rounded-2xl border border-stone-100 p-3 transition hover:border-stone-300 hover:bg-stone-50"
            :style="getPlaylistCardTransitionStyle(item)"
            @click="openPlaylist(item)"
          >
            <div class="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-200" :style="getPlaylistCoverTransitionStyle(item)">
              <SmartMedia :src="item.coverImgUrl" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ item.name }}</p>
              <p class="mt-1 line-clamp-2 text-xs text-stone-500">{{ item.copywriter || item.description || '精选音乐集合' }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="motion-section mb-10">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">推荐新音乐</h2>
        </div>
        <p v-if="loading.songs" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.songs" class="text-sm text-red-500">{{ errors.songs }}</p>
        <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              v-for="(song, index) in newSongs"
              :key="song.id"
              class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left transition hover:border-stone-400"
              type="button"
              @click="openSong(song, index)"
            >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ song.name }}</p>
              <ArtistLinks
                :artists="getSongArtists(song)"
                container-class="text-xs text-stone-500"
                link-class="hover:text-stone-800 hover:underline"
                separator-class="text-stone-400"
                fallback-class="text-stone-500"
              />
            </div>
            <span class="ml-4 text-xs text-stone-400">播放</span>
          </button>
        </div>
      </section>

      <section class="motion-section mb-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">热门榜单</h2>
          <span class="text-xs uppercase tracking-[0.2em] text-stone-400">Top Charts</span>
        </div>
        <p v-if="loading.rank" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.rank" class="text-sm text-red-500">{{ errors.rank }}</p>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="rank in topRanks"
            :key="rank.id"
            class="group cursor-pointer overflow-hidden rounded-2xl border border-stone-100 bg-stone-50"
            :style="getPlaylistCardTransitionStyle(rank)"
            @click="openPlaylist(rank)"
          >
            <div class="flex gap-3 p-3">
              <div class="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-200" :style="getPlaylistCoverTransitionStyle(rank)">
                <SmartMedia :src="rank.coverImgUrl" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold">{{ rank.name }}</p>
                <p class="mt-1 text-xs text-stone-500">{{ rank.updateFrequency || '实时更新' }}</p>
                <div class="mt-2 space-y-1">
                  <p
                    v-for="(item, idx) in rank.tracks || []"
                    :key="`${rank.id}-${idx}`"
                    class="truncate text-xs text-stone-600"
                  >
                    {{ idx + 1 }}. {{ item.first }} - {{ item.second }}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="mb-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">精选播客</h2>
          <span class="text-xs uppercase tracking-[0.2em] text-stone-400">Podcast</span>
        </div>
        <p v-if="loading.podcast" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.podcast" class="text-sm text-red-500">{{ errors.podcast }}</p>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in podcastPrograms"
            :key="item.id"
            class="group cursor-pointer overflow-hidden rounded-2xl border border-stone-100 bg-stone-50"
            @click="openPodcast(item)"
          >
            <div class="aspect-[16/10] overflow-hidden bg-stone-200">
              <SmartMedia :src="item.picUrl" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <div class="p-3">
              <p class="line-clamp-2 text-sm font-semibold">{{ item.name }}</p>
              <p class="mt-1 truncate text-xs text-stone-500">{{ item.program?.radio?.name || item.program?.dj?.nickname || '电台节目' }}</p>
              <p class="mt-1 text-xs text-stone-500">{{ formatPodcastDuration(item.program?.duration) }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="mb-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-2xl font-bold">MV 专区</h2>
            <p class="mt-1 text-xs text-stone-500">全部 MV / 最新 MV / 网易出品 / 推荐 MV</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="source in mvSourceOptions"
              :key="source.value"
              class="rounded-full border px-3 py-1 text-xs font-medium transition"
              :class="activeMvSource === source.value ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'"
              type="button"
              @click="switchMvSource(source.value)"
            >
              {{ source.label }}
            </button>
          </div>
        </div>

        <div class="mb-4 flex flex-wrap items-center gap-2" v-if="activeMvSource === 'all' || activeMvSource === 'latest'">
          <select v-model="mvArea" class="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700">
            <option v-for="area in mvAreas" :key="area" :value="area">地区：{{ area }}</option>
          </select>
          <select v-if="activeMvSource === 'all'" v-model="mvType" class="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700">
            <option v-for="type in mvTypes" :key="type" :value="type">类型：{{ type }}</option>
          </select>
          <select v-if="activeMvSource === 'all'" v-model="mvOrder" class="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700">
            <option v-for="order in mvOrders" :key="order" :value="order">排序：{{ order }}</option>
          </select>
          <button
            class="rounded-full border border-stone-300 px-3 py-1 text-xs font-medium transition hover:bg-stone-100"
            type="button"
            @click="loadMvList({reset: true})"
          >
            刷新
          </button>
        </div>

        <p v-if="loading.mv" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.mv" class="text-sm text-red-500">{{ errors.mv }}</p>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in mvList"
            :key="item.id"
            class="motion-card group cursor-pointer overflow-hidden rounded-2xl border border-stone-100 bg-stone-50"
            @click="openMv(item)"
          >
            <div class="aspect-video overflow-hidden bg-stone-200">
              <SmartMedia :src="item.cover" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <div class="p-3">
              <p class="truncate text-sm font-semibold">{{ item.name }}</p>
              <p class="mt-1 truncate text-xs text-stone-500">{{ item.artistName || '未知歌手' }}</p>
              <p class="mt-1 text-xs text-stone-500">播放 {{ Number(item.playCount || 0).toLocaleString() }}</p>
            </div>
          </article>
          <p v-if="!mvList.length" class="text-sm text-stone-500">暂无 MV 数据</p>
        </div>

        <div
          v-if="activeMvSource === 'all' || activeMvSource === 'exclusive'"
          class="mt-4 flex items-center justify-end gap-2 text-xs text-stone-600"
        >
          <button
            class="rounded-full border border-stone-300 px-3 py-1 transition hover:bg-stone-100 disabled:opacity-40"
            type="button"
            :disabled="mvOffset <= 0 || loading.mv"
            @click="prevMvPage"
          >
            上一页
          </button>
          <span>第 {{ Math.floor(mvOffset / mvLimit) + 1 }} 页</span>
          <button
            class="rounded-full border border-stone-300 px-3 py-1 transition hover:bg-stone-100 disabled:opacity-40"
            type="button"
            :disabled="!mvHasMore || loading.mv"
            @click="nextMvPage"
          >
            下一页
          </button>
        </div>
      </section>

      <section class="mb-10">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">热门歌手</h2>
        </div>
        <p v-if="loading.artist" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.artist" class="text-sm text-red-500">{{ errors.artist }}</p>
        <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <article
            v-for="artist in hotArtists"
            :key="artist.id"
            class="group cursor-pointer text-center"
            @click="openArtist(artist)"
          >
            <div class="mx-auto aspect-square w-full max-w-[170px] overflow-hidden rounded-full border border-stone-200 bg-stone-200">
              <SmartMedia :src="artist.picUrl" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <p class="mt-2 truncate text-sm font-medium">{{ artist.name }}</p>
          </article>
        </div>
      </section>

      <section class="mb-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-2xl font-bold">高品质歌单</h2>
          <span class="text-xs uppercase tracking-[0.2em] text-stone-400">High Quality</span>
        </div>
        <p v-if="loading.hq" class="text-sm text-stone-500">加载中...</p>
        <p v-else-if="errors.hq" class="text-sm text-red-500">{{ errors.hq }}</p>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article
            v-for="item in highQualityPlaylists"
            :key="item.id"
            class="group cursor-pointer overflow-hidden rounded-2xl border border-stone-100 bg-stone-50"
            :style="getPlaylistCardTransitionStyle(item)"
            @click="openPlaylist(item)"
          >
            <div class="aspect-[4/3] overflow-hidden bg-stone-200" :style="getPlaylistCoverTransitionStyle(item)">
              <SmartMedia :src="item.coverImgUrl" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <div class="p-3">
              <p class="truncate text-sm font-semibold">{{ item.name }}</p>
              <p class="mt-1 line-clamp-2 text-xs text-stone-500">{{ item.copywriter || item.description || '高品质歌单推荐' }}</p>
            </div>
          </article>
        </div>
      </section>

    </main>

    <button
      ref="releaseNotesFabRef"
      class="motion-fab fixed bottom-[calc(var(--global-player-space,96px)+12px)] right-4 z-[1000] grid h-12 w-12 place-items-center rounded-full border border-stone-300 bg-white/95 text-stone-700 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white"
      type="button"
      aria-label="打开更新日志"
      @click="openReleaseNotesPanel"
    >
      <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7 4h8l4 4v11a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        <path d="M15 4v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </svg>
      <span class="absolute -right-1 -top-1 max-w-[72px] truncate rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold text-white">
        {{ latestReleaseTag }}
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="mvPlayerOpen"
        class="fixed inset-0 z-[1002] bg-black/65 p-4 backdrop-blur-sm"
        @click.self="closeMvPlayer"
      >
        <div class="mx-auto mt-[8vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-2xl">
          <div class="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3 text-white">
            <p class="truncate text-sm font-medium">{{ currentMv?.name || 'MV 播放' }}</p>
            <div class="flex items-center gap-2">
              <select
                v-if="mvResolutions.length"
                v-model="selectedMvResolution"
                class="rounded-full border border-white/30 bg-black/45 px-2 py-1 text-xs text-white"
                @change="changeMvResolution"
              >
                <option v-for="r in mvResolutions" :key="r" :value="r">{{ r }}P</option>
              </select>
              <button
                class="rounded-full border border-white/30 px-3 py-1 text-xs transition hover:bg-white/10"
                type="button"
                @click="closeMvPlayer"
              >
                关闭
              </button>
            </div>
          </div>

          <div class="aspect-video w-full bg-black">
            <div v-if="mvPlayerLoading" class="grid h-full place-items-center text-sm text-white/70">MV 加载中...</div>
            <div v-else-if="mvPlayerError" class="grid h-full place-items-center px-6 text-center text-sm text-red-300">{{ mvPlayerError }}</div>
            <video
              v-else-if="currentMvUrl"
              :src="currentMvUrl"
              :poster="currentMv?.cover || ''"
              controls
              autoplay
              playsinline
              class="h-full w-full"
            />
          </div>
        </div>
      </div>

      <Transition name="release-notes">
        <div
          v-if="releaseNotesOpen"
          class="fixed inset-0 z-[1003] bg-black/45 p-4 backdrop-blur-sm"
          @click.self="releaseNotesOpen = false"
        >
          <div class="release-notes-panel ml-auto h-full w-full max-w-2xl overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-cyan-50 to-white shadow-2xl">
            <div class="border-b border-sky-100 px-4 py-3 sm:px-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-lg font-semibold text-slate-900">版本更新日志</p>
                  <p class="text-xs text-slate-500">展示每个版本的更新亮点、已知问题和 Bug 修复记录</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center rounded-full bg-white/80 px-2.5 py-1 text-[11px] text-slate-700 ring-1 ring-slate-200">
                    最新版本 {{ latestReleaseTag }}
                  </span>
                </div>
              </div>
            </div>

            <div class="h-[calc(100%-82px)] overflow-y-auto p-4 sm:p-5">
              <p v-if="loading.releaseNotes" class="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">正在加载版本日志...</p>
              <p v-else-if="errors.releaseNotes" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-500">{{ errors.releaseNotes }}</p>
              <div v-else-if="releaseNotes.length" class="space-y-4">
                <article
                  v-for="item in releaseNotes"
                  :key="item.id"
                  class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="inline-flex items-center rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
                        v{{ item.version || '0.0.0' }}
                      </div>
                      <p class="mt-2 text-sm font-semibold text-slate-900">{{ item.title }}</p>
                    </div>
                    <span class="shrink-0 text-xs text-slate-500">{{ item.dateText }}</span>
                  </div>

                  <div class="mt-3 grid grid-cols-1 gap-3">
                    <section class="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                      <h4 class="text-xs font-semibold text-emerald-800">更新亮点</h4>
                      <ul class="mt-1 space-y-1 text-xs text-emerald-900 sm:text-sm">
                        <li v-for="(text, idx) in asList(item.highlights)" :key="`h-${item.id}-${idx}`">- {{ text }}</li>
                        <li v-if="asList(item.highlights).length === 0" class="text-emerald-700/70">暂无</li>
                      </ul>
                    </section>

                    <section class="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                      <h4 class="text-xs font-semibold text-amber-800">已知问题</h4>
                      <ul class="mt-1 space-y-1 text-xs text-amber-900 sm:text-sm">
                        <li v-for="(text, idx) in asList(item.knownIssues)" :key="`k-${item.id}-${idx}`">- {{ text }}</li>
                        <li v-if="asList(item.knownIssues).length === 0" class="text-amber-700/70">暂无</li>
                      </ul>
                    </section>

                    <section class="rounded-lg border border-rose-200 bg-rose-50/60 p-3">
                      <h4 class="text-xs font-semibold text-rose-800">Bug 修复</h4>
                      <ul class="mt-1 space-y-1 text-xs text-rose-900 sm:text-sm">
                        <li v-for="(text, idx) in asList(item.bugFixes)" :key="`b-${item.id}-${idx}`">- {{ text }}</li>
                        <li v-if="asList(item.bugFixes).length === 0" class="text-rose-700/70">暂无</li>
                      </ul>
                    </section>
                  </div>

                </article>
              </div>
              <p v-else class="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">暂无更新日志</p>
            </div>

            <div class="border-t border-slate-200 bg-white/70 px-4 py-3 sm:px-5">
              <button
                class="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-600 transition hover:bg-stone-100"
                type="button"
                @click="releaseNotesOpen = false"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ModalRouterView content-width="90vw" content-height="90vh" />
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {animate, hover, inView, press} from 'motion'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import ModalRouterView from '@/components/modalRouterView/ModalRouterView.vue'
import {playListsApi} from '@/api/playListsApi/playListsApi.js'
import {songsApi} from '@/api/songsApi/songsApi.js'
import {artistApi} from '@/api/artistApi/artistApi.js'
import {homeIndexApi} from '@/api/home/homeIndexApi.js'
import {usePlayerStore} from '@/stores/playerStore.js'
import {
  activePlaylistTransitionId,
  buildPlaylistTransitionName,
  runViewTransition,
  setActivePlaylistTransitionId,
} from '@/utils/viewTransition.js'
import {playSongById, playSongWithQueue} from '@/utils/globalPlayer.js'

const router = useRouter()
const route = useRoute()
const playerStore = usePlayerStore()
const releaseNotesFabRef = ref(null)
const motionCleanups = []

const hero = ref({
  media: '',
  title: '',
  subtitle: '',
})

const releaseNotes = ref([])
const releaseNotesOpen = ref(false)
const latestReleaseTag = computed(() => {
  const first = releaseNotes.value[0]
  const explicitTag = String(first?.version || first?.tag || '').trim()
  if (explicitTag) return explicitTag
  const title = String(first?.title || '')
  const match = title.match(/v?\d+(?:\.\d+){0,3}(?:[-._a-zA-Z0-9]+)?/)
  if (match?.[0]) return match[0]
  return releaseNotes.value.length ? 'NEW' : '...'
})

const recommendPlaylists = ref([])
const topPlaylists = ref([])
const newSongs = ref([])
const topRanks = ref([])
const podcastPrograms = ref([])
const hotArtists = ref([])
const highQualityPlaylists = ref([])
const mvList = ref([])
const playlistTags = ['全部', '华语', '欧美', '流行', '电子']
const activePlaylistTag = ref('全部')

const mvSourceOptions = [
  {label: '全部 MV', value: 'all'},
  {label: '最新 MV', value: 'latest'},
  {label: '网易出品', value: 'exclusive'},
  {label: '推荐 MV', value: 'recommend'},
]
const mvAreas = ['全部', '内地', '港台', '欧美', '日本', '韩国']
const mvTypes = ['全部', '官方版', '原生', '现场版', '网易出品']
const mvOrders = ['上升最快', '最热', '最新']
const activeMvSource = ref('all')
const mvArea = ref('全部')
const mvType = ref('全部')
const mvOrder = ref('上升最快')
const mvLimit = ref(9)
const mvOffset = ref(0)
const mvHasMore = ref(false)
const mvPlayerOpen = ref(false)
const mvPlayerLoading = ref(false)
const mvPlayerError = ref('')
const currentMv = ref(null)
const currentMvUrl = ref('')
const mvResolutions = ref([])
const selectedMvResolution = ref(1080)
const shouldResumeMusicOnClose = ref(false)

const loading = ref({
  banner: true,
  releaseNotes: true,
  recommend: true,
  top: true,
  songs: true,
  rank: true,
    podcast: true,
    artist: true,
    hq: true,
    mv: true,
  })

const errors = ref({
  banner: '',
  releaseNotes: '',
  recommend: '',
  top: '',
  songs: '',
  rank: '',
    podcast: '',
    artist: '',
    hq: '',
    mv: '',
  })

function openArtist(artist) {
  router.push({
    path: '/artistDetial',
    query: {id: artist.id || ''},
  })
}

async function openPlaylist(playlist) {
  if (!playlist?.id) return
  setActivePlaylistTransitionId(playlist.id)
  await runViewTransition(() => {
    return router.push({
      path: '/home/playlistDetail',
      query: {id: playlist.id},
    })
  })
}

function getPlaylistCardTransitionStyle(playlist) {
  if (route.name === 'playlistDetail') return {}
  if (Number(playlist?.id) !== activePlaylistTransitionId.value) return {}
  const transitionName = buildPlaylistTransitionName(playlist?.id, 'card')
  if (!transitionName) return {}
  return {viewTransitionName: transitionName}
}

function getPlaylistCoverTransitionStyle(playlist) {
  if (route.name === 'playlistDetail') return {}
  if (Number(playlist?.id) !== activePlaylistTransitionId.value) return {}
  const transitionName = buildPlaylistTransitionName(playlist?.id, 'cover')
  if (!transitionName) return {}
  return {viewTransitionName: transitionName}
}

async function openSong(song, index = 0) {
  await playSongWithQueue(song, newSongs.value, index)
}

function getSongArtists(song) {
  return song?.artists || song?.ar || []
}

async function openPodcast(item) {
  const id = item?.program?.mainSong?.id || item?.program?.id || null
  if (!id) return
  await playSongById({
    id,
    name: item?.name || item?.program?.name || '播客节目',
    artists: item?.program?.mainSong?.ar || [],
    cover: item?.picUrl || item?.program?.coverUrl || '',
  })
}

function openMv(mv) {
  if (!mv?.id) return
  shouldResumeMusicOnClose.value = Boolean(playerStore.isPlaying && playerStore.hasSong)
  if (shouldResumeMusicOnClose.value) {
    playerStore.setPlaying(false)
  }
  currentMv.value = mv
  currentMvUrl.value = ''
  mvPlayerError.value = ''
  mvPlayerLoading.value = true
  mvPlayerOpen.value = true
  selectedMvResolution.value = 1080
  mvResolutions.value = [1080, 720, 480]

  artistApi.getMvDetail(mv.id)
    .then((res) => {
      const brs = res?.data?.data?.brs || {}
      const available = Object.keys(brs)
        .map(item => Number(item))
        .filter(item => Number.isFinite(item) && item > 0)
        .sort((a, b) => b - a)
      if (available.length) {
        mvResolutions.value = available
        selectedMvResolution.value = available[0]
      }
    })
    .catch(() => {
      mvResolutions.value = [1080, 720, 480]
    })
    .finally(() => {
      loadMvUrl(mv.id, selectedMvResolution.value)
    })
}

async function loadMvUrl(mvId, resolution) {
  mvPlayerLoading.value = true
  mvPlayerError.value = ''

  const candidates = Array.from(new Set([
    Number(resolution),
    ...mvResolutions.value.map(item => Number(item)),
    1080,
    720,
    480,
    240,
  ].filter(item => Number.isFinite(item) && item > 0))).sort((a, b) => b - a)

  try {
    for (const r of candidates) {
      const res = await artistApi.getMvUrl(mvId, r)
      const url = res?.data?.data?.url || ''
      if (!url) continue
      selectedMvResolution.value = r
      currentMvUrl.value = url
      return
    }

    mvPlayerError.value = '该 MV 暂无可播放地址'
  } catch {
    mvPlayerError.value = 'MV 加载失败，请稍后重试'
  } finally {
    mvPlayerLoading.value = false
  }
}

function changeMvResolution() {
  if (!currentMv.value?.id) return
  currentMvUrl.value = ''
  loadMvUrl(currentMv.value.id, Number(selectedMvResolution.value || 1080))
}

function closeMvPlayer() {
  mvPlayerOpen.value = false
  mvPlayerLoading.value = false
  mvPlayerError.value = ''
  currentMvUrl.value = ''
  mvResolutions.value = []
  if (shouldResumeMusicOnClose.value && playerStore.hasSong) {
    playerStore.setPlaying(true)
  }
  shouldResumeMusicOnClose.value = false
}

function normalizeMvItem(item) {
  return {
    id: item?.id || null,
    name: item?.name || item?.copywriter || '未知 MV',
    cover: item?.cover || item?.imgurl || item?.picUrl || '',
    artistName: item?.artistName || item?.artist?.name || item?.artists?.map(a => a.name).join(' / ') || '',
    playCount: item?.playCount || item?.playTime || item?.playtime || 0,
  }
}

async function loadMvList({reset = false} = {}) {
  if (reset) {
    mvOffset.value = 0
  }

  loading.value.mv = true
  errors.value.mv = ''

  try {
    let res
    if (activeMvSource.value === 'all') {
      res = await artistApi.getAllMv({
        area: mvArea.value,
        type: mvType.value,
        order: mvOrder.value,
        limit: mvLimit.value,
        offset: mvOffset.value,
      })
      const list = (res?.data?.data || []).map(normalizeMvItem)
      mvList.value = list
      mvHasMore.value = Boolean(res?.data?.hasMore ?? list.length >= mvLimit.value)
      return
    }

    if (activeMvSource.value === 'latest') {
      res = await artistApi.getLatestMv({
        area: mvArea.value,
        limit: mvLimit.value,
      })
      mvList.value = (res?.data?.data || []).map(normalizeMvItem)
      mvHasMore.value = false
      return
    }

    if (activeMvSource.value === 'exclusive') {
      res = await artistApi.getExclusiveMv({
        limit: mvLimit.value,
        offset: mvOffset.value,
      })
      const raw = res?.data?.data || res?.data?.result || []
      const list = raw.map(normalizeMvItem)
      mvList.value = list
      mvHasMore.value = Boolean(res?.data?.hasMore ?? list.length >= mvLimit.value)
      return
    }

    res = await artistApi.getRecommendMv()
    mvList.value = (res?.data?.result || res?.data?.data || []).map(normalizeMvItem)
    mvHasMore.value = false
  } catch (error) {
    errors.value.mv = 'MV 加载失败'
  } finally {
    loading.value.mv = false
  }
}

function switchMvSource(source) {
  if (activeMvSource.value === source) return
  activeMvSource.value = source
  loadMvList({reset: true})
}

function nextMvPage() {
  if (!mvHasMore.value || loading.value.mv) return
  mvOffset.value += mvLimit.value
  loadMvList()
}

function prevMvPage() {
  if (mvOffset.value <= 0 || loading.value.mv) return
  mvOffset.value = Math.max(0, mvOffset.value - mvLimit.value)
  loadMvList()
}

function formatPodcastDuration(durationMs) {
  const total = Math.floor((durationMs || 0) / 1000)
  const minute = Math.floor(total / 60)
  const second = String(total % 60).padStart(2, '0')
  return `${minute}:${second}`
}

function normalizeBannerItem(item, index = 0) {
  const srcList = Array.isArray(item?.src) ? item.src : []
  const contentList = Array.isArray(item?.content) ? item.content : []
  const image = srcList[0] || item?.pic || item?.imageUrl || item?.cover || item?.coverUrl || ''
  const subtitleFromList = contentList
    .map(entry => String(entry || '').trim())
    .filter(Boolean)
    .join(' · ')
  return {
    id: item?.targetId || item?.bannerId || item?.id || `banner-${index}`,
    media: image,
    title: item?.typeTitle || item?.title || 'Now Playing',
    subtitle: subtitleFromList || item?.copywriter || item?.description || hero.value.subtitle,
  }
}

function normalizeReleaseNoteItem(item, index = 0) {
  const timeSource = item?.createdAt || item?.updatedAt || item?.time || item?.date || 0
  const ts = Number.isFinite(Number(timeSource))
    ? Number(timeSource)
    : Date.parse(String(timeSource || ''))
  const title = item?.title || item?.name || `更新 ${index + 1}`
  const explicitContent = item?.content || item?.description || item?.body || ''
  const highlights = Array.isArray(item?.highlights) ? item.highlights.filter(Boolean) : []
  const bugFixes = Array.isArray(item?.bugFixes) ? item.bugFixes.filter(Boolean) : []
  const knownIssues = Array.isArray(item?.knownIssues) ? item.knownIssues.filter(Boolean) : []
  const mergedBlocks = [
    highlights.length ? `亮点：${highlights.join('；')}` : '',
    bugFixes.length ? `修复：${bugFixes.join('；')}` : '',
    knownIssues.length ? `已知问题：${knownIssues.join('；')}` : '',
  ].filter(Boolean)
  const content = explicitContent || mergedBlocks.join('\n')
  return {
    id: item?.id || `${title}-${index}`,
    title,
    content,
    version: item?.version || item?.tag || item?.release || '',
    highlights,
    bugFixes,
    knownIssues,
    dateText: Number.isFinite(ts) && ts > 0 ? new Date(ts).toLocaleDateString() : '-',
  }
}

function asList(value) {
  return Array.isArray(value) ? value : []
}

function openReleaseNotesPanel() {
  releaseNotesOpen.value = true
  if (!releaseNotes.value.length && !loading.value.releaseNotes) {
    loadReleaseNotes()
  }
}

function setupMotionEffects() {
  if (typeof window === 'undefined') return

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) return

  const sections = document.querySelectorAll('.motion-section')
  sections.forEach((el) => {
    const stop = inView(
      el,
      () => {
        animate(
          el,
          {opacity: [0, 1], y: [18, 0], filter: ['blur(6px)', 'blur(0px)']},
          {duration: 0.32, easing: [0.22, 1, 0.36, 1]},
        )
      },
      {amount: 0.2},
    )
    motionCleanups.push(stop)
  })

  const cards = document.querySelectorAll('.motion-card')
  cards.forEach((el) => {
    const stopHover = hover(el, () => {
      const ctrl = animate(el, {y: -4, scale: 1.01}, {type: 'spring', stiffness: 380, damping: 28, mass: 0.35})
      return () => ctrl.stop()
    })
    const stopPress = press(el, () => {
      const down = animate(el, {scale: 0.985}, {duration: 0.1})
      return () => {
        down.stop()
        animate(el, {scale: 1}, {duration: 0.16, easing: [0.22, 1, 0.36, 1]})
      }
    })
    motionCleanups.push(stopHover)
    motionCleanups.push(stopPress)
  })

  if (releaseNotesFabRef.value) {
    const stopHover = hover(releaseNotesFabRef.value, () => {
      const ctrl = animate(releaseNotesFabRef.value, {scale: 1.06, y: -1}, {type: 'spring', stiffness: 520, damping: 30, mass: 0.28})
      return () => ctrl.stop()
    })
    const stopPress = press(releaseNotesFabRef.value, () => {
      const down = animate(releaseNotesFabRef.value, {scale: 0.92, y: 0}, {duration: 0.1})
      return () => {
        down.stop()
        animate(releaseNotesFabRef.value, {scale: 1, y: 0}, {duration: 0.16, easing: [0.22, 1, 0.36, 1]})
      }
    })
    motionCleanups.push(stopHover)
    motionCleanups.push(stopPress)
  }
}

async function loadHomeBanner() {
  loading.value.banner = true
  errors.value.banner = ''
  try {
    const res = await homeIndexApi.getBanner()
    const raw = res?.banners || res?.data?.banners || res?.data?.data?.banners || res?.data?.data || res?.data || res || []
    const list = Array.isArray(raw) ? raw.map(normalizeBannerItem) : []
    if (list.length) {
      const firstUsable = list.find(item => String(item?.media || '').trim()) || list[0]
      hero.value = {
        ...hero.value,
        ...firstUsable,
      }
    }
  } catch (error) {
    errors.value.banner = error?.message || 'Banner 加载失败'
  } finally {
    loading.value.banner = false
  }
}

async function loadReleaseNotes() {
  loading.value.releaseNotes = true
  errors.value.releaseNotes = ''
  try {
    const res = await homeIndexApi.getReleaseNotes({limit: 6})
    const raw = res?.list || res?.data?.list || res?.data?.data?.list || res?.data?.data || res?.data || res || []
    releaseNotes.value = Array.isArray(raw)
      ? raw.map(normalizeReleaseNoteItem)
      : []
  } catch (error) {
    errors.value.releaseNotes = error?.message || '更新日志加载失败'
    releaseNotes.value = []
  } finally {
    loading.value.releaseNotes = false
  }
}

async function loadRecommendPlaylists() {
  try {
    const res = await playListsApi.getRecommendPlayList()
    recommendPlaylists.value = res?.data?.result || []
  } catch (error) {
    errors.value.recommend = '推荐歌单加载失败'
  } finally {
    loading.value.recommend = false
  }
}

async function loadTopPlaylists(tag = activePlaylistTag.value) {
  loading.value.top = true
  errors.value.top = ''
  try {
    const res = await playListsApi.getPlayList(tag, 9, 0)
    topPlaylists.value = res?.data?.playlists || []
  } catch (error) {
    errors.value.top = '网友精选碟加载失败'
  } finally {
    loading.value.top = false
  }
}

function changePlaylistTag(tag) {
  if (activePlaylistTag.value === tag) return
  activePlaylistTag.value = tag
  loadTopPlaylists(tag)
}

async function loadNewSongs() {
  try {
    const res = await songsApi.getNewSongs()
    newSongs.value = res?.data?.result || []
  } catch (error) {
    errors.value.songs = '新音乐加载失败'
  } finally {
    loading.value.songs = false
  }
}

async function loadTopRanks() {
  try {
    const res = await songsApi.getTopListDetail()
    const list = res?.data?.list || []
    topRanks.value = list
      .filter(item => item?.id && item?.coverImgUrl)
      .slice(0, 6)
  } catch (error) {
    errors.value.rank = '榜单加载失败'
  } finally {
    loading.value.rank = false
  }
}

async function loadPodcastPrograms() {
  try {
    const res = await songsApi.getPodcastPrograms(6)
    podcastPrograms.value = res?.data?.result || []
  } catch (error) {
    errors.value.podcast = '播客加载失败'
  } finally {
    loading.value.podcast = false
  }
}

async function loadHotArtists() {
  try {
    const res = await artistApi.getHotArtist()
    hotArtists.value = res?.data?.artists || []
  } catch (error) {
    errors.value.artist = '热门歌手加载失败'
  } finally {
    loading.value.artist = false
  }
}

async function loadHighQualityPlaylists() {
  try {
    const res = await songsApi.getHighQualitySongs()
    highQualityPlaylists.value = res?.data?.playlists || []
  } catch (error) {
    errors.value.hq = '高品质歌单加载失败'
  } finally {
    loading.value.hq = false
  }
}

onMounted(() => {
  setupMotionEffects()
  loadHomeBanner()
  loadReleaseNotes()
  loadRecommendPlaylists()
  loadTopPlaylists()
  loadNewSongs()
  loadTopRanks()
  loadPodcastPrograms()
  loadMvList({reset: true})
  loadHotArtists()
  loadHighQualityPlaylists()
})

onBeforeUnmount(() => {
  motionCleanups.splice(0).forEach(stop => {
    if (typeof stop === 'function') stop()
  })
  closeMvPlayer()
})
</script>

<style scoped>
.release-notes-enter-active,
.release-notes-leave-active {
  transition: opacity 220ms ease;
}

.release-notes-enter-from,
.release-notes-leave-to {
  opacity: 0;
}

.release-notes-enter-active .release-notes-panel,
.release-notes-leave-active .release-notes-panel {
  transition: transform 240ms ease, opacity 220ms ease;
}

.release-notes-enter-from .release-notes-panel,
.release-notes-leave-to .release-notes-panel {
  opacity: 0;
  transform: translateX(24px) scale(0.985);
}

@media (prefers-reduced-motion: reduce) {
  .release-notes-enter-active,
  .release-notes-leave-active,
  .release-notes-enter-active .release-notes-panel,
  .release-notes-leave-active .release-notes-panel {
    transition-duration: 0ms !important;
  }
}
</style>
