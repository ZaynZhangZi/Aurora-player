/**
 * 性能优化工具集
 * 解决卡顿问题的核心优化函数
 */

// 1. 节流函数 - 限制高频事件触发
export function throttle(func, wait = 16) {
  let timeout = null
  let previous = 0

  return function(...args) {
    const now = Date.now()
    const remaining = wait - (now - previous)

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      func.apply(this, args)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now()
        timeout = null
        func.apply(this, args)
      }, remaining)
    }
  }
}

// 2. 防抖函数 - 延迟执行
export function debounce(func, wait = 200) {
  let timeout = null

  return function(...args) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

// 3. 请求动画帧节流 - 保证最多一帧一次
export function rafThrottle(func) {
  let rafId = null
  let lastArgs = null

  return function(...args) {
    lastArgs = args
    if (rafId) return

    rafId = requestAnimationFrame(() => {
      func.apply(this, lastArgs)
      rafId = null
    })
  }
}

// 4. 图片懒加载观察器
let imageObserver = null

export function createImageObserver(callback) {
  if (imageObserver) return imageObserver

  if ('IntersectionObserver' in window) {
    imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback(entry.target)
            imageObserver.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '50px', // 提前 50px 加载
        threshold: 0.01,
      }
    )
  }

  return imageObserver
}

// 5. 检测设备性能等级
export function detectDevicePerformance() {
  // 检测硬件并发数
  const cores = navigator.hardwareConcurrency || 2

  // 检测内存（如果可用）
  const memory = navigator.deviceMemory || 4

  // 检测是否为移动设备
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  // 综合评分
  let score = 0
  score += Math.min(cores / 2, 4) // 最多 4 分
  score += Math.min(memory / 2, 3) // 最多 3 分
  score += isMobile ? 0 : 3 // 桌面设备加 3 分

  // 返回性能等级
  if (score >= 8) return 'high'    // 高性能设备
  if (score >= 5) return 'medium'  // 中等设备
  return 'low'                     // 低性能设备
}

// 6. 动态降级配置
export function getOptimizedConfig() {
  const performance = detectDevicePerformance()
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return {
    // 粒子效果数量
    particleCount: prefersReducedMotion ? 0 : {
      high: 52,
      medium: 24,
      low: 12,
    }[performance],

    // 动画持续时间
    animationDuration: prefersReducedMotion ? 100 : {
      high: 520,
      medium: 320,
      low: 200,
    }[performance],

    // 是否启用复杂动画
    enableComplexAnimations: !prefersReducedMotion && performance !== 'low',

    // Canvas DPR（设备像素比）
    canvasDPR: {
      high: Math.min(window.devicePixelRatio, 2),
      medium: Math.min(window.devicePixelRatio, 1.5),
      low: 1,
    }[performance],

    // 图片质量
    imageQuality: {
      high: 'original',
      medium: 'high',
      low: 'medium',
    }[performance],

    // 是否启用视频自动播放
    enableVideoAutoplay: performance === 'high',

    // 滚动容器虚拟化阈值
    virtualScrollThreshold: {
      high: 100,
      medium: 50,
      low: 30,
    }[performance],
  }
}

// 7. 内存清理助手
export class MemoryManager {
  constructor() {
    this.timers = new Set()
    this.observers = new Set()
    this.animationFrames = new Set()
    this.eventListeners = new Map()
  }

  // 注册定时器
  setTimeout(fn, delay) {
    const id = window.setTimeout(() => {
      this.timers.delete(id)
      fn()
    }, delay)
    this.timers.add(id)
    return id
  }

  setInterval(fn, interval) {
    const id = window.setInterval(fn, interval)
    this.timers.add(id)
    return id
  }

  // 注册动画帧
  requestAnimationFrame(fn) {
    const id = window.requestAnimationFrame(() => {
      this.animationFrames.delete(id)
      fn()
    })
    this.animationFrames.add(id)
    return id
  }

  // 注册观察器
  addObserver(observer) {
    this.observers.add(observer)
    return observer
  }

  // 注册事件监听
  addEventListener(target, type, listener, options) {
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, [])
    }
    this.eventListeners.get(target).push({ type, listener, options })
    target.addEventListener(type, listener, options)
  }

  // 清理所有资源
  cleanup() {
    // 清理定时器
    this.timers.forEach((id) => {
      clearTimeout(id)
      clearInterval(id)
    })
    this.timers.clear()

    // 清理动画帧
    this.animationFrames.forEach((id) => {
      cancelAnimationFrame(id)
    })
    this.animationFrames.clear()

    // 清理观察器
    this.observers.forEach((observer) => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect()
      }
    })
    this.observers.clear()

    // 清理事件监听
    this.eventListeners.forEach((listeners, target) => {
      listeners.forEach(({ type, listener, options }) => {
        target.removeEventListener(type, listener, options)
      })
    })
    this.eventListeners.clear()
  }
}

// 8. FPS 监控（开发环境）
export class FPSMonitor {
  constructor(callback) {
    this.callback = callback
    this.frames = []
    this.lastTime = performance.now()
    this.rafId = null
    this.isRunning = false
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.tick()
  }

  stop() {
    this.isRunning = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  tick() {
    if (!this.isRunning) return

    const now = performance.now()
    const delta = now - this.lastTime
    this.lastTime = now

    this.frames.push(delta)
    if (this.frames.length > 60) {
      this.frames.shift()
    }

    // 每秒计算一次
    if (this.frames.length === 60) {
      const avgDelta = this.frames.reduce((a, b) => a + b, 0) / 60
      const fps = Math.round(1000 / avgDelta)
      this.callback(fps)
    }

    this.rafId = requestAnimationFrame(() => this.tick())
  }
}

// 9. 空闲时执行任务
export function runWhenIdle(task, options = {}) {
  const { timeout = 2000 } = options

  if ('requestIdleCallback' in window) {
    return requestIdleCallback(task, { timeout })
  }

  // 降级方案
  return setTimeout(task, 1)
}

// 10. 批量 DOM 更新
export class BatchUpdater {
  constructor() {
    this.pending = []
    this.rafId = null
  }

  add(fn) {
    this.pending.push(fn)
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.flush())
    }
  }

  flush() {
    const tasks = this.pending.slice()
    this.pending = []
    this.rafId = null

    // 批量执行
    tasks.forEach((task) => {
      try {
        task()
      } catch (error) {
        console.error('[BatchUpdater] Task failed:', error)
      }
    })
  }
}
