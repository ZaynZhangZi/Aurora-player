<template>
  <span class="inline-flex flex-wrap items-center" :class="containerClass">
    <template v-if="normalizedArtists.length">
      <template v-for="(artist, index) in normalizedArtists" :key="`${artist.id || artist.name}-${index}`">
        <span v-if="index > 0" :class="separatorClass">{{ index === normalizedArtists.length - 1 ? '和' : '、' }}</span>
        <span
          class="cursor-pointer transition"
          :class="linkClass"
          @click.stop="openArtist(artist)"
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

const props = defineProps({
  artists: {type: Array, default: () => []},
  fallbackText: {type: String, default: '未知歌手'},
  containerClass: {type: String, default: ''},
  linkClass: {type: String, default: ''},
  separatorClass: {type: String, default: ''},
  fallbackClass: {type: String, default: ''},
})

const router = useRouter()

const normalizedArtists = computed(() => {
  return (props.artists || [])
    .map(item => ({
      id: item?.id || item?.artistId || item?.userId || '',
      name: item?.name || item?.artistName || '',
    }))
    .filter(item => item.name)
})

function openArtist(artist) {
  if (!artist?.name) return
  router.push({
    path: '/artistDetial',
    query: {
      id: artist.id || '',
      name: artist.name,
    },
  })
}
</script>
