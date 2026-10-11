import {checkShareExportAborted, drawLyricShareCard, prepareLyricShareRender} from './lyricShareImage.js'
import {SHARE_GIF_DURATION, SHARE_GIF_FRAME_COUNT, SHARE_GIF_FRAME_DELAY, shareGifExportSize, shareGifFrameMotion} from './lyricShareGifMotion.js'

const abortError = () => new DOMException('GIF 生成已取消', 'AbortError')

export function createGifWorkerClient(worker, signal) {
  let pending = null
  let timer = null
  let disposed = false
  function settle(error, value) {
    clearTimeout(timer)
    timer = null
    const task = pending
    pending = null
    if (error) task?.reject(error)
    else task?.resolve(value)
  }
  function dispose(error = abortError()) {
    if (disposed) return
    disposed = true
    signal?.removeEventListener('abort', onAbort)
    settle(error)
    worker.onmessage = worker.onerror = worker.onmessageerror = null
    worker.terminate()
  }
  function onAbort() { dispose() }
  worker.onmessage = ({data}) => {
    if (!pending) return
    if (data?.type === 'error') dispose(new Error(data.error || 'GIF 生成失败，请重试。'))
    else if (data?.type !== pending.expected) dispose(new Error('GIF 生成响应无效，请重试。'))
    else settle(null, data)
  }
  worker.onerror = event => { event.preventDefault?.(); dispose(new Error('GIF 编码线程未能启动，请刷新后重试。')) }
  worker.onmessageerror = () => dispose(new Error('GIF 帧传输失败，请重试。'))
  signal?.addEventListener('abort', onAbort, {once: true})
  if (signal?.aborted) dispose()
  return {
    exchange(message, expected, transfer = []) {
      if (disposed) return Promise.reject(abortError())
      if (pending) return Promise.reject(new Error('GIF 编码正在进行，请稍候。'))
      return new Promise((resolve, reject) => {
        pending = {resolve, reject, expected}
        timer = setTimeout(() => dispose(new Error('GIF 生成超时，请降低清晰度后重试。')), 30000)
        try { worker.postMessage(message, transfer) } catch (error) { dispose(error) }
      })
    },
    dispose,
  }
}

export async function renderLyricShareGif(song, lines, options, {signal, onProgress, reducedMotion = false, workerFactory = () => new Worker(new URL('../workers/lyricShareGif.worker.js', import.meta.url), {type: 'module'})} = {}) {
  checkShareExportAborted(signal)
  const render = await prepareLyricShareRender(song, lines, options, {signal, sizeForLayout: shareGifExportSize})
  checkShareExportAborted(signal)
  let client = null
  try {
    client = createGifWorkerClient(workerFactory(), signal)
    const {canvas, ctx, layout, size} = render
    const sampleCanvas = document.createElement('canvas')
    sampleCanvas.width = 128
    sampleCanvas.height = Math.min(256, Math.max(1, Math.round(size.height / size.width * 128)))
    const sampleContext = sampleCanvas.getContext('2d', {willReadFrequently: true})
    if (!sampleContext) throw new Error('当前浏览器不支持生成 GIF。')
    const sampleLength = sampleCanvas.width * sampleCanvas.height * 4
    const samples = new Uint8Array(sampleLength * 3)
    for (const [index, frame] of [25, 45, 60].entries()) {
      checkShareExportAborted(signal)
      drawLyricShareCard(render, shareGifFrameMotion(layout, frame, {reducedMotion}))
      sampleContext.drawImage(canvas, 0, 0, sampleCanvas.width, sampleCanvas.height)
      samples.set(sampleContext.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data, index * sampleLength)
    }
    await client.exchange({type: 'init', config: {width: size.width, height: size.height, frameCount: SHARE_GIF_FRAME_COUNT}, samples: samples.buffer}, 'ready', [samples.buffer])
    // Backpressure keeps only one uncompressed frame in flight instead of retaining the full clip.
    for (let frame = 0; frame < SHARE_GIF_FRAME_COUNT; frame++) {
      checkShareExportAborted(signal)
      drawLyricShareCard(render, shareGifFrameMotion(layout, frame, {reducedMotion}))
      const rgba = ctx.getImageData(0, 0, size.width, size.height).data
      const reply = await client.exchange({type: 'frame', rgba: rgba.buffer, delay: SHARE_GIF_FRAME_DELAY}, 'frame', [rgba.buffer])
      onProgress?.({completed: reply.completed, total: SHARE_GIF_FRAME_COUNT})
    }
    const result = await client.exchange({type: 'finish'}, 'done')
    checkShareExportAborted(signal)
    return {blob: new Blob([result.bytes], {type: 'image/gif'}), width: size.width, height: size.height, duration: SHARE_GIF_DURATION, coverUnavailable: render.coverUnavailable}
  } catch (error) {
    if (error?.name === 'SecurityError') throw new Error('封面受跨域限制，无法生成 GIF，请更换封面后重试。')
    if (error instanceof ReferenceError && typeof Worker === 'undefined') throw new Error('当前浏览器不支持后台 GIF 生成，请使用“保存图片”。')
    throw error
  } finally { client?.dispose() }
}
