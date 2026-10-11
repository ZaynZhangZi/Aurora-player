import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {once} from 'node:events'
import {Worker as ThreadWorker} from 'node:worker_threads'
import {createServer} from 'vite'
import {parseGIF, decompressFrames} from 'gifuct-js'
import {createLyricShareGifEncoder} from '../src/utils/lyricShareGifEncoder.js'
import {SHARE_GIF_DURATION, SHARE_GIF_FRAME_COUNT, SHARE_GIF_FRAME_DELAY, shareGifExportSize, shareGifFrameMotion} from '../src/utils/lyricShareGifMotion.js'
import {createShareLayout, DEFAULT_SHARE_OPTIONS, normalizeShareLines, normalizeShareSong, shareFileName} from '../src/utils/lyricShare.js'

const server = await createServer({configFile: false, root: fileURLToPath(new URL('../', import.meta.url)),
  resolve: {alias: {'@': fileURLToPath(new URL('../src', import.meta.url))}},
  server: {middlewareMode: true, hmr: false}, optimizeDeps: {noDiscovery: true},
})
after(() => server.close())
const {createGifWorkerClient, renderLyricShareGif} = await server.ssrLoadModule('/src/utils/lyricShareGif.js')
const song = () => normalizeShareSong({name: 'GIF 测试', artists: [{name: '艺人'}]})
const lines = () => normalizeShareLines([
  {startTime: 0, words: [{word: 'Hello world'}], translatedLyric: '你好，世界'},
  {startTime: 1000, words: [{word: '另一句歌词'}], isDuet: true},
])
const measureContext = () => ({font: '', measureText(text) { return {width: Array.from(text).length * (Number(this.font.match(/(\d+)px/)?.[1]) || 20) * .7} }})

function assertInfiniteLoop(bytes) {
  const marker = Array.from('NETSCAPE2.0', character => character.charCodeAt(0))
  const offset = bytes.findIndex((_, start) => marker.every((value, index) => bytes[start + index] === value))
  assert.ok(offset >= 0)
  assert.deepEqual([...bytes.slice(offset + marker.length, offset + marker.length + 5)], [3, 1, 0, 0, 0])
}

test('GIF resolution has its own clear, bounded sizes without clipping the full layout', () => {
  assert.deepEqual(shareGifExportSize({width: 1500, height: 1000}, 1), {width: 480, height: 320, scale: .32})
  assert.deepEqual(shareGifExportSize({width: 1500, height: 1000}, 1.5), {width: 720, height: 480, scale: .48})
  assert.deepEqual(shareGifExportSize({width: 1500, height: 1000}, 2), {width: 960, height: 640, scale: .64})
  assert.equal(shareGifExportSize({width: 1500, height: 1000}, 99).width, 480)
  assert.throws(() => shareGifExportSize({width: 1500, height: 9000}, 2), /减少几行|降低清晰度/)
  assert.equal(shareFileName({name: 'A:🌌/歌?'}, 'gif'), 'A🌌歌-歌词分享.gif')
  assert.equal(shareFileName(song(), 'png'), 'GIF 测试-歌词分享.jpg')
})

test('GIF motion has a continuous loop, reveals translation with its lead and respects reduced motion', () => {
  const layout = createShareLayout(song(), lines(), DEFAULT_SHARE_OPTIONS, measureContext())
  const start = shareGifFrameMotion(layout, 0)
  const end = shareGifFrameMotion(layout, SHARE_GIF_FRAME_COUNT)
  assert.deepEqual(start, end)
  assert.ok(start.runs.every(run => run.opacity === 1 && run.y === 0), 'the first-frame thumbnail shows the full lyrics')
  const revealing = shareGifFrameMotion(layout, 60)
  assert.equal(revealing.runs[0].opacity, revealing.runs[1].opacity)
  assert.ok(revealing.runs[0].opacity > revealing.runs[2].opacity)
  const hold = shareGifFrameMotion(layout, 30)
  assert.ok(hold.runs.every(run => run.opacity === 1 && run.y === 0))
  assert.notDeepEqual(hold.washes, start.washes)
  const reduced = shareGifFrameMotion(layout, 30, {reducedMotion: true})
  assert.deepEqual(reduced.washes, start.washes)
  assert.ok(reduced.runs.every(run => run.y === 0))
  assert.ok(shareGifFrameMotion(layout, 51).runs.every(run => run.opacity === 0))
  assert.ok(shareGifFrameMotion(layout, SHARE_GIF_FRAME_COUNT - 1).runs.every(run => run.opacity === 1))
})

test('the real GIF codec round-trips changing pixels, frame delays and infinite repeat using one palette', () => {
  const first = new Uint8Array([255, 0, 0, 255, 255, 255, 255, 255])
  const second = new Uint8Array([0, 0, 255, 255, 255, 255, 255, 255])
  const encoder = createLyricShareGifEncoder({width: 2, height: 1, frameCount: 3, samples: new Uint8Array([...first, ...second])})
  for (const frame of [first, second, first]) encoder.addFrame(frame, SHARE_GIF_FRAME_DELAY)
  const bytes = encoder.finish()
  assert.equal(new TextDecoder().decode(bytes.slice(0, 6)), 'GIF89a')
  assert.equal(bytes.at(-1), 0x3b)
  assertInfiniteLoop(bytes)
  const parsed = parseGIF(bytes.buffer)
  const frames = decompressFrames(parsed, true)
  assert.equal(frames.length, 3)
  assert.deepEqual([...frames[0].patch], [...first])
  assert.deepEqual([...frames[1].patch], [...second])
  assert.ok(frames.every(frame => frame.delay === 80 && frame.disposalType === 1 && frame.dims.width === 2 && frame.dims.height === 1))
  assert.ok(parsed.frames.filter(frame => frame.image).every(frame => !frame.image.descriptor.lct.exists), 'all frames use the same global palette')
  assert.throws(() => encoder.addFrame(first, 80), /结束/)
  assert.throws(() => encoder.finish(), /不完整/)
})

test('encoder validates frame shape, dimensions and completeness before emitting a file', () => {
  const samples = new Uint8Array([50, 60, 70, 255, 255, 255, 255, 255])
  assert.throws(() => createLyricShareGifEncoder({width: 3000, height: 2000, samples}), /尺寸/)
  assert.throws(() => createLyricShareGifEncoder({width: 1, height: 1, samples: new Uint8Array(3)}), /调色板/)
  assert.throws(() => createLyricShareGifEncoder({width: 1, height: 1, frameCount: 1000, samples}), /帧数/)
  const encoder = createLyricShareGifEncoder({width: 1, height: 1, frameCount: 2, samples})
  assert.throws(() => encoder.addFrame(new Uint8Array(8), 80), /帧数据/)
  assert.throws(() => encoder.addFrame(samples.slice(0, 4), 0), /帧数据/)
  encoder.addFrame(samples.slice(0, 4), 80)
  assert.throws(() => encoder.finish(), /不完整/)
  encoder.addFrame(samples.slice(4), 80)
  assert.ok(encoder.finish().length > 20)
})

test('aborting a worker exchange rejects promptly, terminates once and ignores late responses', async () => {
  const worker = {postMessage() {}, terminations: 0, terminate() { this.terminations++ }}
  const controller = new AbortController()
  const client = createGifWorkerClient(worker, controller.signal)
  const waiting = client.exchange({type: 'init'}, 'ready')
  controller.abort()
  await assert.rejects(waiting, {name: 'AbortError'})
  assert.equal(worker.terminations, 1)
  assert.equal(worker.onmessage, null)
  await assert.rejects(client.exchange({type: 'finish'}, 'done'), {name: 'AbortError'})
  client.dispose()
  assert.equal(worker.terminations, 1)
})

test('worker errors, invalid replies and synchronous postMessage failures clean up the job', async () => {
  for (const failure of ['response', 'runtime', 'message', 'post']) {
    const worker = {postMessage() { if (failure === 'post') throw new Error('post failed') }, terminate() { this.terminated = true }}
    const client = createGifWorkerClient(worker)
    const waiting = client.exchange({type: 'init'}, 'ready')
    if (failure === 'response') worker.onmessage({data: {type: 'unexpected'}})
    if (failure === 'runtime') worker.onerror({preventDefault() {}})
    if (failure === 'message') worker.onmessage({data: {type: 'error', error: 'encoding failed'}})
    await assert.rejects(waiting)
    assert.equal(worker.terminated, true)
    assert.equal(worker.onmessage, null)
  }
})

test('the actual worker module accepts transferable frames and returns a valid animated GIF', {timeout: 10000}, async () => {
  const sourceUrl = new URL('../src/workers/lyricShareGif.worker.js', import.meta.url).href
  const thread = new ThreadWorker(`
    const {parentPort} = require('node:worker_threads');
    globalThis.self = {postMessage: (data, transfer) => parentPort.postMessage(data, transfer)};
    import(${JSON.stringify(sourceUrl)}).then(() => {
      parentPort.on('message', data => self.onmessage({data}));
      parentPort.postMessage({type: 'booted'});
    }).catch(error => { throw error });
  `, {eval: true})
  let client
  let termination
  try {
    const [boot] = await once(thread, 'message')
    assert.equal(boot.type, 'booted')
    const worker = {postMessage: (data, transfer) => thread.postMessage(data, transfer), terminate: () => { termination = thread.terminate() }}
    thread.on('message', data => worker.onmessage?.({data}))
    thread.on('error', error => worker.onerror?.(error))
    client = createGifWorkerClient(worker)
    const first = [255, 0, 0, 255, 255, 255, 255, 255]
    const second = [0, 0, 255, 255, 255, 255, 255, 255]
    const samples = new Uint8Array([...first, ...second])
    await client.exchange({type: 'init', config: {width: 2, height: 1, frameCount: 3}, samples: samples.buffer}, 'ready', [samples.buffer])
    assert.equal(samples.byteLength, 0, 'the palette sample is transferred, not retained on the UI thread')
    for (const pixels of [first, second, first]) {
      const frame = new Uint8Array(pixels)
      await client.exchange({type: 'frame', rgba: frame.buffer, delay: 80}, 'frame', [frame.buffer])
      assert.equal(frame.byteLength, 0)
    }
    const {bytes} = await client.exchange({type: 'finish'}, 'done')
    const decoded = decompressFrames(parseGIF(bytes), true)
    assert.equal(decoded.length, 3)
    assert.deepEqual([...decoded[1].patch], second)
  } finally {
    if (client) { client.dispose(); await termination }
    else await thread.terminate()
  }
})

function mockCanvasDocument(observed) {
  return {createElement(tag) {
    assert.equal(tag, 'canvas')
    const canvas = {width: 0, height: 0}
    const ctx = new Proxy({...measureContext(), red: 40,
      createLinearGradient: () => ({addColorStop() {}}),
      createRadialGradient(x) { this.red = Math.round(40 + Math.abs(x % 140) / 8); return {addColorStop() {}} },
      fillText(text, x, y) { observed.push({text, x, y, font: this.font, color: this.fillStyle}) },
      drawImage(source) { if (source.ctx) this.red = source.ctx.red },
      getImageData(x, y, width, height) {
        const data = new Uint8ClampedArray(width * height * 4)
        new Uint32Array(data.buffer).fill((255 << 24) | (90 << 16) | (60 << 8) | this.red)
        return {data}
      },
    }, {get: (target, key) => key in target ? target[key] : () => {}})
    canvas.ctx = ctx
    canvas.getContext = () => ctx
    return canvas
  }}
}

class CodecWorker {
  pending = 0
  maxPending = 0
  terminations = 0
  postMessage(message, transfer) {
    const data = structuredClone(message, {transfer})
    this.maxPending = Math.max(this.maxPending, ++this.pending)
    queueMicrotask(() => {
      if (this.terminations) return
      let reply
      try {
        if (data.type === 'init') {
          this.encoder = createLyricShareGifEncoder({...data.config, samples: new Uint8Array(data.samples)})
          reply = {type: 'ready'}
        } else if (data.type === 'frame') reply = {type: 'frame', completed: this.encoder.addFrame(new Uint8Array(data.rgba), data.delay)}
        else reply = {type: 'done', bytes: this.encoder.finish().buffer}
      } catch (error) { reply = {type: 'error', error: error.message} }
      this.pending--
      this.onmessage?.({data: reply})
    })
  }
  terminate() { this.terminations++ }
}

test('the exporter feeds bounded frames into the codec, honors text options and produces a decodable 6-second GIF', async () => {
  const previousDocument = globalThis.document
  const observed = []
  const worker = new CodecWorker()
  const progress = []
  globalThis.document = mockCanvasDocument(observed)
  try {
    const settings = {...DEFAULT_SHARE_OPTIONS, showTranslation: false, boldText: false}
    const result = await renderLyricShareGif(song(), lines(), settings, {workerFactory: () => worker, onProgress: value => progress.push(value)})
    assert.equal(result.blob.type, 'image/gif')
    assert.equal(result.width, 480)
    assert.equal(result.duration, SHARE_GIF_DURATION)
    assert.equal(worker.maxPending, 1)
    assert.equal(worker.terminations, 1)
    assert.equal(progress.length, SHARE_GIF_FRAME_COUNT)
    assert.deepEqual(progress.at(-1), {completed: 75, total: 75})
    assert.ok(observed.some(run => run.text === 'Hello world' && run.font.startsWith('500 ')))
    assert.ok(observed.every(run => run.text !== '你好，世界' && run.text !== 'AURORA'))
    const bytes = new Uint8Array(await result.blob.arrayBuffer())
    assertInfiniteLoop(bytes)
    const frames = decompressFrames(parseGIF(bytes.buffer))
    assert.equal(frames.length, SHARE_GIF_FRAME_COUNT)
    assert.ok(frames.every(frame => frame.dims.width === result.width && frame.dims.height === result.height))
    assert.equal(frames.reduce((sum, frame) => sum + frame.delay, 0), SHARE_GIF_DURATION)
    assert.ok(frames.some(frame => frame.pixels[0] !== frames[0].pixels[0]), 'the clip contains changing frames, not a renamed still image')
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
})

test('an export can be canceled while fonts are loading and never starts a worker afterward', async () => {
  const previousDocument = globalThis.document
  const controller = new AbortController()
  let fontsRequested
  const requested = new Promise(resolve => { fontsRequested = resolve })
  let workers = 0
  globalThis.document = {fonts: {get ready() { fontsRequested(); return new Promise(() => {}) }}}
  try {
    const result = renderLyricShareGif(song(), lines(), DEFAULT_SHARE_OPTIONS, {signal: controller.signal, workerFactory: () => { workers++; return new CodecWorker() }})
    await requested
    controller.abort()
    await assert.rejects(result, {name: 'AbortError'})
    assert.equal(workers, 0)
    await assert.rejects(renderLyricShareGif(song(), lines(), DEFAULT_SHARE_OPTIONS, {signal: controller.signal}), {name: 'AbortError'})
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
})

test('canceling midway through encoding stops the remaining frames and returns no downloadable file', async () => {
  const previousDocument = globalThis.document
  const worker = new CodecWorker()
  const controller = new AbortController()
  let completed = 0
  globalThis.document = mockCanvasDocument([])
  try {
    await assert.rejects(renderLyricShareGif(song(), lines(), DEFAULT_SHARE_OPTIONS, {
      workerFactory: () => worker, signal: controller.signal,
      onProgress: ({completed: value}) => { completed = value; controller.abort() },
    }), {name: 'AbortError'})
    assert.equal(completed, 1)
    assert.equal(worker.terminations, 1)
    assert.equal(worker.pending, 0)
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
})
