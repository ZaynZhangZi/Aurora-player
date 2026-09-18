<template>
  <div class="search-page">
    <AppHeader />

    <div class="search-progress" :class="{ 'is-on': busy }" aria-hidden="true"><span /></div>

    <main class="search-main" :class="{ 'is-result': hasKeyword }" data-route-motion-root>
      <!-- 空闲态 Hero：进入结果态时平滑折叠，不卸载重排 -->
      <div class="hero-block">
        <p class="hero-eyebrow"><span /> SEARCH THE SOUND</p>
        <h1 class="hero-title">想听什么？</h1>
        <p class="hero-copy">歌曲、艺人、专辑和歌单，都可以从这里找到。</p>
      </div>

      <!-- 常驻搜索工具栏：搜索框在两种状态间保持视觉连续 -->
      <div class="search-toolbar">
        <div class="search-toolbar-primary">
          <form class="search-box" role="search" @submit.prevent="submitSearch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" stroke-linecap="round" />
            </svg>
            <input
              ref="searchInputRef"
              v-model="searchInput"
              type="search"
              autocomplete="off"
              aria-label="搜索歌曲、歌手、专辑或歌单"
              placeholder="搜索歌曲、艺人、专辑或歌单"
              @input="scheduleSearch"
            >
            <button v-if="searchInput" class="search-clear" type="button" aria-label="清空搜索" @click="clearSearch">×</button>
            <button class="search-submit" type="submit" aria-label="搜索">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12h13m-5-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
          </form>

        </div>

        <div v-if="hasKeyword" class="toolbar-tabs">
          <SearchTabs :tabs="tabs" :active="activeTab" @change="switchTab" />
        </div>
      </div>

      <!-- 空闲态：最近搜索 -->
      <div class="idle-extras">
        <section v-if="history.length" class="idle-group">
          <header class="idle-head">
            <h2>最近搜索</h2>
            <button type="button" class="idle-clear" @click="clearHistory">清空</button>
          </header>
          <div class="chip-row">
            <span v-for="item in history" :key="item" class="chip">
              <button type="button" class="chip-main" @click="useSuggestion(item)">{{ item }}</button>
              <button type="button" class="chip-del" :aria-label="`删除搜索记录 ${item}`" @click="removeHistory(item)">×</button>
            </span>
          </div>
        </section>
        <section class="idle-group idle-discover">
          <header class="idle-head">
            <div>
              <small>QUICK DISCOVERY</small>
              <h2>从这些声音开始</h2>
            </div>
            <span>点击即可搜索</span>
          </header>
          <div class="discovery-grid">
            <button
              v-for="(item, index) in suggestions"
              :key="item"
              type="button"
              @click="useSuggestion(item)"
            >
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <strong>{{ item }}</strong>
              <i aria-hidden="true">↗</i>
            </button>
          </div>
        </section>
      </div>

      <!-- 结果态 -->
      <div v-if="hasKeyword" ref="resultsTopRef" class="results" :aria-busy="busy">
        <div v-if="loading && !visibleHasResults" class="results-skeleton">
          <SearchSkeleton />
        </div>

        <section v-else-if="error && !visibleHasResults" class="state state-error">
          <span class="state-icon">!</span>
          <h2>搜索遇到了一点问题</h2>
          <p>{{ error }}</p>
          <button type="button" class="state-btn" @click="runSearch">重新搜索</button>
        </section>

        <section v-else-if="!visibleHasResults && !busy" class="state">
          <span class="state-icon">⌕</span>
          <h2>没有找到“{{ keyword }}”</h2>
          <p>换一个歌名、艺人名，或试试更短的关键词。</p>
        </section>

        <div v-else-if="visibleHasResults" class="results-body">
          <Transition name="tab-fade">
            <div :key="panelKey" class="tab-panel">
          <!-- 综合 -->
          <template v-if="displayTab === 'all'">
            <div class="overview-lead">
              <SearchBestMatch
                v-if="bestMatch"
                :match="bestMatch"
                @open="openBestMatch"
              />
              <div v-if="results.songs.length" class="overview-song-panel">
                <SearchSongList
                  :songs="results.songs.slice(0, 5)"
                  :start-index="0"
                  title="歌曲"
                  :view-all-label="counts.songs > 5 ? `查看全部 ${formatCount(counts.songs)} 首` : ''"
                  @play="playSong"
                  @view-all="switchTab('songs')"
                />
              </div>
            </div>
            <div class="overview-sections">
              <SearchMediaSection
                v-if="results.albums.length"
                variant="album"
                title="专辑"
                :items="results.albums.slice(0, 5)"
                :view-all-label="counts.albums > 5 ? `查看全部 ${formatCount(counts.albums)} 张` : ''"
                @open="openAlbum"
                @view-all="switchTab('albums')"
              />
              <SearchMediaSection
                v-if="results.playlists.length"
                variant="playlist"
                title="歌单"
                :items="results.playlists.slice(0, 5)"
                :view-all-label="counts.playlists > 5 ? `查看全部 ${formatCount(counts.playlists)} 个` : ''"
                @open="openPlaylist"
                @view-all="switchTab('playlists')"
              />
              <SearchMediaSection
                v-if="results.artists.length"
                variant="artist"
                title="相关艺人"
                :items="results.artists.slice(0, 6)"
                :view-all-label="counts.artists > 6 ? `查看全部 ${formatCount(counts.artists)} 位` : ''"
                @open="openArtist"
                @view-all="switchTab('artists')"
              />
            </div>
          </template>

          <!-- 单分类 -->
          <section v-else class="result-page">
            <SearchSongList
              v-if="displayTab === 'songs'"
              :songs="results.songs"
              :start-index="page * pageSize"
              title="歌曲"
              @play="playSong"
            />
            <SearchMediaSection
              v-else-if="displayTab === 'artists'"
              variant="artist"
              title="艺人"
              :items="results.artists"
              @open="openArtist"
            />
            <SearchMediaSection
              v-else-if="displayTab === 'albums'"
              variant="album"
              title="专辑"
              :items="results.albums"
              @open="openAlbum"
            />
            <SearchMediaSection
              v-else
              variant="playlist"
              title="歌单"
              :items="results.playlists"
              @open="openPlaylist"
            />

            <div v-if="displayTab === activeTab && totalPages > 1" class="pagination">
              <button type="button" :disabled="page <= 0 || busy" @click="changePage(page - 1)">← 上一页</button>
              <span>第 {{ page + 1 }} / {{ totalPages }} 页</span>
              <button type="button" :disabled="page + 1 >= totalPages || busy" @click="changePage(page + 1)">下一页 →</button>
            </div>
          </section>
            </div>
          </Transition>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
defineOptions({name: 'SearchPage'})

import {computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import AppHeader from '@/components/appHeader/AppHeader.vue'
import SearchTabs from './components/SearchTabs.vue'
import SearchBestMatch from './components/SearchBestMatch.vue'
import SearchSongList from './components/SearchSongList.vue'
import SearchMediaSection from './components/SearchMediaSection.vue'
import SearchSkeleton from './components/SearchSkeleton.vue'
import {searchApi} from '@/api/searchApi/searchApi.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'
import {useDetailNavigation} from '@/composables/useDetailNavigation.js'
import {useSearchHistory} from '@/composables/useSearchHistory.js'

const route = useRoute()
const router = useRouter()
const {openDetail} = useDetailNavigation()
const {history, add: addHistory, remove: removeHistory, clear: clearHistory} = useSearchHistory()

const searchInputRef = ref(null)
const resultsTopRef = ref(null)
const searchInput = ref('')
const keyword = ref('')
const loading = ref(false)
const refreshing = ref(false)
const error = ref('')
const activeTab = ref('all')
const displayTab = ref('all')
const displayQuery = ref('')
const panelRevision = ref(0)
const page = ref(0)
const pageSize = 20
let inputTimer = null
let requestId = 0

const tabs = [
  {label: '综合', value: 'all'},
  {label: '歌曲', value: 'songs'},
  {label: '艺人', value: 'artists'},
  {label: '专辑', value: 'albums'},
  {label: '歌单', value: 'playlists'},
]
const suggestions = ['周杰伦', '陈奕迅', '林俊杰', 'Taylor Swift', '五月天', '陶喆']
const tabValues = new Set(tabs.map(item => item.value))
const typeConfig = {
  songs: {type: 1, key: 'songs', countKey: 'songCount'},
  artists: {type: 100, key: 'artists', countKey: 'artistCount'},
  albums: {type: 10, key: 'albums', countKey: 'albumCount'},
  playlists: {type: 1000, key: 'playlists', countKey: 'playlistCount'},
}
const results = reactive({songs: [], artists: [], albums: [], playlists: []})
const counts = reactive({all: 0, songs: 0, artists: 0, albums: 0, playlists: 0})
const loadedQuery = reactive({all: '', songs: '', artists: '', albums: '', playlists: ''})

const hasKeyword = computed(() => Boolean(keyword.value))
const busy = computed(() => loading.value || refreshing.value)
const hasResults = computed(() => Object.values(results).some(list => list.length))
const activeCount = computed(() => (
  loadedQuery[activeTab.value] === keyword.value
    ? Number(counts[activeTab.value] || 0)
    : 0
))
const totalPages = computed(() => Math.max(1, Math.ceil(activeCount.value / pageSize)))
const visibleHasResults = computed(() => hasResultsForTab(displayTab.value, displayQuery.value))
const panelKey = computed(() => `${displayQuery.value}:${displayTab.value}:${panelRevision.value}`)
const bestMatch = computed(() => findBestMatch(keyword.value))

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
  loadedQuery.all = ''
  loadedQuery.songs = ''
  loadedQuery.artists = ''
  loadedQuery.albums = ''
  loadedQuery.playlists = ''
  displayQuery.value = ''
  displayTab.value = 'all'
}

function hasResultsForTab(tab, query = keyword.value) {
  if (!query || loadedQuery[tab] !== query) return false
  if (tab === 'all') return Object.values(results).some(list => list.length)
  return Boolean(results[tab]?.length)
}

function revealPanel(tab, query) {
  const changed = displayTab.value !== tab || displayQuery.value !== query
  displayTab.value = tab
  displayQuery.value = query
  if (changed) panelRevision.value += 1
}

function normalizedSearchText(value) {
  return String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, '')
}

function findBestMatch(query) {
  const target = normalizedSearchText(query)
  if (!target || loadedQuery.all !== query) return null
  const candidates = [
    ...results.artists.map((item, index) => ({type: 'artist', item, index, weight: 4})),
    ...results.albums.map((item, index) => ({type: 'album', item, index, weight: 3})),
    ...results.playlists.map((item, index) => ({type: 'playlist', item, index, weight: 2})),
    ...results.songs.map((item, index) => ({type: 'song', item, index, weight: 1})),
  ]
  let winner = null
  let winningScore = -Infinity
  candidates.forEach((candidate) => {
    const name = normalizedSearchText(candidate.item?.name)
    if (!name) return
    let score = candidate.weight - candidate.index * 0.1
    if (name === target) score += 120
    else if (name.startsWith(target)) score += 80
    else if (name.includes(target)) score += 52
    else if (target.includes(name)) score += 30
    if (score > winningScore) {
      winner = candidate
      winningScore = score
    }
  })
  return winner
}

function extractResult(response, config) {
  const result = response?.data?.result || {}
  return {
    items: Array.isArray(result[config.key]) ? result[config.key] : [],
    count: Number(result[config.countKey] || 0),
  }
}

async function runSearch({query = keyword.value, tab = activeTab.value} = {}) {
  const q = String(query || '').trim()
  const searchTab = tabValues.has(tab) ? tab : 'all'
  const currentRequest = ++requestId
  if (!q) {
    clearResults()
    loading.value = false
    refreshing.value = false
    error.value = ''
    return
  }

  // 已有结果则保留并弱化（顶部进度线），首次搜索才展示骨架屏
  if (hasResults.value) refreshing.value = true
  else loading.value = true
  error.value = ''

  try {
    if (searchTab === 'all') {
      const entries = Object.entries(typeConfig)
      const settled = await Promise.allSettled(entries.map(([, config]) => searchApi.searchByType(q, {
        type: config.type,
        limit: config.key === 'songs' ? 6 : 5,
        offset: 0,
      })))
      if (currentRequest !== requestId) return

      let successCount = 0
      const nextResults = {songs: [], artists: [], albums: [], playlists: []}
      const nextCounts = {songs: 0, artists: 0, albums: 0, playlists: 0}
      settled.forEach((result, index) => {
        const [name, config] = entries[index]
        if (result.status !== 'fulfilled') return
        successCount += 1
        const extracted = extractResult(result.value, config)
        nextResults[name] = extracted.items
        nextCounts[name] = extracted.count
      })
      if (!successCount) throw new Error('搜索服务暂时不可用，请稍后重试')
      Object.assign(results, nextResults)
      Object.assign(counts, nextCounts)
      counts.all = counts.songs + counts.artists + counts.albums + counts.playlists
      loadedQuery.all = q
      loadedQuery.songs = q
      loadedQuery.artists = q
      loadedQuery.albums = q
      loadedQuery.playlists = q
      revealPanel(searchTab, q)
      return
    }

    const config = typeConfig[searchTab]
    const response = await searchApi.searchByType(q, {
      type: config.type,
      limit: pageSize,
      offset: page.value * pageSize,
    })
    if (currentRequest !== requestId) return
    const extracted = extractResult(response, config)
    results[searchTab] = extracted.items
    counts[searchTab] = extracted.count
    loadedQuery[searchTab] = q
    revealPanel(searchTab, q)
  } catch (searchError) {
    if (currentRequest !== requestId) return
    error.value = searchError?.message || '搜索失败，请稍后重试'
  } finally {
    if (currentRequest === requestId) {
      loading.value = false
      refreshing.value = false
    }
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
  addHistory(q)
  updateRoute(q, activeTab.value)
}

function scheduleSearch() {
  if (inputTimer) window.clearTimeout(inputTimer)
  const q = searchInput.value.trim()
  inputTimer = window.setTimeout(() => {
    page.value = 0
    if (q) addHistory(q)
    updateRoute(q, activeTab.value, true)
  }, 300)
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
  addHistory(value)
  updateRoute(value, 'all')
  nextTick(() => searchInputRef.value?.focus())
}

function switchTab(tab) {
  if (!tabValues.has(tab) || tab === activeTab.value) return
  page.value = 0
  updateRoute(keyword.value, tab, true)
}

function changePage(nextPage) {
  const safePage = Math.min(Math.max(Number(nextPage) || 0, 0), totalPages.value - 1)
  if (safePage === page.value || busy.value) return
  page.value = safePage
  void runSearch().then(() => {
    const el = resultsTopRef.value
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 150
    window.scrollTo({top: Math.max(0, top), behavior: 'smooth'})
  })
}

async function playSong(song, index = 0) {
  await playSongWithQueue(song, results.songs, Math.max(0, index - page.value * pageSize))
}

function openBestMatch(match) {
  if (!match?.item) return
  if (match.type === 'song') {
    const index = Math.max(0, results.songs.findIndex(item => String(item?.id) === String(match.item?.id)))
    void playSong(match.item, index)
    return
  }
  if (match.type === 'artist') openArtist(match.item)
  else if (match.type === 'album') openAlbum(match.item)
  else if (match.type === 'playlist') openPlaylist(match.item)
}

function openArtist(artist) {
  const id = Number(artist?.id || 0)
  if (id) openDetail('artist', id, {query: artist?.name ? {name: artist.name} : undefined})
}

function openAlbum(album) {
  const id = Number(album?.id || 0)
  if (id) openDetail('album', id)
}

function openPlaylist(playlist) {
  const id = Number(playlist?.id || playlist?.playlistId || 0)
  if (id) openDetail('playlist', id)
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
    const previousKeyword = keyword.value
    const previousTab = activeTab.value
    const keywordChanged = nextKeyword !== previousKeyword
    const tabChanged = nextTab !== previousTab
    const changed = keywordChanged || tabChanged
    keyword.value = nextKeyword
    searchInput.value = nextKeyword
    activeTab.value = nextTab
    page.value = 0
    if (!nextKeyword) {
      clearResults()
      return
    }
    if (!keywordChanged && tabChanged && hasResultsForTab(nextTab, nextKeyword)) {
      revealPanel(nextTab, nextKeyword)
    }
    if (changed || (!loading.value && !hasResultsForTab(nextTab, nextKeyword))) {
      void runSearch({query: nextKeyword, tab: nextTab})
    }
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
  --sp-ink: #1b1b1f;
  --sp-muted: #86868f;
  --sp-faint: #adadb5;
  --sp-accent: #e85769;
  --sp-accent-ink: #d92c49;
  --sp-line: rgba(24, 24, 27, 0.075);
  --sp-ease: cubic-bezier(0.22, 1, 0.36, 1);

  min-height: 100vh;
  color: var(--sp-ink);
  background:
    radial-gradient(920px 500px at 50% -12%, rgba(255, 216, 226, 0.64), transparent 64%),
    radial-gradient(620px 420px at 96% 24%, rgba(255, 238, 208, 0.28), transparent 64%),
    #f6f6f7;
}

button,
input { font: inherit; }
button { cursor: pointer; }

/* 顶部细进度条 */
.search-progress { position: fixed; top: 76px; right: 0; left: 0; z-index: 70; height: 2px; overflow: hidden; opacity: 0; transition: opacity 200ms ease; pointer-events: none; }
.search-progress.is-on { opacity: 1; }
.search-progress span { display: block; width: 40%; height: 100%; border-radius: 2px; background: linear-gradient(90deg, transparent, var(--sp-accent), transparent); animation: sp-progress 1.1s ease-in-out infinite; }
@keyframes sp-progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(320%); } }

.search-main { box-sizing: border-box; width: min(100%, 1200px); min-height: calc(100vh - 76px); margin: 0 auto; padding: 40px 28px calc(var(--global-player-space, 104px) + 40px); }

/* ── Hero（空闲态） ── */
.hero-block { max-height: 360px; margin-bottom: 8px; overflow: hidden; text-align: center; transition: opacity 300ms ease, transform 420ms var(--sp-ease), max-height 440ms var(--sp-ease), margin 440ms var(--sp-ease); animation: sp-fade-up 420ms var(--sp-ease) both; }
.is-result .hero-block { max-height: 0; margin-bottom: 0; opacity: 0; transform: translateY(-8px); pointer-events: none; }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 10px; margin: 0; padding: 6px 14px; color: var(--sp-accent-ink); border: 1px solid rgba(232, 87, 105, 0.16); border-radius: 999px; background: rgba(255, 255, 255, 0.6); font-size: 10px; font-weight: 800; letter-spacing: 0.2em; }
.hero-eyebrow span { width: 20px; height: 1px; background: currentColor; opacity: 0.6; }
.hero-title { margin: 22px auto 0; color: var(--sp-ink); font-size: clamp(38px, 5.4vw, 56px); font-weight: 900; letter-spacing: -0.05em; line-height: 1.08; }
.hero-copy { max-width: 520px; margin: 16px auto 0; color: var(--sp-muted); font-size: 13px; line-height: 1.6; }

/* ── 搜索工具栏（常驻搜索框） ── */
.search-toolbar { display: flex; flex-direction: column; align-items: center; gap: 0; padding: 26px 0 0; transition: padding 420ms var(--sp-ease), background 220ms ease, box-shadow 220ms ease; }
.search-toolbar-primary { display: flex; width: 100%; flex-direction: column; align-items: center; }
.is-result .search-toolbar {
  position: sticky;
  top: 76px;
  z-index: 45;
  align-items: stretch;
  margin: 0 -14px;
  padding: 10px 14px 7px;
  border-bottom: 1px solid rgba(24, 24, 27, 0.065);
  border-radius: 0 0 22px 22px;
  background: rgba(246, 246, 247, 0.86);
  box-shadow: 0 14px 34px rgba(38, 34, 34, 0.045);
  backdrop-filter: blur(22px) saturate(1.15);
}
.is-result .search-toolbar-primary { flex-direction: row; align-items: center; justify-content: center; }

.search-box { box-sizing: border-box; display: grid; width: 100%; max-width: 660px; height: 64px; align-items: center; grid-template-columns: 22px minmax(0, 1fr) auto auto; gap: 12px; padding: 8px 9px 8px 20px; border: 1px solid var(--sp-line); border-radius: 18px; background: rgba(255, 255, 255, 0.92); box-shadow: 0 16px 44px rgba(46, 39, 37, 0.09); transition: max-width 440ms var(--sp-ease), height 320ms var(--sp-ease), border-color 200ms ease, box-shadow 240ms ease; }
.is-result .search-box { max-width: 720px; height: 54px; flex: 1 1 620px; border-radius: 16px; box-shadow: 0 8px 24px rgba(46, 39, 37, 0.06); }
.search-box:focus-within { border-color: rgba(232, 87, 105, 0.42); box-shadow: 0 0 0 4px rgba(232, 87, 105, 0.1), 0 12px 30px rgba(46, 39, 37, 0.08); }
.search-box > svg { width: 21px; color: var(--sp-faint); transition: color 200ms ease; }
.search-box:focus-within > svg { color: var(--sp-accent); }
.search-box input { min-width: 0; height: 100%; color: var(--sp-ink); border: 0; outline: 0; background: transparent; font-size: 15px; font-weight: 600; }
.search-box input::placeholder { color: var(--sp-faint); font-weight: 500; }
.search-box input::-webkit-search-cancel-button { display: none; }
.search-clear { display: grid; width: 32px; aspect-ratio: 1; place-items: center; color: var(--sp-muted); border: 0; border-radius: 50%; background: transparent; font-size: 20px; line-height: 1; transition: color 160ms ease, background 160ms ease; }
.search-clear:hover { color: var(--sp-ink); background: #eeeef0; }
.search-submit { display: grid; width: 46px; height: 46px; place-items: center; color: #fff; border: 0; border-radius: 14px; background: var(--sp-ink); transition: transform 200ms var(--sp-ease), background 200ms ease; }
.is-result .search-submit { width: 40px; height: 40px; border-radius: 12px; }
.search-submit svg { width: 18px; height: 18px; }
.search-submit:hover { background: var(--sp-accent); transform: translateY(-1px); }
.search-submit:active { transform: scale(0.94); }
.search-submit:focus-visible,
.search-clear:focus-visible { outline: 2px solid rgba(232, 87, 105, 0.5); outline-offset: 2px; }

.toolbar-tabs { width: 100%; max-height: 0; margin-top: 0; overflow: hidden; opacity: 0; transition: opacity 260ms ease, max-height 340ms var(--sp-ease), margin 340ms var(--sp-ease); }
.is-result .toolbar-tabs { max-height: 52px; margin-top: 8px; opacity: 1; }

/* ── 空闲态附加区 ── */
.idle-extras { display: grid; gap: 40px; width: min(100%, 720px); max-height: 800px; margin: 46px auto 0; overflow: hidden; transition: opacity 300ms ease, max-height 420ms var(--sp-ease), margin 420ms var(--sp-ease); animation: sp-fade-up 460ms var(--sp-ease) 60ms both; }
.is-result .idle-extras { max-height: 0; margin-top: 0; opacity: 0; pointer-events: none; }
.idle-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.idle-head h2 { margin: 0; font-size: 13px; font-weight: 780; letter-spacing: 0.02em; }
.idle-head small { display: block; margin-bottom: 5px; color: var(--sp-accent); font-size: 9px; font-weight: 820; letter-spacing: 0.16em; }
.idle-head > span { color: var(--sp-faint); font-size: 11px; font-weight: 620; }
.idle-clear { padding: 4px 10px; color: var(--sp-muted); border: 1px solid var(--sp-line); border-radius: 999px; background: transparent; font-size: 11px; font-weight: 640; transition: color 160ms ease, border-color 160ms ease; }
.idle-clear:hover { color: var(--sp-accent-ink); border-color: rgba(232, 87, 105, 0.28); }

.chip-row { display: flex; flex-wrap: wrap; gap: 10px; }
.chip { display: inline-flex; align-items: center; overflow: hidden; border: 1px solid var(--sp-line); border-radius: 999px; background: rgba(255, 255, 255, 0.7); transition: border-color 160ms ease, background 160ms ease; }
.chip:hover { border-color: rgba(232, 87, 105, 0.28); background: #fff; }
.chip-main { max-width: 220px; padding: 9px 6px 9px 15px; overflow: hidden; color: #55555c; font-size: 12px; font-weight: 640; text-overflow: ellipsis; white-space: nowrap; border: 0; background: transparent; }
.chip-del { display: grid; width: 30px; height: 34px; place-items: center; color: var(--sp-faint); border: 0; background: transparent; font-size: 16px; line-height: 1; transition: color 160ms ease; }
.chip-del:hover { color: var(--sp-accent); }

.discovery-grid { display: grid; overflow: hidden; grid-template-columns: repeat(2, minmax(0, 1fr)); border: 1px solid var(--sp-line); border-radius: 20px; background: rgba(255, 255, 255, 0.58); }
.discovery-grid button { display: grid; min-width: 0; min-height: 62px; align-items: center; grid-template-columns: 28px minmax(0, 1fr) 20px; gap: 11px; padding: 12px 16px; text-align: left; color: var(--sp-ink); border: 0; border-right: 1px solid var(--sp-line); border-bottom: 1px solid var(--sp-line); background: transparent; transition: background 180ms ease, padding 220ms var(--sp-ease); }
.discovery-grid button:nth-child(2n) { border-right: 0; }
.discovery-grid button:nth-last-child(-n + 2) { border-bottom: 0; }
.discovery-grid button:hover { padding-left: 20px; background: rgba(255, 255, 255, 0.86); }
.discovery-grid button:focus-visible { position: relative; z-index: 1; outline: 2px solid rgba(232, 87, 105, 0.4); outline-offset: -2px; }
.discovery-grid button > span { color: var(--sp-faint); font-size: 10px; font-weight: 760; font-variant-numeric: tabular-nums; }
.discovery-grid button strong { overflow: hidden; font-size: 13px; font-weight: 720; text-overflow: ellipsis; white-space: nowrap; }
.discovery-grid button i { color: var(--sp-accent); font-size: 12px; font-style: normal; opacity: 0; transform: translateX(-4px); transition: opacity 180ms ease, transform 220ms var(--sp-ease); }
.discovery-grid button:hover i { opacity: 1; transform: none; }

/* ── 结果区 ── */
.results { padding-top: 34px; transition: opacity 200ms ease; }
.results-skeleton { padding-top: 8px; }
.results-body { position: relative; display: grid; min-height: 320px; align-items: start; }
.tab-panel { min-width: 0; grid-area: 1 / 1; }
.tab-fade-enter-active,
.tab-fade-leave-active { transition: opacity 220ms ease; }
.tab-fade-enter-active { z-index: 2; }
.tab-fade-leave-active { z-index: 1; pointer-events: none; }
.tab-fade-enter-from,
.tab-fade-leave-to { opacity: 0; }

.overview-lead { display: grid; grid-template-columns: minmax(0, 1fr); gap: 38px; }
.overview-song-panel { min-width: 0; padding: 20px 18px 16px; border: 1px solid rgba(255, 255, 255, 0.82); border-radius: 24px; background: rgba(255, 255, 255, 0.6); box-shadow: 0 16px 42px rgba(42, 36, 34, 0.055); }
.overview-sections { display: grid; gap: 48px; margin-top: 48px; }
.result-page { display: grid; gap: 8px; }

/* 分页 */
.pagination { display: flex; align-items: center; justify-content: center; gap: 18px; margin-top: 44px; }
.pagination button { padding: 11px 18px; color: #55555c; border: 1px solid var(--sp-line); border-radius: 999px; background: #fff; font-size: 13px; font-weight: 680; transition: color 160ms ease, border-color 160ms ease, transform 160ms var(--sp-ease); }
.pagination button:hover:not(:disabled) { color: var(--sp-accent-ink); border-color: rgba(232, 87, 105, 0.28); transform: translateY(-1px); }
.pagination button:disabled { cursor: not-allowed; opacity: 0.42; }
.pagination button:focus-visible { outline: 2px solid rgba(232, 87, 105, 0.4); outline-offset: 2px; }
.pagination span { color: var(--sp-muted); font-size: 12px; font-weight: 680; }

/* 空/错误态 */
.state { display: grid; min-height: 320px; place-items: center; align-content: center; text-align: center; animation: sp-fade-up 320ms var(--sp-ease) both; }
.state-icon { display: grid; width: 58px; aspect-ratio: 1; place-items: center; color: var(--sp-accent); border: 1px solid rgba(232, 87, 105, 0.16); border-radius: 50%; background: rgba(255, 255, 255, 0.7); font-size: 24px; }
.state h2 { margin: 20px 0 0; font-size: 21px; font-weight: 820; letter-spacing: -0.03em; }
.state p { max-width: 400px; margin: 10px 0 0; color: var(--sp-muted); font-size: 13px; line-height: 1.6; }
.state-btn { margin-top: 20px; padding: 11px 20px; color: #fff; border: 0; border-radius: 999px; background: var(--sp-ink); font-size: 13px; font-weight: 700; transition: transform 180ms var(--sp-ease), background 180ms ease; }
.state-btn:hover { background: var(--sp-accent); transform: translateY(-1px); }

@keyframes sp-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

/* ── 响应式 ── */
@media (max-width: 820px) {
  .search-main { padding: 28px 18px calc(var(--global-player-space, 104px) + 32px); }
  .is-result .search-toolbar { top: 68px; }
  .is-result .search-toolbar-primary { align-items: stretch; flex-direction: column; }
  .is-result .search-box { max-width: none; flex-basis: auto; }
}

@media (max-width: 560px) {
  .search-main { padding: 22px 14px calc(var(--global-player-space, 104px) + 28px); }
  .hero-title { font-size: 34px; }
  .search-box { height: 56px; gap: 8px; padding-right: 7px; padding-left: 14px; border-radius: 16px; }
  .is-result .search-box { height: 52px; }
  .search-submit { width: 42px; height: 42px; border-radius: 12px; }
  .is-result .search-submit { width: 38px; height: 38px; }
  .overview-sections { gap: 40px; margin-top: 40px; }
  .chip-main { max-width: 150px; }
  .idle-extras { margin-top: 34px; }
  .idle-head { align-items: flex-start; }
  .discovery-grid { grid-template-columns: 1fr; }
  .discovery-grid button,
  .discovery-grid button:nth-child(2n),
  .discovery-grid button:nth-last-child(-n + 2) { border-right: 0; border-bottom: 1px solid var(--sp-line); }
  .discovery-grid button:last-child { border-bottom: 0; }
  .overview-song-panel { padding: 14px 8px 10px; border-radius: 20px; }
}

/* 仅约束搜索页自身动画，不使用全局 * 覆盖 */
@media (prefers-reduced-motion: reduce) {
  .hero-block,
  .idle-extras,
  .search-toolbar,
  .search-box,
  .toolbar-tabs,
  .results,
  .results-body,
  .tab-panel,
  .state { animation: none !important; transition: opacity 100ms ease !important; transform: none !important; }
  .tab-fade-enter-active,
  .tab-fade-leave-active { transition: none !important; }
  .is-result .hero-block,
  .is-result .idle-extras { transform: none !important; }
  .search-progress span { animation: none !important; opacity: 0.5; }
}
</style>
