import assert from 'node:assert/strict'
import {afterEach, test} from 'node:test'
import {loadImageAsset} from '../src/utils/loadImageAsset.js'

const originalImage = Object.getOwnPropertyDescriptor(globalThis, 'Image')
afterEach(() => {
  if (originalImage) Object.defineProperty(globalThis, 'Image', originalImage)
  else delete globalThis.Image
})
function images() {
  const instances = []
  globalThis.Image = class {
    constructor() { this.removals = 0; instances.push(this) }
    removeAttribute(name) { assert.equal(name, 'src'); this.src = ''; this.removals++ }
  }
  return instances
}

test('loaded artwork remains usable and releases its timer and abort listener', async context => {
  const instances = images()
  context.mock.timers.enable({apis: ['setTimeout']})
  const controller = new AbortController()
  const pending = loadImageAsset('/cover.jpg', {signal: controller.signal, crossOrigin: 'anonymous'})
  const image = instances[0]
  assert.equal(image.crossOrigin, 'anonymous')
  assert.equal(image.referrerPolicy, 'no-referrer')
  image.onload()
  assert.equal(await pending, image)
  controller.abort()
  context.mock.timers.tick(5000)
  assert.equal(image.src, '/cover.jpg')
  assert.equal(image.removals, 0)
  assert.equal(image.onload, null)
  assert.equal(image.onerror, null)
})

test('stalled CDN requests time out, release resources and ignore late completion', async context => {
  const instances = images()
  context.mock.timers.enable({apis: ['setTimeout']})
  const pending = loadImageAsset('/stalled.jpg', {timeoutMs: 4000})
  const image = instances[0]
  const lateLoad = image.onload
  context.mock.timers.tick(4000)
  assert.equal(await pending, null)
  lateLoad()
  assert.equal(image.src, '')
  assert.equal(image.removals, 1)
  assert.equal(image.onload, null)
  assert.equal(image.onerror, null)
})

test('leaving a detail page aborts its image immediately; pre-aborted work never starts', async () => {
  const instances = images()
  const controller = new AbortController()
  const pending = loadImageAsset('/cover.jpg', {signal: controller.signal})
  const lateLoad = instances[0].onload
  controller.abort()
  assert.equal(await pending, null)
  lateLoad()
  assert.equal(instances[0].removals, 1)
  assert.equal(await loadImageAsset('/next.jpg', {signal: controller.signal}), null)
  assert.equal(instances.length, 1)
})

test('failed or missing artwork resolves without blocking page content', async () => {
  const instances = images()
  assert.equal(await loadImageAsset(''), null)
  assert.equal(instances.length, 0)
  const pending = loadImageAsset('/missing.jpg')
  instances[0].onerror()
  assert.equal(await pending, null)
  assert.equal(instances[0].src, '')
})
