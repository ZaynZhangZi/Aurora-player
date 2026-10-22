import assert from 'node:assert/strict'
import {afterEach, test} from 'node:test'
import {preloadRouteComponents, runAppBootstrap} from '../src/utils/appBootstrap.js'

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
const flush = () => new Promise(resolve => setImmediate(resolve))
function browser() {
  replace('document', {querySelectorAll: () => [], fonts: {ready: Promise.resolve()}, hidden: false})
  replace('window', {requestIdleCallback: callback => callback()})
  replace('navigator', {connection: {}})
  replace('requestAnimationFrame', callback => setTimeout(callback, 0))
  replace('cancelAnimationFrame', clearTimeout)
}

test('splash waits for the current route and never loads unrelated routes', async () => {
  browser()
  let routeReady
  const route = new Promise(resolve => { routeReady = resolve })
  const progress = []
  const bootstrap = runAppBootstrap({
    router: {isReady: () => route, getRoutes: () => { throw new Error('Unrelated route preload during splash') }},
    onProgress: value => progress.push(value),
  })
  await flush()
  assert.equal(progress.includes(100), false)
  routeReady()
  await bootstrap
  assert.equal(progress.at(-1), 100)
})

test('aborting the splash releases resource observers without reporting completion', async () => {
  browser()
  document.querySelectorAll = () => [{src: 'https://example.test/pending.js'}]
  let disconnected = 0
  replace('PerformanceObserver', class {observe() {} disconnect() {disconnected++}})
  const controller = new AbortController()
  const progress = []
  const bootstrap = runAppBootstrap({signal: controller.signal, onProgress: value => progress.push(value)})
  controller.abort()
  await bootstrap
  assert.equal(disconnected, 1)
  assert.equal(progress.includes(100), false)
})

test('data saver and 2G connections skip speculative downloads', async () => {
  browser()
  const router = {getRoutes: () => { throw new Error('Unexpected preload') }}
  for (const connection of [{saveData: true}, {effectiveType: '2g'}, {effectiveType: 'slow-2g'}]) {
    replace('navigator', {connection})
    await preloadRouteComponents(router)
  }
})

test('idle preloads are deduplicated, sequential, and restricted to common pages', async context => {
  browser()
  context.mock.timers.enable({apis: ['setTimeout']})
  const calls = []
  let finishDiscover
  const discover = new Promise(resolve => { finishDiscover = resolve })
  const router = {
    isReady: async () => {},
    currentRoute: {value: {name: 'home'}},
    getRoutes: () => ['home', 'discover', 'search', 'messages', 'artist'].map(name => ({
      name, components: {default: () => { calls.push(name); return name === 'discover' ? discover : Promise.resolve() }},
    })),
  }
  const preload = preloadRouteComponents(router)
  assert.equal(preloadRouteComponents(router), preload)
  await flush()
  assert.deepEqual(calls, [])
  context.mock.timers.tick(2000)
  await flush()
  assert.deepEqual(calls, ['discover'])
  finishDiscover()
  await preload
  assert.deepEqual(calls, ['discover', 'search'])
})
