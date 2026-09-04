import {songsApi} from '@/api/songsApi/songsApi.js'
import {reportApi} from '@/api/reportApi/reportApi.js'
import {PLAY_MODE, usePlayerStore} from '@/stores/playerStore.js'
import {
  getLastAutomixAnalysis,
  recommendNextQueueIndex,
  warmupAutomixRecommendation,
} from '@/utils/automixEngine.js'
import {dismissPlaybackNotice, showPlaybackNotice} from '@/utils/playbackNotice.js'

const preloadedSongUrlCache = new Map()
let warmupToken = 0
let playbackRequestToken = 0
let queueNavigationToken = 0

function normalizeCoverUrlProtocol(url = '') {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (raw.startsWith('//')) return `https:${raw}`
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

function resolveSongLabel(song, detail = null) {
  const name = String(resolveName(song, detail) || '').trim()
  return name ? `《${name}》` : '这首歌'
}

function isTrialEntry(entry) {
  if (!entry || typeof entry !== 'object') return false
  if (entry.freeTrialInfo) return true
  if (entry.freeTrialPrivilege?.resConsumable === true) return true
  return entry.freeTimeTrialPrivilege?.resConsumable === true
}

function resolveTrialSeconds(entry) {
  const start = Number(entry?.freeTrialInfo?.start)
  const end = Number(entry?.freeTrialInfo?.end)
  const rawSpan = end - start
  if (Number.isFinite(rawSpan) && rawSpan > 0) {
    const seconds = rawSpan > 600 ? rawSpan / 1000 : rawSpan
    return Math.max(1, Math.round(seconds))
  }

  const remainTime = Number(entry?.freeTimeTrialPrivilege?.remainTime)
  if (Number.isFinite(remainTime) && remainTime > 0) {
    return Math.max(1, Math.round(remainTime > 600 ? remainTime / 1000 : remainTime))
  }

  return 0
}

function collectResponseText(source, accessDetail) {
  const values = []

  for (const observation of source?.observations || []) {
    values.push(
      observation?.entry?.message,
      observation?.entry?.msg,
      observation?.response?.data?.message,
      observation?.response?.data?.msg,
    )
  }

  for (const error of source?.requestErrors || []) {
    values.push(
      error?.message,
      error?.response?.data?.message,
      error?.response?.data?.msg,
    )
  }

  values.push(
    accessDetail?.response?.data?.message,
    accessDetail?.response?.data?.msg,
    accessDetail?.error?.message,
    accessDetail?.error?.response?.data?.message,
  )

  return values.filter(Boolean).join(' ').toLowerCase()
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

async function getSongAccessDetail(id) {
  try {
    const response = await songsApi.getSongDetail(id)
    const detail = response?.data?.songs?.[0] || null
    const privilege = response?.data?.privileges?.[0] || detail?.privilege || null
    return {response, detail, privilege, error: null}
  } catch (error) {
    return {response: null, detail: null, privilege: null, error}
  }
}

function showTrialNotice(song, entry) {
  const seconds = resolveTrialSeconds(entry)
  const timeCopy = seconds ? `当前可试听 ${seconds} 秒` : '当前只能播放试听片段'

  showPlaybackNotice({
    kind: 'trial',
    eyebrow: 'TRIAL MODE',
    title: '正在播放试听片段',
    message: `${resolveSongLabel(song)}${timeCopy}，黑胶 VIP 可播放完整版。`,
    duration: 5800,
    dedupeKey: `trial:${song?.id || song}`,
  })
}

function showUnplayableNotice(song, source, accessDetail) {
  const detail = accessDetail?.detail || null
  const privilege = accessDetail?.privilege || null
  const entries = (source?.observations || []).map(item => item?.entry).filter(Boolean)
  const lastEntry = entries.at(-1) || null
  const input = song && typeof song === 'object' ? song : null
  const fee = firstFiniteNumber(lastEntry?.fee, privilege?.fee, detail?.fee, input?.fee)
  const state = firstFiniteNumber(privilege?.st, detail?.privilege?.st, input?.privilege?.st)
  const playBitrate = firstFiniteNumber(privilege?.pl, detail?.privilege?.pl, input?.privilege?.pl)
  const responseCode = firstFiniteNumber(
    lastEntry?.code,
    source?.observations?.at(-1)?.response?.data?.code,
    accessDetail?.response?.data?.code,
  )
  const responseText = collectResponseText(source, accessDetail)
  const label = resolveSongLabel(song, detail)
  const songId = input?.id || song
  const hasNoCopyright = Boolean(detail?.noCopyrightRcmd || input?.noCopyrightRcmd)
  const copyrightHint = /版权|copyright|地区|region|country|license/.test(responseText)
  const removedHint = /下架|不存在|已删除|not found|invalid song|removed/.test(responseText)
  const accountHint = /登录|login|cookie|unauthorized|未授权/.test(responseText)
  const onlyNetworkFailures = !source?.observations?.length && Boolean(source?.requestErrors?.length) && !accessDetail?.response

  if (hasNoCopyright || state < 0 || copyrightHint) {
    showPlaybackNotice({
      kind: 'copyright',
      eyebrow: 'COPYRIGHT',
      title: '当前没有可用版权',
      message: `${label}可能受版权或地区限制，网易云音乐暂未提供可播放音源。`,
      dedupeKey: `copyright:${songId}`,
    })
    return
  }

  if (fee === 4 || fee === 16) {
    showPlaybackNotice({
      kind: 'purchase',
      eyebrow: 'DIGITAL ALBUM',
      title: '需要购买后播放',
      message: `${label}属于付费数字专辑，需要在网易云音乐完成购买后才能播放。`,
      dedupeKey: `purchase:${songId}`,
    })
    return
  }

  if (fee === 1 || (fee === 8 && (playBitrate === null || playBitrate <= 0))) {
    showPlaybackNotice({
      kind: 'vip',
      eyebrow: 'BLACK VINYL',
      title: '需要黑胶 VIP',
      message: `${label}当前没有完整播放权限，请使用具有黑胶 VIP 权益的网易云账号后重试。`,
      duration: 6200,
      dedupeKey: `vip:${songId}`,
    })
    return
  }

  if (accountHint || responseCode === 401 || responseCode === 403) {
    showPlaybackNotice({
      kind: 'account',
      eyebrow: 'ACCOUNT',
      title: '登录后才能确认播放权限',
      message: `${label}需要登录网易云账号后获取播放地址。`,
      dedupeKey: `account:${songId}`,
    })
    return
  }

  if (removedHint || responseCode === 404) {
    showPlaybackNotice({
      kind: 'unavailable',
      eyebrow: 'UNAVAILABLE',
      title: '歌曲已下架或链接失效',
      message: `${label}暂时没有可用音源，可以稍后再试或播放其他版本。`,
      dedupeKey: `removed:${songId}`,
    })
    return
  }

  if (onlyNetworkFailures) {
    showPlaybackNotice({
      kind: 'network',
      eyebrow: 'CONNECTION',
      title: '播放地址获取失败',
      message: `没能取得${label}的播放地址，请检查网络连接后重试。`,
      dedupeKey: `network:${songId}`,
    })
    return
  }

  showPlaybackNotice({
    kind: 'unavailable',
    eyebrow: 'UNAVAILABLE',
    title: '暂时无法播放',
    message: `网易云没有返回${label}的可用音源，可能是账号权限或版权限制。`,
    dedupeKey: `unavailable:${songId}`,
  })
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

async function resolveSongPlayableSource(id) {
  const cacheKey = String(id)
  const cached = preloadedSongUrlCache.get(cacheKey)
  if (cached) return cached

  const observations = []
  const requestErrors = []

  const requestLevel = async (level) => {
    try {
      const res = await songsApi.getSongUrl(id, {level})
      const entry = getUrlEntry(res)
      return {level, response: res, entry, error: null}
    } catch (error) {
      return {level, response: null, entry: null, error}
    }
  }

  const recordResult = (result) => {
    if (result.error) requestErrors.push(result.error)
    else observations.push({
      level: result.level,
      response: result.response,
      entry: result.entry,
    })
  }

  // 先请求最常用的高音质；仅在不可用时并行尝试其余回退，避免连续等待三次网络往返。
  const primary = await requestLevel('exhigh')
  recordResult(primary)
  if (primary.entry?.url) {
    const source = {url: primary.entry.url, entry: primary.entry, observations, requestErrors}
    preloadedSongUrlCache.set(cacheKey, source)
    return source
  }

  const fallbackResults = await Promise.all([
    requestLevel('higher'),
    requestLevel('standard'),
    songsApi.getSongUrlLegacy(id)
      .then(response => ({level: 'legacy', response, entry: getUrlEntry(response), error: null}))
      .catch(error => ({level: 'legacy', response: null, entry: null, error})),
  ])

  for (const result of fallbackResults) {
    recordResult(result)
    if (result.entry?.url) {
      const source = {url: result.entry.url, entry: result.entry, observations, requestErrors}
      preloadedSongUrlCache.set(cacheKey, source)
      return source
    }
  }

  return {
    url: '',
    entry: observations.map(item => item?.entry).filter(Boolean).at(-1) || null,
    observations,
    requestErrors,
  }
}

export async function resolveSongPlayableUrl(id) {
  const source = await resolveSongPlayableSource(id)
  return source?.url || ''
}

export function clearSongPlayableUrlCache(songId) {
  const cacheKey = String(songId || '').trim()
  if (cacheKey) preloadedSongUrlCache.delete(cacheKey)
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

  const source = await resolveSongPlayableSource(targetId)
  if (token !== warmupToken) return
  if (typeof console !== 'undefined') {
    console.log('[Automix/Warmup] next song URL preloaded', {
      targetId,
      nextIndex,
      ok: Boolean(source?.url),
    })
  }
}

export async function playSongById(songInput, {autoplay = true} = {}) {
  const id = Number(songInput?.id || songInput)
  if (!Number.isFinite(id) || id <= 0) return false

  const requestToken = ++playbackRequestToken
  queueNavigationToken += 1
  dismissPlaybackNotice()
  const playerStore = usePlayerStore()
  playerStore.setPlaybackPendingId(id)

  try {
    const source = await resolveSongPlayableSource(id)
    if (requestToken !== playbackRequestToken) return null
    const url = source?.url || ''

    if (!url) {
      const accessDetail = await getSongAccessDetail(id)
      if (requestToken !== playbackRequestToken) return null
      showUnplayableNotice(songInput, source, accessDetail)
      return false
    }

    if (isTrialEntry(source.entry)) {
      showTrialNotice(songInput, source.entry)
    }

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
    if (requestToken !== playbackRequestToken) return null
    showPlaybackNotice({
      kind: 'network',
      eyebrow: 'PLAYBACK',
      title: '播放请求出现异常',
      message: `${resolveSongLabel(songInput)}暂时无法开始播放，请稍后重试。`,
      dedupeKey: `unexpected:${id}`,
    })
    return false
  } finally {
    if (requestToken === playbackRequestToken) {
      playerStore.setPlaybackPendingId(null)
    }
  }
}

export async function playSongWithQueue(songInput, queue = [], queueIndex = 0, {autoplay = true} = {}) {
  const playerStore = usePlayerStore()
  playerStore.setQueue(queue, {startIndex: queueIndex})
  const ok = await playSongById(songInput, {autoplay})
  if (ok === null) return true
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
  const navigationToken = ++queueNavigationToken
  dismissPlaybackNotice()
  const previousIndex = Number.isInteger(playerStore.currentQueueIndex) ? playerStore.currentQueueIndex : -1
  const nextIndex = await resolveNextIndex({direction, trigger})
  if (navigationToken !== queueNavigationToken) return true
  if (nextIndex < 0) return false
  const targetSong = playerStore.playQueue[nextIndex]
  if (!targetSong?.id) return false
  playerStore.setCurrentQueueIndex(nextIndex)
  const ok = await playSongById(targetSong, {autoplay: true})
  if (ok === null) return true
  if (ok === false && previousIndex >= 0 && playerStore.currentQueueIndex === nextIndex) {
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
  if (ok === null) return true
  if (ok === false && previousIndex >= 0 && playerStore.currentQueueIndex === nextIndex) {
    playerStore.setCurrentQueueIndex(previousIndex)
  }
  return ok
}
