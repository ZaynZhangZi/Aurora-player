// Only resources required by the current page belong on the startup path.
import {canPreloadRoutes, preloadRouteComponent} from './routePerformance.js'

const routePreloads = new WeakMap()

function waitFor(task, timeout, signal) {
  return new Promise(resolve => {
    let timer
    const finish = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', finish)
      resolve()
    }
    if (signal?.aborted) return finish()
    signal?.addEventListener('abort', finish, {once: true})
    timer = setTimeout(finish, timeout)
    Promise.resolve(task).then(finish, finish)
  })
}

function waitForShell(onProgress, signal) {
  const targets = new Set(
    [...document.querySelectorAll('script[src], link[rel="stylesheet"], link[rel="modulepreload"]')]
      .map(el => el.src || el.href).filter(Boolean),
  )
  const loaded = new Set()
  let observer
  let complete
  const ready = new Promise(resolve => { complete = resolve })
  const mark = entry => {
    if (!targets.has(entry.name) || loaded.has(entry.name) || !entry.responseEnd) return
    loaded.add(entry.name)
    onProgress?.(loaded.size / targets.size * 70, '正在加载资源')
    if (loaded.size === targets.size) complete()
  }
  onProgress?.(0, '正在加载资源')
  if (!targets.size) complete()
  performance.getEntriesByType('resource').forEach(mark)
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      observer = new PerformanceObserver(list => list.getEntries().forEach(mark))
      observer.observe({type: 'resource', buffered: true})
    } catch {
      observer?.disconnect()
    }
  }
  return waitFor(ready, 3000, signal).finally(() => observer?.disconnect())
}

// Warm common destinations after first paint, one at a time. Slow connections
// keep on-demand loading so background requests cannot compete with music.
export function preloadRouteComponents(router) {
  if (!router?.getRoutes || typeof window === 'undefined') return Promise.resolve()
  if (routePreloads.has(router)) return routePreloads.get(router)
  if (!canPreloadRoutes()) return Promise.resolve()

  const preload = (async () => {
    await router.isReady().catch(() => {})
    await new Promise(resolve => setTimeout(resolve, 2000))
    for (const name of ['home', 'discover', 'search']) {
      if (document.hidden) break
      await new Promise(resolve => {
        if (window.requestIdleCallback) window.requestIdleCallback(resolve, {timeout: 2000})
        else setTimeout(resolve, 100)
      })
      if (document.hidden || router.currentRoute.value.name === name) continue
      await preloadRouteComponent(router, {name})
    }
  })()
  routePreloads.set(router, preload)
  return preload
}

export async function runAppBootstrap({router, playerReady, onProgress, signal} = {}) {
  // A slow lyrics provider or a failed theme download must not hold the page.
  const player = waitFor(playerReady, 3500, signal)
  await waitForShell(onProgress, signal)
  if (signal?.aborted) return
  onProgress?.(70, '准备页面内容')
  await router?.isReady?.().catch(() => {})
  if (signal?.aborted) return
  onProgress?.(85, '正在准备播放器')
  // Optional webfonts must not leave the application behind its splash screen.
  await Promise.all([player, waitFor(document.fonts?.ready, 1200, signal)])
  if (signal?.aborted) return
  let frame = 0
  const painted = new Promise(resolve => {
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(resolve) })
  })
  await waitFor(painted, 100, signal)
  cancelAnimationFrame(frame)
  if (!signal?.aborted) onProgress?.(100, '已就绪')
}
