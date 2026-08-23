/**
 * 应用启动引导：把开屏进度条绑定到真实的网络加载过程，
 * 而不是几个一次性跳变的时间节点。
 *
 * 分两段，都是真实存在、会随时间连续变化的信号：
 *
 * 阶段一（0-70%）：应用外壳的关键资源（index.html 里直接引用的
 * <script>/<link>）逐个下载完成 —— 用 PerformanceObserver 监听
 * 'resource' 条目，每完成一个真实请求就推进一点，而不是估算时间。
 *
 * 阶段二（70-100%）：当前路由的异步组件 chunk 下载解析完成
 * （router.isReady()）+ 字体加载完成（document.fonts.ready）+
 * 浏览器完成首帧绘制（rAF）。这三者本身耗时可能很短，但都是
 * "这个具体页面能显示了"之前必须发生的真实前置条件。
 */

const SHELL_WEIGHT = 70
const ROUTE_WEIGHT = 30

function getCriticalShellResourceUrls() {
  const selector = 'script[src], link[rel="stylesheet"], link[rel="modulepreload"]'
  return new Set(
    Array.from(document.querySelectorAll(selector))
      .map((el) => el.src || el.href)
      .filter(Boolean),
  )
}

/**
 * 追踪应用外壳关键资源的真实下载进度。
 * 每当浏览器报告某个资源的请求真正完成（Resource Timing 的
 * responseEnd 有值），就记一次；总数是当前文档里实际引用的
 * 资源数量，不是编造的数字。
 */
function trackShellResourceProgress(onStep) {
  const targets = getCriticalShellResourceUrls()
  if (!targets.size) {
    onStep(1)
    return () => {}
  }

  const loaded = new Set()
  const total = targets.size

  const markIfMatched = (entry) => {
    if (!targets.has(entry.name) || loaded.has(entry.name)) return
    // responseEnd === 0 说明浏览器还没真正收到完整响应
    if (!entry.responseEnd) return
    loaded.add(entry.name)
    onStep(loaded.size / total)
  }

  // 有些资源在 observer 建立前就已经加载完了，先补一遍
  performance.getEntriesByType('resource').forEach(markIfMatched)

  let observer = null
  if (typeof PerformanceObserver !== 'undefined') {
    observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(markIfMatched)
    })
    try {
      observer.observe({ type: 'resource', buffered: true })
    } catch {
      observer = null
    }
  }

  // 兜底：3 秒后即便还有资源没触发 observer 回调也不再等待
  const fallbackTimer = setTimeout(() => onStep(1), 3000)

  return () => {
    observer?.disconnect()
    clearTimeout(fallbackTimer)
  }
}

function waitRouterReady(router) {
  if (!router || typeof router.isReady !== 'function') return Promise.resolve()
  return router.isReady().catch(() => {})
}

function waitFontsReady() {
  if (typeof document === 'undefined' || !document.fonts?.ready) {
    return Promise.resolve()
  }
  return document.fonts.ready.catch(() => {})
}

function waitNextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

/**
 * @param {object} options
 * @param {import('vue-router').Router} options.router
 * @param {(progress: number, stepLabel: string) => void} options.onProgress
 * @returns {Promise<void>}
 */
export async function runAppBootstrap({ router, onProgress } = {}) {
  let shellRatio = 0
  const report = (label) => {
    const value = shellRatio * SHELL_WEIGHT
    onProgress?.(value, label)
  }

  report('正在加载资源')
  const stopTracking = trackShellResourceProgress((ratio) => {
    shellRatio = ratio
    report('正在加载资源')
  })

  // 关键资源全部下载完成后再进入下一阶段；shell 资源通常很快，
  // 但在弱网下会真实地把这一段拉长，这正是我们想要的效果。
  await new Promise((resolve) => {
    const check = () => {
      if (shellRatio >= 1) {
        resolve()
        return
      }
      requestAnimationFrame(check)
    }
    check()
  })
  stopTracking()

  report('准备页面内容')
  await waitRouterReady(router)
  onProgress?.(SHELL_WEIGHT + ROUTE_WEIGHT * 0.6, '准备页面内容')

  await waitFontsReady()
  onProgress?.(SHELL_WEIGHT + ROUTE_WEIGHT * 0.85, '准备页面内容')

  await waitNextPaint()
  onProgress?.(100, '完成')
}
