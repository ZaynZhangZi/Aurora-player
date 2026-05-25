import { computed, ref } from 'vue'
import { playListsApi } from '@/api/playListsApi/playListsApi.js'
import { songsApi } from '@/api/songsApi/songsApi.js'
import { artistApi } from '@/api/artistApi/artistApi.js'
import { homeIndexApi } from '@/api/home/homeIndexApi.js'
import { toBackendMediaUrl } from '@/utils/backendMedia.js'

export function useHomeData(userStore) {
  const hero = ref({ media: '', title: '', subtitle: '' })
  const releaseNotes = ref([])
  const recommendPlaylists = ref([])
  const topPlaylists = ref([])
  const newSongs = ref([])
  const recentListenSongs = ref([])
  const topRanks = ref([])
  const podcastPrograms = ref([])
  const hotArtists = ref([])
  const highQualityPlaylists = ref([])

  const playlistTags = ['全部', '华语', '欧美', '流行', '电子']
  const activePlaylistTag = ref('全部')

  const RECENT_PAGE_SIZE = 12
  const recentCurrentPage = ref(1)
  const recentTotalPages = computed(() => {
    const total = recentListenSongs.value.length
    return Math.max(1, Math.ceil(total / RECENT_PAGE_SIZE))
  })
  const recentPageStartIndex = computed(() => (recentCurrentPage.value - 1) * RECENT_PAGE_SIZE)
  const pagedRecentListenSongs = computed(() => {
    const start = recentPageStartIndex.value
    return recentListenSongs.value.slice(start, start + RECENT_PAGE_SIZE)
  })

  const loading = ref({
    banner: true,
    releaseNotes: true,
    recommend: true,
    top: true,
    songs: true,
    recent: true,
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
    recent: '',
    rank: '',
    podcast: '',
    artist: '',
    hq: '',
    mv: '',
  })

  function normalizeRecentSongItem(item) {
    const song = item?.data || item?.song || item || {}
    const album = song?.al || song?.album || {}
    return {
      ...song,
      id: song?.id || item?.id || null,
      name: song?.name || item?.name || '未知歌曲',
      ar: song?.ar || song?.artists || item?.artists || [],
      artists: song?.artists || song?.ar || item?.artists || [],
      al: album,
      cover: song?.cover || album?.picUrl || song?.picUrl || item?.cover || item?.picUrl || '',
    }
  }

  function normalizeBannerItem(item, index = 0) {
    const srcList = Array.isArray(item?.src) ? item.src : []
    const contentList = Array.isArray(item?.content) ? item.content : []
    const media = toBackendMediaUrl(srcList[0] || item?.pic || item?.imageUrl || item?.cover || item?.coverUrl || '')
    const subtitleFromList = contentList.map((entry) => String(entry || '').trim()).filter(Boolean).join(' · ')
    return {
      id: item?.targetId || item?.bannerId || item?.id || `banner-${index}`,
      media,
      mediaType: item?.mediaType || '',
      title: item?.typeTitle || item?.title || 'Now Playing',
      subtitle: subtitleFromList || item?.copywriter || item?.description || hero.value.subtitle,
    }
  }

  function normalizeReleaseNoteItem(item, index = 0) {
    const timeSource = item?.createdAt || item?.updatedAt || item?.time || item?.date || 0
    const ts = Number.isFinite(Number(timeSource)) ? Number(timeSource) : Date.parse(String(timeSource || ''))
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

  async function loadHomeBanner() {
    loading.value.banner = true
    errors.value.banner = ''
    try {
      const res = await homeIndexApi.getBanner()
      const raw = res?.banners || res?.data?.banners || res?.data?.data?.banners || res?.data?.data || res?.data || res || []
      const list = Array.isArray(raw) ? raw.map(normalizeBannerItem) : []
      if (list.length) {
        const firstUsable = list.find((item) => String(item?.media || '').trim()) || list[0]
        hero.value = { ...hero.value, ...firstUsable }
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
      const res = await homeIndexApi.getReleaseNotes({ limit: 6 })
      const raw = res?.list || res?.data?.list || res?.data?.data?.list || res?.data?.data || res?.data || res || []
      releaseNotes.value = Array.isArray(raw) ? raw.map(normalizeReleaseNoteItem) : []
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
    } catch {
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
    } catch {
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
    } catch {
      errors.value.songs = '新音乐加载失败'
    } finally {
      loading.value.songs = false
    }
  }

  async function loadRecentListenSongs() {
    if (!userStore.isLoggedIn) {
      loading.value.recent = false
      errors.value.recent = '请先登录账号查看最近听歌'
      recentListenSongs.value = []
      recentCurrentPage.value = 1
      return
    }

    loading.value.recent = true
    errors.value.recent = ''
    try {
      const res = await songsApi.getRecentListenList(12)
      const list = res?.data?.data?.list || res?.data?.list || res?.data?.data || []
      recentListenSongs.value = Array.isArray(list)
        ? list.map(normalizeRecentSongItem).filter((item) => item?.id)
        : []
      recentCurrentPage.value = 1
    } catch {
      errors.value.recent = '最近听歌加载失败，请先登录账号'
      recentListenSongs.value = []
    } finally {
      loading.value.recent = false
    }
  }

  async function loadTopRanks() {
    try {
      const res = await songsApi.getTopListDetail()
      const list = res?.data?.list || []
      topRanks.value = list.filter((item) => item?.id && item?.coverImgUrl).slice(0, 6)
    } catch {
      errors.value.rank = '榜单加载失败'
    } finally {
      loading.value.rank = false
    }
  }

  async function loadPodcastPrograms() {
    try {
      const res = await songsApi.getPodcastPrograms(6)
      podcastPrograms.value = res?.data?.result || []
    } catch {
      errors.value.podcast = '播客加载失败'
    } finally {
      loading.value.podcast = false
    }
  }

  async function loadHotArtists() {
    try {
      const res = await artistApi.getHotArtist()
      hotArtists.value = res?.data?.artists || []
    } catch {
      errors.value.artist = '热门歌手加载失败'
    } finally {
      loading.value.artist = false
    }
  }

  async function loadHighQualityPlaylists() {
    try {
      const res = await songsApi.getHighQualitySongs()
      highQualityPlaylists.value = res?.data?.playlists || []
    } catch {
      errors.value.hq = '高品质歌单加载失败'
    } finally {
      loading.value.hq = false
    }
  }

  function goRecentPage(page) {
    const next = Math.min(recentTotalPages.value, Math.max(1, Number(page) || 1))
    recentCurrentPage.value = next
  }

  function asList(value) {
    return Array.isArray(value) ? value : []
  }

  function formatPodcastDuration(durationMs) {
    const total = Math.floor((durationMs || 0) / 1000)
    const minute = Math.floor(total / 60)
    const second = String(total % 60).padStart(2, '0')
    return `${minute}:${second}`
  }

  return {
    hero,
    releaseNotes,
    recommendPlaylists,
    topPlaylists,
    newSongs,
    recentListenSongs,
    topRanks,
    podcastPrograms,
    hotArtists,
    highQualityPlaylists,
    playlistTags,
    activePlaylistTag,
    recentCurrentPage,
    recentTotalPages,
    recentPageStartIndex,
    pagedRecentListenSongs,
    loading,
    errors,
    asList,
    goRecentPage,
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
    loadHighQualityPlaylists,
  }
}
