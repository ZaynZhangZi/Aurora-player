<template>
  <div class="search-page">
    <AppHeader />

    <main class="search-main" data-route-motion-root>
      <header class="search-hero">
        <p><span /> SEARCH THE SOUND</p>
        <h1>{{ keyword ? `“${keyword}”` : '想听什么？' }}</h1>
        <p class="search-hero-copy">
          {{ keyword ? resultSummary : '歌曲、艺人、专辑和歌单，都可以从这里找到。' }}
        </p>

        <form class="search-box" role="search" @submit.prevent="submitSearch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref="searchInputRef"
            v-model="searchInput"
            type="search"
            autocomplete="off"
            aria-label="搜索歌曲、歌手、专辑或歌单"
            placeholder="搜索歌曲、歌手、专辑或歌单"
            @input="scheduleSearch"
          >
          <button v-if="searchInput" class="search-clear" type="button" aria-label="清空搜索" @click="clearSearch">×</button>
          <button class="search-submit" type="submit">搜索</button>
        </form>

        <div v-if="!keyword" class="search-suggestions" aria-label="搜索建议">
          <span>试试搜索</span>
          <button v-for="item in suggestions" :key="item" type="button" @click="useSuggestion(item)">{{ item }}</button>
        </div>
      </header>

      <template v-if="keyword">
        <nav class="search-tabs" aria-label="搜索结果分类">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="{ 'is-active': activeTab === tab.value }"
            @click="switchTab(tab.value)"
          >
            {{ tab.label }}
            <small v-if="counts[tab.value] !== undefined">{{ formatCount(counts[tab.value]) }}</small>
          </button>
        </nav>

        <div v-if="loading" class="search-loading" aria-label="正在搜索">
          <span class="search-loading-line" />
          <div class="search-loading-grid"><i v-for="index in 8" :key="index" /></div>
        </div>

        <section v-else-if="error" class="search-state search-error">
          <span>!</span><h2>这次没有搜到结果</h2><p>{{ error }}</p>
          <button type="button" @click="runSearch">重新搜索</button>
        </section>

        <section v-else-if="!hasResults" class="search-state">
          <span>⌕</span><h2>没有找到“{{ keyword }}”</h2><p>换一个歌名、艺人名或更短的关键词试试。</p>
        </section>

        <div v-else-if="activeTab === 'all'" class="search-overview">
          <section v-if="results.songs.length" class="search-result-section search-song-section">
            <div class="search-section-heading">
              <div><p>TRACKS</p><h2>歌曲</h2></div>
              <button type="button" @click="switchTab('songs')">查看全部 {{ formatCount(counts.songs) }} 首 <span>→</span></button>
            </div>
            <div class="search-song-list">
              <HomeSongRow
                v-for="(song, index) in results.songs"
                :key="song.id"
                :song="song"
                :index="index"
                @play="playSong"
              />
            </div>
          </section>

          <section v-if="results.artists.length" class="search-result-section">
            <div class="search-section-heading">
              <div><p>ARTISTS</p><h2>艺人</h2></div>
              <button type="button" @click="switchTab('artists')">查看全部 {{ formatCount(counts.artists) }} 位 <span>→</span></button>
            </div>
            <div class="search-artist-grid">
              <button v-for="artist in results.artists" :key="artist.id" type="button" @click="openArtist(artist)">
                <span><SmartMedia :src="artist.picUrl || artist.img1v1Url" :alt="`${artist.name}头像`" :image-width="420" sizes="210px" /></span>
                <strong>{{ artist.name }}</strong>
                <small>{{ artist.alias?.[0] || 'ARTIST' }}</small>
              </button>
            </div>
          </section>

          <section v-if="results.albums.length" class="search-result-section">
            <div class="search-section-heading">
              <div><p>ALBUMS</p><h2>专辑</h2></div>
              <button type="button" @click="switchTab('albums')">查看全部 {{ formatCount(counts.albums) }} 张 <span>→</span></button>
            </div>
            <div class="search-media-grid">
              <button v-for="album in results.albums" :key="album.id" type="button" @click="openAlbum(album)">
                <span class="search-media-cover"><SmartMedia :src="album.picUrl" :alt="`${album.name}封面`" :image-width="480" sizes="230px" /></span>
                <strong>{{ album.name }}</strong>
                <small>{{ album.artist?.name || album.artists?.map(item => item.name).join(' / ') || '未知艺人' }}</small>
              </button>
            </div>
          </section>

          <section v-if="results.playlists.length" class="search-result-section">
            <div class="search-section-heading">
              <div><p>PLAYLISTS</p><h2>歌单</h2></div>
              <button type="button" @click="switchTab('playlists')">查看全部 {{ formatCount(counts.playlists) }} 个 <span>→</span></button>
            </div>
            <div class="search-playlist-grid">
              <HomePlaylistCard v-for="item in results.playlists" :key="item.id" :item="item" @open="openPlaylist" />
            </div>
          </section>
        </div>

        <section v-else class="search-result-page">
          <div class="search-page-heading">
            <div><p>{{ activeTabMeta.eyebrow }}</p><h2>{{ activeTabMeta.title }}</h2></div>
            <span>共 {{ formatCount(activeCount) }} 个结果</span>
          </div>

          <div v-if="activeTab === 'songs'" class="search-song-page">
            <HomeSongRow
              v-for="(song, index) in results.songs"
              :key="song.id"
              :song="song"
              :index="page * pageSize + index"
              @play="playSong"
            />
          </div>

          <div v-else-if="activeTab === 'artists'" class="search-artist-page-grid">
            <button v-for="(artist, index) in results.artists" :key="artist.id" type="button" @click="openArtist(artist)">
              <span class="search-artist-page-cover">
                <SmartMedia :src="artist.picUrl || artist.img1v1Url" :alt="`${artist.name}头像`" :image-width="520" sizes="240px" />
                <i>{{ String(page * pageSize + index + 1).padStart(2, '0') }}</i>
              </span>
              <strong>{{ artist.name }}</strong>
              <small>{{ artist.alias?.[0] || 'ARTIST · 查看艺人主页' }}</small>
            </button>
          </div>

          <div v-else-if="activeTab === 'albums'" class="search-media-page-grid">
            <button v-for="album in results.albums" :key="album.id" type="button" @click="openAlbum(album)">
              <span class="search-media-cover"><SmartMedia :src="album.picUrl" :alt="`${album.name}封面`" :image-width="560" sizes="250px" /></span>
              <strong>{{ album.name }}</strong>
              <small>{{ album.artist?.name || album.artists?.map(item => item.name).join(' / ') || '未知艺人' }}</small>
            </button>
          </div>

          <div v-else class="search-playlist-page-grid">
            <HomePlaylistCard v-for="item in results.playlists" :key="item.id" :item="item" @open="openPlaylist" />
          </div>

          <div v-if="totalPages > 1" class="search-pagination">
            <button type="button" :disabled="page <= 0" @click="changePage(page - 1)">← 上一页</button>
            <span>PAGE {{ page + 1 }} / {{ totalPages }}</span>
            <button type="button" :disabled="page + 1 >= totalPages" @click="changePage(page + 1)">下一页 →</button>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
defineOptions({name: 'SearchPage'})

import {computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import AppHeader from '@/components/appHeader/AppHeader.vue'
import HomePlaylistCard from '@/components/home/HomePlaylistCard.vue'
import HomeSongRow from '@/components/home/HomeSongRow.vue'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import {searchApi} from '@/api/searchApi/searchApi.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'

const route = useRoute()
const router = useRouter()
const searchInputRef = ref(null)
const searchInput = ref('')
const keyword = ref('')
const loading = ref(false)
const error = ref('')
const activeTab = ref('all')
const page = ref(0)
const pageSize = 20
let inputTimer = null
let requestId = 0

const tabs = [
  {label: '全部', value: 'all'},
  {label: '歌曲', value: 'songs'},
  {label: '艺人', value: 'artists'},
  {label: '专辑', value: 'albums'},
  {label: '歌单', value: 'playlists'},
]
const tabValues = new Set(tabs.map(item => item.value))
const suggestions = ['周杰伦', '陈奕迅', '轻音乐', '华语流行']
const typeConfig = {
  songs: {type: 1, key: 'songs', countKey: 'songCount', title: '歌曲', eyebrow: 'TRACK RESULTS'},
  artists: {type: 100, key: 'artists', countKey: 'artistCount', title: '艺人', eyebrow: 'ARTIST RESULTS'},
  albums: {type: 10, key: 'albums', countKey: 'albumCount', title: '专辑', eyebrow: 'ALBUM RESULTS'},
  playlists: {type: 1000, key: 'playlists', countKey: 'playlistCount', title: '歌单', eyebrow: 'PLAYLIST RESULTS'},
}

const results = reactive({songs: [], artists: [], albums: [], playlists: []})
const counts = reactive({all: 0, songs: 0, artists: 0, albums: 0, playlists: 0})

const hasResults = computed(() => Object.values(results).some(list => list.length))
const activeCount = computed(() => Number(counts[activeTab.value] || 0))
const totalPages = computed(() => Math.max(1, Math.ceil(activeCount.value / pageSize)))
const activeTabMeta = computed(() => typeConfig[activeTab.value] || {title: '搜索结果', eyebrow: 'SEARCH RESULTS'})
const resultSummary = computed(() => {
  if (loading.value) return '正在穿过音乐库寻找匹配的声音…'
  if (error.value) return '搜索暂时遇到了一点问题。'
  if (!counts.all) return '暂时没有找到匹配内容。'
  return `共找到 ${formatCount(counts.all)} 个相关结果，可以按内容类型继续浏览。`
})

function clearResults() {
  results.songs = []
  results.artists = []
  results.albums = []
  results.playlists = []
  counts.all = 0
  counts.songs = 0
  counts.artists = 0
  counts.albums = 0
  counts.playlists = 0
}

function extractResult(response, config) {
  const result = response?.data?.result || {}
  return {
    items: Array.isArray(result[config.key]) ? result[config.key] : [],
    count: Number(result[config.countKey] || 0),
  }
}

async function runSearch() {
  const q = keyword.value.trim()
  const currentRequest = ++requestId
  if (!q) {
    clearResults()
    loading.value = false
    error.value = ''
    return
  }

  loading.value = true
  error.value = ''
  clearResults()

  try {
    if (activeTab.value === 'all') {
      const entries = Object.entries(typeConfig)
      const settled = await Promise.allSettled(entries.map(([, config]) => searchApi.searchByType(q, {
        type: config.type,
        limit: config.key === 'songs' ? 8 : 5,
        offset: 0,
      })))
      if (currentRequest !== requestId) return

      let successCount = 0
      settled.forEach((result, index) => {
        const [name, config] = entries[index]
        if (result.status !== 'fulfilled') return
        successCount += 1
        const extracted = extractResult(result.value, config)
        results[name] = extracted.items
        counts[name] = extracted.count
      })
      if (!successCount) throw new Error('搜索服务暂时不可用，请稍后重试')
      counts.all = counts.songs + counts.artists + counts.albums + counts.playlists
      return
    }

    const config = typeConfig[activeTab.value]
    const response = await searchApi.searchByType(q, {
      type: config.type,
      limit: pageSize,
      offset: page.value * pageSize,
    })
    if (currentRequest !== requestId) return
    const extracted = extractResult(response, config)
    results[activeTab.value] = extracted.items
    counts[activeTab.value] = extracted.count
    counts.all = extracted.count
  } catch (searchError) {
    if (currentRequest !== requestId) return
    error.value = searchError?.message || '搜索失败，请稍后重试'
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

function updateRoute(q = searchInput.value.trim(), tab = activeTab.value, replace = false) {
  const query = {}
  if (q) query.q = q
  if (tab !== 'all') query.tab = tab
  const target = {name: 'search', query}
  if (replace) router.replace(target)
  else router.push(target)
}

function submitSearch() {
  if (inputTimer) window.clearTimeout(inputTimer)
  const q = searchInput.value.trim()
  if (!q) {
    clearSearch()
    return
  }
  page.value = 0
  updateRoute(q, activeTab.value)
}

function scheduleSearch() {
  if (inputTimer) window.clearTimeout(inputTimer)
  const q = searchInput.value.trim()
  inputTimer = window.setTimeout(() => {
    page.value = 0
    updateRoute(q, activeTab.value, true)
  }, 420)
}

function clearSearch() {
  if (inputTimer) window.clearTimeout(inputTimer)
  searchInput.value = ''
  keyword.value = ''
  page.value = 0
  clearResults()
  router.replace({name: 'search'})
  nextTick(() => searchInputRef.value?.focus())
}

function useSuggestion(value) {
  searchInput.value = value
  page.value = 0
  updateRoute(value, 'all')
}

function switchTab(tab) {
  if (!tabValues.has(tab) || tab === activeTab.value) return
  page.value = 0
  updateRoute(keyword.value, tab)
}

function changePage(nextPage) {
  const safePage = Math.min(Math.max(Number(nextPage) || 0, 0), totalPages.value - 1)
  if (safePage === page.value) return
  page.value = safePage
  void runSearch()
  window.scrollTo({top: 310, behavior: 'smooth'})
}

async function playSong(song, index = 0) {
  await playSongWithQueue(song, results.songs, Math.max(0, index - page.value * pageSize))
}

function openArtist(artist) {
  const id = Number(artist?.id || 0)
  if (id) router.push({name: 'artistDetailPage', query: {id}})
}

function openAlbum(album) {
  const id = Number(album?.id || 0)
  if (id) router.push({name: 'albumDetailPage', query: {id}})
}

function openPlaylist(playlist) {
  const id = Number(playlist?.id || playlist?.playlistId || 0)
  if (id) router.push({name: 'playlistDetailPage', query: {id}})
}

function formatCount(value) {
  const count = Number(value || 0)
  if (count >= 10000) return `${(count / 10000).toFixed(count >= 100000 ? 0 : 1)}万`
  return count.toLocaleString()
}

function focusSearchInput() {
  nextTick(() => searchInputRef.value?.focus())
}

watch(
  () => [route.query.q, route.query.tab],
  ([query, tab]) => {
    const nextKeyword = String(query || '').trim()
    const nextTab = tabValues.has(String(tab || '')) ? String(tab) : 'all'
    const changed = nextKeyword !== keyword.value || nextTab !== activeTab.value
    keyword.value = nextKeyword
    searchInput.value = nextKeyword
    activeTab.value = nextTab
    page.value = 0
    if (changed || (!loading.value && nextKeyword && !hasResults.value)) void runSearch()
    if (!nextKeyword) clearResults()
  },
  {immediate: true},
)

onMounted(() => {
  window.addEventListener('aurora:focus-search-page', focusSearchInput)
  if (!keyword.value) focusSearchInput()
})

onBeforeUnmount(() => {
  if (inputTimer) window.clearTimeout(inputTimer)
  requestId += 1
  window.removeEventListener('aurora:focus-search-page', focusSearchInput)
})
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  color: #27272a;
  background:
    radial-gradient(circle at 50% -5%, rgba(255, 221, 226, 0.88), transparent 28%),
    radial-gradient(circle at 95% 34%, rgba(255, 241, 211, 0.52), transparent 22%),
    #f7f7f8;
}

button,
input { font: inherit; }
button { cursor: pointer; }
.search-main { width: min(100%, 1260px); min-height: calc(100vh - 76px); margin: 0 auto; padding: 72px 28px 150px; }
.search-hero { text-align: center; }
.search-hero > p:first-child { display: flex; align-items: center; justify-content: center; gap: 9px; margin: 0; color: #e85769; font-size: 8px; font-weight: 900; letter-spacing: 0.22em; }
.search-hero > p:first-child span { width: 26px; height: 1px; background: currentColor; }
.search-hero h1 { max-width: 940px; margin: 20px auto 0; overflow: hidden; color: #242428; font-size: clamp(42px, 6vw, 76px); font-weight: 920; letter-spacing: -0.06em; line-height: 1.08; text-overflow: ellipsis; white-space: nowrap; }
.search-hero-copy { margin: 16px 0 0; color: #909097; font-size: 12px; font-weight: 620; }
.search-box { display: grid; width: min(100%, 760px); height: 70px; align-items: center; grid-template-columns: 22px minmax(0, 1fr) auto auto; gap: 12px; margin: 34px auto 0; padding: 8px 9px 8px 22px; border: 1px solid rgba(24, 24, 27, 0.07); border-radius: 24px; background: rgba(255, 255, 255, 0.88); box-shadow: 0 24px 68px rgba(55, 42, 41, 0.1); backdrop-filter: blur(18px); }
.search-box > svg { width: 22px; color: #7e7e85; }
.search-box input { min-width: 0; height: 100%; color: #27272a; border: 0; outline: 0; background: transparent; font-size: 15px; font-weight: 680; }
.search-box input::placeholder { color: #aaaab0; }
.search-clear { display: grid; width: 34px; aspect-ratio: 1; place-items: center; color: #93939a; border: 0; border-radius: 50%; background: transparent; font-size: 20px; }
.search-clear:hover { color: #27272a; background: #f0f0f1; }
.search-submit { height: 52px; padding: 0 24px; color: #fff; border: 0; border-radius: 18px; background: #27272a; font-size: 11px; font-weight: 800; transition: transform 180ms ease, background 180ms ease; }
.search-submit:hover { background: #e85769; transform: translateY(-1px); }
.search-suggestions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 7px; margin-top: 22px; }
.search-suggestions span { margin-right: 3px; color: #aaaab0; font-size: 9px; font-weight: 720; }
.search-suggestions button { height: 30px; padding: 0 12px; color: #717178; border: 1px solid rgba(24, 24, 27, 0.065); border-radius: 999px; background: rgba(255, 255, 255, 0.58); font-size: 9px; font-weight: 720; }
.search-suggestions button:hover { color: #e85769; border-color: rgba(232, 87, 105, 0.2); background: #fff; }

.search-tabs { position: sticky; top: 76px; z-index: 40; display: flex; width: fit-content; max-width: 100%; margin: 56px auto 0; overflow-x: auto; padding: 6px; border: 1px solid rgba(24, 24, 27, 0.065); border-radius: 18px; background: rgba(250, 250, 250, 0.88); box-shadow: 0 12px 34px rgba(41, 36, 34, 0.06); backdrop-filter: blur(18px); scrollbar-width: none; }
.search-tabs::-webkit-scrollbar { display: none; }
.search-tabs button { display: flex; min-width: 94px; height: 42px; align-items: center; justify-content: center; gap: 7px; color: #85858c; border: 0; border-radius: 13px; background: transparent; font-size: 10px; font-weight: 790; }
.search-tabs button small { color: #b1b1b7; font-size: 8px; font-weight: 700; }
.search-tabs button.is-active { color: #fff; background: #27272a; box-shadow: 0 7px 18px rgba(24, 24, 27, 0.15); }
.search-tabs button.is-active small { color: #f29aa4; }

.search-overview,
.search-result-page { padding-top: 72px; }
.search-result-section + .search-result-section { margin-top: 86px; }
.search-section-heading,
.search-page-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 27px; }
.search-section-heading p,
.search-page-heading p { margin: 0 0 7px; color: #e85769; font-size: 8px; font-weight: 900; letter-spacing: 0.2em; }
.search-section-heading h2,
.search-page-heading h2 { margin: 0; font-size: clamp(31px, 3.5vw, 45px); font-weight: 900; letter-spacing: -0.05em; }
.search-section-heading button { padding: 9px 13px; color: #6f6f76; border: 1px solid rgba(24, 24, 27, 0.07); border-radius: 999px; background: rgba(255, 255, 255, 0.67); font-size: 9px; font-weight: 760; }
.search-section-heading button span { margin-left: 6px; color: #e85769; }
.search-page-heading > span { color: #9999a0; font-size: 10px; font-weight: 680; }

.search-song-section { padding: clamp(20px, 3vw, 34px); border: 1px solid rgba(255, 255, 255, 0.78); border-radius: 34px; background: rgba(255, 255, 255, 0.62); box-shadow: 0 20px 56px rgba(46, 39, 37, 0.06); }
.search-song-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 12px; }
.search-artist-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 18px; }
.search-artist-grid button { min-width: 0; padding: 0; text-align: center; border: 0; background: transparent; }
.search-artist-grid button > span { display: block; aspect-ratio: 1; overflow: hidden; border-radius: 50%; background: #e4e4e7; box-shadow: 0 14px 34px rgba(40, 35, 33, 0.09); transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1); }
.search-artist-grid button:hover > span { transform: translateY(-6px); }
.search-artist-grid :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.search-artist-grid strong,
.search-artist-grid small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search-artist-grid strong { margin-top: 14px; font-size: 13px; font-weight: 830; }
.search-artist-grid small { margin-top: 5px; color: #aaaab0; font-size: 8px; font-weight: 720; letter-spacing: 0.07em; }
.search-media-grid,
.search-playlist-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 32px 18px; }
.search-media-grid > button { min-width: 0; padding: 0; text-align: left; border: 0; background: transparent; }
.search-media-cover { display: block; aspect-ratio: 1; overflow: hidden; border: 1px solid rgba(24, 24, 27, 0.055); border-radius: 24px; background: #e5e5e6; box-shadow: 0 14px 36px rgba(43, 37, 35, 0.08); transition: transform 340ms cubic-bezier(0.22, 1, 0.36, 1); }
.search-media-grid button:hover .search-media-cover,
.search-media-page-grid button:hover .search-media-cover { transform: translateY(-6px); }
.search-media-cover :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.search-media-grid strong,
.search-media-grid small,
.search-media-page-grid strong,
.search-media-page-grid small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search-media-grid strong,
.search-media-page-grid strong { margin: 13px 2px 0; font-size: 13px; font-weight: 820; }
.search-media-grid small,
.search-media-page-grid small { margin: 5px 2px 0; color: #a1a1aa; font-size: 10px; }

.search-song-page { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 18px; padding: 18px; border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 30px; background: rgba(255, 255, 255, 0.64); box-shadow: 0 20px 56px rgba(46, 39, 37, 0.06); }
.search-artist-page-grid,
.search-media-page-grid,
.search-playlist-page-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 36px 18px; }
.search-artist-page-grid button,
.search-media-page-grid button { min-width: 0; padding: 0; text-align: left; border: 0; background: transparent; }
.search-artist-page-cover { position: relative; display: block; aspect-ratio: 0.9; overflow: hidden; border-radius: 25px; background: #e4e4e7; box-shadow: 0 15px 38px rgba(42, 36, 34, 0.09); transition: transform 340ms cubic-bezier(0.22, 1, 0.36, 1); }
.search-artist-page-grid button:hover .search-artist-page-cover { transform: translateY(-6px); }
.search-artist-page-cover :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.search-artist-page-cover i { position: absolute; top: 13px; right: 13px; display: grid; width: 31px; aspect-ratio: 1; place-items: center; color: #fff; border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 50%; background: rgba(20, 20, 22, 0.18); font-size: 8px; font-style: normal; font-weight: 800; backdrop-filter: blur(10px); }
.search-artist-page-grid strong,
.search-artist-page-grid small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search-artist-page-grid strong { margin: 13px 2px 0; font-size: 13px; font-weight: 830; }
.search-artist-page-grid small { margin: 5px 2px 0; color: #aaaab0; font-size: 8px; }

.search-pagination { display: flex; align-items: center; justify-content: center; gap: 20px; margin-top: 50px; }
.search-pagination button { padding: 11px 16px; color: #5f5f66; border: 1px solid rgba(24, 24, 27, 0.08); border-radius: 999px; background: #fff; font-size: 9px; font-weight: 780; }
.search-pagination button:disabled { cursor: not-allowed; opacity: 0.4; }
.search-pagination span { color: #9b9ba1; font-size: 8px; font-weight: 820; letter-spacing: 0.11em; }

.search-state { display: grid; min-height: 390px; place-items: center; align-content: center; text-align: center; }
.search-state > span { display: grid; width: 58px; aspect-ratio: 1; place-items: center; color: #e85769; border: 1px solid rgba(232, 87, 105, 0.14); border-radius: 50%; background: rgba(255, 255, 255, 0.62); font-size: 24px; }
.search-state h2 { margin: 20px 0 0; font-size: 25px; font-weight: 880; letter-spacing: -0.04em; }
.search-state p { margin: 9px 0 0; color: #96969d; font-size: 11px; }
.search-state button { margin-top: 18px; padding: 10px 15px; color: #fff; border: 0; border-radius: 999px; background: #27272a; font-size: 10px; font-weight: 780; }
.search-loading { padding-top: 76px; }
.search-loading-line { display: block; width: 190px; height: 38px; margin-bottom: 26px; border-radius: 12px; background: #e7e7e8; animation: search-pulse 1.35s ease-in-out infinite; }
.search-loading-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.search-loading-grid i { aspect-ratio: 1; border-radius: 25px; background: #e7e7e8; animation: search-pulse 1.35s ease-in-out infinite; }
@keyframes search-pulse { 50% { opacity: 0.45; } }

@media (max-width: 1080px) {
  .search-tabs { top: 68px; }
  .search-media-grid,
  .search-playlist-grid,
  .search-artist-page-grid,
  .search-media-page-grid,
  .search-playlist-page-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (max-width: 820px) {
  .search-main { padding: 58px 18px 130px; }
  .search-song-list,
  .search-song-page { grid-template-columns: 1fr; }
  .search-artist-grid { grid-template-columns: repeat(4, 1fr); }
  .search-media-grid,
  .search-playlist-grid,
  .search-artist-page-grid,
  .search-media-page-grid,
  .search-playlist-page-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 560px) {
  .search-main { padding: 46px 13px 120px; }
  .search-hero h1 { font-size: 42px; }
  .search-box { height: 60px; grid-template-columns: 20px minmax(0, 1fr) auto; padding-left: 16px; border-radius: 20px; }
  .search-submit { width: 46px; height: 44px; overflow: hidden; padding: 0; color: transparent; border-radius: 15px; }
  .search-submit::after { color: #fff; content: '→'; font-size: 16px; }
  .search-tabs { width: calc(100% + 26px); margin-right: -13px; margin-left: -13px; border-right: 0; border-left: 0; border-radius: 0; }
  .search-tabs button { min-width: 86px; }
  .search-overview,
  .search-result-page { padding-top: 54px; }
  .search-section-heading,
  .search-page-heading { align-items: start; flex-direction: column; }
  .search-song-section { padding: 14px 7px; border-radius: 25px; }
  .search-artist-grid { display: flex; margin-right: -13px; overflow-x: auto; gap: 14px; padding-right: 13px; scrollbar-width: none; }
  .search-artist-grid button { width: 42vw; flex: none; }
  .search-media-grid,
  .search-playlist-grid { display: flex; margin-right: -13px; overflow-x: auto; gap: 14px; padding-right: 13px; padding-bottom: 12px; scrollbar-width: none; }
  .search-media-grid > button,
  .search-playlist-grid :deep(.playlist-card) { width: 66vw; flex: none; }
  .search-artist-page-grid,
  .search-media-page-grid,
  .search-playlist-page-grid { grid-template-columns: repeat(2, 1fr); gap: 28px 12px; }
  .search-song-page { padding: 8px 2px; border-radius: 24px; }
  .search-loading-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after { scroll-behavior: auto !important; animation-duration: 1ms !important; transition-duration: 1ms !important; }
}
</style>
