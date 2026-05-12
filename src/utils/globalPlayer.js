import {songsApi} from '@/api/songsApi/songsApi.js'
import {reportApi} from '@/api/reportApi/reportApi.js'
import {PLAY_MODE, usePlayerStore} from '@/stores/playerStore.js'
import {
  getLastAutomixAnalysis,
  recommendNextQueueIndex,
  warmupAutomixRecommendation,
} from '@/utils/automixEngine.js'

const preloadedSongUrlCache = new Map()
let warmupToken = 0

function normalizeCoverUrlProtocol(url = '') {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (/^\/\//.test(raw)) return `https:${raw}`
  return raw.replace(/^http:\/\//i, 'https://')
}

function resolveArtists(song, detail) {
  return song?.artists || song?.ar || detail?.ar || detail?.artists || []
}

function resolveCover(song, detail) {
  return normalizeCoverUrlProtocol(
    song?.cover || song?.coverImgUrl || song?.picUrl || song?.al?.picUrl || detail?.al?.picUrl || song?.album?.picUrl || detail?.album?.picUrl || ''
  )
}

function resolveName(song, detail) {
  return song?.name || detail?.name || ''
}

function getUrlEntry(response) {
  return response?.data?.data?.[0] || null
}

function summarizeSongForReport(song) {
  const artists = resolveArtists(song, null)
    .map(item => item?.name || item?.artistName || item)
    .filter(Boolean)
    .join(', ')

  return {
    songId: song?.id,
    songName: song?.name || '',
    artist: artists,
    album: song?.al?.name || song?.album?.name || song?.album || '',
    duration: Math.round(Number(song?.dt || song?.duration || 0) / 1000) || undefined,
    coverUrl: resolveCover(song, null),
  }
}

async function resolveSongPlayableUrl(id) {
  const cacheKey = String(id)
  const cached = preloadedSongUrlCache.get(cacheKey)
  if (cached) return cached

  const levels = ['exhigh', 'higher', 'standard']

  for (const level of levels) {
    try {
      const res = await songsApi.getSongUrl(id, {level})
      const entry = getUrlEntry(res)
      const url = entry?.url || ''
      if (!url) continue
      preloadedSongUrlCache.set(cacheKey, url)
      return url
    } catch {
      // ignore and fallback to next level
    }
  }

  try {
    const legacyRes = await songsApi.getSongUrlLegacy(id)
    const entry = getUrlEntry(legacyRes)
    const url = entry?.url || ''
    if (url) {
      preloadedSongUrlCache.set(cacheKey, url)
    }
    return url
  } catch {
    return ''
  }
}

export async function warmupNextTrack() {
  const playerStore = usePlayerStore()
  const token = ++warmupToken

  if (!playerStore.automixEnabled) return
  if (!playerStore.playQueue.length) return
  const currentQueueIndex = Number.isInteger(playerStore.currentQueueIndex) ? playerStore.currentQueueIndex : -1
  if (currentQueueIndex < 0) return

  const nextIndex = await warmupAutomixRecommendation(playerStore.playQueue, currentQueueIndex)
  if (token !== warmupToken) return
  if (nextIndex < 0 || nextIndex >= playerStore.playQueue.length || nextIndex === currentQueueIndex) return

  const analysis = getLastAutomixAnalysis()
  if (analysis?.transition && typeof console !== 'undefined') {
    const transition = analysis.transition
    console.log('[Automix/Warmup] 建议过渡点', {
      currentTrackId: analysis.currentTrackId,
      selectedTrackId: analysis.selectedTrackId,
      currentMixOutSecond: Number(transition.mix_out_start || 0).toFixed(2),
      nextMixInSecond: Number(transition.mix_in_start || 0).toFixed(2),
      crossfadeSecond: Number(transition.crossfade_duration || 0).toFixed(2),
      beatAligned: Boolean(transition.beat_aligned),
      tempoAdjustRequired: Boolean(transition.tempo_adjust_required),
    })
  }

  const targetSong = playerStore.playQueue[nextIndex]
  const targetId = Number(targetSong?.id)
  if (!Number.isFinite(targetId) || targetId <= 0) return

  const cacheKey = String(targetId)
  if (preloadedSongUrlCache.has(cacheKey)) {
    if (typeof console !== 'undefined') {
      console.log('[Automix/Warmup] next song URL cache hit', {targetId, nextIndex})
    }
    return
  }

  const url = await resolveSongPlayableUrl(targetId)
  if (token !== warmupToken) return
  if (typeof console !== 'undefined') {
    console.log('[Automix/Warmup] next song URL preloaded', {
      targetId,
      nextIndex,
      ok: Boolean(url),
    })
  }
}

export async function playSongById(songInput, {autoplay = true} = {}) {
  const id = Number(songInput?.id || songInput)
  if (!Number.isFinite(id) || id <= 0) return false

  const playerStore = usePlayerStore()

  try {
    const url = await resolveSongPlayableUrl(id)

    if (!url) return false

    const nextTrack = {
      id,
      name: resolveName(songInput, null),
      artists: resolveArtists(songInput, null),
      cover: resolveCover(songInput, null),
      url,
      mixProfile: songInput?.mixProfile || null,
    }

    playerStore.setTrack(nextTrack, {autoplay, resetTime: true})
    const queueCurrent = playerStore.playQueue[playerStore.currentQueueIndex]
    if (String(queueCurrent?.id || '') !== String(id)) {
      const matchedIndex = playerStore.playQueue.findIndex(item => String(item.id) === String(id))
      if (matchedIndex >= 0) {
        playerStore.setCurrentQueueIndex(matchedIndex)
      }
    }
    const inQueue = playerStore.playQueue.some(item => String(item.id) === String(id))

    if (!inQueue || playerStore.currentQueueIndex < 0 || !playerStore.playQueue.length) {
      playerStore.setQueue([nextTrack], {startIndex: 0})
    }

    reportApi.reportBehavior({
      actionType: 'PLAY_START',
      actionTarget: String(id),
      actionDetail: JSON.stringify(summarizeSongForReport(nextTrack)),
    })

    warmupNextTrack().catch(() => {
      if (typeof console !== 'undefined') {
        console.log('[Automix/Warmup] failed to warm up next track')
      }
    })

    songsApi.getSongDetail(id)
      .then((detailRes) => {
        const detail = detailRes?.data?.songs?.[0] || null
        if (!detail) return
        const currentId = String(playerStore.currentSong?.id || '')
        if (currentId !== String(id)) return

        playerStore.setTrack(
          {
            id,
            name: resolveName(songInput, detail),
            artists: resolveArtists(songInput, detail),
            cover: resolveCover(songInput, detail),
            url,
            mixProfile: songInput?.mixProfile || null,
          },
          {autoplay: playerStore.isPlaying, resetTime: false},
        )
      })
      .catch(() => {
        // keep optimistic metadata
      })

    return true
  } catch {
    return false
  }
}

export async function playSongWithQueue(songInput, queue = [], queueIndex = 0, {autoplay = true} = {}) {
  const playerStore = usePlayerStore()
  playerStore.setQueue(queue, {startIndex: queueIndex})
  const ok = await playSongById(songInput, {autoplay})
  if (ok) {
    playerStore.syncQueueIndexBySongId(songInput?.id || songInput)
  }
  return ok
}

function pickRandomIndex(length, currentIndex) {
  if (length <= 1) return currentIndex
  let nextIndex = currentIndex
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * length)
  }
  return nextIndex
}

async function resolveNextIndex({direction = 'next', trigger = 'manual'} = {}) {
  const playerStore = usePlayerStore()
  const length = playerStore.playQueue.length
  if (!length) return -1

  const currentIndex = Number.isInteger(playerStore.currentQueueIndex) ? playerStore.currentQueueIndex : 0
  const mode = trigger === 'ended' ? playerStore.playMode : (playerStore.playMode === PLAY_MODE.SINGLE ? PLAY_MODE.SEQUENCE : playerStore.playMode)
  const normalizedCurrentIndex = Math.min(Math.max(currentIndex, 0), length - 1)

  if (mode === PLAY_MODE.SINGLE) return normalizedCurrentIndex

  if (direction === 'prev') {
    return normalizedCurrentIndex > 0 ? normalizedCurrentIndex - 1 : -1
  }

  if (playerStore.automixEnabled) {
    const suggestedIndex = await recommendNextQueueIndex(playerStore.playQueue, normalizedCurrentIndex)
    if (suggestedIndex >= 0 && suggestedIndex < length && suggestedIndex !== normalizedCurrentIndex) {
      return suggestedIndex
    }
  }

  if (mode === PLAY_MODE.SHUFFLE) {
    return pickRandomIndex(length, normalizedCurrentIndex)
  }

  return normalizedCurrentIndex < length - 1 ? normalizedCurrentIndex + 1 : -1
}

export async function playQueueByDirection(direction = 'next', {trigger = 'manual'} = {}) {
  const playerStore = usePlayerStore()
  const previousIndex = Number.isInteger(playerStore.currentQueueIndex) ? playerStore.currentQueueIndex : -1
  const nextIndex = await resolveNextIndex({direction, trigger})
  if (nextIndex < 0) return false
  const targetSong = playerStore.playQueue[nextIndex]
  if (!targetSong?.id) return false
  playerStore.setCurrentQueueIndex(nextIndex)
  const ok = await playSongById(targetSong, {autoplay: true})
  if (!ok && previousIndex >= 0) {
    playerStore.setCurrentQueueIndex(previousIndex)
  }
  return ok
}

export async function playQueueByIndex(index, {autoplay = true} = {}) {
  const playerStore = usePlayerStore()
  const previousIndex = Number.isInteger(playerStore.currentQueueIndex) ? playerStore.currentQueueIndex : -1
  const nextIndex = Number(index)
  if (!Number.isInteger(nextIndex)) return false
  const targetSong = playerStore.playQueue[nextIndex]
  if (!targetSong?.id) return false
  playerStore.setCurrentQueueIndex(nextIndex)
  const ok = await playSongById(targetSong, {autoplay})
  if (!ok && previousIndex >= 0) {
    playerStore.setCurrentQueueIndex(previousIndex)
  }
  return ok
}
