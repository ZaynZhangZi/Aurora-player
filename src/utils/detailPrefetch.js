import {canPreloadRoutes, preloadRouteComponent} from './routePerformance.js'
import {getMaintenanceSnapshot, isRouteAvailable} from './maintenanceAccess.js'

const tasks = new Map()
const queue = []
let active = 0
const valid = (type, id) => ['playlist', 'album', 'artist'].includes(type) && /^[1-9]\d*$/.test(String(id || ''))
async function readDetail(type, id) {
  if (type === 'playlist') return (await import('@/api/playListsApi/playListsApi.js')).playListsApi.getPlayListDetail(id)
  const {artistApi} = await import('@/api/artistApi/artistApi.js')
  if (type === 'album') return artistApi.getAlbumDetail(id)
  return Promise.all([artistApi.getArtistInfo(id), artistApi.getArtistHotSongs(id)])
}
function drain() {
  while (active < 2 && queue.length) {
    const task = queue.shift()
    active++
    Promise.resolve().then(() => {
      if (!canPreloadRoutes() || !isRouteAvailable(getMaintenanceSnapshot().settings, task.type)) return
      return Promise.all([preloadRouteComponent(task.router, {name: task.type, params: {id: task.id}}), readDetail(task.type, task.id)])
    }).catch(() => {}).finally(() => {
      active--; tasks.delete(task.key); task.resolve(); drain()
    })
  }
}
export function prefetchDetail(router, type, id) {
  if (!valid(type, id) || !canPreloadRoutes() || !isRouteAvailable(getMaintenanceSnapshot().settings, type)) return Promise.resolve()
  const key = type + ':' + id
  if (tasks.has(key)) return tasks.get(key).promise
  if (queue.length >= 4) { const old = queue.shift(); tasks.delete(old.key); old.resolve() }
  let resolve
  const promise = new Promise(done => { resolve = done })
  const task = {key, router, type, id, promise, resolve}
  tasks.set(key, task); queue.push(task); drain()
  return promise
}
