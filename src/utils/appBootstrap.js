/**
 * 应用启动引导：把开屏进度条绑定到真实存在的异步节点上，
 * 而不是编造一个和实际加载无关的动画数字。
 *
 * 每一步都是浏览器/框架层面真实会发生的异步过程：
 * 1. 路由就绪 —— 首个路由的异步组件 chunk 下载 + 解析完成
 * 2. 字体就绪 —— 避免切换字体导致的闪烁（FOUT）
 * 3. 首帧绘制 —— 等浏览器真正把内容画到屏幕上
 */

const STEPS = [
  { key: 'router', label: '正在启动', weight: 45 },
  { key: 'fonts', label: '加载资源', weight: 35 },
  { key: 'paint', label: '准备就绪', weight: 20 },
]

function waitRouterReady(router) {
  if (!router || typeof router.isReady !== 'function') return Promise.resolve()
  return router.isReady().catch(() => {})
}

function waitFontsReady() {
  if (typeof document === 'undefined' || !document.fonts?.ready) {
    return Promise.resolve()
  }
  // fonts.ready 在字体全部加载/布局完成后 resolve，属于浏览器真实信号
  return document.fonts.ready.catch(() => {})
}

function waitNextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

/**
 * 依次等待每个真实的启动节点，并在每一步完成时上报累计进度。
 *
 * @param {object} options
 * @param {import('vue-router').Router} options.router
 * @param {(progress: number, stepLabel: string) => void} options.onProgress
 * @returns {Promise<void>}
 */
export async function runAppBootstrap({ router, onProgress } = {}) {
  let completed = 0

  const report = (label) => {
    onProgress?.(Math.round(completed), label)
  }

  for (const step of STEPS) {
    report(step.label)
    if (step.key === 'router') await waitRouterReady(router)
    else if (step.key === 'fonts') await waitFontsReady()
    else if (step.key === 'paint') await waitNextPaint()

    completed += step.weight
    report(step.label)
  }
}
