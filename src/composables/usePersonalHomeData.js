import {reactive, ref} from 'vue'
import {personalHomeApi} from '@/api/personalHomeApi.js'

function responseBody(response) {
  return response?.data || {}
}

function firstArray(...values) {
  return values.find(Array.isArray) || []
}

function normalizeSong(item) {
  const source = item?.data || item?.song || item?.track || item || {}
  const album = source?.al || source?.album || {}
  const artists = source?.ar || source?.artists || []
  const id = Number(source?.id || item?.id || 0)
  return {
    ...source,
    id,
    name: source?.name || item?.name || '未知歌曲',
    ar: artists,
    artists,
    al: source?.al || source?.album || album,
    album: source?.album || source?.al || album,
    cover: source?.cover || album?.picUrl || item?.picUrl || item?.cover || '',
    playedAt: Number(item?.playTime || item?.playedAt || 0),
  }
}

function normalizePlaylist(item) {
  const source = item?.data || item?.playlist || item || {}
  return {
    ...source,
    id: Number(source?.id || item?.id || 0),
    name: source?.name || item?.name || '未命名歌单',
    picUrl: source?.picUrl || source?.coverImgUrl || source?.cover || item?.picUrl || '',
    coverImgUrl: source?.coverImgUrl || source?.picUrl || source?.cover || item?.coverImgUrl || '',
    trackCount: Number(source?.trackCount || source?.songCount || 0),
  }
}

function extractSongs(response) {
  const body = responseBody(response)
  const list = firstArray(
    body?.data?.dailySongs,
    body?.data?.recommend,
    body?.data?.list,
    body?.dailySongs,
    body?.recommend,
    body?.result,
    body?.data,
  )
  return list.map(normalizeSong).filter(item => item.id)
}

function extractPlaylists(response) {
  const body = responseBody(response)
  const list = firstArray(body?.data?.recommend, body?.recommend, body?.result, body?.data?.list, body?.data)
  return list.map(normalizePlaylist).filter(item => item.id)
}

function extractStylePreferences(response) {
  const body = responseBody(response)
  const list = firstArray(
    body?.data?.tagPreferenceVos,
    body?.data?.tags,
    body?.data?.stylePreference,
    body?.tagPreferenceVos,
    body?.tags,
    body?.data,
  )
  return list
    .map(item => ({
      id: Number(item?.tagId || item?.id || 0),
      name: item?.tagName || item?.name || '',
      enName: item?.enName || '',
      score: Number(item?.ratio || item?.score || item?.preference || 0),
    }))
    .filter(item => item.id && item.name)
}

function normalizeRecentCollection(item, type) {
  const source = item?.data || item?.resource || item || {}
  const cover = source?.coverImgUrl || source?.picUrl || source?.coverUrl || source?.cover || ''
  return {
    id: Number(source?.id || source?.radio?.id || item?.id || 0),
    type,
    name: source?.name || source?.radio?.name || item?.name || '最近浏览',
    cover,
    meta: source?.artist?.name || source?.creator?.nickname || source?.dj?.nickname || (type === 'album' ? '最近听过的专辑' : '最近打开'),
    raw: source,
  }
}

export function usePersonalHomeData() {
  const dailySongs = ref([])
  const dailyPlaylists = ref([])
  const personalFmSongs = ref([])
  const recentSongs = ref([])
  const recentCollections = ref([])
  const stylePreferences = ref([])
  const loading = reactive({page: true, scene: ''})
  const error = ref('')
  let loadToken = 0

  async function loadGuestFallback() {
    const [songsResult, playlistResult] = await Promise.allSettled([
      personalHomeApi.getGuestSongs(12),
      personalHomeApi.getGuestPlaylists(6),
    ])
    if (!dailySongs.value.length && songsResult.status === 'fulfilled') dailySongs.value = extractSongs(songsResult.value)
    if (!dailyPlaylists.value.length && playlistResult.status === 'fulfilled') dailyPlaylists.value = extractPlaylists(playlistResult.value)
  }

  async function loadPersonalHome(isLoggedIn) {
    const token = ++loadToken
    loading.page = true
    error.value = ''
    dailySongs.value = []
    dailyPlaylists.value = []
    personalFmSongs.value = []
    recentSongs.value = []
    recentCollections.value = []
    stylePreferences.value = []

    try {
      if (!isLoggedIn) {
        await loadGuestFallback()
        return
      }

      const [dailyResult, playlistResult, fmResult, recentSongResult, recentPlaylistResult, recentAlbumResult, preferenceResult] = await Promise.allSettled([
        personalHomeApi.getDailySongs(),
        personalHomeApi.getDailyPlaylists(),
        personalHomeApi.getPersonalFm(),
        personalHomeApi.getRecent('song', 12),
        personalHomeApi.getRecent('playlist', 4),
        personalHomeApi.getRecent('album', 4),
        personalHomeApi.getStylePreference(),
      ])
      if (token !== loadToken) return

      if (dailyResult.status === 'fulfilled') dailySongs.value = extractSongs(dailyResult.value)
      if (playlistResult.status === 'fulfilled') dailyPlaylists.value = extractPlaylists(playlistResult.value)
      if (fmResult.status === 'fulfilled') personalFmSongs.value = extractSongs(fmResult.value)
      if (recentSongResult.status === 'fulfilled') recentSongs.value = extractSongs(recentSongResult.value)
      if (preferenceResult.status === 'fulfilled') stylePreferences.value = extractStylePreferences(preferenceResult.value)

      const collections = []
      if (recentPlaylistResult.status === 'fulfilled') {
        const body = responseBody(recentPlaylistResult.value)
        firstArray(body?.data?.list, body?.data, body?.list).forEach(item => collections.push(normalizeRecentCollection(item, 'playlist')))
      }
      if (recentAlbumResult.status === 'fulfilled') {
        const body = responseBody(recentAlbumResult.value)
        firstArray(body?.data?.list, body?.data, body?.list).forEach(item => collections.push(normalizeRecentCollection(item, 'album')))
      }
      recentCollections.value = collections.filter(item => item.id && item.cover).slice(0, 6)

      if (!dailySongs.value.length || !dailyPlaylists.value.length) await loadGuestFallback()
    } catch (loadError) {
      if (token !== loadToken) return
      error.value = loadError?.message || '个人推荐加载失败'
      await loadGuestFallback()
    } finally {
      if (token === loadToken) loading.page = false
    }
  }

  async function loadSceneSongs(scene) {
    if (!scene?.mode) return []
    loading.scene = scene.id
    try {
      const response = await personalHomeApi.getPersonalFmMode(scene.mode, scene.submode || '')
      const list = extractSongs(response)
      return list.length ? list : personalFmSongs.value
    } finally {
      loading.scene = ''
    }
  }

  return {
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
  }
}
