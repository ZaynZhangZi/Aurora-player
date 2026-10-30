import {prefetchDetail} from '../utils/detailPrefetch.js'

const states = new WeakMap()
export function createDetailPrefetchDirective(router) {
  return {
    mounted(el, binding) {
      const state = {value: binding.value, timer: null}
      const cancel = () => { clearTimeout(state.timer); state.timer = null }
      const run = () => {
        cancel()
        if (el.isConnected) void prefetchDetail(router, state.value?.type, state.value?.id)
      }
      const enter = () => { cancel(); state.timer = setTimeout(run, 120) }
      const leave = event => { if (!el.contains(event.relatedTarget)) cancel() }
      const handlers = {pointerenter: enter, pointerleave: leave, focusin: enter, focusout: leave, pointerdown: run}
      for (const [event, fn] of Object.entries(handlers)) el.addEventListener(event, fn, {passive: true})
      states.set(el, {state, cancel, handlers})
    },
    updated(el, binding) {
      const entry = states.get(el)
      if (entry) {
        if (entry.state.value?.type !== binding.value?.type || String(entry.state.value?.id) !== String(binding.value?.id)) entry.cancel()
        entry.state.value = binding.value
      }
    },
    unmounted(el) {
      const entry = states.get(el)
      if (!entry) return
      entry.cancel()
      for (const [event, fn] of Object.entries(entry.handlers)) el.removeEventListener(event, fn)
      states.delete(el)
    },
  }
}
