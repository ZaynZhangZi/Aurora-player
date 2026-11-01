const validId = value => /^[1-9][0-9]{0,19}$/.test(String(value || ''))
const text = (value, max) => String(value || '').slice(0, max)
const cover = value => {
  const url = String(value || '').replace(/^\/\//, 'https://')
  return /^https?:\/\/[^\s]+$/.test(url) ? url.slice(0, 2048) : ''
}
export function relayTrack(song) {
  if (!validId(song?.id)) throw new Error('当前曲目暂不支持跨设备播放')
  const artists = song.artists || song.ar || []
  return {id: String(song.id), name: text(song.name || '未知歌曲', 200),
    artists: (Array.isArray(artists) ? artists : []).slice(0, 10).map(item => text(typeof item === 'string' ? item : item?.name, 100)),
    album: text(song.album?.name || song.al?.name || (typeof song.album === 'string' ? song.album : ''), 200),
    cover: cover(song.cover || song.picUrl || song.coverImgUrl || song.al?.picUrl || song.album?.picUrl)}
}
export function captureRelaySnapshot(player, includeQueue = true) {
  const current = player.currentSong
  if (!validId(current?.id)) return null
  const source = Array.isArray(player.playQueue) ? player.playQueue : []
  let index = Number(player.currentQueueIndex)
  if (!Number.isInteger(index) || String(source[index]?.id) !== String(current.id)) index = source.findIndex(song => String(song?.id) === String(current.id))
  const queue = source.length ? source : [current]
  if (index < 0) index = source.length ? -1 : 0
  if (queue.length > 5000) throw new Error('队列超过5000首，暂时无法接力')
  const result = {positionMs: Math.min(604800000, Math.max(0, Math.floor(Number(player.pendingResumeMs ?? player.currentTimeMs) || 0))),
    durationMs: Math.min(604800000, Math.max(0, Math.floor(Number(player.durationMs) || 0))),
    playing: Boolean(player.isPlaying), queueIndex: index < 0 ? queue.length : index,
    playMode: ['sequence', 'single', 'shuffle'].includes(player.playMode) ? player.playMode : 'sequence'}
  if (includeQueue) {
    result.queue = queue.map(relayTrack)
    if (index < 0) {if (result.queue.length >= 5000) throw new Error('队列超过同步上限');result.queue.push(relayTrack(current));result.queueIndex=result.queue.length-1}
  }
  return result
}
export function usableRelayState(value) {
  return !!value && Array.isArray(value.queue) && value.queue.length > 0 && value.queue.length <= 5000
    && Number.isInteger(value.queueIndex) && value.queueIndex >= 0 && value.queueIndex < value.queue.length
    && value.queue.every(track => validId(track?.id))
}
export function restoreRelaySnapshot(value) {
  if (!usableRelayState(value)) throw new Error('接力记录暂时无法使用')
  const queue = value.queue.map(track => {
    const safe = relayTrack(track)
    return {...safe, artists: safe.artists.map(name => ({name})), album: {name: safe.album}}
  })
  const duration = Math.max(0, Number(value.durationMs) || 0)
  const position = Math.max(0, Number(value.positionMs) || 0)
  return {queue, song: queue[value.queueIndex], queueIndex: value.queueIndex,
    resumeMs: duration > 0 ? Math.min(position, Math.max(0, duration - 1500)) : position,
    playMode: ['sequence', 'single', 'shuffle'].includes(value.playMode) ? value.playMode : 'sequence'}
}
export function relayDeviceName(clientType, agent = globalThis.navigator?.userAgent || '') {
  const platform = /Android/i.test(agent) ? 'Android' : /iPhone|iPad/i.test(agent) ? 'iOS' : /Macintosh|Mac OS/i.test(agent) ? 'Mac' : /Windows/i.test(agent) ? 'Windows' : '设备'
  const browser = /Edg\//.test(agent) ? 'Edge' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari' : '网页端'
  return clientType === 'DESKTOP' ? platform + ' 桌面端' : platform + ' · ' + browser
}
