<template>
  <div class="browse-page">
    <AppHeader />

    <main class="browse-main" data-route-motion-root>
      <section class="browse-hero">
        <div class="browse-hero-heading">
          <div>
            <p>EDITOR'S PICKS</p>
            <h1>本周新声</h1>
          </div>
          <span>从新发行里挑出三张值得完整听完的作品。</span>
        </div>

        <div v-if="newAlbums.length" class="release-spotlight">
          <button
            v-for="(album, index) in newAlbums.slice(0, 3)"
            :key="`spotlight-${album.id}`"
            type="button"
            class="spotlight-card"
            :class="{ 'is-main': index === 0 }"
            @click="openAlbum(album, $event)"
          >
            <SmartMedia :src="album.picUrl" :alt="`${album.name}专辑封面`" :image-width="960" img-loading="eager" sizes="(min-width: 900px) 50vw, 88vw" data-album-hero-cover :data-album-id="album.id" />
            <span class="spotlight-shade" />
            <span class="spotlight-copy"><small>{{ index === 0 ? '本周主打' : '编辑推荐' }}</small><strong>{{ album.name }}</strong><i>{{ album.artistName }}</i></span>
          </button>
        </div>
        <div v-else class="release-spotlight spotlight-loading"><span v-for="index in 3" :key="index" /></div>
      </section>

      <nav class="browse-tabs" aria-label="发现音乐分类">
        <button v-for="tab in tabs" :key="tab.value" type="button" :class="{ 'is-active': activeTab === tab.value }" @click="switchTab(tab.value)">
          {{ tab.label }}
        </button>
      </nav>

      <section v-if="activeTab === 'styles'" key="styles" class="browse-section">
          <header class="section-heading">
            <div><p>按类别浏览</p><h2>曲风</h2></div>
            <span>两排曲风缓慢流动，悬停即可暂停。</span>
          </header>

          <div v-if="loading.styles" class="genre-marquee genre-marquee-loading" aria-label="曲风加载中">
            <div v-for="rowIndex in 2" :key="rowIndex" class="genre-row">
              <div class="genre-track"><span v-for="index in 7" :key="index" /></div>
            </div>
          </div>
          <div v-else-if="errors.styles" class="browse-state"><p>{{ errors.styles }}</p><button type="button" @click="loadStyles">重新加载</button></div>
          <div v-else class="genre-marquee" aria-label="自动滚动的曲风列表">
            <div v-for="(row, rowIndex) in genreRows" :key="rowIndex" class="genre-row">
              <div class="genre-track">
                <button
                  v-for="(style, index) in [...row, ...row]"
                  :key="`${rowIndex}-${style.tagId}-${index}`"
                  type="button"
                  class="genre-card"
                  :aria-hidden="index >= row.length"
                  :tabindex="index >= row.length ? -1 : 0"
                  @click="openStyle(style)"
                >
                  <SmartMedia :src="style.picUrl" :alt="`${style.tagName}曲风`" :image-width="640" sizes="(min-width: 1100px) 20vw, (min-width: 700px) 31vw, 48vw" />
                  <span />
                  <strong>{{ style.tagName }}</strong>
                  <small>{{ style.enName || 'GENRE' }}</small>
                </button>
              </div>
            </div>
          </div>

        </section>

      <section v-else-if="activeTab === 'releases'" key="releases" class="browse-section">
          <header class="section-heading section-heading-actions">
            <div><p>每周更新</p><h2>新碟与发行</h2></div>
            <div class="filter-pills"><button v-for="area in albumAreas" :key="area.value" type="button" :class="{ 'is-active': albumFilters.area === area.value }" @click="changeAlbumArea(area.value)">{{ area.label }}</button></div>
          </header>
          <div class="segmented-control"><button type="button" :class="{ 'is-active': albumFilters.type === 'new' }" @click="changeAlbumType('new')">本月新碟</button><button type="button" :class="{ 'is-active': albumFilters.type === 'hot' }" @click="changeAlbumType('hot')">热门发行</button></div>

          <div v-if="loading.albums" class="media-card-grid skeleton-grid"><span v-for="index in 10" :key="index" /></div>
          <div v-else-if="errors.albums" class="browse-state"><p>{{ errors.albums }}</p><button type="button" @click="refreshAlbums">重新加载</button></div>
          <div v-else class="media-card-grid release-grid">
            <button v-for="album in newAlbums.slice(0, 20)" :key="album.id" type="button" class="media-card" @click="openAlbum(album, $event)">
              <span data-album-hero-cover :data-album-id="album.id"><SmartMedia :src="album.picUrl" :alt="`${album.name}封面`" :image-width="640" sizes="230px" /><i>{{ formatReleaseDate(album.publishTime) }}</i></span>
              <strong>{{ album.name }}</strong><small>{{ album.artistName }}</small><em>{{ album.company || '新发行' }}</em>
            </button>
          </div>
      </section>

      <section v-else-if="activeTab === 'charts'" key="charts" class="browse-section">
          <header class="section-heading"><div><p>热门趋势</p><h2>排行榜</h2></div><span>查看此刻正在流行、上升和被反复播放的音乐。</span></header>
          <div v-if="loading.charts" class="chart-grid skeleton-grid"><span v-for="index in 8" :key="index" /></div>
          <div v-else-if="errors.charts" class="browse-state"><p>{{ errors.charts }}</p><button type="button" @click="loadCharts">重新加载</button></div>
          <div v-else class="chart-grid">
            <button v-for="chart in charts.slice(0, 12)" :key="chart.id" type="button" class="chart-card" @click="openPlaylist(chart, $event)">
              <span class="chart-art" data-playlist-hero-cover :data-playlist-id="chart.id"><SmartMedia :src="chart.coverImgUrl" :alt="`${chart.name}封面`" :image-width="500" sizes="170px" /></span>
              <span class="chart-info"><small>{{ chart.updateFrequency || '实时更新' }}</small><strong>{{ chart.name }}</strong><ol><li v-for="(track, index) in chart.tracks?.slice(0, 3)" :key="`${chart.id}-${index}`"><b>{{ index + 1 }}</b><span>{{ track.first }}</span><i>{{ track.second }}</i></li></ol></span>
            </button>
          </div>
      </section>

      <section v-else-if="activeTab === 'artists'" key="artists" class="browse-section">
          <header class="section-heading"><div><p>发现艺人</p><h2>艺人</h2></div><span>使用地区、类型和首字母快速浏览艺人目录。</span></header>
          <div class="artist-filter-panel">
            <div><small>地区</small><button v-for="area in artistAreas" :key="area.value" type="button" :class="{ 'is-active': artistFilters.area === area.value }" @click="changeArtistFilter('area', area.value)">{{ area.label }}</button></div>
            <div><small>类型</small><button v-for="type in artistTypes" :key="type.value" type="button" :class="{ 'is-active': artistFilters.type === type.value }" @click="changeArtistFilter('type', type.value)">{{ type.label }}</button></div>
            <div class="artist-initials"><small>索引</small><button v-for="initial in artistInitials" :key="initial.value" type="button" :class="{ 'is-active': artistFilters.initial === initial.value }" @click="changeArtistFilter('initial', initial.value)">{{ initial.label }}</button></div>
          </div>
          <div v-if="loading.artists" class="artist-directory skeleton-grid"><span v-for="index in 10" :key="index" /></div>
          <div v-else-if="errors.artists" class="browse-state"><p>{{ errors.artists }}</p><button type="button" @click="refreshArtists">重新加载</button></div>
          <div v-else class="artist-directory">
            <button v-for="artist in artists" :key="artist.id" type="button" @click="openArtist(artist, $event)">
              <span data-artist-hero-cover :data-artist-id="artist.id"><SmartMedia :src="artist.picUrl || artist.img1v1Url" :alt="`${artist.name}头像`" :image-width="560" sizes="220px" /></span>
              <strong>{{ artist.name }}</strong><small>{{ artist.alias?.[0] || `${artist.albumSize || 0} 张专辑` }}</small>
            </button>
          </div>
          <div class="browse-pagination"><button type="button" :disabled="artistFilters.offset <= 0 || loading.artists" @click="changeArtistPage(-1)">上一页</button><span>第 {{ Math.floor(artistFilters.offset / artistFilters.limit) + 1 }} 页</span><button type="button" :disabled="!artistHasMore || loading.artists" @click="changeArtistPage(1)">下一页</button></div>
      </section>

      <section v-else key="airwaves" class="browse-section">
          <header class="section-heading section-heading-actions">
            <div><p>听与看</p><h2>影音与播客</h2></div>
            <div class="segmented-control"><button type="button" :class="{ 'is-active': airwaveMode === 'mv' }" @click="airwaveMode = 'mv'">音乐视频</button><button type="button" :class="{ 'is-active': airwaveMode === 'radio' }" @click="openRadio">播客电台</button></div>
          </header>

          <template v-if="airwaveMode === 'mv'">
            <div class="media-toolbar"><div class="filter-pills"><button v-for="source in mvSourceOptions" :key="source.value" type="button" :class="{ 'is-active': activeMvSource === source.value }" @click="switchMvSource(source.value)">{{ source.label }}</button></div><div v-if="activeMvSource === 'all'" class="select-row"><select v-model="mvArea" aria-label="MV 地区" @change="refreshMv"><option v-for="area in mvAreas" :key="area">{{ area }}</option></select><select v-model="mvType" aria-label="MV 类型" @change="refreshMv"><option v-for="type in mvTypes" :key="type">{{ type }}</option></select><select v-model="mvOrder" aria-label="MV 排序" @change="refreshMv"><option v-for="order in mvOrders" :key="order">{{ order }}</option></select></div></div>
            <div v-if="loading.mv" class="video-grid skeleton-grid"><span v-for="index in 9" :key="index" /></div>
            <div v-else-if="errors.mv" class="browse-state"><p>{{ errors.mv }}</p><button type="button" @click="refreshMv">重新加载</button></div>
            <div v-else class="video-grid">
              <button v-for="item in mvList" :key="item.id" type="button" @click="openMv(item)"><span><SmartMedia :src="item.cover" :alt="`${item.name}封面`" :image-width="760" sizes="(min-width: 900px) 31vw, 92vw" /><i>▶</i></span><strong>{{ item.name }}</strong><small>{{ item.artistName || '未知艺人' }}</small></button>
            </div>
            <div v-if="activeMvSource === 'all' || activeMvSource === 'exclusive'" class="browse-pagination"><button type="button" :disabled="mvOffset <= 0 || loading.mv" @click="prevMvPage">上一页</button><span>第 {{ Math.floor(mvOffset / mvLimit) + 1 }} 页</span><button type="button" :disabled="!mvHasMore || loading.mv" @click="nextMvPage">下一页</button></div>
          </template>

          <template v-else>
            <div class="radio-categories"><button v-for="category in djCategories" :key="category.id" type="button" :class="{ 'is-active': Number(activeRadioCategory) === Number(category.id) }" @click="changeRadioCategory(category.id)"><img :src="category.pic56x56Url" alt=""><span>{{ category.name }}</span></button></div>
            <div v-if="loading.radio" class="radio-grid skeleton-grid"><span v-for="index in 8" :key="index" /></div>
            <div v-else-if="errors.radio" class="browse-state"><p>{{ errors.radio }}</p><button type="button" @click="refreshRadio">重新加载</button></div>
            <div v-else class="radio-layout">
              <div class="radio-grid"><article v-for="radio in radios" :key="radio.id"><span class="radio-art"><SmartMedia :src="radio.picUrl" :alt="`${radio.name}封面`" :image-width="460" sizes="210px" /></span><div><small>{{ radio.category || '播客电台' }}</small><strong>{{ radio.name }}</strong><span>{{ radio.dj?.nickname || radio.desc || '声音创作者' }}</span></div></article></div>
              <aside class="program-list"><p>热门节目</p><button v-for="(entry, index) in programs" :key="entry.program?.id || index" type="button" @click="playProgram(entry)"><b>{{ index + 1 }}</b><SmartMedia :src="entry.program?.coverUrl" :alt="`${entry.program?.name || '节目'}封面`" :image-width="140" sizes="52px" /><span><strong>{{ entry.program?.name || '播客节目' }}</strong><small>点击播放</small></span><i>▶</i></button></aside>
            </div>
          </template>
      </section>
    </main>

    <HomeMvModal
      :open="mvPlayerOpen"
      :loading="mvPlayerLoading"
      :error="mvPlayerError"
      :mv="currentMv"
      :url="currentMvUrl"
      :resolutions="mvResolutions"
      :resolution="selectedMvResolution"
      @update:resolution="selectedMvResolution = $event"
      @change-resolution="changeMvResolution"
      @close="closeMvPlayer"
    />
    <ModalRouterView content-width="90vw" content-height="86vh" content-radius="26px" />
  </div>
</template>

<script setup>
defineOptions({name: 'DiscoverPage'})

import {computed, nextTick, onBeforeUnmount, reactive, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import AppHeader from '@/components/appHeader/AppHeader.vue'
import HomeMvModal from '@/components/home/HomeMvModal.vue'
import ModalRouterView from '@/components/modalRouterView/ModalRouterView.vue'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import {useDiscoverData} from '@/composables/useDiscoverData.js'
import {useHomeMv} from '@/composables/useHomeMv.js'
import {usePlayerStore} from '@/stores/playerStore.js'
import {consumeLatestPendingTransition, playHeroEnter, setPendingTransition} from '@/utils/heroTransition.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()

const tabs = [
  {label: '曲风', value: 'styles'},
  {label: '新发行', value: 'releases'},
  {label: '排行榜', value: 'charts'},
  {label: '艺人', value: 'artists'},
  {label: '影音与播客', value: 'airwaves'},
]
const legacyTabMap = {overview: 'styles', playlists: 'styles', ranks: 'charts', videos: 'airwaves'}
const validTabs = new Set(tabs.map(item => item.value))
const activeTab = ref('styles')
const airwaveMode = ref('mv')
const activeRadioCategory = ref(0)
const albumAreas = [
  {label: '全部', value: 'ALL'}, {label: '华语', value: 'ZH'}, {label: '欧美', value: 'EA'}, {label: '韩国', value: 'KR'}, {label: '日本', value: 'JP'},
]
const albumFilters = reactive({area: 'ALL', type: 'new'})
const artistAreas = [
  {label: '全部', value: -1}, {label: '华语', value: 7}, {label: '欧美', value: 96}, {label: '日本', value: 8}, {label: '韩国', value: 16},
]
const artistTypes = [
  {label: '全部', value: -1}, {label: '男歌手', value: 1}, {label: '女歌手', value: 2}, {label: '乐队', value: 3},
]
const artistInitials = [
  {label: '热门', value: -1},
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => ({label: letter, value: letter.toLowerCase()})),
  {label: '#', value: 0},
]
const artistFilters = reactive({type: -1, area: -1, initial: -1, limit: 20, offset: 0})

const {
  styles,
  newAlbums, charts, artists, artistHasMore, djCategories, radios, programs,
  loading, errors, loadStyles, loadAlbums, loadCharts, loadArtists, loadRadio,
} = useDiscoverData()

const {
  mvList, mvSourceOptions, mvAreas, mvTypes, mvOrders, activeMvSource,
  mvArea, mvType, mvOrder, mvLimit, mvOffset, mvHasMore,
  mvPlayerOpen, mvPlayerLoading, mvPlayerError, currentMv, currentMvUrl,
  mvResolutions, selectedMvResolution, loadMvList, switchMvSource,
  nextMvPage, prevMvPage, openMv, changeMvResolution, closeMvPlayer,
} = useHomeMv(playerStore, loading, errors)

const genreRows = computed(() => {
  const entries = styles.value.slice(0, 28)
  const midpoint = Math.ceil(entries.length / 2)
  return [entries.slice(0, midpoint), entries.slice(midpoint)].filter(row => row.length)
})
function normalizedTab(value) {
  const raw = String(value || 'styles')
  const mapped = legacyTabMap[raw] || raw
  return validTabs.has(mapped) ? mapped : 'styles'
}

async function ensureTabData(tab) {
  const jobs = []
  if (!newAlbums.value.length && !loading.albums) jobs.push(refreshAlbums())
  if (tab === 'styles' && !styles.value.length && !loading.styles) jobs.push(loadStyles())
  if (tab === 'charts' && !charts.value.length && !loading.charts) jobs.push(loadCharts())
  if (tab === 'artists' && !artists.value.length && !loading.artists) jobs.push(refreshArtists())
  if (tab === 'airwaves' && !mvList.value.length && !loading.mv) jobs.push(loadMvList({reset: true}))
  await Promise.all(jobs)
}

function switchTab(tab) {
  const next = normalizedTab(tab)
  if (activeTab.value === next) return
  activeTab.value = next
  void ensureTabData(next)
  void router.replace({name: 'discover', query: {tab: next}})
}

function openStyle(style) {
  const id = Number(style?.tagId || style?.id || 0)
  if (!id) return
  router.push({name: 'styleDetailPage', params: {id}})
}

function refreshAlbums() { return loadAlbums({...albumFilters, limit: 24, offset: 0}) }
function changeAlbumArea(area) { albumFilters.area = area; void refreshAlbums() }
function changeAlbumType(type) { albumFilters.type = type; void refreshAlbums() }
function refreshArtists() { return loadArtists({...artistFilters}) }
function changeArtistFilter(key, value) { artistFilters[key] = value; artistFilters.offset = 0; void refreshArtists() }
function changeArtistPage(direction) { artistFilters.offset = Math.max(0, artistFilters.offset + direction * artistFilters.limit); void refreshArtists(); window.scrollTo({top: 420, behavior: 'smooth'}) }

function openRadio() {
  airwaveMode.value = 'radio'
  if (!djCategories.value.length || !radios.value.length) void refreshRadio()
}
async function refreshRadio() {
  await loadRadio({cateId: activeRadioCategory.value, limit: 12})
  if (!activeRadioCategory.value && djCategories.value[0]?.id) activeRadioCategory.value = djCategories.value[0].id
}
function changeRadioCategory(id) { activeRadioCategory.value = Number(id); void loadRadio({cateId: id, limit: 12}) }
function refreshMv() { void loadMvList({reset: true}) }

function rememberHero(namespace, item, event) {
  const id = Number(item?.id || 0)
  const card = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  const cover = card?.querySelector(`[data-${namespace}-hero-cover]`)
  if (!id || !(cover instanceof HTMLElement)) return id
  setPendingTransition(namespace, id, {
    coverRect: cover.getBoundingClientRect(),
    coverSrc: item.picUrl || item.coverImgUrl || item.img1v1Url || '',
    name: item.name || '',
  })
  return id
}

function modalQuery(id) {
  return {id, tab: activeTab.value}
}

function openPlaylist(item, event) {
  const id = rememberHero('playlist', item, event)
  if (id) router.push({name: 'discoverPlaylistDetail', query: modalQuery(id)})
}

function openAlbum(item, event) {
  const id = rememberHero('album', item, event)
  if (id) router.push({name: 'discoverAlbumDetail', query: modalQuery(id)})
}

function openArtist(item, event) {
  const id = rememberHero('artist', item, event)
  if (id) router.push({name: 'discoverArtistDetail', query: modalQuery(id)})
}

async function runHeroReturn(namespace) {
  const payload = consumeLatestPendingTransition(namespace)
  if (!payload?.id) return
  await nextTick()
  const targets = [...document.querySelectorAll(`[data-${namespace}-hero-cover][data-${namespace}-id="${payload.id}"]`)]
  const target = targets.find(element => {
    const rect = element.getBoundingClientRect()
    return rect.bottom > 0 && rect.top < window.innerHeight
  }) || targets[0]
  if (target instanceof HTMLElement) await playHeroEnter({payload, targetCoverEl: target})
}

function runDiscoverHeroReturn() {
  void runHeroReturn('playlist')
  void runHeroReturn('album')
  void runHeroReturn('artist')
}

async function playProgram(entry) {
  const program = entry?.program || entry || {}
  const song = program?.mainSong || {}
  const id = Number(song?.id || program?.id || 0)
  if (!id) return
  const playable = {...song, id, name: program?.name || song?.name || '播客节目', cover: program?.coverUrl || program?.blurCoverUrl || '', artists: song?.artists || song?.ar || []}
  await playSongWithQueue(playable, [playable], 0)
}

function formatReleaseDate(value) {
  const date = new Date(Number(value || 0))
  if (!Number.isFinite(date.getTime()) || date.getFullYear() < 2000) return 'NEW'
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

watch(
  () => route.query.tab,
  (tab) => {
    const legacyStyleId = Number(route.query.style || 0)
    if (legacyStyleId) {
      void router.replace({name: 'styleDetailPage', params: {id: legacyStyleId}})
      return
    }
    const next = normalizedTab(tab)
    activeTab.value = next
    void ensureTabData(next)
  },
  {immediate: true},
)

watch(() => route.name, name => {
  if (name === 'discover') runDiscoverHeroReturn()
})

onBeforeUnmount(closeMvPlayer)
</script>

<style scoped>
.browse-page {
  min-height: 100vh;
  color: #1d1d1f;
  background: #f5f5f7;
}
button,
select { font: inherit; }
button { cursor: pointer; }
.browse-main { box-sizing: border-box; width: min(100%, 1400px); margin: 0 auto; padding: 0 32px 160px; }

.browse-hero { padding: 58px 0 46px; border-bottom: 1px solid rgba(29, 29, 31, 0.09); }
.browse-hero-heading { display: flex; align-items: end; justify-content: space-between; gap: 30px; margin-bottom: 28px; }
.browse-hero-heading p { margin: 0 0 8px; color: #fa2d48; font-size: 10px; font-weight: 800; letter-spacing: 0.11em; }
.browse-hero-heading h1 { margin: 0; font-size: clamp(46px, 5vw, 68px); font-weight: 820; letter-spacing: -0.055em; line-height: 1; }
.browse-hero-heading > span { max-width: 430px; color: #6e6e73; font-size: 13px; line-height: 1.65; }
.release-spotlight { display: grid; height: 430px; grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.55fr); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 14px; }
.spotlight-card { position: relative; min-width: 0; overflow: hidden; padding: 0; text-align: left; color: #fff; border: 0; border-radius: 22px; background: #dedee3; box-shadow: 0 12px 30px rgba(27, 25, 26, 0.1); isolation: isolate; }
.spotlight-card.is-main { grid-row: 1 / 3; }
.spotlight-card :deep(> div),
.spotlight-card :deep(img) { width: 100% !important; height: 100% !important; object-fit: cover; }
.spotlight-card :deep(img) { transition: transform 420ms ease; }
.spotlight-card:hover :deep(img) { transform: scale(1.035); }
.spotlight-shade { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(10, 10, 12, 0.78), rgba(10, 10, 12, 0.01) 72%); }
.spotlight-copy { position: absolute; right: 20px; bottom: 18px; left: 20px; min-width: 0; }
.spotlight-copy small,
.spotlight-copy strong,
.spotlight-copy i { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.spotlight-copy small { color: rgba(255, 255, 255, 0.68); font-size: 9px; font-weight: 720; }
.spotlight-copy strong { margin-top: 5px; font-size: 20px; font-weight: 820; letter-spacing: -0.03em; }
.spotlight-card.is-main .spotlight-copy { right: 28px; bottom: 26px; left: 28px; }
.spotlight-card.is-main .spotlight-copy strong { margin-top: 7px; font-size: clamp(30px, 3.3vw, 46px); }
.spotlight-copy i { margin-top: 7px; color: rgba(255, 255, 255, 0.68); font-size: 9px; font-style: normal; }
.spotlight-loading span { border-radius: 22px; background: #e4e4e8; animation: pulse 1.2s ease-in-out infinite; }
.spotlight-loading span:first-child { grid-row: 1 / 3; }

.browse-tabs { position: sticky; top: 76px; z-index: 30; display: flex; overflow-x: auto; gap: 26px; padding: 0 4px; border-bottom: 1px solid rgba(29, 29, 31, 0.1); background: rgba(245, 245, 247, 0.88); backdrop-filter: blur(20px); scrollbar-width: none; }
.browse-tabs button { position: relative; height: 58px; flex: none; padding: 0; color: #6e6e73; border: 0; background: transparent; font-size: 13px; font-weight: 700; }
.browse-tabs button::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: transparent; content: ''; }
.browse-tabs button:hover { color: #1d1d1f; }
.browse-tabs button.is-active { color: #1d1d1f; }
.browse-tabs button.is-active::after { background: #fa2d48; }

.browse-section { min-height: 700px; padding: 54px 0 50px; }
.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 26px; margin-bottom: 26px; }
.section-heading p { margin: 0 0 6px; color: #fa2d48; font-size: 10px; font-weight: 750; }
.section-heading h2 { margin: 0; font-size: clamp(32px, 3.6vw, 46px); font-weight: 800; letter-spacing: -0.045em; }
.section-heading > span { max-width: 440px; color: #6e6e73; font-size: 12px; line-height: 1.65; }
.section-heading-actions { align-items: center; }

.genre-marquee { display: grid; overflow: hidden; gap: 12px; margin-inline: calc(50% - 50vw); padding: 4px 0 14px; }
.genre-row { width: 100%; overflow: hidden; padding-block: 3px; }
.genre-track { display: flex; width: max-content; gap: 14px; padding-right: 14px; will-change: transform; animation: genre-flow-left 104s linear infinite; }
.genre-row:nth-child(2) .genre-track { margin-left: -118px; animation-name: genre-flow-right; animation-duration: 116s; }
.genre-marquee:hover .genre-track,
.genre-marquee:focus-within .genre-track { animation-play-state: paused; }
.genre-card { position: relative; min-width: 0; aspect-ratio: 1.42; flex: 0 0 clamp(190px, 18.5vw, 248px); overflow: hidden; padding: 0; text-align: left; color: #fff; border: 0; border-radius: 18px; background: #dedee3; box-shadow: 0 8px 22px rgba(35, 32, 33, 0.08); isolation: isolate; }
.genre-card :deep(img) { width: 100%; height: 100%; object-fit: cover; transition: transform 350ms ease; }
.genre-card:hover :deep(img) { transform: scale(1.04); }
.genre-card > span { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(10, 10, 12, 0.68), transparent 72%); }
.genre-card strong { position: absolute; right: 14px; bottom: 25px; left: 14px; z-index: 1; overflow: hidden; font-size: 18px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.genre-card small { position: absolute; right: 14px; bottom: 11px; left: 14px; z-index: 1; overflow: hidden; color: rgba(255, 255, 255, 0.65); font-size: 8px; font-weight: 700; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.genre-marquee-loading .genre-track { animation: none; }
.genre-marquee-loading .genre-track > span { width: clamp(190px, 18.5vw, 248px); aspect-ratio: 1.42; flex: none; border-radius: 18px; background: #e5e5e9; animation: pulse 1.2s ease-in-out infinite; }

.filter-pills button { height: 34px; flex: none; padding: 0 13px; color: #5e5e63; border: 0; border-radius: 999px; background: #ececef; font-size: 10px; font-weight: 700; }
.filter-pills button:hover { color: #1d1d1f; background: #dfdfe3; }
.filter-pills button.is-active { color: #fff; background: #fa2d48; }

.media-card-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 30px 16px; padding: 26px; }
.browse-section > .media-card-grid { padding: 0; }
.media-card { min-width: 0; padding: 0; text-align: left; color: #1d1d1f; border: 0; background: transparent; }
.media-card > span { position: relative; display: block; aspect-ratio: 1; overflow: hidden; border-radius: 17px; background: #e4e4e8; box-shadow: 0 8px 22px rgba(35, 32, 33, 0.08); }
.media-card > span :deep(img) { width: 100%; height: 100%; object-fit: cover; transition: transform 320ms ease; }
.media-card:hover > span :deep(img) { transform: scale(1.035); }
.media-card strong,
.media-card small,
.media-card em { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.media-card strong { margin: 11px 2px 0; font-size: 12px; font-weight: 720; }
.media-card small { margin: 5px 2px 0; color: #6e6e73; font-size: 10px; }
.media-card em { margin: 4px 2px 0; color: #a1a1a6; font-size: 9px; font-style: normal; }
.media-card > span > i { position: absolute; top: 10px; left: 10px; padding: 6px 8px; color: #1d1d1f; border-radius: 999px; background: rgba(255, 255, 255, 0.88); font-size: 8px; font-style: normal; font-weight: 750; backdrop-filter: blur(10px); }
.filter-pills { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.segmented-control { display: flex; width: fit-content; gap: 3px; margin-bottom: 28px; padding: 3px; border-radius: 11px; background: #e5e5e9; }
.segmented-control button { height: 32px; padding: 0 14px; color: #65656a; border: 0; border-radius: 9px; background: transparent; font-size: 10px; font-weight: 700; }
.segmented-control button.is-active { color: #1d1d1f; background: #fff; box-shadow: 0 2px 7px rgba(30, 28, 29, 0.1); }
.section-heading .segmented-control { margin-bottom: 0; }

.chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.chart-card { display: grid; min-width: 0; grid-template-columns: 122px minmax(0, 1fr); gap: 17px; padding: 14px; text-align: left; color: #1d1d1f; border: 1px solid rgba(29, 29, 31, 0.065); border-radius: 20px; background: #fff; box-shadow: 0 8px 25px rgba(36, 32, 34, 0.05); }
.chart-card:hover { box-shadow: 0 13px 32px rgba(36, 32, 34, 0.09); }
.chart-art { display: block; width: 122px; aspect-ratio: 1; overflow: hidden; border-radius: 14px; background: #e4e4e8; }
.chart-art :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.chart-info { min-width: 0; }
.chart-info > small { color: #fa2d48; font-size: 9px; font-weight: 700; }
.chart-info > strong { display: block; overflow: hidden; margin-top: 5px; font-size: 14px; font-weight: 760; text-overflow: ellipsis; white-space: nowrap; }
.chart-info ol { display: grid; gap: 0; margin: 10px 0 0; padding: 0; list-style: none; }
.chart-info li { display: grid; grid-template-columns: 17px minmax(0, 1fr) auto; gap: 6px; padding: 6px 0; border-top: 1px solid rgba(29, 29, 31, 0.06); font-size: 9px; }
.chart-info li b { color: #fa2d48; }
.chart-info li span,
.chart-info li i { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chart-info li i { max-width: 110px; color: #8e8e93; font-style: normal; }

.artist-filter-panel { display: grid; gap: 9px; margin-bottom: 30px; padding: 18px; border: 1px solid rgba(29, 29, 31, 0.065); border-radius: 18px; background: #fff; }
.artist-filter-panel > div { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }
.artist-filter-panel small { width: 42px; color: #9a9a9f; font-size: 9px; font-weight: 700; }
.artist-filter-panel button { min-width: 34px; height: 28px; padding: 0 9px; color: #6e6e73; border: 0; border-radius: 8px; background: transparent; font-size: 9px; font-weight: 700; }
.artist-filter-panel button:hover { color: #1d1d1f; background: #eeeef1; }
.artist-filter-panel button.is-active { color: #fff; background: #fa2d48; }
.artist-initials { flex-wrap: nowrap !important; overflow-x: auto; padding-bottom: 3px; scrollbar-width: none; }
.artist-directory { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 30px 18px; }
.artist-directory > button { min-width: 0; padding: 0; text-align: center; color: #1d1d1f; border: 0; background: transparent; }
.artist-directory > button > span { display: block; aspect-ratio: 1; overflow: hidden; border-radius: 50%; background: #e4e4e8; box-shadow: 0 8px 24px rgba(35, 32, 33, 0.08); }
.artist-directory :deep(img) { width: 100%; height: 100%; object-fit: cover; transition: transform 320ms ease; }
.artist-directory button:hover :deep(img) { transform: scale(1.035); }
.artist-directory strong,
.artist-directory small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.artist-directory strong { margin-top: 11px; font-size: 12px; font-weight: 730; }
.artist-directory small { margin-top: 4px; color: #8e8e93; font-size: 9px; }

.media-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 26px; }
.select-row { display: flex; gap: 6px; }
.select-row select { height: 34px; padding: 0 28px 0 11px; color: #55555a; border: 1px solid rgba(29, 29, 31, 0.08); border-radius: 999px; background: #fff; font-size: 9px; }
.video-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px 14px; }
.video-grid > button { min-width: 0; padding: 0; text-align: left; color: #1d1d1f; border: 0; background: transparent; }
.video-grid > button > span { position: relative; display: block; aspect-ratio: 16 / 10; overflow: hidden; border-radius: 18px; background: #e4e4e8; box-shadow: 0 8px 24px rgba(35, 32, 33, 0.08); }
.video-grid :deep(img) { width: 100%; height: 100%; object-fit: cover; transition: transform 340ms ease; }
.video-grid button:hover :deep(img) { transform: scale(1.035); }
.video-grid span > i { position: absolute; right: 12px; bottom: 12px; display: grid; width: 38px; aspect-ratio: 1; place-items: center; color: #1d1d1f; border-radius: 50%; background: rgba(255, 255, 255, 0.92); font-size: 9px; font-style: normal; box-shadow: 0 5px 16px rgba(0, 0, 0, 0.16); }
.video-grid button > strong,
.video-grid button > small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.video-grid button > strong { margin: 11px 2px 0; font-size: 12px; font-weight: 730; }
.video-grid button > small { margin: 5px 2px 0; color: #8e8e93; font-size: 9px; }
.radio-categories { display: flex; overflow-x: auto; gap: 7px; margin-bottom: 24px; padding-bottom: 5px; scrollbar-width: none; }
.radio-categories button { display: flex; height: 38px; flex: none; align-items: center; gap: 7px; padding: 0 12px 0 6px; color: #5e5e63; border: 0; border-radius: 999px; background: #e8e8ec; font-size: 9px; font-weight: 700; }
.radio-categories button.is-active { color: #fff; background: #fa2d48; }
.radio-categories img { width: 28px; aspect-ratio: 1; object-fit: cover; border-radius: 50%; }
.radio-layout { display: grid; grid-template-columns: minmax(0, 1fr) 350px; gap: 16px; }
.radio-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.radio-grid article { overflow: hidden; border-radius: 17px; background: #fff; box-shadow: 0 8px 24px rgba(35, 32, 33, 0.06); }
.radio-art { display: block; width: 100%; aspect-ratio: 1; overflow: hidden; }
.radio-art :deep(> div),
.radio-art :deep(img) { width: 100% !important; height: 100% !important; object-fit: cover; }
.radio-grid article > div { padding: 13px; }
.radio-grid small,
.radio-grid strong,
.radio-grid article span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.radio-grid small { color: #fa2d48; font-size: 8px; font-weight: 700; }
.radio-grid strong { margin-top: 6px; font-size: 11px; font-weight: 730; }
.radio-grid article span { margin-top: 5px; color: #8e8e93; font-size: 9px; }
.program-list { padding: 20px; border-radius: 20px; background: #fff; box-shadow: 0 8px 24px rgba(35, 32, 33, 0.06); }
.program-list > p { margin: 0 0 10px; font-size: 20px; font-weight: 780; letter-spacing: -0.035em; }
.program-list button { display: grid; width: 100%; align-items: center; grid-template-columns: 18px 48px minmax(0, 1fr) 24px; gap: 9px; padding: 10px 0; text-align: left; color: #1d1d1f; border: 0; border-top: 1px solid rgba(29, 29, 31, 0.065); background: transparent; }
.program-list button > b { color: #fa2d48; font-size: 9px; }
.program-list button > :deep(div) { width: 48px !important; height: 48px !important; border-radius: 9px !important; }
.program-list button > span { min-width: 0; }
.program-list button strong,
.program-list button small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.program-list button strong { font-size: 10px; font-weight: 710; }
.program-list button small { margin-top: 4px; color: #99999e; font-size: 8px; }
.program-list button > i { color: #8e8e93; font-size: 9px; font-style: normal; }

.browse-pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 38px; }
.browse-pagination button { height: 34px; padding: 0 14px; color: #4e4e53; border: 1px solid rgba(29, 29, 31, 0.08); border-radius: 999px; background: #fff; font-size: 9px; font-weight: 700; }
.browse-pagination button:disabled { cursor: not-allowed; opacity: 0.35; }
.browse-pagination span { color: #8e8e93; font-size: 9px; }
.browse-state { display: grid; min-height: 300px; place-items: center; align-content: center; gap: 12px; color: #77777c; border: 1px dashed rgba(29, 29, 31, 0.13); border-radius: 20px; font-size: 11px; }
.browse-state p { margin: 0; }
.browse-state button { padding: 9px 14px; color: #fff; border: 0; border-radius: 999px; background: #fa2d48; font-size: 9px; font-weight: 700; }
.skeleton-grid > span { min-height: 180px; border-radius: 17px; background: #e5e5e9; animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.5; } }
@keyframes genre-flow-left {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}
@keyframes genre-flow-right {
  from { transform: translate3d(-50%, 0, 0); }
  to { transform: translate3d(0, 0, 0); }
}

@media (max-width: 1060px) {
  .media-card-grid,
  .artist-directory { grid-template-columns: repeat(4, 1fr); }
  .radio-layout { grid-template-columns: 1fr; }
  .program-list { order: -1; }
}

@media (max-width: 820px) {
  .browse-main { padding-inline: 18px; }
  .browse-hero-heading,
  .section-heading { align-items: start; flex-direction: column; }
  .release-spotlight { height: 390px; grid-template-columns: minmax(0, 1.25fr) minmax(220px, 0.75fr); }
  .browse-tabs { margin-right: -18px; margin-left: -18px; padding-inline: 18px; }
  .media-card-grid,
  .artist-directory { grid-template-columns: repeat(3, 1fr); }
  .chart-grid { grid-template-columns: 1fr; }
  .video-grid { grid-template-columns: repeat(2, 1fr); }
  .media-toolbar { align-items: start; flex-direction: column; }
}

@media (max-width: 560px) {
  .browse-main { padding-inline: 13px; }
  .browse-hero { padding-top: 42px; }
  .browse-hero-heading > span { font-size: 11px; }
  .release-spotlight { display: flex; height: 310px; margin-right: -13px; overflow-x: auto; padding-right: 13px; scrollbar-width: none; }
  .spotlight-card,
  .spotlight-card.is-main,
  .spotlight-loading > span,
  .spotlight-loading > span:first-child { width: 84vw; flex: none; border-radius: 18px; }
  .spotlight-card.is-main .spotlight-copy { right: 20px; bottom: 19px; left: 20px; }
  .spotlight-card.is-main .spotlight-copy strong { font-size: 28px; }
  .browse-tabs { top: 68px; margin-right: -13px; margin-left: -13px; gap: 22px; padding-inline: 13px; }
  .browse-section { padding-top: 42px; }
  .section-heading h2 { font-size: 36px; }
  .genre-marquee { gap: 9px; }
  .genre-track { gap: 9px; padding-right: 9px; }
  .genre-row:nth-child(2) .genre-track { margin-left: -76px; }
  .genre-card,
  .genre-marquee-loading .genre-track > span { flex-basis: 44vw; width: 44vw; }
  .genre-card { border-radius: 15px; }
  .genre-card strong { font-size: 16px; }
  .media-card-grid,
  .artist-directory { grid-template-columns: repeat(2, 1fr); gap: 26px 11px; padding-inline: 14px; }
  .browse-section > .media-card-grid,
  .artist-directory { padding-inline: 0; }
  .section-heading-actions .filter-pills { justify-content: flex-start; }
  .chart-card { grid-template-columns: 92px minmax(0, 1fr); gap: 12px; padding: 10px; }
  .chart-art { width: 92px; }
  .chart-info li i { display: none; }
  .artist-filter-panel { margin-right: -13px; margin-left: -13px; border-radius: 0; }
  .video-grid { grid-template-columns: 1fr; }
  .select-row { flex-wrap: wrap; }
  .radio-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
  .genre-track { animation: none !important; }
}
</style>
