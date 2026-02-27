<template>
  <div class="h-full w-full overflow-y-auto bg-gradient-to-b from-neutral-900 to-black text-white">
    <div class="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-semibold">{{ songName }}</h2>
          <p class="mt-1 text-sm text-white/60">{{ artistName }}</p>
        </div>
        <button class="rounded-full border border-white/20 px-4 py-1.5 text-sm hover:bg-white/10" type="button" @click="goBack">
          关闭
        </button>
      </div>

      <p v-if="loading" class="text-sm text-white/60">正在加载歌曲...</p>
      <p v-else-if="error" class="text-sm text-red-300">{{ error }}</p>

      <template v-else>
        <audio v-if="songUrl" class="mb-6 w-full" :src="songUrl" controls autoplay />
        <p v-else class="mb-6 text-sm text-white/60">当前歌曲暂时没有可播放链接</p>

        <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 class="mb-3 text-sm uppercase tracking-wide text-white/60">歌词</h3>
          <pre class="max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 text-white/90">{{ lyric || '暂无歌词' }}</pre>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import {onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {songsApi} from '@/api/songsApi/songsApi.js'

const route = useRoute()
const router = useRouter()

const songName = ref('歌曲详情')
const artistName = ref('')
const songUrl = ref('')
const lyric = ref('')
const loading = ref(true)
const error = ref('')

function goBack() {
  router.back()
}

async function loadSongDetail() {
  loading.value = true
  error.value = ''
  songUrl.value = ''
  lyric.value = ''

  const id = route.query.id
  if (!id) {
    error.value = '缺少歌曲 id'
    loading.value = false
    return
  }

  try {
    const [detailRes, urlRes, lyricRes] = await Promise.all([
      songsApi.getSongDetail(id),
      songsApi.getSongUrl(id),
      songsApi.getLyric(id),
    ])

    const detail = detailRes?.data?.songs?.[0]
    if (detail?.name) songName.value = detail.name
    if (detail?.ar?.[0]?.name) artistName.value = detail.ar[0].name

    songUrl.value = urlRes?.data?.data?.[0]?.url || ''
    lyric.value = lyricRes?.data?.lrc?.lyric || ''
  } catch (err) {
    error.value = err?.message || '歌曲加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSongDetail()
})

watch(
  () => route.query.id,
  () => {
    loadSongDetail()
  },
)
</script>
