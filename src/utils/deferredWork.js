export function waitForIdle({signal, timeout = 1000} = {}) {
  return new Promise(resolve => {
    let handle
    const idle = typeof window !== 'undefined' && !!window.requestIdleCallback
    const finish = () => {
      signal?.removeEventListener('abort', finish)
      if (idle) window.cancelIdleCallback?.(handle); else clearTimeout(handle)
      resolve(!signal?.aborted)
    }
    if (signal?.aborted) { finish(); return }
    signal?.addEventListener('abort', finish, {once: true})
    handle = idle ? window.requestIdleCallback(finish, {timeout}) : setTimeout(finish, 80)
  })
}

export function runWhenVisible(element, work, {signal} = {}) {
  const controller = new AbortController()
  let observer, scheduled = false, visible = !element || typeof IntersectionObserver === 'undefined', completed = false
  const cleanup = () => {
    observer?.disconnect()
    document.removeEventListener('visibilitychange', attempt)
    signal?.removeEventListener('abort', stop)
  }
  function stop() { controller.abort(); cleanup() }
  function attempt() {
    if (completed || scheduled || !visible || document.hidden || controller.signal.aborted) return
    scheduled = true
    void waitForIdle({signal: controller.signal}).then(ready => {
      scheduled = false
      if (!ready || completed || document.hidden || !visible) return
      completed = true; cleanup()
      return work()
    }).catch(() => {})
  }
  if (signal?.aborted) return stop
  signal?.addEventListener('abort', stop, {once: true})
  document.addEventListener('visibilitychange', attempt)
  if (!visible) {
    observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); attempt() }, {rootMargin: '300px'})
    observer.observe(element)
  }
  attempt()
  return stop
}
