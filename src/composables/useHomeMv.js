import { ref } from 'vue'
import { artistApi } from '@/api/artistApi/artistApi.js'

export function useHomeMv(playerStore, loading, errors) {
  const mvList = ref([])

  const mvSourceOptions = [
    { label: '全部 MV', value: 'all' },
    { label: '最新 MV', value: 'latest' },
    { label: '网易出品', value: 'exclusive' },
    { label: '推荐 MV', value: 'recommend' },
  ]
  const mvAreas = ['全部', '内地', '港台', '欧美', '日本', '韩国']
  const mvTypes = ['全部', '官方版', '原生', '现场版', '网易出品']
  const mvOrders = ['上升最快', '最热', '最新']

  const activeMvSource = ref('all')
  const mvArea = ref('全部')
  const mvType = ref('全部')
  const mvOrder = ref('上升最快')
  const mvLimit = ref(9)
  const mvOffset = ref(0)
  const mvHasMore = ref(false)

  const mvPlayerOpen = ref(false)
  const mvPlayerLoading = ref(false)
  const mvPlayerError = ref('')
  const currentMv = ref(null)
  const currentMvUrl = ref('')
  const mvResolutions = ref([])
  const selectedMvResolution = ref(1080)
  const shouldResumeMusicOnClose = ref(false)

  function normalizeMvItem(item) {
    return {
      id: item?.id || null,
      name: item?.name || item?.copywriter || '未知 MV',
      cover: item?.cover || item?.imgurl || item?.picUrl || '',
      artistName: item?.artistName || item?.artist?.name || item?.artists?.map((a) => a.name).join(' / ') || '',
      playCount: item?.playCount || item?.playTime || item?.playtime || 0,
    }
  }

  async function loadMvList({ reset = false } = {}) {
    if (reset) mvOffset.value = 0

    loading.value.mv = true
    errors.value.mv = ''

    try {
      let res
      if (activeMvSource.value === 'all') {
        res = await artistApi.getAllMv({
          area: mvArea.value,
          type: mvType.value,
          order: mvOrder.value,
          limit: mvLimit.value,
          offset: mvOffset.value,
        })
        const list = (res?.data?.data || []).map(normalizeMvItem)
        mvList.value = list
        mvHasMore.value = Boolean(res?.data?.hasMore ?? list.length >= mvLimit.value)
        return
      }

      if (activeMvSource.value === 'latest') {
        res = await artistApi.getLatestMv({ area: mvArea.value, limit: mvLimit.value })
        mvList.value = (res?.data?.data || []).map(normalizeMvItem)
        mvHasMore.value = false
        return
      }

      if (activeMvSource.value === 'exclusive') {
        res = await artistApi.getExclusiveMv({ limit: mvLimit.value, offset: mvOffset.value })
        const raw = res?.data?.data || res?.data?.result || []
        const list = raw.map(normalizeMvItem)
        mvList.value = list
        mvHasMore.value = Boolean(res?.data?.hasMore ?? list.length >= mvLimit.value)
        return
      }

      res = await artistApi.getRecommendMv()
      mvList.value = (res?.data?.result || res?.data?.data || []).map(normalizeMvItem)
      mvHasMore.value = false
    } catch {
      errors.value.mv = 'MV 加载失败'
    } finally {
      loading.value.mv = false
    }
  }

  function switchMvSource(source) {
    if (activeMvSource.value === source) return
    activeMvSource.value = source
    loadMvList({ reset: true })
  }

  function nextMvPage() {
    if (!mvHasMore.value || loading.value.mv) return
    mvOffset.value += mvLimit.value
    loadMvList()
  }

  function prevMvPage() {
    if (mvOffset.value <= 0 || loading.value.mv) return
    mvOffset.value = Math.max(0, mvOffset.value - mvLimit.value)
    loadMvList()
  }

  async function loadMvUrl(mvId, resolution) {
    mvPlayerLoading.value = true
    mvPlayerError.value = ''

    const candidates = Array.from(
      new Set([
        Number(resolution),
        ...mvResolutions.value.map((item) => Number(item)),
        1080,
        720,
        480,
        240,
      ].filter((item) => Number.isFinite(item) && item > 0)),
    ).sort((a, b) => b - a)

    try {
      for (const r of candidates) {
        const res = await artistApi.getMvUrl(mvId, r)
        const url = res?.data?.data?.url || ''
        if (!url) continue
        selectedMvResolution.value = r
        currentMvUrl.value = url
        return
      }
      mvPlayerError.value = '该 MV 暂无可播放地址'
    } catch {
      mvPlayerError.value = 'MV 加载失败，请稍后重试'
    } finally {
      mvPlayerLoading.value = false
    }
  }

  function openMv(mv) {
    if (!mv?.id) return
    shouldResumeMusicOnClose.value = Boolean(playerStore.isPlaying && playerStore.hasSong)
    if (shouldResumeMusicOnClose.value) playerStore.setPlaying(false)

    currentMv.value = mv
    currentMvUrl.value = ''
    mvPlayerError.value = ''
    mvPlayerLoading.value = true
    mvPlayerOpen.value = true
    selectedMvResolution.value = 1080
    mvResolutions.value = [1080, 720, 480]

    artistApi.getMvDetail(mv.id)
      .then((res) => {
        const brs = res?.data?.data?.brs || {}
        const available = Object.keys(brs)
          .map((item) => Number(item))
          .filter((item) => Number.isFinite(item) && item > 0)
          .sort((a, b) => b - a)
        if (available.length) {
          mvResolutions.value = available
          selectedMvResolution.value = available[0]
        }
      })
      .catch(() => {
        mvResolutions.value = [1080, 720, 480]
      })
      .finally(() => {
        loadMvUrl(mv.id, selectedMvResolution.value)
      })
  }

  function changeMvResolution() {
    if (!currentMv.value?.id) return
    currentMvUrl.value = ''
    loadMvUrl(currentMv.value.id, Number(selectedMvResolution.value || 1080))
  }

  function closeMvPlayer() {
    mvPlayerOpen.value = false
    mvPlayerLoading.value = false
    mvPlayerError.value = ''
    currentMvUrl.value = ''
    mvResolutions.value = []
    if (shouldResumeMusicOnClose.value && playerStore.hasSong) {
      playerStore.setPlaying(true)
    }
    shouldResumeMusicOnClose.value = false
  }

  return {
    mvList,
    mvSourceOptions,
    mvAreas,
    mvTypes,
    mvOrders,
    activeMvSource,
    mvArea,
    mvType,
    mvOrder,
    mvLimit,
    mvOffset,
    mvHasMore,
    mvPlayerOpen,
    mvPlayerLoading,
    mvPlayerError,
    currentMv,
    currentMvUrl,
    mvResolutions,
    selectedMvResolution,
    loadMvList,
    switchMvSource,
    nextMvPage,
    prevMvPage,
    openMv,
    changeMvResolution,
    closeMvPlayer,
  }
}
