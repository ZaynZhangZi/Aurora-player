<template>
  <span class="inline-flex flex-wrap items-center" :class="containerClass">
    <template v-if="normalizedArtists.length">
      <template v-for="(artist, index) in normalizedArtists" :key="`${artist.id || artist.name}-${index}`">
        <span v-if="index > 0" :class="separatorClass">{{ index === normalizedArtists.length - 1 ? '和' : '、' }}</span>
        <span
          class="artist-link cursor-pointer transition"
          :class="linkClass"
          role="link"
          tabindex="0"
          :aria-label="`打开${artist.name}的歌手主页`"
          @click.stop="openArtist(artist)"
          @keydown.enter.stop.prevent="openArtist(artist)"
          @keydown.space.stop.prevent="openArtist(artist)"
        >
          {{ artist.name }}
        </span>
      </template>
    </template>
    <span v-else :class="fallbackClass">{{ fallbackText }}</span>
  </span>
</template>

<script setup>
import {computed} from 'vue'
import {useRouter} from 'vue-router'
import {useDetailNavigation} from '@/composables/useDetailNavigation.js'

const props = defineProps({
  artists: {type: [Array, String, Object], default: () => []},
  fallbackText: {type: String, default: '未知歌手'},
  containerClass: {type: String, default: ''},
  linkClass: {type: String, default: ''},
  separatorClass: {type: String, default: ''},
  fallbackClass: {type: String, default: ''},
})

const router = useRouter()
const {openDetail} = useDetailNavigation()

const normalizedArtists = computed(() => {
  const source = Array.isArray(props.artists)
    ? props.artists
    : props.artists
      ? [props.artists]
      : []
  const normalized = source.flatMap((item) => {
    const id = item?.id || item?.artistId || item?.userId || ''
    const rawName = String(item?.name || item?.artistName || (typeof item === 'string' ? item : '')).trim()
    if (!rawName) return []
    return rawName
      .split(/\s*(?:\/|／|、|,|，)\s*/)
      .filter(name => name && !['未知艺人', '未知歌手', '未知'].includes(name))
      .map(name => ({id, name}))
  })
  const seen = new Set()
  return normalized.filter((artist) => {
    const key = String(artist.id || artist.name).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

function openArtist(artist) {
  if (!artist?.name) return
  const id = String(artist.id || '').trim()
  if (id) {
    // 有 id：走统一详情入口（悬浮层/整页由 App 决定），保留 name 以便标题展示
    openDetail('artist', id, {query: {name: artist.name}})
    return
  }
  // 仅有歌手名、无 id：进入按名称解析的歌手页
  router.push({name: 'artistByName', query: {name: artist.name}})
}
</script>

<style scoped>
.artist-link {
  border-radius: 2px;
  outline: none;
  text-decoration: none;
  text-underline-offset: 2px;
}

.artist-link:hover,
.artist-link:focus-visible {
  text-decoration: underline;
}

.artist-link:focus-visible {
  box-shadow: 0 0 0 2px currentColor;
}
</style>
