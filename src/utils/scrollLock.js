/**
 * scrollLock.js — 支持嵌套的底层滚动锁
 *
 * 背景：详情悬浮层、登录弹窗、限制弹窗等可能同时/嵌套出现。
 * 如果用「记录原始 overflow -> 关闭时还原」的单层实现，内层弹窗关闭会
 * 提前把 overflow 还原，导致外层弹窗仍在时底层可以滚动。
 *
 * 这里用计数器：第一次 lock 才真正写 overflow:hidden，最后一次 unlock 才还原。
 * 内层 unlock 只减计数，不会提前解除外层锁定。
 */

let lockCount = 0
let savedOverflow = ''
let savedPaddingRight = ''
let savedScrollY = 0

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/** 加锁一次（可嵌套）。 */
export function lockScroll() {
  if (!isBrowser()) return
  if (lockCount === 0) {
    const body = document.body
    savedOverflow = body.style.overflow
    savedPaddingRight = body.style.paddingRight
    savedScrollY = window.scrollY || 0

    // 全局已隐藏滚动条（App.vue: ::-webkit-scrollbar{display:none}），
    // 正常 scrollbarWidth 为 0；仍做一次补偿以防某些环境显示滚动条造成布局抖动。
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }
  }
  lockCount += 1
}

/** 解锁一次（可嵌套）。只有计数归零才真正还原。 */
export function unlockScroll() {
  if (!isBrowser()) return
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount === 0) {
    const body = document.body
    body.style.overflow = savedOverflow || ''
    body.style.paddingRight = savedPaddingRight || ''
  }
}

/** 强制释放全部锁（用于路由异常兜底，避免锁死）。 */
export function resetScrollLock() {
  if (!isBrowser()) return
  lockCount = 0
  const body = document.body
  body.style.overflow = savedOverflow || ''
  body.style.paddingRight = savedPaddingRight || ''
}

/** 当前锁计数（调试/断言用）。 */
export function getScrollLockCount() {
  return lockCount
}

/** 记录加锁前的滚动位置，供需要时恢复。 */
export function getSavedScrollY() {
  return savedScrollY
}
