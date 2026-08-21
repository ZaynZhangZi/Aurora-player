/**
 * 性能调试工具
 * 用于开发环境快速定位性能问题
 */

let perfMonitor = null

export function startPerformanceMonitoring() {
  if (import.meta.env.PROD) return

  console.log('%c🚀 Performance Monitoring Started', 'color: #10b981; font-weight: bold; font-size: 14px')

  // 1. FPS 监控
  let frames = []
  let lastTime = performance.now()
  let fpsWarningCount = 0

  function monitorFPS() {
    const now = performance.now()
    const delta = now - lastTime
    lastTime = now

    frames.push(delta)
    if (frames.length > 60) {
      frames.shift()
      const avgDelta = frames.reduce((a, b) => a + b, 0) / 60
      const fps = Math.round(1000 / avgDelta)

      if (fps < 30) {
        fpsWarningCount++
        if (fpsWarningCount > 5) {
          console.warn(`⚠️ Low FPS detected: ${fps} FPS`)
          fpsWarningCount = 0
        }
      }
    }

    requestAnimationFrame(monitorFPS)
  }

  monitorFPS()

  // 2. 内存监控
  if (performance.memory) {
    setInterval(() => {
      const used = Math.round(performance.memory.usedJSHeapSize / 1048576)
      const total = Math.round(performance.memory.totalJSHeapSize / 1048576)
      const limit = Math.round(performance.memory.jsHeapSizeLimit / 1048576)

      if (used > limit * 0.9) {
        console.error(`🔴 Memory Critical: ${used}MB / ${limit}MB`)
      } else if (used > limit * 0.7) {
        console.warn(`⚠️ Memory High: ${used}MB / ${limit}MB`)
      }

      // 每 30 秒记录一次
    }, 30000)
  }

  // 3. 长任务监控
  if ('PerformanceObserver' in window) {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn(`⚠️ Long Task: ${entry.duration.toFixed(2)}ms`, entry.name)
          }
        }
      })
      longTaskObserver.observe({ entryTypes: ['longtask', 'measure'] })
    } catch (e) {
      console.log('Long task monitoring not supported')
    }
  }

  // 4. 网络请求监控
  if ('PerformanceObserver' in window) {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 1000) {
            console.warn(`⚠️ Slow Request: ${entry.name} took ${entry.duration.toFixed(0)}ms`)
          }
        }
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
    } catch (e) {
      console.log('Resource monitoring not supported')
    }
  }

  // 5. 提供全局调试命令
  window.__PERF_DEBUG__ = {
    getMemoryInfo() {
      if (!performance.memory) {
        console.log('Memory API not available')
        return
      }
      const used = Math.round(performance.memory.usedJSHeapSize / 1048576)
      const total = Math.round(performance.memory.totalJSHeapSize / 1048576)
      const limit = Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      console.table({
        'Used Memory': `${used} MB`,
        'Total Memory': `${total} MB`,
        'Memory Limit': `${limit} MB`,
        'Usage': `${Math.round((used / limit) * 100)}%`,
      })
    },

    forceGC() {
      if (window.gc) {
        console.log('🗑️ Forcing garbage collection...')
        window.gc()
        console.log('✅ GC completed')
      } else {
        console.log('⚠️ GC not available. Run Chrome with --js-flags="--expose-gc"')
      }
    },

    measureRender(name = 'render') {
      performance.mark(`${name}-start`)
      requestAnimationFrame(() => {
        performance.mark(`${name}-end`)
        performance.measure(name, `${name}-start`, `${name}-end`)
        const measure = performance.getEntriesByName(name)[0]
        console.log(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`)
        performance.clearMarks()
        performance.clearMeasures()
      })
    },

    getDeviceInfo() {
      console.table({
        'User Agent': navigator.userAgent,
        'CPU Cores': navigator.hardwareConcurrency || 'Unknown',
        'Device Memory': navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown',
        'Connection': navigator.connection?.effectiveType || 'Unknown',
        'Device Pixel Ratio': window.devicePixelRatio,
      })
    },

    help() {
      console.log(`
%c🛠️ Performance Debug Commands:

__PERF_DEBUG__.getMemoryInfo()  - Show memory usage
__PERF_DEBUG__.forceGC()        - Force garbage collection (requires --expose-gc)
__PERF_DEBUG__.measureRender()  - Measure next render time
__PERF_DEBUG__.getDeviceInfo()  - Show device capabilities
__PERF_DEBUG__.help()           - Show this help

`, 'color: #3b82f6; font-family: monospace')
    },
  }

  console.log('%cType __PERF_DEBUG__.help() for debug commands', 'color: #6b7280; font-style: italic')
}

// 导出性能测量装饰器
export function measurePerformance(name) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args) {
      const start = performance.now()
      try {
        const result = await originalMethod.apply(this, args)
        const duration = performance.now() - start

        if (duration > 100 && import.meta.env.DEV) {
          console.warn(`⚠️ ${name || propertyKey} took ${duration.toFixed(2)}ms`)
        }

        return result
      } catch (error) {
        console.error(`❌ ${name || propertyKey} failed:`, error)
        throw error
      }
    }

    return descriptor
  }
}
