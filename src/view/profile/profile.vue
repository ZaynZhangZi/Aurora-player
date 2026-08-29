<template>
  <AppHeader />
  <div class="profile-page" :style="profilePageStyle" data-route-motion-root>
    <div class="profile-ambient" aria-hidden="true">
      <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="" />
    </div>

    <header class="profile-overview">
      <canvas ref="heroCanvasRef" class="profile-hero-canvas" aria-hidden="true" />
      <div class="profile-hero-wash" aria-hidden="true" />

      <div class="profile-overview-grid">
        <div class="profile-identity">
          <div class="profile-avatar-shell">
            <img v-if="profile.avatarUrl && !avatarLoadFailed" :src="profile.avatarUrl" :alt="`${profile.nickname || '用户'}头像`" @error="avatarLoadFailed = true" />
            <span v-else>{{ profileInitial }}</span>
          </div>
          <div class="profile-identity-copy">
            <p class="profile-eyebrow">PERSONAL LIBRARY · {{ certificationText }}</p>
            <h1>{{ profile.nickname || '我的主页' }}</h1>
            <p class="profile-signature">{{ profile.signature || profile.description || '把喜欢的音乐，慢慢收藏成自己的样子。' }}</p>
            <div class="profile-meta">
              <span>UID {{ profile.userId || '-' }}</span>
              <span>{{ locationText }}</span>
              <span>Lv.{{ level.level || 0 }}</span>
            </div>
          </div>
        </div>

        <div class="profile-stat-panel" aria-label="个人资料统计">
          <article><strong>{{ formatCount(profile.follows) }}</strong><small>关注</small></article>
          <article><strong>{{ formatCount(profile.followeds) }}</strong><small>粉丝</small></article>
          <article><strong>{{ playlists.length }}</strong><small>歌单</small></article>
        </div>
      </div>

      <nav class="profile-tabs" role="tablist" aria-label="个人中心功能">
        <button id="profile-tab-playlist" type="button" role="tab" :aria-selected="activeTab === 'playlist'" aria-controls="profile-panel-playlist" :class="{ 'is-active': activeTab === 'playlist' }" @click="switchTab('playlist')">
          <strong>歌单总览</strong><small>{{ playlists.length }}</small>
        </button>
        <button id="profile-tab-cloud" type="button" role="tab" :aria-selected="activeTab === 'cloud'" aria-controls="profile-panel-cloud" :class="{ 'is-active': activeTab === 'cloud' }" @click="switchTab('cloud')">
          <strong>云盘管理</strong><small>{{ cloudSongs.length }}</small>
        </button>
        <button id="profile-tab-listening" type="button" role="tab" :aria-selected="activeTab === 'listening'" aria-controls="profile-panel-listening" :class="{ 'is-active': activeTab === 'listening' }" @click="switchTab('listening')">
          <strong>听歌画像</strong><small>{{ listeningBuckets.length || '—' }}</small>
        </button>
      </nav>
    </header>

    <!-- Main Content Stream Grid Frame -->
    <main class="profile-content">
      <transition name="tab-panel" mode="out-in">

        <!-- Tab Content 1: Borderless Clean Library Layout -->
        <section id="profile-panel-playlist" v-if="activeTab === 'playlist'" key="playlist" class="profile-workspace profile-library" role="tabpanel" aria-labelledby="profile-tab-playlist">
          <div class="profile-section-heading">
            <div><p>MY COLLECTION</p><h2>我的音乐空间</h2><span>创建、收藏与反复聆听，都在这里慢慢沉淀。</span></div>
            <div class="profile-library-counts" aria-label="歌单数量">
              <span><strong>{{ createdPlaylists.length }}</strong> 创建</span>
              <i />
              <span><strong>{{ subscribedPlaylists.length }}</strong> 收藏</span>
            </div>
          </div>

          <p v-if="loading" class="profile-state">正在同步媒体资料库...</p>
          <p v-else-if="error" class="profile-state profile-state-error">{{ error }}</p>

          <template v-else>
            <div class="profile-shelf">
              <div class="profile-shelf-heading">
                <div><span>01</span><h3>创建的歌单</h3></div>
                <p>属于你的声音目录</p>
              </div>
              <div class="profile-playlist-grid">
                <article
                  v-for="item in createdPlaylists"
                  :key="`created-${item.id}`"
                  class="profile-playlist-card group"
                  role="button"
                  tabindex="0"
                  @click="openPlaylist(item, $event)"
                  @keyup.enter="openPlaylist(item, $event)"
                >
                  <div
                    class="profile-playlist-cover"
                    data-playlist-hero-cover
                    :data-playlist-id="item.id"
                  >
                    <img :src="item.coverImgUrl" :alt="`${item.name}封面`" loading="lazy" decoding="async" />
                    <span class="profile-playlist-open" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </span>
                  </div>
                  <p class="profile-playlist-title">{{ item.name }}</p>
                  <p class="profile-playlist-meta"><span>{{ item.trackCount || 0 }} 首</span><i />最近整理</p>
                </article>
              </div>
              <p v-if="!createdPlaylists.length" class="profile-empty-state">暂无创建的内容</p>
            </div>

            <div class="profile-shelf">
              <div class="profile-shelf-heading">
                <div><span>02</span><h3>收藏的歌单</h3></div>
                <p>从别人的世界里带回来的旋律</p>
              </div>
              <div class="profile-playlist-grid">
                <article
                  v-for="item in subscribedPlaylists"
                  :key="`sub-${item.id}`"
                  class="profile-playlist-card group"
                  role="button"
                  tabindex="0"
                  @click="openPlaylist(item, $event)"
                  @keyup.enter="openPlaylist(item, $event)"
                >
                  <div
                    class="profile-playlist-cover"
                    data-playlist-hero-cover
                    :data-playlist-id="item.id"
                  >
                    <img :src="item.coverImgUrl" :alt="`${item.name}封面`" loading="lazy" decoding="async" />
                    <span class="profile-playlist-open" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </span>
                  </div>
                  <p class="profile-playlist-title">{{ item.name }}</p>
                  <p class="profile-playlist-meta"><span>{{ item.trackCount || 0 }} 首</span><i />私人收藏</p>
                </article>
              </div>
              <p v-if="!subscribedPlaylists.length" class="profile-empty-state">暂无收藏的内容</p>
            </div>
          </template>
        </section>

        <!-- Tab Content 2: High-Fidelity Music Cloud Drive List -->
        <section id="profile-panel-cloud" v-else-if="activeTab === 'cloud'" key="cloud" class="profile-workspace profile-cloud" role="tabpanel" aria-labelledby="profile-tab-cloud">
          <div class="profile-section-heading">
            <div><p>PRIVATE CLOUD</p><h2>云盘管理</h2><span>把自己的声音带在身边，并保持每一份文件清楚可见。</span></div>
            <button
              class="profile-section-action"
              type="button"
              :disabled="cloudLoading || Boolean(cloudDeletingId)"
              @click="loadCloudSongs(cloudPage)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              刷新存储
            </button>
          </div>

          <div class="profile-upload-deck">
            <div class="profile-upload-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>
            </div>
            <div class="profile-upload-copy">
              <span>UPLOAD TO YOUR CLOUD</span>
              <strong>{{ cloudUploadFile?.name || '添加一首本地音乐' }}</strong>
              <p>{{ cloudUploadFile ? formatFileSize(cloudUploadFile.size) : '支持 FLAC、WAV、MP3、M4A 与 AAC，上传后可直接加入播放队列。' }}</p>
              <p v-if="cloudUploadMessage" class="profile-upload-message">{{ cloudUploadMessage }}</p>
            </div>

            <div class="profile-upload-actions">
              <label class="profile-upload-select">
                {{ cloudUploadFile ? '重新选择' : '选择文件' }}
                <input
                  :key="cloudFileInputKey"
                  type="file"
                  accept=".mp3,.flac,.wav,.m4a,.aac"
                  class="profile-upload-input"
                  @change="onCloudFileChange"
                />
              </label>

              <button
                v-if="cloudUploadFile"
                class="profile-upload-confirm"
                type="button"
                :disabled="cloudUploading || Boolean(cloudDeletingId)"
                @click="uploadCloudSong"
              >
                {{ cloudUploading ? '分片编译中...' : '确认部署上传' }}
              </button>
            </div>
          </div>

          <div class="profile-cloud-summary">
            <div><span>当前页面</span><strong>{{ cloudSongs.length }} 首</strong></div>
            <div><span>文件体积</span><strong>{{ cloudPageTotalSize }}</strong></div>
            <div><span>所在分页</span><strong>{{ String(cloudPage).padStart(2, '0') }}</strong></div>
          </div>

          <p v-if="cloudLoading" class="profile-state">正在同步云盘内容...</p>
          <p v-else-if="cloudError" class="profile-state profile-state-error">{{ cloudError }}</p>

          <template v-else>
            <div v-if="cloudSongs.length" class="profile-cloud-table-head" aria-hidden="true">
              <span>歌曲</span><span>文件大小</span><span>添加时间</span><span>操作</span>
            </div>
            <TransitionGroup
              v-if="cloudSongs.length"
              name="cloud-row"
              tag="div"
              class="profile-cloud-list"
            >
              <article
                v-for="(item, index) in cloudSongs"
                :key="`cloud-${item.songId}`"
                :ref="element => setCloudRowRef(item.songId, element)"
                class="profile-cloud-row group"
                :class="{ 'is-playing': cloudPlayingId === Number(item.songId) }"
              >
                <div class="profile-cloud-row-main" @click="playCloudSong(item)">
                  <div class="profile-cloud-song">
                    <span class="profile-cloud-index">{{ String(index + 1 + (cloudPage - 1) * cloudLimit).padStart(2, '0') }}</span>
                    <div class="profile-cloud-cover">
                      <img v-if="item.coverUrl" :src="item.coverUrl" :alt="`${item.songName}封面`" loading="lazy" decoding="async" />
                      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>
                      <span aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                      </span>
                    </div>
                    <div class="profile-cloud-song-copy">
                      <strong>{{ item.songName }}</strong>
                      <span>{{ item.artistName }} · {{ item.albumName }}</span>
                    </div>
                  </div>

                  <span class="profile-cloud-size">{{ formatFileSize(item.fileSize) }}</span>
                  <span class="profile-cloud-date">{{ formatDateTime(item.addTime).split(' ')[0] }}</span>
                  <div class="profile-cloud-actions">
                    <button type="button" title="查看详情" :aria-expanded="activeCloudDetailId === item.songId" @click.stop="toggleCloudDetail(item)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>
                    </button>
                    <button
                      class="is-danger"
                      type="button"
                      title="删除歌曲"
                      :disabled="Boolean(cloudDeletingId)"
                      :aria-busy="cloudDeletingId === Number(item.songId)"
                      @click.stop="deleteCloudSong(item)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 13h8l1-13"/></svg>
                    </button>
                  </div>
                </div>

                <div v-if="activeCloudDetailId === item.songId" class="profile-cloud-detail">
                  <p v-if="cloudDetailLoadingId === item.songId" class="profile-cloud-detail-loading">正在读取文件信息...</p>
                  <div v-else>
                    <p><span>媒体原件名</span><strong>{{ cloudDetails[item.songId]?.fileName || item.fileName || '-' }}</strong></p>
                    <p><span>数字比特率</span><strong>{{ cloudDetails[item.songId]?.bitrate || item.bitrate || '-' }} kbps</strong></p>
                    <p><span>歌曲时长</span><strong>{{ formatDuration(cloudDetails[item.songId]?.simpleSong?.dt || item.duration) }}</strong></p>
                    <p><span>云盘 ID</span><strong>{{ cloudDetails[item.songId]?.songId || item.songId }}</strong></p>
                  </div>
                </div>
              </article>
            </TransitionGroup>
            <p v-else class="profile-empty-state profile-cloud-empty">云盘里还没有音乐，先上传一首试试。</p>

            <div class="profile-pagination">
              <span>PAGE {{ String(cloudPage).padStart(2, '0') }}</span>
              <div>
                <button
                  type="button"
                  aria-label="上一页"
                  :disabled="cloudPage <= 1 || cloudLoading || Boolean(cloudDeletingId)"
                  @click="prevCloudPage"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button
                  type="button"
                  aria-label="下一页"
                  :disabled="!cloudCanNextPage || cloudLoading || Boolean(cloudDeletingId)"
                  @click="nextCloudPage"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </div>
          </template>
        </section>

        <!-- Tab Content 3: Sound Fingerprint Portrait Analysis -->
        <section id="profile-panel-listening" v-else-if="activeTab === 'listening'" key="listening" class="profile-workspace profile-listening" role="tabpanel" aria-labelledby="profile-tab-listening">
          <div class="profile-section-heading">
            <div><p>LISTENING PORTRAIT</p><h2>听歌画像</h2><span>从播放记录里整理偏好，不把你定义成某一种风格。</span></div>
            <div class="listening-range-control" aria-label="画像时间范围">
              <button
                :class="{ 'is-active': listeningRange === 'week' }"
                :aria-pressed="listeningRange === 'week'"
                type="button"
                @click="setListeningRange('week')"
              >本周</button>
              <button
                :class="{ 'is-active': listeningRange === 'all' }"
                :aria-pressed="listeningRange === 'all'"
                type="button"
                @click="setListeningRange('all')"
              >全时段</button>
            </div>
          </div>

          <p v-if="listeningLoading" class="profile-state">正在分析聆听记录...</p>
          <p v-else-if="listeningError" class="profile-state profile-state-error">{{ listeningError }}</p>

          <div v-else-if="listeningBuckets.length" class="listening-dashboard">
            <div class="listening-overview-grid">
              <article class="listening-climate-card" :style="listeningMeshStyle">
                <div class="listening-climate-orbits" aria-hidden="true"><i /><i /><i /></div>
                <span class="listening-climate-kicker">{{ listeningRange === 'week' ? 'WEEKLY CLIMATE' : 'ALL-TIME CLIMATE' }}</span>
                <div class="listening-climate-copy">
                  <p>你的核心声音</p>
                  <h3>{{ listeningDominant?.label }}</h3>
                  <span>{{ listeningPortraitCopy }}</span>
                </div>
              </article>

              <aside class="listening-stat-grid" aria-label="画像样本摘要">
                <article><span>01 · PLAY WEIGHT</span><strong>{{ formatCount(listeningStats.totalPlays) }}</strong><small>累计播放权重</small></article>
                <article><span>02 · TRACKS</span><strong>{{ listeningStats.trackCount }}</strong><small>收录曲目</small></article>
                <article><span>03 · ARTISTS</span><strong>{{ listeningStats.artistCount }}</strong><small>常听艺人</small></article>
                <article><span>04 · DIVERSITY</span><strong>{{ listeningStats.diversity }}%</strong><small>偏好探索度</small></article>
              </aside>
            </div>

            <section class="listening-breakdown">
              <div class="listening-subheading">
                <div><span>PREFERENCE MAP</span><h3>偏好分布</h3></div>
                <p>颜色仅表示分类，不改变页面底色</p>
              </div>
              <div class="listening-preference-list">
                <article v-for="(item, index) in listeningBuckets" :key="item.key" :class="{ 'is-leading': index === 0 }">
                  <span class="listening-preference-index">{{ String(index + 1).padStart(2, '0') }}</span>
                  <div class="listening-preference-copy"><i :style="{ backgroundColor: item.color }" /><strong>{{ item.label }}</strong></div>
                  <div class="listening-preference-track"><i :style="{ width: `${item.percent}%`, backgroundColor: item.color }" /></div>
                  <strong class="listening-preference-percent">{{ item.percent }}%</strong>
                </article>
              </div>
            </section>

            <div class="listening-voices-grid">
              <section class="listening-track-panel">
                <div class="listening-subheading">
                  <div><span>REPRESENTATIVE TRACKS</span><h3>构成这张画像的声音</h3></div>
                </div>
                <div class="listening-track-list">
                  <button v-for="(item, index) in listeningTopTracks" :key="item.id || `${item.name}-${index}`" type="button" @click="playListeningTrack(item)">
                    <span class="listening-track-index">{{ String(index + 1).padStart(2, '0') }}</span>
                    <span class="listening-track-cover">
                      <img v-if="item.cover" :src="item.cover" :alt="`${item.name}封面`" loading="lazy" decoding="async" />
                      <i v-else>{{ item.name.slice(0, 1) }}</i>
                    </span>
                    <span class="listening-track-copy"><strong>{{ item.name }}</strong><small>{{ item.artists }}</small></span>
                    <span class="listening-track-count">{{ item.count }} 次</span>
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                  </button>
                </div>
              </section>

              <section class="listening-artist-panel">
                <div class="listening-subheading">
                  <div><span>FREQUENT ARTISTS</span><h3>常听艺人</h3></div>
                </div>
                <ol>
                  <li v-for="(artist, index) in listeningTopArtists" :key="artist.key">
                    <span>{{ artist.name.slice(0, 1).toUpperCase() }}</span>
                    <div><strong>{{ artist.name }}</strong><small>{{ artist.count }} 播放权重</small></div>
                    <i>{{ String(index + 1).padStart(2, '0') }}</i>
                  </li>
                </ol>
              </section>
            </div>
          </div>

          <div v-else class="listening-empty-state">
            <span>NO PORTRAIT YET</span>
            <h3>还没有足够的聆听记录</h3>
            <p>多播放几首喜欢的歌，这里会逐渐形成属于你的声音气候。</p>
          </div>
        </section>
      </transition>
    </main>

    <!-- Global App Route Frame Modal Drawer Router -->
    <ModalRouterView content-width="85vw" content-height="80vh" content-radius="24px" />
  </div>
</template>
<script setup>
defineOptions({ name: 'ProfilePage' })
import {computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import chroma from 'chroma-js'
import {useCounterStore} from '@/stores/userStores.js'
import {userApi} from '@/api/userApi/userApi.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'
import {reportApi} from '@/api/reportApi/reportApi.js'
import {setPendingTransition, consumeLatestPendingTransition, playHeroEnter} from '@/utils/heroTransition.js'
import {dissolveElement} from '@/utils/particleDissolve.js'
import ModalRouterView from '@/components/modalRouterView/ModalRouterView.vue'
import AppHeader from '@/components/appHeader/AppHeader.vue'

const route = useRoute()
const router = useRouter()
const userStore = useCounterStore()

const loading = ref(true)
const error = ref('')
const activeTab = ref('playlist')
const avatarLoadFailed = ref(false)

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
const cloudRowRefs = new Map()
let cloudDeleteEffectController = null
let profileUnmounted = false
const listeningLoading = ref(false)
const listeningError = ref('')
const listeningRange = ref('week')
const listeningRecords = ref({week: [], all: []})
const listeningBuckets = ref([])
const themeRgb = ref('214, 219, 228')
const animatedThemeRgb = ref(themeRgb.value)
const avatarPalette = ref({
  primary: '116, 148, 163',
  secondary: '174, 196, 188',
  deep: '222, 231, 232',
  highlight: '89, 124, 139',
  surface: '244, 247, 246',
  ink: '39, 38, 37',
  heroInk: '42, 49, 51',
  heroWash: '241, 246, 245',
  canvasOpacity: '0.58',
})
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
const profileInitial = computed(() => String(profile.value.nickname || 'A').trim().slice(0, 1).toUpperCase())
const cloudPageTotalSize = computed(() => formatFileSize(
  cloudSongs.value.reduce((sum, item) => sum + Number(item?.fileSize || 0), 0),
))
const activeListeningRecords = computed(() => listeningRecords.value[listeningRange.value] || [])
const listeningDominant = computed(() => listeningBuckets.value[0] || null)
const listeningStats = computed(() => {
  const trackIds = new Set()
  const artistIds = new Set()
  let totalPlays = 0

  activeListeningRecords.value.forEach((record) => {
    const song = record?.song || {}
    const weight = Math.max(1, Number(record?.playCount || record?.score || 1))
    totalPlays += weight
    trackIds.add(String(song?.id || song?.name || trackIds.size))
    ;(song?.ar || []).forEach((artist) => {
      const key = artist?.id || artist?.name
      if (key) artistIds.add(String(key))
    })
  })

  const entropy = listeningBuckets.value.reduce((sum, item) => {
    const probability = Number(item.percent || 0) / 100
    return probability > 0 ? sum - probability * Math.log(probability) : sum
  }, 0)
  const diversity = Math.round(clamp((entropy / Math.log(7)) * 100, 0, 100))

  return {
    totalPlays,
    trackCount: trackIds.size,
    artistCount: artistIds.size,
    diversity,
  }
})
const listeningTopTracks = computed(() => {
  const tracks = new Map()
  activeListeningRecords.value.forEach((record) => {
    const song = record?.song || {}
    const id = Number(song?.id || 0)
    const key = String(id || song?.name || tracks.size)
    const count = Math.max(1, Number(record?.playCount || record?.score || 1))
    const previous = tracks.get(key)
    if (previous) {
      previous.count += count
      return
    }
    tracks.set(key, {
      id,
      name: song?.name || '未知歌曲',
      artists: (song?.ar || []).map(artist => artist?.name).filter(Boolean).join(' / ') || '未知歌手',
      artistItems: (song?.ar || []).map(artist => ({name: artist?.name})).filter(artist => artist.name),
      cover: song?.al?.picUrl || '',
      count,
    })
  })
  return [...tracks.values()].sort((a, b) => b.count - a.count).slice(0, 5)
})
const listeningTopArtists = computed(() => {
  const artists = new Map()
  activeListeningRecords.value.forEach((record) => {
    const weight = Math.max(1, Number(record?.playCount || record?.score || 1))
    ;(record?.song?.ar || []).forEach((artist) => {
      const name = artist?.name || '未知艺人'
      const key = String(artist?.id || name)
      const previous = artists.get(key) || {key, name, count: 0}
      previous.count += weight
      artists.set(key, previous)
    })
  })
  return [...artists.values()].sort((a, b) => b.count - a.count).slice(0, 5)
})
const listeningPortraitCopy = computed(() => {
  const primary = listeningBuckets.value[0]
  const secondary = listeningBuckets.value[1]
  if (!primary) return '播放记录还在积累，属于你的声音气候会慢慢出现。'
  if (!secondary) return `最近的播放记录更集中在「${primary.label}」，偏好清晰而稳定。`
  const range = listeningRange.value === 'week' ? '这一周' : '长期以来'
  return `${range}，你在「${primary.label}」与「${secondary.label}」之间停留得更久。`
})
const profilePageStyle = computed(() => ({
  '--profile-primary-rgb': avatarPalette.value.primary,
  '--profile-secondary-rgb': avatarPalette.value.secondary,
  '--profile-deep-rgb': avatarPalette.value.deep,
  '--profile-highlight-rgb': avatarPalette.value.highlight,
  '--profile-surface-rgb': avatarPalette.value.surface,
  '--profile-ink-rgb': avatarPalette.value.ink,
  '--profile-hero-ink-rgb': avatarPalette.value.heroInk,
  '--profile-hero-wash-rgb': avatarPalette.value.heroWash,
  '--profile-canvas-opacity': avatarPalette.value.canvasOpacity,
}))

function setCloudRowRef(songId, element) {
  const sid = Number(songId || 0)
  if (!sid) return
  if (element) cloudRowRefs.set(sid, element)
  else cloudRowRefs.delete(sid)
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

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
  const paper = chroma.mix(lchBase, '#ffffff', 0.88, 'lch').desaturate(0.3)
  const mist = chroma.mix(lchBase, '#eef4f2', 0.76, 'lch').desaturate(0.42)

  const meshStops = []
  const meshCount = Math.max(6, vectors.length * 2)
  for (let i = 0; i < meshCount; i += 1) {
    const a = vectors[i % vectors.length]
    const b = vectors[(i + 1) % vectors.length]
    const noiseA = valueNoise2D(i * 0.87, 1.13, 11)
    const noiseB = valueNoise2D(i * 1.13, 2.07, 29)
    const blendT = 0.2 + noiseA * 0.58
    const mixed = chroma.mix(a.color, b.color, blendT, 'lch').desaturate(0.44).brighten(0.62)
    const px = 8 + noiseA * 84
    const py = 8 + noiseB * 84
    const r = 18 + (a.weight + b.weight) * 34
    meshStops.push(`radial-gradient(circle at ${px.toFixed(2)}% ${py.toFixed(2)}%, ${mixed.alpha(0.28).css()} 0%, ${mixed.alpha(0.07).css()} ${r.toFixed(2)}%, ${mixed.alpha(0).css()} ${(r + 20).toFixed(2)}%)`)
  }

  const baseLayer = `linear-gradient(135deg, ${paper.css()} 0%, ${mist.css()} 100%)`
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

function buildAvatarPalette(primaryRgb, secondaryRgb = primaryRgb, toneStats = {}) {
  const normalizeAccent = (rgb, fallbackHue = 24) => {
    const source = chroma(rgb)
    const [sourceL, sourceC, sourceH] = source.lch()
    const hue = Number.isFinite(sourceH) ? sourceH : fallbackHue
    const lightness = clamp(sourceL * 0.62 + 24, 54, 68)
    const chromaValue = clamp(sourceC * 0.58 + 7, 14, 38)
    return chroma.lch(lightness, chromaValue, hue)
  }

  const averageLuminance = Number(toneStats.averageLuminance ?? 0.68)
  const darkRatio = Number(toneStats.darkRatio ?? 0)
  const isAvatarDark = averageLuminance < 0.18 && darkRatio >= 0.62
  const primary = normalizeAccent(primaryRgb)
  const [, , primaryHue] = primary.lch()
  const secondarySource = normalizeAccent(secondaryRgb, Number.isFinite(primaryHue) ? primaryHue : 24)
  const secondary = chroma.mix(primary, secondarySource, 0.68, 'lch').desaturate(0.28).brighten(0.12)
  const deepBase = chroma.mix(primary, secondary, 0.38, 'lab').desaturate(0.42)
  const darkHero = deepBase.luminance(clamp(deepBase.luminance() * 0.16, 0.03, 0.065))
  const lightHero = chroma.mix('#f7faf8', primary, 0.2, 'lab').desaturate(0.22)
  const hero = isAvatarDark ? darkHero : lightHero
  const highlight = isAvatarDark
    ? chroma.mix(primary, '#ffffff', 0.62, 'lch').desaturate(0.2)
    : primary.darken(0.32).desaturate(0.08)
  const surface = chroma.mix('#f9faf8', primary, 0.065, 'lab')
  const ink = chroma.mix('#2b2d2c', primary, 0.055, 'lab')
  const heroInk = isAvatarDark ? chroma('#ffffff') : ink
  const heroWash = isAvatarDark ? darkHero : chroma.mix('#ffffff', hero, 0.52, 'lab')

  return {
    primary: formatRgb(primary.rgb()),
    secondary: formatRgb(secondary.rgb()),
    deep: formatRgb(hero.rgb()),
    highlight: formatRgb(highlight.rgb()),
    surface: formatRgb(surface.rgb()),
    ink: formatRgb(ink.rgb()),
    heroInk: formatRgb(heroInk.rgb()),
    heroWash: formatRgb(heroWash.rgb()),
    canvasOpacity: isAvatarDark ? '0.82' : '0.52',
  }
}

function applyAvatarPalette(primaryRgb, secondaryRgb = primaryRgb, toneStats = {}) {
  const palette = buildAvatarPalette(primaryRgb, secondaryRgb, toneStats)
  avatarPalette.value = palette
  themeRgb.value = palette.primary
}

function pickAvatarPalette(data, size) {
  const gridSize = 12
  const sampleRadius = Math.max(1, Math.floor(size / gridSize / 4))
  const samples = []

  for (let gy = 0; gy < gridSize; gy += 1) {
    for (let gx = 0; gx < gridSize; gx += 1) {
      const centerX = Math.round(((gx + 0.5) / gridSize) * (size - 1))
      const centerY = Math.round(((gy + 0.5) / gridSize) * (size - 1))
      let r = 0
      let g = 0
      let b = 0
      let weight = 0

      for (let py = centerY - sampleRadius; py <= centerY + sampleRadius; py += 1) {
        for (let px = centerX - sampleRadius; px <= centerX + sampleRadius; px += 1) {
          if (px < 0 || py < 0 || px >= size || py >= size) continue
          const index = (py * size + px) * 4
          const alpha = data[index + 3] / 255
          if (alpha < 0.18) continue
          r += data[index] * alpha
          g += data[index + 1] * alpha
          b += data[index + 2] * alpha
          weight += alpha
        }
      }

      if (weight > 0) {
        samples.push([r / weight, g / weight, b / weight])
      }
    }
  }

  const bucketSize = 28
  const buckets = new Map()
  for (const [pr, pg, pb] of samples) {
    const hsl = rgbToHsl(pr, pg, pb)
    if (hsl.l < 0.055 || hsl.l > 0.95) continue

    const lightBalance = 1 - Math.min(1, Math.abs(hsl.l - 0.52) / 0.52)
    const sampleWeight = 0.3 + hsl.s * 1.05 + lightBalance * 0.62
    const key = `${Math.round(pr / bucketSize)}-${Math.round(pg / bucketSize)}-${Math.round(pb / bucketSize)}`
    const group = buckets.get(key) || {r: 0, g: 0, b: 0, score: 0, count: 0}

    group.r += pr * sampleWeight
    group.g += pg * sampleWeight
    group.b += pb * sampleWeight
    group.score += sampleWeight
    group.count += 1

    buckets.set(key, group)
  }

  const ranked = [...buckets.values()]
    .filter(item => item.score > 0)
    .map(item => ({
      ...item,
      rgb: [item.r / item.score, item.g / item.score, item.b / item.score],
    }))
    .sort((a, b) => b.score - a.score)

  const luminances = samples.map(rgb => chroma(rgb).luminance())
  const averageLuminance = luminances.reduce((sum, value) => sum + value, 0) / Math.max(1, luminances.length)
  const darkRatio = luminances.filter(value => value < 0.18).length / Math.max(1, luminances.length)

  if (!ranked.length) {
    if (!samples.length) return null
    const averageRgb = [0, 1, 2].map(channel => (
      samples.reduce((sum, rgb) => sum + rgb[channel], 0) / samples.length
    ))
    return {
      primary: averageRgb,
      secondary: averageRgb,
      averageLuminance,
      darkRatio,
    }
  }

  const primary = ranked[0]
  const secondary = ranked.slice(1).reduce((picked, item) => {
    const distance = chroma.distance(primary.rgb, item.rgb, 'lab')
    const score = item.score * clamp(distance / 28, 0.18, 1.25)
    return !picked || score > picked.selectionScore ? {...item, selectionScore: score} : picked
  }, null)

  return {
    primary: primary.rgb,
    secondary: secondary?.rgb || primary.rgb,
    averageLuminance,
    darkRatio,
  }
}

async function pickAvatarTheme(avatarUrl, seed) {
  if (!avatarUrl) {
    const fallback = parseRgb(colorFromSeed(seed))
    applyAvatarPalette(fallback)
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

    const size = 72
    canvas.width = size
    canvas.height = size
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
    const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2)
    const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2)
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size)

    const {data} = context.getImageData(0, 0, size, size)
    const palette = pickAvatarPalette(data, size)
    if (!palette) throw new Error('no pixels')
    applyAvatarPalette(palette.primary, palette.secondary, palette)
  } catch {
    const fallback = parseRgb(colorFromSeed(seed))
    applyAvatarPalette(fallback)
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

async function playListeningTrack(item) {
  const queue = listeningTopTracks.value
    .filter(track => Number(track.id || 0) > 0)
    .map(track => ({
      id: track.id,
      name: track.name,
      artists: track.artistItems,
      cover: track.cover,
    }))
  const queueIndex = Math.max(0, queue.findIndex(track => Number(track.id) === Number(item?.id)))
  await playSongWithQueue({
    id: item.id,
    name: item.name,
    artists: item.artistItems,
    cover: item.cover,
  }, queue, queueIndex)
}

function switchTab(tab) {
  activeTab.value = tab
}

async function runPlaylistHeroReturn() {
  const payload = consumeLatestPendingTransition('playlist')
  if (!payload?.id) return

  await nextTick()
  const targetCoverEl = document.querySelector(
    `[data-playlist-hero-cover][data-playlist-id="${payload.id}"]`
  )
  if (!(targetCoverEl instanceof HTMLElement)) return

  await playHeroEnter({payload, targetCoverEl})
}

function openPlaylist(item, event) {
  const playlistId = Number(item?.id || item?.playlistId || item?.targetId || 0)
  if (!playlistId) return
  reportApi.reportBehavior({
    actionType: 'OPEN_PLAYLIST',
    actionTarget: String(playlistId),
    actionDetail: item?.name || item?.playlistName || '',
  })

  const coverSrc = item.coverImgUrl || item.picUrl || ''

  // 用 event.currentTarget 找到卡片，再从卡片内找封面元素
  // 比 document.querySelector 更可靠（不受 DOM 结构变动影响）
  const cardEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  const coverEl = cardEl ? cardEl.querySelector('[data-playlist-hero-cover]') : null

  if (coverEl instanceof HTMLElement) {
    setPendingTransition('playlist', playlistId, {
      coverRect: coverEl.getBoundingClientRect(),
      coverSrc,
      playlistName: item.name || item.playlistName || '',
    })
  }

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

async function loadCloudSongs(
  page = 1,
  {allowDuringDelete = false, silent = false} = {},
) {
  if (!userStore.userId || (cloudDeletingId.value && !allowDuringDelete)) {
    return false
  }

  if (!silent) {
    cloudLoading.value = true
    cloudError.value = ''
  }
  try {
    const offset = (Math.max(1, page) - 1) * cloudLimit
    const res = await userApi.getUserCloud(cloudLimit, offset)
    const list = res?.data?.data || []
    cloudSongs.value = list.map(normalizeCloudSong)
    cloudPage.value = Math.max(1, page)
    cloudHasMore.value = Boolean(res?.data?.hasMore)
    if (!cloudSongs.value.length && cloudPage.value > 1) {
      return await loadCloudSongs(cloudPage.value - 1, {
        allowDuringDelete,
        silent,
      })
    }
    return true
  } catch (err) {
    if (!silent) cloudError.value = err?.message || '云盘加载失败'
    return false
  } finally {
    if (!silent) cloudLoading.value = false
  }
}

async function prevCloudPage() {
  if (cloudPage.value <= 1 || cloudDeletingId.value) return
  await loadCloudSongs(cloudPage.value - 1)
}

async function nextCloudPage() {
  if (!cloudCanNextPage.value || cloudDeletingId.value) return
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
  if (!cloudUploadFile.value || cloudUploading.value || cloudDeletingId.value) return

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
  cloudError.value = ''
  let effectController = null
  try {
    await userApi.deleteUserCloudSong(String(sid))
    if (profileUnmounted) return

    const row = cloudRowRefs.get(sid)
    let dissolveEffect = null
    if (row?.isConnected && !prefersReducedMotion()) {
      effectController = new AbortController()
      cloudDeleteEffectController = effectController
      try {
        dissolveEffect = dissolveElement(row, {
          preset: 'harmony-row',
          duration: 520,
          particleCount: 52,
          direction: 'right',
          colors: ['rgba(255, 255, 255, 0.88)', '#D9DEE7', '#BCC5D1', '#9EAABA'],
          signal: effectController.signal,
        })
        await (dissolveEffect.layoutReady || Promise.resolve())
      } catch {
        // 删除已在服务端完成，动画失败不应阻断本地列表收尾。
      }
    }

    if (profileUnmounted) return

    const rowIndex = cloudSongs.value.findIndex(song => Number(song?.songId || 0) === sid)
    if (rowIndex >= 0) cloudSongs.value.splice(rowIndex, 1)
    cloudRowRefs.delete(sid)

    if (activeCloudDetailId.value === sid) activeCloudDetailId.value = null
    const nextDetails = {...cloudDetails.value}
    delete nextDetails[sid]
    cloudDetails.value = nextDetails

    await nextTick()
    if (!profileUnmounted) {
      await loadCloudSongs(cloudPage.value, {
        allowDuringDelete: true,
        silent: true,
      })
    }
    if (dissolveEffect) {
      try {
        await dissolveEffect
      } catch {
        // 列表已完成本地收尾，粒子尾段失败无需回滚删除结果。
      }
    }
  } catch (err) {
    cloudError.value = err?.message || '云盘歌曲删除失败'
  } finally {
    if (cloudDeleteEffectController === effectController) {
      cloudDeleteEffectController = null
    }
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
  loading.value = true
  error.value = ''

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
  if (profile.value.avatarUrl) {
    void pickAvatarTheme(profile.value.avatarUrl, profile.value.nickname)
  }
  loadProfilePage()
})

onActivated(() => {
  // keepAlive 重新激活时，检查是否有待处理的 Hero 回程动画
  runPlaylistHeroReturn()
})

onBeforeUnmount(() => {
  profileUnmounted = true
  cloudDeleteEffectController?.abort()
  cloudDeleteEffectController = null
  if (themeTweenFrame) {
    cancelAnimationFrame(themeTweenFrame)
    themeTweenFrame = 0
  }
  stopHeroCanvas()
  if (heroResizeObserver) {
    heroResizeObserver.disconnect()
    heroResizeObserver = null
  }
  cloudRowRefs.clear()
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
  () => route.name,
  (name) => {
    if (name === 'profile') {
      runPlaylistHeroReturn()
    }
  },
)

watch(
  () => profile.value.avatarUrl,
  () => {
    avatarLoadFailed.value = false
  },
)

watch(
  animatedThemeRgb,
  () => {
    if (!heroCanvasFrame) {
      renderHeroCanvasStatic()
    }
  },
)

watch(
  () => userStore.userId,
  (nextUserId, prevUserId) => {
    if (nextUserId && nextUserId !== prevUserId) {
      listeningRecords.value = {week: [], all: []}
      listeningBuckets.value = []
      listeningError.value = ''
      loadProfilePage()
      return
    }
    if (!nextUserId) {
      error.value = '请先登录再查看个人中心'
      loading.value = false
      playlists.value = []
      cloudSongs.value = []
      listeningRecords.value = {week: [], all: []}
      listeningBuckets.value = []
    }
  },
)

</script>

<style scoped>
.profile-page,
.profile-page * {
  box-sizing: border-box;
}

.profile-page {
  position: relative;
  min-height: 100vh;
  padding: 18px 28px 150px;
  overflow: hidden;
  color: rgb(var(--profile-ink-rgb));
  background:
    radial-gradient(circle at 8% 8%, rgba(var(--profile-primary-rgb), 0.2), transparent 28%),
    radial-gradient(circle at 92% 34%, rgba(var(--profile-secondary-rgb), 0.17), transparent 32%),
    rgb(var(--profile-surface-rgb));
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
  transition: color 520ms ease, background-color 520ms ease;
}

.profile-ambient {
  position: fixed;
  top: -180px;
  right: -120px;
  z-index: 0;
  width: min(54vw, 760px);
  aspect-ratio: 1;
  overflow: hidden;
  pointer-events: none;
  border-radius: 50%;
  opacity: 0.13;
  filter: blur(120px) saturate(1.25);
}

.profile-ambient img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.28); }

.profile-top-spacer { width: 100%; height: 52px; }

.profile-utility-bar {
  position: relative;
  z-index: 3;
  display: flex;
  width: min(100%, 1240px);
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  margin: 0 auto 16px;
}

.profile-back {
  display: inline-flex;
  height: 38px;
  align-items: center;
  gap: 7px;
  padding: 0 14px 0 10px;
  cursor: pointer;
  color: #5f5b56;
  border: 1px solid rgba(40, 38, 36, 0.08);
  border-radius: 999px;
  background: rgba(var(--profile-surface-rgb), 0.78);
  font: inherit;
  font-size: 12px;
  font-weight: 760;
  box-shadow: 0 8px 24px rgba(39, 31, 27, 0.04);
  backdrop-filter: blur(16px);
  transition: transform 180ms ease, background 180ms ease;
}

.profile-back:hover { background: rgba(255, 255, 255, 0.94); transform: translateX(-2px); }
.profile-back svg { width: 16px; height: 16px; }

.profile-wordmark { display: flex; align-items: center; gap: 9px; color: #302e2b; }
.profile-wordmark i {
  display: grid;
  width: 28px;
  aspect-ratio: 1;
  place-items: center;
  color: #fff;
  border-radius: 9px;
  background: rgb(var(--profile-primary-rgb));
  font-size: 12px;
  font-style: normal;
  font-weight: 950;
}
.profile-wordmark span { font-size: 11px; font-weight: 900; letter-spacing: 0.22em; }
.profile-wordmark small { padding-left: 9px; color: #aaa49e; border-left: 1px solid rgba(40, 38, 36, 0.11); font-size: 9px; font-weight: 800; letter-spacing: 0.16em; }

.profile-sync-state { display: inline-flex; align-items: center; gap: 7px; color: #89837d; font-size: 11px; font-weight: 700; }
.profile-sync-state i { width: 7px; height: 7px; border-radius: 50%; background: rgb(var(--profile-primary-rgb)); box-shadow: 0 0 0 4px rgba(var(--profile-primary-rgb), 0.13); }

.profile-hero {
  position: relative;
  z-index: 2;
  display: grid;
  width: min(100%, 1240px);
  min-height: 520px;
  overflow: hidden;
  grid-template-columns: minmax(0, 1.25fr) minmax(330px, 0.75fr);
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 42px 54px;
  margin: 0 auto;
  padding: 68px 62px 0;
  color: rgb(var(--profile-hero-ink-rgb));
  border: 1px solid rgba(var(--profile-hero-ink-rgb), 0.12);
  border-radius: 38px;
  background: rgb(var(--profile-deep-rgb));
  box-shadow: 0 34px 90px rgba(var(--profile-deep-rgb), 0.2);
  isolation: isolate;
  transition: background-color 520ms ease, box-shadow 520ms ease;
}

.profile-hero-canvas { position: absolute; inset: 0; z-index: -2 !important; opacity: var(--profile-canvas-opacity); transition: opacity 520ms ease; }
.profile-hero-wash {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(90deg, rgba(var(--profile-hero-wash-rgb), 0.78) 0%, rgba(var(--profile-hero-wash-rgb), 0.56) 54%, rgba(var(--profile-hero-wash-rgb), 0.34) 100%),
    linear-gradient(0deg, rgba(var(--profile-hero-wash-rgb), 0.36), transparent 55%);
}

.profile-identity { position: relative; z-index: 1; display: flex; min-width: 0; align-items: center; gap: 30px; }
.profile-avatar-shell {
  display: grid;
  width: 156px;
  flex: 0 0 auto;
  aspect-ratio: 1;
  overflow: hidden;
  place-items: center;
  color: rgba(var(--profile-hero-ink-rgb), 0.9);
  border: 1px solid rgba(var(--profile-hero-ink-rgb), 0.25);
  border-radius: 36px;
  background: rgba(var(--profile-hero-ink-rgb), 0.08);
  box-shadow: 0 26px 70px rgba(var(--profile-ink-rgb), 0.15);
  font-size: 50px;
  font-weight: 900;
  backdrop-filter: blur(18px);
}
.profile-avatar-shell img { width: 100%; height: 100%; object-fit: cover; }
.profile-identity-copy { min-width: 0; }
.profile-eyebrow { margin: 0 0 12px; color: rgb(var(--profile-highlight-rgb)); font-size: 9px; font-weight: 900; letter-spacing: 0.2em; }
.profile-identity-copy h1 { margin: 0; font-size: clamp(42px, 5.2vw, 72px); font-weight: 920; letter-spacing: -0.06em; line-height: 0.96; }
.profile-signature { max-width: 580px; margin: 20px 0 0; color: rgba(var(--profile-hero-ink-rgb), 0.68); font-size: 13px; font-weight: 560; line-height: 1.75; }
.profile-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
.profile-meta span { padding: 7px 11px; color: rgba(var(--profile-hero-ink-rgb), 0.72); border: 1px solid rgba(var(--profile-hero-ink-rgb), 0.13); border-radius: 999px; background: rgba(var(--profile-hero-ink-rgb), 0.055); font-size: 10px; font-weight: 720; backdrop-filter: blur(10px); }

.profile-stat-panel {
  position: relative;
  z-index: 1;
  display: grid;
  align-self: center;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid rgba(var(--profile-hero-ink-rgb), 0.14);
  border-radius: 28px;
  background: rgba(var(--profile-hero-ink-rgb), 0.065);
  box-shadow: 0 22px 60px rgba(var(--profile-ink-rgb), 0.09);
  backdrop-filter: blur(22px);
}
.profile-stat-panel article { position: relative; min-height: 122px; padding: 24px; border-right: 1px solid rgba(var(--profile-hero-ink-rgb), 0.1); border-bottom: 1px solid rgba(var(--profile-hero-ink-rgb), 0.1); }
.profile-stat-panel article:nth-child(2n) { border-right: 0; }
.profile-stat-panel article:nth-child(n+3) { border-bottom: 0; }
.profile-stat-panel article > span { position: absolute; top: 15px; right: 16px; color: rgba(var(--profile-hero-ink-rgb), 0.34); font-size: 9px; font-weight: 800; }
.profile-stat-panel strong { display: block; margin-top: 18px; font-size: 30px; font-weight: 860; letter-spacing: -0.04em; }
.profile-stat-panel small { display: block; margin-top: 7px; color: rgba(var(--profile-hero-ink-rgb), 0.52); font-size: 10px; font-weight: 750; letter-spacing: 0.08em; }

.profile-tabs {
  position: relative;
  z-index: 1;
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(3, 1fr);
  margin: 0 -62px;
  border-top: 1px solid rgba(var(--profile-hero-ink-rgb), 0.12);
  background: rgba(var(--profile-hero-ink-rgb), 0.055);
  backdrop-filter: blur(16px);
}
.profile-tabs button { position: relative; display: grid; min-height: 108px; grid-template-columns: auto 1fr; grid-template-rows: auto auto; align-content: center; gap: 4px 14px; padding: 20px 32px; cursor: pointer; text-align: left; color: rgba(var(--profile-hero-ink-rgb), 0.5); border: 0; border-right: 1px solid rgba(var(--profile-hero-ink-rgb), 0.1); background: transparent; font: inherit; transition: color 180ms ease, background 180ms ease; }
.profile-tabs button:last-child { border-right: 0; }
.profile-tabs button::after { position: absolute; right: 28px; bottom: 0; left: 28px; height: 3px; border-radius: 999px 999px 0 0; background: rgb(var(--profile-highlight-rgb)); content: ""; opacity: 0; transform: scaleX(0.45); transition: opacity 180ms ease, transform 240ms ease; }
.profile-tabs button:hover { color: rgba(var(--profile-hero-ink-rgb), 0.82); background: rgba(var(--profile-hero-ink-rgb), 0.04); }
.profile-tabs button.is-active { color: rgb(var(--profile-hero-ink-rgb)); background: rgba(var(--profile-hero-ink-rgb), 0.07); }
.profile-tabs button.is-active::after { opacity: 1; transform: scaleX(1); }
.profile-tabs button > span { grid-row: 1 / 3; align-self: center; color: rgb(var(--profile-highlight-rgb)); font-size: 9px; font-weight: 900; letter-spacing: 0.1em; }
.profile-tabs strong { font-size: 13px; font-weight: 800; }
.profile-tabs small { color: rgba(var(--profile-hero-ink-rgb), 0.4); font-size: 9px; font-weight: 650; }

.profile-content { position: relative; z-index: 2; width: min(100%, 1240px); margin: 42px auto 0; }
.profile-workspace { padding: 38px; border: 1px solid rgba(var(--profile-primary-rgb), 0.08); border-radius: 32px; background: rgba(255, 255, 255, 0.68); box-shadow: 0 24px 70px rgba(var(--profile-deep-rgb), 0.07); backdrop-filter: blur(24px); transition: border-color 520ms ease, box-shadow 520ms ease; }
.profile-section-heading { display: flex; align-items: end; justify-content: space-between; gap: 28px; margin-bottom: 36px; padding-bottom: 25px; border-bottom: 1px solid rgba(45, 41, 37, 0.075); }
.profile-section-heading p { margin: 0 0 8px; color: rgb(var(--profile-primary-rgb)); font-size: 9px; font-weight: 900; letter-spacing: 0.18em; }
.profile-section-heading h2 { margin: 0; color: #292724; font-size: clamp(27px, 3vw, 38px); font-weight: 900; letter-spacing: -0.045em; }
.profile-section-heading div > span { display: block; margin-top: 8px; color: #8f8983; font-size: 12px; font-weight: 570; }
.profile-section-heading > strong { flex: none; color: #8e8882; font-size: 11px; font-weight: 750; }
.profile-section-action { display: inline-flex; height: 38px; align-items: center; gap: 7px; padding: 0 16px; cursor: pointer; color: rgb(var(--profile-hero-ink-rgb)); border: 1px solid rgba(var(--profile-hero-ink-rgb), 0.1); border-radius: 999px; background: rgb(var(--profile-deep-rgb)); font: inherit; font-size: 11px; font-weight: 760; transition: transform 180ms ease, filter 180ms ease; }
.profile-section-action:hover { filter: brightness(0.8); transform: translateY(-1px); }
.profile-state { display: grid; min-height: 112px; margin: 0; place-items: center; color: #9a948e; border: 1px dashed rgba(48, 43, 39, 0.12); border-radius: 20px; background: rgba(249, 248, 246, 0.72); font-size: 12px; font-weight: 700; }
.profile-state-error { min-height: auto; padding: 16px 18px; place-items: start; color: #b34f55; border-style: solid; border-color: rgba(179, 79, 85, 0.15); background: rgba(251, 234, 233, 0.72); }

.profile-shelf + .profile-shelf { margin-top: 54px; padding-top: 34px; border-top: 1px solid rgba(45, 41, 37, 0.07); }
.profile-shelf h3 { display: flex; align-items: center; gap: 11px; margin: 0 0 22px; color: #59544f; font-size: 11px; font-weight: 850; letter-spacing: 0.08em; }
.profile-shelf h3 span { color: rgb(var(--profile-primary-rgb)); font-size: 9px; }
.profile-playlist-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 28px 20px; }
.profile-playlist-card { min-width: 0; cursor: pointer; }
.profile-playlist-cover { position: relative; display: block; aspect-ratio: 1; overflow: hidden; border: 1px solid rgba(41, 37, 33, 0.06); border-radius: 22px; background: #e7e4e0; box-shadow: 0 15px 34px rgba(54, 43, 37, 0.08); transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 360ms ease; }
.profile-playlist-cover img { width: 100%; height: 100%; object-fit: cover; transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1); }
.profile-playlist-open { position: absolute; right: 12px; bottom: 12px; display: grid; width: 38px; aspect-ratio: 1; place-items: center; color: #22201e; border: 1px solid rgba(255, 255, 255, 0.72); border-radius: 50%; background: rgba(255, 255, 255, 0.9); box-shadow: 0 9px 22px rgba(0, 0, 0, 0.14); opacity: 0; transform: translateY(6px) scale(0.9); transition: opacity 180ms ease, transform 260ms ease; backdrop-filter: blur(10px); }
.profile-playlist-card:hover .profile-playlist-cover { transform: translateY(-6px); box-shadow: 0 24px 46px rgba(var(--profile-deep-rgb), 0.16); }
.profile-playlist-card:hover .profile-playlist-cover img { transform: scale(1.045); }
.profile-playlist-card:hover .profile-playlist-open { opacity: 1; transform: translateY(0) scale(1); }
.profile-playlist-title { margin: 13px 2px 0; overflow: hidden; color: #322f2c; font-size: 13px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.profile-playlist-meta { margin: 5px 2px 0; color: #a19b95; font-size: 10px; font-weight: 650; }
.profile-empty-state { display: grid; min-height: 120px; place-items: center; color: #a39d97; border: 1px dashed rgba(52, 46, 41, 0.12); border-radius: 20px; background: rgba(249, 248, 246, 0.68); font-size: 12px; font-weight: 680; }

.profile-upload-deck { position: relative; margin-bottom: 34px; padding: 42px !important; overflow: hidden; color: rgb(var(--profile-hero-ink-rgb)); border: 1px solid rgba(var(--profile-hero-ink-rgb), 0.09) !important; border-radius: 28px !important; background: radial-gradient(circle at 82% 20%, rgba(var(--profile-primary-rgb), 0.24), transparent 38%), rgb(var(--profile-deep-rgb)) !important; box-shadow: 0 22px 52px rgba(var(--profile-ink-rgb), 0.1); }
.profile-upload-deck > div:first-child { color: rgb(var(--profile-highlight-rgb)) !important; }
.profile-upload-deck > p { color: rgba(var(--profile-hero-ink-rgb), 0.54) !important; }
.profile-upload-deck > p:nth-of-type(1) { color: rgb(var(--profile-hero-ink-rgb)) !important; font-size: 18px !important; }
.profile-upload-deck label { color: rgb(var(--profile-hero-ink-rgb)) !important; background: rgba(var(--profile-primary-rgb), 0.48) !important; }
.profile-cloud-list { position: relative; overflow: hidden; border: 1px solid rgba(45, 41, 37, 0.07); border-radius: 24px; background: rgba(255, 255, 255, 0.72); }
.profile-cloud-row { padding: 14px 17px; border-bottom: 1px solid rgba(45, 41, 37, 0.055); transition: background 160ms ease; }
.profile-cloud-row:last-child { border-bottom: 0; }
.profile-cloud-row:hover { background: rgba(var(--profile-primary-rgb), 0.055); }
.profile-pagination { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 20px; }

.profile-listening .listening-gradient-stage-large { height: min(42vw, 430px); min-height: 300px; border-radius: 28px; box-shadow: 0 24px 64px rgba(40, 34, 31, 0.14); }

@media (max-width: 1040px) {
  .profile-hero { grid-template-columns: minmax(0, 1fr) 330px; gap: 34px; padding-inline: 42px; }
  .profile-tabs { margin-inline: -42px; }
  .profile-avatar-shell { width: 130px; border-radius: 30px; }
  .profile-identity-copy h1 { font-size: clamp(38px, 5vw, 56px); }
  .profile-playlist-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (max-width: 820px) {
  .profile-page { padding-inline: 16px; }
  .profile-hero { min-height: 0; grid-template-columns: 1fr; grid-template-rows: auto auto auto; gap: 30px; padding: 42px 28px 0; border-radius: 30px; }
  .profile-identity { align-items: flex-start; }
  .profile-avatar-shell { width: 112px; border-radius: 26px; }
  .profile-stat-panel { grid-template-columns: repeat(4, 1fr); }
  .profile-stat-panel article { min-height: 100px; padding: 17px; border-right: 1px solid rgba(255,255,255,.11) !important; border-bottom: 0; }
  .profile-stat-panel article:last-child { border-right: 0 !important; }
  .profile-stat-panel strong { margin-top: 20px; font-size: 23px; }
  .profile-tabs { margin-inline: -28px; }
  .profile-tabs button { padding-inline: 18px; }
  .profile-content { margin-top: 24px; }
  .profile-workspace { padding: 27px; border-radius: 26px; }
  .profile-playlist-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 600px) {
  .profile-page { padding: 10px 10px 128px; }
  .profile-utility-bar { min-height: 46px; margin-bottom: 8px; }
  .profile-wordmark small,
  .profile-sync-state span { display: none; }
  .profile-back span { display: none; }
  .profile-back { width: 38px; padding: 0; justify-content: center; }
  .profile-hero { padding: 30px 20px 0; border-radius: 26px; }
  .profile-identity { display: grid; gap: 20px; }
  .profile-avatar-shell { width: 78px; border-radius: 21px; }
  .profile-identity-copy h1 { font-size: 34px; }
  .profile-signature { margin-top: 14px; font-size: 12px; }
  .profile-meta { margin-top: 16px; }
  .profile-stat-panel { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .profile-stat-panel article { min-height: 82px; padding: 12px 9px; border-right: 1px solid rgba(255,255,255,.11) !important; border-bottom: 0; }
  .profile-stat-panel article:last-child { border-right: 0 !important; }
  .profile-stat-panel article > span { top: 9px; right: 9px; }
  .profile-stat-panel strong { margin-top: 18px; font-size: 20px; }
  .profile-stat-panel small { margin-top: 4px; font-size: 8px; }
  .profile-tabs { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-inline: -20px; overflow: hidden; }
  .profile-tabs button { min-width: 0; min-height: 82px; grid-template-columns: auto minmax(0, 1fr); gap: 4px 7px; padding: 13px 9px; }
  .profile-tabs button > span { font-size: 8px; }
  .profile-tabs strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
  .profile-tabs small { display: none; }
  .profile-content { margin-top: 14px; }
  .profile-workspace { padding: 20px 16px; border-radius: 24px; }
  .profile-section-heading { align-items: flex-start; flex-direction: column; gap: 18px; margin-bottom: 26px; }
  .profile-section-heading h2 { font-size: 28px; }
  .profile-playlist-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 25px 13px; }
  .profile-playlist-cover { border-radius: 18px; }
  .profile-playlist-open { opacity: 1; transform: none; }
  .profile-upload-deck { padding: 30px 20px !important; border-radius: 22px !important; }
  .profile-cloud-row { padding-inline: 11px; }
  .profile-listening .listening-gradient-stage-large { height: 320px; min-height: 320px; }
}

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

.cloud-row-enter-active {
  transition: opacity 180ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.cloud-row-leave-active {
  position: absolute;
  left: 4px;
  right: 4px;
  pointer-events: none;
  transition: opacity 120ms ease;
}

.cloud-row-enter-from,
.cloud-row-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.99);
}

.cloud-row-move {
  transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .cloud-row-enter-active,
  .cloud-row-leave-active,
  .cloud-row-move {
    transition-duration: 1ms !important;
  }
}

/* 2026 profile refresh — open, avatar-tinted and content-led */
.profile-page {
  min-height: 100vh;
  padding: 14px 28px calc(var(--global-player-space, 104px) + 42px);
  overflow-x: clip;
  overflow-y: visible;
  scroll-padding-bottom: calc(var(--global-player-space, 104px) + 24px);
  background:
    linear-gradient(rgba(var(--profile-surface-rgb), 0.88), rgba(249, 249, 247, 0.96)),
    radial-gradient(circle at 10% 10%, rgba(var(--profile-primary-rgb), 0.14), transparent 30%),
    radial-gradient(circle at 92% 20%, rgba(var(--profile-secondary-rgb), 0.12), transparent 34%),
    #f7f8f7;
}

.profile-ambient {
  inset: -22vh -16vw auto;
  width: 132vw;
  height: 72vh;
  aspect-ratio: auto;
  border-radius: 0;
  opacity: 0.11;
  filter: blur(130px) saturate(0.9);
  mask-image: linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0.8) 46%, transparent 100%);
}
.profile-ambient img { transform: scale(1.18); }

.profile-utility-bar {
  display: grid;
  width: min(100%, 1180px);
  min-height: 48px;
  grid-template-columns: 1fr auto 1fr;
  margin-bottom: 10px;
}
.profile-back { justify-self: start; height: 36px; color: #575b59; background: rgba(255, 255, 255, 0.58); box-shadow: none; }
.profile-back:hover { background: rgba(255, 255, 255, 0.9); }
.profile-wordmark { justify-self: center; }
.profile-wordmark i { width: 25px; border-radius: 8px; background: rgba(var(--profile-primary-rgb), 0.86); }
.profile-wordmark small { color: #aaaead; }
.profile-sync-state { justify-self: end; }

.profile-overview {
  position: relative;
  z-index: 2;
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: 42px 34px 0;
  isolation: isolate;
}
.profile-overview .profile-hero-canvas {
  inset: -40px -70px 36px;
  width: calc(100% + 140px);
  height: calc(100% + 20px);
  z-index: -2 !important;
  opacity: 0.12;
  filter: blur(18px) saturate(0.72);
  mask-image: radial-gradient(ellipse at 25% 42%, #000 0%, rgba(0, 0, 0, 0.62) 35%, transparent 76%);
}
.profile-overview .profile-hero-wash {
  inset: -40px -70px 36px;
  background: linear-gradient(90deg, rgba(var(--profile-surface-rgb), 0.48), rgba(255, 255, 255, 0.22) 58%, transparent);
}
.profile-overview-grid { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 72px; }
.profile-identity { gap: 34px; }
.profile-avatar-shell {
  width: 132px;
  border: 3px solid rgba(255, 255, 255, 0.76);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: 0 16px 46px rgba(49, 55, 53, 0.09);
  color: rgb(var(--profile-ink-rgb));
  font-size: 42px;
}
.profile-identity-copy h1 { max-width: 620px; color: #252927; font-size: clamp(38px, 4.2vw, 58px); letter-spacing: -0.055em; line-height: 1; overflow-wrap: anywhere; }
.profile-eyebrow { margin-bottom: 11px; color: rgb(var(--profile-highlight-rgb)); font-size: 10px; letter-spacing: 0.18em; }
.profile-signature { max-width: 580px; margin-top: 16px; color: #747a77; font-size: 13px; line-height: 1.7; }
.profile-meta { margin-top: 18px; gap: 9px; }
.profile-meta span { padding: 7px 11px; color: #707673; border-color: rgba(44, 51, 48, 0.08); background: rgba(255, 255, 255, 0.54); font-size: 11px; box-shadow: 0 5px 16px rgba(35, 42, 39, 0.025); }

.profile-stat-panel {
  display: flex;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}
.profile-stat-panel article { min-width: 112px; min-height: auto; padding: 12px 28px; text-align: center; border: 0; border-right: 1px solid rgba(40, 48, 44, 0.09); }
.profile-stat-panel article:last-child { border-right: 0; }
.profile-stat-panel strong { margin: 0; color: #272c29; font-size: 31px; font-weight: 820; }
.profile-stat-panel small { margin-top: 6px; color: #929794; font-size: 11px; font-weight: 660; letter-spacing: 0.04em; }

.profile-tabs {
  display: grid;
  width: min(100%, 980px);
  min-height: 58px;
  grid-template-columns: repeat(3, 1fr);
  margin: 42px auto 0;
  overflow: hidden;
  border: 1px solid rgba(45, 52, 49, 0.07);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 10px 28px rgba(44, 52, 48, 0.045);
  backdrop-filter: blur(24px);
}
.profile-tabs button { display: flex; min-height: 58px; align-items: center; justify-content: center; gap: 8px; padding: 0 20px; color: #929795; border: 0; background: transparent; text-align: center; }
.profile-tabs button::after { right: 31%; bottom: 0; left: 31%; height: 2px; background: rgb(var(--profile-primary-rgb)); }
.profile-tabs button:hover { color: #4c524f; background: rgba(var(--profile-primary-rgb), 0.035); }
.profile-tabs button.is-active { color: #272c29; background: rgba(255, 255, 255, 0.48); }
.profile-tabs strong { font-size: 12px; font-weight: 760; }
.profile-tabs small { display: inline-grid; min-width: 20px; height: 20px; place-items: center; padding: 0 6px; color: #999e9b; border-radius: 999px; background: rgba(39, 45, 42, 0.045); font-size: 9px; }

.profile-content { width: min(100%, 1180px); margin-top: 22px; }
.profile-workspace { padding: 34px 36px 40px; border-color: rgba(43, 51, 47, 0.055); border-radius: 28px; background: rgba(255, 255, 255, 0.72); box-shadow: 0 20px 54px rgba(45, 53, 49, 0.045); backdrop-filter: blur(24px); }
.profile-section-heading { margin-bottom: 30px; padding-bottom: 23px; border-color: rgba(42, 49, 46, 0.065); }
.profile-section-heading p { color: rgb(var(--profile-highlight-rgb)); font-size: 9px; }
.profile-section-heading h2 { color: #262b28; font-size: clamp(28px, 3vw, 36px); }
.profile-section-heading div > span { color: #858b88; font-size: 12px; }
.profile-section-action { color: #39403c; border-color: rgba(45, 52, 49, 0.08); background: rgba(var(--profile-primary-rgb), 0.12); }
.profile-section-action:hover { filter: brightness(0.96); }
.profile-library-counts { display: flex; align-items: center; gap: 18px; color: #929794; }
.profile-library-counts span { display: flex !important; align-items: baseline; gap: 6px; margin: 0 !important; font-size: 11px !important; }
.profile-library-counts strong { color: #303632; font-size: 21px; }
.profile-library-counts i { width: 1px; height: 22px; background: rgba(42, 49, 46, 0.08); }

.profile-shelf + .profile-shelf { margin-top: 46px; padding-top: 30px; }
.profile-shelf-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
.profile-shelf-heading > div { display: flex; align-items: center; gap: 10px; }
.profile-shelf-heading > div > span { color: rgb(var(--profile-highlight-rgb)); font-size: 9px; font-weight: 850; }
.profile-shelf-heading h3 { margin: 0; color: #4d5450; font-size: 12px; letter-spacing: 0.04em; }
.profile-shelf-heading p { margin: 0; color: #a1a6a3; font-size: 10px; }
.profile-playlist-grid { gap: 28px 22px; }
.profile-playlist-card { border-radius: 18px; outline: none; }
.profile-playlist-card:focus-visible { box-shadow: 0 0 0 3px rgba(var(--profile-primary-rgb), 0.23); }
.profile-playlist-cover { border-radius: 18px; box-shadow: 0 10px 26px rgba(43, 51, 47, 0.065); }
.profile-playlist-open { width: 36px; color: #313734; box-shadow: 0 8px 20px rgba(31, 37, 34, 0.12); }
.profile-playlist-open svg { width: 15px; height: 15px; }
.profile-playlist-card:hover .profile-playlist-cover { transform: translateY(-4px); box-shadow: 0 18px 34px rgba(42, 50, 46, 0.11); }
.profile-playlist-title { margin-top: 12px; color: #313733; font-size: 13px; }
.profile-playlist-meta { display: flex; align-items: center; gap: 7px; color: #9ba09d; font-size: 10px; }
.profile-playlist-meta span { color: #858b88; }
.profile-playlist-meta i { width: 3px; height: 3px; border-radius: 50%; background: #c8cbc9; }

.profile-upload-deck {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 22px;
  margin-bottom: 20px;
  padding: 24px 26px !important;
  color: #353b38;
  border: 1px dashed rgba(var(--profile-primary-rgb), 0.28) !important;
  border-radius: 22px !important;
  background: rgba(var(--profile-primary-rgb), 0.055) !important;
  box-shadow: none;
}
.profile-upload-icon { display: grid; width: 50px; aspect-ratio: 1; place-items: center; color: rgb(var(--profile-highlight-rgb)) !important; border-radius: 16px; background: rgba(255, 255, 255, 0.72); }
.profile-upload-icon svg { width: 22px; height: 22px; }
.profile-upload-copy { min-width: 0; }
.profile-upload-copy > span { color: rgb(var(--profile-highlight-rgb)); font-size: 8px; font-weight: 850; letter-spacing: 0.15em; }
.profile-upload-copy strong { display: block; margin-top: 5px; overflow: hidden; color: #303633; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.profile-upload-copy p { margin: 5px 0 0; color: #8d938f; font-size: 11px; line-height: 1.55; }
.profile-upload-copy .profile-upload-message { color: #448268; font-weight: 720; }
.profile-upload-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.profile-upload-select,
.profile-upload-confirm { position: relative; display: inline-flex; min-height: 38px; align-items: center; justify-content: center; padding: 0 16px; cursor: pointer; color: #37403b !important; border: 1px solid rgba(45, 52, 49, 0.08); border-radius: 999px; background: rgba(255, 255, 255, 0.8) !important; font: inherit; font-size: 11px; font-weight: 760; }
.profile-upload-confirm { background: rgba(var(--profile-primary-rgb), 0.25) !important; }
.profile-upload-input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
.profile-upload-select:focus-within { box-shadow: 0 0 0 3px rgba(var(--profile-primary-rgb), 0.2); }
.profile-cloud-summary { display: grid; grid-template-columns: repeat(3, 1fr); margin-bottom: 26px; overflow: hidden; border: 1px solid rgba(43, 50, 47, 0.055); border-radius: 18px; background: rgba(250, 251, 250, 0.72); }
.profile-cloud-summary div { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 15px 18px; border-right: 1px solid rgba(43, 50, 47, 0.055); }
.profile-cloud-summary div:last-child { border-right: 0; }
.profile-cloud-summary span { color: #989d9a; font-size: 10px; }
.profile-cloud-summary strong { color: #414844; font-size: 13px; }
.profile-cloud-table-head,
.profile-cloud-row-main { display: grid; grid-template-columns: minmax(0, 1fr) 100px 130px 90px; align-items: center; gap: 16px; }
.profile-cloud-table-head { padding: 0 18px 10px; color: #a1a6a3; font-size: 9px; font-weight: 760; letter-spacing: 0.06em; }
.profile-cloud-list { border-radius: 18px; background: rgba(255, 255, 255, 0.5); }
.profile-cloud-row { padding: 0; }
.profile-cloud-row-main { min-height: 76px; padding: 10px 16px; cursor: pointer; transition: background 180ms ease; }
.profile-cloud-row-main:hover { background: rgba(var(--profile-primary-rgb), 0.04); }
.profile-cloud-row.is-playing .profile-cloud-row-main { background: rgba(var(--profile-primary-rgb), 0.08); }
.profile-cloud-song { display: flex; min-width: 0; align-items: center; gap: 12px; }
.profile-cloud-index { width: 22px; flex: none; color: #b1b5b3; font-size: 9px; font-weight: 760; }
.profile-cloud-cover { position: relative; display: grid; width: 48px; flex: none; aspect-ratio: 1; overflow: hidden; place-items: center; color: #8e9591; border-radius: 12px; background: rgba(var(--profile-primary-rgb), 0.1); }
.profile-cloud-cover > img { width: 100%; height: 100%; object-fit: cover; }
.profile-cloud-cover > svg { width: 20px; height: 20px; }
.profile-cloud-cover > span { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; background: rgba(31, 37, 34, 0.36); opacity: 0; transition: opacity 160ms ease; }
.profile-cloud-cover > span svg { width: 16px; height: 16px; }
.profile-cloud-row-main:hover .profile-cloud-cover > span,
.profile-cloud-row.is-playing .profile-cloud-cover > span { opacity: 1; }
.profile-cloud-song-copy { min-width: 0; }
.profile-cloud-song-copy strong,
.profile-cloud-song-copy span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profile-cloud-song-copy strong { color: #343a36; font-size: 12px; }
.profile-cloud-song-copy span { margin-top: 5px; color: #979c99; font-size: 10px; }
.profile-cloud-size,
.profile-cloud-date { color: #858b88; font-size: 10px; }
.profile-cloud-actions { display: flex; justify-content: flex-end; gap: 6px; }
.profile-cloud-actions button,
.profile-pagination button { display: grid; width: 34px; aspect-ratio: 1; place-items: center; cursor: pointer; color: #727975; border: 1px solid rgba(43, 50, 47, 0.07); border-radius: 50%; background: rgba(255, 255, 255, 0.82); }
.profile-cloud-actions button:hover { color: #303632; background: #fff; }
.profile-cloud-actions button.is-danger { color: #bc6b70; }
.profile-cloud-actions button:disabled,
.profile-pagination button:disabled { cursor: not-allowed; opacity: 0.32; }
.profile-cloud-actions svg { width: 15px; height: 15px; }
.profile-cloud-detail { margin: 0 16px 12px 50px; padding: 16px 18px; border-radius: 14px; background: rgba(var(--profile-primary-rgb), 0.045); }
.profile-cloud-detail > div { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px 28px; }
.profile-cloud-detail p { min-width: 0; margin: 0; }
.profile-cloud-detail span,
.profile-cloud-detail strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profile-cloud-detail span { color: #a1a6a3; font-size: 9px; }
.profile-cloud-detail strong { margin-top: 4px; color: #535a56; font-size: 11px; }
.profile-cloud-detail-loading { color: #818784; font-size: 11px; }
.profile-cloud-empty { min-height: 150px; }
.profile-pagination { justify-content: space-between; margin-top: 18px; scroll-margin-bottom: calc(var(--global-player-space, 104px) + 18px); }
.profile-pagination > span { color: #9ca19e; font-size: 9px; font-weight: 760; letter-spacing: 0.1em; }
.profile-pagination > div { display: flex; gap: 7px; }

.listening-range-control { display: inline-flex; padding: 3px; border: 1px solid rgba(43, 50, 47, 0.06); border-radius: 999px; background: rgba(42, 49, 46, 0.035); }
.listening-range-control button { min-height: 34px; padding: 0 15px; cursor: pointer; color: #929794; border: 0; border-radius: 999px; background: transparent; font: inherit; font-size: 11px; font-weight: 720; }
.listening-range-control button.is-active { color: #343a37; background: rgba(255, 255, 255, 0.9); box-shadow: 0 5px 14px rgba(43, 50, 47, 0.06); }
.listening-dashboard { display: flex; flex-direction: column; gap: 22px; }
.listening-overview-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.75fr); gap: 18px; }
.listening-climate-card { position: relative; display: flex; min-height: 360px; overflow: hidden; align-items: flex-end; justify-content: space-between; gap: 28px; padding: 34px; border: 1px solid rgba(42, 49, 46, 0.05); border-radius: 26px; isolation: isolate; }
.listening-climate-kicker { position: absolute; top: 28px; left: 30px; color: rgba(49, 56, 52, 0.46); font-size: 9px; font-weight: 850; letter-spacing: 0.16em; }
.listening-climate-copy { position: relative; z-index: 2; max-width: 480px; }
.listening-climate-copy p { margin: 0 0 8px; color: #767d79; font-size: 11px; font-weight: 720; }
.listening-climate-copy h3 { margin: 0; color: #2d3430; font-size: clamp(38px, 5vw, 64px); font-weight: 900; letter-spacing: -0.055em; line-height: 0.98; }
.listening-climate-copy span { display: block; max-width: 440px; margin-top: 17px; color: #747b77; font-size: 12px; line-height: 1.7; }
.listening-climate-orbits { position: absolute; top: 50%; right: 18%; width: 310px; aspect-ratio: 1; pointer-events: none; transform: translate(50%, -50%); }
.listening-climate-orbits i { position: absolute; inset: 0; border: 1px solid rgba(57, 67, 61, 0.06); border-radius: 50%; }
.listening-climate-orbits i:nth-child(2) { inset: 18%; }
.listening-climate-orbits i:nth-child(3) { inset: 36%; }
.listening-stat-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); overflow: hidden; border: 1px solid rgba(42, 49, 46, 0.055); border-radius: 26px; background: rgba(250, 251, 250, 0.76); }
.listening-stat-grid article { min-height: 180px; padding: 25px 22px; border-right: 1px solid rgba(42, 49, 46, 0.055); border-bottom: 1px solid rgba(42, 49, 46, 0.055); }
.listening-stat-grid article:nth-child(2n) { border-right: 0; }
.listening-stat-grid article:nth-child(n+3) { border-bottom: 0; }
.listening-stat-grid article > span { color: #a0a5a2; font-size: 8px; font-weight: 800; letter-spacing: 0.08em; }
.listening-stat-grid strong { display: block; margin-top: 28px; color: #303632; font-size: 28px; letter-spacing: -0.04em; }
.listening-stat-grid small { display: block; margin-top: 7px; color: #969b98; font-size: 9px; }
.listening-breakdown,
.listening-track-panel,
.listening-artist-panel { border: 1px solid rgba(42, 49, 46, 0.055); border-radius: 22px; background: rgba(250, 251, 250, 0.64); }
.listening-breakdown { padding: 25px 26px; }
.listening-subheading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 21px; }
.listening-subheading span { color: rgb(var(--profile-highlight-rgb)); font-size: 8px; font-weight: 850; letter-spacing: 0.13em; }
.listening-subheading h3 { margin: 5px 0 0; color: #353b38; font-size: 17px; }
.listening-subheading p { margin: 0; color: #a0a5a2; font-size: 9px; }
.listening-preference-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 28px; }
.listening-preference-list article { display: grid; min-height: 52px; grid-template-columns: 26px 112px minmax(80px, 1fr) 48px; align-items: center; gap: 10px; }
.listening-preference-index { color: #b3b7b5; font-size: 8px; font-weight: 760; }
.listening-preference-copy { display: flex; min-width: 0; align-items: center; gap: 8px; }
.listening-preference-copy i { width: 7px; flex: none; aspect-ratio: 1; border-radius: 50%; }
.listening-preference-copy strong { overflow: hidden; color: #555c58; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.listening-preference-track { height: 5px; overflow: hidden; border-radius: 999px; background: rgba(42, 49, 46, 0.055); }
.listening-preference-track i { display: block; height: 100%; border-radius: inherit; opacity: 0.72; }
.listening-preference-percent { color: #6e7571; font-size: 10px; text-align: right; }
.listening-preference-list article.is-leading .listening-preference-copy strong,
.listening-preference-list article.is-leading .listening-preference-percent { color: #303632; }
.listening-voices-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr); gap: 18px; }
.listening-track-panel,
.listening-artist-panel { padding: 24px; }
.listening-track-list { display: flex; flex-direction: column; }
.listening-track-list button { display: grid; min-height: 62px; grid-template-columns: 26px 42px minmax(0, 1fr) auto 24px; align-items: center; gap: 11px; padding: 8px 7px; cursor: pointer; color: inherit; border: 0; border-top: 1px solid rgba(42, 49, 46, 0.05); background: transparent; text-align: left; }
.listening-track-list button:hover { background: rgba(var(--profile-primary-rgb), 0.04); }
.listening-track-index { color: #b0b4b2; font-size: 8px; }
.listening-track-cover { display: grid; width: 42px; aspect-ratio: 1; overflow: hidden; place-items: center; border-radius: 10px; background: rgba(var(--profile-primary-rgb), 0.1); }
.listening-track-cover img { width: 100%; height: 100%; object-fit: cover; }
.listening-track-cover i { color: #6f7772; font-size: 12px; font-style: normal; font-weight: 800; }
.listening-track-copy { min-width: 0; }
.listening-track-copy strong,
.listening-track-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.listening-track-copy strong { color: #3d443f; font-size: 11px; }
.listening-track-copy small { margin-top: 4px; color: #989d9a; font-size: 9px; }
.listening-track-count { color: #969b98; font-size: 9px; }
.listening-track-list button > svg { width: 13px; height: 13px; color: #6f7772; }
.listening-artist-panel ol { margin: 0; padding: 0; list-style: none; }
.listening-artist-panel li { display: grid; min-height: 62px; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 12px; border-top: 1px solid rgba(42, 49, 46, 0.05); }
.listening-artist-panel li > span { display: grid; width: 36px; aspect-ratio: 1; place-items: center; color: #57605b; border-radius: 50%; background: rgba(var(--profile-primary-rgb), 0.1); font-size: 11px; font-weight: 800; }
.listening-artist-panel li strong,
.listening-artist-panel li small { display: block; }
.listening-artist-panel li strong { color: #3d443f; font-size: 11px; }
.listening-artist-panel li small { margin-top: 4px; color: #9a9f9c; font-size: 9px; }
.listening-artist-panel li > i { color: #b0b4b2; font-size: 8px; font-style: normal; }
.listening-empty-state { display: grid; min-height: 330px; place-content: center; padding: 32px; text-align: center; border: 1px dashed rgba(var(--profile-primary-rgb), 0.2); border-radius: 24px; background: rgba(var(--profile-primary-rgb), 0.035); }
.listening-empty-state span { color: rgb(var(--profile-highlight-rgb)); font-size: 8px; font-weight: 850; letter-spacing: 0.16em; }
.listening-empty-state h3 { margin: 12px 0 0; color: #373e3a; font-size: 21px; }
.listening-empty-state p { margin: 9px 0 0; color: #8f9591; font-size: 11px; }

.profile-page button:focus-visible,
.profile-page [role="button"]:focus-visible,
.profile-page label:focus-within { outline: 2px solid rgba(var(--profile-primary-rgb), 0.58); outline-offset: 3px; }

@media (max-width: 1040px) {
  .profile-overview-grid { gap: 38px; }
  .profile-stat-panel article { min-width: 90px; padding-inline: 18px; }
  .profile-playlist-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .listening-overview-grid,
  .listening-voices-grid { grid-template-columns: 1fr; }
  .listening-stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .listening-stat-grid article { min-height: 118px; border-right: 1px solid rgba(42, 49, 46, 0.055); border-bottom: 0; }
  .listening-stat-grid article:last-child { border-right: 0; }
  .listening-stat-grid strong { margin-top: 18px; }
}

@media (max-width: 820px) {
  .profile-page { padding-inline: 16px; }
  .profile-overview { padding: 32px 18px 0; }
  .profile-overview-grid { grid-template-columns: 1fr; gap: 28px; }
  .profile-stat-panel { justify-content: flex-start; }
  .profile-avatar-shell { width: 112px; }
  .profile-tabs { margin-top: 30px; }
  .profile-workspace { padding: 28px 26px 34px; }
  .profile-playlist-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .profile-cloud-table-head,
  .profile-cloud-row-main { grid-template-columns: minmax(0, 1fr) 86px 78px; }
  .profile-cloud-table-head span:nth-child(3),
  .profile-cloud-date { display: none; }
  .listening-preference-list { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .profile-page { padding: 8px 10px calc(var(--global-player-space, 104px) + 24px); }
  .profile-utility-bar { min-height: 42px; margin-bottom: 0; }
  .profile-wordmark small { display: none; }
  .profile-sync-state { font-size: 0; }
  .profile-sync-state i { display: block; }
  .profile-back { width: 36px; padding: 0; justify-content: center; }
  .profile-back span { display: none; }
  .profile-overview { padding: 27px 10px 0; }
  .profile-identity { display: grid; gap: 18px; }
  .profile-avatar-shell { width: 86px; }
  .profile-identity-copy h1 { font-size: 36px; }
  .profile-signature { font-size: 12px; }
  .profile-stat-panel { width: 100%; }
  .profile-stat-panel article { min-width: 0; flex: 1; padding: 8px 10px; }
  .profile-stat-panel strong { font-size: 24px; }
  .profile-tabs { width: 100%; min-height: 50px; margin-top: 26px; border-radius: 15px; }
  .profile-tabs button { min-height: 50px; padding: 0 8px; }
  .profile-tabs strong { font-size: 11px; }
  .profile-tabs small { display: none; }
  .profile-content { margin-top: 12px; }
  .profile-workspace { padding: 22px 16px 28px; border-radius: 22px; }
  .profile-section-heading { align-items: flex-start; flex-direction: column; gap: 16px; margin-bottom: 24px; }
  .profile-section-heading h2 { font-size: 28px; }
  .profile-library-counts { width: 100%; justify-content: flex-start; }
  .profile-shelf-heading { align-items: flex-start; flex-direction: column; gap: 5px; }
  .profile-playlist-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 13px; }
  .profile-playlist-open { right: 9px; bottom: 9px; width: 32px; opacity: 1; transform: none; }
  .profile-upload-deck { grid-template-columns: auto minmax(0, 1fr); padding: 20px !important; }
  .profile-upload-actions { grid-column: 1 / -1; justify-content: stretch; }
  .profile-upload-select,
  .profile-upload-confirm { flex: 1; }
  .profile-cloud-summary { grid-template-columns: 1fr; }
  .profile-cloud-summary div { border-right: 0; border-bottom: 1px solid rgba(43, 50, 47, 0.055); }
  .profile-cloud-summary div:last-child { border-bottom: 0; }
  .profile-cloud-table-head { display: none; }
  .profile-cloud-row-main { grid-template-columns: minmax(0, 1fr) auto; gap: 10px; padding-inline: 10px; }
  .profile-cloud-size,
  .profile-cloud-date { display: none; }
  .profile-cloud-actions button { width: 36px; }
  .profile-cloud-detail { margin-left: 10px; }
  .profile-cloud-detail > div { grid-template-columns: 1fr; }
  .listening-range-control { width: 100%; }
  .listening-range-control button { flex: 1; }
  .listening-climate-card { min-height: 390px; align-items: flex-start; flex-direction: column; justify-content: flex-end; padding: 26px 22px; }
  .listening-climate-kicker { top: 22px; left: 22px; }
  .listening-climate-copy h3 { font-size: 42px; }
  .listening-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .listening-stat-grid article { min-height: 126px; border-bottom: 1px solid rgba(42, 49, 46, 0.055); }
  .listening-stat-grid article:nth-child(2n) { border-right: 0; }
  .listening-stat-grid article:nth-child(n+3) { border-bottom: 0; }
  .listening-breakdown,
  .listening-track-panel,
  .listening-artist-panel { padding: 20px 16px; }
  .listening-subheading { align-items: flex-start; flex-direction: column; gap: 8px; }
  .listening-preference-list article { grid-template-columns: 22px 100px minmax(55px, 1fr) 42px; gap: 6px; }
  .listening-track-list button { grid-template-columns: 20px 38px minmax(0, 1fr) 18px; gap: 8px; }
  .listening-track-count { display: none; }
  .listening-track-cover { width: 38px; }
}

@media (prefers-reduced-motion: reduce) {
  .profile-page *,
  .profile-page *::before,
  .profile-page *::after { scroll-behavior: auto !important; animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: 1ms !important; }
}
</style>
