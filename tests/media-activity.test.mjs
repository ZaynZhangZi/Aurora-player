import assert from 'node:assert/strict'
import {afterEach, test} from 'node:test'
import {createRenderer, effectScope, h, KeepAlive, nextTick, ref, shallowRef} from 'vue'
import {useElementActivity} from '../src/composables/useElementActivity.js'
import {useVideoActivity} from '../src/composables/useVideoActivity.js'

const originals = new Map()
const cleanups = []
function replace(name, value) {
  if (!originals.has(name)) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
  Object.defineProperty(globalThis, name, {value, configurable: true})
}
afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup())
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  }
  originals.clear()
})

function visibilityHarness({fallback = false} = {}) {
  const events = new EventTarget()
  const observers = []
  const listeners = new Set()
  replace('document', {hidden: false,
    addEventListener(...args) { listeners.add(args[1]); events.addEventListener(...args) },
    removeEventListener(...args) { listeners.delete(args[1]); events.removeEventListener(...args) },
  })
  replace('IntersectionObserver', fallback ? undefined : class {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this) }
    observe(target) { this.target = target }
    disconnect() { this.disconnected = true }
    visible(value) { this.callback([{target: this.target, isIntersecting: value}]) }
  })
  const node = () => ({children: [], parent: null})
  const renderer = createRenderer({
    createElement: node, createText: node, createComment: node,
    setText() {}, setElementText() {}, patchProp() {},
    insert(child, parent) {
      if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1)
      child.parent = parent; parent.children.push(child)
    },
    remove(child) { child.parent?.children.splice(child.parent.children.indexOf(child), 1); child.parent = null },
    parentNode: child => child.parent, nextSibling: () => null,
  })
  const target = shallowRef({id: 'desktop'})
  const shown = ref(true)
  let active
  const Probe = {setup() { active = useElementActivity(target); return () => h('div') }}
  const app = renderer.createApp({setup: () => () => h(KeepAlive, null, {default: () => shown.value ? h(Probe) : null})})
  app.mount(node())
  cleanups.push(() => app.unmount())
  return {target, shown, observers, get active() { return active.value }, get listeners() { return listeners.size },
    hide(hidden) { document.hidden = hidden; events.dispatchEvent(new Event('visibilitychange')) },
  }
}

test('visual work follows viewport, tab visibility and KeepAlive activation; old observers cannot restart it', async () => {
  const view = visibilityHarness()
  await nextTick()
  assert.equal(view.active, false)
  const first = view.observers.at(-1)
  first.visible(true)
  assert.equal(view.active, true)
  view.hide(true)
  assert.equal(view.active, false)
  view.hide(false)
  assert.equal(view.active, true)
  first.visible(false)
  assert.equal(view.active, false)
  view.shown.value = false
  await nextTick()
  assert.equal(first.disconnected, true)
  assert.equal(view.listeners, 0)
  view.shown.value = true
  await nextTick()
  const current = view.observers.at(-1)
  first.visible(true)
  assert.equal(view.active, false, 'queued observations from a cached route are ignored')
  current.visible(true)
  assert.equal(view.active, true)
  view.target.value = null
  await nextTick()
  assert.equal(view.active, false)
  assert.equal(current.disconnected, true)
  assert.equal(view.listeners, 0)
})

test('browsers without IntersectionObserver still stop work in hidden tabs', async () => {
  const view = visibilityHarness({fallback: true})
  await nextTick()
  assert.equal(view.active, true)
  view.hide(true)
  assert.equal(view.active, false)
  view.target.value = null
  await nextTick()
  assert.equal(view.active, false)
  assert.equal(view.listeners, 0)
})

function videoHarness(autoplay = true) {
  const scope = effectScope()
  const makeVideo = () => ({paused: true, plays: 0, pauses: 0,
    play() { this.plays++; this.paused = false; return Promise.resolve() },
    pause() { this.pauses++; this.paused = true },
  })
  const video = shallowRef(makeVideo())
  const active = ref(false)
  const auto = ref(autoplay)
  const control = scope.run(() => useVideoActivity(video, active, auto))
  cleanups.push(() => scope.stop())
  return {scope, video, active, auto, control, makeVideo}
}

test('videos autoplay only when visible, resume after hiding and retain a manual pause', async () => {
  const view = videoHarness()
  assert.equal(view.video.value.plays, 0)
  view.active.value = true
  await nextTick()
  assert.equal(view.video.value.plays, 1)
  view.active.value = false
  await nextTick()
  assert.equal(view.video.value.paused, true)
  view.active.value = true
  await nextTick()
  assert.equal(view.video.value.plays, 2)
  view.video.value.pause()
  view.active.value = false
  await nextTick()
  view.active.value = true
  await nextTick()
  assert.equal(view.video.value.paused, true)
  assert.equal(view.video.value.plays, 2)
})

test('explicit banner playback waits for visibility; replacing or disposing a video releases playback', async () => {
  const view = videoHarness(false)
  await view.control.play()
  assert.equal(view.video.value.plays, 0)
  view.active.value = true
  await nextTick()
  assert.equal(view.video.value.plays, 1)
  const old = view.video.value
  view.video.value = view.makeVideo()
  await nextTick()
  assert.equal(old.paused, true)
  assert.equal(view.video.value.plays, 0)
  await view.control.play()
  assert.equal(view.video.value.paused, false)
  view.scope.stop()
  assert.equal(view.video.value.paused, true)
})

test('ending a hover cancels a pending resume while offscreen', async () => {
  const view = videoHarness(false)
  view.active.value = true
  await nextTick()
  await view.control.play()
  view.active.value = false
  await nextTick()
  view.control.pause()
  view.active.value = true
  await nextTick()
  assert.equal(view.video.value.paused, true)
  assert.equal(view.video.value.plays, 1)
})
