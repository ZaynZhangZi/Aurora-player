<template>
  <div class="home-page">
    <header class="home-topbar">
      <div class="home-topbar-inner">
        <button class="home-brand" type="button" @click="scrollToSection('home-top')">
          <span class="home-brand-mark" aria-hidden="true">A</span>
          <span>AURORA</span>
        </button>

        <nav class="home-nav" aria-label="主页导航">
          <button class="is-active" type="button" @click="scrollToSection('home-top')">首页</button>
          <button type="button" @click="scrollToSection('discovery')">发现</button>
          <button type="button" @click="openProfile">音乐库</button>
        </nav>

        <div ref="homeSearchRoot" class="home-search" :class="{ 'is-focused': homeSearchFocused }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref="homeSearchInput"
            v-model="homeSearchQuery"
            type="search"
            autocomplete="off"
            aria-label="搜索歌曲、歌手或歌单"
            placeholder="搜索歌曲、歌手或歌单"
            @focus="homeSearchFocused = true"
            @keydown.enter.prevent="submitHomeSearch"
            @keydown.esc="closeHomeSearch"
          >
          <button v-if="homeSearchQuery" class="home-search-clear" type="button" aria-label="清空搜索" @click="clearHomeSearch">×</button>
          <kbd v-else>⌘ K</kbd>

          <Transition name="home-search-pop">
            <div v-if="homeSearchPopoverVisible" class="home-search-popover">
              <div v-if="homeSearching" class="home-search-state home-search-state-loading">正在搜索…</div>
              <div v-else-if="homeSearchError" class="home-search-state home-search-state-error">{{ homeSearchError }}</div>
              <div v-else-if="homeSearchEmpty" class="home-search-state">没有找到相关音乐</div>
              <template v-else>
                <section v-if="homeSongEntries.length" class="home-search-section">
                  <div class="home-search-section-title"><span>歌曲</span><small>{{ homeSongEntries.length }} 个结果</small></div>
                  <button v-for="(song, index) in homeSongEntries.slice(0, 4)" :key="`home-search-song-${song.id}`" type="button" class="home-search-result" @click="openHomeSearchSong(song, index)">
                    <span class="home-search-result-cover"><SmartMedia :src="song.al?.picUrl || song.album?.picUrl || song.cover" :alt="`${song.name}封面`" :image-width="96" sizes="42px" /></span>
                    <span class="home-search-result-copy"><strong>{{ song.name }}</strong><small>{{ formatSearchArtists(song) }}</small></span>
                    <span class="home-search-result-action">播放</span>
                  </button>
                </section>
                <section v-if="homeArtistEntries.length" class="home-search-section home-search-section-compact">
                  <div class="home-search-section-title"><span>艺人</span></div>
                  <button v-for="artist in homeArtistEntries.slice(0, 3)" :key="`home-search-artist-${artist.id}`" type="button" class="home-search-chip" @click="openHomeSearchArtist(artist)">
                    <span><SmartMedia :src="artist.picUrl || artist.img1v1Url" :alt="`${artist.name}头像`" :image-width="72" sizes="32px" /></span>{{ artist.name }}
                  </button>
                </section>
                <section v-if="homePlaylistEntries.length" class="home-search-section home-search-section-compact">
                  <div class="home-search-section-title"><span>歌单</span></div>
                  <button v-for="playlist in homePlaylistEntries.slice(0, 3)" :key="`home-search-playlist-${playlist.id}`" type="button" class="home-search-chip" @click="openHomeSearchPlaylist(playlist)">
                    <span><SmartMedia :src="playlist.coverImgUrl" :alt="`${playlist.name}封面`" :image-width="72" sizes="32px" /></span>{{ playlist.name }}
                  </button>
                </section>
              </template>
            </div>
          </Transition>
        </div>

        <button class="home-profile" type="button" :aria-label="userStore.isLoggedIn ? '打开个人音乐库' : '打开登录入口'" @click="openProfile">
          <img v-if="userStore.avatarUrl" :src="userStore.avatarUrl" alt="用户头像">
          <span v-else>{{ profileInitial }}</span>
        </button>
      </div>
    </header>

    <main class="home-main">
      <section id="home-top" class="home-lobby" aria-labelledby="home-hero-title">
        <article class="home-hero-card">
          <SmartMedia
            v-if="hero.media"
            :src="hero.media"
            :media-type="hero.mediaType"
            :alt="hero.title ? `${hero.title} 首页推荐` : 'Aurora 首页推荐'"
            :image-width="1440"
            :lock-muted="true"
            img-loading="eager"
            fetch-priority="high"
            sizes="(min-width: 980px) 70vw, 100vw"
            class="home-hero-media"
          />
          <div v-else class="home-hero-fallback" aria-hidden="true">
            <span class="fallback-orbit fallback-orbit-one" />
            <span class="fallback-orbit fallback-orbit-two" />
            <span class="fallback-disc" />
          </div>
          <div class="home-hero-shade" />
          <div class="home-hero-content">
            <h1 id="home-hero-title">{{ heroDisplayTitle }}</h1>
          </div>
        </article>

        <aside class="continue-panel" aria-labelledby="continue-title">
          <div class="continue-heading">
            <div>
              <p>YOUR MOMENT</p>
              <h2 id="continue-title">{{ continuePanelTitle }}</h2>
            </div>
            <span class="continue-status"><i /> {{ userStore.isLoggedIn ? '已同步' : '为你精选' }}</span>
          </div>

          <div v-if="continueLoading" class="continue-skeleton" aria-label="正在加载歌曲">
            <span v-for="index in 5" :key="index" />
          </div>
          <div v-else-if="continueSongs.length" class="continue-list">
            <HomeSongRow
              v-for="(song, index) in continueSongs"
              :key="`continue-${song.id}-${index}`"
              :song="song"
              :index="index"
              compact
              :show-index="false"
              @play="playContinueSong"
            />
          </div>
          <div v-else class="continue-empty">
            <span class="continue-empty-icon">♪</span>
            <p>还没有播放记录</p>
            <button type="button" @click="scrollToSection('recommended')">从推荐开始</button>
          </div>

          <div class="continue-footer">
            <span>{{ userStore.isLoggedIn ? '最近播放会自动同步' : '登录后可同步你的聆听记录' }}</span>
            <button v-if="!userStore.isLoggedIn" type="button" @click="openSearch">去登录</button>
          </div>
        </aside>
      </section>

      <nav class="category-rail" aria-label="主页内容快捷入口">
        <button class="is-active" type="button" @click="scrollToSection('recommended')"><span>✦</span>推荐</button>
        <button type="button" @click="setDiscoveryTab('playlists')"><span>♫</span>歌单</button>
        <button type="button" @click="setDiscoveryTab('ranks')"><span>▥</span>排行榜</button>
        <button type="button" @click="scrollToSection('media')"><span>▣</span>MV</button>
        <button type="button" @click="scrollToSection('media')"><span>◉</span>播客</button>
      </nav>

      <section id="recommended" class="home-section">
        <HomeSectionHeader
          eyebrow="PERSONALIZED"
          title="为你推荐"
          description="从当下的热门与编辑精选里，挑出更容易开始播放的一组。"
        >
          <template #actions>
            <button class="section-link" type="button" @click="openReleaseNotesPanel">
              新版本 {{ latestReleaseTag }}
            </button>
          </template>
        </HomeSectionHeader>

        <div v-if="loading.recommend" class="playlist-skeleton" aria-label="推荐歌单加载中">
          <span v-for="index in 5" :key="index" />
        </div>
        <div v-else-if="errors.recommend" class="section-state section-state-error">
          <p>{{ errors.recommend }}</p>
          <button type="button" @click="loadRecommendPlaylists">重新加载</button>
        </div>
        <div v-else-if="recommendPlaylists.length" class="playlist-strip">
          <HomePlaylistCard
            v-for="item in recommendPlaylists.slice(0, 8)"
            :key="item.id"
            :item="item"
            @open="openPlaylist"
          />
        </div>
        <div v-else class="section-state"><p>暂时没有推荐歌单</p></div>
      </section>

      <section id="discovery" class="home-section discovery-studio">
        <div class="discovery-intro">
          <div class="section-sequence"><span>01</span><i /> DISCOVER</div>
          <h2>发现音乐</h2>
          <p>把今天值得听的内容铺开。歌单、榜单与艺人，各自保留最适合浏览的节奏。</p>
          <div class="discovery-tabs" role="tablist" aria-label="发现音乐分类">
            <button
              v-for="tab in discoveryTabs"
              :key="tab.value"
              type="button"
              role="tab"
              :aria-selected="activeDiscoveryTab === tab.value"
              :class="{ 'is-active': activeDiscoveryTab === tab.value }"
              @click="activeDiscoveryTab = tab.value"
            >
              <span>{{ String(discoveryTabs.indexOf(tab) + 1).padStart(2, '0') }}</span>
              {{ tab.label }}
              <i aria-hidden="true">↗</i>
            </button>
          </div>
        </div>

        <div class="discovery-stage">
          <Transition name="discovery-swap" mode="out-in">
          <div v-if="activeDiscoveryTab === 'playlists'" class="discovery-content">
            <div class="tag-list" aria-label="歌单分类">
              <button
                v-for="tag in playlistTags"
                :key="tag"
                type="button"
                :class="{ 'is-active': activePlaylistTag === tag }"
                @click="changePlaylistTag(tag)"
              >
                {{ tag }}
              </button>
            </div>
            <div v-if="loading.top" class="row-skeleton"><span v-for="index in 5" :key="index" /></div>
            <div v-else-if="errors.top" class="section-state section-state-error">
              <p>{{ errors.top }}</p>
              <button type="button" @click="loadTopPlaylists(activePlaylistTag)">重新加载</button>
            </div>
            <div v-else-if="topPlaylists.length" class="discovery-playlists">
              <button
                v-for="(item, index) in topPlaylists.slice(0, 5)"
                :key="item.id"
                class="discovery-playlist-tile"
                :class="{ 'is-featured': index === 0 }"
                type="button"
                @click="openPlaylist(item, $event)"
              >
                <span class="discovery-playlist-tile-cover" data-playlist-hero-cover :data-playlist-id="item.id">
                  <SmartMedia
                    :src="item.coverImgUrl"
                    :alt="`${item.name}封面`"
                    :image-width="index === 0 ? 720 : 360"
                    sizes="(min-width: 900px) 32vw, (min-width: 560px) 42vw, 78vw"
                  />
                </span>
                <span class="discovery-playlist-tile-shade" />
                <span class="discovery-playlist-tile-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="discovery-playlist-tile-copy">
                  <small>{{ index === 0 ? "EDITOR'S PICK" : activePlaylistTag }}</small>
                  <strong>{{ item.name }}</strong>
                  <span v-if="index === 0">{{ item.copywriter || item.description || '今天值得完整听完的一张歌单' }}</span>
                </span>
                <span class="discovery-playlist-tile-play" aria-hidden="true">▶</span>
              </button>
            </div>
            <div v-else class="section-state"><p>暂时没有歌单数据</p></div>
          </div>

          <div v-else-if="activeDiscoveryTab === 'ranks'" class="discovery-content">
            <div v-if="loading.rank" class="rank-skeleton"><span v-for="index in 3" :key="index" /></div>
            <div v-else-if="errors.rank" class="section-state section-state-error">
              <p>{{ errors.rank }}</p>
              <button type="button" @click="loadTopRanks">重新加载</button>
            </div>
            <div v-else class="rank-grid">
              <button
                v-for="(rank, rankIndex) in topRanks.slice(0, 3)"
                :key="rank.id"
                class="rank-card"
                type="button"
                @click="openPlaylist(rank, $event)"
              >
                <span class="rank-number">0{{ rankIndex + 1 }}</span>
                <span class="rank-cover" data-playlist-hero-cover :data-playlist-id="rank.id">
                  <SmartMedia :src="rank.coverImgUrl" :alt="`${rank.name}封面`" :image-width="180" sizes="72px" />
                </span>
                <span class="rank-meta">
                  <strong>{{ rank.name }}</strong>
                  <small>{{ rank.updateFrequency || '实时更新' }}</small>
                </span>
                <span class="rank-tracks">
                  <span v-for="(track, index) in (rank.tracks || []).slice(0, 3)" :key="`${rank.id}-${index}`">
                    <b>{{ index + 1 }}</b>{{ track.first }} <small>· {{ track.second }}</small>
                  </span>
                </span>
                <span class="rank-open" aria-hidden="true">↗</span>
              </button>
            </div>
          </div>

          <div v-else class="discovery-content">
            <div v-if="loading.artist" class="artist-skeleton"><span v-for="index in 9" :key="index" /></div>
            <div v-else-if="errors.artist" class="section-state section-state-error">
              <p>{{ errors.artist }}</p>
              <button type="button" @click="loadHotArtists">重新加载</button>
            </div>
            <div v-else-if="hotArtists.length" class="artist-showcase">
              <button
                class="artist-featured"
                type="button"
                @click="openArtist(hotArtists[0], $event)"
              >
                <span class="artist-featured-cover" data-artist-hero-cover :data-artist-id="hotArtists[0].id">
                  <SmartMedia :src="hotArtists[0].picUrl || hotArtists[0].img1v1Url" :alt="`${hotArtists[0].name}头像`" :image-width="640" sizes="(min-width: 820px) 34vw, 76vw" />
                </span>
                <span class="artist-featured-shade" />
                <span class="artist-featured-index">01</span>
                <span class="artist-featured-copy">
                  <small><i /> ARTIST SPOTLIGHT</small>
                  <strong>{{ hotArtists[0].name }}</strong>
                  <span>从代表作开始，进入他的声音世界</span>
                </span>
                <span class="artist-featured-open" aria-hidden="true">↗</span>
              </button>
              <div class="artist-directory">
                <button
                  v-for="(artist, index) in hotArtists.slice(1, 9)"
                  :key="artist.id"
                  class="artist-directory-card"
                  type="button"
                  @click="openArtist(artist, $event)"
                >
                  <span class="artist-directory-index">{{ String(index + 2).padStart(2, '0') }}</span>
                  <span class="artist-directory-cover" data-artist-hero-cover :data-artist-id="artist.id">
                    <SmartMedia :src="artist.picUrl || artist.img1v1Url" :alt="`${artist.name}头像`" :image-width="360" sizes="(min-width: 821px) 52px, 76vw" />
                  </span>
                  <span class="artist-directory-copy">
                    <strong>{{ artist.name }}</strong>
                    <small>HOT ARTIST</small>
                  </span>
                  <span class="artist-directory-open" aria-hidden="true">↗</span>
                </button>
              </div>
            </div>
            <div v-else class="section-state">
              <p>暂时没有艺人数据</p>
            </div>
          </div>
          </Transition>
        </div>
      </section>

      <section id="new-songs" class="home-section release-section">
        <div class="release-intro">
          <div class="section-sequence section-sequence-light"><span>02</span><i /> FRESH RELEASES</div>
          <h2>新歌速递</h2>
          <p>今天更新的声音已经排好队。按顺序听，或者从一首吸引你的封面开始。</p>
          <button v-if="newSongs.length" type="button" class="release-play-all" @click="playAllNewSongs">
            <span>▶</span> 播放全部
          </button>
          <div class="release-decoration" aria-hidden="true"><span /><span /><span /><span /></div>
        </div>
        <div class="release-content">
          <div v-if="loading.songs" class="song-skeleton"><span v-for="index in 8" :key="index" /></div>
          <div v-else-if="errors.songs" class="section-state section-state-error">
            <p>{{ errors.songs }}</p>
            <button type="button" @click="loadNewSongs">重新加载</button>
          </div>
          <div v-else-if="newSongs.length" class="new-song-panel">
            <HomeSongRow
              v-for="(song, index) in newSongs.slice(0, 8)"
              :key="`new-${song.id}-${index}`"
              :song="song"
              :index="index"
              @play="openSong"
            />
          </div>
          <div v-else class="section-state"><p>暂时没有新歌数据</p></div>
        </div>
      </section>

      <section id="media" class="home-section media-studio">
        <div class="media-section-header">
          <div>
            <div class="section-sequence"><span>03</span><i /> AUDIO &amp; VISUAL</div>
            <h2>声音，也有画面</h2>
          </div>
          <p>把 MV 和播客分成两种浏览节奏：先沉浸观看，再慢下来听一个故事。</p>
        </div>

        <article class="mv-showcase">
          <div class="media-subheading">
            <div><span>WATCH NOW</span><h3>MV 精选</h3></div>
            <p>本周值得打开全屏的三个现场</p>
          </div>
          <div v-if="loading.mv" class="media-skeleton"><span v-for="index in 3" :key="index" /></div>
          <div v-else-if="errors.mv" class="section-state section-state-error">
            <p>{{ errors.mv }}</p>
            <button type="button" @click="loadMvList({reset: true})">重新加载</button>
          </div>
          <div v-else class="mv-grid">
            <button v-for="(item, index) in mvList.slice(0, 3)" :key="item.id" type="button" class="mv-card" :class="{ 'mv-card-featured': index === 0 }" @click="openMv(item)">
              <span class="mv-cover">
                <SmartMedia :src="item.cover" :alt="`${item.name}封面`" :image-width="index === 0 ? 960 : 520" sizes="(min-width: 900px) 55vw, 100vw" />
                <span class="mv-shade" />
                <span class="mv-order">0{{ index + 1 }}</span>
                <span class="mv-card-copy"><small>{{ item.artistName || '未知艺人' }}</small><strong>{{ item.name }}</strong></span>
                <i aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></i>
              </span>
            </button>
          </div>
        </article>

        <article class="podcast-showcase">
          <div class="media-subheading">
            <div><span>LISTEN SLOWLY</span><h3>播客精选</h3></div>
            <p>给通勤、散步和独处时刻留一点声音</p>
          </div>
          <div v-if="loading.podcast" class="podcast-skeleton"><span v-for="index in 3" :key="index" /></div>
          <div v-else-if="errors.podcast" class="section-state section-state-error">
            <p>{{ errors.podcast }}</p>
            <button type="button" @click="loadPodcastPrograms">重新加载</button>
          </div>
          <div v-else class="podcast-list">
            <button v-for="(item, index) in podcastPrograms.slice(0, 3)" :key="item.id" type="button" @click="openPodcast(item)">
              <span class="podcast-index">0{{ index + 1 }}</span>
              <span class="podcast-cover"><SmartMedia :src="item.picUrl" :alt="`${item.name}封面`" :image-width="280" sizes="120px" /></span>
              <span class="podcast-copy">
                <small>{{ item.program?.radio?.name || item.program?.dj?.nickname || '电台节目' }}</small>
                <strong>{{ item.name }}</strong>
                <span><i aria-hidden="true">▶</i> {{ formatPodcastDuration(item.program?.duration) || '立即收听' }}</span>
              </span>
              <span class="podcast-arrow" aria-hidden="true">↗</span>
            </button>
          </div>
        </article>
      </section>

      <footer class="home-footer">
        <div><strong>AURORA</strong><span>让每一次打开，都更快遇到下一首歌。</span></div>
        <button type="button" @click="openReleaseNotesPanel">查看版本更新</button>
      </footer>
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

    <HomeReleaseNotesPanel
      :open="releaseNotesOpen"
      :notes="releaseNotes"
      :loading="loading.releaseNotes"
      :error="errors.releaseNotes"
      :latest-tag="latestReleaseTag"
      @close="releaseNotesOpen = false"
      @retry="loadReleaseNotes"
    />

    <ModalRouterView content-width="85vw" content-height="80vh" />
  </div>
</template>

<script setup>
defineOptions({name: 'HomePage'})

import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import ModalRouterView from '@/components/modalRouterView/ModalRouterView.vue'
import HomeMvModal from '@/components/home/HomeMvModal.vue'
import HomePlaylistCard from '@/components/home/HomePlaylistCard.vue'
import HomeReleaseNotesPanel from '@/components/home/HomeReleaseNotesPanel.vue'
import HomeSectionHeader from '@/components/home/HomeSectionHeader.vue'
import HomeSongRow from '@/components/home/HomeSongRow.vue'
import {reportApi} from '@/api/reportApi/reportApi.js'
import {setPendingTransition, consumeLatestPendingTransition, playHeroEnter} from '@/utils/heroTransition.js'
import {usePlayerStore} from '@/stores/playerStore.js'
import {useCounterStore} from '@/stores/userStores.js'
import {useHomeData} from '@/composables/useHomeData.js'
import {useHomeMv} from '@/composables/useHomeMv.js'
import {useFloatingSearch} from '@/composables/useFloatingSearch.js'
import {
  consumeLatestPendingPlaylistHeroTransition,
  playPlaylistHeroEnter,
  setPendingPlaylistHeroTransition,
} from '@/utils/playlistFlipHero.js'
import {playSongById, playSongWithQueue} from '@/utils/globalPlayer.js'

const router = useRouter()
const route = useRoute()
const playerStore = usePlayerStore()
const userStore = useCounterStore()

const {
  hero,
  releaseNotes,
  recommendPlaylists,
  topPlaylists,
  newSongs,
  recentListenSongs,
  topRanks,
  podcastPrograms,
  hotArtists,
  playlistTags,
  activePlaylistTag,
  loading,
  errors,
  formatPodcastDuration,
  loadHomeBanner,
  loadReleaseNotes,
  loadRecommendPlaylists,
  loadTopPlaylists,
  changePlaylistTag,
  loadNewSongs,
  loadRecentListenSongs,
  loadTopRanks,
  loadPodcastPrograms,
  loadHotArtists,
} = useHomeData(userStore)

const {
  mvList,
  mvPlayerOpen,
  mvPlayerLoading,
  mvPlayerError,
  currentMv,
  currentMvUrl,
  mvResolutions,
  selectedMvResolution,
  loadMvList,
  openMv,
  changeMvResolution,
  closeMvPlayer,
} = useHomeMv(playerStore, loading, errors)

const discoveryTabs = [
  {label: '精选歌单', value: 'playlists'},
  {label: '热门榜单', value: 'ranks'},
  {label: '热门艺人', value: 'artists'},
]
const activeDiscoveryTab = ref('playlists')
const releaseNotesOpen = ref(false)
const homeSearchRoot = ref(null)
const homeSearchInput = ref(null)
const homeSearchQuery = ref('')
const homeSearchFocused = ref(false)
const homeSearchEnabled = ref(true)
const homeSearchDialogOpen = ref(false)

const {
  searching: homeSearching,
  searchError: homeSearchError,
  artistEntries: homeArtistEntries,
  songEntries: homeSongEntries,
  playlistEntries: homePlaylistEntries,
  isSearchEmpty: homeSearchEmpty,
  clearSearchState: clearHomeSearchState,
  setupSearchWatchers: setupHomeSearchWatchers,
} = useFloatingSearch(homeSearchQuery, homeSearchEnabled, homeSearchDialogOpen)

setupHomeSearchWatchers()

const profileInitial = computed(() => String(userStore.nickname || 'A').trim().slice(0, 1).toUpperCase())
const heroDisplayTitle = computed(() => {
  const dynamic = String(hero.value.title || '').trim()
  return dynamic && dynamic !== 'Now Playing' ? dynamic : '今天，听点不一样的'
})
const continueSongs = computed(() => {
  const recent = recentListenSongs.value.slice(0, 5)
  return recent.length ? recent : newSongs.value.slice(0, 5)
})
const continuePanelTitle = computed(() => recentListenSongs.value.length ? '继续播放' : '先听这些')
const continueLoading = computed(() => {
  if (userStore.isLoggedIn && loading.value.recent && !recentListenSongs.value.length) return true
  return loading.value.songs && !newSongs.value.length
})
const latestReleaseTag = computed(() => {
  const first = releaseNotes.value[0]
  const explicitTag = String(first?.version || first?.tag || '').trim()
  if (explicitTag) return explicitTag
  const match = String(first?.title || '').match(/v?\d+(?:\.\d+){0,3}(?:[-._a-zA-Z0-9]+)?/)
  return match?.[0] || (releaseNotes.value.length ? 'NEW' : '...')
})

function scrollToSection(id) {
  if (id === 'home-top') {
    window.scrollTo({top: 0, behavior: 'smooth'})
    return
  }
  document.getElementById(id)?.scrollIntoView({behavior: 'smooth', block: 'start'})
}

function setDiscoveryTab(tab) {
  activeDiscoveryTab.value = tab
  scrollToSection('discovery')
}

function openSearch() {
  window.dispatchEvent(new CustomEvent('aurora:open-search'))
}

function focusHomeSearch() {
  homeSearchFocused.value = true
  nextTick(() => homeSearchInput.value?.focus())
}

function closeHomeSearch() {
  homeSearchFocused.value = false
  homeSearchInput.value?.blur()
}

function clearHomeSearch() {
  homeSearchQuery.value = ''
  clearHomeSearchState()
  focusHomeSearch()
}

function handleHomeSearchOutside(event) {
  if (!homeSearchRoot.value?.contains(event.target)) closeHomeSearch()
}

function formatSearchArtists(song) {
  const artists = song?.ar || song?.artists || []
  return artists.map((artist) => artist?.name || artist).filter(Boolean).join(' / ') || '未知艺人'
}

async function openHomeSearchSong(song, index = 0) {
  await playSongWithQueue(song, homeSongEntries.value, index)
  closeHomeSearch()
}

function openHomeSearchArtist(artist) {
  closeHomeSearch()
  openArtist(artist)
}

function openHomeSearchPlaylist(playlist) {
  closeHomeSearch()
  void openPlaylist(playlist)
}

function submitHomeSearch() {
  if (homeSongEntries.value[0]) {
    void openHomeSearchSong(homeSongEntries.value[0], 0)
    return
  }
  if (homeArtistEntries.value[0]) {
    openHomeSearchArtist(homeArtistEntries.value[0])
    return
  }
  if (homePlaylistEntries.value[0]) openHomeSearchPlaylist(homePlaylistEntries.value[0])
}

const homeSearchPopoverVisible = computed(() => (
  homeSearchFocused.value
  && Boolean(homeSearchQuery.value.trim())
  && (homeSearching.value || Boolean(homeSearchError.value) || homeSearchEmpty.value || homeSongEntries.value.length || homeArtistEntries.value.length || homePlaylistEntries.value.length)
))

function openProfile() {
  router.push('/profile')
}

async function playContinueSong(song, index = 0) {
  const source = recentListenSongs.value.length ? recentListenSongs.value : newSongs.value
  await playSongWithQueue(song, source, index)
}

function saveHomeScrollTop() {
  const top = Math.max(0, Math.round(window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0))
  try {
    window.sessionStorage.setItem('aurora:home-scroll-top', String(top))
  } catch (error) {
    void error
  }
}

function openArtist(artist, event) {
  const artistId = Number(artist?.id || 0)
  if (!artistId) return
  const cardEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  const coverEl = cardEl?.querySelector('[data-artist-hero-cover]')
  if (coverEl instanceof HTMLElement) {
    setPendingTransition('artist', artistId, {
      coverRect: coverEl.getBoundingClientRect(),
      coverSrc: artist.picUrl || '',
      name: artist.name || '',
    })
  }
  router.push({path: '/artistDetial', query: {id: artistId}})
}

async function openPlaylist(playlist, event) {
  const playlistId = Number(playlist?.id || playlist?.playlistId || playlist?.targetId || 0)
  if (!playlistId) return
  void reportApi.reportBehavior({
    actionType: 'OPEN_PLAYLIST',
    actionTarget: String(playlistId),
    actionDetail: playlist?.name || '',
  }).catch(() => {})

  const cardEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  const coverEl = cardEl?.querySelector('[data-playlist-hero-cover]')
  const cardStyle = cardEl ? window.getComputedStyle(cardEl) : null
  const coverStyle = coverEl ? window.getComputedStyle(coverEl) : null
  saveHomeScrollTop()

  setPendingPlaylistHeroTransition(playlistId, {
    cardRect: cardEl?.getBoundingClientRect?.(),
    coverRect: coverEl?.getBoundingClientRect?.(),
    coverSrc: playlist.picUrl || playlist.coverImgUrl || '',
    playlistName: playlist.name || '',
    cardRadius: cardStyle?.borderRadius || '24px',
    cardShadow: cardStyle?.boxShadow || '0 8px 24px rgba(0,0,0,0.06)',
    coverRadius: coverStyle?.borderRadius || '24px',
    coverShadow: coverStyle?.boxShadow || '0 8px 24px rgba(0,0,0,0.06)',
  })
  await router.push({name: 'playlistDetail', query: {id: playlistId}})
}

async function runPlaylistHeroReturn() {
  if (route.name !== 'home') return
  const payload = consumeLatestPendingPlaylistHeroTransition()
  if (!payload?.id) return
  await nextTick()
  const target = document.querySelector(`[data-playlist-hero-cover][data-playlist-id="${payload.id}"]`)
  if (target instanceof HTMLElement) await playPlaylistHeroEnter({payload, targetCoverEl: target})
}

async function runArtistHeroReturn() {
  if (route.name !== 'home') return
  const payload = consumeLatestPendingTransition('artist')
  if (!payload?.id) return
  await nextTick()
  const target = document.querySelector(`[data-artist-hero-cover][data-artist-id="${payload.id}"]`)
  if (target instanceof HTMLElement) await playHeroEnter({payload, targetCoverEl: target})
}

async function openSong(song, index = 0) {
  await playSongWithQueue(song, newSongs.value, index)
}

async function playAllNewSongs() {
  const queue = newSongs.value.slice(0, 8)
  if (!queue.length) return
  await playSongWithQueue(queue[0], queue, 0)
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

function openReleaseNotesPanel() {
  releaseNotesOpen.value = true
  if (!releaseNotes.value.length) void loadReleaseNotes()
}

let deferredHomeTask = null
let deferredHomeLoadsCancelled = false

function cancelDeferredHomeTask() {
  deferredHomeLoadsCancelled = true
  if (!deferredHomeTask) return
  if (deferredHomeTask.type === 'idle') window.cancelIdleCallback?.(deferredHomeTask.id)
  else window.clearTimeout(deferredHomeTask.id)
  deferredHomeTask = null
}

function scheduleDeferredHomeLoads() {
  deferredHomeLoadsCancelled = false
  const loaders = [loadTopPlaylists, loadTopRanks, loadHotArtists, loadPodcastPrograms, () => loadMvList({reset: true}), loadReleaseNotes]
  let index = 0
  const scheduleNext = () => {
    if (deferredHomeLoadsCancelled || index >= loaders.length) return
    const run = async () => {
      deferredHomeTask = null
      const loader = loaders[index]
      index += 1
      try {
        await loader()
      } catch (error) {
        if (import.meta.env.DEV) console.warn('[home] deferred section load failed', error)
      } finally {
        scheduleNext()
      }
    }
    if (typeof window.requestIdleCallback === 'function') deferredHomeTask = {type: 'idle', id: window.requestIdleCallback(run, {timeout: 900})}
    else deferredHomeTask = {type: 'timeout', id: window.setTimeout(run, 220)}
  }
  scheduleNext()
}

onMounted(() => {
  runPlaylistHeroReturn()
  runArtistHeroReturn()
  void loadHomeBanner()
  void loadRecommendPlaylists()
  void loadNewSongs()
  void loadRecentListenSongs()
  scheduleDeferredHomeLoads()
  window.addEventListener('aurora:focus-home-search', focusHomeSearch)
  document.addEventListener('pointerdown', handleHomeSearchOutside)
})

watch(
  () => route.name,
  (name) => {
    if (name === 'home') {
      runPlaylistHeroReturn()
      runArtistHeroReturn()
    }
  },
)

watch(
  () => userStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      void loadRecentListenSongs()
      return
    }
    loading.value.recent = false
    errors.value.recent = ''
    recentListenSongs.value = []
  },
)

onBeforeUnmount(() => {
  cancelDeferredHomeTask()
  closeMvPlayer()
  clearHomeSearchState()
  window.removeEventListener('aurora:focus-home-search', focusHomeSearch)
  document.removeEventListener('pointerdown', handleHomeSearchOutside)
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  color: #27272a;
  background:
    radial-gradient(circle at 12% 4%, rgba(255, 228, 230, 0.72), transparent 24%),
    radial-gradient(circle at 92% 18%, rgba(254, 243, 199, 0.58), transparent 24%),
    #f7f7f8;
}

button { font-family: inherit; }
.home-topbar { position: sticky; top: 0; z-index: 20; border-bottom: 1px solid rgba(24, 24, 27, 0.065); background: rgba(247, 247, 248, 0.96); backdrop-filter: blur(22px) saturate(1.2); }
.home-topbar-inner { box-sizing: border-box; display: grid; width: min(100%, 1376px); min-height: 76px; align-items: center; grid-template-columns: auto auto minmax(260px, 1fr) auto; gap: 28px; margin: 0 auto; padding: 10px 28px 10px 88px; }
.home-brand,
.home-nav button,
.home-search,
.home-profile { cursor: pointer; border: 0; background: transparent; }
.home-brand { display: flex; align-items: center; gap: 10px; padding: 0; color: #18181b; font-size: 15px; font-weight: 900; letter-spacing: 0.22em; }
.home-brand-mark { display: grid; width: 28px; aspect-ratio: 1; place-items: center; color: #fff; border-radius: 9px; background: linear-gradient(135deg, #f4707e, #ef9a68); font-size: 12px; letter-spacing: 0; box-shadow: 0 8px 18px rgba(232, 87, 105, 0.22); }
.home-nav { display: flex; align-items: center; gap: 6px; }
.home-nav button { position: relative; padding: 11px 14px; color: #626269; font-size: 13px; font-weight: 740; }
.home-nav button::after { position: absolute; right: 14px; bottom: 3px; left: 14px; height: 2px; border-radius: 99px; background: #ed7180; content: ''; opacity: 0; transform: scaleX(0.45); transition: 180ms ease; }
.home-nav button:hover,
.home-nav button.is-active { color: #27272a; }
.home-nav button.is-active::after { opacity: 1; transform: scaleX(1); }
.home-search { position: relative; box-sizing: border-box; display: grid; width: min(100%, 520px); height: 44px; align-items: center; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 10px; justify-self: center; padding: 0 15px; color: #85858d; text-align: left; border: 1px solid rgba(24, 24, 27, 0.05); border-radius: 16px; background: rgba(228, 228, 231, 0.76); transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease; }
.home-search:hover,
.home-search.is-focused { border-color: rgba(232, 87, 105, 0.13); background: rgba(255, 255, 255, 0.94); box-shadow: 0 12px 30px rgba(24, 24, 27, 0.08); transform: translateY(-1px); }
.home-search svg { width: 18px; height: 18px; transition: color 180ms ease; }
.home-search.is-focused > svg { color: #e85769; animation: search-icon-arrive 420ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.home-search input { min-width: 0; height: 100%; color: #3f3f46; border: 0; outline: 0; background: transparent; font: inherit; font-size: 12px; font-weight: 620; }
.home-search input::-webkit-search-cancel-button { display: none; }
.home-search input::placeholder { color: #85858d; opacity: 1; }
.home-search kbd { padding: 3px 6px; color: #a1a1aa; border: 1px solid rgba(24, 24, 27, 0.06); border-radius: 6px; background: rgba(255, 255, 255, 0.7); font-size: 9px; }
.home-search-clear { display: grid; width: 24px; aspect-ratio: 1; place-items: center; padding: 0; cursor: pointer; color: #8b8b92; border: 0; border-radius: 50%; background: #eceaec; font-size: 16px; line-height: 1; }
.home-search-popover { position: absolute; top: calc(100% + 12px); left: 50%; z-index: 90; width: min(680px, calc(100vw - 32px)); max-height: min(68vh, 620px); overflow-y: auto; padding: 12px; color: #27272a; border: 1px solid rgba(24, 24, 27, 0.07); border-radius: 24px; background: rgba(255, 255, 255, 0.97); box-shadow: 0 28px 70px rgba(24, 24, 27, 0.18); transform: translateX(-50%); transform-origin: 50% 0; backdrop-filter: blur(24px); will-change: transform, opacity; }
.home-search-pop-enter-active { transition: opacity 220ms ease, transform 300ms cubic-bezier(0.16, 1, 0.3, 1), filter 220ms ease; }
.home-search-pop-leave-active { transition: opacity 150ms ease, transform 180ms ease, filter 150ms ease; }
.home-search-pop-enter-from,
.home-search-pop-leave-to { opacity: 0; filter: blur(2px); transform: translate(-50%, -10px) scale(0.975); }
.home-search-state { display: grid; min-height: 110px; place-items: center; color: #8b8b92; font-size: 11px; font-weight: 680; }
.home-search-state-loading { grid-template-columns: auto auto; justify-content: center; gap: 9px; }
.home-search-state-loading::before { width: 14px; aspect-ratio: 1; border: 2px solid #f4c7cd; border-top-color: #e85769; border-radius: 50%; content: ''; animation: search-spin 720ms linear infinite; }
.home-search-state-error { color: #e11d48; }
.home-search-section { display: grid; gap: 3px; }
.home-search-section + .home-search-section { margin-top: 10px; padding-top: 10px; border-top: 1px solid #f0eff0; }
.home-search-section-title { display: flex; align-items: center; justify-content: space-between; padding: 5px 7px 7px; }
.home-search-section-title span { color: #3f3f46; font-size: 10px; font-weight: 850; }
.home-search-section-title small { color: #a1a1aa; font-size: 8px; font-weight: 650; }
.home-search-result { display: grid; min-width: 0; align-items: center; grid-template-columns: 42px minmax(0, 1fr) auto; gap: 10px; padding: 6px; cursor: pointer; text-align: left; border: 0; border-radius: 13px; background: transparent; animation: search-result-arrive 320ms both cubic-bezier(0.2, 0.8, 0.2, 1); transition: background 160ms ease, transform 160ms ease; }
.home-search-result:nth-of-type(2) { animation-delay: 35ms; }
.home-search-result:nth-of-type(3) { animation-delay: 70ms; }
.home-search-result:nth-of-type(4) { animation-delay: 105ms; }
.home-search-result:hover { background: #f5f3f1; transform: translateX(2px); }
.home-search-result-cover { width: 42px; aspect-ratio: 1; overflow: hidden; border-radius: 10px; background: #e4e4e7; }
.home-search-result-cover :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.home-search-result-copy { min-width: 0; }
.home-search-result-copy strong,
.home-search-result-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.home-search-result-copy strong { color: #3f3f46; font-size: 11px; font-weight: 780; }
.home-search-result-copy small { margin-top: 3px; color: #a1a1aa; font-size: 9px; font-weight: 600; }
.home-search-result-action { padding: 6px 9px; color: #e85769; border-radius: 999px; background: #fff0f2; font-size: 8px; font-weight: 780; }
.home-search-section-compact { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.home-search-section-compact .home-search-section-title { width: 100%; }
.home-search-chip { display: inline-flex; min-width: 0; max-width: 190px; align-items: center; gap: 7px; padding: 5px 9px 5px 5px; cursor: pointer; overflow: hidden; color: #52525b; border: 1px solid #eeecea; border-radius: 999px; background: #faf9f8; font-size: 9px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; animation: search-result-arrive 320ms 90ms both cubic-bezier(0.2, 0.8, 0.2, 1); transition: transform 160ms ease, background 160ms ease; }
.home-search-chip:hover { background: #fff0f2; transform: translateY(-1px); }
.home-search-chip > span { width: 28px; aspect-ratio: 1; overflow: hidden; flex: none; border-radius: 50%; background: #e4e4e7; }
.home-search-chip > span :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.home-profile { display: grid; width: 40px; aspect-ratio: 1; overflow: hidden; place-items: center; color: #fff; border: 2px solid rgba(255, 255, 255, 0.9); border-radius: 50%; background: linear-gradient(135deg, #71717a, #27272a); box-shadow: 0 8px 22px rgba(24, 24, 27, 0.14); font-size: 13px; font-weight: 850; }
.home-profile img { width: 100%; height: 100%; object-fit: cover; }
.home-main { box-sizing: border-box; width: min(100%, 1376px); margin: 0 auto; padding: 34px 28px 150px; }
.home-lobby { display: grid; align-items: stretch; grid-template-columns: minmax(0, 1.72fr) minmax(300px, 0.88fr); gap: 22px; scroll-margin-top: 90px; }
.home-hero-card { position: relative; min-height: clamp(410px, 48vw, 525px); overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.72); border-radius: 34px; background: #d4d4d8; box-shadow: 0 30px 80px rgba(43, 32, 32, 0.15); }
.home-hero-media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.home-hero-fallback { position: absolute; inset: 0; overflow: hidden; background: linear-gradient(145deg, #596273, #252934 58%, #1b1d24); }
.fallback-orbit { position: absolute; border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 50%; }
.fallback-orbit-one { width: 560px; height: 560px; top: -210px; right: -80px; }
.fallback-orbit-two { width: 370px; height: 370px; right: 20px; bottom: -200px; }
.fallback-disc { position: absolute; top: 80px; right: 12%; width: 210px; aspect-ratio: 1; border-radius: 50%; background: repeating-radial-gradient(circle, #292d37 0 5px, #15171c 6px 12px); box-shadow: 0 35px 70px rgba(0, 0, 0, 0.36); }
.home-hero-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(14, 15, 19, 0.62) 0%, rgba(14, 15, 19, 0.3) 44%, rgba(14, 15, 19, 0.025) 76%), linear-gradient(0deg, rgba(14, 15, 19, 0.32), transparent 56%); }
.home-hero-content { position: absolute; inset: auto auto 0 0; width: min(100%, 660px); padding: clamp(30px, 5vw, 62px); color: #fff; }
.home-hero-content h1 { max-width: 590px; margin: 0; font-size: clamp(34px, 4.5vw, 58px); font-weight: 900; letter-spacing: -0.055em; line-height: 1.04; text-wrap: balance; text-shadow: 0 5px 22px rgba(0, 0, 0, 0.28); }
.continue-panel { display: grid; min-height: 410px; grid-template-rows: auto minmax(0, 1fr) auto; padding: 26px; border: 1px solid rgba(255, 255, 255, 0.88); border-radius: 34px; background: rgba(255, 255, 255, 0.72); box-shadow: 0 24px 65px rgba(52, 42, 40, 0.1); backdrop-filter: blur(20px); }
.continue-heading { display: flex; align-items: start; justify-content: space-between; gap: 12px; padding-bottom: 18px; border-bottom: 1px solid rgba(24, 24, 27, 0.055); }
.continue-heading p { margin: 0 0 6px; color: #e85769; font-size: 9px; font-weight: 850; letter-spacing: 0.16em; }
.continue-heading h2 { margin: 0; color: #27272a; font-size: 24px; font-weight: 900; letter-spacing: -0.04em; }
.continue-status { display: inline-flex; align-items: center; gap: 6px; color: #a1a1aa; font-size: 9px; font-weight: 720; }
.continue-status i { width: 6px; height: 6px; border-radius: 50%; background: #6fcf97; box-shadow: 0 0 0 4px rgba(111, 207, 151, 0.14); }
.continue-list { display: grid; height: 100%; min-height: 0; grid-template-rows: repeat(5, minmax(0, 1fr)); gap: 2px; padding-block: 7px; }
.continue-list :deep(.song-row-compact) { box-sizing: border-box; height: 100%; min-height: 0; grid-template-columns: 48px minmax(0, 1fr) 34px; padding: 6px 4px; }
.continue-list :deep(.song-row-compact .song-cover) { width: 48px; border-radius: 12px; }
.continue-list :deep(.song-row-compact .song-play) { width: 30px; }
.continue-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 16px; color: #a1a1aa; border-top: 1px solid rgba(24, 24, 27, 0.055); font-size: 9px; font-weight: 650; }
.continue-footer button { padding: 0; cursor: pointer; color: #e85769; border: 0; background: transparent; font: inherit; font-weight: 800; }
.continue-empty { display: grid; place-content: center; justify-items: center; color: #a1a1aa; text-align: center; }
.continue-empty-icon { display: grid; width: 48px; aspect-ratio: 1; place-items: center; color: #e85769; border-radius: 50%; background: #fff0f2; font-size: 22px; }
.continue-empty p { margin: 11px 0; font-size: 12px; font-weight: 700; }
.continue-empty button { padding: 8px 12px; cursor: pointer; color: #52525b; border: 1px solid rgba(24, 24, 27, 0.06); border-radius: 999px; background: #fff; font: inherit; font-size: 10px; font-weight: 750; }
.continue-skeleton { display: grid; height: 100%; min-height: 0; grid-template-rows: repeat(5, minmax(0, 1fr)); gap: 5px; padding-block: 7px; }
.continue-skeleton span { min-height: 0; border-radius: 14px; background: linear-gradient(100deg, #f1f1f2 20%, #fff 45%, #f1f1f2 70%); background-size: 220% 100%; animation: shimmer 1.3s linear infinite; }
.category-rail { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
.category-rail button,
.tag-list button,
.discovery-tabs button,
.section-link { cursor: pointer; border: 1px solid rgba(24, 24, 27, 0.055); border-radius: 999px; background: rgba(255, 255, 255, 0.68); }
.category-rail button { display: inline-flex; height: 39px; align-items: center; gap: 8px; padding: 0 17px; color: #71717a; font-size: 11px; font-weight: 760; transition: 180ms ease; }
.category-rail button:hover,
.category-rail button.is-active { color: #e85769; border-color: rgba(232, 87, 105, 0.08); background: #fff0f2; }
.category-rail span { font-size: 13px; }
.home-section { margin-top: 92px; scroll-margin-top: 34px; }
.section-link { padding: 9px 14px; color: #71717a; font-size: 10px; font-weight: 750; }
.playlist-strip { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: clamp(14px, 2vw, 24px); }
.playlist-strip > :nth-child(n + 6) { display: none; }
.playlist-skeleton { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 22px; }
.playlist-skeleton span { aspect-ratio: 1 / 1.18; border-radius: 24px; background: linear-gradient(100deg, #ebebed 20%, #fafafa 45%, #ebebed 70%); background-size: 220% 100%; animation: shimmer 1.3s linear infinite; }
.section-state { display: grid; min-height: 170px; place-content: center; justify-items: center; gap: 12px; color: #a1a1aa; border: 1px dashed rgba(24, 24, 27, 0.09); border-radius: 24px; background: rgba(255, 255, 255, 0.34); font-size: 12px; font-weight: 680; }
.section-state p { margin: 0; }
.section-state button { padding: 9px 14px; cursor: pointer; color: #fff; border: 0; border-radius: 999px; background: #27272a; font: inherit; font-size: 10px; }
.section-state-error { color: #e11d48; border-color: rgba(225, 29, 72, 0.12); background: rgba(255, 241, 242, 0.52); }
.section-sequence { display: flex; align-items: center; gap: 9px; color: #e85769; font-size: 9px; font-weight: 850; letter-spacing: 0.17em; }
.section-sequence span { color: #a1a1aa; font-variant-numeric: tabular-nums; }
.section-sequence i { width: 28px; height: 1px; background: currentColor; }
.section-sequence-light { color: #ff9d89; }
.section-sequence-light span { color: rgba(255, 255, 255, 0.4); }
.discovery-studio { position: relative; display: block; padding-inline: 4px; }
.discovery-intro { position: relative; z-index: 1; display: grid; align-items: end; grid-template-columns: minmax(230px, 0.7fr) minmax(270px, 1fr) auto; grid-template-rows: auto auto; gap: 8px clamp(28px, 4vw, 64px); padding-inline: 8px; }
.discovery-intro .section-sequence { grid-column: 1; grid-row: 1; }
.discovery-intro h2 { grid-column: 1; grid-row: 2; margin: 8px 0 0; color: #242326; font-size: clamp(38px, 4vw, 54px); font-weight: 920; letter-spacing: -0.065em; line-height: 0.98; }
.discovery-intro > p { grid-column: 2; grid-row: 1 / 3; max-width: 420px; margin: 0; color: #79777b; font-size: 12px; font-weight: 590; line-height: 1.75; }
.discovery-tabs { display: flex; grid-column: 3; grid-row: 1 / 3; align-self: end; gap: 4px; margin: 0; padding: 4px; border: 1px solid rgba(24, 24, 27, 0.07); border-radius: 999px; background: rgba(255, 255, 255, 0.72); box-shadow: 0 10px 28px rgba(24, 24, 27, 0.045); }
.discovery-tabs button { display: inline-flex; height: 36px; align-items: center; gap: 7px; padding: 0 13px; cursor: pointer; color: #777579; text-align: left; border: 0; border-radius: 999px; background: transparent; font-size: 10px; font-weight: 750; transition: color 180ms ease, background 180ms ease, box-shadow 180ms ease, transform 180ms ease; }
.discovery-tabs button span { color: #aaa7a4; font-size: 9px; font-variant-numeric: tabular-nums; }
.discovery-tabs button i { display: none; }
.discovery-tabs button:hover,
.discovery-tabs button.is-active { color: #fff; background: #29282c; box-shadow: 0 8px 18px rgba(24, 24, 27, 0.13); transform: translateY(-1px); }
.discovery-tabs button.is-active span { color: rgba(255, 255, 255, 0.55); }
.discovery-stage { position: relative; z-index: 1; box-sizing: border-box; height: 390px; min-width: 0; overflow: hidden; margin-top: 24px; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.92); border-radius: 30px; background: rgba(255, 255, 255, 0.78); box-shadow: 0 24px 64px rgba(48, 42, 38, 0.09); backdrop-filter: blur(18px); }
.discovery-content { height: 100%; min-height: 0; }
.discovery-content > .section-state { box-sizing: border-box; height: 100%; min-height: 0; }
.discovery-content > .tag-list + .section-state { height: calc(100% - 38px); }
.discovery-swap-enter-active { transition: opacity 240ms ease, transform 300ms cubic-bezier(0.16, 1, 0.3, 1); }
.discovery-swap-leave-active { transition: opacity 120ms ease, transform 150ms ease; }
.discovery-swap-enter-from { opacity: 0; transform: translateY(10px) scale(0.992); }
.discovery-swap-leave-to { opacity: 0; transform: translateY(-5px); }
.tag-list { display: flex; overflow-x: auto; gap: 6px; padding: 1px 2px 10px; scrollbar-width: none; }
.tag-list::-webkit-scrollbar { display: none; }
.tag-list button { flex: none; padding: 7px 12px; color: #8b8b92; border-color: transparent; background: transparent; font-size: 10px; font-weight: 720; transition: color 160ms ease, background 160ms ease; }
.tag-list button:hover { color: #3f3f46; background: #f3f1ef; }
.tag-list button.is-active { color: #fff; border-color: #27272a; background: #27272a; }
.discovery-playlists { display: grid; height: calc(100% - 38px); min-height: 0; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 9px; }
.discovery-playlist-tile { position: relative; min-width: 0; min-height: 0; overflow: hidden; padding: 0; cursor: pointer; text-align: left; border: 0; border-radius: 18px; background: #29282c; box-shadow: 0 10px 24px rgba(24, 24, 27, 0.1); isolation: isolate; }
.discovery-playlist-tile.is-featured { grid-column: span 2; grid-row: span 2; border-radius: 22px; }
.discovery-playlist-tile-cover,
.discovery-playlist-tile-shade { position: absolute; inset: 0; display: block; }
.discovery-playlist-tile-cover :deep(img),
.discovery-playlist-tile-cover :deep(video) { width: 100%; height: 100%; object-fit: cover; transition: transform 620ms cubic-bezier(0.16, 1, 0.3, 1), filter 300ms ease; }
.discovery-playlist-tile:hover .discovery-playlist-tile-cover :deep(img) { filter: saturate(1.08); transform: scale(1.055); }
.discovery-playlist-tile-shade { z-index: 1; background: linear-gradient(0deg, rgba(13, 13, 16, 0.86), rgba(13, 13, 16, 0.02) 76%); }
.discovery-playlist-tile-index { position: absolute; top: 13px; left: 14px; z-index: 2; color: rgba(255, 255, 255, 0.68); font-size: 8px; font-weight: 820; font-variant-numeric: tabular-nums; letter-spacing: 0.08em; }
.discovery-playlist-tile-copy { position: absolute; right: 14px; bottom: 13px; left: 14px; z-index: 2; min-width: 0; color: #fff; }
.discovery-playlist-tile-copy small { display: block; overflow: hidden; color: #ff9d89; font-size: 7px; font-weight: 850; text-overflow: ellipsis; letter-spacing: 0.13em; white-space: nowrap; }
.discovery-playlist-tile-copy strong { display: -webkit-box; overflow: hidden; margin-top: 5px; font-size: 12px; font-weight: 830; letter-spacing: -0.025em; line-height: 1.25; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.discovery-playlist-tile-copy > span { display: none; }
.discovery-playlist-tile.is-featured .discovery-playlist-tile-copy { right: 24px; bottom: 22px; left: 24px; }
.discovery-playlist-tile.is-featured .discovery-playlist-tile-copy small { font-size: 8px; }
.discovery-playlist-tile.is-featured .discovery-playlist-tile-copy strong { max-width: 440px; margin-top: 8px; font-size: clamp(22px, 2.3vw, 31px); font-weight: 890; letter-spacing: -0.045em; line-height: 1.12; }
.discovery-playlist-tile.is-featured .discovery-playlist-tile-copy > span { display: -webkit-box; max-width: 430px; overflow: hidden; margin-top: 9px; color: rgba(255, 255, 255, 0.66); font-size: 9px; font-weight: 580; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.discovery-playlist-tile-play { position: absolute; top: 11px; right: 11px; z-index: 2; display: grid; width: 29px; aspect-ratio: 1; place-items: center; color: #27272a; border-radius: 50%; background: rgba(255, 255, 255, 0.91); box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18); font-size: 8px; opacity: 0; transform: translateY(4px) scale(0.9); transition: opacity 180ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1); }
.discovery-playlist-tile.is-featured .discovery-playlist-tile-play { top: 17px; right: 17px; width: 40px; font-size: 10px; opacity: 1; transform: none; }
.discovery-playlist-tile:hover .discovery-playlist-tile-play { opacity: 1; transform: none; }
.row-skeleton,
.rank-skeleton,
.artist-skeleton { display: grid; gap: 12px; }
.row-skeleton { height: calc(100% - 38px); grid-template-columns: repeat(5, minmax(0, 1fr)); }
.row-skeleton span { min-height: 0; border-radius: 18px; background: #efeff0; }
.rank-skeleton { grid-template-columns: 1fr; }
.rank-skeleton span { height: 112px; border-radius: 20px; background: #efeff0; }
.artist-skeleton { height: 100%; grid-template-columns: minmax(260px, 0.78fr) repeat(2, minmax(0, 0.61fr)); grid-template-rows: repeat(4, minmax(0, 1fr)); gap: 8px; }
.artist-skeleton span { min-height: 0; border-radius: 17px; background: #efeff0; }
.artist-skeleton span:first-child { grid-row: 1 / -1; border-radius: 22px; }
.rank-grid { display: grid; height: 100%; grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 8px; }
.rank-card { display: grid; min-width: 0; align-items: center; grid-template-columns: 32px 66px minmax(110px, 0.38fr) minmax(0, 1fr) 22px; gap: 14px; padding: 9px 14px; cursor: pointer; text-align: left; border: 1px solid rgba(24, 24, 27, 0.045); border-radius: 19px; background: #f6f4f2; transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease; }
.rank-card:nth-child(2) { background: #f1eeeb; }
.rank-card:hover { background: #fff; box-shadow: 0 14px 30px rgba(24, 24, 27, 0.07); transform: translateX(3px); }
.rank-number { color: #e85769; font-size: 10px; font-weight: 850; font-variant-numeric: tabular-nums; }
.rank-cover { width: 66px; aspect-ratio: 1; overflow: hidden; border-radius: 14px; background: #e4e4e7; box-shadow: 0 8px 20px rgba(24, 24, 27, 0.12); }
.rank-cover :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.rank-meta { min-width: 0; }
.rank-meta strong,
.rank-meta small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank-meta strong { color: #27272a; font-size: 12px; font-weight: 830; }
.rank-meta small { margin-top: 5px; color: #e85769; font-size: 8px; font-weight: 730; }
.rank-tracks { display: grid; min-width: 0; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding-left: 18px; border-left: 1px solid rgba(24, 24, 27, 0.08); }
.rank-tracks > span { overflow: hidden; color: #52525b; font-size: 10px; font-weight: 680; text-overflow: ellipsis; white-space: nowrap; }
.rank-tracks b { display: inline-block; width: 22px; color: #e85769; }
.rank-tracks small { color: #a1a1aa; }
.rank-open { color: #aaa7a4; font-size: 14px; }
.artist-showcase { display: grid; height: 100%; min-height: 0; grid-template-columns: minmax(260px, 0.78fr) minmax(0, 1.22fr); gap: 9px; }
.artist-featured { position: relative; min-width: 0; min-height: 0; overflow: hidden; padding: 0; cursor: pointer; text-align: left; border: 0; border-radius: 22px; background: #27272a; box-shadow: 0 14px 30px rgba(24, 24, 27, 0.14); isolation: isolate; }
.artist-featured-cover,
.artist-featured-shade { position: absolute; inset: 0; display: block; }
.artist-featured-cover :deep(img) { width: 100%; height: 100%; object-fit: cover; transition: filter 300ms ease, transform 650ms cubic-bezier(0.16, 1, 0.3, 1); }
.artist-featured:hover .artist-featured-cover :deep(img) { filter: saturate(1.08); transform: scale(1.045); }
.artist-featured-shade { z-index: 1; background: linear-gradient(0deg, rgba(13, 13, 16, 0.9), rgba(13, 13, 16, 0.03) 74%); }
.artist-featured-index { position: absolute; top: 17px; left: 18px; z-index: 2; color: rgba(255, 255, 255, 0.72); font-size: 9px; font-weight: 840; font-variant-numeric: tabular-nums; letter-spacing: 0.08em; }
.artist-featured-copy { position: absolute; right: 24px; bottom: 22px; left: 24px; z-index: 2; color: #fff; }
.artist-featured-copy small { display: flex; align-items: center; gap: 7px; color: #ff9d89; font-size: 8px; font-weight: 850; letter-spacing: 0.14em; }
.artist-featured-copy small i { width: 18px; height: 1px; background: currentColor; }
.artist-featured-copy strong { display: block; overflow: hidden; margin-top: 9px; font-size: clamp(28px, 3vw, 40px); font-weight: 900; letter-spacing: -0.055em; text-overflow: ellipsis; white-space: nowrap; }
.artist-featured-copy > span { display: block; overflow: hidden; margin-top: 6px; color: rgba(255, 255, 255, 0.62); font-size: 9px; font-weight: 580; text-overflow: ellipsis; white-space: nowrap; }
.artist-featured-open { position: absolute; top: 15px; right: 15px; z-index: 2; display: grid; width: 38px; aspect-ratio: 1; place-items: center; color: #27272a; border-radius: 50%; background: rgba(255, 255, 255, 0.92); box-shadow: 0 9px 20px rgba(0, 0, 0, 0.18); font-size: 13px; transition: transform 200ms ease; }
.artist-featured:hover .artist-featured-open { transform: rotate(10deg) scale(1.04); }
.artist-directory { display: grid; min-width: 0; min-height: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(4, minmax(0, 1fr)); gap: 8px; }
.artist-directory-card { display: grid; min-width: 0; min-height: 0; align-items: center; grid-template-columns: 22px 52px minmax(0, 1fr) 20px; gap: 10px; padding: 7px 10px; cursor: pointer; text-align: left; border: 1px solid rgba(24, 24, 27, 0.045); border-radius: 17px; background: #f5f3f0; transition: background 180ms ease, box-shadow 180ms ease, transform 180ms ease; }
.artist-directory-card:nth-child(3n + 2) { background: #f0edeb; }
.artist-directory-card:hover { background: #fff; box-shadow: 0 12px 25px rgba(24, 24, 27, 0.08); transform: translateX(3px); }
.artist-directory-index { color: #e85769; font-size: 8px; font-weight: 840; font-variant-numeric: tabular-nums; }
.artist-directory-cover { display: block; width: 52px; aspect-ratio: 1; overflow: hidden; border-radius: 15px; background: #e4e4e7; box-shadow: 0 7px 16px rgba(24, 24, 27, 0.1); }
.artist-directory-cover :deep(img) { width: 100%; height: 100%; object-fit: cover; transition: transform 260ms ease; }
.artist-directory-card:hover .artist-directory-cover :deep(img) { transform: scale(1.06); }
.artist-directory-copy { min-width: 0; }
.artist-directory-copy strong,
.artist-directory-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.artist-directory-copy strong { color: #343337; font-size: 11px; font-weight: 820; }
.artist-directory-copy small { margin-top: 4px; color: #a5a2a0; font-size: 7px; font-weight: 750; letter-spacing: 0.09em; }
.artist-directory-open { color: #aaa7a4; font-size: 12px; }
.release-section { position: relative; display: grid; overflow: hidden; grid-template-columns: minmax(230px, 0.3fr) minmax(0, 0.7fr); gap: clamp(24px, 4vw, 58px); padding: clamp(30px, 4.4vw, 54px); border-radius: 38px; background: #222125; box-shadow: 0 30px 80px rgba(24, 24, 27, 0.18); }
.release-section::before { position: absolute; top: -260px; left: -180px; width: 520px; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle, rgba(239, 113, 128, 0.2), transparent 68%); content: ''; pointer-events: none; }
.release-intro { position: relative; z-index: 1; }
.release-intro h2 { margin: 30px 0 15px; color: #fff; font-size: clamp(38px, 4.5vw, 60px); font-weight: 920; letter-spacing: -0.065em; line-height: 0.98; }
.release-intro > p { max-width: 270px; margin: 0; color: rgba(255, 255, 255, 0.52); font-size: 12px; font-weight: 570; line-height: 1.8; }
.release-play-all { display: inline-flex; height: 43px; align-items: center; gap: 9px; margin-top: 30px; padding: 0 17px; cursor: pointer; color: #29282c; border: 0; border-radius: 999px; background: #fff; font-size: 10px; font-weight: 820; transition: transform 180ms ease; }
.release-play-all:hover { transform: translateY(-2px); }
.release-play-all span { color: #e85769; font-size: 9px; }
.release-decoration { display: flex; height: 45px; align-items: end; gap: 5px; margin-top: 48px; opacity: 0.36; }
.release-decoration span { width: 4px; border-radius: 99px; background: #ff9d89; }
.release-decoration span:nth-child(1) { height: 18px; }
.release-decoration span:nth-child(2) { height: 38px; }
.release-decoration span:nth-child(3) { height: 27px; }
.release-decoration span:nth-child(4) { height: 45px; }
.release-content { position: relative; z-index: 1; min-width: 0; align-self: center; }
.new-song-panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 15px; padding: 10px; border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 27px; background: rgba(255, 255, 255, 0.045); }
.release-section :deep(.song-row:hover),
.release-section :deep(.song-row:focus-visible) { border-color: rgba(255, 255, 255, 0.07); background: rgba(255, 255, 255, 0.075); }
.release-section :deep(.song-title) { color: rgba(255, 255, 255, 0.9); }
.release-section :deep(.song-artist),
.release-section :deep(.song-duration),
.release-section :deep(.song-index) { color: rgba(255, 255, 255, 0.38); }
.release-section :deep(.song-play) { color: #fff; border-color: rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.07); }
.release-section :deep(.song-cover) { box-shadow: 0 9px 24px rgba(0, 0, 0, 0.25); }
.song-skeleton { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.song-skeleton span { height: 72px; border-radius: 18px; background: rgba(255, 255, 255, 0.08); }
.media-studio { position: relative; }
.media-section-header { display: grid; align-items: end; grid-template-columns: minmax(0, 1fr) minmax(240px, 0.4fr); gap: 34px; margin-bottom: 30px; padding-inline: 5px; }
.media-section-header h2 { margin: 21px 0 0; color: #27272a; font-size: clamp(38px, 4.8vw, 62px); font-weight: 920; letter-spacing: -0.065em; line-height: 1; }
.media-section-header > p { max-width: 390px; justify-self: end; margin: 0; color: #858389; font-size: 12px; font-weight: 580; line-height: 1.75; }
.mv-showcase,
.podcast-showcase { padding: clamp(24px, 3.5vw, 40px); border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 34px; background: rgba(255, 255, 255, 0.68); box-shadow: 0 24px 68px rgba(52, 42, 40, 0.07); }
.media-subheading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 23px; }
.media-subheading span { color: #e85769; font-size: 8px; font-weight: 850; letter-spacing: 0.17em; }
.media-subheading h3 { margin: 6px 0 0; color: #27272a; font-size: 26px; font-weight: 900; letter-spacing: -0.045em; }
.media-subheading > p { margin: 0; color: #a1a1aa; font-size: 9px; font-weight: 650; }
.mv-grid { display: grid; height: min(42vw, 525px); min-height: 420px; grid-template-columns: minmax(0, 1.5fr) minmax(260px, 0.72fr); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 12px; }
.mv-card { min-width: 0; min-height: 0; padding: 0; cursor: pointer; text-align: left; border: 0; background: transparent; }
.mv-card-featured { grid-row: 1 / 3; }
.mv-cover { position: relative; display: block; width: 100%; height: 100%; overflow: hidden; border-radius: 22px; background: #e4e4e7; }
.mv-cover :deep(img),
.mv-cover :deep(video) { width: 100%; height: 100%; object-fit: cover; transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1); }
.mv-card:hover .mv-cover :deep(img) { transform: scale(1.045); }
.mv-shade { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(12, 12, 15, 0.82), transparent 68%); }
.mv-order { position: absolute; top: 17px; left: 18px; color: rgba(255, 255, 255, 0.74); font-size: 9px; font-weight: 800; letter-spacing: 0.08em; }
.mv-card-copy { position: absolute; right: 65px; bottom: 17px; left: 18px; color: #fff; }
.mv-card-copy small,
.mv-card-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mv-card-copy small { color: rgba(255, 255, 255, 0.58); font-size: 9px; font-weight: 650; }
.mv-card-copy strong { margin-top: 5px; font-size: 13px; font-weight: 820; }
.mv-card-featured .mv-card-copy { right: 85px; bottom: 27px; left: 27px; }
.mv-card-featured .mv-card-copy strong { margin-top: 7px; font-size: clamp(22px, 2.4vw, 34px); letter-spacing: -0.035em; }
.mv-cover > i { position: absolute; right: 17px; bottom: 17px; display: grid; width: 38px; aspect-ratio: 1; place-items: center; color: #27272a; border-radius: 50%; background: rgba(255, 255, 255, 0.92); box-shadow: 0 8px 22px rgba(24, 24, 27, 0.2); }
.mv-card-featured .mv-cover > i { right: 26px; bottom: 26px; width: 48px; }
.mv-cover svg { width: 12px; height: 12px; margin-left: 2px; }
.podcast-showcase { margin-top: 20px; background: #eee9e3; }
.podcast-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.podcast-list button { position: relative; display: grid; min-width: 0; align-items: center; grid-template-columns: 22px 92px minmax(0, 1fr) 20px; gap: 12px; padding: 12px; cursor: pointer; text-align: left; border: 1px solid rgba(255, 255, 255, 0.76); border-radius: 22px; background: rgba(255, 255, 255, 0.62); transition: background 180ms ease, transform 180ms ease, box-shadow 180ms ease; }
.podcast-list button:hover { background: #fff; box-shadow: 0 16px 32px rgba(48, 42, 38, 0.08); transform: translateY(-3px); }
.podcast-index { align-self: start; padding-top: 4px; color: #aaa7a4; font-size: 8px; font-weight: 800; }
.podcast-cover { width: 92px; aspect-ratio: 1; overflow: hidden; border-radius: 17px; background: #d8d5d1; box-shadow: 0 9px 24px rgba(48, 42, 38, 0.12); }
.podcast-cover :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.podcast-copy { min-width: 0; }
.podcast-copy strong,
.podcast-copy small,
.podcast-copy > span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.podcast-copy small { color: #e85769; font-size: 8px; font-weight: 760; }
.podcast-copy strong { margin-top: 7px; color: #343337; font-size: 11px; font-weight: 800; }
.podcast-copy > span { margin-top: 10px; color: #99969a; font-size: 9px; font-weight: 650; }
.podcast-copy > span i { margin-right: 4px; color: #e85769; font-size: 7px; font-style: normal; }
.podcast-arrow { color: #aaa7a4; font-size: 13px; }
.media-skeleton { display: grid; height: 430px; grid-template-columns: 1.5fr 0.72fr; gap: 12px; }
.media-skeleton span { border-radius: 22px; background: #ebebed; }
.media-skeleton span:first-child { grid-row: span 2; }
.podcast-skeleton { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.podcast-skeleton span { height: 118px; border-radius: 22px; background: rgba(255, 255, 255, 0.6); }
.home-footer { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 100px; padding: 28px 2px 0; border-top: 1px solid rgba(24, 24, 27, 0.07); }
.home-footer div { display: flex; align-items: center; gap: 16px; }
.home-footer strong { color: #27272a; font-size: 12px; font-weight: 900; letter-spacing: 0.2em; }
.home-footer span { color: #a1a1aa; font-size: 10px; font-weight: 620; }
.home-footer button { padding: 9px 14px; cursor: pointer; color: #71717a; border: 1px solid rgba(24, 24, 27, 0.07); border-radius: 999px; background: rgba(255, 255, 255, 0.58); font-size: 9px; font-weight: 750; }
@keyframes shimmer { to { background-position-x: -220%; } }
@keyframes search-spin { to { transform: rotate(360deg); } }
@keyframes search-icon-arrive {
  0% { opacity: 0.5; transform: rotate(-18deg) scale(0.72); }
  60% { transform: rotate(4deg) scale(1.13); }
  100% { opacity: 1; transform: none; }
}
@keyframes search-result-arrive {
  from { opacity: 0; transform: translateY(7px); }
  to { opacity: 1; transform: none; }
}

@media (max-width: 1080px) {
  .home-topbar-inner { grid-template-columns: auto minmax(230px, 1fr) auto; }
  .home-nav { display: none; }
  .home-lobby { grid-template-columns: minmax(0, 1.45fr) minmax(290px, 0.8fr); }
  .playlist-strip,
  .playlist-skeleton { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .playlist-strip > :nth-child(5),
  .playlist-skeleton > :nth-child(5) { display: none; }
  .discovery-studio { padding-inline: 4px; }
  .discovery-intro { grid-template-columns: minmax(210px, 0.62fr) minmax(240px, 1fr) auto; gap: 8px 24px; }
  .discovery-tabs button { padding-inline: 10px; }
  .continue-list :deep(.song-row-compact) { grid-template-columns: 42px minmax(0, 1fr) 32px; padding-block: 5px; }
  .continue-list :deep(.song-row-compact .song-cover) { width: 42px; border-radius: 11px; }
  .continue-list :deep(.song-row-compact .song-play) { width: 28px; }
  .podcast-list button { grid-template-columns: 18px 76px minmax(0, 1fr) 16px; gap: 9px; }
  .podcast-cover { width: 76px; }
}

@media (max-width: 820px) {
  .home-topbar-inner { min-height: 68px; grid-template-columns: auto 1fr auto; padding-right: 18px; padding-left: 72px; }
  .home-search { width: 42px; height: 42px; grid-template-columns: 1fr; place-items: center; justify-self: end; padding: 0; border-radius: 50%; }
  .home-search input { position: absolute; width: 1px; opacity: 0; pointer-events: none; }
  .home-search kbd { display: none; }
  .home-search.is-focused { width: 100%; min-width: 150px; grid-template-columns: 18px minmax(0, 1fr) auto; place-items: stretch; padding: 0 12px; border-radius: 15px; }
  .home-search.is-focused svg { align-self: center; }
  .home-search.is-focused input { position: static; width: auto; opacity: 1; pointer-events: auto; }
  .home-search-clear { align-self: center; }
  .home-search-popover { position: fixed; top: 66px; right: 10px; left: 10px; width: auto; max-height: min(64vh, 560px); border-radius: 20px; transform: none; }
  .home-search-pop-enter-from,
  .home-search-pop-leave-to { transform: translateY(-10px) scale(0.975); }
  .home-main { padding: 22px 18px 140px; }
  .home-lobby { grid-template-columns: 1fr; }
  .home-hero-card { min-height: 480px; }
  .continue-panel { min-height: auto; }
  .playlist-strip,
  .playlist-skeleton { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .playlist-strip > :nth-child(4),
  .playlist-skeleton > :nth-child(4) { display: none; }
  .discovery-intro { grid-template-columns: 1fr; grid-template-rows: auto; gap: 10px; }
  .discovery-intro .section-sequence,
  .discovery-intro h2,
  .discovery-intro > p,
  .discovery-tabs { grid-column: 1; grid-row: auto; }
  .discovery-intro > p { max-width: 470px; margin-top: 4px; }
  .discovery-tabs { width: max-content; max-width: 100%; margin-top: 12px; }
  .rank-card { grid-template-columns: 28px 62px minmax(100px, 0.35fr) minmax(0, 1fr) 18px; gap: 10px; }
  .rank-cover { width: 62px; }
  .rank-tracks { gap: 8px; padding-left: 12px; }
  .artist-showcase { height: 100%; margin-right: -12px; overflow-x: auto; grid-auto-columns: 76%; grid-auto-flow: column; grid-template-columns: none; grid-template-rows: 1fr; padding-right: 12px; scrollbar-width: none; }
  .artist-showcase::-webkit-scrollbar { display: none; }
  .artist-directory { display: contents; }
  .artist-directory-card { position: relative; display: block; overflow: hidden; padding: 0; border: 0; border-radius: 22px; background: #27272a; box-shadow: 0 12px 26px rgba(24, 24, 27, 0.12); isolation: isolate; }
  .artist-directory-card::after { position: absolute; inset: 0; z-index: 1; background: linear-gradient(0deg, rgba(13, 13, 16, 0.88), rgba(13, 13, 16, 0.03) 72%); content: ''; pointer-events: none; }
  .artist-directory-card:hover { background: #27272a; transform: none; }
  .artist-directory-cover { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 0; box-shadow: none; }
  .artist-directory-index { position: absolute; top: 17px; left: 18px; z-index: 2; color: rgba(255, 255, 255, 0.72); font-size: 9px; }
  .artist-directory-copy { position: absolute; right: 20px; bottom: 20px; left: 20px; z-index: 2; color: #fff; }
  .artist-directory-copy strong { color: #fff; font-size: 26px; font-weight: 880; letter-spacing: -0.04em; }
  .artist-directory-copy small { margin-top: 6px; color: #ff9d89; font-size: 8px; }
  .artist-directory-open { position: absolute; top: 15px; right: 15px; z-index: 2; display: grid; width: 36px; aspect-ratio: 1; place-items: center; color: #27272a; border-radius: 50%; background: rgba(255, 255, 255, 0.92); font-size: 12px; }
  .artist-skeleton { display: flex; height: 100%; gap: 9px; overflow: hidden; }
  .artist-skeleton span,
  .artist-skeleton span:first-child { width: 76%; height: 100%; flex: none; border-radius: 22px; }
  .release-section { grid-template-columns: 1fr; }
  .release-intro > p { max-width: 520px; }
  .release-decoration { display: none; }
  .new-song-panel,
  .song-skeleton { grid-template-columns: 1fr; }
  .media-section-header { grid-template-columns: 1fr; }
  .media-section-header > p { justify-self: start; }
  .podcast-list,
  .podcast-skeleton { grid-template-columns: 1fr; }
  .podcast-list button { grid-template-columns: 22px 92px minmax(0, 1fr) 20px; gap: 12px; }
  .podcast-cover { width: 92px; }
}

@media (max-width: 560px) {
  .home-brand { font-size: 12px; }
  .home-brand-mark { display: none; }
  .home-profile { width: 36px; }
  .home-main { padding-inline: 13px; }
  .home-hero-card { min-height: 510px; border-radius: 26px; }
  .home-hero-content { padding: 25px; }
  .home-hero-content h1 { font-size: 42px; }
  .continue-panel { padding: 20px; border-radius: 26px; }
  .category-rail { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
  .category-rail::-webkit-scrollbar { display: none; }
  .category-rail button { flex: none; }
  .home-section { margin-top: 70px; }
  .playlist-strip,
  .playlist-skeleton { display: grid; margin-right: -13px; overflow-x: auto; grid-auto-columns: 72vw; grid-auto-flow: column; grid-template-columns: none; padding-right: 13px; padding-bottom: 14px; scrollbar-width: none; }
  .playlist-strip > :nth-child(n),
  .playlist-skeleton > :nth-child(n) { display: block; }
  .playlist-strip::-webkit-scrollbar,
  .playlist-skeleton::-webkit-scrollbar { display: none; }
  .discovery-studio { padding-inline: 0; }
  .discovery-intro { padding-inline: 6px; }
  .discovery-intro h2 { margin-top: 21px; font-size: 40px; }
  .discovery-tabs { display: grid; width: 100%; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 18px; }
  .discovery-tabs button { width: 100%; justify-content: center; padding: 0 5px; text-align: center; font-size: 10px; }
  .discovery-tabs button span { display: none; }
  .discovery-stage { height: auto; min-height: 0; margin-top: 18px; padding: 9px; border-radius: 22px; }
  .discovery-content { height: auto; min-height: 0; }
  .discovery-playlists { height: 300px; margin-right: -9px; overflow-x: auto; grid-auto-columns: 78%; grid-auto-flow: column; grid-template-columns: none; grid-template-rows: 1fr; padding-right: 9px; scrollbar-width: none; }
  .discovery-playlists::-webkit-scrollbar { display: none; }
  .discovery-playlist-tile.is-featured { grid-column: auto; grid-row: auto; border-radius: 18px; }
  .discovery-playlist-tile.is-featured .discovery-playlist-tile-copy { right: 18px; bottom: 17px; left: 18px; }
  .discovery-playlist-tile.is-featured .discovery-playlist-tile-copy strong { font-size: 23px; }
  .row-skeleton { height: 300px; overflow: hidden; grid-auto-columns: 78%; grid-auto-flow: column; grid-template-columns: none; }
  .rank-grid { height: auto; min-height: 0; grid-template-rows: none; }
  .rank-card { grid-template-columns: 24px 54px minmax(0, 1fr) 18px; gap: 8px; padding: 10px 8px; }
  .rank-cover { width: 54px; border-radius: 12px; }
  .rank-tracks { grid-column: 2 / -1; grid-row: 2; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; padding: 9px 0 0; border-top: 1px solid rgba(24, 24, 27, 0.06); border-left: 0; }
  .rank-tracks > :nth-child(n + 3) { display: none; }
  .rank-open { grid-column: 4; grid-row: 1; }
  .artist-showcase,
  .artist-skeleton { height: 300px; }
  .release-section { padding: 26px 14px 14px; border-radius: 27px; }
  .release-intro { padding-inline: 9px; }
  .release-intro h2 { margin-top: 21px; font-size: 40px; }
  .release-play-all { margin-top: 23px; }
  .new-song-panel { padding: 8px; border-radius: 22px; }
  .media-section-header h2 { font-size: 40px; }
  .mv-showcase,
  .podcast-showcase { padding: 20px 14px; border-radius: 27px; }
  .media-subheading > p { display: none; }
  .mv-grid { display: grid; height: 305px; min-height: 0; margin-right: -14px; overflow-x: auto; grid-auto-columns: 82%; grid-auto-flow: column; grid-template-columns: none; grid-template-rows: 1fr; padding-right: 14px; padding-bottom: 8px; scrollbar-width: none; }
  .mv-card-featured { grid-row: auto; }
  .mv-card-featured .mv-card-copy { right: 65px; bottom: 17px; left: 18px; }
  .mv-card-featured .mv-card-copy strong { margin-top: 5px; font-size: 20px; }
  .mv-card-featured .mv-cover > i { right: 17px; bottom: 17px; width: 38px; }
  .mv-grid::-webkit-scrollbar { display: none; }
  .podcast-list button { grid-template-columns: 18px 76px minmax(0, 1fr) 18px; gap: 9px; padding: 9px; border-radius: 18px; }
  .podcast-cover { width: 76px; border-radius: 14px; }
  .media-skeleton { height: 305px; grid-template-columns: 1fr; }
  .media-skeleton span:not(:first-child) { display: none; }
  .home-footer { align-items: start; flex-direction: column; margin-top: 70px; }
  .home-footer div { align-items: start; flex-direction: column; gap: 7px; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after { scroll-behavior: auto !important; animation-duration: 1ms !important; transition-duration: 1ms !important; }
}

@supports (content-visibility: auto) {
  .home-section { content-visibility: auto; contain-intrinsic-size: 1px 620px; }
}
</style>
