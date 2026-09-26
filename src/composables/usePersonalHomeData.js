import {computed, onScopeDispose, reactive, ref} from 'vue'
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
    meta: source?.artist?.name || source?.creator?.nickname || source?.dj?.nickname || (type === 'album' ? '最近听过的专辑' : '最近听过的歌单'),
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
  const sections = {dailySongs, dailyPlaylists, personalFmSongs, recentSongs, stylePreferences}
  const collectionParts = reactive({playlist: [], album: []})
  const loading = reactive({dailySongs: true, dailyPlaylists: true, personalFmSongs: true, recentSongs: true, scene: ''})
  const errors = reactive({})
  const error = computed(() => Object.values(errors).filter(Boolean).join('；'))
  let loadToken = 0
  let activeCacheKey = ''
  let sceneToken = 0

  function updateCollections() {
    recentCollections.value = [...collectionParts.playlist, ...collectionParts.album].slice(0, 6)
  }

  function saveCache() {
    if (!activeCacheKey) return
    try {
      sessionStorage.setItem(activeCacheKey, JSON.stringify({
        savedAt: Date.now(),
        sections: Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.value])),
        collections: collectionParts,
      }))
    } catch { /* Recommendations remain usable when session storage is unavailable. */ }
  }

  async function loadPersonalHome(isLoggedIn, userId = '') {
    const token = ++loadToken
    sceneToken += 1
    loading.scene = ''
    const cacheKey = isLoggedIn
      ? (userId ? `aurora-home-v1:user:${userId}` : '')
      : 'aurora-home-v1:guest'
    if (cacheKey !== activeCacheKey || !cacheKey) {
      Object.values(sections).forEach(section => { section.value = [] })
      collectionParts.playlist = []
      collectionParts.album = []
      activeCacheKey = cacheKey
      try {
        const cached = cacheKey ? JSON.parse(sessionStorage.getItem(cacheKey) || 'null') : null
        if (cached && Date.now() - cached.savedAt < 6 * 60 * 60 * 1000) {
          Object.entries(sections).forEach(([key, section]) => {
            if (Array.isArray(cached.sections?.[key])) section.value = cached.sections[key]
          })
          for (const kind of ['playlist', 'album']) {
            if (Array.isArray(cached.collections?.[kind])) collectionParts[kind] = cached.collections[kind]
          }
        }
      } catch { /* Ignore stale or malformed cache entries. */ }
      updateCollections()
    }
    Object.keys(errors).forEach(key => { delete errors[key] })

    async function loadSection(key, request, normalize, label, fallback) {
      loading[key] = true
      try {
        let list
        let usedFallback = false
        try {
          list = normalize(await request())
        } catch (requestError) {
          if (token !== loadToken) return
          if (!fallback || sections[key]?.value.length) throw requestError
          usedFallback = true
          list = normalize(await fallback())
        }
        if (token !== loadToken) return
        if (!list.length && fallback && !usedFallback && !sections[key]?.value.length) {
          list = normalize(await fallback())
        }
        if (token !== loadToken) return
        if (sections[key]) {
          // An empty recommendation response must not erase an already usable cache.
          if (list.length || !fallback) sections[key].value = list
        } else {
          collectionParts[key] = list
          updateCollections()
        }
        saveCache()
      } catch {
        if (token === loadToken) errors[key] = `${label}暂时无法更新`
      } finally {
        if (token === loadToken) loading[key] = false
      }
    }

    const guestSongs = () => personalHomeApi.getGuestSongs(12)
    const guestPlaylists = () => personalHomeApi.getGuestPlaylists(6)
    const tasks = [
      loadSection('dailySongs', isLoggedIn ? () => personalHomeApi.getDailySongs() : guestSongs, extractSongs, '每日歌曲', isLoggedIn ? guestSongs : undefined),
      loadSection('dailyPlaylists', isLoggedIn ? () => personalHomeApi.getDailyPlaylists() : guestPlaylists, extractPlaylists, '推荐歌单', isLoggedIn ? guestPlaylists : undefined),
    ]
    if (isLoggedIn) {
      tasks.push(
        loadSection('personalFmSongs', () => personalHomeApi.getPersonalFm(), extractSongs, '私人频率'),
        loadSection('recentSongs', () => personalHomeApi.getRecent('song', 12), extractSongs, '播放记录'),
        loadSection('stylePreferences', () => personalHomeApi.getStylePreference(), extractStylePreferences, '曲风偏好'),
        ...['playlist', 'album'].map(kind => loadSection(kind, () => personalHomeApi.getRecent(kind, 4), response => {
          const body = responseBody(response)
          return firstArray(body?.data?.list, body?.data, body?.list)
            .map(item => normalizeRecentCollection(item, kind)).filter(item => item.id && item.cover)
        }, kind === 'playlist' ? '最近歌单' : '最近专辑')),
      )
    } else {
      loading.personalFmSongs = false
      loading.recentSongs = false
    }
    // Each task commits as soon as it finishes; no shared render gate.
    await Promise.allSettled(tasks)
  }

  async function loadSceneSongs(scene) {
    if (!scene?.mode) return []
    const token = ++sceneToken
    delete errors.scene
    loading.scene = scene.id
    try {
      const response = await personalHomeApi.getPersonalFmMode(scene.mode, scene.submode || '')
      if (token !== sceneToken) return []
      const list = extractSongs(response)
      return list.length ? list : personalFmSongs.value
    } catch {
      if (token === sceneToken) errors.scene = '场景推荐暂时无法加载，请稍后重试'
      return []
    } finally {
      if (token === sceneToken) loading.scene = ''
    }
  }

  onScopeDispose(() => { loadToken += 1; sceneToken += 1 })

  return {
    dailySongs,
    dailyPlaylists,
    personalFmSongs,
    recentSongs,
    recentCollections,
    stylePreferences,
    loading,
    errors,
    error,
    loadPersonalHome,
    loadSceneSongs,
  }
}
