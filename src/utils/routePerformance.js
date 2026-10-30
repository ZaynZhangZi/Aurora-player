const componentPreloads = new WeakMap()

export function getKeepAliveRouteNames(records) {
  return [...new Set(records.filter(record => record.meta?.keepAlive)
    .map(record => record.meta.keepAliveName || record.name).filter(Boolean))]
}

export function canPreloadRoutes() {
  if (typeof window === 'undefined' || globalThis.document?.hidden) return false
  const connection = globalThis.navigator?.connection
  return !connection?.saveData && !/(^|-)2g$/.test(connection?.effectiveType || '')
}

// Intent and idle preloads share one request. Only import page code: API calls
// and page effects still begin when Vue mounts the destination.
export function preloadRouteComponent(router, location) {
  if (!router?.resolve || !canPreloadRoutes()) return Promise.resolve()
  let records
  try { records = router.resolve(location).matched } catch { return Promise.resolve() }
  let pending = componentPreloads.get(router)
  if (!pending) { pending = new Map(); componentPreloads.set(router, pending) }
  return Promise.all((records || []).flatMap(record => Object.values(record.components || {}))
    .filter(component => typeof component === 'function')
    .map(load => {
      if (!pending.has(load)) {
        pending.set(load, Promise.resolve().then(load).catch(() => {
          pending.delete(load) // A real navigation or another hover can retry.
        }))
      }
      return pending.get(load)
    }))
}
