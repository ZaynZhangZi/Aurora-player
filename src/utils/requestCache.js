import {ExpiringCache} from './expiringCache.js'

const aborted = () => new DOMException('请求已取消', 'AbortError')
const clone = value => typeof globalThis.structuredClone === 'function'
  ? globalThis.structuredClone(value) : value === undefined ? undefined : JSON.parse(JSON.stringify(value))

// Each consumer owns its cancellation; a hover preload and a mounted page may
// share a request without either consumer canceling the other's work.
export function createRequestCache({max = 24, ttl = 20000, now = Date.now} = {}) {
  const values = new ExpiringCache({max, ttl, now})
  const pending = new Map()
  function clear() {
    values.clear()
    for (const entry of pending.values()) entry.controller.abort()
    pending.clear()
  }
  function load(key, fetchValue, {signal} = {}) {
    if (signal?.aborted) return Promise.reject(aborted())
    const cached = values.get(key)
    if (cached !== undefined) return Promise.resolve(clone(cached))
    let entry = pending.get(key)
    if (!entry || entry.controller.signal.aborted) {
      const controller = new AbortController()
      entry = {controller, consumers: new Set(), settled: false}
      const current = entry
      entry.promise = Promise.resolve().then(() => {
        if (controller.signal.aborted) throw aborted()
        return fetchValue(controller.signal)
      }).then(value => {
        if (controller.signal.aborted) throw aborted()
        if (pending.get(key) === current) values.set(key, clone(value))
        return value
      }).finally(() => {
        current.settled = true
        if (pending.get(key) === current) pending.delete(key)
      })
      pending.set(key, entry)
    }
    const current = entry
    return new Promise((resolve, reject) => {
      const consumer = {}
      current.consumers.add(consumer)
      const release = () => {
        signal?.removeEventListener('abort', cancel)
        current.consumers.delete(consumer)
        if (!current.settled && !current.consumers.size) current.controller.abort()
      }
      const cancel = () => { release(); reject(aborted()) }
      signal?.addEventListener('abort', cancel, {once: true})
      current.promise.then(value => {
        if (!signal?.aborted) { release(); resolve(clone(value)) }
      }, error => { release(); reject(error) })
    })
  }
  function invalidate(key) {
    values.delete(key)
    const entry = pending.get(key)
    if (entry) { pending.delete(key); entry.controller.abort() }
  }
  return {load, clear, invalidate}
}
