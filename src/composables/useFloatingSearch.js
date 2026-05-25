import { computed, ref, watch } from 'vue'
import { searchApi } from '@/api/searchApi/searchApi.js'
import { reportApi } from '@/api/reportApi/reportApi.js'

const PAGE_SIZE = 6

function normalizeIntentText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\u3000-\u303f`~!@#$%^&*()_+\-=[\]{};:'"\\|,.<>/?，。！？、；：“”‘’【】（）《》]/g, '')
}

function charOverlapScore(a, b) {
  if (!a || !b) return 0
  const sa = new Set(a.split(''))
  const sb = new Set(b.split(''))
  let overlap = 0
  for (const ch of sa) if (sb.has(ch)) overlap += 1
  return overlap / Math.max(1, Math.max(sa.size, sb.size))
}

function calcNameMatchScore(keywordRaw, textRaw) {
  const keyword = normalizeIntentText(keywordRaw)
  const text = normalizeIntentText(textRaw)
  if (!keyword || !text) return 0
  if (keyword === text) return 12
  if (text.startsWith(keyword) || keyword.startsWith(text)) return 9
  if (text.includes(keyword) || keyword.includes(text)) return 7
  return Number((charOverlapScore(keyword, text) * 6).toFixed(2))
}

function calcHintBoost(keyword) {
  const artistHints = ['歌手', '歌星', '谁唱', 'artist', 'singer', '乐队']
  const songHints = ['歌曲', '歌名', '单曲', '歌词', 'song', 'track']
  const playlistHints = ['歌单', 'playlist', '合集', '清单']
  return {
    artist: artistHints.some((token) => keyword.includes(token)) ? 4.8 : 0,
    song: songHints.some((token) => keyword.includes(token)) ? 4.8 : 0,
    playlist: playlistHints.some((token) => keyword.includes(token)) ? 4.8 : 0,
  }
}

export function useFloatingSearch(inputValue, expanded, isOpen) {
  const searchResult = ref(null)
  const searching = ref(false)
  const searchError = ref('')
  const sectionLoading = ref({ artist: false, song: false, playlist: false })
  const sectionError = ref({ artist: '', song: '', playlist: '' })
  const searchPage = ref({ artist: 0, song: 0, playlist: 0 })
  const activeEntryIndex = ref(-1)

  let searchTimer = null
  let searchRequestId = 0

  const artists = computed(() => searchResult.value?.artists || [])
  const songs = computed(() => searchResult.value?.songs || [])
  const playlists = computed(() => searchResult.value?.playlists || [])

  const artistEntries = computed(() => artists.value.map((item, index) => ({ ...item, type: 'artist', globalIndex: index })))
  const songEntries = computed(() => songs.value.map((item, index) => ({ ...item, type: 'song', globalIndex: artistEntries.value.length + index })))
  const playlistEntries = computed(() => playlists.value.map((item, index) => ({
    ...item,
    type: 'playlist',
    globalIndex: artistEntries.value.length + songEntries.value.length + index,
  })))
  const flatEntries = computed(() => [...artistEntries.value, ...songEntries.value, ...playlistEntries.value])

  const intentAnalysis = computed(() => {
    const keyword = inputValue.value.trim()
    if (!keyword) return { type: 'mixed', confidence: 0, scores: { artist: 0, song: 0, playlist: 0 } }

    const counts = {
      artist: Number(getTotalCount('artist') || 0),
      song: Number(getTotalCount('song') || 0),
      playlist: Number(getTotalCount('playlist') || 0),
    }
    const hint = calcHintBoost(keyword.toLowerCase())

    const calcTopMatchScore = (type) => {
      const list = type === 'artist' ? artists.value : type === 'song' ? songs.value : playlists.value
      const top = list.slice(0, 6)
      if (!top.length) return 0
      let best = 0
      let sum = 0
      top.forEach((item, index) => {
        const weight = 1 - index * 0.12
        const mainName = item?.name || ''
        const mainScore = calcNameMatchScore(keyword, mainName)
        let extra = 0
        if (type === 'song') {
          const artistNames = (item?.ar || item?.artists || []).map((a) => a?.name).join(' ')
          extra = calcNameMatchScore(keyword, artistNames) * 0.28
        } else if (type === 'playlist') {
          extra = calcNameMatchScore(keyword, item?.creator?.nickname || '') * 0.15
        }
        const score = (mainScore + extra) * Math.max(0.45, weight)
        best = Math.max(best, score)
        sum += score
      })
      return Number((best * 0.72 + (sum / top.length) * 0.28).toFixed(2))
    }

    const scores = {
      artist: calcTopMatchScore('artist') + Math.min(3, Math.log1p(counts.artist) * 0.78) + hint.artist,
      song: calcTopMatchScore('song') + Math.min(2.6, Math.log1p(counts.song) * 0.58) + hint.song,
      playlist: calcTopMatchScore('playlist') + Math.min(2.2, Math.log1p(counts.playlist) * 0.52) + hint.playlist,
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
    const [topType, topScore] = sorted[0]
    const secondScore = sorted[1]?.[1] || 0
    const margin = topScore - secondScore
    const confidence = Math.max(0, Math.min(1, (margin + topScore * 0.08) / 8.5))

    if (topScore < 3.5 || margin < 1.05 || confidence < 0.42) {
      return { type: 'mixed', confidence, scores }
    }
    return { type: topType, confidence, scores }
  })

  const intentType = computed(() => intentAnalysis.value.type)
  const intentConfidence = computed(() => intentAnalysis.value.confidence)
  const isSearchEmpty = computed(() => searchResult.value ? (artists.value.length === 0 && songs.value.length === 0 && playlists.value.length === 0) : false)

  function clearSearchState() {
    searchResult.value = null
    searchError.value = ''
    searching.value = false
    sectionLoading.value = { artist: false, song: false, playlist: false }
    sectionError.value = { artist: '', song: '', playlist: '' }
    activeEntryIndex.value = -1
    if (searchTimer) {
      clearTimeout(searchTimer)
      searchTimer = null
    }
  }

  function debounceSearch(keyword) {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => runSearch(keyword), 280)
  }

  async function runSearch(keyword, { onlyType = '' } = {}) {
    const currentId = ++searchRequestId
    if (onlyType) {
      sectionLoading.value = { ...sectionLoading.value, [onlyType]: true }
      sectionError.value = { ...sectionError.value, [onlyType]: '' }
    } else {
      searching.value = true
      searchError.value = ''
      sectionError.value = { artist: '', song: '', playlist: '' }
    }

    try {
      let res = null
      if (onlyType) {
        const typeMap = { artist: 100, song: 1, playlist: 1000 }
        res = await searchApi.searchByType(keyword, {
          type: typeMap[onlyType] || 1,
          limit: PAGE_SIZE,
          offset: (searchPage.value[onlyType] || 0) * PAGE_SIZE,
        })
      } else {
        res = await searchApi.searchComposite(keyword, {
          limit: PAGE_SIZE,
          offsets: {
            artist: searchPage.value.artist * PAGE_SIZE,
            song: searchPage.value.song * PAGE_SIZE,
            playlist: searchPage.value.playlist * PAGE_SIZE,
          },
        })
      }

      if (currentId !== searchRequestId) return

      if (onlyType) {
        const result = res?.data?.result || {}
        const prev = searchResult.value || {
          artists: [], songs: [], playlists: [],
          counts: { artist: 0, song: 0, playlist: 0 },
          limit: PAGE_SIZE,
          offsets: { artist: 0, song: 0, playlist: 0 },
        }
        searchResult.value = {
          ...prev,
          artists: onlyType === 'artist' ? (result.artists || []) : prev.artists,
          songs: onlyType === 'song' ? (result.songs || []) : prev.songs,
          playlists: onlyType === 'playlist' ? (result.playlists || []) : prev.playlists,
          counts: {
            ...prev.counts,
            artist: onlyType === 'artist' ? (result.artistCount || 0) : (prev.counts?.artist || 0),
            song: onlyType === 'song' ? (result.songCount || 0) : (prev.counts?.song || 0),
            playlist: onlyType === 'playlist' ? (result.playlistCount || 0) : (prev.counts?.playlist || 0),
          },
          offsets: { ...prev.offsets, [onlyType]: (searchPage.value[onlyType] || 0) * PAGE_SIZE },
        }
      } else {
        searchResult.value = res || {}
        const counts = searchResult.value?.counts || {}
        reportApi.reportSearch({
          keyword,
          resultCount: Number(counts.artist || 0) + Number(counts.song || 0) + Number(counts.playlist || 0),
        })
      }

      const maxIndex = flatEntries.value.length - 1
      if (maxIndex < 0) activeEntryIndex.value = -1
      else if (activeEntryIndex.value > maxIndex) activeEntryIndex.value = maxIndex
    } catch (error) {
      if (currentId !== searchRequestId) return
      if (onlyType) {
        sectionError.value = { ...sectionError.value, [onlyType]: error?.message || '该模块加载失败' }
      } else {
        searchResult.value = null
        searchError.value = error?.message || '搜索失败，请稍后重试'
      }
    } finally {
      if (currentId === searchRequestId) {
        if (onlyType) sectionLoading.value = { ...sectionLoading.value, [onlyType]: false }
        else searching.value = false
      }
    }
  }

  function getTotalCount(type) {
    return searchResult.value?.counts?.[type] || 0
  }

  function canPrev(type) {
    return (searchPage.value[type] || 0) > 0
  }

  function canNext(type) {
    const page = searchPage.value[type] || 0
    return (page + 1) * PAGE_SIZE < getTotalCount(type)
  }

  function getPageLabel(type) {
    const totalCount = getTotalCount(type)
    const totalPage = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
    const page = (searchPage.value[type] || 0) + 1
    return `${page}/${totalPage}`
  }

  function isSectionLoading(type) {
    return Boolean(sectionLoading.value?.[type])
  }

  function getResultSectionStyle(type) {
    const orderMap = {
      mixed: { artist: 1, song: 2, playlist: 3 },
      artist: { artist: 1, song: 2, playlist: 3 },
      song: { song: 1, artist: 2, playlist: 3 },
      playlist: { playlist: 1, song: 2, artist: 3 },
    }
    const orders = orderMap[intentType.value] || orderMap.mixed
    return { order: String(orders[type] || 4) }
  }

  function setupSearchWatchers() {
    watch(inputValue, (value) => {
      const keyword = value.trim()
      if (!keyword || !expanded.value) {
        clearSearchState()
        return
      }
      searchPage.value = { artist: 0, song: 0, playlist: 0 }
      activeEntryIndex.value = -1
      debounceSearch(keyword)
    })

    watch(expanded, (value) => {
      if (!value) {
        inputValue.value = ''
        clearSearchState()
      }
    })

    watch(isOpen, (open) => {
      if (open) clearSearchState()
    })
  }

  return {
    PAGE_SIZE,
    searchResult,
    searching,
    searchError,
    sectionLoading,
    sectionError,
    searchPage,
    activeEntryIndex,
    artists,
    songs,
    playlists,
    artistEntries,
    songEntries,
    playlistEntries,
    flatEntries,
    intentType,
    intentConfidence,
    isSearchEmpty,
    clearSearchState,
    runSearch,
    getTotalCount,
    canPrev,
    canNext,
    getPageLabel,
    isSectionLoading,
    getResultSectionStyle,
    setupSearchWatchers,
  }
}
