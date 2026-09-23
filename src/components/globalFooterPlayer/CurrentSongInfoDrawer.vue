<template>
  <Teleport to="body">
    <Transition name="song-info-drawer">
      <div
        v-if="open"
        class="song-info-layer"
        role="presentation"
        @click.self="emit('close')"
      >
        <section
          ref="panelRef"
          class="song-info-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="song-info-title"
        >
          <span class="song-info-handle" aria-hidden="true" />

          <header class="song-info-hero">
            <div class="song-info-cover-shell">
              <img
                v-if="displayCover"
                :src="displayCover"
                :alt="`${displayName}封面`"
                class="song-info-cover"
              >
              <span v-else class="song-info-cover-fallback" aria-hidden="true">
                {{ displayName.slice(0, 1) || 'A' }}
              </span>
              <span class="song-info-cover-ring" aria-hidden="true" />
            </div>

            <div class="song-info-heading">
              <p class="song-info-kicker">NOW PLAYING · SONG FILE</p>
              <h2 id="song-info-title">{{ displayName }}</h2>
              <p class="song-info-artists"><ArtistLinks :artists="displayArtistList" /></p>
              <div class="song-info-meta">
                <span v-if="albumName">{{ albumName }}</span>
                <span v-if="releaseYear">{{ releaseYear }}</span>
                <span v-if="qualityItems.length">{{ qualityItems[0].label }}</span>
              </div>
            </div>

            <button
              ref="closeButtonRef"
              class="song-info-close"
              type="button"
              aria-label="关闭歌曲信息"
              @click="emit('close')"
            >
              <XMarkIcon />
            </button>
          </header>

          <nav class="song-info-tabs" role="tablist" aria-label="歌曲信息分类">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.id"
              :class="{ 'is-active': activeTab === tab.id }"
              @click="selectTab(tab.id)"
            >
              {{ tab.label }}
              <span v-if="tab.id === 'comments' && commentTotal">{{ compactNumber(commentTotal) }}</span>
              <span v-else-if="tab.id === 'similar' && similarSongs.length">{{ similarSongs.length }}</span>
            </button>
          </nav>

          <div class="song-info-content">
            <template v-if="activeTab === 'overview'">
              <div v-if="loading.overview" class="song-info-loading" aria-label="正在加载歌曲信息">
                <span v-for="index in 4" :key="index" />
              </div>

              <template v-else>
                <section class="song-info-section song-info-story">
                  <div class="song-info-section-title">
                    <div>
                      <p>ABOUT THE TRACK</p>
                      <h3>关于这首歌</h3>
                    </div>
                    <SparklesIcon aria-hidden="true" />
                  </div>

                  <div v-if="wikiFacts.length" class="song-info-facts">
                    <p v-for="(fact, index) in wikiFacts" :key="`${fact}-${index}`">{{ fact }}</p>
                  </div>
                  <p v-else class="song-info-empty-copy">
                    暂时没有可展示的百科资料。仍可从专辑、艺人和相似歌曲继续探索。
                  </p>

                  <p v-if="aliasText" class="song-info-alias">别名 · {{ aliasText }}</p>
                </section>

                <section class="song-info-section">
                  <div class="song-info-section-title">
                    <div>
                      <p>AVAILABLE QUALITY</p>
                      <h3>可用音质</h3>
                    </div>
                    <SignalIcon aria-hidden="true" />
                  </div>

                  <div v-if="qualityItems.length" class="song-info-quality-grid">
                    <article v-for="quality in qualityItems" :key="quality.level">
                      <strong>{{ quality.label }}</strong>
                      <span>{{ quality.detail }}</span>
                      <small v-if="quality.codec">{{ quality.codec }}</small>
                    </article>
                  </div>
                  <p v-else class="song-info-empty-copy">该歌曲暂未返回完整的音质档案。</p>
                  <p class="song-info-quality-note">这里展示歌曲具备的音质，不代表当前账号拥有全部播放权限。</p>
                </section>
              </template>
            </template>

            <template v-else-if="activeTab === 'comments'">
              <div v-if="loading.comments" class="song-info-loading" aria-label="正在加载评论">
                <span v-for="index in 5" :key="index" />
              </div>

              <div v-else-if="errors.comments" class="song-info-state">
                <ChatBubbleLeftEllipsisIcon aria-hidden="true" />
                <h3>评论暂时没有加载出来</h3>
                <p>{{ errors.comments }}</p>
                <button type="button" @click="loadComments(currentSongId, loadVersion)">重新加载</button>
              </div>

              <div v-else-if="comments.length" class="song-info-comments">
                <article v-for="comment in comments" :key="comment.id" class="song-info-comment">
                  <img v-if="comment.user.avatar" :src="comment.user.avatar" alt="" class="song-info-avatar">
                  <span v-else class="song-info-avatar song-info-avatar-fallback">{{ comment.user.name.slice(0, 1) }}</span>
                  <div>
                    <div class="song-info-comment-meta">
                      <strong>{{ comment.user.name }}</strong>
                      <span v-if="comment.isHot">热评</span>
                      <time>{{ comment.timeText }}</time>
                    </div>
                    <p>{{ comment.content }}</p>
                    <footer>
                      <span v-if="comment.location">{{ comment.location }}</span>
                      <span v-if="comment.likedCount">♡ {{ compactNumber(comment.likedCount) }}</span>
                    </footer>
                  </div>
                </article>
              </div>

              <div v-else class="song-info-state">
                <ChatBubbleLeftEllipsisIcon aria-hidden="true" />
                <h3>还没有可展示的评论</h3>
                <p>换一首歌看看，或稍后再回来。</p>
              </div>
            </template>

            <template v-else>
              <div v-if="loading.similar" class="song-info-loading" aria-label="正在加载相似歌曲">
                <span v-for="index in 6" :key="index" />
              </div>

              <div v-else-if="errors.similar" class="song-info-state">
                <MusicalNoteIcon aria-hidden="true" />
                <h3>相似歌曲暂时不可用</h3>
                <p>{{ errors.similar }}</p>
                <button type="button" @click="loadSimilarSongs(currentSongId, loadVersion)">重新加载</button>
              </div>

              <div v-else-if="similarSongs.length" class="song-info-similar-list">
                <button
                  v-for="(item, index) in similarSongs"
                  :key="item.id"
                  type="button"
                  class="song-info-similar-row"
                  @click="playSimilarSong(item, index)"
                >
                  <img v-if="item.cover" :src="item.cover" alt="" loading="lazy">
                  <span v-else class="song-info-similar-fallback">{{ item.name.slice(0, 1) }}</span>
                  <span class="song-info-similar-copy">
                    <strong>{{ item.name }}</strong>
                    <small><ArtistLinks :artists="item.artists || item.artistText" /></small>
                  </span>
                  <span class="song-info-play-mark" aria-hidden="true"><PlayIcon /></span>
                </button>
              </div>

              <div v-else class="song-info-state">
                <MusicalNoteIcon aria-hidden="true" />
                <h3>暂时没有找到相似歌曲</h3>
                <p>这首歌可能太特别了。</p>
              </div>
            </template>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import {
  ChatBubbleLeftEllipsisIcon,
  MusicalNoteIcon,
  SignalIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import {PlayIcon} from '@heroicons/vue/24/solid'
import {computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue'
import {songsApi} from '@/api/songsApi/songsApi.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'

const props = defineProps({
  open: Boolean,
  song: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['close'])

const tabs = [
  {id: 'overview', label: '歌曲档案'},
  {id: 'comments', label: '评论'},
  {id: 'similar', label: '相似歌曲'},
]

const qualitySpecs = [
  {level: 'jymaster', label: '超清母带', keys: ['jymaster', 'jm', 'jmMusic', 'master']},
  {level: 'dolby', label: '杜比全景声', keys: ['dolby', 'db', 'dbMusic']},
  {level: 'sky', label: '沉浸环绕声', keys: ['sky', 'sk', 'skMusic']},
  {level: 'jyeffect', label: '高清环绕声', keys: ['jyeffect', 'je', 'jMusic', 'effect']},
  {level: 'hires', label: 'Hi-Res', keys: ['hires', 'hr', 'hrMusic']},
  {level: 'lossless', label: '无损', keys: ['lossless', 'sq', 'sqMusic']},
  {level: 'exhigh', label: '极高', keys: ['exhigh', 'h', 'hMusic']},
  {level: 'higher', label: '较高', keys: ['higher', 'm', 'mMusic']},
  {level: 'standard', label: '标准', keys: ['standard', 'l', 'lMusic']},
]

const panelRef = ref(null)
const closeButtonRef = ref(null)
const activeTab = ref('overview')
const detail = ref(null)
const wikiFacts = ref([])
const qualityItems = ref([])
const comments = ref([])
const commentTotal = ref(0)
const similarSongs = ref([])
const loading = reactive({overview: false, comments: false, similar: false})
const errors = reactive({overview: '', comments: '', similar: ''})
const loadedFor = reactive({overview: '', comments: '', similar: ''})

let loadVersion = 0
let previousFocusedElement = null
let previousBodyOverflow = ''
let pageLockActive = false

const currentSongId = computed(() => String(props.song?.id || ''))
const displayName = computed(() => detail.value?.name || props.song?.name || '未知歌曲')
const displayCover = computed(() => (
  detail.value?.al?.picUrl ||
  detail.value?.album?.picUrl ||
  props.song?.cover ||
  props.song?.al?.picUrl ||
  ''
))
const displayArtistList = computed(() => (
  [detail.value?.ar, detail.value?.artists, props.song?.artists, props.song?.ar]
    .find(items => Array.isArray(items) && items.length)
  || props.song?.artistName
  || ''
))
const albumName = computed(() => detail.value?.al?.name || detail.value?.album?.name || '')
const aliasText = computed(() => {
  const aliases = detail.value?.alia || detail.value?.alias || []
  return Array.isArray(aliases) ? aliases.filter(Boolean).join(' / ') : String(aliases || '')
})
const releaseYear = computed(() => {
  const timestamp = Number(detail.value?.publishTime || detail.value?.album?.publishTime || 0)
  if (!timestamp) return ''
  const year = new Date(timestamp).getFullYear()
  return Number.isFinite(year) ? String(year) : ''
})

function responseBody(response) {
  return response?.data ?? response ?? {}
}

function responsePayload(response) {
  const body = responseBody(response)
  return body?.data ?? body
}

function firstArray(...candidates) {
  return candidates.find(Array.isArray) || []
}

function compactNumber(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0'
  if (number >= 10000) return `${(number / 10000).toFixed(number >= 100000 ? 0 : 1)}万`
  return String(number)
}

function formatBytes(value) {
  const bytes = Number(value || 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`
}

function normalizeWikiFacts(response) {
  const root = responsePayload(response)
  const facts = []
  const seen = new Set()

  function collect(node, depth = 0) {
    if (facts.length >= 5 || depth > 8 || node == null) return
    if (typeof node === 'string') {
      const text = node.replace(/\s+/g, ' ').trim()
      if (
        text.length >= 10 &&
        text.length <= 240 &&
        !/^https?:\/\//i.test(text) &&
        !/^\d+$/.test(text) &&
        text !== '音乐百科' &&
        !seen.has(text)
      ) {
        seen.add(text)
        facts.push(text)
      }
      return
    }
    if (Array.isArray(node)) {
      node.forEach(item => collect(item, depth + 1))
      return
    }
    if (typeof node !== 'object') return

    const preferredKeys = ['description', 'desc', 'content', 'text', 'labelTexts', 'subTitle', 'mainTitle']
    for (const key of preferredKeys) {
      if (key in node) collect(node[key], depth + 1)
    }
    for (const [key, value] of Object.entries(node)) {
      if (preferredKeys.includes(key) || /url|image|pic|icon|id|code|action/i.test(key)) continue
      collect(value, depth + 1)
      if (facts.length >= 5) break
    }
  }

  collect(root)
  return facts
}

function findQualitySource(root, keys) {
  const containers = [root, root?.song, root?.music, root?.audio, root?.quality, root?.privilege].filter(Boolean)
  for (const container of containers) {
    for (const key of keys) {
      if (container?.[key] && typeof container[key] === 'object') return container[key]
    }
  }
  return null
}

function normalizeQualities(response) {
  const root = responsePayload(response)
  return qualitySpecs.flatMap(spec => {
    const item = findQualitySource(root, spec.keys)
    if (!item) return []
    const bitrate = Number(item.br ?? item.bitrate ?? 0)
    const size = Number(item.size ?? item.fileSize ?? 0)
    const sampleRate = Number(item.sr ?? item.sampleRate ?? 0)
    if (bitrate <= 0 && size <= 0 && sampleRate <= 0) return []
    const details = []
    if (bitrate > 0) details.push(`${Math.round(bitrate / 1000)} kbps`)
    if (sampleRate > 0) details.push(`${(sampleRate / 1000).toFixed(sampleRate % 1000 ? 1 : 0)} kHz`)
    if (size > 0) details.push(formatBytes(size))
    return [{
      level: spec.level,
      label: spec.label,
      detail: details.join(' · '),
      codec: String(item.encodeType || item.codec || item.type || '').toUpperCase(),
    }]
  })
}

function normalizeComments(response) {
  const body = responseBody(response)
  const payload = responsePayload(response)
  const hot = firstArray(body.hotComments, payload.hotComments, payload.hot, payload.topComments)
  const regular = firstArray(body.comments, payload.comments, payload.commentList)
  const seen = new Set()

  const list = [...hot.map(item => ({...item, __isHot: true})), ...regular]
    .filter(item => {
      const id = String(item?.commentId || item?.id || '')
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
    .slice(0, 8)
    .map(item => {
      const timestamp = Number(item?.time || 0)
      const fallbackTime = timestamp
        ? new Intl.DateTimeFormat('zh-CN', {month: 'numeric', day: 'numeric'}).format(new Date(timestamp))
        : ''
      return {
        id: item.commentId || item.id,
        content: String(item.content || '').trim(),
        isHot: Boolean(item.__isHot),
        likedCount: Number(item.likedCount ?? item.likedCnt ?? 0),
        timeText: String(item.timeStr || fallbackTime),
        location: String(item.ipLocation?.location || item.ipLocation?.ipLocation || ''),
        user: {
          id: item.user?.userId || item.user?.id || '',
          name: String(item.user?.nickname || item.user?.name || '网易云用户'),
          avatar: String(item.user?.avatarUrl || item.user?.avatar || ''),
        },
      }
    })

  return {
    list,
    total: Number(body.total ?? payload.total ?? payload.totalCount ?? payload.commentCount ?? list.length),
  }
}

function normalizeSimilarSongs(response) {
  const body = responseBody(response)
  const payload = responsePayload(response)
  const list = firstArray(body.songs, payload.songs, payload.result?.songs, payload.list)

  return list.slice(0, 10).map(song => {
    const artists = song?.artists || song?.ar || []
    const album = song?.album || song?.al || {}
    const rawDuration = Number(song?.dt ?? song?.duration ?? 0)
    const durationMs = rawDuration > 10000 ? rawDuration : rawDuration * 1000
    return {
      ...song,
      id: song?.id,
      name: String(song?.name || '未知歌曲'),
      artists,
      ar: artists,
      album,
      al: album,
      cover: String(song?.cover || album?.picUrl || song?.picUrl || ''),
      dt: durationMs,
      duration: durationMs > 0 ? durationMs / 1000 : 0,
      artistText: artists.map(item => item?.name || item).filter(Boolean).join(' / ') || '未知艺人',
    }
  }).filter(item => item.id)
}

function resetSongData() {
  detail.value = null
  wikiFacts.value = []
  qualityItems.value = []
  comments.value = []
  commentTotal.value = 0
  similarSongs.value = []
  for (const key of Object.keys(errors)) errors[key] = ''
  for (const key of Object.keys(loadedFor)) loadedFor[key] = ''
}

async function loadOverview(songId, version) {
  if (!songId || loadedFor.overview === songId) return
  loading.overview = true
  errors.overview = ''

  const [detailResult, wikiResult, qualityResult] = await Promise.allSettled([
    songsApi.getSongDetail(songId),
    songsApi.getSongWikiSummary(songId),
    songsApi.getSongMusicDetail(songId),
  ])

  if (version !== loadVersion || songId !== currentSongId.value) return
  if (detailResult.status === 'fulfilled') {
    detail.value = detailResult.value?.data?.songs?.[0] || null
  }
  if (wikiResult.status === 'fulfilled') wikiFacts.value = normalizeWikiFacts(wikiResult.value)
  if (qualityResult.status === 'fulfilled') qualityItems.value = normalizeQualities(qualityResult.value)
  if ([detailResult, wikiResult, qualityResult].every(result => result.status === 'rejected')) {
    errors.overview = '歌曲档案暂时不可用'
  }
  loadedFor.overview = songId
  loading.overview = false
}

async function loadComments(songId, version) {
  if (!songId || (loadedFor.comments === songId && !errors.comments)) return
  loading.comments = true
  errors.comments = ''
  try {
    const response = await songsApi.getSongComments(songId, {limit: 12})
    if (version !== loadVersion || songId !== currentSongId.value) return
    const normalized = normalizeComments(response)
    comments.value = normalized.list
    commentTotal.value = normalized.total
    loadedFor.comments = songId
  } catch {
    if (version !== loadVersion || songId !== currentSongId.value) return
    errors.comments = '网易云没有返回这首歌的评论，请稍后重试。'
  } finally {
    if (version === loadVersion && songId === currentSongId.value) loading.comments = false
  }
}

async function loadSimilarSongs(songId, version) {
  if (!songId || (loadedFor.similar === songId && !errors.similar)) return
  loading.similar = true
  errors.similar = ''
  try {
    const response = await songsApi.getSimilarSongs(songId, {limit: 10})
    if (version !== loadVersion || songId !== currentSongId.value) return
    similarSongs.value = normalizeSimilarSongs(response)
    loadedFor.similar = songId
  } catch {
    if (version !== loadVersion || songId !== currentSongId.value) return
    errors.similar = '相似歌曲推荐暂时不可用，请稍后重试。'
  } finally {
    if (version === loadVersion && songId === currentSongId.value) loading.similar = false
  }
}

function ensureActiveTabLoaded() {
  const songId = currentSongId.value
  if (!songId) return
  if (activeTab.value === 'comments') void loadComments(songId, loadVersion)
  if (activeTab.value === 'similar') void loadSimilarSongs(songId, loadVersion)
}

function selectTab(tabId) {
  activeTab.value = tabId
  ensureActiveTabLoaded()
}

async function playSimilarSong(song, index) {
  await playSongWithQueue(song, similarSongs.value, index)
}

function focusableElements() {
  return Array.from(panelRef.value?.querySelectorAll(
    'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ) || []).filter(element => element.offsetParent !== null)
}

function handleKeydown(event) {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (event.key !== 'Tab') return
  const focusable = focusableElements()
  if (!focusable.length) {
    event.preventDefault()
    panelRef.value?.focus()
    return
  }
  const first = focusable[0]
  const last = focusable.at(-1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function lockPage() {
  if (pageLockActive || typeof document === 'undefined') return
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  pageLockActive = true
}

function unlockPage({restoreFocus = true} = {}) {
  if (pageLockActive && typeof document !== 'undefined') {
    document.body.style.overflow = previousBodyOverflow
    pageLockActive = false
  }
  if (restoreFocus) {
    const target = previousFocusedElement
    previousFocusedElement = null
    nextTick(() => target?.focus?.())
  }
}

watch(
  () => [props.open, currentSongId.value],
  (next, previous = []) => {
    const [opened, songId] = next
    const [, previousSongId] = previous
    if (!opened || !songId) return
    if (songId !== previousSongId || !loadedFor.overview) {
      loadVersion += 1
      resetSongData()
      void loadOverview(songId, loadVersion)
      ensureActiveTabLoaded()
    }
  },
  {immediate: true},
)

watch(
  () => props.open,
  (opened) => {
    if (opened) {
      previousFocusedElement = document.activeElement
      lockPage()
      nextTick(() => closeButtonRef.value?.focus())
      return
    }
    unlockPage()
  },
)

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  unlockPage({restoreFocus: false})
})
</script>

<style scoped>
.song-info-layer {
  position: fixed;
  inset: 0 0 var(--global-player-space, 92px);
  z-index: 1004;
  display: flex;
  justify-content: flex-end;
  padding: 14px;
  background: rgba(35, 31, 29, 0.16);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.song-info-panel {
  position: relative;
  display: grid;
  width: min(520px, 100%);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  grid-template-rows: auto auto minmax(0, 1fr);
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 32px;
  background: rgba(247, 245, 241, 0.98);
  box-shadow: 0 34px 100px rgba(37, 31, 28, 0.22);
  color: #292522;
  outline: none;
}

.song-info-handle { display: none; }

.song-info-hero {
  position: relative;
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) 34px;
  gap: 16px;
  align-items: center;
  padding: 22px 22px 19px;
  border-bottom: 1px solid rgba(57, 49, 45, 0.065);
  background:
    radial-gradient(circle at 12% 12%, rgba(226, 104, 115, 0.1), transparent 30%),
    rgba(255, 255, 255, 0.68);
}

.song-info-cover-shell { position: relative; width: 78px; height: 78px; }
.song-info-cover,
.song-info-cover-fallback { display: grid; width: 72px; height: 72px; place-items: center; object-fit: cover; border-radius: 22px; box-shadow: 0 14px 32px rgba(46, 38, 34, 0.18); }
.song-info-cover-fallback { color: #fff; background: linear-gradient(145deg, #2d2926, #a35d63); font-size: 25px; font-weight: 900; }
.song-info-cover-ring { position: absolute; right: 0; bottom: 0; width: 20px; height: 20px; border: 4px solid #f9f7f3; border-radius: 50%; background: #e65f6d; box-shadow: 0 4px 12px rgba(230, 95, 109, 0.36); }
.song-info-heading { min-width: 0; }
.song-info-kicker { margin: 0 0 6px; color: #dd5967; font-size: 8.5px; font-weight: 900; letter-spacing: 0.16em; }
.song-info-heading h2 { overflow: hidden; margin: 0; color: #25211f; font-size: clamp(20px, 2vw, 27px); font-weight: 900; letter-spacing: -0.045em; line-height: 1.12; text-overflow: ellipsis; white-space: nowrap; }
.song-info-artists { overflow: hidden; margin: 6px 0 0; color: #766e69; font-size: 12px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.song-info-meta { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
.song-info-meta span { padding: 4px 7px; color: #716964; border: 1px solid rgba(56, 48, 44, 0.07); border-radius: 999px; background: rgba(255, 255, 255, 0.72); font-size: 9px; font-weight: 750; }
.song-info-close { display: grid; width: 34px; height: 34px; place-items: center; align-self: start; cursor: pointer; color: #716a65; border: 1px solid rgba(48, 42, 38, 0.06); border-radius: 50%; background: rgba(255, 255, 255, 0.72); transition: color 180ms ease, background 180ms ease, transform 180ms ease; }
.song-info-close:hover { color: #272321; background: #fff; }
.song-info-close:active { transform: scale(0.93); }
.song-info-close svg { width: 18px; height: 18px; }

.song-info-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 8px; border-bottom: 1px solid rgba(57, 49, 45, 0.055); background: rgba(255, 255, 255, 0.5); }
.song-info-tabs button { position: relative; display: flex; min-width: 0; align-items: center; justify-content: center; gap: 6px; padding: 9px 8px; cursor: pointer; color: #948b85; border: 0; border-radius: 13px; background: transparent; font-size: 11px; font-weight: 800; transition: color 180ms ease, background 180ms ease, box-shadow 180ms ease; }
.song-info-tabs button span { min-width: 18px; padding: 2px 5px; color: inherit; border-radius: 999px; background: rgba(57, 49, 45, 0.06); font-size: 8px; }
.song-info-tabs button.is-active { color: #2d2825; background: #fff; box-shadow: 0 6px 18px rgba(45, 38, 34, 0.07); }

.song-info-content { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 18px; }
.song-info-section { padding: 19px; border: 1px solid rgba(57, 49, 45, 0.055); border-radius: 23px; background: rgba(255, 255, 255, 0.76); box-shadow: 0 12px 32px rgba(55, 45, 40, 0.045); }
.song-info-section + .song-info-section { margin-top: 12px; }
.song-info-story { background: linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(245, 239, 233, 0.82)); }
.song-info-section-title { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.song-info-section-title p { margin: 0 0 5px; color: #dd5967; font-size: 8px; font-weight: 900; letter-spacing: 0.16em; }
.song-info-section-title h3 { margin: 0; color: #2e2926; font-size: 17px; font-weight: 880; letter-spacing: -0.025em; }
.song-info-section-title svg { width: 21px; height: 21px; color: #c9b7aa; }
.song-info-facts { display: grid; gap: 8px; margin-top: 16px; }
.song-info-facts p { margin: 0; padding-left: 12px; color: #706762; border-left: 2px solid rgba(222, 89, 103, 0.27); font-size: 12px; line-height: 1.65; }
.song-info-empty-copy { margin: 15px 0 0; color: #9a918b; font-size: 12px; line-height: 1.65; }
.song-info-alias { margin: 14px 0 0; color: #ae7d82; font-size: 10px; font-weight: 750; }
.song-info-quality-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 15px; }
.song-info-quality-grid article { display: grid; gap: 3px; min-width: 0; padding: 12px; border: 1px solid rgba(55, 46, 41, 0.05); border-radius: 16px; background: #f8f6f2; }
.song-info-quality-grid strong { color: #3a3430; font-size: 11px; font-weight: 850; }
.song-info-quality-grid span { overflow: hidden; color: #928984; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.song-info-quality-grid small { color: #d25d6a; font-size: 8px; font-weight: 900; letter-spacing: 0.1em; }
.song-info-quality-note { margin: 12px 0 0; color: #aaa19b; font-size: 9px; line-height: 1.5; }

.song-info-loading { display: grid; gap: 10px; }
.song-info-loading span { display: block; height: 74px; border-radius: 20px; background: linear-gradient(100deg, rgba(255,255,255,0.55) 20%, rgba(232,226,221,0.8) 38%, rgba(255,255,255,0.55) 56%); background-size: 220% 100%; animation: song-info-shimmer 1.35s linear infinite; }
.song-info-state { display: grid; min-height: 280px; place-items: center; align-content: center; text-align: center; }
.song-info-state > svg { width: 34px; height: 34px; color: #d6c3b7; }
.song-info-state h3 { margin: 15px 0 0; color: #423b37; font-size: 16px; font-weight: 850; }
.song-info-state p { max-width: 290px; margin: 7px 0 0; color: #9d948e; font-size: 11px; line-height: 1.6; }
.song-info-state button { margin-top: 15px; padding: 8px 13px; cursor: pointer; color: #fff; border: 0; border-radius: 999px; background: #342f2c; font-size: 10px; font-weight: 800; }

.song-info-comments { display: grid; gap: 10px; }
.song-info-comment { display: grid; grid-template-columns: 38px minmax(0, 1fr); gap: 11px; padding: 15px; border: 1px solid rgba(57, 49, 45, 0.05); border-radius: 20px; background: rgba(255, 255, 255, 0.78); }
.song-info-avatar { display: grid; width: 38px; height: 38px; place-items: center; object-fit: cover; border-radius: 50%; }
.song-info-avatar-fallback { color: #fff; background: #b7988f; font-size: 13px; font-weight: 800; }
.song-info-comment-meta { display: flex; min-width: 0; align-items: center; gap: 6px; }
.song-info-comment-meta strong { overflow: hidden; color: #504843; font-size: 10px; font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
.song-info-comment-meta span { padding: 2px 5px; color: #cf5563; border-radius: 999px; background: rgba(222, 89, 103, 0.1); font-size: 7px; font-weight: 900; }
.song-info-comment-meta time { margin-left: auto; color: #b0a7a1; font-size: 8px; white-space: nowrap; }
.song-info-comment > div > p { margin: 7px 0 0; color: #69605b; font-size: 11px; line-height: 1.65; white-space: pre-wrap; }
.song-info-comment footer { display: flex; justify-content: space-between; gap: 10px; margin-top: 8px; color: #b0a7a1; font-size: 8px; }

.song-info-similar-list { display: grid; gap: 7px; }
.song-info-similar-row { display: grid; grid-template-columns: 48px minmax(0, 1fr) 34px; gap: 11px; align-items: center; width: 100%; padding: 8px 10px 8px 8px; cursor: pointer; color: inherit; border: 1px solid transparent; border-radius: 17px; background: rgba(255, 255, 255, 0.62); text-align: left; transition: border-color 180ms ease, background 180ms ease, transform 220ms cubic-bezier(.22,1,.36,1); }
.song-info-similar-row:hover { border-color: rgba(222, 89, 103, 0.13); background: #fff; transform: translateX(-2px); }
.song-info-similar-row > img,
.song-info-similar-fallback { display: grid; width: 48px; height: 48px; place-items: center; object-fit: cover; color: #fff; border-radius: 14px; background: #9a8179; font-size: 14px; font-weight: 850; }
.song-info-similar-copy { display: grid; min-width: 0; gap: 4px; }
.song-info-similar-copy strong,
.song-info-similar-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.song-info-similar-copy strong { color: #3f3935; font-size: 12px; font-weight: 850; }
.song-info-similar-copy small { color: #9c938d; font-size: 9px; }
.song-info-play-mark { display: grid; width: 32px; height: 32px; place-items: center; color: #fff; border-radius: 50%; background: #e06471; opacity: 0; transform: scale(0.84); transition: opacity 180ms ease, transform 240ms cubic-bezier(.22,1.3,.36,1); }
.song-info-play-mark svg { width: 13px; height: 13px; }
.song-info-similar-row:hover .song-info-play-mark,
.song-info-similar-row:focus-visible .song-info-play-mark { opacity: 1; transform: scale(1); }

.song-info-drawer-enter-active,
.song-info-drawer-leave-active { transition: opacity 210ms ease; }
.song-info-drawer-enter-active .song-info-panel,
.song-info-drawer-leave-active .song-info-panel { transition: transform 430ms cubic-bezier(.22,1,.36,1); }
.song-info-drawer-enter-from,
.song-info-drawer-leave-to { opacity: 0; }
.song-info-drawer-enter-from .song-info-panel,
.song-info-drawer-leave-to .song-info-panel { transform: translateX(38px); }

@keyframes song-info-shimmer { to { background-position-x: -220%; } }

@media (max-width: 720px) {
  .song-info-layer { align-items: flex-end; padding: 0; background: rgba(35, 31, 29, 0.2); }
  .song-info-panel { width: 100%; height: min(76dvh, 720px); border-radius: 28px 28px 0 0; }
  .song-info-handle { position: absolute; top: 8px; left: 50%; z-index: 2; display: block; width: 36px; height: 4px; border-radius: 999px; background: rgba(64, 55, 50, 0.18); transform: translateX(-50%); }
  .song-info-hero { grid-template-columns: 64px minmax(0, 1fr) 32px; gap: 12px; padding: 22px 16px 15px; }
  .song-info-cover-shell { width: 64px; height: 64px; }
  .song-info-cover,
  .song-info-cover-fallback { width: 60px; height: 60px; border-radius: 18px; }
  .song-info-cover-ring { width: 17px; height: 17px; }
  .song-info-heading h2 { font-size: 20px; }
  .song-info-meta span:nth-child(n+3) { display: none; }
  .song-info-tabs { padding: 7px; }
  .song-info-tabs button { padding: 8px 5px; font-size: 10px; }
  .song-info-content { padding: 13px; }
  .song-info-section { padding: 16px; border-radius: 20px; }
  .song-info-quality-grid { grid-template-columns: 1fr; }
  .song-info-drawer-enter-from .song-info-panel,
  .song-info-drawer-leave-to .song-info-panel { transform: translateY(38px); }
}

@media (prefers-reduced-motion: reduce) {
  .song-info-drawer-enter-active,
  .song-info-drawer-leave-active,
  .song-info-drawer-enter-active .song-info-panel,
  .song-info-drawer-leave-active .song-info-panel { transition-duration: 1ms; }
  .song-info-loading span { animation: none; }
}
</style>
