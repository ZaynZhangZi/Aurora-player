import {computed, nextTick, onScopeDispose, ref, watch} from 'vue'
import {virtualListRange} from '@/utils/virtualList.js'

const elementOf = value => value?.$el || value

export function useVirtualTrackList({items, listRef, externalRoot, rowHeight = 74, threshold = 120, getBottomInset = () => 0}) {
  const offset = ref(0)
  const viewport = ref(600)
  const virtualized = computed(() => items.value.length > threshold)
  const range = computed(() => virtualized.value
    ? virtualListRange(items.value.length, offset.value, viewport.value, rowHeight)
    : {start: 0, end: items.value.length, top: 0, bottom: 0})
  const visibleItems = computed(() => items.value.slice(range.value.start, range.value.end)
    .map((track, index) => ({track, index: index + range.value.start})))
  let scrollRoot = null
  let observer = null
  let frame = 0
  let disposed = false

  function measure() {
    const list = elementOf(listRef.value)
    if (!scrollRoot || !list) return
    if (scrollRoot === list) {
      offset.value = scrollRoot.scrollTop
      viewport.value = scrollRoot.clientHeight
    } else {
      const top = scrollRoot.getBoundingClientRect().top + scrollRoot.clientTop
      const listTop = list.getBoundingClientRect().top
      offset.value = Math.max(0, top - listTop)
      viewport.value = Math.max(0, top + scrollRoot.clientHeight - Math.max(top, listTop))
    }
  }

  function scheduleMeasure() {
    if (frame || disposed) return
    frame = requestAnimationFrame(() => { frame = 0; measure() })
  }

  function detach() {
    scrollRoot?.removeEventListener('scroll', scheduleMeasure)
    window.removeEventListener('resize', scheduleMeasure)
    observer?.disconnect()
    observer = null
    cancelAnimationFrame(frame)
    frame = 0
  }

  watch([listRef, externalRoot, () => items.value.length], async () => {
    await nextTick()
    if (disposed) return
    const list = elementOf(listRef.value)
    const nextRoot = list ? externalRoot.value || list : null
    if (nextRoot !== scrollRoot) {
      const anchor = offset.value
      const previousRoot = scrollRoot
      detach()
      scrollRoot = nextRoot
      if (scrollRoot && list) {
        scrollRoot.addEventListener('scroll', scheduleMeasure, {passive: true})
        window.addEventListener('resize', scheduleMeasure, {passive: true})
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(scheduleMeasure)
          observer.observe(scrollRoot)
          if (scrollRoot !== list) observer.observe(list)
        }
        if (previousRoot && anchor > 0) {
          const listOffset = scrollRoot === list ? 0 : list.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top + scrollRoot.scrollTop
          scrollRoot.scrollTop = listOffset + anchor
        }
      }
    }
    measure()
  }, {flush: 'post'})

  async function focusIndex(index) {
    const list = elementOf(listRef.value)
    if (!list || !scrollRoot || !items.value.length) return
    const safeIndex = Math.min(items.value.length - 1, Math.max(0, index))
    const rootTop = scrollRoot.getBoundingClientRect().top + scrollRoot.clientTop
    const listOffset = scrollRoot === list ? 0 : list.getBoundingClientRect().top - rootTop + scrollRoot.scrollTop
    const top = listOffset + safeIndex * rowHeight
    const availableHeight = Math.max(rowHeight, scrollRoot.clientHeight - getBottomInset(scrollRoot))
    if (top < scrollRoot.scrollTop) scrollRoot.scrollTop = top
    else if (top + rowHeight > scrollRoot.scrollTop + availableHeight) {
      scrollRoot.scrollTop = top + rowHeight - availableHeight
    }
    measure()
    await nextTick()
    if (!disposed) list.querySelector(`[data-track-index="${safeIndex}"]`)?.focus({preventScroll: true})
  }

  onScopeDispose(() => { disposed = true; detach(); scrollRoot = null })
  return {virtualized, range, visibleItems, focusIndex}
}
