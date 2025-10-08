<!-- ArtistHero.vue -->
<template>
  <section
    class="relative w-full h-[100svh] min-h-[560px] overflow-hidden"
  >
    <!-- 背景：图/视频 -->
    <div class="absolute inset-0">
      <component
        :is="bgIsVideo ? 'video' : 'img'"
        v-bind="bgAttrs"
        class="w-full h-full object-cover object-center"
        autoplay
        muted
        loop
        playsinline
      />
      <!-- 移动端更强的底部加深，顶部柔光 -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/0 md:from-black/80 md:via-black/45" />
    </div>

    <!-- 前景内容 -->
    <div class="absolute inset-0 z-10 flex flex-col justify-end">
      <div
        class="w-full pb-6 md:pb-12 lg:pb-16 px-4 sm:px-6 md:px-12 lg:px-20"
      >
        <!-- 移动端：纵排；桌面：横排 -->
        <div
          class="flex flex-col md:flex-row md:items-end gap-5 sm:gap-6 md:gap-12 text-white"
        >
          <!-- 左：艺人信息（移动端更紧凑） -->
          <div class="flex flex-col items-start gap-3 sm:gap-4">
            <button
              class="grid place-items-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-white text-black
                     shadow-[0_0_20px_rgba(255,255,255,0.35)] hover:scale-105 transition-transform"
              aria-label="Play"
            >
              <svg class="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>

            <h1
              class="leading-tight font-bold tracking-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]
                     text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
            >
              {{ artist }}
            </h1>
          </div>

          <!-- 中：最新专辑（移动端缩略更小、按钮在超小屏只显示“+”） -->
          <div class="flex flex-col flex-1 min-w-[260px] max-w-[480px]">
            <p class="text-white/85 text-sm sm:text-base mb-2 sm:mb-3">Latest Release</p>
            <div
              class="flex items-center gap-3 sm:gap-4 bg-white/10 backdrop-blur-xl border border-white/10
                     p-3 sm:p-4 rounded-2xl hover:bg-white/15 transition w-full"
            >
              <img
                :src="latest.albumCover"
                alt="album"
                class="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl object-cover shadow-lg flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-[10px] sm:text-xs uppercase tracking-wide text-white/70">Latest Album</p>
                <h3 class="text-white font-medium truncate text-sm sm:text-base">{{ latest.title }}</h3>
                <p class="text-[10px] sm:text-xs text-white/60 mt-0.5">{{ latest.date }}</p>
              </div>
              <button
                class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/20 hover:bg-white/30
                       text-white text-xs sm:text-sm font-medium transition whitespace-nowrap"
              >
                <span class="sm:hidden">+</span>
                <span class="hidden sm:inline">+ Add</span>
              </button>
            </div>
          </div>

          <!-- 右：热门歌曲（移动端每项触达 ≥48px、更紧凑） -->
          <div class="flex flex-col flex-1 min-w-[260px] max-w-[480px]">
            <div class="flex justify-between items-center mb-1.5 sm:mb-2">
              <h2 class="text-white text-sm sm:text-base font-semibold">Top Songs</h2>
              <button class="text-white/70 hover:text-white text-lg sm:text-xl leading-none" aria-label="More">›</button>
            </div>
            <div class="space-y-2">
              <div
                v-for="(song, i) in topSongs"
                :key="i"
                class="flex items-center justify-between rounded-xl border border-white/10
                       bg-white/10 hover:bg-white/15 transition px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-xl
                       min-h-12"
              >
                <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <img :src="song.cover" class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover flex-shrink-0" />
                  <div class="truncate">
                    <p class="text-[13px] sm:text-sm font-medium text-white truncate">{{ song.title }}</p>
                    <p class="text-[11px] sm:text-xs text-white/65 truncate">{{ song.album }} · {{ song.year }}</p>
                  </div>
                </div>
                <button class="text-white/70 hover:text-white flex-shrink-0 ml-2 sm:ml-3" aria-label="Add">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                </button>
              </div>

            </div>
          </div>


        </div>

      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  background: {
    type: String,
    default:
      'https://mvod.itunes.apple.com/itunes-assets/HLSMusic211/v4/ad/6b/bf/ad6bbf41-f62f-b4ab-116b-2d3516f3d85b/P854854673_Anull_video_gr598_sdr_3840x2160-.mp4',
  },
  artist: { type: String, default: 'ILLIT' },
  latest: {
    type: Object,
    default: () => ({
      albumCover: 'https://i.imgur.com/3y7YzWm.jpg',
      title: '1989 (Taylor’s Version) [Deluxe]',
      date: 'Oct 27, 2023',
    }),
  },
  topSongs: {
    type: Array,
    default: () => ([
      { title: 'Lover', album: 'Lover', year: 2019, cover: 'https://i.imgur.com/vn1E3QW.jpg' },
      { title: 'You Need To Calm Down', album: 'Lover', year: 2019, cover: 'https://i.imgur.com/vn1E3QW.jpg' },
      { title: 'Cruel Summer', album: 'Lover', year: 2019, cover: 'https://i.imgur.com/vn1E3QW.jpg' },
      { title: 'Blank Space', album: '1989', year: 2019, cover: 'https://i.imgur.com/xzD7QhF.jpg' },
    ]),
  },
})

const bgIsVideo = computed(() => /\.mp4($|\?)/i.test(props.background))
const bgAttrs = computed(() =>
  bgIsVideo.value
    ? { src: props.background, playsinline: true, muted: true, autoplay: true, loop: true }
    : { src: props.background, alt: 'Artist Background' }
)
</script>
