import assert from 'node:assert/strict'
import {afterEach, test} from 'node:test'
import {responsiveImageAttrs, buildImageSrcSet} from '../src/utils/mediaUrl.js'
import {virtualListRange} from '../src/utils/virtualList.js'
import {usePlayerRhythmAnalyzer} from '../src/composables/usePlayerRhythmAnalyzer.js'

test('responsive covers bound CDN dimensions, retain query parameters and preserve aspect ratio', () => {
  const attrs = responsiveImageAttrs('http://p1.music.126.net/cover.jpg?token=test&param=3000y3000', {
    width: 640, widths: [640, 320, 640], sizes: '300px', aspectRatio: 16 / 9,
  })
  assert.equal(new URL(attrs.src).protocol, 'https:')
  assert.equal(new URL(attrs.src).searchParams.get('param'), '640y360')
  assert.equal(new URL(attrs.src).searchParams.get('token'), 'test')
  assert.equal(attrs.sizes, '300px')
  assert.match(attrs.srcset, /param=320y180 320w,.*param=640y360 640w$/)
})

test('local, Blob and other image hosts keep usable URLs without unsupported resize hints', () => {
  for (const url of ['/cover.jpg', 'blob:local-image', 'data:image/png;base64,AQ==', 'https://example.test/cover.jpg']) {
    const attrs = responsiveImageAttrs(url)
    assert.equal(attrs.src, url)
    assert.equal(attrs.srcset, undefined)
    assert.equal(attrs.sizes, undefined)
  }
  assert.equal(buildImageSrcSet('https://p1.music.126.net/a.jpg', [80, 0, -1, 80], {aspectRatio: 0}), 'https://p1.music.126.net/a.jpg?param=80y80 80w')
})

test('large list ranges cover the viewport with bounded rows and preserve full scroll height', () => {
  for (const count of [121, 1000, 5000]) {
    for (const offset of [0, 200, 7400, count * 74 - 600, count * 74 + 1000]) {
      const range = virtualListRange(count, offset, 600, 74)
      assert.ok(range.start >= 0 && range.end <= count)
      assert.ok(range.end - range.start <= Math.ceil(600 / 74) + 16)
      assert.equal(range.top + (range.end - range.start) * 74 + range.bottom, count * 74)
      const row = Math.min(count - 1, Math.max(0, Math.floor(offset / 74)))
      assert.ok(range.start <= row && range.end > row)
    }
  }
  assert.deepEqual(virtualListRange(0, 5000, 600, 74), {start: 0, end: 0, top: 0, bottom: 0})
  assert.equal(virtualListRange(5, 99999, 600, 74).end, 5)
})

const originals = new Map()
function replace(name, value) {
  if (!originals.has(name)) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
  Object.defineProperty(globalThis, name, {value, configurable: true})
}
afterEach(() => {
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  }
  originals.clear()
})

function rhythmHarness() {
  const frames = new Map()
  let sequence = 0, samples = 0, graphRequests = 0, disconnects = 0
  const state = {visible: false, playing: true, reduced: false}
  replace('window', {})
  replace('document', {hidden: false})
  replace('requestAnimationFrame', callback => { frames.set(++sequence, callback); return sequence })
  replace('cancelAnimationFrame', id => frames.delete(id))
  const audio = {paused: false, currentTime: 12}
  const analyser = {frequencyBinCount: 128, getByteFrequencyData(data) { samples++; data.fill(80) }, disconnect() { disconnects++ }}
  let resume = async () => true
  const runtime = usePlayerRhythmAnalyzer({
    getHasSong: () => true, getIsPlaying: () => state.playing, getIsVisualActive: () => state.visible,
    getPrefersReducedMotion: () => state.reduced, getIsIOSDevice: () => false,
    getActiveAudio: () => audio, getPrimaryAudio: () => audio,
    ensureSharedAudioGraph: () => { graphRequests++; return true }, getSharedAnalyserNode: () => analyser,
    resumeSharedAudioGraph: () => resume(),
  })
  return {runtime, state, frames, get samples() { return samples }, get graphRequests() { return graphRequests },
    get disconnects() { return disconnects }, setResume(fn) { resume = fn },
    tick(time) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)) },
  }
}

test('mini player never starts a visual graph; visible lyrics sample only while needed', async () => {
  const harness = rhythmHarness()
  await harness.runtime.startRhythmLoop()
  assert.equal(harness.graphRequests, 0)
  assert.equal(harness.frames.size, 0)
  harness.state.visible = true
  await harness.runtime.startRhythmLoop()
  harness.tick(50)
  harness.tick(66)
  harness.tick(100)
  assert.equal(harness.samples, 2)
  harness.state.visible = false
  harness.tick(150)
  assert.equal(harness.samples, 2)
  assert.equal(harness.frames.size, 0)
  assert.equal(harness.runtime.rhythmLevel.value, 0)
  harness.runtime.disposeRhythmAnalyzer()
  assert.equal(harness.disconnects, 0, 'shared audio graph remains connected')
})

test('background and reduced motion stop sampling without stopping or disconnecting audio', async () => {
  const harness = rhythmHarness()
  harness.state.visible = true
  await harness.runtime.startRhythmLoop()
  harness.tick(50)
  document.hidden = true
  harness.tick(100)
  assert.equal(harness.frames.size, 0)
  document.hidden = false
  harness.state.reduced = true
  await harness.runtime.startRhythmLoop()
  assert.equal(harness.frames.size, 0)
  assert.equal(harness.samples, 1)
  assert.equal(harness.disconnects, 0)
  harness.runtime.disposeRhythmAnalyzer()
})

test('a late audio graph resume cannot restart a canceled or disposed visual loop', async () => {
  const harness = rhythmHarness()
  let resolve
  harness.setResume(() => new Promise(done => { resolve = done }))
  harness.state.visible = true
  const starting = harness.runtime.startRhythmLoop()
  await harness.runtime.startRhythmLoop()
  assert.equal(harness.graphRequests, 1)
  harness.runtime.stopRhythmLoop()
  resolve(true)
  await starting
  assert.equal(harness.frames.size, 0)
  harness.setResume(async () => true)
  await harness.runtime.startRhythmLoop()
  assert.equal(harness.frames.size, 1)
  harness.runtime.disposeRhythmAnalyzer()
  await harness.runtime.startRhythmLoop()
  assert.equal(harness.frames.size, 0)
  assert.equal(harness.disconnects, 0)
})
