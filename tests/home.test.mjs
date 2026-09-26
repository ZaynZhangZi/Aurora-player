import assert from 'node:assert/strict'
import {after, beforeEach, test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {createServer} from 'vite'
import {effectScope} from 'vue'

const memoryStorage = () => {
  const entries = new Map()
  return {getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, String(value)), clear: () => entries.clear()}
}
Object.defineProperty(globalThis, 'localStorage', {value: memoryStorage(), configurable: true})
Object.defineProperty(globalThis, 'sessionStorage', {value: memoryStorage(), configurable: true})
const {createPinia, setActivePinia} = await import('pinia')
const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../', import.meta.url)),
  resolve: {alias: {'@': fileURLToPath(new URL('../src', import.meta.url))}},
  server: {middlewareMode: true, hmr: false},
  optimizeDeps: {noDiscovery: true},
})
after(() => server.close())
const {personalHomeApi: api} = await server.ssrLoadModule('/src/api/personalHomeApi.js')
const {usePersonalHomeData} = await server.ssrLoadModule('/src/composables/usePersonalHomeData.js')
const {usePlayerStore} = await server.ssrLoadModule('/src/stores/playerStore.js')
const {normalizePlaybackPosition} = await server.ssrLoadModule('/src/utils/player/playbackPosition.js')
const songs = id => ({data: {data: [{id, name: `Song ${id}`}]}})
const flush = () => new Promise(resolve => setImmediate(resolve))
function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return {promise, resolve}
}
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  setActivePinia(createPinia())
  for (const method of Object.keys(api)) api[method] = async () => ({data: {data: []}})
  api.getDailySongs = async () => songs(11)
  api.getGuestSongs = async () => songs(22)
})

test('recommendations render before a slow FM request; failures do not clear usable cache', async () => {
  const fm = deferred()
  api.getPersonalFm = () => fm.promise
  const scope = effectScope()
  const home = scope.run(usePersonalHomeData)
  const pending = home.loadPersonalHome(true, 'A')
  await flush()
  assert.equal(home.dailySongs.value[0].id, 11)
  assert.equal(home.loading.dailySongs, false)
  assert.equal(home.loading.personalFmSongs, true)
  fm.resolve(songs(33))
  await pending
  api.getDailySongs = async () => { throw new Error('offline') }
  const second = effectScope()
  const restored = second.run(usePersonalHomeData)
  const refresh = restored.loadPersonalHome(true, 'A')
  assert.equal(restored.dailySongs.value[0].id, 11)
  await refresh
  assert.equal(restored.dailySongs.value[0].id, 11)
  assert.match(restored.errors.dailySongs, /无法更新/)
  scope.stop()
  second.stop()
})

test('a late account response or guest fallback cannot overwrite another account', async () => {
  const slowFallback = deferred()
  api.getDailySongs = async () => { throw new Error('expired') }
  api.getGuestSongs = () => slowFallback.promise
  const scope = effectScope()
  const home = scope.run(usePersonalHomeData)
  const oldRequest = home.loadPersonalHome(true, 'A')
  await flush()
  api.getDailySongs = async () => songs(44)
  await home.loadPersonalHome(true, 'B')
  slowFallback.resolve(songs(99))
  await oldRequest
  assert.equal(home.dailySongs.value[0].id, 44)
  await home.loadPersonalHome(false)
  assert.equal(home.personalFmSongs.value.length, 0)
  assert.equal(home.recentSongs.value.length, 0)
  scope.stop()
})

test('unmounted home ignores pending responses and scene errors are handled', async () => {
  const pendingSongs = deferred()
  api.getGuestSongs = () => pendingSongs.promise
  const scope = effectScope()
  const home = scope.run(usePersonalHomeData)
  const loading = home.loadPersonalHome(false)
  scope.stop()
  pendingSongs.resolve(songs(77))
  await loading
  assert.equal(home.dailySongs.value.length, 0)
  const anotherScope = effectScope()
  const anotherHome = anotherScope.run(usePersonalHomeData)
  api.getPersonalFmMode = async () => { throw new Error('offline') }
  assert.deepEqual(await anotherHome.loadSceneSongs({id: 'focus', mode: 'FOCUS'}), [])
  assert.equal(anotherHome.loading.scene, '')
  assert.ok(anotherHome.errors.scene)
  anotherScope.stop()
})

test('progress survives reload and metadata reset, without leaking into the next track', () => {
  const player = usePlayerStore()
  player.setTrack({id: 1, name: 'First', url: '/audio.wav'}, {autoplay: false})
  player.setDurationMs(180000)
  player.setCurrentTimeMs(45321)
  player.setPlaying(false)
  setActivePinia(createPinia())
  const restored = usePlayerStore()
  assert.equal(restored.currentTimeMs, 45321)
  assert.equal(restored.pendingResumeMs, 45321)
  assert.equal(restored.isPlaying, false)
  restored.setDurationMs(0)
  restored.setCurrentTimeMs(0)
  assert.equal(restored.currentTimeMs, 45321)
  assert.equal(restored.durationMs, 180000)
  restored.setTrack({id: 2, name: 'Second', url: '/second.wav'})
  assert.equal(restored.pendingResumeMs, null)
  assert.equal(restored.currentTimeMs, 0)
  assert.equal(restored.durationMs, 0)
  assert.equal(normalizePlaybackPosition(179900, 180000), 0)
  assert.equal(normalizePlaybackPosition(Infinity, 180000), 0)
})
