import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {effectScope, nextTick, ref} from 'vue'
import {createServer} from 'vite'

const storage = () => {
  const values = new Map()
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key)}
}
Object.defineProperty(globalThis, 'localStorage', {value: storage(), configurable: true})
Object.defineProperty(globalThis, 'sessionStorage', {value: storage(), configurable: true})

const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../', import.meta.url)),
  resolve: {alias: {'@': fileURLToPath(new URL('../src', import.meta.url))}},
  server: {middlewareMode: true, hmr: false, ws: false},
  optimizeDeps: {noDiscovery: true},
})
after(() => server.close())
const {useFloatingSearch} = await server.ssrLoadModule('/src/composables/useFloatingSearch.js')
const {searchApi} = await server.ssrLoadModule('/src/api/searchApi/searchApi.js')
const {reportApi} = await server.ssrLoadModule('/src/api/reportApi/reportApi.js')
const {useDiscoverData} = await server.ssrLoadModule('/src/composables/useDiscoverData.js')
const {discoverApi} = await server.ssrLoadModule('/src/api/discoverApi.js')
reportApi.reportSearch = () => {}
const originalSearchByType = searchApi.searchByType
const originalSearchComposite = searchApi.searchComposite
function deferred() {
  let resolve, reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return {promise, resolve, reject}
}
const flush = () => new Promise(resolve => setImmediate(resolve))

test('clearing floating search aborts transport and ignores late success', async () => {
  const response = deferred()
  let signal
  searchApi.searchComposite = (_query, options) => { signal = options.signal; return response.promise }
  const scope = effectScope()
  const search = scope.run(() => useFloatingSearch(ref('old'), ref(true), ref(false)))
  const pending = search.runSearch('old')
  search.clearSearchState()
  assert.equal(signal.aborted, true)
  response.resolve({songs: [{id: 1}]})
  await pending
  assert.equal(search.searchResult.value, null)
  assert.equal(search.searching.value, false)
  scope.stop()
})

test('typing invalidates in-flight search before the debounce expires; disposal cancels it', async () => {
  const response = deferred()
  let calls = 0
  let signal
  searchApi.searchComposite = (_query, options) => { calls++; signal = options.signal; return response.promise }
  const scope = effectScope()
  const input = ref('old')
  const search = scope.run(() => {
    const value = useFloatingSearch(input, ref(true), ref(false))
    value.setupSearchWatchers()
    value.setupSearchWatchers()
    return value
  })
  const pending = search.runSearch('old')
  input.value = 'new'
  await nextTick()
  assert.equal(signal.aborted, true)
  response.resolve({songs: [{id: 1}]})
  await pending
  assert.equal(search.searchResult.value, null)
  scope.stop()
  await new Promise(resolve => setTimeout(resolve, 310))
  assert.equal(calls, 1)
})

test('composite search reports complete failure and cancellation instead of an empty success', async () => {
  const composite = {searchComposite: originalSearchComposite}
  composite.searchByType = async () => { throw new Error('offline') }
  await assert.rejects(composite.searchComposite('song'), /offline/)
  composite.searchByType = async () => ({data: {result: {}}})
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(composite.searchComposite('song', {signal: controller.signal}), {name: 'AbortError'})
  searchApi.searchByType = originalSearchByType
})

test('album and artist filters keep the newest response and loading state', async () => {
  for (const [load, api, result, payload] of [
    ['loadAlbums', 'getNewAlbums', 'newAlbums', id => ({data: {albums: [{id}]}})],
    ['loadArtists', 'getArtists', 'artists', id => ({data: {artists: [{id}], more: true}})],
  ]) {
    const old = deferred(), latest = deferred()
    let calls = 0
    discoverApi[api] = () => (++calls === 1 ? old.promise : latest.promise)
    const scope = effectScope()
    const data = scope.run(useDiscoverData)
    const first = data[load]()
    const second = data[load]()
    old.reject(new Error('outdated failure'))
    await first
    assert.equal(data.loading[result === 'artists' ? 'artists' : 'albums'], true)
    latest.resolve(payload(2))
    await second
    assert.equal(data[result].value[0].id, 2)
    scope.stop()
  }
})

test('late successful filter responses and unmounted page responses cannot replace content', async () => {
  const old = deferred()
  let calls = 0
  discoverApi.getNewAlbums = () => (++calls === 1 ? old.promise : Promise.resolve({data: {albums: [{id: 2}]}}))
  const scope = effectScope()
  const data = scope.run(useDiscoverData)
  const first = data.loadAlbums()
  await data.loadAlbums()
  old.resolve({data: {albums: [{id: 1}]}})
  await first
  assert.equal(data.newAlbums.value[0].id, 2)
  const pending = deferred()
  discoverApi.getArtists = () => pending.promise
  const loading = data.loadArtists()
  scope.stop()
  pending.resolve({data: {artists: [{id: 9}]}})
  await loading
  assert.deepEqual(data.artists.value, [])
})

test('rapid radio switches share category lookup and publish only the latest category', async () => {
  const categories = deferred()
  let categoryCalls = 0
  const requested = []
  discoverApi.getDjCategories = () => { categoryCalls++; return categories.promise }
  discoverApi.getHotRadios = async ({cateId}) => { requested.push(cateId); return {data: {djRadios: [{id: cateId}]}} }
  discoverApi.getProgramChart = async () => { throw new Error('partial outage') }
  const scope = effectScope()
  const data = scope.run(useDiscoverData)
  const first = data.loadRadio({cateId: 1})
  const second = data.loadRadio({cateId: 2})
  assert.equal(categoryCalls, 1)
  categories.resolve({data: {categories: [{id: 1}]}})
  await Promise.all([first, second])
  await flush()
  assert.deepEqual(requested, [2])
  assert.equal(data.radios.value[0].id, 2)
  assert.match(data.errors.radio, /部分/)
  assert.equal(data.loading.radio, false)
  scope.stop()
})
