/**
 * heroTransition.js — 通用 Hero 过渡引擎
 *
 * 核心理念：跨路由页面之间，让一个 DOM 元素从「源页面位置」平滑飞到「目标页面位置」。
 *
 * 用法：
 *   1. 发起方（如首页歌单卡片）：捕获封面 getBoundingClientRect → setPendingTransition()
 *   2. 目标方（如歌单详情页 onMounted）：consumePendingTransition() → playHeroEnter()
 *
 * namespace 参数让不同业务类型（playlist/album/artist）在同一 Map 中共存而不冲突。
 */

// ─── 内部状态 ───────────────────────────────────────────────
// Map<`${namespace}:${id}`, PendingPayload>
const pendingMap = new Map()

function makeKey(namespace, id) {
  return `${String(namespace)}:${String(id)}`
}

// ─── 工具函数 ────────────────────────────────────────────────

function toRect(rect) {
  if (!rect) return null
  const left = Number(rect.left)
  const top = Number(rect.top)
  const width = Number(rect.width)
  const height = Number(rect.height)
  if (![left, top, width, height].every(Number.isFinite)) return null
  if (width <= 0 || height <= 0) return null
  return { left, top, width, height }
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function waitFrames(count = 1) {
  return new Promise((resolve) => {
    let left = Math.max(1, Number(count) || 1)
    const tick = () => {
      left -= 1
      if (left <= 0) {
        resolve()
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

// ─── 状态管理 API ────────────────────────────────────────────

/**
 * 记录一次将要发生的 Hero 过渡。
 * 目标页面 onMounted 时通过 consumePendingTransition / consumeLatest 消费。
 *
 * @param {string} namespace  业务命名空间，如 'playlist' / 'album' / 'artist'
 * @param {number|string} id  目标对象的唯一 ID
 * @param {object} payload
 * @param {DOMRect|object} [payload.coverRect]  源元素 getBoundingClientRect()
 * @param {string} [payload.coverSrc]            封面图片 URL（仅透传，不处理）
 * @param {string} [payload.name]                名称（仅透传，不处理）
 * @param {*}      [...]                         透传的其他字段
 */
export function setPendingTransition(namespace, id, payload = {}) {
  const num = Number(id)
  if (!Number.isFinite(num) || num <= 0) return

  const key = makeKey(namespace, id)
  pendingMap.set(key, {
    ns: String(namespace),
    id: num,
    coverRect: toRect(payload.coverRect),
    coverSrc: String(payload.coverSrc || ''),
    name: String(payload.name || payload.playlistName || ''),
    at: Date.now(),
  })
}

/**
 * 消费指定 namespace + id 的待处理过渡。
 * 消费后删除，不会重复触发。
 *
 * @param {string} namespace
 * @param {number|string} id
 * @param {{ maxAge?: number }} options
 * @returns {object|null} payload 或 null
 */
export function consumePendingTransition(namespace, id, { maxAge = 2500 } = {}) {
  const num = Number(id)
  if (!Number.isFinite(num) || num <= 0) return null

  const key = makeKey(namespace, id)
  const payload = pendingMap.get(key)
  pendingMap.delete(key)

  if (!payload) return null
  if (Date.now() - Number(payload.at || 0) > maxAge) return null
  return payload
}

/**
 * 消费最新的（最近写入的）待处理过渡。
 * 若不知道具体 id 时使用，比如返回首页时「不管点了哪个，飞回去就行」。
 *
 * @param {string} namespace
 * @param {{ maxAge?: number }} options
 * @returns {object|null}
 */
export function consumeLatestPendingTransition(namespace, { maxAge = 2500 } = {} ) {
  let latestKey = null
  let latestPayload = null

  pendingMap.forEach((payload, key) => {
    if (!key.startsWith(`${namespace}:`)) return

    const createdAt = Number(payload?.at || 0)
    if (Date.now() - createdAt > maxAge) {
      pendingMap.delete(key)
      return
    }

    if (!latestPayload || createdAt > Number(latestPayload.at || 0)) {
      latestPayload = payload
      latestKey = key
    }
  })

  if (!latestPayload || latestKey === null) return null
  pendingMap.delete(latestKey)
  return latestPayload
}

/**
 * 预览指定 id 的待处理过渡（不消费），用于提前拿到封面/名称等元数据。
 *
 * @param {string} namespace
 * @param {number|string} id
 * @param {{ maxAge?: number }} options
 * @returns {object|null}
 */
export function peekPendingTransition(namespace, id, { maxAge = 2500 } = {}) {
  const num = Number(id)
  if (!Number.isFinite(num) || num <= 0) return null

  const key = makeKey(namespace, id)
  const payload = pendingMap.get(key)
  if (!payload) return null
  if (Date.now() - Number(payload.at || 0) > maxAge) {
    pendingMap.delete(key)
    return null
  }
  return payload
}

// ─── 动画执行 API ────────────────────────────────────────────

/**
 * 播放 Hero 飞入动画。
 *
 * @param {object} options
 * @param {object}  options.payload          — consume/peek 拿到的 payload（需要 coverRect）
 * @param {Element} [options.targetCardEl]   — 目标卡片容器（未使用，保留兼容）
 * @param {Element}  options.targetCoverEl   — 目标封面元素（将作为动画目标）
 * @param {number}  [options.duration=680]   — 动画时长 ms
 * @param {string}  [options.easing='cubic-bezier(0.34, 1.18, 0.64, 1)'] — 弹性缓动
 * @param {string}  [options.overlayColor='rgba(0, 0, 0, 0.06)'] — 遮罩颜色
 * @param {number}  [options.overlayDurationRatio=0.72] — 遮罩动画占主动画的比例
 */
export async function playHeroEnter({
  payload,
  targetCardEl,
  targetCoverEl,
  duration = 680,
  easing = 'cubic-bezier(0.34, 1.18, 0.64, 1)',
  overlayColor = 'rgba(0, 0, 0, 0.06)',
  overlayDurationRatio = 0.72,
} = {}) {
  void targetCardEl
  if (!payload || !targetCoverEl || prefersReducedMotion()) return

  const from = payload.coverRect
  if (!from) return

  // 先获取目标位置，不等待帧
  const to = toRect(targetCoverEl.getBoundingClientRect())
  if (!to) return

  const dx = from.left - to.left
  const dy = from.top - to.top
  const sx = from.width / to.width
  const sy = from.height / to.height

  // 立即设置初始变换，避免 waitFrames 期间暴露自然位置
  targetCoverEl.style.transformOrigin = 'top left'
  targetCoverEl.style.willChange = 'transform, opacity'
  targetCoverEl.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
  targetCoverEl.style.opacity = '0.98'

  await waitFrames(2)

  // 全屏遮罩层（极小透明度，增强视觉聚焦）
  const overlay = document.createElement('div')
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.background = overlayColor
  overlay.style.opacity = '0'
  overlay.style.pointerEvents = 'none'
  overlay.style.zIndex = '1200'
  overlay.style.willChange = 'opacity'
  document.body.appendChild(overlay)

  const animations = [
    targetCoverEl.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.98 },
        { transform: 'translate(0px, 0px) scale(1, 1)', opacity: 1 },
      ],
      { duration, easing, fill: 'both' },
    ),
    overlay.animate(
      [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }],
      { duration: Math.round(duration * overlayDurationRatio), easing, fill: 'both' },
    ),
  ]

  try {
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})))
  } finally {
    targetCoverEl.style.willChange = ''
    targetCoverEl.style.transformOrigin = ''
    targetCoverEl.style.transform = ''
    targetCoverEl.style.opacity = ''
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
  }
}
