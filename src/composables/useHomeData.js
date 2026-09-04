import {ref} from 'vue'
import {playListsApi} from '@/api/playListsApi/playListsApi.js'
import {songsApi} from '@/api/songsApi/songsApi.js'
import {artistApi} from '@/api/artistApi/artistApi.js'
import {homeIndexApi} from '@/api/home/homeIndexApi.js'
import {toBackendMediaUrl} from '@/utils/backendMedia.js'

export function useHomeData(userStore) {
  const hero = ref({media: '', title: '', subtitle: ''})
  const releaseNotes = ref([])
  const recommendPlaylists = ref([])
  const topPlaylists = ref([])
  const newSongs = ref([])
  const recentListenSongs = ref([])
  const topRanks = ref([])
  const podcastPrograms = ref([])
  const hotArtists = ref([])

  const playlistTags = ['全部', '华语', '欧美', '流行', '电子']
  const activePlaylistTag = ref('全部')

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
    mv: '',
  })

  function normalizeSongItem(item) {
    const song = item?.data || item?.song || item || {}
    const album = song?.al || song?.album || {}
    return {
      ...song,
      id: song?.id || item?.id || null,
      name: song?.name || item?.name || '未知歌曲',
      ar: song?.ar || song?.artists || item?.artists || [],
      artists: song?.artists || song?.ar || item?.artists || [],
      al: song?.al || song?.album || album,
      album: song?.album || song?.al || album,
      cover: song?.cover || item?.picUrl || album?.picUrl || song?.picUrl || item?.cover || '',
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
      title: item?.typeTitle || item?.title || '',
      subtitle: subtitleFromList || item?.copywriter || item?.description || '',
    }
  }

  function normalizeReleaseNoteItem(item, index = 0) {
    const timeSource = item?.createdAt || item?.updatedAt || item?.time || item?.date || 0
    const timestamp = Number.isFinite(Number(timeSource)) ? Number(timeSource) : Date.parse(String(timeSource || ''))
    const title = item?.title || item?.name || `更新 ${index + 1}`
    const highlights = Array.isArray(item?.highlights) ? item.highlights.filter(Boolean) : []
    const bugFixes = Array.isArray(item?.bugFixes) ? item.bugFixes.filter(Boolean) : []
    const knownIssues = Array.isArray(item?.knownIssues) ? item.knownIssues.filter(Boolean) : []
    return {
      id: item?.id || `${title}-${index}`,
      title,
      content: item?.content || item?.description || item?.body || '',
      version: item?.version || item?.tag || item?.release || '',
      highlights,
      bugFixes,
      knownIssues,
      dateText: Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp).toLocaleDateString() : '-',
    }
  }

  async function loadHomeBanner() {
    loading.value.banner = true
    errors.value.banner = ''
    try {
      const res = await homeIndexApi.getBanner()
      const raw = res?.banners || res?.data?.banners || res?.data?.data?.banners || res?.data?.data || res?.data || res || []
      const list = Array.isArray(raw) ? raw.map(normalizeBannerItem) : []
      const firstUsable = list.find((item) => String(item?.media || '').trim()) || list[0]
      if (firstUsable) hero.value = {...hero.value, ...firstUsable}
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
      const res = await homeIndexApi.getReleaseNotes()
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
    loading.value.recommend = true
    errors.value.recommend = ''
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
      errors.value.top = '精选歌单加载失败'
    } finally {
      loading.value.top = false
    }
  }

  function changePlaylistTag(tag) {
    if (activePlaylistTag.value === tag) return
    activePlaylistTag.value = tag
    void loadTopPlaylists(tag)
  }

  async function loadNewSongs() {
    loading.value.songs = true
    errors.value.songs = ''
    try {
      const res = await songsApi.getNewSongs()
      const list = Array.isArray(res?.data?.result) ? res.data.result : []
      newSongs.value = list.map(normalizeSongItem).filter((item) => item.id)
    } catch {
      errors.value.songs = '新音乐加载失败'
    } finally {
      loading.value.songs = false
    }
  }

  async function loadRecentListenSongs() {
    if (!userStore.isLoggedIn) {
      loading.value.recent = false
      errors.value.recent = ''
      recentListenSongs.value = []
      return
    }

    loading.value.recent = true
    errors.value.recent = ''
    try {
      const res = await songsApi.getRecentListenList(12)
      const list = res?.data?.data?.list || res?.data?.list || res?.data?.data || []
      recentListenSongs.value = Array.isArray(list) ? list.map(normalizeSongItem).filter((item) => item.id) : []
    } catch {
      errors.value.recent = '最近听歌加载失败'
      recentListenSongs.value = []
    } finally {
      loading.value.recent = false
    }
  }

  async function loadTopRanks() {
    loading.value.rank = true
    errors.value.rank = ''
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
    loading.value.podcast = true
    errors.value.podcast = ''
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
    loading.value.artist = true
    errors.value.artist = ''
    try {
      const res = await artistApi.getHotArtist()
      hotArtists.value = res?.data?.artists || []
    } catch {
      errors.value.artist = '热门艺人加载失败'
    } finally {
      loading.value.artist = false
    }
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
  }
}
