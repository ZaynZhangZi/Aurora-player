<template>
  <div class="min-h-screen bg-[#FBFBFD] text-stone-900 selection:bg-stone-900 selection:text-white">
    <section class="relative h-[60vh] min-h-[460px] overflow-hidden sm:h-[70vh]">
      <SmartMedia
        class="absolute inset-0 h-full w-full object-cover scale-105"
        :src="hero.media"
        :media-type="hero.mediaType"
        :title="hero.title"
        :content="hero.subtitle"
        :lock-muted="true"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-[#FBFBFD] via-[#FBFBFD]/40 to-black/20" />

      <div class="relative mx-auto flex h-full max-w-7xl items-end px-6 pb-16 sm:px-10 sm:pb-24">
        <div class="motion-section home-hero-copy max-w-3xl">
          <p class="mb-3 text-[11px] font-bold uppercase tracking-[0.35em] text-stone-900/60 sm:text-xs drop-shadow-sm">My Music Demo</p>
          <Transition name="hero-copy-spring" mode="out-in">
            <div :key="heroCopyKey" class="hero-copy-block">
              <h1 class="text-5xl font-black tracking-tight text-stone-900 sm:text-7xl lg:text-8xl">{{ heroCopyLine.title }}</h1>
              <p class="mt-5 max-w-md text-sm font-medium leading-relaxed text-stone-600 sm:text-base">{{ heroCopyLine.subtitle }}</p>
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <main class="relative z-10 mx-auto -mt-8 max-w-7xl px-6 pb-24 sm:px-10">

      <section class="motion-section mb-16 sm:mb-24">
        <div class="mb-8 flex items-end justify-between">
          <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">推荐歌单</h2>
        </div>
        <p v-if="loading.recommend" class="animate-pulse text-sm font-medium text-stone-400">正在为你加载...</p>
        <p v-else-if="errors.recommend" class="text-sm font-medium text-red-400">{{ errors.recommend }}</p>
        <div v-else class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          <article
            v-for="item in recommendPlaylists"
            :key="item.id"
            class="motion-card group cursor-pointer"
            :style="getPlaylistCardTransitionStyle(item)"
            @click="openPlaylist(item, $event)"
          >
            <div class="relative aspect-square overflow-hidden rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]" data-playlist-hero-cover :data-playlist-id="item.id" :style="getPlaylistCoverTransitionStyle(item)">
              <SmartMedia :src="item.picUrl" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div class="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-black/[0.03]" />
            </div>
            <p class="mt-4 px-1 line-clamp-2 text-[15px] font-semibold leading-snug text-stone-800">{{ item.name }}</p>
          </article>
        </div>
      </section>

      <section class="motion-section mb-16 sm:mb-24">
        <div class="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">网友精选碟</h2>
          <div class="flex flex-wrap items-center gap-2 rounded-full bg-stone-100/80 p-1.5 backdrop-blur-md">
            <button
              v-for="tag in playlistTags"
              :key="tag"
              :class="activePlaylistTag === tag ? 'bg-white text-stone-900 shadow-sm ring-1 ring-black/5' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/50'"
              class="rounded-full px-5 py-2 text-xs font-bold transition-all duration-300"
              type="button"
              @click="changePlaylistTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>
        <p v-if="loading.top" class="animate-pulse text-sm font-medium text-stone-400">正在为你加载...</p>
        <p v-else-if="errors.top" class="text-sm font-medium text-red-400">{{ errors.top }}</p>
        <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in topPlaylists"
            :key="item.id"
            class="motion-card group flex cursor-pointer items-center gap-5 rounded-[24px] p-3 transition-all duration-300 hover:bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
            :style="getPlaylistCardTransitionStyle(item)"
            @click="openPlaylist(item, $event)"
          >
            <div class="h-24 w-24 shrink-0 overflow-hidden rounded-[18px] shadow-sm transition-transform duration-500 group-hover:scale-[1.02]" data-playlist-hero-cover :data-playlist-id="item.id" :style="getPlaylistCoverTransitionStyle(item)">
              <SmartMedia :src="item.coverImgUrl" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0 flex-1 pr-2">
              <p class="truncate text-base font-bold text-stone-900">{{ item.name }}</p>
              <p class="mt-1.5 line-clamp-2 text-[13px] font-medium leading-relaxed text-stone-500">{{ item.copywriter || item.description || '精选音乐集合' }}</p>
            </div>
          </article>
        </div>
      </section>

      <div class="mb-16 grid gap-16 lg:grid-cols-2 sm:mb-24">

        <section class="motion-section">
          <div class="mb-6 flex items-end justify-between">
            <h2 class="text-2xl font-bold tracking-tight text-stone-900">推荐新音乐</h2>
          </div>
          <p v-if="loading.songs" class="animate-pulse text-sm font-medium text-stone-400">正在为你加载...</p>
          <p v-else-if="errors.songs" class="text-sm font-medium text-red-400">{{ errors.songs }}</p>
          <div v-else class="flex flex-col gap-1">
            <button
              v-for="(song, index) in newSongs"
              :key="song.id"
              class="group flex w-full items-center justify-between rounded-2xl p-3 text-left transition-colors duration-300 hover:bg-black/[0.03] focus:outline-none"
              type="button"
              @click="openSong(song, index)"
            >
              <div class="flex items-center gap-4 min-w-0">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-400 transition-colors duration-300 group-hover:bg-stone-900 group-hover:text-white group-hover:shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[15px] font-bold text-stone-900">{{ song.name }}</p>
                  <ArtistLinks :artists="getSongArtists(song)" class="mt-0.5 truncate text-[13px] font-medium text-stone-500" />
                </div>
              </div>
            </button>
          </div>
        </section>

        <section class="motion-section">
          <div class="mb-6 flex items-end justify-between">
            <h2 class="text-2xl font-bold tracking-tight text-stone-900">最近听歌</h2>
          </div>
          <p v-if="loading.recent" class="animate-pulse text-sm font-medium text-stone-400">正在为你加载...</p>
          <p v-else-if="errors.recent" class="text-sm font-medium text-red-400">{{ errors.recent }}</p>
          <div v-else class="flex flex-col gap-1">
            <button
              v-for="(song, index) in pagedRecentListenSongs"
              :key="`recent-${song.id}-${index}`"
              class="group flex w-full items-center justify-between rounded-2xl p-3 text-left transition-colors duration-300 hover:bg-black/[0.03] focus:outline-none"
              type="button"
              @click="openRecentSong(song, index + recentPageStartIndex)"
            >
              <div class="flex items-center gap-4 min-w-0">
                <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] shadow-sm">
                  <SmartMedia :src="song.cover || song.al?.picUrl || song.album?.picUrl || ''" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div class="absolute inset-0 bg-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[15px] font-bold text-stone-900">{{ song.name }}</p>
                  <ArtistLinks :artists="getSongArtists(song)" class="mt-0.5 truncate text-[13px] font-medium text-stone-500" />
                </div>
              </div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-stone-400 opacity-0 transition-opacity group-hover:opacity-100">PLAY</span>
            </button>
            <p v-if="!recentListenSongs.length" class="text-sm font-medium text-stone-400 py-3">最近听歌记录为空</p>
          </div>

          <div v-if="recentTotalPages > 1" class="mt-6 flex items-center justify-center gap-4">
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm ring-1 ring-black/5 transition hover:bg-stone-50 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              :disabled="recentCurrentPage <= 1"
              @click="goRecentPage(recentCurrentPage - 1)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span class="text-[13px] font-bold tracking-widest text-stone-500">{{ recentCurrentPage }} / {{ recentTotalPages }}</span>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm ring-1 ring-black/5 transition hover:bg-stone-50 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              :disabled="recentCurrentPage >= recentTotalPages"
              @click="goRecentPage(recentCurrentPage + 1)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </section>
      </div>

      <section class="motion-section mb-16 sm:mb-24">
        <div class="mb-8 flex items-end justify-between">
          <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">热门榜单</h2>
          <span class="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">Top Charts</span>
        </div>
        <p v-if="loading.rank" class="animate-pulse text-sm font-medium text-stone-400">正在为你加载...</p>
        <p v-else-if="errors.rank" class="text-sm font-medium text-red-400">{{ errors.rank }}</p>
        <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="rank in topRanks"
            :key="rank.id"
            class="group cursor-pointer rounded-[32px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.02] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
            :style="getPlaylistCardTransitionStyle(rank)"
            @click="openPlaylist(rank, $event)"
          >
            <div class="mb-6 flex items-center gap-5">
              <div class="h-20 w-20 shrink-0 overflow-hidden rounded-[20px] shadow-sm" data-playlist-hero-cover :data-playlist-id="rank.id" :style="getPlaylistCoverTransitionStyle(rank)">
                <SmartMedia :src="rank.coverImgUrl" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div>
                <p class="text-xl font-black tracking-tight text-stone-900">{{ rank.name }}</p>
                <p class="mt-1 text-[13px] font-medium text-stone-400">{{ rank.updateFrequency || '实时更新' }}</p>
              </div>
            </div>
            <div class="space-y-3 rounded-2xl bg-stone-50/50 p-4">
              <p v-for="(item, idx) in rank.tracks || []" :key="`${rank.id}-${idx}`" class="truncate text-[13px] font-medium text-stone-600">
                <span class="mr-3 font-bold text-stone-300">{{ idx + 1 }}</span> {{ item.first }} - {{ item.second }}
              </p>
            </div>
          </article>
        </div>
      </section>

      <section class="motion-section mb-16 sm:mb-24">
        <div class="mb-8 flex items-end justify-between">
          <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">精选播客</h2>
        </div>
        <p v-if="loading.podcast" class="animate-pulse text-sm font-medium text-stone-400">正在为你加载...</p>
        <p v-else-if="errors.podcast" class="text-sm font-medium text-red-400">{{ errors.podcast }}</p>
        <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in podcastPrograms"
            :key="item.id"
            class="group cursor-pointer overflow-hidden rounded-[32px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.02] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
            @click="openPodcast(item)"
          >
            <div class="aspect-[16/10] overflow-hidden">
              <SmartMedia :src="item.picUrl" class="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            </div>
            <div class="p-6">
              <p class="line-clamp-2 text-base font-bold leading-snug text-stone-900">{{ item.name }}</p>
              <div class="mt-4 flex items-center justify-between">
                <p class="truncate text-[13px] font-medium text-stone-500">{{ item.program?.radio?.name || item.program?.dj?.nickname || '电台节目' }}</p>
                <p class="text-[11px] font-bold tracking-wider text-stone-400">{{ formatPodcastDuration(item.program?.duration) }}</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="motion-section mb-16 sm:mb-24">
        <div class="mb-8 flex items-end justify-between">
          <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">高品质甄选</h2>
        </div>
        <p v-if="loading.hq" class="animate-pulse text-sm font-medium text-stone-400">正在为你加载...</p>
        <p v-else-if="errors.hq" class="text-sm font-medium text-red-400">{{ errors.hq }}</p>
        <div v-else class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          <article
            v-for="item in highQualityPlaylists"
            :key="item.id"
            class="motion-card group cursor-pointer"
            :style="getPlaylistCardTransitionStyle(item)"
            @click="openPlaylist(item, $event)"
          >
            <div class="relative aspect-square overflow-hidden rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]" data-playlist-hero-cover :data-playlist-id="item.id" :style="getPlaylistCoverTransitionStyle(item)">
              <SmartMedia :src="item.coverImgUrl" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div class="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-black/[0.03]" />
              <div class="absolute top-3 left-3 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-black tracking-widest text-amber-300 backdrop-blur-md">
                HQ
              </div>
            </div>
            <p class="mt-4 px-1 truncate text-[15px] font-bold text-stone-900">{{ item.name }}</p>
            <p class="mt-1 px-1 line-clamp-1 text-[13px] font-medium text-stone-500">{{ item.copywriter || item.description || '高品质歌单推荐' }}</p>
          </article>
        </div>
      </section>

      <section class="mb-16 sm:mb-24">
        <div class="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">MV 专区</h2>
          <div class="flex flex-wrap items-center gap-2 rounded-full bg-stone-100/80 p-1.5 backdrop-blur-md">
            <button
              v-for="source in mvSourceOptions"
              :key="source.value"
              class="rounded-full px-5 py-2 text-xs font-bold transition-all duration-300"
              :class="activeMvSource === source.value ? 'bg-white text-stone-900 shadow-sm ring-1 ring-black/5' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/50'"
              type="button"
              @click="switchMvSource(source.value)"
            >
              {{ source.label }}
            </button>
          </div>
        </div>

        <div class="mb-8 flex flex-wrap items-center gap-3" v-if="activeMvSource === 'all' || activeMvSource === 'latest'">
          <select v-model="mvArea" class="cursor-pointer appearance-none rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-stone-700 shadow-sm outline-none ring-1 ring-black/5 transition hover:bg-stone-50 hover:shadow">
            <option v-for="area in mvAreas" :key="area" :value="area">地区: {{ area }}</option>
          </select>
          <select v-if="activeMvSource === 'all'" v-model="mvType" class="cursor-pointer appearance-none rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-stone-700 shadow-sm outline-none ring-1 ring-black/5 transition hover:bg-stone-50 hover:shadow">
            <option v-for="type in mvTypes" :key="type" :value="type">类型: {{ type }}</option>
          </select>
          <select v-if="activeMvSource === 'all'" v-model="mvOrder" class="cursor-pointer appearance-none rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-stone-700 shadow-sm outline-none ring-1 ring-black/5 transition hover:bg-stone-50 hover:shadow">
            <option v-for="order in mvOrders" :key="order" :value="order">排序: {{ order }}</option>
          </select>
          <button
            class="flex items-center justify-center rounded-full bg-stone-900 p-2.5 text-white shadow-sm transition hover:bg-stone-800"
            type="button"
            @click="loadMvList({reset: true})"
            title="刷新"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
        </div>

        <p v-if="loading.mv" class="animate-pulse text-sm font-medium text-stone-400">正在为你加载...</p>
        <p v-else-if="errors.mv" class="text-sm font-medium text-red-400">{{ errors.mv }}</p>
        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in mvList"
            :key="item.id"
            class="motion-card group cursor-pointer"
            @click="openMv(item)"
          >
            <div class="relative aspect-video overflow-hidden rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)]">
              <SmartMedia :src="item.cover" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div class="absolute inset-0 rounded-[24px] ring-1 ring-inset ring-black/5" />
              <div class="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                {{ Number(item.playCount || 0).toLocaleString() }}
              </div>
            </div>
            <div class="mt-4 px-1">
              <p class="truncate text-[15px] font-bold text-stone-900">{{ item.name }}</p>
              <p class="mt-1 truncate text-[13px] font-medium text-stone-500">{{ item.artistName || '未知歌手' }}</p>
            </div>
          </article>
          <p v-if="!mvList.length" class="text-sm font-medium text-stone-400">暂无 MV 数据</p>
        </div>

        <div v-if="activeMvSource === 'all' || activeMvSource === 'exclusive'" class="mt-10 flex items-center justify-end gap-4 text-sm">
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm ring-1 ring-black/5 transition hover:bg-stone-50 disabled:opacity-40"
            type="button"
            :disabled="mvOffset <= 0 || loading.mv"
            @click="prevMvPage"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span class="text-[13px] font-bold text-stone-500 tracking-wide">PAGE {{ Math.floor(mvOffset / mvLimit) + 1 }}</span>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm ring-1 ring-black/5 transition hover:bg-stone-50 disabled:opacity-40"
            type="button"
            :disabled="!mvHasMore || loading.mv"
            @click="nextMvPage"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </section>

      <section class="mb-10">
        <div class="mb-8 flex items-end justify-between">
          <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">热门艺人</h2>
        </div>
        <p v-if="loading.artist" class="animate-pulse text-sm font-medium text-stone-400">正在为你加载...</p>
        <p v-else-if="errors.artist" class="text-sm font-medium text-red-400">{{ errors.artist }}</p>
        <div v-else class="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <article
            v-for="artist in hotArtists"
            :key="artist.id"
            class="group cursor-pointer text-center"
            @click="openArtist(artist)"
          >
            <div class="mx-auto aspect-square w-full max-w-[160px] overflow-hidden rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/5 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)]">
              <SmartMedia :src="artist.picUrl" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
            <p class="mt-5 truncate text-[15px] font-bold text-stone-900">{{ artist.name }}</p>
          </article>
        </div>
      </section>

    </main>

    <Teleport to="body">
      <div
        v-if="mvPlayerOpen"
        class="fixed inset-0 z-[1002] bg-black/80 p-4 backdrop-blur-2xl"
        @click.self="closeMvPlayer"
      >
        <div class="mx-auto mt-[6vh] w-full max-w-5xl overflow-hidden rounded-[32px] bg-black/90 shadow-2xl ring-1 ring-white/10">
          <div class="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4 text-white">
            <p class="truncate text-[15px] font-bold">{{ currentMv?.name || 'MV 播放' }}</p>
            <div class="flex items-center gap-4">
              <select
                v-if="mvResolutions.length"
                v-model="selectedMvResolution"
                class="appearance-none rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white outline-none backdrop-blur-md transition hover:bg-white/20 cursor-pointer"
                @change="changeMvResolution"
              >
                <option v-for="r in mvResolutions" :key="r" :value="r" class="bg-stone-900">{{ r }}P</option>
              </select>
              <button
                class="flex items-center justify-center rounded-full bg-white/10 px-5 py-1.5 text-xs font-bold transition hover:bg-white/20"
                type="button"
                @click="closeMvPlayer"
              >
                关闭
              </button>
            </div>
          </div>

          <div class="aspect-video w-full bg-black">
            <div v-if="mvPlayerLoading" class="grid h-full place-items-center text-sm font-medium text-white/50">正在缓冲 MV ...</div>
            <div v-else-if="mvPlayerError" class="grid h-full place-items-center px-6 text-center text-sm font-bold text-red-400">{{ mvPlayerError }}</div>
            <video
              v-else-if="currentMvUrl"
              :src="currentMvUrl"
              :poster="currentMv?.cover || ''"
              controls
              autoplay
              playsinline
              class="h-full w-full outline-none"
            />
          </div>
        </div>
      </div>

      <Transition name="release-notes">
        <div
          v-if="releaseNotesOpen"
          class="fixed inset-0 z-[1003] bg-stone-900/30 p-4 backdrop-blur-xl"
          @click.self="releaseNotesOpen = false"
        >
          <div class="release-notes-panel ml-auto h-full w-full max-w-2xl overflow-hidden rounded-[32px] bg-[#FBFBFD] shadow-2xl ring-1 ring-black/5">
            <div class="border-b border-stone-200/60 px-8 py-6">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-2xl font-black tracking-tight text-stone-900">版本更新</p>
                  <p class="mt-1 text-[13px] font-medium text-stone-500">展示每个版本的更新亮点与修复记录</p>
                </div>
                <span class="inline-flex items-center rounded-full bg-stone-900 px-4 py-2 text-[11px] font-bold text-white shadow-md">
                  最新版本 {{ latestReleaseTag }}
                </span>
              </div>
            </div>

            <div class="custom-scrollbar h-[calc(100%-104px)] overflow-y-auto p-8">
              <p v-if="loading.releaseNotes" class="animate-pulse text-center text-sm font-medium text-stone-400">正在加载版本日志...</p>
              <p v-else-if="errors.releaseNotes" class="text-center text-sm font-medium text-red-400">{{ errors.releaseNotes }}</p>
              <div v-else-if="releaseNotes.length" class="space-y-8">
                <article
                  v-for="item in releaseNotes"
                  :key="item.id"
                  class="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.02]"
                >
                  <div class="flex items-start justify-between gap-3 border-b border-stone-100 pb-5">
                    <div>
                      <div class="inline-flex items-center rounded-md bg-stone-100 px-2 py-1 text-[11px] font-black tracking-widest text-stone-500">
                        v{{ item.version || '0.0.0' }}
                      </div>
                      <p class="mt-3 text-lg font-bold tracking-tight text-stone-900">{{ item.title }}</p>
                    </div>
                    <span class="shrink-0 text-xs font-bold text-stone-400">{{ item.dateText }}</span>
                  </div>

                  <div class="mt-5 grid grid-cols-1 gap-4">
                    <section v-if="asList(item.highlights).length > 0" class="rounded-[16px] bg-stone-50/80 p-4 ring-1 ring-black/[0.02]">
                      <h4 class="text-[13px] font-bold text-emerald-600">✨ 更新亮点</h4>
                      <ul class="mt-2.5 space-y-2 text-[13px] font-medium text-stone-600">
                        <li v-for="(text, idx) in asList(item.highlights)" :key="`h-${item.id}-${idx}`">- {{ text }}</li>
                      </ul>
                    </section>

                    <section v-if="asList(item.knownIssues).length > 0" class="rounded-[16px] bg-stone-50/80 p-4 ring-1 ring-black/[0.02]">
                      <h4 class="text-[13px] font-bold text-amber-600">⚠️ 已知问题</h4>
                      <ul class="mt-2.5 space-y-2 text-[13px] font-medium text-stone-600">
                        <li v-for="(text, idx) in asList(item.knownIssues)" :key="`k-${item.id}-${idx}`">- {{ text }}</li>
                      </ul>
                    </section>

                    <section v-if="asList(item.bugFixes).length > 0" class="rounded-[16px] bg-stone-50/80 p-4 ring-1 ring-black/[0.02]">
                      <h4 class="text-[13px] font-bold text-rose-600">🐛 Bug 修复</h4>
                      <ul class="mt-2.5 space-y-2 text-[13px] font-medium text-stone-600">
                        <li v-for="(text, idx) in asList(item.bugFixes)" :key="`b-${item.id}-${idx}`">- {{ text }}</li>
                      </ul>
                    </section>
                  </div>
                </article>
              </div>
              <p v-else class="text-center text-sm font-medium text-stone-400">暂无更新日志</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ModalRouterView content-width="85vw" content-height="80vh" />
  </div>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import ModalRouterView from '@/components/modalRouterView/ModalRouterView.vue'
import {reportApi} from '@/api/reportApi/reportApi.js'
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
  recentCurrentPage,
  recentTotalPages,
  recentPageStartIndex,
  pagedRecentListenSongs,
  loading,
  errors,
  asList,
  goRecentPage,
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

function saveHomeScrollTop() {
  if (typeof window === 'undefined') return
  const top = Math.max(0, Math.round(window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0))
  try {
    window.sessionStorage.setItem(HOME_SCROLL_TOP_STORAGE_KEY, String(top))
  } catch (error) {
    void error
  }
}

function openArtist(artist) {
  router.push({
    path: '/artistDetial',
    query: {id: artist.id || ''},
  })
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

async function openSong(song, index = 0) {
  await playSongWithQueue(song, newSongs.value, index)
}

async function openRecentSong(song, index = 0) {
  await playSongWithQueue(song, recentListenSongs.value, index)
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
})

watch(
  () => route.name,
  (name) => {
    if (name === 'home') {
      runPlaylistHeroReturn()
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
  () => userStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      loadRecentListenSongs()
      return
    }
    loading.value.recent = false
    errors.value.recent = '请先登录账号查看最近听歌'
    recentListenSongs.value = []
    recentCurrentPage.value = 1
  },
)

onBeforeUnmount(() => {
  cleanupMotionEffects()
  stopHeroCopyCycle()
  closeMvPlayer()
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
