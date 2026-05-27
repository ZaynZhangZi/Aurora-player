<template>
  <div class="min-h-screen bg-[#F5F5F7] text-zinc-900 selection:bg-zinc-900 selection:text-white font-sans antialiased">
    <!-- Immersive Apple-Style Hero Section -->
    <section class="relative h-[60vh] min-h-[480px] overflow-hidden sm:h-[70vh]">
      <SmartMedia
        class="absolute inset-0 h-full w-full object-cover scale-105 transition-transform duration-[8s] ease-out"
        :src="hero.media"
        :media-type="hero.mediaType"
        :title="hero.title"
        :content="hero.subtitle"
        :lock-muted="true"
      />
      <!-- Soft Light Mask Gradients -->
      <div class="absolute inset-0 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/40 to-black/[0.02]" />
      <div class="absolute inset-0 bg-gradient-to-r from-[#F5F5F7]/60 via-transparent to-transparent" />

      <div class="relative mx-auto flex h-full max-w-7xl items-end px-6 pb-16 sm:px-10 sm:pb-24">
        <div class="motion-section home-hero-copy max-w-3xl">
          <span class="inline-flex items-center rounded-full bg-zinc-900/5 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-600 backdrop-blur-md ring-1 ring-black/[0.04] mb-4">
            My Music Demo
          </span>
          <Transition name="hero-copy-spring" mode="out-in">
            <div :key="heroCopyKey" class="hero-copy-block">
              <h1 class="text-5xl font-black tracking-tight text-zinc-900 sm:text-7xl lg:text-8xl">
                {{ heroCopyLine.title }}
              </h1>
              <p class="mt-5 max-w-md text-sm font-semibold leading-relaxed text-zinc-500 sm:text-base">
                {{ heroCopyLine.subtitle }}
              </p>
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <!-- Main Dynamic Container -->
    <main class="relative z-10 mx-auto -mt-10 max-w-7xl px-6 pb-32 sm:px-10">
      <!-- Section: Recommended Playlists -->
      <section class="motion-section mb-20 sm:mb-24">
        <div class="mb-8 flex items-end justify-between">
          <div>
            <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">推荐歌单</h2>
            <div class="mt-1.5 h-1 w-6 rounded-full bg-zinc-900" />
          </div>
        </div>

        <p v-if="loading.recommend" class="animate-pulse text-sm font-semibold text-zinc-400">正在为你打磨专属乐单...</p>
        <p v-else-if="errors.recommend" class="text-sm font-semibold text-rose-600 bg-rose-50 rounded-2xl p-4 ring-1 ring-rose-200">{{ errors.recommend }}</p>

        <div v-else class="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          <article
            v-for="item in recommendPlaylists"
            :key="item.id"
            class="motion-card group cursor-pointer"
            :style="getPlaylistCardTransitionStyle(item)"
            @click="openPlaylist(item, $event)"
          >
            <div class="relative aspect-square overflow-hidden rounded-[28px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.04] transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)] group-hover:ring-black/[0.08]" data-playlist-hero-cover :data-playlist-id="item.id" :style="getPlaylistCoverTransitionStyle(item)">
              <SmartMedia :src="item.picUrl" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <!-- Glass Hover Dynamic Overlay -->
              <div class="absolute inset-0 bg-black/[0.02] opacity-0 transition-opacity duration-500 group-hover:opacity-100 flex items-center justify-center">
                <div class="scale-90 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100 flex h-14 w-14 items-center justify-center rounded-full bg-white text-zinc-900 shadow-xl border border-black/[0.04]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
            </div>
            <p class="mt-4 px-1 line-clamp-2 text-[15px] font-bold leading-snug text-zinc-800 transition-colors duration-300 group-hover:text-zinc-600">{{ item.name }}</p>
          </article>
        </div>
      </section>

      <!-- Section: Web Selection -->
      <section class="motion-section mb-20 sm:mb-24">
        <div class="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">网友精选碟</h2>
            <div class="mt-1.5 h-1 w-6 rounded-full bg-zinc-900" />
          </div>
          <div class="flex flex-wrap items-center gap-1.5 rounded-full bg-white/60 p-1.5 backdrop-blur-xl ring-1 ring-black/[0.04] shadow-sm">
            <button
              v-for="tag in playlistTags"
              :key="tag"
              :class="activePlaylistTag === tag ? 'bg-zinc-900 text-white shadow-md font-bold' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'"
              class="rounded-full px-5 py-2 text-xs font-bold transition-all duration-300"
              type="button"
              @click="changePlaylistTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>

        <p v-if="loading.top" class="animate-pulse text-sm font-semibold text-zinc-400">正在搜罗精选内容...</p>
        <p v-else-if="errors.top" class="text-sm font-semibold text-rose-600 bg-rose-50 rounded-2xl p-4 ring-1 ring-rose-200">{{ errors.top }}</p>

        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in topPlaylists"
            :key="item.id"
            class="motion-card group flex cursor-pointer items-center gap-5 rounded-[24px] p-3.5 bg-white border border-black/[0.02] shadow-[0_8px_24px_rgba(0,0,0,0.02)] transition-all duration-300 hover:bg-white hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)] hover:border-black/[0.06]"
            :style="getPlaylistCardTransitionStyle(item)"
            @click="openPlaylist(item, $event)"
          >
            <div class="h-22 w-22 shrink-0 overflow-hidden rounded-[18px] shadow-sm ring-1 ring-black/[0.04] transition-transform duration-500 group-hover:scale-[1.03]" data-playlist-hero-cover :data-playlist-id="item.id" :style="getPlaylistCoverTransitionStyle(item)">
              <SmartMedia :src="item.coverImgUrl" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0 flex-1 pr-2">
              <p class="truncate text-base font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors">{{ item.name }}</p>
              <p class="mt-1.5 line-clamp-2 text-[13px] font-medium leading-relaxed text-zinc-400">{{ item.copywriter || item.description || '精选音乐集合' }}</p>
            </div>
          </article>
        </div>
      </section>

      <!-- Section: Recent Listening -->
      <section class="motion-section mb-20 sm:mb-24">
        <div class="mb-6 border-b border-black/[0.06] pb-4 flex items-center justify-between">
          <h2 class="text-xl font-bold tracking-tight text-zinc-900">最近听歌</h2>

          <div v-if="recentListenSongs.length > 0" class="flex items-center gap-2.5 text-xs animate-fade-in">
            <span class="text-[11px] font-bold text-zinc-400 bg-white border border-black/[0.04] px-2.5 py-1 rounded shadow-sm">
              {{ recentScrollPage }} / {{ recentScrollTotalPages }}
            </span>

            <div class="flex items-center gap-1">
              <button
                class="flex h-7 w-7 items-center justify-center rounded-md bg-white border border-zinc-200 text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
                type="button"
                :disabled="recentScrollPage <= 1"
                @click="scrollRecent(-1)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>

              <button
                class="flex h-7 w-7 items-center justify-center rounded-md bg-white border border-zinc-200 text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
                type="button"
                :disabled="recentScrollPage >= recentScrollTotalPages"
                @click="scrollRecent(1)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        </div>

        <p v-if="loading.recent" class="animate-pulse text-xs font-semibold text-zinc-400 py-6">正在回溯聆听印记...</p>
        <p v-else-if="errors.recent" class="text-xs font-semibold text-rose-600 bg-rose-50 rounded-xl p-3.5 border border-rose-100">{{ errors.recent }}</p>

        <div v-else class="relative">
          <div
            ref="recentScroller"
            class="flex gap-5 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory select-none touch-pan-y [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            :class="isRecentDragging ? 'cursor-grabbing' : 'cursor-grab'"
            @scroll.passive="updateRecentScrollState"
            @pointerdown="handleRecentPointerDown"
            @pointermove="handleRecentPointerMove"
            @pointerup="handleRecentPointerUp"
            @pointercancel="handleRecentPointerUp"
            @pointerleave="handleRecentPointerUp"
            @dragstart.prevent
          >
            <button
              v-for="(song, index) in recentListenSongs"
              :key="`recent-${song.id}-${index}`"
              class="flex-none w-36 sm:w-40 snap-start group text-left focus:outline-none"
              type="button"
              @click="handleRecentSongClick(song, index, $event)"
            >
              <div class="relative aspect-square w-full overflow-hidden rounded-xl border border-black/[0.04] shadow-sm bg-white/40 backdrop-blur-sm mb-3">
                <SmartMedia :src="song.cover || song.al?.picUrl || song.album?.picUrl || ''" class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]" />

                <div class="absolute inset-0 bg-black/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center">
                  <div class="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#0071E3] shadow-md border border-black/[0.02] backdrop-blur-md transform scale-95 group-hover:scale-100 transition-transform duration-300">
                    <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
              </div>

              <div class="px-0.5">
                <p class="truncate text-[13.5px] font-semibold text-zinc-900 transition-colors duration-200 group-hover:text-[#0071E3]">{{ song.name }}</p>
                <ArtistLinks :artists="getSongArtists(song)" class="mt-0.5 truncate text-[11.5px] font-medium text-zinc-400 block" />
              </div>
            </button>

            <p v-if="!recentListenSongs.length" class="text-xs font-semibold text-zinc-400 py-10 w-full text-center border border-dashed border-black/10 rounded-xl bg-white/10">暂无近期的播放记录</p>
          </div>
        </div>
      </section>

      <!-- Section: Hot Charts (Editorial Look) -->
      <section class="motion-section mb-20 sm:mb-24">
        <div class="mb-8 flex items-end justify-between">
          <div>
            <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">热门榜单</h2>
            <div class="mt-1.5 h-1 w-6 rounded-full bg-zinc-900" />
          </div>
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 bg-white border border-black/[0.04] px-2.5 py-1 rounded-md shadow-sm">Top Charts</span>
        </div>

        <p v-if="loading.rank" class="animate-pulse text-sm font-semibold text-zinc-400">正在分析流行数据...</p>
        <p v-else-if="errors.rank" class="text-sm font-semibold text-rose-600 bg-rose-50 rounded-2xl p-4 ring-1 ring-rose-200">{{ errors.rank }}</p>

        <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="rank in topRanks"
            :key="rank.id"
            class="group cursor-pointer rounded-[32px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.03] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_48px_rgba(0,0,0,0.06)] hover:ring-black/[0.06]"
            :style="getPlaylistCardTransitionStyle(rank)"
            @click="openPlaylist(rank, $event)"
          >
            <div class="mb-6 flex items-center gap-5">
              <div class="h-20 w-20 shrink-0 overflow-hidden rounded-[20px] shadow-sm ring-1 ring-black/[0.04]" data-playlist-hero-cover :data-playlist-id="rank.id" :style="getPlaylistCoverTransitionStyle(rank)">
                <SmartMedia :src="rank.coverImgUrl" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div>
                <p class="text-xl font-black tracking-tight text-zinc-900 transition-colors group-hover:text-zinc-700">{{ rank.name }}</p>
                <p class="mt-1 text-[12px] font-bold text-zinc-400 bg-zinc-50 border border-black/[0.03] px-2 py-0.5 rounded inline-block">{{ rank.updateFrequency || '实时更新' }}</p>
              </div>
            </div>
            <div class="space-y-3 rounded-2xl bg-zinc-50/60 border border-black/[0.01] p-4.5">
              <p v-for="(item, idx) in rank.tracks || []" :key="`${rank.id}-${idx}`" class="truncate text-[13px] font-semibold text-zinc-700 flex items-center">
                <span class="mr-3.5 font-black text-center w-4 text-[14px]" :class="idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-zinc-400' : idx === 2 ? 'text-amber-700' : 'text-zinc-300'">{{ idx + 1 }}</span>
                <span class="truncate flex-1 group-hover:text-zinc-900 transition-colors">{{ item.first }} <span class="text-zinc-400 font-medium">- {{ item.second }}</span></span>
              </p>
            </div>
          </article>
        </div>
      </section>

      <!-- Section: Premium Podcasts -->
      <section class="motion-section mb-20 sm:mb-24">
        <div class="mb-8">
          <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">精选播客</h2>
          <div class="mt-1.5 h-1 w-6 rounded-full bg-zinc-900" />
        </div>

        <p v-if="loading.podcast" class="animate-pulse text-sm font-semibold text-zinc-400">正在链接声波宇宙...</p>
        <p v-else-if="errors.podcast" class="text-sm font-semibold text-rose-600 bg-rose-50 rounded-2xl p-4 ring-1 ring-rose-200">{{ errors.podcast }}</p>

        <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in podcastPrograms"
            :key="item.id"
            class="group cursor-pointer overflow-hidden rounded-[28px] bg-white border border-black/[0.03] shadow-[0_8px_24px_rgba(0,0,0,0.02)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_48px_rgba(0,0,0,0.05)] hover:border-black/[0.06]"
            @click="openPodcast(item)"
          >
            <div class="aspect-[16/10] overflow-hidden relative border-b border-black/[0.02]">
              <SmartMedia :src="item.picUrl" class="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            </div>
            <div class="p-6">
              <p class="line-clamp-2 text-base font-bold leading-snug text-zinc-900 transition-colors group-hover:text-zinc-700">{{ item.name }}</p>
              <div class="mt-5 flex items-center justify-between gap-4 border-t border-zinc-100 pt-4">
                <p class="truncate text-[13px] font-semibold text-zinc-400">{{ item.program?.radio?.name || item.program?.dj?.nickname || '电台节目' }}</p>
                <span class="shrink-0 rounded-full bg-zinc-50 border border-black/[0.03] px-2.5 py-0.5 text-[11px] font-bold text-zinc-400 tracking-wide">{{ formatPodcastDuration(item.program?.duration) }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Section: Music Video Zone -->
      <section class="mb-20 sm:mb-24">
        <div class="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">MV 专区</h2>
            <div class="mt-1.5 h-1 w-6 rounded-full bg-zinc-900" />
          </div>
          <div class="flex flex-wrap items-center gap-1.5 rounded-full bg-white/60 p-1.5 backdrop-blur-xl ring-1 ring-black/[0.04] shadow-sm">
            <button
              v-for="source in mvSourceOptions"
              :key="source.value"
              class="rounded-full px-5 py-2 text-xs font-bold transition-all duration-300"
              :class="activeMvSource === source.value ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'"
              type="button"
              @click="switchMvSource(source.value)"
            >
              {{ source.label }}
            </button>
          </div>
        </div>

        <!-- Secondary Filters Bar -->
        <div class="mb-8 flex flex-wrap items-center gap-3" v-if="activeMvSource === 'all' || activeMvSource === 'latest'">
          <div class="relative">
            <select v-model="mvArea" class="cursor-pointer appearance-none rounded-full bg-white text-zinc-700 pl-5 pr-10 py-2.5 text-[13px] font-bold outline-none shadow-sm ring-1 ring-black/[0.04] transition hover:bg-zinc-50">
              <option v-for="area in mvAreas" :key="area" :value="area">地区: {{ area }}</option>
            </select>
          </div>
          <div class="relative" v-if="activeMvSource === 'all'">
            <select v-model="mvType" class="cursor-pointer appearance-none rounded-full bg-white text-zinc-700 pl-5 pr-10 py-2.5 text-[13px] font-bold outline-none shadow-sm ring-1 ring-black/[0.04] transition hover:bg-zinc-50">
              <option v-for="type in mvTypes" :key="type" :value="type">类型: {{ type }}</option>
            </select>
          </div>
          <div class="relative" v-if="activeMvSource === 'all'">
            <select v-model="mvOrder" class="cursor-pointer appearance-none rounded-full bg-white text-zinc-700 pl-5 pr-10 py-2.5 text-[13px] font-bold outline-none shadow-sm ring-1 ring-black/[0.04] transition hover:bg-zinc-50">
              <option v-for="order in mvOrders" :key="order" :value="order">排序: {{ order }}</option>
            </select>
          </div>
          <button
            class="flex items-center justify-center rounded-full bg-zinc-900 p-2.5 text-white shadow-md transition hover:bg-zinc-800 active:scale-95"
            type="button"
            @click="loadMvList({reset: true})"
            title="刷新"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          </button>
        </div>

        <p v-if="loading.mv" class="animate-pulse text-sm font-semibold text-zinc-400">正在调谐高清画幅...</p>
        <p v-else-if="errors.mv" class="text-sm font-semibold text-rose-600 bg-rose-50 rounded-2xl p-4 ring-1 ring-rose-200">{{ errors.mv }}</p>

        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in mvList"
            :key="item.id"
            class="motion-card group cursor-pointer"
            @click="openMv(item)"
          >
            <div class="relative aspect-video overflow-hidden rounded-[24px] bg-white border border-black/[0.03] shadow-md transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] group-hover:border-black/[0.06]">
              <SmartMedia :src="item.cover" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <!-- Modern Light Play Counter Badge -->
              <div class="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-zinc-900 shadow-sm backdrop-blur-md border border-black/[0.04]">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-zinc-800"><path d="M8 5v14l11-7z" /></svg>
                {{ Number(item.playCount || 0).toLocaleString() }}
              </div>
            </div>
            <div class="mt-4 px-1">
              <p class="truncate text-[15px] font-bold text-zinc-900 transition-colors group-hover:text-zinc-700">{{ item.name }}</p>
              <p class="mt-1 truncate text-[13px] font-semibold text-zinc-400">{{ item.artistName || '未知歌手' }}</p>
            </div>
          </article>
          <p v-if="!mvList.length" class="text-sm font-semibold text-zinc-400 py-6">暂无 MV 数据</p>
        </div>

        <!-- Pagination Buttons Bar -->
        <div v-if="activeMvSource === 'all' || activeMvSource === 'exclusive'" class="mt-10 flex items-center justify-end gap-4">
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-600 shadow-sm ring-1 ring-black/5 transition hover:bg-zinc-50 disabled:opacity-30"
            type="button"
            :disabled="mvOffset <= 0 || loading.mv"
            @click="prevMvPage"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <span class="text-[13px] font-bold text-zinc-500 bg-white border border-black/[0.04] px-3 py-1.5 rounded-full shadow-sm tracking-wide">PAGE {{ Math.floor(mvOffset / mvLimit) + 1 }}</span>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-600 shadow-sm ring-1 ring-black/5 transition hover:bg-zinc-50 disabled:opacity-30"
            type="button"
            :disabled="!mvHasMore || loading.mv"
            @click="nextMvPage"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </section>

      <!-- Section: Hot Artists -->
      <section class="mb-10">
        <div class="mb-8">
          <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">热门艺人</h2>
          <div class="mt-1.5 h-1 w-6 rounded-full bg-zinc-900" />
        </div>

        <p v-if="loading.artist" class="animate-pulse text-sm font-semibold text-zinc-400">正在群星破晓时...</p>
        <p v-else-if="errors.artist" class="text-sm font-semibold text-rose-600 bg-rose-50 rounded-2xl p-4 ring-1 ring-rose-200">{{ errors.artist }}</p>

        <div v-else class="grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <article
            v-for="artist in hotArtists"
            :key="artist.id"
            class="group cursor-pointer text-center"
            @click="openArtist(artist, $event)"
          >
            <div
              class="mx-auto aspect-square w-full max-w-[150px] overflow-hidden rounded-full shadow-[0_12px_28px_rgba(0,0,0,0.04)] border border-white transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_24px_48px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] group-hover:ring-zinc-900"
              data-artist-hero-cover
              :data-artist-id="artist.id"
            >
              <SmartMedia :src="artist.picUrl" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
            <p class="mt-5 truncate text-[15px] font-black text-zinc-900 transition-colors group-hover:text-zinc-600">{{ artist.name }}</p>
          </article>
        </div>
      </section>
    </main>

    <!-- Overlay Core Layers -->
    <Teleport to="body">
      <!-- 1. Soft Studio-Glass MV Player Modal -->
      <div
        v-if="mvPlayerOpen"
        class="fixed inset-0 z-[1002] bg-zinc-950/40 p-4 backdrop-blur-3xl flex items-center justify-center animate-fade-in"
        @click.self="closeMvPlayer"
      >
        <div class="w-full max-w-5xl overflow-hidden rounded-[32px] bg-white border border-black/[0.04] shadow-2xl">
          <div class="flex items-center justify-between gap-4 border-b border-zinc-100 px-6 py-4.5 text-zinc-900">
            <p class="truncate text-[15px] font-black tracking-wide">{{ currentMv?.name || 'MV 播放' }}</p>
            <div class="flex items-center gap-3">
              <div class="relative" v-if="mvResolutions.length">
                <select
                  v-model="selectedMvResolution"
                  class="appearance-none rounded-full bg-zinc-50 border border-zinc-200 pl-4 pr-8 py-1.5 text-xs font-bold text-zinc-700 outline-none transition hover:bg-zinc-100 cursor-pointer"
                  @change="changeMvResolution"
                >
                  <option v-for="r in mvResolutions" :key="r" :value="r" class="bg-white">{{ r }}P</option>
                </select>
              </div>
              <button
                class="flex h-8 items-center justify-center rounded-full bg-zinc-900 text-white px-5 text-xs font-bold transition hover:bg-zinc-800 active:scale-95 shadow-sm"
                type="button"
                @click="closeMvPlayer"
              >
                关闭
              </button>
            </div>
          </div>

          <div class="aspect-video w-full bg-stone-950 relative">
            <div v-if="mvPlayerLoading" class="absolute inset-0 grid place-items-center text-sm font-semibold text-zinc-400 bg-zinc-950">影音就绪中...</div>
            <div v-else-if="mvPlayerError" class="absolute inset-0 grid place-items-center px-6 text-center text-sm font-bold text-rose-500 bg-zinc-950">{{ mvPlayerError }}</div>
            <video
              v-else-if="currentMvUrl"
              :src="currentMvUrl"
              :poster="currentMv?.cover || ''"
              controls
              autoplay
              playsinline
              class="h-full w-full outline-none animate-fade-in"
            />
          </div>
        </div>
      </div>

      <!-- 2. Minimalist Release Notes Sliding Board -->
      <Transition name="release-notes">
        <div
          v-if="releaseNotesOpen"
          class="fixed inset-0 z-[1003] bg-zinc-950/10 p-4 backdrop-blur-xl flex justify-end"
          @click.self="releaseNotesOpen = false"
        >
          <div class="release-notes-panel h-full w-full max-w-2xl overflow-hidden rounded-[32px] bg-[#F5F5F7] border border-black/[0.04] shadow-2xl">
            <div class="border-b border-zinc-200/60 px-8 py-6 bg-white/60 backdrop-blur-md">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-2xl font-black tracking-tight text-zinc-900">版本更新</p>
                  <p class="mt-1 text-[13px] font-semibold text-zinc-400">展示每个版本的更新亮点与修复记录</p>
                </div>
                <span class="inline-flex items-center rounded-full bg-zinc-900 text-white px-4 py-2 text-[11px] font-bold shadow-md">
                  最新版本 {{ latestReleaseTag }}
                </span>
              </div>
            </div>

            <!-- Scrollable Notes Area -->
            <div class="custom-scrollbar h-[calc(100%-110px)] overflow-y-auto p-8 space-y-6">
              <p v-if="loading.releaseNotes" class="animate-pulse text-center text-sm font-semibold text-zinc-400 py-10">正在调理更新档案...</p>
              <p v-else-if="errors.releaseNotes" class="text-center text-sm font-semibold text-rose-600 py-10">{{ errors.releaseNotes }}</p>

              <div v-else-if="releaseNotes.length" class="space-y-8">
                <article
                  v-for="item in releaseNotes"
                  :key="item.id"
                  class="rounded-3xl bg-white p-6 border border-black/[0.02] shadow-[0_4px_20px_rgba(0,0,0,0.01)]"
                >
                  <div class="flex items-start justify-between gap-4 border-b border-zinc-100 pb-5">
                    <div>
                      <span class="inline-flex items-center rounded-md bg-zinc-100 border border-black/[0.02] px-2.5 py-1 text-[11px] font-black tracking-wider text-zinc-600">
                        v{{ item.version || '0.0.0' }}
                      </span>
                      <p class="mt-3.5 text-lg font-black tracking-tight text-zinc-900">{{ item.title }}</p>
                    </div>
                    <span class="shrink-0 text-xs font-semibold text-zinc-400 mt-1">{{ item.dateText }}</span>
                  </div>

                  <div class="mt-6 grid grid-cols-1 gap-4">
                    <section v-if="asList(item.highlights).length > 0" class="rounded-2xl bg-zinc-50/60 p-4 border border-black/[0.01]">
                      <h4 class="text-[13px] font-black text-zinc-800 tracking-wide flex items-center gap-1.5">✨ 更新亮点</h4>
                      <ul class="mt-3 space-y-2 text-[13px] font-medium text-zinc-500 leading-relaxed">
                        <li v-for="(text, idx) in asList(item.highlights)" :key="`h-${item.id}-${idx}`" class="flex items-start gap-1"><span class="text-zinc-300">-</span> {{ text }}</li>
                      </ul>
                    </section>

                    <section v-if="asList(item.knownIssues).length > 0" class="rounded-2xl bg-zinc-50/60 p-4 border border-black/[0.01]">
                      <h4 class="text-[13px] font-black text-amber-700 tracking-wide flex items-center gap-1.5">⚠️ 已知问题</h4>
                      <ul class="mt-3 space-y-2 text-[13px] font-medium text-zinc-500 leading-relaxed">
                        <li v-for="(text, idx) in asList(item.knownIssues)" :key="`k-${item.id}-${idx}`" class="flex items-start gap-1"><span class="text-zinc-300">-</span> {{ text }}</li>
                      </ul>
                    </section>

                    <section v-if="asList(item.bugFixes).length > 0" class="rounded-2xl bg-zinc-50/60 p-4 border border-black/[0.01]">
                      <h4 class="text-[13px] font-black text-rose-600 tracking-wide flex items-center gap-1.5">🐛 Bug 修复</h4>
                      <ul class="mt-3 space-y-2 text-[13px] font-medium text-zinc-500 leading-relaxed">
                        <li v-for="(text, idx) in asList(item.bugFixes)" :key="`b-${item.id}-${idx}`" class="flex items-start gap-1"><span class="text-zinc-300">-</span> {{ text }}</li>
                      </ul>
                    </section>
                  </div>
                </article>
              </div>
              <p v-else class="text-center text-sm font-semibold text-zinc-400 py-10">暂无更新日志</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Global Modal Router Layer -->
    <ModalRouterView content-width="85vw" content-height="80vh" />
  </div>
</template>

<script setup>
defineOptions({ name: 'home' })
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import ModalRouterView from '@/components/modalRouterView/ModalRouterView.vue'
import {reportApi} from '@/api/reportApi/reportApi.js'
import {setPendingTransition, consumeLatestPendingTransition, playHeroEnter} from '@/utils/heroTransition.js'
import {usePlayerStore} from '@/stores/playerStore.js'
import {useCounterStore} from '@/stores/userStores.js'
import {useHomeData} from '@/composables/useHomeData.js'
import {useHomeMv} from '@/composables/useHomeMv.js'
import {useHomeHero} from '@/composables/useHomeHero.js'
import {useHomeMotion} from '@/composables/useHomeMotion.js'
import {
  consumeLatestPendingPlaylistHeroTransition,
  playPlaylistHeroEnter,
  setPendingPlaylistHeroTransition,
} from '@/utils/playlistFlipHero.js'
import {playSongById, playSongWithQueue} from '@/utils/globalPlayer.js'

const router = useRouter()
const route = useRoute()
const playerStore = usePlayerStore()
const userStore = useCounterStore()
const {
  hero,
  releaseNotes,
  recommendPlaylists,
  topPlaylists,
  newSongs,
  recentListenSongs,
  topRanks,
  podcastPrograms,
  hotArtists,
  highQualityPlaylists,
  playlistTags,
  activePlaylistTag,
  loading,
  errors,
  asList,
  formatPodcastDuration,
  loadHomeBanner,
  loadReleaseNotes,
  loadRecommendPlaylists,
  loadTopPlaylists,
  changePlaylistTag,
  loadNewSongs,
  loadRecentListenSongs,
  loadTopRanks,
  loadPodcastPrograms,
  loadHotArtists,
  loadHighQualityPlaylists,
} = useHomeData(userStore)
const {
  heroCopyItems,
  heroCopyLine,
  heroCopyKey,
  startHeroCopyCycle,
  stopHeroCopyCycle,
  resetHeroCopyCycle,
} = useHomeHero(hero)
const {
  setupMotionEffects,
  cleanupMotionEffects,
} = useHomeMotion()

const releaseNotesOpen = ref(false)
const latestReleaseTag = computed(() => {
  const first = releaseNotes.value[0]
  const explicitTag = String(first?.version || first?.tag || '').trim()
  if (explicitTag) return explicitTag
  const title = String(first?.title || '')
  const match = title.match(/v?\d+(?:\.\d+){0,3}(?:[-._a-zA-Z0-9]+)?/)
  if (match?.[0]) return match[0]
  return releaseNotes.value.length ? 'NEW' : '...'
})

const {
  mvList,
  mvSourceOptions,
  mvAreas,
  mvTypes,
  mvOrders,
  activeMvSource,
  mvArea,
  mvType,
  mvOrder,
  mvLimit,
  mvOffset,
  mvHasMore,
  mvPlayerOpen,
  mvPlayerLoading,
  mvPlayerError,
  currentMv,
  currentMvUrl,
  mvResolutions,
  selectedMvResolution,
  loadMvList,
  switchMvSource,
  nextMvPage,
  prevMvPage,
  openMv,
  changeMvResolution,
  closeMvPlayer,
} = useHomeMv(playerStore, loading, errors)

const HOME_SCROLL_TOP_STORAGE_KEY = 'aurora:home-scroll-top'

const recentScroller = ref(null)
const recentScrollPage = ref(1)
const recentScrollTotalPages = ref(1)
const isRecentDragging = ref(false)
const recentDragStartX = ref(0)
const recentDragStartScrollLeft = ref(0)
const recentSuppressClick = ref(false)
const recentHasMoved = ref(false)

function saveHomeScrollTop() {
  if (typeof window === 'undefined') return
  const top = Math.max(0, Math.round(window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0))
  try {
    window.sessionStorage.setItem(HOME_SCROLL_TOP_STORAGE_KEY, String(top))
  } catch (error) {
    void error
  }
}

function updateRecentScrollState() {
  const el = recentScroller.value
  if (!el) return

  const pageWidth = el.clientWidth || 1
  const total = Math.max(1, Math.ceil(el.scrollWidth / pageWidth))
  const current = Math.min(total, Math.max(1, Math.round(el.scrollLeft / pageWidth) + 1))

  recentScrollTotalPages.value = total
  recentScrollPage.value = current
}

function scrollRecent(direction = 1) {
  const el = recentScroller.value
  if (!el) return

  el.scrollBy({
    left: direction * el.clientWidth * 0.85,
    behavior: 'smooth',
  })

  window.setTimeout(updateRecentScrollState, 300)
}

function handleRecentPointerDown(event) {
  const el = recentScroller.value
  if (!el) return

  if (event.button !== undefined && event.button !== 0) return

  isRecentDragging.value = true
  recentHasMoved.value = false
  recentSuppressClick.value = false
  recentDragStartX.value = event.clientX
  recentDragStartScrollLeft.value = el.scrollLeft
}

function handleRecentPointerMove(event) {
  const el = recentScroller.value
  if (!el || !isRecentDragging.value) return

  const moveX = event.clientX - recentDragStartX.value

  if (Math.abs(moveX) < 10) return

  recentHasMoved.value = true
  recentSuppressClick.value = true
  el.scrollLeft = recentDragStartScrollLeft.value - moveX
  updateRecentScrollState()
}

function handleRecentPointerUp() {
  isRecentDragging.value = false

  if (recentHasMoved.value) {
    window.setTimeout(() => {
      recentSuppressClick.value = false
      recentHasMoved.value = false
    }, 120)
    return
  }

  recentSuppressClick.value = false
  recentHasMoved.value = false
}

function openArtist(artist, event) {
  const artistId = Number(artist?.id || 0)
  if (!artistId) {
    router.push({path: '/artistDetial', query: {id: artist.id || ''}})
    return
  }

  const cardEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  const coverEl = cardEl ? cardEl.querySelector('[data-artist-hero-cover]') : null
  if (coverEl instanceof HTMLElement) {
    setPendingTransition('artist', artistId, {
      coverRect: coverEl.getBoundingClientRect(),
      coverSrc: artist.picUrl || '',
      name: artist.name || '',
    })
  }

  router.push({path: '/artistDetial', query: {id: artistId}})
}

async function openPlaylist(playlist, event) {
  const playlistId = Number(playlist?.id || playlist?.playlistId || playlist?.targetId || 0)
  if (!playlistId) return
  reportApi.reportBehavior({
    actionType: 'OPEN_PLAYLIST',
    actionTarget: String(playlistId),
    actionDetail: playlist?.name || '',
  })
  const cardEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  saveHomeScrollTop(cardEl)

  const coverEl = cardEl ? cardEl.querySelector('[data-playlist-hero-cover]') : null
  const cardStyle = cardEl ? window.getComputedStyle(cardEl) : null
  const coverStyle = coverEl ? window.getComputedStyle(coverEl) : null

  setPendingPlaylistHeroTransition(playlistId, {
    cardRect: cardEl?.getBoundingClientRect?.(),
    coverRect: coverEl?.getBoundingClientRect?.(),
    coverSrc: playlist.picUrl || playlist.coverImgUrl || '',
    playlistName: playlist.name || '',
    cardRadius: cardStyle?.borderRadius || '24px',
    cardShadow: cardStyle?.boxShadow || '0 8px 24px rgba(0,0,0,0.06)',
    coverRadius: coverStyle?.borderRadius || '24px',
    coverShadow: coverStyle?.boxShadow || '0 8px 24px rgba(0,0,0,0.06)',
  })

  await router.push({name: 'playlistDetail', query: {id: playlistId}})
}

function getPlaylistCardTransitionStyle(playlist) {
  void playlist
  return {}
}

function getPlaylistCoverTransitionStyle(playlist) {
  void playlist
  return {}
}

async function runPlaylistHeroReturn() {
  if (route.name !== 'home') return
  const payload = consumeLatestPendingPlaylistHeroTransition()
  if (!payload?.id) return

  await nextTick()
  const targetCoverEl = document.querySelector(`[data-playlist-hero-cover][data-playlist-id="${payload.id}"]`)
  if (!(targetCoverEl instanceof HTMLElement)) return

  await playPlaylistHeroEnter({
    payload,
    targetCoverEl,
  })
}

async function runArtistHeroReturn() {
  if (route.name !== 'home') return
  const payload = consumeLatestPendingTransition('artist')
  if (!payload?.id) return

  await nextTick()
  const targetCoverEl = document.querySelector(`[data-artist-hero-cover][data-artist-id="${payload.id}"]`)
  if (!(targetCoverEl instanceof HTMLElement)) return

  await playHeroEnter({payload, targetCoverEl})
}

async function openSong(song, index = 0) {
  await playSongWithQueue(song, newSongs.value, index)
}

async function openRecentSong(song, index = 0) {
  await playSongWithQueue(song, recentListenSongs.value, index)
}

async function handleRecentSongClick(song, index, event) {
  if (recentSuppressClick.value) {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    return
  }

  await openRecentSong(song, index)
}

function getSongArtists(song) {
  return song?.artists || song?.ar || []
}

async function openPodcast(item) {
  const id = item?.program?.mainSong?.id || item?.program?.id || null
  if (!id) return
  await playSongById({
    id,
    name: item?.name || item?.program?.name || '播客节目',
    artists: item?.program?.mainSong?.ar || [],
    cover: item?.picUrl || item?.program?.coverUrl || '',
  })
}

function openReleaseNotesPanel() {
  releaseNotesOpen.value = true
  if (!releaseNotes.value.length && !loading.value.releaseNotes) {
    loadReleaseNotes()
  }
}

onMounted(() => {
  requestAnimationFrame(() => {
    setupMotionEffects()
  })
  startHeroCopyCycle()
  runPlaylistHeroReturn()
  runArtistHeroReturn()
  loadHomeBanner()
  loadReleaseNotes()
  loadRecommendPlaylists()
  loadTopPlaylists()
  loadNewSongs()
  loadRecentListenSongs()
  loadTopRanks()
  loadPodcastPrograms()
  loadMvList({reset: true})
  loadHotArtists()
  loadHighQualityPlaylists()

  nextTick(updateRecentScrollState)
  window.addEventListener('resize', updateRecentScrollState)
})

watch(
  () => route.name,
  (name) => {
    if (name === 'home') {
      runPlaylistHeroReturn()
      runArtistHeroReturn()
    }
  },
)

watch(
  () => heroCopyItems.value.length,
  () => {
    resetHeroCopyCycle()
  },
)

watch(
  () => recentListenSongs.value.length,
  async () => {
    await nextTick()
    updateRecentScrollState()
  },
)

watch(
  () => userStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      loadRecentListenSongs()
      return
    }
    loading.value.recent = false
    errors.value.recent = '请先登录账号查看最近听歌'
    recentListenSongs.value = []
    recentScrollPage.value = 1
    recentScrollTotalPages.value = 1
  },
)

onBeforeUnmount(() => {
  cleanupMotionEffects()
  stopHeroCopyCycle()
  closeMvPlayer()
  window.removeEventListener('resize', updateRecentScrollState)
})
</script>

<style scoped>
.home-hero-copy {
  position: relative;
}

.hero-copy-block {
  transform-origin: left bottom;
  will-change: transform, opacity, filter;
}

.hero-copy-spring-enter-active {
  animation: hero-copy-spring-in 760ms both;
}

.hero-copy-spring-leave-active {
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  animation: hero-copy-spring-out 520ms both;
}

@keyframes hero-copy-spring-in {
  0% {
    opacity: 0;
    filter: blur(16px);
    transform: translate3d(0, 24px, 0) scale(0.965);
  }
  58% {
    opacity: 1;
    filter: blur(1px);
    transform: translate3d(0, -4px, 0) scale(1.018);
  }
  100% {
    opacity: 1;
    filter: blur(0);
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes hero-copy-spring-out {
  0% {
    opacity: 1;
    filter: blur(0);
    transform: translate3d(0, 0, 0) scale(1);
  }
  100% {
    opacity: 0;
    filter: blur(14px);
    transform: translate3d(0, -22px, 0) scale(1.028);
  }
}

.release-notes-enter-active,
.release-notes-leave-active {
  transition: opacity 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.release-notes-enter-from,
.release-notes-leave-to {
  opacity: 0;
}

.release-notes-enter-active .release-notes-panel,
.release-notes-leave-active .release-notes-panel {
  transition:
    transform 520ms cubic-bezier(0.34, 1.28, 0.64, 1),
    opacity 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.release-notes-enter-from .release-notes-panel,
.release-notes-leave-to .release-notes-panel {
  opacity: 0;
  transform: translateX(32px) scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .release-notes-enter-active,
  .release-notes-leave-active,
  .release-notes-enter-active .release-notes-panel,
  .release-notes-leave-active .release-notes-panel,
  .hero-copy-spring-enter-active,
  .hero-copy-spring-leave-active {
    animation-duration: 1ms !important;
    transition-duration: 0ms !important;
  }
}

/* 自定义轻量级滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e7e5e4;
  border-radius: 20px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: #d6d3d1;
}

@supports (content-visibility: auto) {
  .motion-section {
    contain-intrinsic-size: 1px 760px;
  }
}
</style>
