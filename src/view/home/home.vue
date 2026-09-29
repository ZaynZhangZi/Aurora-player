<template>
  <div class="personal-home">
    <AppHeader />

    <main class="personal-main" data-route-motion-root>
      <section id="home-top" class="home-lobby">
        <article class="home-banner-card" :aria-label="bannerHero.title || '首页 Banner'">
          <div class="home-banner-fallback" :class="{'is-hidden': bannerHero.media && (bannerPosterReady || bannerMediaReady)}" aria-hidden="true">
            <span class="banner-orbit banner-orbit-one" />
            <span class="banner-orbit banner-orbit-two" />
            <span class="banner-disc" />
          </div>
          <div v-if="bannerHero.media" class="home-banner-media">
            <SmartMedia
              ref="bannerMediaRef"
              :key="bannerHero.media"
              :src="bannerHero.media"
              :media-type="bannerHero.mediaType"
              :poster="bannerPosterFailed ? '' : bannerHero.poster"
              :autoplay="!isBannerVideo"
              :alt="bannerHero.title ? `${bannerHero.title} 首页 Banner` : 'Aurora 首页 Banner'"
              :image-width="1440"
              :lock-muted="true"
              preload="auto"
              img-loading="eager"
              fetch-priority="high"
              sizes="(min-width: 1376px) 1320px, calc(100vw - 56px)"
              @loaded="onBannerMediaReady"
              @first-frame="onBannerFirstFrame"
            />
          </div>
          <img
            v-if="isBannerVideo && bannerHero.poster && !bannerPosterFailed"
            class="home-banner-poster"
            :class="{'is-ready': bannerPosterReady, 'is-hidden': bannerMediaReady}"
            :src="bannerHero.poster"
            alt=""
            aria-hidden="true"
            fetchpriority="high"
            @load="onBannerPosterLoaded"
            @error="onBannerPosterError"
          />
          <div class="home-banner-shade" />
          <div class="home-banner-content">
            <small class="home-banner-kicker">AURORA · FOR YOU</small>
            <h1>{{ bannerHero.title || '让今天，从一首歌开始。' }}</h1>
            <p class="home-banner-description">
              {{ bannerHero.subtitle || '从熟悉的旋律继续，也去遇见下一首喜欢。' }}
            </p>
          </div>
        </article>

      </section>

      <div class="home-listening-grid" :class="{'has-resume': resumeSong}">
        <aside class="personal-now-card" :style="stationThemeStyle" aria-label="你的私人电台">

          <div class="personal-now-heading">
            <div><p>AURORA RADIO</p><h2>{{ userStore.isLoggedIn ? '私人频率' : '先听这些' }}</h2></div>
            <span><i /> {{ personalFmSongs.length ? '为你调频' : '精选推荐' }}</span>
          </div>
          <p class="personal-station-description">不用挑选，从这一首开始遇见喜欢的声音。</p>

          <div class="personal-station-content">
            <div v-if="stationSong" class="personal-station-feature">
              <button class="personal-station-cover" type="button" :aria-label="playLabel(stationSong)" :disabled="isSongPending(stationSong)" @click="playStationSong()"><SmartMedia :src="stationCover" :alt="`${stationSong.name}封面`" :image-width="320" sizes="96px" /></button>
              <span class="personal-station-copy">
                <small>正在推荐</small><strong>{{ stationSong.name }}</strong><ArtistLinks class="station-artists" :artists="getSongArtists(stationSong)" />
              </span>
              <button class="personal-station-action" type="button" :aria-label="playLabel(stationSong)" :aria-busy="isSongPending(stationSong)" :disabled="isSongPending(stationSong)" @click="playStationSong()">
                <span class="personal-station-play"><HomePlaybackIcon :loading="isSongPending(stationSong)" :playing="isSongPlaying(stationSong)" /></span>
                <b>{{ isSongPending(stationSong) ? '加载中' : isSongPlaying(stationSong) ? '暂停' : '播放' }}</b>
              </button>
            </div>
            <div v-else class="personal-station-empty" role="status">{{ loading.personalFmSongs || loading.dailySongs ? '正在准备你的第一首歌…' : '暂时没有推荐，稍后再来听听' }}</div>
          </div>
        </aside>

      <section v-if="resumeSong" class="lofi-resume" :style="resumeThemeStyle" aria-label="继续播放">
        <div class="lofi-resume-fluid" aria-hidden="true">
          <i class="is-primary" />
          <i class="is-accent" />
          <i class="is-glow" />
        </div>
        <div class="lofi-resume-haze" />

        <div class="lofi-resume-primary">
          <div class="lofi-resume-cover">
            <SmartMedia :src="resumeCover" :alt="`${resumeSong.name}封面`" :image-width="380" sizes="150px" />
            <i aria-hidden="true" />
          </div>
          <div class="lofi-resume-copy">
            <small>CONTINUE LISTENING</small>
            <h2>继续播放</h2>
            <strong>{{ resumeSong.name }}</strong>
            <em><ArtistLinks :artists="getSongArtists(resumeSong)" /></em>
            <span class="lofi-progress"><i :style="{width: `${resumeProgress}%`}" /></span>
            <b>{{ resumeProgress ? `听到 ${formatPlaybackTime(playerStore.currentTimeMs)} · 共 ${formatPlaybackTime(playerStore.durationMs)}` : '继续上次的聆听' }}</b>
          </div>
          <button type="button" class="lofi-resume-play" :aria-label="playLabel(resumeSong)" :aria-busy="isSongPending(resumeSong)" :disabled="isSongPending(resumeSong)" @click="playResumeSong()">
            <HomePlaybackIcon :loading="isSongPending(resumeSong)" :playing="isSongPlaying(resumeSong)" />
          </button>
        </div>

        <div v-if="resumeNext.length" class="lofi-resume-next">
          <p>播放队列 · 接下来</p>
          <div v-for="entry in resumeNext" :key="entry.song.queueEntryId" class="resume-queue-row">
            <span>{{ String(entry.index + 1).padStart(2, '0') }}</span>
            <div><strong>{{ entry.song.name }}</strong><small><ArtistLinks :artists="getSongArtists(entry.song)" /></small></div>
            <button type="button" :aria-label="playLabel(entry.song)" :disabled="isSongPending(entry.song)" @click="playQueueByIndex(entry.index)"><HomePlaybackIcon :loading="isSongPending(entry.song)" /></button>
          </div>
        </div>
      </section>
      </div>

      <section class="personal-section personal-scenes">
        <div class="personal-section-heading">
          <div><p>CHOOSE YOUR MOMENT</p><h2>此刻想怎么听？</h2></div>
          <span>不需要挑歌，选择现在的状态就好。</span>
        </div>
        <div class="personal-scene-grid">
          <button
            v-for="(scene, index) in scenes"
            :key="scene.id"
            type="button"
            :class="`scene-${scene.id}`"
            :disabled="Boolean(loading.scene)"
            @click="startScene(scene)"
          >
            <span class="personal-scene-index">0{{ index + 1 }}</span>
            <span class="personal-scene-icon" aria-hidden="true">{{ scene.icon }}</span>
            <span class="personal-scene-copy"><strong>{{ scene.title }}</strong><small>{{ scene.subtitle }}</small></span>
            <i v-if="loading.scene === scene.id" class="personal-spinner" />
            <i v-else aria-hidden="true">↗</i>
          </button>
        </div>
      </section>

      <section class="personal-section personal-daily">
        <div class="personal-section-heading">
          <div><p>DAILY ROTATION</p><h2>{{ userStore.isLoggedIn ? '只属于今天的推荐' : '今天先从这些开始' }}</h2></div>
          <button v-if="dailySongs.length" type="button" :disabled="isSongPending(dailySongs[0])" @click="playDailySongs"><HomePlaybackIcon :loading="isSongPending(dailySongs[0])" :playing="isSongPlaying(dailySongs[0])" />{{ isSongPlaying(dailySongs[0]) ? '暂停播放' : '全部播放' }}</button>
        </div>

        <div class="personal-daily-layout">
          <article class="personal-song-panel">
            <div v-if="loading.dailySongs && !dailySongs.length" class="personal-song-skeleton" aria-label="正在加载推荐歌曲"><span v-for="index in 6" :key="index" /></div>
            <div v-else-if="dailySongs.length" class="personal-song-grid">
              <HomeSongRow
                v-for="(song, index) in dailySongs.slice(0, 8)"
                :key="song.id"
                :song="song"
                :index="index"
                toggle-playback
                @play="playDailySong"
              />
            </div>
            <div v-else class="personal-empty">暂时没有推荐歌曲，稍后再来看看。</div>
          </article>

          <aside class="personal-taste-card">
            <p>YOUR TASTE</p>
            <h3>{{ userStore.isLoggedIn ? '你的声音坐标' : '从曲风开始认识音乐' }}</h3>
            <span>{{ userStore.isLoggedIn ? '根据近期偏好整理，点击任意曲风去发现更多。' : '登录后这里会变成你的个人曲风地图。' }}</span>
            <div class="personal-taste-list">
              <button v-for="(tag, index) in tasteTags" :key="tag.id" type="button" @click="openStyle(tag)">
                <span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ tag.name }}</strong><small>{{ tag.enName || 'EXPLORE' }}</small><i>→</i>
              </button>
            </div>
            <button v-if="!userStore.isLoggedIn" class="personal-login-link" type="button" @click="openLoginDialog">登录开启个性推荐</button>
          </aside>
        </div>
      </section>

      <section class="personal-section personal-playlists">
        <div class="personal-section-heading">
          <div><p>MADE FOR YOUR DAY</p><h2>{{ userStore.isLoggedIn ? '为你留下的歌单' : '值得收藏的歌单' }}</h2></div>
          <button type="button" @click="openDiscover">去发现页浏览全部 →</button>
        </div>
        <div v-if="loading.dailyPlaylists && !dailyPlaylists.length" class="personal-playlist-skeleton" aria-label="正在加载推荐歌单"><span v-for="index in 4" :key="index" /></div>
        <div v-else-if="dailyPlaylists.length" class="personal-playlist-grid">
          <HomePlaylistCard v-for="item in dailyPlaylists.slice(0, 4)" :key="item.id" :item="item" playable :loading="String(playlistLoadingId) === String(item.id)" :playing="isPlaylistPlaying(item)" @open="openPlaylist" @play="playHomePlaylist" />
        </div>
        <div v-else class="personal-empty">暂时没有推荐歌单，稍后再来看看。</div>
      </section>

      <section v-if="recentCollections.length" class="personal-section personal-recent-collections">
        <div class="personal-section-heading">
          <div><p>RECENTLY PLAYED</p><h2>最近听过</h2></div>
        </div>
        <div class="personal-collection-list">
          <button v-for="item in recentCollections" :key="`${item.type}-${item.id}`" type="button" @click="openRecentCollection(item)">
            <SmartMedia :src="item.cover" :alt="`${item.name}封面`" :image-width="220" sizes="92px" />
            <span><small>{{ item.type === 'album' ? 'ALBUM' : 'PLAYLIST' }}</small><strong>{{ item.name }}</strong><i>{{ item.meta }}</i></span>
            <b aria-hidden="true">↗</b>
          </button>
        </div>
      </section>

      <p v-if="error" class="personal-load-note" role="status">{{ error }} <button type="button" @click="reloadHome">重试</button></p>

      <footer class="personal-footer">
        <div><strong>AURORA</strong><span>首页属于你，发现页属于整个音乐世界。</span></div>
        <button type="button" @click="router.push({name: 'releaseNotes'})">查看版本更新</button>
      </footer>
    </main>
  </div>
</template>

<script setup>
defineOptions({name: 'HomePage'})

import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import HomePlaybackIcon from '@/components/home/HomePlaybackIcon.vue'
import AppHeader from '@/components/appHeader/AppHeader.vue'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import HomePlaylistCard from '@/components/home/HomePlaylistCard.vue'
import HomeSongRow from '@/components/home/HomeSongRow.vue'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import {useHomeData} from '@/composables/useHomeData.js'
import {usePersonalHomeData} from '@/composables/usePersonalHomeData.js'
import {usePlayerThemeFromCover} from '@/composables/usePlayerThemeFromCover.js'
import {useDetailNavigation, DETAIL_CLOSE_EVENT} from '@/composables/useDetailNavigation.js'
import {useCounterStore} from '@/stores/userStores.js'
import {usePlayerStore} from '@/stores/playerStore.js'
import {openLoginDialog} from '@/utils/loginDialog.js'
import {playQueueByIndex, playSongWithQueue} from '@/utils/globalPlayer.js'
import {playListsApi} from '@/api/playListsApi/playListsApi.js'
import {showPlaybackNotice} from '@/utils/playbackNotice.js'
import {createFallbackTheme} from '@/utils/player/playerTheme.js'
import {
  consumeLatestPendingPlaylistHeroTransition,
  playPlaylistHeroEnter,
  setPendingPlaylistHeroTransition,
} from '@/utils/playlistFlipHero.js'

const router = useRouter()
const route = useRoute()
const {openDetail} = useDetailNavigation()
const userStore = useCounterStore()
const playerStore = usePlayerStore()
const {resolveThemeFromCover} = usePlayerThemeFromCover()
const {hero: bannerHero, loadHomeBanner} = useHomeData(userStore)
const bannerMediaRef = ref(null)
const bannerMediaReady = ref(false)
const bannerPosterReady = ref(false)
const bannerPosterFailed = ref(false)
let bannerPlayTimer = 0
const isBannerVideo = computed(() => {
  const type = String(bannerHero.value.mediaType || '').toLowerCase()
  if (type === 'video') return true
  if (type === 'image') return false
  return /\.(mp4|webm|ogg|ogv|mov|m4v|avi|mkv)(?:[?#]|$)/i.test(String(bannerHero.value.media || ''))
})
watch(() => [bannerHero.value.media, bannerHero.value.mediaType, bannerHero.value.poster], () => {
  bannerMediaReady.value = false
  bannerPosterReady.value = false
  bannerPosterFailed.value = false
  window.clearTimeout(bannerPlayTimer)
}, {flush: 'sync'})

function onBannerPosterLoaded() {
  bannerPosterReady.value = true
}
function onBannerPosterError() {
  bannerPosterReady.value = false
  bannerPosterFailed.value = true
}
function onBannerMediaReady() {
  if (!isBannerVideo.value) bannerMediaReady.value = true
}
function onBannerFirstFrame() {
  if (!isBannerVideo.value) return
  bannerMediaReady.value = true
  window.clearTimeout(bannerPlayTimer)
  const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300
  bannerPlayTimer = window.setTimeout(() => {
    bannerMediaRef.value?.playVideo?.()?.catch(() => {})
  }, delay)
}
const {
  dailySongs,
  dailyPlaylists,
  personalFmSongs,
  recentSongs,
  recentCollections,
  stylePreferences,
  loading,
  error,
  loadPersonalHome,
  loadSceneSongs,
} = usePersonalHomeData()

const fallbackTasteTags = [
  {id: 1000, name: '流行', enName: 'POP'},
  {id: 1015, name: '电子', enName: 'ELECTRONIC'},
  {id: 1008, name: '摇滚', enName: 'ROCK'},
  {id: 1003, name: '民谣', enName: 'FOLK'},
]

const scenes = [
  {id: 'familiar', title: '熟悉感', subtitle: '从喜欢过的声音继续', icon: '◌', mode: 'FAMILIAR'},
  {id: 'explore', title: '去探索', subtitle: '让陌生歌曲多一点', icon: '✦', mode: 'EXPLORE'},
  {id: 'focus', title: '专注', subtitle: '留一条安静的背景线', icon: '◎', mode: 'SCENE_RCMD', submode: 'FOCUS'},
  {id: 'exercise', title: '运动', subtitle: '把节奏交给下一公里', icon: '↗', mode: 'SCENE_RCMD', submode: 'EXERCISE'},
  {id: 'night', title: '深夜', subtitle: '适合慢慢听完的情绪', icon: '☾', mode: 'SCENE_RCMD', submode: 'NIGHT_EMO'},
]

const tasteTags = computed(() => stylePreferences.value.slice(0, 4).length ? stylePreferences.value.slice(0, 4) : fallbackTasteTags)
const stationQueue = computed(() => {
  if (personalFmSongs.value.length) return personalFmSongs.value
  if (dailySongs.value.length) return dailySongs.value
  return playerStore.playQueue || []
})
const stationSong = computed(() => stationQueue.value[0] || null)
const stationCover = computed(() => stationSong.value?.cover || stationSong.value?.al?.picUrl || stationSong.value?.album?.picUrl || '')
const stationTheme = ref(createFallbackTheme('aurora-radio'))
const stationThemeStyle = computed(() => ({'--station-accent': stationTheme.value.accent.join(', ')}))
const resumeSong = computed(() => playerStore.currentSong?.id ? playerStore.currentSong : recentSongs.value[0] || null)
const resumeNext = computed(() => {
  if (!playerStore.currentSong?.id) return []
  const index = playerStore.currentQueueIndex
  if (String(playerStore.playQueue[index]?.id) !== String(playerStore.currentSong?.id)) return []
  return playerStore.playQueue.slice(index + 1, index + 3).map((song, offset) => ({song, index: index + 1 + offset}))
})
const resumeCover = computed(() => resumeSong.value?.cover || resumeSong.value?.al?.picUrl || resumeSong.value?.album?.picUrl || '')
const resumeTheme = ref(createFallbackTheme('continue-listening'))
const resumeThemeStyle = computed(() => ({
  '--resume-base': resumeTheme.value.base.join(', '),
  '--resume-accent': resumeTheme.value.accent.join(', '),
  '--resume-glow': resumeTheme.value.glow.join(', '),
}))
const resumeIsCurrent = computed(() => Boolean(resumeSong.value?.id && String(resumeSong.value.id) === String(playerStore.currentSong?.id)))
const resumeProgress = computed(() => {
  if (!resumeIsCurrent.value) return 0
  const duration = Number(playerStore.durationMs || 0)
  if (!duration) return 0
  return Math.min(100, Math.max(0, Number(playerStore.currentTimeMs || 0) / duration * 100))
})

function getSongArtists(song) {
  return [song?.ar, song?.artists].find(items => Array.isArray(items) && items.length) || song?.artistName || ''
}

function isSongPlaying(song) {
  return Boolean(song?.id && String(song.id) === String(playerStore.currentSong?.id) && playerStore.isPlaying)
}

function isSongPending(song) {
  return Boolean(song?.id && String(song.id) === String(playerStore.playbackPendingId))
}

function playLabel(song) {
  return `${isSongPending(song) ? '正在加载' : isSongPlaying(song) ? '暂停' : '播放'}：${song?.name || '歌曲'}`
}

function formatPlaybackTime(ms) {
  const seconds = Math.floor(Number(ms || 0) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function toggleCurrentSong(song) {
  if (!song?.id || String(song.id) !== String(playerStore.currentSong?.id) || !playerStore.hasSong) return false
  playerStore.autoPlayOnLoad = false
  playerStore.setPlaying(!playerStore.isPlaying)
  return true
}

async function playStationSong(song = stationSong.value, index = 0) {
  if (!song || isSongPending(song) || toggleCurrentSong(song)) return
  await playSongWithQueue(song, stationQueue.value, index)
}

async function startScene(scene) {
  if (!userStore.isLoggedIn) {
    openLoginDialog()
    return
  }
  const songs = await loadSceneSongs(scene)
  if (songs.length) await playSongWithQueue(songs[0], songs, 0)
}

async function playDailySong(song, index = 0) {
  if (isSongPending(song) || toggleCurrentSong(song)) return
  await playSongWithQueue(song, dailySongs.value, index)
}

async function playDailySongs() {
  if (dailySongs.value.length) await playDailySong(dailySongs.value[0], 0)
}

async function playResumeSong(song = resumeSong.value) {
  if (!song || isSongPending(song) || toggleCurrentSong(song)) return
  const index = playerStore.playQueue.findIndex(item => String(item.id) === String(song.id))
  if (index >= 0) await playQueueByIndex(index)
  else await playSongWithQueue(song, [song], 0)
}

const playlistLoadingId = ref(null)
const activePlaylistId = ref(null)
let activePlaylistEntries = []
let playlistRequest = 0

function isPlaylistActive(item) {
  return String(activePlaylistId.value) === String(item.id)
    && activePlaylistEntries.length === playerStore.playQueue.length
    && activePlaylistEntries.every((id, index) => id === playerStore.playQueue[index]?.queueEntryId)
}

function isPlaylistPlaying(item) {
  return isPlaylistActive(item) && playerStore.isPlaying
}

async function playHomePlaylist(item) {
  if (String(playlistLoadingId.value) === String(item.id)) return
  if (isPlaylistActive(item) && toggleCurrentSong(playerStore.currentSong)) return
  const token = ++playlistRequest
  playlistLoadingId.value = item.id
  const previousQueue = playerStore.playQueue
  const previousSongId = playerStore.currentSong?.id
  try {
    const detail = await playListsApi.getPlayListDetail(item.id)
    const count = Number(detail?.data?.playlist?.trackCount || item.trackCount || 200)
    const response = await playListsApi.getPlayListSongs(item.id, Math.max(1, count))
    if (token !== playlistRequest || previousQueue !== playerStore.playQueue || previousSongId !== playerStore.currentSong?.id) return
    const songs = response?.data?.songs || []
    if (!songs.length) {
      showPlaybackNotice({title: '歌单暂时没有可播放歌曲', message: '可以打开歌单查看详情，或选择其他歌单。'})
      return
    }
    const played = await playSongWithQueue(songs[0], songs, 0)
    if (played && token === playlistRequest) {
      activePlaylistId.value = item.id
      activePlaylistEntries = playerStore.playQueue.map(song => song.queueEntryId)
    }
  } catch {
    if (token === playlistRequest) showPlaybackNotice({kind: 'network', title: '歌单加载失败', message: '请稍后重新点击播放。'})
  } finally {
    if (token === playlistRequest) playlistLoadingId.value = null
  }
}

async function openPlaylist(item, event) {
  const id = Number(item?.id || 0)
  if (!id) return
  const card = event?.currentTarget instanceof HTMLElement ? event.currentTarget.closest('.playlist-card') : null
  const cover = card?.querySelector('[data-playlist-hero-cover]')
  if (cover instanceof HTMLElement) {
    setPendingPlaylistHeroTransition(id, {
      coverRect: cover.getBoundingClientRect(),
      coverSrc: item.picUrl || item.coverImgUrl || '',
      playlistName: item.name || '',
    })
  }
  await openDetail('playlist', id)
}

async function runPlaylistHeroReturn() {
  if (route.name !== 'home') return
  const payload = consumeLatestPendingPlaylistHeroTransition()
  if (!payload?.id) return
  await nextTick()
  const target = document.querySelector(`[data-playlist-hero-cover][data-playlist-id="${payload.id}"]`)
  if (target instanceof HTMLElement) await playPlaylistHeroEnter({payload, targetCoverEl: target})
}

function openRecentCollection(item) {
  const id = Number(item?.id || 0)
  if (!id) return
  if (item.type === 'album') openDetail('album', id)
  else openDetail('playlist', id)
}

function openStyle(tag) {
  router.push({name: 'styleDetailPage', params: {id: tag.id}})
}

function openDiscover() {
  router.push({name: 'discover', query: {tab: 'styles'}})
}

function onDetailClosed(event) {
  if (route.name !== 'home') return
  if (event?.detail?.type && event.detail.type !== 'playlist') return
  void runPlaylistHeroReturn()
}

onMounted(() => {
  void runPlaylistHeroReturn()
  void loadHomeBanner()
  window.addEventListener(DETAIL_CLOSE_EVENT, onDetailClosed)
})
onUnmounted(() => {
  window.clearTimeout(bannerPlayTimer)
  playlistRequest += 1
  resumeThemeRequest += 1
  stationThemeRequest += 1
  window.removeEventListener(DETAIL_CLOSE_EVENT, onDetailClosed)
})
function reloadHome() {
  return loadPersonalHome(userStore.isLoggedIn, userStore.userId)
}
watch([() => userStore.isLoggedIn, () => userStore.userId], reloadHome, {immediate: true})
let resumeThemeRequest = 0
let stationThemeRequest = 0
watch([stationCover, () => stationSong.value?.name || ''], async ([cover, name]) => {
  const request = ++stationThemeRequest
  stationTheme.value = createFallbackTheme(name || 'aurora-radio')
  const theme = await resolveThemeFromCover(cover, name)
  if (request === stationThemeRequest) stationTheme.value = theme
}, {immediate: true})
watch([resumeCover, () => resumeSong.value?.name || ''], async ([cover, name]) => {
  const request = ++resumeThemeRequest
  resumeTheme.value = createFallbackTheme(name || 'continue-listening')
  const theme = await resolveThemeFromCover(cover, name)
  if (request === resumeThemeRequest) resumeTheme.value = theme
}, {immediate: true})
</script>

<style scoped>
.personal-home {
  min-height: 100vh;
  isolation: isolate;
  color: #29282c;
  background:
    radial-gradient(circle at 8% 7%, rgba(255, 221, 226, 0.78), transparent 24%),
    radial-gradient(circle at 94% 20%, rgba(255, 238, 205, 0.62), transparent 23%),
    #f7f7f8;
}

button { cursor: pointer; font: inherit; }
.personal-main { box-sizing: border-box; width: min(100%, 1680px); margin: 0 auto; padding: 0 28px 150px; }
.home-lobby { display: block; scroll-margin-top: 90px; }
.home-banner-card { position: relative; left: 50%; width: 100vw; height: clamp(440px, 76svh, 780px); overflow: hidden; margin-left: -50vw; border: 0; border-radius: 0; background: #242731; isolation: isolate; }
.home-banner-media,
.home-banner-fallback,
.home-banner-poster,
.home-banner-shade { position: absolute; inset: 0; width: 100%; height: 100%; }
.home-banner-media { z-index: 0; filter: saturate(0.94) contrast(1.02); transform: scale(1.015); }
.home-banner-media :deep(> div) { background: transparent !important; }
.home-banner-media :deep(> div),
.home-banner-media :deep(img),
.home-banner-media :deep(video) { width: 100% !important; height: 100% !important; object-fit: cover; }
.home-banner-fallback { z-index: 1; overflow: hidden; background: radial-gradient(circle at 72% 24%, rgba(232, 87, 105, 0.58), transparent 23%), radial-gradient(circle at 58% 74%, rgba(102, 121, 190, 0.52), transparent 29%), radial-gradient(circle at 92% 72%, rgba(239, 174, 104, 0.28), transparent 22%), linear-gradient(138deg, #3c4354 0%, #242936 48%, #181b24 100%); transition: opacity 280ms ease; pointer-events: none; }
.home-banner-fallback.is-hidden { opacity: 0; }
.home-banner-poster { z-index: 2; object-fit: cover; opacity: 0; filter: saturate(0.94) contrast(1.02); transform: scale(1.015); transition: opacity 280ms ease; pointer-events: none; }
.home-banner-poster.is-ready { opacity: 1; }
.home-banner-poster.is-hidden { opacity: 0; }
.home-banner-fallback::after { position: absolute; top: 12%; right: 19%; width: 30vw; min-width: 360px; aspect-ratio: 1; border-radius: 46% 54% 62% 38% / 42% 38% 62% 58%; background: rgba(255, 157, 173, 0.16); filter: blur(55px); content: ''; transform: rotate(-18deg); }
.banner-orbit { position: absolute; border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 50%; }
.banner-orbit-one { top: -210px; right: -80px; width: 560px; height: 560px; }
.banner-orbit-two { right: 20px; bottom: -200px; width: 370px; height: 370px; }
.banner-disc { position: absolute; top: 80px; right: 12%; width: 210px; aspect-ratio: 1; border-radius: 50%; background: repeating-radial-gradient(circle, #292d37 0 5px, #15171c 6px 12px); box-shadow: 0 35px 70px rgba(0, 0, 0, 0.36); }
.home-banner-shade { z-index: 3; background: linear-gradient(90deg, rgba(14, 15, 19, 0.76) 0%, rgba(14, 15, 19, 0.46) 35%, rgba(14, 15, 19, 0.06) 76%), linear-gradient(0deg, rgba(14, 15, 19, 0.44) 18%, transparent 62%); }
.home-banner-content { position: absolute; inset: 0 auto 0 50%; z-index: 4; display: flex; box-sizing: border-box; width: min(100%, 1680px); flex-direction: column; justify-content: flex-end; padding: clamp(40px, 5vw, 72px) clamp(28px, 5vw, 72px) clamp(72px, 9vh, 104px); color: #fff; transform: translateX(-50%); }
.home-banner-kicker { margin-bottom: 12px; color: rgba(255, 188, 199, 0.92); font-size: 11px; font-weight: 900; letter-spacing: 0.2em; }
.home-banner-card h1 { max-width: 680px; margin: 22px 0 0; font-size: clamp(42px, 5.4vw, 76px); font-weight: 920; letter-spacing: -0.065em; line-height: 0.98; text-wrap: balance; text-shadow: 0 5px 22px rgba(0, 0, 0, 0.28); }
.home-banner-description { max-width: 560px; margin: 24px 0 0; color: rgba(255, 255, 255, 0.7); font-size: 13px; font-weight: 580; line-height: 1.75; }

.personal-now-card { --station-accent: 201, 98, 116; position: relative; z-index: 3; display: flex; min-width: 0; min-height: 280px; overflow: hidden; flex-direction: column; padding: 28px 30px 26px; color: #29272d; border: 1px solid rgba(255, 255, 255, 0.94); border-radius: 28px; background: radial-gradient(circle at 92% 9%, rgba(var(--station-accent), 0.19), transparent 42%), radial-gradient(circle at 86% 110%, rgba(var(--station-accent), 0.1), transparent 45%), #fbf9f9; box-shadow: 0 16px 44px rgba(66, 50, 54, 0.09); isolation: isolate; }
.personal-now-card::after { position: absolute; top: -176px; right: -105px; z-index: -1; width: 390px; aspect-ratio: 1; border: 1px solid rgba(var(--station-accent), 0.1); border-radius: 50%; box-shadow: 0 0 0 52px rgba(var(--station-accent), 0.035), 0 0 0 105px rgba(var(--station-accent), 0.025); content: ''; pointer-events: none; }
.personal-now-heading { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.personal-now-heading p { margin: 0 0 5px; color: #c54254; font-size: 10px; font-weight: 800; letter-spacing: 0.19em; }
.personal-now-heading h2 { margin: 0; font-size: 26px; font-weight: 850; letter-spacing: -0.04em; }
.personal-now-heading > span { display: flex; align-items: center; gap: 8px; margin-top: 2px; padding: 8px 11px; color: #69616a; border: 1px solid rgba(68, 53, 57, 0.07); border-radius: 999px; background: rgba(255, 255, 255, 0.7); font-size: 11px; font-weight: 700; flex: none; }
.personal-now-heading > span i { width: 6px; aspect-ratio: 1; border-radius: 50%; background: #d46676; box-shadow: 0 0 0 4px rgba(212, 102, 118, 0.12); }
.personal-station-content { position: relative; z-index: 1; min-width: 0; margin-top: auto; padding-top: 20px; border-top: 1px solid rgba(67, 49, 55, 0.1); }
.personal-station-feature { display: grid; width: 100%; min-width: 0; align-items: center; grid-template-columns: 96px minmax(0, 1fr) auto; gap: 17px; text-align: left; }
.personal-station-cover { display: block; width: 96px; aspect-ratio: 1; overflow: hidden; padding: 0; border: 1px solid rgba(255, 255, 255, 0.76); border-radius: 20px; background: rgba(255, 255, 255, 0.7); box-shadow: 0 12px 30px rgba(72, 52, 57, 0.15); transition: transform 260ms ease, box-shadow 260ms ease; }
.personal-station-cover :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.personal-station-copy { min-width: 0; }
.personal-station-copy small,
.personal-station-copy strong,
.personal-station-copy > span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.personal-station-copy small { color: #ba4c5e; font-size: 11px; font-weight: 750; }
.personal-station-copy strong { margin-top: 6px; font-size: clamp(18px, 1.5vw, 22px); font-weight: 800; letter-spacing: -0.035em; }
.personal-station-copy > span { margin-top: 6px; color: #716972; font-size: 13px; line-height: 1.5; }
.personal-station-action { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 8px; padding: 0 17px; color: #fff; border: 0; border-radius: 999px; background: #29272d; box-shadow: 0 8px 22px rgba(56, 42, 46, 0.16); transition: transform 220ms ease, background 220ms ease; }
.personal-station-action b { font-size: 12px; font-weight: 720; white-space: nowrap; }
.personal-station-play { display: grid; width: 18px; height: 18px; place-items: center; font-style: normal; }
.personal-station-play :deep(svg) { width: 18px; height: 18px; }
.personal-station-cover:hover { transform: translateY(-2px); box-shadow: 0 16px 32px rgba(72, 52, 57, 0.18); }
.personal-station-action:hover { background: #bc4d61; transform: translateY(-2px); }
.personal-station-empty { display: grid; min-height: 112px; place-items: center; color: #716972; font-size: 13px; }

.lofi-resume { --resume-base: 49, 57, 82; --resume-accent: 92, 105, 148; --resume-glow: 152, 169, 213; position: relative; display: grid; min-height: 280px; overflow: hidden; align-items: center; grid-template-columns: minmax(0, 1fr); gap: 22px; margin-top: 0; padding: 28px; color: #fff; border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 28px; background: rgb(var(--resume-base)); box-shadow: 0 16px 44px rgba(45, 36, 35, 0.12); isolation: isolate; min-width: 0; align-content: center; }
.lofi-resume::after { position: absolute; inset: 0; z-index: 1; opacity: 0.09; background-image: linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px); background-size: 12px 12px; content: ''; mix-blend-mode: soft-light; pointer-events: none; }
.lofi-resume-fluid { position: absolute; inset: -42%; z-index: 0; overflow: hidden; background: radial-gradient(circle at 48% 42%, rgba(var(--resume-accent), 0.5), transparent 45%), linear-gradient(132deg, rgb(var(--resume-base)) 8%, rgba(var(--resume-accent), 0.94) 54%, rgb(var(--resume-base)) 100%); filter: saturate(1.16); pointer-events: none; transform: translate3d(0, 0, 0) scale(1.02); }
.lofi-resume-fluid > i { position: absolute; display: block; border-radius: 50%; filter: blur(42px); opacity: 0.74; will-change: transform; }
.lofi-resume-fluid .is-primary { top: 4%; left: 3%; width: 48%; height: 58%; background: rgba(var(--resume-glow), 0.78); animation: resume-fluid-primary 18s ease-in-out infinite alternate; }
.lofi-resume-fluid .is-accent { right: 0; bottom: 3%; width: 54%; height: 56%; background: rgba(var(--resume-accent), 0.9); animation: resume-fluid-accent 22s ease-in-out infinite alternate-reverse; }
.lofi-resume-fluid .is-glow { top: 22%; right: 22%; width: 34%; height: 45%; background: rgba(var(--resume-glow), 0.62); mix-blend-mode: screen; animation: resume-fluid-glow 15s ease-in-out infinite alternate; }
.lofi-resume-haze { position: absolute; inset: 0; z-index: 1; background: linear-gradient(102deg, rgba(10, 12, 18, 0.58) 0%, rgba(14, 16, 23, 0.3) 52%, rgba(11, 13, 20, 0.38) 100%), linear-gradient(0deg, rgba(8, 10, 15, 0.3), transparent 70%); pointer-events: none; }
.lofi-resume-primary { position: relative; z-index: 2; display: grid; min-width: 0; align-items: center; grid-template-columns: 112px minmax(0, 1fr) 48px; gap: 18px; }
.lofi-resume-cover { position: relative; display: block; width: 112px; aspect-ratio: 1; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 22px; background: rgba(255, 255, 255, 0.12); box-shadow: 0 20px 42px rgba(10, 9, 12, 0.32); }
.lofi-resume-cover :deep(> div),
.lofi-resume-cover :deep(img) { width: 100% !important; height: 100% !important; object-fit: cover; }
.lofi-resume-cover > i { position: absolute; top: 50%; left: 50%; width: 18px; aspect-ratio: 1; border: 5px solid rgba(255, 255, 255, 0.22); border-radius: 50%; box-shadow: 0 0 0 1px rgba(20, 18, 22, 0.14); transform: translate(-50%, -50%); }
.lofi-resume-copy { min-width: 0; }
.lofi-resume-copy small,
.lofi-resume-copy strong,
.lofi-resume-copy em,
.lofi-resume-copy b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lofi-resume-copy small { color: rgba(255, 255, 255, 0.75); font-size: 10px; font-weight: 700; letter-spacing: 0.1em; }
.lofi-resume-copy h2 { margin: 8px 0 0; font-size: 27px; font-weight: 800; letter-spacing: -0.03em; }
.lofi-resume-copy strong { margin-top: 10px; font-size: 15px; font-weight: 700; }
.lofi-resume-copy em { margin-top: 5px; color: rgba(255, 255, 255, 0.8); font-size: 13px; font-style: normal; line-height: 1.5; }
.lofi-resume-copy b { margin-top: 7px; color: rgba(255, 255, 255, 0.72); font-size: 12px; font-weight: 500; }
.lofi-progress { display: block; height: 3px; margin-top: 16px; overflow: hidden; border-radius: 999px; background: rgba(255, 255, 255, 0.18); }
.lofi-progress i { display: block; height: 100%; border-radius: inherit; background: #fff; box-shadow: 0 0 12px rgba(255, 255, 255, 0.55); }
.lofi-resume-play { display: grid; width: 48px; aspect-ratio: 1; place-items: center; padding: 0; color: #302d31; border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 50%; background: rgba(255, 255, 255, 0.9); box-shadow: 0 12px 30px rgba(10, 9, 12, 0.2); font-size: 14px; font-weight: 850; backdrop-filter: blur(12px); transition: transform 220ms ease, background 220ms ease; }
.lofi-resume-play svg { width: 20px; height: 20px; }
.lofi-resume-play:hover { background: #fff; transform: scale(1.06); }
.lofi-resume-next { position: relative; z-index: 2; align-self: stretch; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.16); }
.lofi-resume-next > p { margin: 2px 0 7px; color: rgba(255, 255, 255, 0.72); font-size: 12px; font-weight: 500; letter-spacing: normal; }

.personal-section { margin-top: 64px; }
.personal-section-heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
.personal-section-heading p { margin: 0 0 8px; color: #c54254; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; }
.personal-section-heading h2 { margin: 0; font-size: clamp(26px, 2.4vw, 32px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.25; }
.personal-section-heading > span { max-width: 390px; color: #72727a; font-size: 13px; line-height: 1.6; }
.personal-section-heading > button { padding: 10px 15px; color: #65656b; border: 1px solid rgba(41, 40, 44, 0.08); border-radius: 999px; background: #fff; font-size: 13px; font-weight: 650; display: inline-flex; align-items: center; gap: 8px; }
.personal-scene-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.personal-scene-grid > button { position: relative; display: grid; min-height: 180px; overflow: hidden; align-content: space-between; padding: 19px; text-align: left; color: #fff; border: 0; border-radius: 22px; isolation: isolate; transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 320ms ease; }
.personal-scene-grid > button:hover { box-shadow: 0 24px 50px rgba(43, 35, 34, 0.16); transform: translateY(-3px); }
.scene-familiar { background: linear-gradient(145deg, #655058, #352f35); }
.scene-explore { background: linear-gradient(145deg, #e16d7b, #b34f62); }
.scene-focus { background: linear-gradient(145deg, #66839b, #344a5c); }
.scene-exercise { background: linear-gradient(145deg, #d69a58, #9a6537); }
.scene-night { background: linear-gradient(145deg, #514f79, #292941); }
.personal-scene-index { color: rgba(255, 255, 255, 0.56); font-size: 11px; font-weight: 850; }
.personal-scene-icon { position: absolute; top: 40px; right: -14px; z-index: -1; color: rgba(255, 255, 255, 0.11); font-size: 130px; font-weight: 300; line-height: 1; }
.personal-scene-copy strong,
.personal-scene-copy small { display: block; }
.personal-scene-copy strong { font-size: 20px; font-weight: 880; letter-spacing: -0.03em; }
.personal-scene-copy small { margin-top: 7px; color: rgba(255, 255, 255, 0.8); font-size: 13px; line-height: 1.5; }
.personal-scene-grid > button > i { position: absolute; top: 18px; right: 18px; color: rgba(255, 255, 255, 0.75); font-size: 14px; font-style: normal; }
.personal-spinner { width: 14px; height: 14px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: personal-spin 700ms linear infinite; }

.personal-daily-layout { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.5fr); gap: 18px; }
.personal-song-panel { padding: 18px; border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 32px; background: rgba(255, 255, 255, 0.68); box-shadow: 0 22px 58px rgba(49, 41, 38, 0.06); }
.personal-song-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 10px; }
.personal-taste-card { padding: 30px 26px; color: #fff; border-radius: 32px; background: #29282c; box-shadow: 0 22px 58px rgba(38, 32, 31, 0.17); }
.personal-taste-card > p { margin: 0; color: #ff8d9b; font-size: 11px; font-weight: 900; letter-spacing: 0.2em; }
.personal-taste-card h3 { margin: 17px 0 0; font-size: 26px; font-weight: 900; letter-spacing: -0.045em; }
.personal-taste-card > span { display: block; margin-top: 10px; color: rgba(255, 255, 255, 0.75); font-size: 13px; line-height: 1.65; }
.personal-taste-list { margin-top: 24px; }
.personal-taste-list button { display: grid; width: 100%; align-items: center; grid-template-columns: 24px minmax(0, 1fr) auto 16px; gap: 8px; padding: 12px 0; text-align: left; color: #fff; border: 0; border-top: 1px solid rgba(255, 255, 255, 0.09); background: transparent; }
.personal-taste-list button > span { color: #ff8d9b; font-size: 11px; font-weight: 850; }
.personal-taste-list strong { overflow: hidden; font-size: 15px; font-weight: 790; text-overflow: ellipsis; white-space: nowrap; }
.personal-taste-list small { color: rgba(255, 255, 255, 0.65); font-size: 11px; letter-spacing: 0.08em; }
.personal-taste-list i { color: rgba(255, 255, 255, 0.55); font-size: 11px; font-style: normal; }
.personal-login-link { margin-top: 17px; padding: 10px 13px; color: #29282c; border: 0; border-radius: 999px; background: #fff; font-size: 13px; font-weight: 780; }

.personal-playlist-grid,
.personal-playlist-skeleton { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; }
.personal-playlist-skeleton span { aspect-ratio: 1 / 1.18; border-radius: 24px; background: #e8e8e9; animation: personal-pulse 1.3s ease-in-out infinite; }
.personal-song-skeleton { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.personal-song-skeleton span { height: 74px; border-radius: 18px; background: #ededee; animation: personal-pulse 1.3s ease-in-out infinite; }
.personal-empty { display: grid; min-height: 160px; place-items: center; color: #72727a; font-size: 13px; }
.personal-collection-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.personal-collection-list > button { display: grid; min-width: 0; align-items: center; grid-template-columns: 82px minmax(0, 1fr) 20px; gap: 14px; padding: 10px; text-align: left; border: 1px solid rgba(41, 40, 44, 0.06); border-radius: 22px; background: rgba(255, 255, 255, 0.7); }
.personal-collection-list :deep(img) { width: 82px; aspect-ratio: 1; object-fit: cover; border-radius: 16px; }
.personal-collection-list button > span { min-width: 0; }
.personal-collection-list small,
.personal-collection-list strong,
.personal-collection-list i { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.personal-collection-list small { color: #e85769; font-size: 10px; font-weight: 850; letter-spacing: 0.1em; }
.personal-collection-list strong { margin-top: 6px; font-size: 15px; font-weight: 820; }
.personal-collection-list i { margin-top: 5px; color: #72727a; font-size: 12px; font-style: normal; }
.personal-collection-list b { color: #aaaab0; font-size: 12px; }
.personal-load-note { margin: 36px 0 0; color: #b46973; text-align: center; font-size: 13px; }
.personal-footer { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 72px; padding: 26px 0 90px; border-top: 1px solid rgba(41, 40, 44, 0.08); }
.personal-footer div { display: flex; align-items: center; gap: 14px; }
.personal-footer strong { font-size: 13px; font-weight: 900; letter-spacing: 0.18em; }
.personal-footer span { color: #a1a1a7; font-size: 12px; }
.personal-footer button { padding: 0; color: #797980; border: 0; background: transparent; font-size: 12px; font-weight: 760; }

@keyframes personal-spin { to { transform: rotate(360deg); } }
@keyframes personal-pulse { 50% { opacity: 0.48; } }
@keyframes resume-fluid-primary {
  0% { transform: translate3d(-7%, -4%, 0) scale(0.94) rotate(-7deg); }
  52% { transform: translate3d(28%, 14%, 0) scale(1.14) rotate(8deg); }
  100% { transform: translate3d(12%, 32%, 0) scale(1.02) rotate(18deg); }
}
@keyframes resume-fluid-accent {
  0% { transform: translate3d(9%, 11%, 0) scale(1.08) rotate(6deg); }
  48% { transform: translate3d(-31%, -9%, 0) scale(0.94) rotate(-13deg); }
  100% { transform: translate3d(-12%, -28%, 0) scale(1.16) rotate(-4deg); }
}
@keyframes resume-fluid-glow {
  0% { transform: translate3d(18%, -18%, 0) scale(0.86); opacity: 0.46; }
  55% { transform: translate3d(-27%, 22%, 0) scale(1.25); opacity: 0.78; }
  100% { transform: translate3d(8%, 34%, 0) scale(1.02); opacity: 0.56; }
}

@media (prefers-reduced-motion: reduce) {
  .lofi-resume-fluid > i { animation: none !important; }
}

@media (max-width: 1080px) {
  .personal-scene-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 820px) {
  .personal-main { padding: 24px 18px 130px; }
  .home-banner-card { left: auto; width: 100%; height: clamp(380px, 70svh, 600px); min-height: 380px; margin-left: 0; border: 1px solid rgba(255, 255, 255, 0.72); border-radius: 30px; box-shadow: 0 26px 70px rgba(43, 32, 32, 0.15); }
  .home-banner-shade { background: linear-gradient(90deg, rgba(14, 15, 19, 0.78) 0%, rgba(14, 15, 19, 0.45) 52%, rgba(14, 15, 19, 0.12) 100%), linear-gradient(0deg, rgba(14, 15, 19, 0.58), transparent 64%); }
  .home-banner-content { inset: 0; width: min(100%, 760px); padding: clamp(30px, 6vw, 50px); transform: none; }
  .lofi-resume { grid-template-columns: 1fr; gap: 24px; }
  .lofi-resume-next { padding: 20px 0 0; border-top: 1px solid rgba(255, 255, 255, 0.16); border-left: 0; }
  .personal-scene-grid { grid-template-columns: repeat(2, 1fr); }
  .personal-daily-layout { grid-template-columns: 1fr; }
  .personal-collection-list { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 560px) {
  .personal-main { padding: 13px 13px 115px; }
  .home-banner-card { height: clamp(360px, 65svh, 510px); min-height: 360px; border-radius: 26px; }
  .home-banner-content { padding: 25px; }
  .home-banner-card h1 { font-size: 42px; }
  .personal-now-card { min-height: 0; padding: 23px 18px 20px; border-radius: 26px; }
  .personal-now-heading h2 { font-size: 24px; }
  .personal-now-heading > span { padding: 7px 9px; font-size: 11px; }
  .personal-station-content { margin-top: 22px; padding-top: 18px; }
  .personal-station-feature { grid-template-columns: 72px minmax(0, 1fr) 42px; gap: 12px; }
  .personal-station-cover { width: 72px; border-radius: 16px; }
  .personal-station-copy strong { font-size: 17px; }
  .personal-station-action b { display: none; }
  .personal-station-action { width: 42px; min-height: 42px; padding: 0; }
  .personal-station-play { width: 18px; }
  .lofi-resume { min-height: 0; gap: 20px; padding: 20px 17px; border-radius: 24px; }
  .lofi-resume-primary { grid-template-columns: 88px minmax(0, 1fr) 44px; gap: 13px; }
  .lofi-resume-cover { width: 88px; border-radius: 19px; }
  .lofi-resume-cover > i { width: 12px; border-width: 3px; }
  .lofi-resume-copy h2 { font-size: 25px; }
  .lofi-resume-copy strong { margin-top: 7px; font-size: 14px; }
  .lofi-progress { margin-top: 11px; }
  .lofi-resume-play { width: 44px; font-size: 11px; }
  .lofi-resume-next { padding-top: 16px; }
  .personal-section { margin-top: 70px; }
  .personal-section-heading { align-items: start; flex-direction: column; }
  .personal-section-heading h2 { font-size: 26px; }
  .personal-scene-grid { display: flex; margin-right: -13px; overflow-x: auto; gap: 9px; padding-right: 13px; padding-bottom: 12px; scrollbar-width: none; }
  .personal-scene-grid > button { width: 66vw; min-height: 176px; flex: none; }
  .personal-song-panel { padding: 9px 3px; border-radius: 25px; }
  .personal-song-grid,
  .personal-song-skeleton { grid-template-columns: 1fr; }
  .personal-taste-card { padding: 25px 21px; border-radius: 27px; }
  .personal-playlist-grid,
  .personal-playlist-skeleton { display: flex; margin-right: -13px; overflow-x: auto; gap: 14px; padding-right: 13px; padding-bottom: 13px; scrollbar-width: none; }
  .personal-playlist-grid :deep(.playlist-card),
  .personal-playlist-skeleton span { display: block !important; width: 66vw; flex: none; }
  .personal-collection-list { grid-template-columns: 1fr; }
  .personal-footer,
  .personal-footer div { align-items: start; flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
}

.home-listening-grid { display: grid; gap: 22px; margin-top: 28px; align-items: stretch; }
.personal-station-description { position: relative; z-index: 1; margin: 12px 0 0; color: #726b73; font-size: 13px; line-height: 1.6; }
.resume-queue-row { display: grid; align-items: center; grid-template-columns: 24px minmax(0, 1fr) 36px; gap: 10px; padding: 6px 0; }
.resume-queue-row > span { color: rgba(255, 255, 255, 0.65); font-size: 11px; }
.resume-queue-row > div { min-width: 0; }
.resume-queue-row strong, .resume-queue-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.resume-queue-row strong { font-size: 14px; font-weight: 600; }
.resume-queue-row small { color: rgba(255, 255, 255, 0.72); font-size: 12px; }
.resume-queue-row button { display: grid; width: 36px; height: 36px; place-items: center; padding: 0; border: 0; border-radius: 50%; color: #fff; background: rgba(255, 255, 255, 0.1); }
.personal-song-grid :deep(.song-title) { font-size: 15px; line-height: 1.4; }
.personal-song-grid :deep(.song-artist) { font-size: 13px; color: #72727a; line-height: 1.5; }
.personal-playlist-grid :deep(.playlist-title) { font-size: 15px; }
.personal-playlist-grid :deep(.playlist-meta) { font-size: 13px; color: #72727a; }
.personal-home button:focus-visible { outline: 2px solid #c54254; outline-offset: 4px; }
.personal-home button:disabled { cursor: wait; }
.personal-load-note button { border: 0; background: transparent; color: #c54254; text-decoration: underline; }
@media (min-width: 1100px) { .home-listening-grid.has-resume { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
@media (min-width: 821px) and (max-width: 1200px) { .personal-song-grid { grid-template-columns: 1fr; } }
</style>
