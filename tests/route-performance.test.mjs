import assert from 'node:assert/strict'
import {afterEach, test} from 'node:test'
import {getKeepAliveRouteNames, preloadRouteComponent} from '../src/utils/routePerformance.js'

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
function browser(connection = {}) {
  replace('window', {})
  replace('document', {hidden: false})
  replace('navigator', {connection})
}

test('the cache retains all main pages across navigation, without caching detail or search pages', () => {
  const routes = ['HomePage', 'DiscoverPage', 'ProfilePage'].map(name => ({
    name: name.toLowerCase(), meta: {keepAlive: true, keepAliveName: name},
  }))
  routes.push({name: 'search', meta: {}}, {name: 'playlist', meta: {detail: true}}, routes[0])
  assert.deepEqual(getKeepAliveRouteNames(routes), ['HomePage', 'DiscoverPage', 'ProfilePage'])
  assert.deepEqual(getKeepAliveRouteNames(routes.filter(route => route.name !== 'discoverpage')), ['HomePage', 'ProfilePage'])
})

test('hover, keyboard focus and idle warmup share the same component import without mounting a page', async () => {
  browser()
  let calls = 0, finish
  const load = () => { calls++; return new Promise(resolve => { finish = resolve }) }
  const router = {resolve: () => ({matched: [{components: {default: load}}]})}
  const first = preloadRouteComponent(router, {name: 'discover'})
  const second = preloadRouteComponent(router, '/discover')
  await Promise.resolve()
  assert.equal(calls, 1)
  finish({default: {setup() { throw new Error('Preloading must not mount a page') }}})
  await Promise.all([first, second])
  await preloadRouteComponent(router, '/discover')
  assert.equal(calls, 1)
})

test('failed preloads can be retried and resolved Vue components are never invoked', async () => {
  browser()
  let calls = 0
  const load = () => { calls++; if (calls === 1) throw new Error('temporary offline'); return Promise.resolve({default: {}}) }
  const router = {resolve: () => ({matched: [{components: {default: load}}]})}
  await preloadRouteComponent(router, '/search')
  await preloadRouteComponent(router, '/search')
  assert.equal(calls, 2)
  router.resolve = () => ({matched: [{components: {default: {setup() { throw new Error('Unexpected mount') }}}}]})
  await preloadRouteComponent(router, '/search')
})

test('hidden tabs, data saver and slow connections skip intent preloads', async () => {
  let resolutions = 0
  const router = {resolve() { resolutions++; return {matched: []} }}
  for (const connection of [{saveData: true}, {effectiveType: '2g'}, {effectiveType: 'slow-2g'}]) {
    browser(connection)
    await preloadRouteComponent(router, '/discover')
  }
  browser()
  document.hidden = true
  await preloadRouteComponent(router, '/discover')
  assert.equal(resolutions, 0)
})
