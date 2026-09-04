import {reactive, ref} from 'vue'
import {discoverApi} from '@/api/discoverApi.js'

function uniqueById(items) {
  const map = new Map()
  items.forEach(item => {
    if (item?.id && !map.has(String(item.id))) map.set(String(item.id), item)
  })
  return [...map.values()]
}

function normalizeAlbum(item) {
  return {
    ...item,
    id: Number(item?.id || 0),
    name: item?.name || '未命名专辑',
    picUrl: item?.picUrl || item?.blurPicUrl || '',
    artistName: item?.artist?.name || item?.artists?.map(artist => artist?.name).filter(Boolean).join(' / ') || '未知艺人',
    publishTime: Number(item?.publishTime || 0),
  }
}

function normalizePlaylist(item) {
  return {
    ...item,
    id: Number(item?.id || 0),
    name: item?.name || '未命名歌单',
    picUrl: item?.picUrl || item?.coverImgUrl || item?.cover || '',
    coverImgUrl: item?.coverImgUrl || item?.picUrl || item?.cover || '',
    trackCount: Number(item?.trackCount || item?.songCount || 0),
  }
}

export function useDiscoverData() {
  const styles = ref([])
  const selectedStyle = ref(null)
  const styleSongs = ref([])
  const styleAlbums = ref([])
  const stylePlaylists = ref([])
  const styleArtists = ref([])
  const newAlbums = ref([])
  const charts = ref([])
  const artists = ref([])
  const artistHasMore = ref(false)
  const djCategories = ref([])
  const radios = ref([])
  const radioHasMore = ref(false)
  const programs = ref([])
  const loading = reactive({styles: false, style: false, albums: false, charts: false, artists: false, radio: false})
  const errors = reactive({styles: '', style: '', albums: '', charts: '', artists: '', radio: ''})
  let styleToken = 0

  async function loadStyles() {
    loading.styles = true
    errors.styles = ''
    try {
      const response = await discoverApi.getStyles()
      styles.value = Array.isArray(response?.data?.data) ? response.data.data : []
      return styles.value
    } catch (error) {
      errors.styles = error?.message || '曲风地图加载失败'
      return []
    } finally {
      loading.styles = false
    }
  }

  async function loadStyle(tagId) {
    const id = Number(tagId || 0)
    if (!id) return
    const token = ++styleToken
    loading.style = true
    errors.style = ''
    try {
      const [detailResult, songResult, albumResult, playlistResult, artistResult] = await Promise.allSettled([
        discoverApi.getStyleDetail(id),
        discoverApi.getStyleSongs(id, {size: 12}),
        discoverApi.getStyleAlbums(id, {size: 10}),
        discoverApi.getStylePlaylists(id, {size: 10}),
        discoverApi.getStyleArtists(id, {size: 10}),
      ])
      if (token !== styleToken) return
      const fallback = styles.value.flatMap(item => [item, ...(item?.childrenTags || [])]).find(item => Number(item?.tagId) === id)
      selectedStyle.value = detailResult.status === 'fulfilled'
        ? detailResult.value?.data?.data || fallback || null
        : fallback || null
      styleSongs.value = songResult.status === 'fulfilled' ? songResult.value?.data?.data?.songs || [] : []
      styleAlbums.value = albumResult.status === 'fulfilled'
        ? (albumResult.value?.data?.data?.albums || []).map(normalizeAlbum).filter(item => item.id)
        : []
      stylePlaylists.value = playlistResult.status === 'fulfilled'
        ? (playlistResult.value?.data?.data?.playlist || []).map(normalizePlaylist).filter(item => item.id)
        : []
      styleArtists.value = artistResult.status === 'fulfilled' ? artistResult.value?.data?.data?.artists || [] : []
      if (!selectedStyle.value) errors.style = '该曲风暂时没有详情数据'
    } catch (error) {
      if (token === styleToken) errors.style = error?.message || '曲风内容加载失败'
    } finally {
      if (token === styleToken) loading.style = false
    }
  }

  async function loadAlbums({area = 'ALL', type = 'new', limit = 24, offset = 0} = {}) {
    loading.albums = true
    errors.albums = ''
    try {
      const response = await discoverApi.getNewAlbums({area, type, limit, offset})
      const body = response?.data || {}
      newAlbums.value = uniqueById([...(body?.weekData || []), ...(body?.monthData || []), ...(body?.albums || [])]
        .map(normalizeAlbum)
        .filter(item => item.id))
    } catch (error) {
      errors.albums = error?.message || '新碟数据加载失败'
      newAlbums.value = []
    } finally {
      loading.albums = false
    }
  }

  async function loadCharts() {
    loading.charts = true
    errors.charts = ''
    try {
      const response = await discoverApi.getCharts()
      charts.value = Array.isArray(response?.data?.list) ? response.data.list : []
    } catch (error) {
      errors.charts = error?.message || '榜单加载失败'
      charts.value = []
    } finally {
      loading.charts = false
    }
  }

  async function loadArtists(filters = {}) {
    loading.artists = true
    errors.artists = ''
    try {
      const response = await discoverApi.getArtists(filters)
      artists.value = Array.isArray(response?.data?.artists) ? response.data.artists : []
      artistHasMore.value = Boolean(response?.data?.more)
    } catch (error) {
      errors.artists = error?.message || '艺人目录加载失败'
      artists.value = []
      artistHasMore.value = false
    } finally {
      loading.artists = false
    }
  }

  async function loadRadio({cateId = 0, limit = 18, offset = 0} = {}) {
    loading.radio = true
    errors.radio = ''
    try {
      if (!djCategories.value.length) {
        const categoryResponse = await discoverApi.getDjCategories()
        djCategories.value = Array.isArray(categoryResponse?.data?.categories) ? categoryResponse.data.categories : []
      }
      const activeCateId = Number(cateId || djCategories.value[0]?.id || 0)
      const [radioResult, programResult] = await Promise.allSettled([
        activeCateId ? discoverApi.getHotRadios({cateId: activeCateId, limit, offset}) : Promise.resolve(null),
        discoverApi.getProgramChart({limit: 10}),
      ])
      if (radioResult.status === 'fulfilled') {
        radios.value = radioResult.value?.data?.djRadios || []
        radioHasMore.value = Boolean(radioResult.value?.data?.hasMore)
      }
      if (programResult.status === 'fulfilled') programs.value = programResult.value?.data?.toplist || []
    } catch (error) {
      errors.radio = error?.message || '播客目录加载失败'
      radios.value = []
      programs.value = []
    } finally {
      loading.radio = false
    }
  }

  return {
    styles,
    selectedStyle,
    styleSongs,
    styleAlbums,
    stylePlaylists,
    styleArtists,
    newAlbums,
    charts,
    artists,
    artistHasMore,
    djCategories,
    radios,
    radioHasMore,
    programs,
    loading,
    errors,
    loadStyles,
    loadStyle,
    loadAlbums,
    loadCharts,
    loadArtists,
    loadRadio,
  }
}
