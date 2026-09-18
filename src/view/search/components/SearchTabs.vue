<template>
  <div class="search-tabs-scroll" ref="scrollRef">
    <div class="search-tabs-track" role="tablist" :aria-label="ariaLabel">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :ref="(el) => setTabRef(tab.value, el)"
        type="button"
        role="tab"
        :id="`search-tab-${tab.value}`"
        :aria-selected="active === tab.value"
        :tabindex="active === tab.value ? 0 : -1"
        class="search-tab"
        :class="{ 'is-active': active === tab.value }"
        @click="emit('change', tab.value)"
        @keydown="onKeydown($event, tab.value)"
      >
        {{ tab.label }}
      </button>
      <span class="search-tabs-indicator" :style="indicatorStyle" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  tabs: { type: Array, required: true },
  active: { type: String, required: true },
  ariaLabel: { type: String, default: '搜索结果分类' },
})

const emit = defineEmits(['change'])

const scrollRef = ref(null)
const indicatorStyle = ref({ opacity: 0 })
const tabRefs = new Map()

function setTabRef(value, el) {
  if (el) tabRefs.set(value, el)
  else tabRefs.delete(value)
}

function measure() {
  const el = tabRefs.get(props.active)
  if (!el) {
    indicatorStyle.value = { opacity: 0 }
    return
  }
  indicatorStyle.value = {
    opacity: 1,
    width: `${el.offsetWidth}px`,
    transform: `translateX(${el.offsetLeft}px)`,
  }
  // 让激活项在横向滚动容器内可见
  const scroller = scrollRef.value
  if (scroller) {
    const left = el.offsetLeft
    const right = left + el.offsetWidth
    if (left < scroller.scrollLeft || right > scroller.scrollLeft + scroller.clientWidth) {
      scroller.scrollTo({ left: Math.max(0, left - 12), behavior: 'smooth' })
    }
  }
}

function onKeydown(event, value) {
  const values = props.tabs.map((t) => t.value)
  const index = values.indexOf(value)
  let next = -1
  if (event.key === 'ArrowRight') next = (index + 1) % values.length
  else if (event.key === 'ArrowLeft') next = (index - 1 + values.length) % values.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = values.length - 1
  if (next < 0) return
  event.preventDefault()
  emit('change', values[next])
  nextTick(() => tabRefs.get(values[next])?.focus())
}

let resizeObserver = null
onMounted(() => {
  nextTick(measure)
  if (typeof ResizeObserver !== 'undefined' && scrollRef.value) {
    resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(scrollRef.value)
  }
  window.addEventListener('resize', measure)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', measure)
})

watch(() => [props.active, props.tabs], () => nextTick(measure), { deep: false })
</script>

<style scoped>
.search-tabs-scroll {
  position: relative;
  display: flex;
  width: 100%;
  justify-content: center;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.search-tabs-scroll::-webkit-scrollbar { display: none; }

.search-tabs-track {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0;
  min-width: max-content;
  box-sizing: border-box;
  padding: 3px;
  border: 1px solid rgba(24, 24, 27, 0.055);
  border-radius: 14px;
  background: rgba(229, 229, 232, 0.72);
}

.search-tab {
  position: relative;
  display: inline-flex;
  flex: none;
  z-index: 1;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 36px;
  padding: 0 17px;
  color: var(--sp-muted, #86868f);
  border: 0;
  border-radius: 11px;
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  transition: color 200ms ease;
}
.search-tab:hover { color: var(--sp-ink, #1b1b1f); }
.search-tab.is-active { color: var(--sp-ink, #1b1b1f); font-weight: 790; }
.search-tab:focus-visible { outline: 2px solid rgba(232, 87, 105, 0.4); outline-offset: 2px; border-radius: 8px; }
.search-tabs-indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 0;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 3px 10px rgba(39, 34, 34, 0.08);
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), width 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease;
}

@media (max-width: 560px) {
  .search-tabs-scroll { justify-content: flex-start; }
  .search-tab { padding: 0 15px; }
}

@media (prefers-reduced-motion: reduce) {
  .search-tabs-indicator,
  .search-tab { transition: none; }
  .search-tabs-scroll { scroll-behavior: auto; }
}
</style>
