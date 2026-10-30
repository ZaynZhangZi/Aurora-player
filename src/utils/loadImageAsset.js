// Optional artwork must settle and release its listeners, even on a stalled CDN.
export function loadImageAsset(src, {signal, timeoutMs = 4000, crossOrigin} = {}) {
  if (!src || signal?.aborted) return Promise.resolve(null)
  return new Promise(resolve => {
    const image = new Image()
    let settled = false
    let timer
    const finish = success => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      image.onload = image.onerror = null
      if (!success) image.removeAttribute('src')
      resolve(success ? image : null)
    }
    const abort = () => finish(false)
    if (crossOrigin) image.crossOrigin = crossOrigin
    image.referrerPolicy = 'no-referrer'
    image.onload = () => finish(true)
    image.onerror = abort
    signal?.addEventListener('abort', abort, {once: true})
    timer = setTimeout(abort, timeoutMs)
    image.src = src
  })
}
