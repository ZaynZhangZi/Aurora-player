import {computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch} from 'vue'

// CSS-hidden responsive layouts and cached routes should not run visual clocks.
// A null target opts out, so ordinary static images need no observer or listener.
export function useElementActivity(target) {
  const mounted = ref(false)
  const activated = ref(true)
  const intersecting = ref(false)
  const pageVisible = ref(true)
  let observer = null

  function syncVisibility() {
    pageVisible.value = !document.hidden
  }

  function detach() {
    observer?.disconnect()
    observer = null
    document.removeEventListener('visibilitychange', syncVisibility)
    intersecting.value = false
  }

  watch([target, mounted, activated], ([element, ready, current], _previous, onCleanup) => {
    if (!element || !ready || !current) return
    syncVisibility()
    document.addEventListener('visibilitychange', syncVisibility)
    let valid = true
    if (typeof IntersectionObserver === 'undefined') {
      intersecting.value = true
    } else {
      observer = new IntersectionObserver(entries => {
        if (!valid) return
        for (const entry of entries) {
          if (entry.target === element) intersecting.value = entry.isIntersecting
        }
      })
      observer.observe(element)
    }
    onCleanup(() => { valid = false; detach() })
  }, {flush: 'post'})

  onMounted(() => { mounted.value = true })
  onActivated(() => { activated.value = true })
  onDeactivated(() => { activated.value = false })
  onBeforeUnmount(() => { mounted.value = false; detach() })

  return computed(() => mounted.value && activated.value && Boolean(target.value) && intersecting.value && pageVisible.value)
}
