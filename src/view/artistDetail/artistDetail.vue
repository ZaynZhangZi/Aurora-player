<!-- ArtistHero.vue -->
<template>
  <section
    ref="heroRoot"
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
      <div
        class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/0 md:from-black/80 md:via-black/45"
      />
    </div>

    <!-- 前景内容 -->
    <div class="absolute inset-0 z-10 flex flex-col justify-end">
      <div class="w-full pb-6 md:pb-12 lg:pb-16 px-4 sm:px-6 md:px-12 lg:px-20">
        <!-- 框架：左固定，右横滑 -->
        <div class="flex flex-col md:flex-row md:items-end gap-5 sm:gap-6 md:gap-12 text-white">
          <!-- 左：艺人信息（不改） -->
          <div class="flex flex-col items-start gap-3 sm:gap-4">
            <button
              class="grid place-items-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-white text-black
                     shadow-[0_0_20px_rgba(255,255,255,0.35)] hover:scale-105 transition-transform"
              aria-label="Play"
            >
              <svg class="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>

            <h1
              class="leading-tight font-bold tracking-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]
                     text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
            >
              {{ artist }}
            </h1>
          </div>

          <!-- ✅ 横向滑动部分（布局不变，仅加按钮与逻辑） -->
          <div class="relative flex-1 min-w-0 max-w-full">
            <!-- 横向滚动容器 -->
            <div
              ref="hScroll"
              class="no-scrollbar flex items-end gap-4 sm:gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory pb-1"
              style="-webkit-overflow-scrolling: touch; scroll-behavior: smooth;"
            >
              <!-- Slide 1：Latest Release -->
              <section
                class="snap-start shrink-0 min-w-[260px] sm:min-w-[360px] md:min-w-[440px] max-w-[480px]"
                aria-label="Latest Release"
              >
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
              </section>

              <!-- Slide 2：Top Songs（可复制更多 section） -->
              <section
                class="snap-start shrink-0 min-w-[260px] sm:min-w-[360px] md:min-w-[440px] max-w-[480px]"
                aria-label="Top Songs"
              >
                <div class="flex justify-between items-center mb-1.5 sm:mb-2">
                  <h2 class="text-white text-sm sm:text-base font-semibold">Top Songs</h2>
                  <button class="text-white/70 hover:text-white text-lg sm:text-xl leading-none" aria-label="More">›</button>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="(song, i) in topSongs"
                    :key="i"
                    class="flex items-center justify-between rounded-xl border border-white/10
                           bg-white/10 hover:bg-white/15 transition px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-xl min-h-12"
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
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </section>  <section
              class="snap-start shrink-0 min-w-[260px] sm:min-w-[360px] md:min-w-[440px] max-w-[480px]"
              aria-label="Top Songs"
            >
              <div class="flex justify-between items-center mb-1.5 sm:mb-2">
                <h2 class="text-white text-sm sm:text-base font-semibold">Top Songs</h2>
                <button class="text-white/70 hover:text-white text-lg sm:text-xl leading-none" aria-label="More">›</button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(song, i) in topSongs"
                  :key="i"
                  class="flex items-center justify-between rounded-xl border border-white/10
                           bg-white/10 hover:bg-white/15 transition px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-xl min-h-12"
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>  <section
              class="snap-start shrink-0 min-w-[260px] sm:min-w-[360px] md:min-w-[440px] max-w-[480px]"
              aria-label="Top Songs"
            >
              <div class="flex justify-between items-center mb-1.5 sm:mb-2">
                <h2 class="text-white text-sm sm:text-base font-semibold">Top Songs</h2>
                <button class="text-white/70 hover:text-white text-lg sm:text-xl leading-none" aria-label="More">›</button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(song, i) in topSongs"
                  :key="i"
                  class="flex items-center justify-between rounded-xl border border-white/10
                           bg-white/10 hover:bg-white/15 transition px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-xl min-h-12"
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>  <section
              class="snap-start shrink-0 min-w-[260px] sm:min-w-[360px] md:min-w-[440px] max-w-[480px]"
              aria-label="Top Songs"
            >
              <div class="flex justify-between items-center mb-1.5 sm:mb-2">
                <h2 class="text-white text-sm sm:text-base font-semibold">Top Songs</h2>
                <button class="text-white/70 hover:text-white text-lg sm:text-xl leading-none" aria-label="More">›</button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(song, i) in topSongs"
                  :key="i"
                  class="flex items-center justify-between rounded-xl border border-white/10
                           bg-white/10 hover:bg-white/15 transition px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-xl min-h-12"
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>  <section
              class="snap-start shrink-0 min-w-[260px] sm:min-w-[360px] md:min-w-[440px] max-w-[480px]"
              aria-label="Top Songs"
            >
              <div class="flex justify-between items-center mb-1.5 sm:mb-2">
                <h2 class="text-white text-sm sm:text-base font-semibold">Top Songs</h2>
                <button class="text-white/70 hover:text-white text-lg sm:text-xl leading-none" aria-label="More">›</button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(song, i) in topSongs"
                  :key="i"
                  class="flex items-center justify-between rounded-xl border border-white/10
                           bg-white/10 hover:bg-white/15 transition px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-xl min-h-12"
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>  <section
              class="snap-start shrink-0 min-w-[260px] sm:min-w-[360px] md:min-w-[440px] max-w-[480px]"
              aria-label="Top Songs"
            >
              <div class="flex justify-between items-center mb-1.5 sm:mb-2">
                <h2 class="text-white text-sm sm:text-base font-semibold">Top Songs</h2>
                <button class="text-white/70 hover:text-white text-lg sm:text-xl leading-none" aria-label="More">›</button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(song, i) in topSongs"
                  :key="i"
                  class="flex items-center justify-between rounded-xl border border-white/10
                           bg-white/10 hover:bg-white/15 transition px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-xl min-h-12"
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>  <section
              class="snap-start shrink-0 min-w-[260px] sm:min-w-[360px] md:min-w-[440px] max-w-[480px]"
              aria-label="Top Songs"
            >
              <div class="flex justify-between items-center mb-1.5 sm:mb-2">
                <h2 class="text-white text-sm sm:text-base font-semibold">Top Songs</h2>
                <button class="text-white/70 hover:text-white text-lg sm:text-xl leading-none" aria-label="More">›</button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(song, i) in topSongs"
                  :key="i"
                  class="flex items-center justify-between rounded-xl border border-white/10
                           bg-white/10 hover:bg-white/15 transition px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-xl min-h-12"
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>  <section
              class="snap-start shrink-0 min-w-[260px] sm:min-w-[360px] md:min-w-[440px] max-w-[480px]"
              aria-label="Top Songs"
            >
              <div class="flex justify-between items-center mb-1.5 sm:mb-2">
                <h2 class="text-white text-sm sm:text-base font-semibold">Top Songs</h2>
                <button class="text-white/70 hover:text-white text-lg sm:text-xl leading-none" aria-label="More">›</button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(song, i) in topSongs"
                  :key="i"
                  class="flex items-center justify-between rounded-xl border border-white/10
                           bg-white/10 hover:bg-white/15 transition px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-xl min-h-12"
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>  <section
              class="snap-start shrink-0 min-w-[260px] sm:min-w-[360px] md:min-w-[440px] max-w-[480px]"
              aria-label="Top Songs"
            >
              <div class="flex justify-between items-center mb-1.5 sm:mb-2">
                <h2 class="text-white text-sm sm:text-base font-semibold">Top Songs</h2>
                <button class="text-white/70 hover:text-white text-lg sm:text-xl leading-none" aria-label="More">›</button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(song, i) in topSongs"
                  :key="i"
                  class="flex items-center justify-between rounded-xl border border-white/10
                           bg-white/10 hover:bg-white/15 transition px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-xl min-h-12"
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>  <section
              class="snap-start shrink-0 min-w-[260px] sm:min-w-[360px] md:min-w-[440px] max-w-[480px]"
              aria-label="Top Songs"
            >
              <div class="flex justify-between items-center mb-1.5 sm:mb-2">
                <h2 class="text-white text-sm sm:text-base font-semibold">Top Songs</h2>
                <button class="text-white/70 hover:text-white text-lg sm:text-xl leading-none" aria-label="More">›</button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(song, i) in topSongs"
                  :key="i"
                  class="flex items-center justify-between rounded-xl border border-white/10
                           bg-white/10 hover:bg-white/15 transition px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-xl min-h-12"
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>  <section
              class="snap-start shrink-0 min-w-[260px] sm:min-w-[360px] md:min-w-[440px] max-w-[480px]"
              aria-label="Top Songs"
            >
              <div class="flex justify-between items-center mb-1.5 sm:mb-2">
                <h2 class="text-white text-sm sm:text-base font-semibold">Top Songs</h2>
                <button class="text-white/70 hover:text-white text-lg sm:text-xl leading-none" aria-label="More">›</button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(song, i) in topSongs"
                  :key="i"
                  class="flex items-center justify-between rounded-xl border border-white/10
                           bg-white/10 hover:bg-white/15 transition px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-xl min-h-12"
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>

              <!-- ... 继续你的其它 section ... -->
            </div>

            <!-- ⬅️➡️ 桌面箭头（移动端隐藏，不改变布局） -->
            <button
              v-show="canScrollLeft"
              @click="scrollBy(-1)"
              class="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full
                     bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/25
                     items-center justify-center shadow-lg transition"
              :aria-disabled="!canScrollLeft"
              aria-label="Scroll left"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5 text-white"><path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>

            <button
              v-show="canScrollRight"
              @click="scrollBy(1)"
              class="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full
                     bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/25
                     items-center justify-center shadow-lg transition"
              :aria-disabled="!canScrollRight"
              aria-label="Scroll right"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5 text-white"><path fill="currentColor" d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
            </button>
          </div>
          <!-- 横滑结束 -->
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  background: {
    type: String,
    default:
      "https://mvod.itunes.apple.com/itunes-assets/HLSMusic211/v4/ad/6b/bf/ad6bbf41-f62f-b4ab-116b-2d3516f3d85b/P854854673_Anull_video_gr598_sdr_3840x2160-.mp4",
  },
  artist: { type: String, default: "ILLIT" },
  latest: {
    type: Object,
    default: () => ({
      albumCover: "https://i.imgur.com/3y7YzWm.jpg",
      title: "1989 (Taylor’s Version) [Deluxe]",
      date: "Oct 27, 2023",
    }),
  },
  topSongs: {
    type: Array,
    default: () => ([
      { title: "Lover", album: "Lover", year: 2019, cover: "https://i.imgur.com/vn1E3QW.jpg" },
      { title: "You Need To Calm Down", album: "Lover", year: 2019, cover: "https://i.imgur.com/vn1E3QW.jpg" },
      { title: "Cruel Summer", album: "Lover", year: 2019, cover: "https://i.imgur.com/vn1E3QW.jpg" },
      { title: "Blank Space", album: "1989", year: 2019, cover: "https://i.imgur.com/xzD7QhF.jpg" },
    ]),
  },
});

const bgIsVideo = computed(() => /\.mp4($|\?)/i.test(props.background));
const bgAttrs = computed(() =>
  bgIsVideo.value
    ? { src: props.background, playsinline: true, muted: true, autoplay: true, loop: true }
    : { src: props.background, alt: "Artist Background" }
);

// refs
const heroRoot = ref(null);
const hScroll  = ref(null);

// 按钮可用状态
const canScrollLeft  = ref(false);
const canScrollRight = ref(false);

// 计算当前是否可以左右继续滚动
const updateArrows = () => {
  const el = hScroll.value;
  if (!el) return;
  const max = el.scrollWidth - el.clientWidth - 1; // -1 容错
  canScrollLeft.value  = el.scrollLeft > 1;
  canScrollRight.value = el.scrollLeft < max;
};

// 点击左右滚动（每次滚一屏宽的 90%）
const scrollBy = (dir /* -1 | 1 */) => {
  const el = hScroll.value;
  if (!el) return;
  const page = Math.max(200, Math.floor(el.clientWidth * 0.9));
  const target = Math.max(0, Math.min(el.scrollLeft + dir * page, el.scrollWidth - el.clientWidth));
  el.scrollTo({ left: target, behavior: "smooth" });
};

// 事件绑定
let resizeObs;
onMounted(() => {
  const el = hScroll.value;
  if (!el) return;

  updateArrows();
  el.addEventListener("scroll", updateArrows, { passive: true });

  // ResizeObserver：容器或内容变化时更新按钮状态
  if ("ResizeObserver" in window) {
    resizeObs = new ResizeObserver(updateArrows);
    resizeObs.observe(el);
  } else {
    window.addEventListener("resize", updateArrows, { passive: true });
  }
});

onBeforeUnmount(() => {
  const el = hScroll.value;
  if (el) el.removeEventListener("scroll", updateArrows);
  if (resizeObs) {
    resizeObs.disconnect();
  } else {
    window.removeEventListener("resize", updateArrows);
  }
});
</script>

<style scoped>
/* 隐藏横向滚动条（不影响滚动） */
.no-scrollbar {
  -ms-overflow-style: none;  /* IE/Edge */
  scrollbar-width: none;     /* Firefox */
}
.no-scrollbar::-webkit-scrollbar {
  display: none;             /* Chrome/Safari */
}
</style>
