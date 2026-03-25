import {songsApi} from '@/api/songsApi/songsApi.js'
import {PLAY_MODE, usePlayerStore} from '@/stores/playerStore.js'

function resolveArtists(song, detail) {
  return song?.artists || song?.ar || detail?.ar || detail?.artists || []
}

function resolveCover(song, detail) {
  return song?.cover || song?.coverImgUrl || song?.picUrl || song?.al?.picUrl || song?.album?.picUrl || detail?.al?.picUrl || detail?.album?.picUrl || ''
}

function resolveName(song, detail) {
  return song?.name || detail?.name || ''
}

function getUrlEntry(response) {
  return response?.data?.data?.[0] || null
}

async function resolveSongPlayableUrl(id) {
  const levels = ['exhigh', 'higher', 'standard']

  for (const level of levels) {
    try {
      const res = await songsApi.getSongUrl(id, {level})
      const entry = getUrlEntry(res)
      const url = entry?.url || ''
      if (!url) continue
      return url
    } catch {
      // ignore and fallback to next level
    }
  }

  try {
    const legacyRes = await songsApi.getSongUrlLegacy(id)
    const entry = getUrlEntry(legacyRes)
    return entry?.url || ''
  } catch {
    return ''
  }
}

export async function playSongById(songInput, {autoplay = true} = {}) {
  const id = Number(songInput?.id || songInput)
  if (!Number.isFinite(id) || id <= 0) return false

  const playerStore = usePlayerStore()

  try {
    const [url, detailRes] = await Promise.all([
      resolveSongPlayableUrl(id),
      songsApi.getSongDetail(id),
    ])

    if (!url) return false

    const detail = detailRes?.data?.songs?.[0] || null

    const nextTrack = {
      id,
      name: resolveName(songInput, detail),
      artists: resolveArtists(songInput, detail),
      cover: resolveCover(songInput, detail),
      url,
    }

    playerStore.setTrack(nextTrack, {autoplay, resetTime: true})
    playerStore.syncQueueIndexBySongId(id)
    const inQueue = playerStore.playQueue.some(item => String(item.id) === String(id))

    if (!inQueue || playerStore.currentQueueIndex < 0 || !playerStore.playQueue.length) {
      playerStore.setQueue([nextTrack], {startIndex: 0})
    }

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

function resolveNextIndex({direction = 'next', trigger = 'manual'} = {}) {
  const playerStore = usePlayerStore()
  const length = playerStore.playQueue.length
  if (!length) return -1

  const currentIndex = Number.isInteger(playerStore.currentQueueIndex) ? playerStore.currentQueueIndex : 0
  const mode = trigger === 'ended' ? playerStore.playMode : (playerStore.playMode === PLAY_MODE.SINGLE ? PLAY_MODE.SEQUENCE : playerStore.playMode)

  if (mode === PLAY_MODE.SINGLE) return Math.min(Math.max(currentIndex, 0), length - 1)

  if (mode === PLAY_MODE.SHUFFLE) {
    return pickRandomIndex(length, Math.min(Math.max(currentIndex, 0), length - 1))
  }

  if (direction === 'prev') {
    return currentIndex > 0 ? currentIndex - 1 : -1
  }

  return currentIndex < length - 1 ? currentIndex + 1 : -1
}

export async function playQueueByDirection(direction = 'next', {trigger = 'manual'} = {}) {
  const playerStore = usePlayerStore()
  const nextIndex = resolveNextIndex({direction, trigger})
  if (nextIndex < 0) return false
  const targetSong = playerStore.playQueue[nextIndex]
  if (!targetSong?.id) return false
  playerStore.setCurrentQueueIndex(nextIndex)
  return playSongById(targetSong, {autoplay: true})
}

export async function playQueueByIndex(index, {autoplay = true} = {}) {
  const playerStore = usePlayerStore()
  const nextIndex = Number(index)
  if (!Number.isInteger(nextIndex)) return false
  const targetSong = playerStore.playQueue[nextIndex]
  if (!targetSong?.id) return false
  playerStore.setCurrentQueueIndex(nextIndex)
  return playSongById(targetSong, {autoplay})
}
