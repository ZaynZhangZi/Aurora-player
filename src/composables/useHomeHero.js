import { computed, ref } from 'vue'

export function useHomeHero(hero) {
  const heroCopyIndex = ref(0)
  let heroCopyTimer = null

  const heroCopyItems = computed(() => {
    const dynamicTitle = String(hero.value.title || '').trim()
    const dynamicSubtitle = String(hero.value.subtitle || '').trim()
    const fallbackSubtitle = dynamicSubtitle || '让音乐接住此刻的心情'
    const items = [
      { title: '今天听点什么', subtitle: fallbackSubtitle },
      { title: dynamicTitle || '跟着此刻的节奏走', subtitle: dynamicSubtitle || '从模糊的念头开始，慢慢找到下一首歌' },
      { title: '让声音慢慢靠近', subtitle: dynamicSubtitle || '推荐、最近播放和榜单会自然接上你的下一句' },
    ]
    const seen = new Set()
    return items.filter((item) => {
      const key = `${item.title}::${item.subtitle}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })

  const heroCopyLine = computed(() => {
    return heroCopyItems.value[heroCopyIndex.value % heroCopyItems.value.length] || heroCopyItems.value[0]
  })

  const heroCopyKey = computed(() => `${heroCopyIndex.value}-${heroCopyLine.value?.title || ''}`)

  function stopHeroCopyCycle() {
    if (heroCopyTimer) {
      clearInterval(heroCopyTimer)
      heroCopyTimer = null
    }
  }

  function startHeroCopyCycle() {
    stopHeroCopyCycle()
    if (typeof window === 'undefined' || heroCopyItems.value.length <= 1) return
    heroCopyTimer = window.setInterval(() => {
      heroCopyIndex.value = (heroCopyIndex.value + 1) % heroCopyItems.value.length
    }, 4600)
  }

  function resetHeroCopyCycle() {
    heroCopyIndex.value = 0
    startHeroCopyCycle()
  }

  return {
    heroCopyItems,
    heroCopyLine,
    heroCopyKey,
    startHeroCopyCycle,
    stopHeroCopyCycle,
    resetHeroCopyCycle,
  }
}
