<template>
  <div class="personal-home">
    <AppHeader />

    <main class="personal-main" data-route-motion-root>
      <section id="home-top" class="home-lobby">
        <article class="home-banner-card" :aria-label="bannerHero.title || '首页 Banner'">
          <div v-if="bannerHero.media" class="home-banner-media">
            <SmartMedia
              :src="bannerHero.media"
              :media-type="bannerHero.mediaType"
              :alt="bannerHero.title ? `${bannerHero.title} 首页 Banner` : 'Aurora 首页 Banner'"
              :image-width="1440"
              :lock-muted="true"
              img-loading="eager"
              fetch-priority="high"
              sizes="(min-width: 1376px) 1320px, calc(100vw - 56px)"
            />
          </div>
          <div v-else class="home-banner-fallback" aria-hidden="true">
            <span class="banner-orbit banner-orbit-one" />
            <span class="banner-orbit banner-orbit-two" />
            <span class="banner-disc" />
          </div>
          <div class="home-banner-shade" />
          <div v-if="bannerHero.title || bannerHero.subtitle" class="home-banner-content">
            <h1 v-if="bannerHero.title">{{ bannerHero.title }}</h1>
            <p v-if="bannerHero.subtitle" class="home-banner-description">{{ bannerHero.subtitle }}</p>
          </div>
        </article>

        <aside class="personal-now-card" aria-label="你的私人电台">
          <SmartMedia
            v-if="stationSong"
            :src="stationSong.cover || stationSong.al?.picUrl || stationSong.album?.picUrl"
            alt=""
            :image-width="720"
            class="personal-station-ambient"
            aria-hidden="true"
          />
          <span class="personal-station-scrim" aria-hidden="true" />

          <div class="personal-now-heading">
            <div><p>AURORA RADIO</p><h2>{{ userStore.isLoggedIn ? '私人频率' : '先听这些' }}</h2></div>
            <span><i /> {{ userStore.isLoggedIn ? '已为你调频' : '游客试听' }}</span>
          </div>

          <div class="personal-station-content">
            <button v-if="stationSong" class="personal-station-feature" type="button" @click="playStationSong">
              <span class="personal-station-cover"><SmartMedia :src="stationSong.cover || stationSong.al?.picUrl || stationSong.album?.picUrl" :alt="`${stationSong.name}封面`" :image-width="320" sizes="112px" /></span>
              <span class="personal-station-copy">
                <small>为你选出的这一首</small><strong>{{ stationSong.name }}</strong><span>{{ formatArtists(stationSong) }}</span>
              </span>
              <span class="personal-station-action">
                <i class="personal-station-play" aria-hidden="true">▶</i>
                <b>播放电台</b>
              </span>
            </button>
            <div v-else class="personal-station-empty">正在准备你的第一首歌…</div>

            <div v-if="stationQueue.length > 1" class="personal-up-next">
              <p>接下来</p>
              <div class="personal-up-next-list">
                <button v-for="(song, index) in stationQueue.slice(1, 4)" :key="song.id" type="button" @click="playStationSong(song, index + 1)">
                  <span>{{ String(index + 2).padStart(2, '0') }}</span>
                  <span><strong>{{ song.name }}</strong><small>{{ formatArtists(song) }}</small></span>
                  <i aria-hidden="true">↗</i>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section v-if="resumeSong" class="lofi-resume" aria-label="继续播放">
        <SmartMedia
          v-if="resumeCover"
          :src="resumeCover"
          :alt="`${resumeSong.name}氛围背景`"
          :image-width="240"
          class="lofi-resume-backdrop"
        />
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
            <em>{{ formatArtists(resumeSong) }}</em>
            <span class="lofi-progress"><i :style="{width: `${resumeProgress}%`}" /></span>
            <b>{{ resumeProgress ? `已播放 ${Math.round(resumeProgress)}%` : '从这里继续你的声音' }}</b>
          </div>
          <button type="button" class="lofi-resume-play" :aria-label="playerStore.isPlaying && resumeIsCurrent ? '暂停' : '继续播放'" @click="playResumeSong()">
            {{ playerStore.isPlaying && resumeIsCurrent ? 'Ⅱ' : '▶' }}
          </button>
        </div>

        <div v-if="resumeQueue.length > 1" class="lofi-resume-next">
          <p>接下来</p>
          <button v-for="(song, index) in resumeQueue.slice(1, 4)" :key="`${song.id}-${index}`" type="button" @click="playResumeSong(song)">
            <span>{{ String(index + 2).padStart(2, '0') }}</span>
            <strong>{{ song.name }}</strong>
            <small>{{ formatArtists(song) }}</small>
            <i aria-hidden="true">▶</i>
          </button>
        </div>
      </section>
      <section v-else class="lofi-resume lofi-resume-empty" aria-label="继续播放准备中">
        <div class="lofi-resume-haze" />
        <div><small>CONTINUE LISTENING</small><h2>正在准备你的播放记录…</h2></div>
      </section>

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
          <button v-if="dailySongs.length" type="button" @click="playDailySongs">全部播放 →</button>
        </div>

        <div class="personal-daily-layout">
          <article class="personal-song-panel">
            <div v-if="loading.page && !dailySongs.length" class="personal-song-skeleton"><span v-for="index in 6" :key="index" /></div>
            <div v-else-if="dailySongs.length" class="personal-song-grid">
              <HomeSongRow
                v-for="(song, index) in dailySongs.slice(0, 8)"
                :key="song.id"
                :song="song"
                :index="index"
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
        <div v-if="loading.page && !dailyPlaylists.length" class="personal-playlist-skeleton"><span v-for="index in 4" :key="index" /></div>
        <div v-else class="personal-playlist-grid">
          <HomePlaylistCard v-for="item in dailyPlaylists.slice(0, 4)" :key="item.id" :item="item" @open="openPlaylist" />
        </div>
      </section>

      <section v-if="recentCollections.length" class="personal-section personal-recent-collections">
        <div class="personal-section-heading">
          <div><p>RECENTLY OPENED</p><h2>最近打开过</h2></div>
        </div>
        <div class="personal-collection-list">
          <button v-for="item in recentCollections" :key="`${item.type}-${item.id}`" type="button" @click="openRecentCollection(item)">
            <SmartMedia :src="item.cover" :alt="`${item.name}封面`" :image-width="220" sizes="92px" />
            <span><small>{{ item.type === 'album' ? 'ALBUM' : 'PLAYLIST' }}</small><strong>{{ item.name }}</strong><i>{{ item.meta }}</i></span>
            <b aria-hidden="true">↗</b>
          </button>
        </div>
      </section>

      <p v-if="error" class="personal-load-note">{{ error }}</p>

      <footer class="personal-footer">
        <div><strong>AURORA</strong><span>首页属于你，发现页属于整个音乐世界。</span></div>
        <button type="button" @click="router.push({name: 'releaseNotes'})">查看版本更新</button>
      </footer>
    </main>

    <ModalRouterView content-width="85vw" content-height="80vh" />
  </div>
</template>

<script setup>
defineOptions({name: 'HomePage'})

import {computed, nextTick, onActivated, onMounted, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import AppHeader from '@/components/appHeader/AppHeader.vue'
import HomePlaylistCard from '@/components/home/HomePlaylistCard.vue'
import HomeSongRow from '@/components/home/HomeSongRow.vue'
import ModalRouterView from '@/components/modalRouterView/ModalRouterView.vue'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import {useHomeData} from '@/composables/useHomeData.js'
import {usePersonalHomeData} from '@/composables/usePersonalHomeData.js'
import {useCounterStore} from '@/stores/userStores.js'
import {usePlayerStore} from '@/stores/playerStore.js'
import {openLoginDialog} from '@/utils/loginDialog.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'
import {
  consumeLatestPendingPlaylistHeroTransition,
  playPlaylistHeroEnter,
  setPendingPlaylistHeroTransition,
} from '@/utils/playlistFlipHero.js'

const router = useRouter()
const route = useRoute()
const userStore = useCounterStore()
const playerStore = usePlayerStore()
const {hero: bannerHero, loadHomeBanner} = useHomeData(userStore)
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
const continueSongs = computed(() => recentSongs.value.length ? recentSongs.value : playerStore.playQueue)
const resumeQueue = computed(() => {
  const candidates = [
    ...(playerStore.currentSong?.id ? [playerStore.currentSong] : []),
    ...continueSongs.value,
    ...stationQueue.value,
  ]
  const seen = new Set()
  return candidates.filter(song => {
    const id = String(song?.id || '')
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
})
const resumeSong = computed(() => resumeQueue.value[0] || null)
const resumeCover = computed(() => resumeSong.value?.cover || resumeSong.value?.al?.picUrl || resumeSong.value?.album?.picUrl || '')
const resumeIsCurrent = computed(() => Boolean(resumeSong.value?.id && String(resumeSong.value.id) === String(playerStore.currentSong?.id)))
const resumeProgress = computed(() => {
  if (!resumeIsCurrent.value) return 0
  const duration = Number(playerStore.durationMs || 0)
  if (!duration) return 0
  return Math.min(100, Math.max(0, Number(playerStore.currentTimeMs || 0) / duration * 100))
})
function formatArtists(song) {
  const list = song?.ar || song?.artists || []
  return list.map(item => item?.name || item).filter(Boolean).join(' / ') || '未知艺人'
}

async function playStationSong(song = stationSong.value, index = 0) {
  if (!song) return
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
  await playSongWithQueue(song, dailySongs.value, index)
}

async function playDailySongs() {
  if (dailySongs.value.length) await playSongWithQueue(dailySongs.value[0], dailySongs.value, 0)
}

async function playResumeSong(song = resumeSong.value) {
  if (!song) return
  const isCurrent = String(song.id) === String(playerStore.currentSong?.id)
  if (isCurrent && playerStore.currentSong?.url) {
    playerStore.setPlaying(!playerStore.isPlaying)
    return
  }
  const index = Math.max(0, resumeQueue.value.findIndex(item => String(item.id) === String(song.id)))
  await playSongWithQueue(song, resumeQueue.value, index)
}

async function openPlaylist(item, event) {
  const id = Number(item?.id || 0)
  if (!id) return
  const card = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  const cover = card?.querySelector('[data-playlist-hero-cover]')
  if (cover instanceof HTMLElement) {
    setPendingPlaylistHeroTransition(id, {
      coverRect: cover.getBoundingClientRect(),
      coverSrc: item.picUrl || item.coverImgUrl || '',
      playlistName: item.name || '',
    })
  }
  await router.push({name: 'playlistDetail', query: {id}})
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
  if (item.type === 'album') router.push({name: 'albumDetailPage', query: {id: item.id}})
  else router.push({name: 'playlistDetailPage', query: {id: item.id}})
}

function openStyle(tag) {
  router.push({name: 'styleDetailPage', params: {id: tag.id}})
}

function openDiscover() {
  router.push({name: 'discover', query: {tab: 'styles'}})
}

onMounted(() => {
  void runPlaylistHeroReturn()
  void loadHomeBanner()
  void loadPersonalHome(userStore.isLoggedIn)
})
onActivated(() => {
  if (route.name !== 'home') return
  requestAnimationFrame(() => window.scrollTo({left: 0, top: 0, behavior: 'auto'}))
})
watch(() => route.name, name => {
  if (name === 'home') void runPlaylistHeroReturn()
})
watch(() => userStore.isLoggedIn, value => loadPersonalHome(value))
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
.personal-main { box-sizing: border-box; width: min(100%, 1376px); margin: 0 auto; padding: 34px 28px 150px; }
.home-lobby { display: block; scroll-margin-top: 90px; }
.home-banner-card { position: relative; width: 100%; min-height: clamp(470px, 46vw, 620px); overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.72); border-radius: 36px; background: #d4d4d8; box-shadow: 0 32px 90px rgba(43, 32, 32, 0.17); isolation: isolate; }
.home-banner-media,
.home-banner-fallback,
.home-banner-shade { position: absolute; inset: 0; width: 100%; height: 100%; }
.home-banner-media { z-index: 0; filter: saturate(0.92); }
.home-banner-media :deep(> div),
.home-banner-media :deep(img),
.home-banner-media :deep(video) { width: 100% !important; height: 100% !important; object-fit: cover; }
.home-banner-fallback { z-index: 0; overflow: hidden; background: linear-gradient(145deg, #596273, #252934 58%, #1b1d24); }
.banner-orbit { position: absolute; border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 50%; }
.banner-orbit-one { top: -210px; right: -80px; width: 560px; height: 560px; }
.banner-orbit-two { right: 20px; bottom: -200px; width: 370px; height: 370px; }
.banner-disc { position: absolute; top: 80px; right: 12%; width: 210px; aspect-ratio: 1; border-radius: 50%; background: repeating-radial-gradient(circle, #292d37 0 5px, #15171c 6px 12px); box-shadow: 0 35px 70px rgba(0, 0, 0, 0.36); }
.home-banner-shade { z-index: 1; background: linear-gradient(90deg, rgba(14, 15, 19, 0.78) 0%, rgba(14, 15, 19, 0.48) 38%, rgba(14, 15, 19, 0.08) 72%), linear-gradient(0deg, rgba(14, 15, 19, 0.54), transparent 58%); }
.home-banner-content { position: absolute; inset: 0; z-index: 2; display: flex; box-sizing: border-box; width: min(100%, 760px); flex-direction: column; justify-content: flex-end; padding: clamp(34px, 5vw, 70px); color: #fff; }
.home-banner-card h1 { max-width: 680px; margin: 22px 0 0; font-size: clamp(42px, 5.4vw, 76px); font-weight: 920; letter-spacing: -0.065em; line-height: 0.98; text-wrap: balance; text-shadow: 0 5px 22px rgba(0, 0, 0, 0.28); }
.home-banner-description { max-width: 560px; margin: 24px 0 0; color: rgba(255, 255, 255, 0.7); font-size: 13px; font-weight: 580; line-height: 1.75; }

.personal-now-card { position: relative; min-height: 242px; overflow: hidden; margin-top: 22px; padding: 29px 34px 28px; color: #29272d; border: 1px solid rgba(255, 255, 255, 0.92); border-radius: 34px; background: #f7f4f5; box-shadow: 0 22px 58px rgba(66, 50, 54, 0.1); isolation: isolate; }
.personal-station-ambient { position: absolute !important; inset: -25% -3% -35% 43%; z-index: -3; width: 62% !important; height: 160% !important; opacity: 0.7; filter: saturate(0.8) brightness(1.08); transform: rotate(-7deg) scale(1.05); }
.personal-station-ambient :deep(> div),
.personal-station-ambient :deep(img) { width: 100% !important; height: 100% !important; object-fit: cover; }
.personal-station-scrim { position: absolute; inset: 0; z-index: -2; background: linear-gradient(90deg, #f8f5f6 0%, rgba(248, 245, 246, 0.98) 31%, rgba(248, 245, 246, 0.78) 63%, rgba(248, 245, 246, 0.3) 100%), linear-gradient(0deg, rgba(255, 255, 255, 0.7), transparent 75%); }
.personal-now-card::after { position: absolute; top: -110px; right: 24%; z-index: -1; width: 260px; aspect-ratio: 1; border: 1px solid rgba(80, 61, 66, 0.07); border-radius: 50%; box-shadow: 0 0 0 45px rgba(255, 255, 255, 0.13), 0 0 0 90px rgba(255, 255, 255, 0.08); content: ''; }
.personal-now-heading { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.personal-now-heading p { margin: 0 0 5px; color: #e85769; font-size: 8px; font-weight: 900; letter-spacing: 0.18em; }
.personal-now-heading h2 { margin: 0; font-size: 27px; font-weight: 900; letter-spacing: -0.045em; }
.personal-now-heading > span { display: flex; align-items: center; gap: 7px; margin-top: 3px; padding: 8px 11px; color: #79747a; border: 1px solid rgba(68, 53, 57, 0.08); border-radius: 999px; background: rgba(255, 255, 255, 0.62); box-shadow: 0 7px 18px rgba(70, 53, 57, 0.04); font-size: 8px; font-weight: 720; backdrop-filter: blur(12px); }
.personal-now-heading > span i { width: 6px; aspect-ratio: 1; border-radius: 50%; background: #73d69b; box-shadow: 0 0 0 4px rgba(115, 214, 155, 0.13); }
.personal-station-content { position: relative; z-index: 1; display: grid; min-width: 0; align-items: end; grid-template-columns: minmax(420px, 0.9fr) minmax(440px, 1.1fr); gap: clamp(30px, 6vw, 90px); margin-top: 20px; }
.personal-station-content:not(:has(.personal-up-next)) { grid-template-columns: minmax(0, 720px); }
.personal-station-feature { display: grid; width: 100%; min-width: 0; align-items: center; grid-template-columns: 112px minmax(0, 1fr) auto; gap: 19px; margin: 0; padding: 0; text-align: left; color: #29272d; border: 0; background: transparent; }
.personal-station-cover { display: block; width: 112px; aspect-ratio: 1; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.76); border-radius: 24px; background: rgba(255, 255, 255, 0.7); box-shadow: 0 18px 38px rgba(72, 52, 57, 0.16); transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1); }
.personal-station-cover :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.personal-station-copy { min-width: 0; }
.personal-station-copy small,
.personal-station-copy strong,
.personal-station-copy span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.personal-station-copy small { color: #e85769; font-size: 8px; font-weight: 850; letter-spacing: 0.12em; }
.personal-station-copy strong { margin-top: 8px; font-size: clamp(18px, 2vw, 25px); font-weight: 880; letter-spacing: -0.035em; }
.personal-station-copy span { margin-top: 8px; color: #8b868c; font-size: 10px; }
.personal-station-action { display: flex; align-items: center; flex-direction: column; gap: 7px; }
.personal-station-action b { color: #8d878d; font-size: 7px; font-weight: 760; white-space: nowrap; }
.personal-station-play { display: grid; width: 48px; aspect-ratio: 1; place-items: center; padding-left: 3px; color: #fff; border-radius: 50%; background: #29272d; box-shadow: 0 10px 25px rgba(56, 42, 46, 0.19); font-size: 12px; font-style: normal; transition: transform 220ms ease, background 220ms ease; }
.personal-station-feature:hover .personal-station-cover { transform: translateY(-3px) rotate(-1deg); }
.personal-station-feature:hover .personal-station-play { background: #e85769; transform: scale(1.06); }
.personal-up-next { min-width: 0; padding: 13px 15px 11px; border: 1px solid rgba(75, 58, 63, 0.08); border-radius: 20px; background: rgba(255, 255, 255, 0.58); box-shadow: 0 13px 30px rgba(67, 50, 55, 0.06); backdrop-filter: blur(16px); }
.personal-up-next > p { margin: 0 0 4px 5px; color: #918b91; font-size: 8px; font-weight: 800; letter-spacing: 0.12em; }
.personal-up-next-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.personal-up-next button { display: grid; min-width: 0; align-items: center; grid-template-columns: 22px minmax(0, 1fr) 13px; gap: 7px; padding: 10px 9px; text-align: left; color: #29272d; border: 0; border-left: 1px solid rgba(69, 54, 58, 0.08); background: transparent; }
.personal-up-next button:first-child { border-left: 0; }
.personal-up-next button > span:first-child { color: #e85769; font-size: 8px; font-weight: 850; }
.personal-up-next button > span:nth-child(2),
.personal-up-next strong,
.personal-up-next small { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.personal-up-next strong { font-size: 9px; font-weight: 790; }
.personal-up-next small { margin-top: 4px; color: #999399; font-size: 7px; }
.personal-up-next button > i { color: #aaa4aa; font-size: 10px; font-style: normal; }
.personal-station-empty { display: grid; min-height: 112px; place-items: center; color: #918b91; font-size: 10px; }

.lofi-resume { position: relative; display: grid; min-height: 228px; overflow: hidden; align-items: center; grid-template-columns: minmax(0, 1.28fr) minmax(350px, 0.72fr); gap: 34px; margin-top: 18px; padding: 28px 32px; color: #fff; border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 30px; background: #3e3b3f; box-shadow: 0 20px 58px rgba(45, 36, 35, 0.15); isolation: isolate; }
.lofi-resume::after { position: absolute; inset: 0; z-index: 1; opacity: 0.2; background-image: linear-gradient(rgba(255, 255, 255, 0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.11) 1px, transparent 1px); background-size: 9px 9px; content: ''; mix-blend-mode: soft-light; pointer-events: none; }
.lofi-resume-backdrop { position: absolute !important; inset: 0; z-index: 0; width: 100% !important; height: 100% !important; filter: saturate(0.78) contrast(1.08) brightness(0.72); image-rendering: pixelated; }
.lofi-resume-backdrop :deep(> div),
.lofi-resume-backdrop :deep(img) { width: 100% !important; height: 100% !important; object-fit: cover; image-rendering: pixelated; }
.lofi-resume-haze { position: absolute; inset: 0; z-index: 1; background: linear-gradient(105deg, rgba(27, 25, 29, 0.42), rgba(47, 42, 45, 0.13)), linear-gradient(0deg, rgba(20, 18, 22, 0.34), transparent 72%); pointer-events: none; }
.lofi-resume-primary { position: relative; z-index: 2; display: grid; min-width: 0; align-items: center; grid-template-columns: 138px minmax(0, 1fr) 58px; gap: 22px; }
.lofi-resume-cover { position: relative; display: block; width: 138px; aspect-ratio: 1; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 25px; background: rgba(255, 255, 255, 0.12); box-shadow: 0 20px 42px rgba(10, 9, 12, 0.32); }
.lofi-resume-cover :deep(> div),
.lofi-resume-cover :deep(img) { width: 100% !important; height: 100% !important; object-fit: cover; }
.lofi-resume-cover > i { position: absolute; top: 50%; left: 50%; width: 18px; aspect-ratio: 1; border: 5px solid rgba(255, 255, 255, 0.22); border-radius: 50%; box-shadow: 0 0 0 1px rgba(20, 18, 22, 0.14); transform: translate(-50%, -50%); }
.lofi-resume-copy { min-width: 0; }
.lofi-resume-copy small,
.lofi-resume-copy strong,
.lofi-resume-copy em,
.lofi-resume-copy b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lofi-resume-copy small { color: #ffb3bd; font-size: 7px; font-weight: 900; letter-spacing: 0.2em; }
.lofi-resume-copy h2 { margin: 8px 0 0; font-size: 30px; font-weight: 920; letter-spacing: -0.05em; }
.lofi-resume-copy strong { margin-top: 10px; font-size: 13px; font-weight: 820; }
.lofi-resume-copy em { margin-top: 5px; color: rgba(255, 255, 255, 0.58); font-size: 9px; font-style: normal; }
.lofi-resume-copy b { margin-top: 7px; color: rgba(255, 255, 255, 0.48); font-size: 7px; font-weight: 650; }
.lofi-progress { display: block; height: 3px; margin-top: 16px; overflow: hidden; border-radius: 999px; background: rgba(255, 255, 255, 0.18); }
.lofi-progress i { display: block; height: 100%; border-radius: inherit; background: #fff; box-shadow: 0 0 12px rgba(255, 255, 255, 0.55); }
.lofi-resume-play { display: grid; width: 58px; aspect-ratio: 1; place-items: center; padding: 0; color: #302d31; border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 50%; background: rgba(255, 255, 255, 0.9); box-shadow: 0 12px 30px rgba(10, 9, 12, 0.2); font-size: 14px; font-weight: 850; backdrop-filter: blur(12px); transition: transform 220ms ease, background 220ms ease; }
.lofi-resume-play:hover { background: #fff; transform: scale(1.06); }
.lofi-resume-next { position: relative; z-index: 2; align-self: stretch; padding-left: 32px; border-left: 1px solid rgba(255, 255, 255, 0.16); }
.lofi-resume-next > p { margin: 2px 0 7px; color: rgba(255, 255, 255, 0.48); font-size: 7px; font-weight: 850; letter-spacing: 0.16em; }
.lofi-resume-next button { display: grid; width: 100%; min-width: 0; align-items: center; grid-template-columns: 24px minmax(0, 1fr) minmax(60px, auto) 18px; gap: 8px; padding: 10px 2px; text-align: left; color: #fff; border: 0; border-top: 1px solid rgba(255, 255, 255, 0.1); background: transparent; }
.lofi-resume-next button > span { color: #ffb3bd; font-size: 7px; font-weight: 850; }
.lofi-resume-next strong,
.lofi-resume-next small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lofi-resume-next strong { font-size: 9px; font-weight: 760; }
.lofi-resume-next small { color: rgba(255, 255, 255, 0.45); font-size: 7px; }
.lofi-resume-next button > i { color: rgba(255, 255, 255, 0.68); font-size: 7px; font-style: normal; }
.lofi-resume-empty { grid-template-columns: 1fr; place-items: center; text-align: center; background: linear-gradient(135deg, #4e4a50, #29272c); }
.lofi-resume-empty > div:last-child { position: relative; z-index: 2; }
.lofi-resume-empty small { color: #ffb3bd; font-size: 7px; font-weight: 900; letter-spacing: 0.2em; }
.lofi-resume-empty h2 { margin: 10px 0 0; font-size: 24px; }

.personal-section { margin-top: 94px; }
.personal-section-heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
.personal-section-heading p { margin: 0 0 8px; color: #e85769; font-size: 8px; font-weight: 900; letter-spacing: 0.2em; }
.personal-section-heading h2 { margin: 0; font-size: clamp(36px, 4vw, 52px); font-weight: 920; letter-spacing: -0.055em; line-height: 1; }
.personal-section-heading > span { max-width: 390px; color: #929298; font-size: 11px; line-height: 1.6; }
.personal-section-heading > button { padding: 10px 15px; color: #65656b; border: 1px solid rgba(41, 40, 44, 0.08); border-radius: 999px; background: #fff; font-size: 9px; font-weight: 780; }
.personal-scene-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.personal-scene-grid > button { position: relative; display: grid; min-height: 230px; overflow: hidden; align-content: space-between; padding: 19px; text-align: left; color: #fff; border: 0; border-radius: 27px; isolation: isolate; transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 320ms ease; }
.personal-scene-grid > button:hover { box-shadow: 0 24px 50px rgba(43, 35, 34, 0.16); transform: translateY(-7px); }
.scene-familiar { background: linear-gradient(145deg, #655058, #352f35); }
.scene-explore { background: linear-gradient(145deg, #e16d7b, #b34f62); }
.scene-focus { background: linear-gradient(145deg, #66839b, #344a5c); }
.scene-exercise { background: linear-gradient(145deg, #d69a58, #9a6537); }
.scene-night { background: linear-gradient(145deg, #514f79, #292941); }
.personal-scene-index { color: rgba(255, 255, 255, 0.56); font-size: 8px; font-weight: 850; }
.personal-scene-icon { position: absolute; top: 40px; right: -14px; z-index: -1; color: rgba(255, 255, 255, 0.11); font-size: 130px; font-weight: 300; line-height: 1; }
.personal-scene-copy strong,
.personal-scene-copy small { display: block; }
.personal-scene-copy strong { font-size: 20px; font-weight: 880; letter-spacing: -0.03em; }
.personal-scene-copy small { margin-top: 7px; color: rgba(255, 255, 255, 0.63); font-size: 9px; line-height: 1.5; }
.personal-scene-grid > button > i { position: absolute; top: 18px; right: 18px; color: rgba(255, 255, 255, 0.75); font-size: 14px; font-style: normal; }
.personal-spinner { width: 14px; height: 14px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: personal-spin 700ms linear infinite; }

.personal-daily-layout { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.5fr); gap: 18px; }
.personal-song-panel { padding: 18px; border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 32px; background: rgba(255, 255, 255, 0.68); box-shadow: 0 22px 58px rgba(49, 41, 38, 0.06); }
.personal-song-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 10px; }
.personal-taste-card { padding: 30px 26px; color: #fff; border-radius: 32px; background: #29282c; box-shadow: 0 22px 58px rgba(38, 32, 31, 0.17); }
.personal-taste-card > p { margin: 0; color: #ff8d9b; font-size: 8px; font-weight: 900; letter-spacing: 0.2em; }
.personal-taste-card h3 { margin: 17px 0 0; font-size: 26px; font-weight: 900; letter-spacing: -0.045em; }
.personal-taste-card > span { display: block; margin-top: 10px; color: rgba(255, 255, 255, 0.55); font-size: 9px; line-height: 1.65; }
.personal-taste-list { margin-top: 24px; }
.personal-taste-list button { display: grid; width: 100%; align-items: center; grid-template-columns: 24px minmax(0, 1fr) auto 16px; gap: 8px; padding: 12px 0; text-align: left; color: #fff; border: 0; border-top: 1px solid rgba(255, 255, 255, 0.09); background: transparent; }
.personal-taste-list button > span { color: #ff8d9b; font-size: 7px; font-weight: 850; }
.personal-taste-list strong { overflow: hidden; font-size: 11px; font-weight: 790; text-overflow: ellipsis; white-space: nowrap; }
.personal-taste-list small { color: rgba(255, 255, 255, 0.38); font-size: 7px; letter-spacing: 0.08em; }
.personal-taste-list i { color: rgba(255, 255, 255, 0.55); font-size: 11px; font-style: normal; }
.personal-login-link { margin-top: 17px; padding: 10px 13px; color: #29282c; border: 0; border-radius: 999px; background: #fff; font-size: 8px; font-weight: 780; }

.personal-playlist-grid,
.personal-playlist-skeleton { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; }
.personal-playlist-skeleton span { aspect-ratio: 1 / 1.18; border-radius: 24px; background: #e8e8e9; animation: personal-pulse 1.3s ease-in-out infinite; }
.personal-song-skeleton { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.personal-song-skeleton span { height: 74px; border-radius: 18px; background: #ededee; animation: personal-pulse 1.3s ease-in-out infinite; }
.personal-empty { display: grid; min-height: 280px; place-items: center; color: #99999f; font-size: 10px; }
.personal-collection-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.personal-collection-list > button { display: grid; min-width: 0; align-items: center; grid-template-columns: 82px minmax(0, 1fr) 20px; gap: 14px; padding: 10px; text-align: left; border: 1px solid rgba(41, 40, 44, 0.06); border-radius: 22px; background: rgba(255, 255, 255, 0.7); }
.personal-collection-list :deep(img) { width: 82px; aspect-ratio: 1; object-fit: cover; border-radius: 16px; }
.personal-collection-list button > span { min-width: 0; }
.personal-collection-list small,
.personal-collection-list strong,
.personal-collection-list i { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.personal-collection-list small { color: #e85769; font-size: 7px; font-weight: 850; letter-spacing: 0.1em; }
.personal-collection-list strong { margin-top: 6px; font-size: 11px; font-weight: 820; }
.personal-collection-list i { margin-top: 5px; color: #a1a1a7; font-size: 8px; font-style: normal; }
.personal-collection-list b { color: #aaaab0; font-size: 12px; }
.personal-load-note { margin: 36px 0 0; color: #b46973; text-align: center; font-size: 9px; }
.personal-footer { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 110px; padding: 26px 0 90px; border-top: 1px solid rgba(41, 40, 44, 0.08); }
.personal-footer div { display: flex; align-items: center; gap: 14px; }
.personal-footer strong { font-size: 13px; font-weight: 900; letter-spacing: 0.18em; }
.personal-footer span { color: #a1a1a7; font-size: 9px; }
.personal-footer button { padding: 0; color: #797980; border: 0; background: transparent; font-size: 9px; font-weight: 760; }

@keyframes personal-spin { to { transform: rotate(360deg); } }
@keyframes personal-pulse { 50% { opacity: 0.48; } }

@media (max-width: 1080px) {
  .personal-station-content { grid-template-columns: 1fr; gap: 18px; }
  .personal-up-next { width: min(100%, 680px); box-sizing: border-box; }
  .personal-scene-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 820px) {
  .personal-main { padding: 24px 18px 130px; }
  .home-banner-card { min-height: 480px; }
  .personal-station-ambient { inset: -5% -25% -20% 34%; width: 92% !important; height: 130% !important; }
  .personal-station-scrim { background: linear-gradient(90deg, #f8f5f6 0%, rgba(248, 245, 246, 0.94) 52%, rgba(248, 245, 246, 0.5) 100%), linear-gradient(0deg, rgba(255, 255, 255, 0.76), transparent 75%); }
  .lofi-resume { grid-template-columns: 1fr; gap: 24px; }
  .lofi-resume-next { padding: 20px 0 0; border-top: 1px solid rgba(255, 255, 255, 0.16); border-left: 0; }
  .personal-scene-grid { grid-template-columns: repeat(2, 1fr); }
  .personal-daily-layout { grid-template-columns: 1fr; }
  .personal-collection-list { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 560px) {
  .personal-main { padding: 13px 13px 115px; }
  .home-banner-card { min-height: 510px; border-radius: 26px; }
  .home-banner-content { padding: 25px; }
  .home-banner-card h1 { font-size: 42px; }
  .personal-now-card { min-height: 0; padding: 23px 18px 20px; border-radius: 26px; }
  .personal-now-heading h2 { font-size: 24px; }
  .personal-now-heading > span { padding: 7px 9px; font-size: 7px; }
  .personal-station-content { margin-top: 24px; }
  .personal-station-feature { grid-template-columns: 84px minmax(0, 1fr) 42px; gap: 13px; }
  .personal-station-cover { width: 84px; border-radius: 18px; }
  .personal-station-copy strong { font-size: 17px; }
  .personal-station-action b { display: none; }
  .personal-station-play { width: 42px; }
  .personal-up-next { overflow-x: auto; padding: 11px 9px; scrollbar-width: none; }
  .personal-up-next-list { display: flex; }
  .personal-up-next button { width: 175px; flex: none; }
  .lofi-resume { min-height: 0; gap: 20px; padding: 20px 17px; border-radius: 24px; }
  .lofi-resume-primary { grid-template-columns: 88px minmax(0, 1fr) 44px; gap: 13px; }
  .lofi-resume-cover { width: 88px; border-radius: 19px; }
  .lofi-resume-cover > i { width: 12px; border-width: 3px; }
  .lofi-resume-copy h2 { font-size: 25px; }
  .lofi-resume-copy strong { margin-top: 7px; font-size: 11px; }
  .lofi-progress { margin-top: 11px; }
  .lofi-resume-play { width: 44px; font-size: 11px; }
  .lofi-resume-next { padding-top: 16px; }
  .lofi-resume-next button { grid-template-columns: 22px minmax(0, 1fr) 16px; }
  .lofi-resume-next button > small { display: none; }
  .lofi-resume-next button:nth-of-type(n + 3) { display: none; }
  .personal-section { margin-top: 70px; }
  .personal-section-heading { align-items: start; flex-direction: column; }
  .personal-section-heading h2 { font-size: 39px; }
  .personal-scene-grid { display: flex; margin-right: -13px; overflow-x: auto; gap: 9px; padding-right: 13px; padding-bottom: 12px; scrollbar-width: none; }
  .personal-scene-grid > button { width: 66vw; min-height: 218px; flex: none; }
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
</style>
