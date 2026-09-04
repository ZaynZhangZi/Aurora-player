<template>
  <div class="style-page">
    <AppHeader />

    <main class="style-main" data-route-motion-root>
      <div v-if="loading.style && !selectedStyle" class="style-loading">
        <span />
        <p>正在打开曲风页面…</p>
      </div>

      <div v-else-if="errors.style && !selectedStyle" class="style-error">
        <p>{{ errors.style }}</p>
        <button type="button" @click="reloadStyle">重新加载</button>
      </div>

      <template v-else-if="selectedStyle">
        <section class="style-hero" :style="styleTheme">
          <button class="style-back" type="button" @click="backToDiscover">‹ 返回曲风</button>
          <div class="style-hero-content">
            <div class="style-copy">
              <p>{{ selectedStyle.enName || 'AURORA GENRE' }}</p>
              <h1>{{ selectedStyle.name || selectedStyle.tagName }}</h1>
              <span>{{ selectedStyle.desc || '从代表作品开始，认识这个曲风里的歌曲、专辑、歌单与艺人。' }}</span>
            </div>
            <dl>
              <div><dt>{{ formatCount(selectedStyle.songNum || styleSongs.length) }}</dt><dd>首代表歌曲</dd></div>
              <div><dt>{{ formatCount(selectedStyle.artistNum || styleArtists.length) }}</dt><dd>位相关艺人</dd></div>
            </dl>
          </div>

          <div v-if="selectedRootStyle?.childrenTags?.length" class="style-children">
            <button
              v-for="child in selectedRootStyle.childrenTags.slice(0, 16)"
              :key="child.tagId"
              type="button"
              :class="{ 'is-active': Number(selectedStyle?.tagId) === Number(child.tagId) }"
              @click="openStyle(child)"
            >
              {{ child.tagName }}
            </button>
          </div>
        </section>

        <section class="style-library">
          <header class="library-heading">
            <div><p>EXPLORE {{ selectedStyle.enName || 'THE GENRE' }}</p><h2>深入了解 {{ selectedStyle.name || selectedStyle.tagName }}</h2></div>
            <span>在独立页面里按内容类型慢慢浏览。</span>
          </header>

          <nav class="style-tabs" aria-label="曲风内容分类">
            <button v-for="tab in contentTabs" :key="tab.value" type="button" :class="{ 'is-active': activeContent === tab.value }" @click="activeContent = tab.value">
              {{ tab.label }} <span>{{ contentCount(tab.value) }}</span>
            </button>
          </nav>

          <div v-if="loading.style" class="content-loading"><span v-for="index in 8" :key="index" /></div>
          <div v-else-if="activeContent === 'songs'" class="song-panel">
            <HomeSongRow v-for="(song, index) in styleSongs" :key="song.id" :song="song" :index="index" @play="playStyleSong" />
          </div>
          <div v-else-if="activeContent === 'albums'" class="media-grid">
            <button v-for="album in styleAlbums" :key="album.id" type="button" class="media-card" @click="openAlbum(album)">
              <span><SmartMedia :src="album.picUrl" :alt="`${album.name}封面`" :image-width="560" sizes="230px" /></span>
              <strong>{{ album.name }}</strong><small>{{ album.artistName }}</small>
            </button>
          </div>
          <div v-else-if="activeContent === 'playlists'" class="playlist-grid">
            <HomePlaylistCard v-for="item in stylePlaylists" :key="item.id" :item="item" @open="openPlaylist" />
          </div>
          <div v-else class="media-grid artist-grid">
            <button v-for="artist in styleArtists" :key="artist.id" type="button" class="media-card" @click="openArtist(artist)">
              <span><SmartMedia :src="artist.picUrl || artist.img1v1Url" :alt="`${artist.name}头像`" :image-width="560" sizes="230px" /></span>
              <strong>{{ artist.name }}</strong><small>{{ artist.alias?.[0] || '艺人' }}</small>
            </button>
          </div>

          <div v-if="!loading.style && !contentCount(activeContent)" class="content-empty">这个分类暂时还没有内容。</div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
defineOptions({name: 'StyleDetailPage'})

import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import AppHeader from '@/components/appHeader/AppHeader.vue'
import HomePlaylistCard from '@/components/home/HomePlaylistCard.vue'
import HomeSongRow from '@/components/home/HomeSongRow.vue'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import {useDiscoverData} from '@/composables/useDiscoverData.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'

const route = useRoute()
const router = useRouter()
const activeContent = ref('songs')
const contentTabs = [
  {label: '代表歌曲', value: 'songs'},
  {label: '相关专辑', value: 'albums'},
  {label: '精选歌单', value: 'playlists'},
  {label: '代表艺人', value: 'artists'},
]

const {
  styles,
  selectedStyle,
  styleSongs,
  styleAlbums,
  stylePlaylists,
  styleArtists,
  loading,
  errors,
  loadStyles,
  loadStyle,
} = useDiscoverData()

const selectedRootStyle = computed(() => {
  const id = Number(selectedStyle.value?.tagId || 0)
  return styles.value.find(style => Number(style.tagId) === id || style.childrenTags?.some(child => Number(child.tagId) === id)) || null
})

const styleTheme = computed(() => {
  const deep = /^[0-9a-f]{6}$/i.test(selectedStyle.value?.colorDeep || '') ? `#${selectedStyle.value.colorDeep}` : '#202124'
  const light = /^[0-9a-f]{6}$/i.test(selectedStyle.value?.colorShallow || '') ? `#${selectedStyle.value.colorShallow}` : '#e8eef4'
  return {'--style-deep': deep, '--style-light': light}
})

function contentCount(type) {
  const contentMap = {songs: styleSongs.value, albums: styleAlbums.value, playlists: stylePlaylists.value, artists: styleArtists.value}
  return contentMap[type]?.length || 0
}

async function reloadStyle() {
  const id = Number(route.params.id || 0)
  if (!id) return
  if (!styles.value.length) await loadStyles()
  await loadStyle(id)
}

function openStyle(style) {
  const id = Number(style?.tagId || style?.id || 0)
  if (!id) return
  activeContent.value = 'songs'
  router.replace({name: 'styleDetailPage', params: {id}})
}

function backToDiscover() {
  router.push({name: 'discover', query: {tab: 'styles'}})
}

function openPlaylist(item) { const id = Number(item?.id || 0); if (id) router.push({name: 'playlistDetailPage', query: {id}}) }
function openAlbum(item) { const id = Number(item?.id || 0); if (id) router.push({name: 'albumDetailPage', query: {id}}) }
function openArtist(item) { const id = Number(item?.id || 0); if (id) router.push({name: 'artistDetailPage', query: {id}}) }
async function playStyleSong(song, index = 0) { await playSongWithQueue(song, styleSongs.value, index) }

function formatCount(value) {
  const raw = String(value ?? '').trim()
  if (/^\d+\+$/.test(raw)) return raw
  const count = Number(raw || 0)
  if (!Number.isFinite(count)) return '—'
  if (count >= 10000) return `${(count / 10000).toFixed(count >= 100000 ? 0 : 1)}万`
  return count.toLocaleString()
}

watch(
  () => route.params.id,
  () => { void reloadStyle() },
  {immediate: true},
)
</script>

<style scoped>
.style-page { min-height: 100vh; color: #1d1d1f; background: #f5f5f7; }
button { cursor: pointer; font: inherit; }
.style-main { box-sizing: border-box; width: min(100%, 1370px); margin: 0 auto; padding: 28px 28px 160px; }
.style-loading,
.style-error { display: grid; min-height: 620px; place-items: center; align-content: center; gap: 14px; color: #77777c; }
.style-loading span { width: 24px; aspect-ratio: 1; border: 3px solid #fa2d48; border-right-color: transparent; border-radius: 50%; animation: spin 700ms linear infinite; }
.style-loading p,
.style-error p { margin: 0; font-size: 11px; }
.style-error button { padding: 9px 14px; color: #fff; border: 0; border-radius: 999px; background: #fa2d48; font-size: 9px; font-weight: 700; }

.style-hero { overflow: hidden; padding: 30px 38px 0; color: var(--style-deep); border: 1px solid rgba(29, 29, 31, 0.06); border-radius: 32px; background: linear-gradient(135deg, color-mix(in srgb, var(--style-light), white 23%), var(--style-light)); box-shadow: 0 24px 65px rgba(40, 35, 37, 0.09); }
.style-back { padding: 8px 12px; color: currentColor; border: 1px solid color-mix(in srgb, var(--style-deep), transparent 82%); border-radius: 999px; background: color-mix(in srgb, white, transparent 54%); font-size: 9px; font-weight: 720; }
.style-hero-content { display: flex; min-height: 330px; align-items: end; justify-content: space-between; gap: 40px; padding: 48px 12px 42px; }
.style-copy { max-width: 780px; }
.style-copy p { margin: 0; font-size: 9px; font-weight: 850; letter-spacing: 0.12em; text-transform: uppercase; }
.style-copy h1 { margin: 13px 0 0; font-size: clamp(64px, 9vw, 118px); font-weight: 880; letter-spacing: -0.075em; line-height: 0.9; }
.style-copy > span { display: -webkit-box; max-width: 760px; overflow: hidden; margin-top: 24px; font-size: 12px; line-height: 1.85; opacity: 0.72; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.style-hero dl { display: flex; flex: none; gap: 28px; margin: 0; }
.style-hero dl div { min-width: 96px; }
.style-hero dt { font-size: 25px; font-weight: 840; }
.style-hero dd { margin: 5px 0 0; font-size: 9px; opacity: 0.58; }
.style-children { display: flex; overflow-x: auto; gap: 7px; margin-inline: -38px; padding: 18px 38px; border-top: 1px solid color-mix(in srgb, var(--style-deep), transparent 88%); background: color-mix(in srgb, white, transparent 48%); scrollbar-width: none; }
.style-children button { height: 32px; flex: none; padding: 0 12px; color: var(--style-deep); border: 0; border-radius: 999px; background: color-mix(in srgb, var(--style-deep), transparent 91%); font-size: 9px; font-weight: 720; }
.style-children button.is-active { color: var(--style-light); background: var(--style-deep); }

.style-library { margin-top: 62px; }
.library-heading { display: flex; align-items: end; justify-content: space-between; gap: 30px; }
.library-heading p { margin: 0 0 7px; color: #fa2d48; font-size: 9px; font-weight: 820; letter-spacing: 0.1em; }
.library-heading h2 { margin: 0; font-size: clamp(34px, 4vw, 50px); font-weight: 830; letter-spacing: -0.05em; }
.library-heading > span { color: #77777c; font-size: 11px; }
.style-tabs { display: flex; overflow-x: auto; gap: 26px; margin-top: 28px; border-bottom: 1px solid rgba(29, 29, 31, 0.09); scrollbar-width: none; }
.style-tabs button { position: relative; height: 52px; flex: none; padding: 0; color: #75757a; border: 0; background: transparent; font-size: 11px; font-weight: 720; }
.style-tabs button span { margin-left: 4px; color: #a1a1a6; font-size: 8px; }
.style-tabs button.is-active { color: #1d1d1f; }
.style-tabs button.is-active::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: #fa2d48; content: ''; }
.song-panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 14px; margin-top: 20px; padding: 18px; border-radius: 25px; background: #fff; box-shadow: 0 14px 42px rgba(37, 33, 35, 0.05); }
.media-grid,
.playlist-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 30px 16px; margin-top: 26px; }
.media-card { min-width: 0; padding: 0; text-align: left; color: #1d1d1f; border: 0; background: transparent; }
.media-card > span { display: block; aspect-ratio: 1; overflow: hidden; border-radius: 18px; background: #e4e4e8; box-shadow: 0 9px 25px rgba(35, 32, 33, 0.08); }
.media-card :deep(img) { width: 100%; height: 100%; object-fit: cover; transition: transform 320ms ease; }
.media-card:hover :deep(img) { transform: scale(1.035); }
.media-card strong,
.media-card small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.media-card strong { margin: 11px 2px 0; font-size: 12px; font-weight: 730; }
.media-card small { margin: 5px 2px 0; color: #7d7d82; font-size: 9px; }
.artist-grid .media-card > span { border-radius: 50%; }
.content-loading { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 22px; }
.content-loading span { height: 74px; border-radius: 16px; background: #e5e5e9; animation: pulse 1.2s ease-in-out infinite; }
.content-empty { display: grid; min-height: 240px; place-items: center; color: #8e8e93; font-size: 11px; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 50% { opacity: 0.5; } }

@media (max-width: 900px) {
  .style-hero-content,
  .library-heading { align-items: start; flex-direction: column; }
  .style-hero dl { align-self: stretch; }
  .media-grid,
  .playlist-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (max-width: 680px) {
  .style-main { padding: 13px 13px 125px; }
  .style-hero { padding: 22px 20px 0; border-radius: 25px; }
  .style-hero-content { min-height: 390px; padding: 40px 3px 28px; }
  .style-copy h1 { font-size: 68px; }
  .style-hero dl { display: none; }
  .style-children { margin-inline: -20px; padding-inline: 20px; }
  .style-library { margin-top: 48px; }
  .library-heading h2 { font-size: 37px; }
  .song-panel { grid-template-columns: 1fr; padding: 8px 4px; }
  .media-grid,
  .playlist-grid { grid-template-columns: repeat(2, 1fr); gap: 26px 11px; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
}
</style>
