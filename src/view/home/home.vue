<template>
  <div class="min-h-screen bg-[#FAFAFA] text-stone-900 selection:bg-stone-900 selection:text-white">
    <section class="relative h-[60vh] min-h-[420px] overflow-hidden sm:h-[75vh]">
      <SmartMedia
        class="absolute inset-0 h-full w-full object-cover"
        :src="hero.media"
        :title="hero.title"
        :content="hero.subtitle"
        :lock-muted="true"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-[#FAFAFA] via-black/40 to-black/10 mix-blend-normal" />

      <div class="relative mx-auto flex h-full max-w-7xl items-end px-6 pb-12 sm:px-10 sm:pb-20">
        <div class="motion-section max-w-2xl text-white">
          <p class="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/70 sm:text-xs">My Music Demo</p>
          <h1 class="text-5xl font-black tracking-tighter sm:text-7xl lg:text-8xl drop-shadow-lg">今天听点什么</h1>
          <p class="mt-4 max-w-md text-sm font-medium leading-relaxed text-white/80 sm:text-base drop-shadow-md">{{ hero.subtitle }}</p>
        </div>
      </div>
    </section>

    <main class="relative z-10 mx-auto -mt-6 max-w-7xl px-6 pb-24 sm:px-10">

      <section class="motion-section mb-20">
        <div class="mb-6 flex items-end justify-between border-b border-stone-900/10 pb-4">
          <h2 class="text-3xl font-bold tracking-tight text-stone-900">推荐歌单</h2>
        </div>
        <p v-if="loading.recommend" class="animate-pulse text-sm font-medium text-stone-500">加载中...</p>
        <p v-else-if="errors.recommend" class="text-sm font-medium text-red-500">{{ errors.recommend }}</p>
        <div v-else class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          <article
            v-for="item in recommendPlaylists"
            :key="item.id"
            class="motion-card group cursor-pointer"
            :style="getPlaylistCardTransitionStyle(item)"
            @click="openPlaylist(item)"
          >
            <div class="relative aspect-square overflow-hidden rounded-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)]" :style="getPlaylistCoverTransitionStyle(item)">
              <SmartMedia :src="item.picUrl" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div class="absolute inset-0 rounded-[24px] ring-1 ring-inset ring-black/5" />
            </div>
            <p class="mt-4 line-clamp-2 text-sm font-bold text-stone-800">{{ item.name }}</p>
          </article>
        </div>
      </section>

      <section class="motion-section mb-20">
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-stone-900/10 pb-4">
          <h2 class="text-3xl font-bold tracking-tight text-stone-900">网友精选碟</h2>
          <div class="flex flex-wrap items-center gap-2 rounded-full bg-stone-200/50 p-1">
            <button
              v-for="tag in playlistTags"
              :key="tag"
              :class="activePlaylistTag === tag ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'"
              class="rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
              type="button"
              @click="changePlaylistTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>
        <p v-if="loading.top" class="animate-pulse text-sm font-medium text-stone-500">加载中...</p>
        <p v-else-if="errors.top" class="text-sm font-medium text-red-500">{{ errors.top }}</p>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in topPlaylists"
            :key="item.id"
            class="motion-card group flex cursor-pointer items-center gap-4 rounded-2xl p-2 transition-all hover:bg-white hover:shadow-md"
            :style="getPlaylistCardTransitionStyle(item)"
            @click="openPlaylist(item)"
          >
            <div class="h-20 w-20 shrink-0 overflow-hidden rounded-[16px] shadow-sm transition-transform duration-500 group-hover:scale-105" :style="getPlaylistCoverTransitionStyle(item)">
              <SmartMedia :src="item.coverImgUrl" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0 pr-4">
              <p class="truncate text-base font-bold text-stone-800">{{ item.name }}</p>
              <p class="mt-1 line-clamp-2 text-xs font-medium text-stone-500 opacity-80">{{ item.copywriter || item.description || '精选音乐集合' }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="motion-section mb-20">
        <div class="mb-6 flex items-end justify-between border-b border-stone-900/10 pb-4">
          <h2 class="text-3xl font-bold tracking-tight text-stone-900">推荐新音乐</h2>
        </div>
        <p v-if="loading.songs" class="animate-pulse text-sm font-medium text-stone-500">加载中...</p>
        <p v-else-if="errors.songs" class="text-sm font-medium text-red-500">{{ errors.songs }}</p>
        <div v-else class="grid grid-cols-1 gap-x-8 gap-y-2 lg:grid-cols-2">
          <button
            v-for="(song, index) in newSongs"
            :key="song.id"
            class="group flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-white hover:shadow-sm focus:outline-none"
            type="button"
            @click="openSong(song, index)"
          >
            <div class="flex items-center gap-4 min-w-0">
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors group-hover:bg-stone-900 group-hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-base font-bold text-stone-800">{{ song.name }}</p>
                <ArtistLinks :artists="getSongArtists(song)" class="mt-0.5 truncate text-xs font-medium text-stone-500" />
              </div>
            </div>
          </button>
        </div>
      </section>

      <section class="motion-section mb-20">
        <div class="mb-6 flex items-end justify-between border-b border-stone-900/10 pb-4">
          <h2 class="text-3xl font-bold tracking-tight text-stone-900">最近听歌</h2>
        </div>
        <p v-if="loading.recent" class="animate-pulse text-sm font-medium text-stone-500">加载中...</p>
        <p v-else-if="errors.recent" class="text-sm font-medium text-red-500">{{ errors.recent }}</p>
        <div v-else class="grid grid-cols-1 gap-x-8 gap-y-2 lg:grid-cols-2">
          <button
            v-for="(song, index) in pagedRecentListenSongs"
            :key="`recent-${song.id}-${index}`"
            class="group flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-white hover:shadow-sm focus:outline-none"
            type="button"
            @click="openRecentSong(song, index + recentPageStartIndex)"
          >
            <div class="flex items-center gap-4 min-w-0">
              <div class="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                <SmartMedia :src="song.cover || song.al?.picUrl || song.album?.picUrl || ''" class="h-full w-full object-cover" />
                <div class="absolute inset-0 bg-black/8 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-base font-bold text-stone-800">{{ song.name }}</p>
                <ArtistLinks :artists="getSongArtists(song)" class="mt-0.5 truncate text-xs font-medium text-stone-500" />
              </div>
            </div>
            <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">RECENT</span>
          </button>
          <p v-if="!recentListenSongs.length" class="text-sm font-medium text-stone-500">最近听歌记录为空</p>
        </div>
        <div v-if="recentTotalPages > 1" class="mt-4 flex items-center justify-center gap-2">
          <button
            class="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600 transition hover:border-stone-400 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            :disabled="recentCurrentPage <= 1"
            @click="goRecentPage(recentCurrentPage - 1)"
          >上一页</button>
          <span class="text-xs font-semibold tracking-wide text-stone-500">{{ recentCurrentPage }} / {{ recentTotalPages }}</span>
          <button
            class="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600 transition hover:border-stone-400 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            :disabled="recentCurrentPage >= recentTotalPages"
            @click="goRecentPage(recentCurrentPage + 1)"
          >下一页</button>
        </div>
      </section>

      <section class="motion-section mb-20">
        <div class="mb-6 flex items-end justify-between border-b border-stone-900/10 pb-4">
          <h2 class="text-3xl font-bold tracking-tight text-stone-900">热门榜单</h2>
          <span class="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">Top Charts</span>
        </div>
        <p v-if="loading.rank" class="animate-pulse text-sm font-medium text-stone-500">加载中...</p>
        <p v-else-if="errors.rank" class="text-sm font-medium text-red-500">{{ errors.rank }}</p>
        <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="rank in topRanks"
            :key="rank.id"
            class="group cursor-pointer rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
            :style="getPlaylistCardTransitionStyle(rank)"
            @click="openPlaylist(rank)"
          >
            <div class="mb-4 flex items-center gap-4">
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-[14px] shadow-sm" :style="getPlaylistCoverTransitionStyle(rank)">
                <SmartMedia :src="rank.coverImgUrl" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              </div>
              <div>
                <p class="text-lg font-black text-stone-900">{{ rank.name }}</p>
                <p class="mt-0.5 text-xs font-medium text-stone-400">{{ rank.updateFrequency || '实时更新' }}</p>
              </div>
            </div>
            <div class="space-y-2 rounded-xl bg-[#FAFAFA] p-3">
              <p v-for="(item, idx) in rank.tracks || []" :key="`${rank.id}-${idx}`" class="truncate text-xs font-medium text-stone-600">
                <span class="mr-2 text-stone-400">{{ idx + 1 }}</span> {{ item.first }} - {{ item.second }}
              </p>
            </div>
          </article>
        </div>
      </section>

      <div class="mb-20 grid gap-16 lg:grid-cols-2">
        <section>
          <div class="mb-6 flex items-end justify-between border-b border-stone-900/10 pb-4">
            <h2 class="text-2xl font-bold tracking-tight text-stone-900">精选播客</h2>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <article
              v-for="item in podcastPrograms"
              :key="item.id"
              class="group cursor-pointer overflow-hidden rounded-[20px] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              @click="openPodcast(item)"
            >
              <div class="aspect-[16/10] overflow-hidden">
                <SmartMedia :src="item.picUrl" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div class="p-4">
                <p class="line-clamp-2 text-sm font-bold text-stone-800">{{ item.name }}</p>
                <div class="mt-2 flex items-center justify-between">
                  <p class="truncate text-xs font-medium text-stone-500">{{ item.program?.radio?.name || item.program?.dj?.nickname || '电台节目' }}</p>
                  <p class="text-xs font-bold text-stone-400">{{ formatPodcastDuration(item.program?.duration) }}</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section>
          <div class="mb-6 flex items-end justify-between border-b border-stone-900/10 pb-4">
            <h2 class="text-2xl font-bold tracking-tight text-stone-900">高品质甄选</h2>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <article
              v-for="item in highQualityPlaylists"
              :key="item.id"
              class="group cursor-pointer overflow-hidden rounded-[20px] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              :style="getPlaylistCardTransitionStyle(item)"
              @click="openPlaylist(item)"
            >
              <div class="aspect-[4/3] overflow-hidden" :style="getPlaylistCoverTransitionStyle(item)">
                <SmartMedia :src="item.coverImgUrl" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div class="p-4">
                <p class="truncate text-sm font-bold text-stone-800">{{ item.name }}</p>
                <p class="mt-1 line-clamp-1 text-xs font-medium text-stone-500">{{ item.copywriter || item.description || '高品质歌单推荐' }}</p>
              </div>
            </article>
          </div>
        </section>
      </div>

      <section class="mb-20">
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-stone-900/10 pb-4">
          <h2 class="text-3xl font-bold tracking-tight text-stone-900">MV 专区</h2>
          <div class="flex flex-wrap items-center gap-2 rounded-full bg-stone-200/50 p-1">
            <button
              v-for="source in mvSourceOptions"
              :key="source.value"
              class="rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
              :class="activeMvSource === source.value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'"
              type="button"
              @click="switchMvSource(source.value)"
            >
              {{ source.label }}
            </button>
          </div>
        </div>

        <div class="mb-6 flex flex-wrap items-center gap-3" v-if="activeMvSource === 'all' || activeMvSource === 'latest'">
          <select v-model="mvArea" class="cursor-pointer appearance-none rounded-full bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-sm outline-none ring-1 ring-stone-900/5 transition hover:bg-stone-50">
            <option v-for="area in mvAreas" :key="area" :value="area">地区: {{ area }}</option>
          </select>
          <select v-if="activeMvSource === 'all'" v-model="mvType" class="cursor-pointer appearance-none rounded-full bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-sm outline-none ring-1 ring-stone-900/5 transition hover:bg-stone-50">
            <option v-for="type in mvTypes" :key="type" :value="type">类型: {{ type }}</option>
          </select>
          <select v-if="activeMvSource === 'all'" v-model="mvOrder" class="cursor-pointer appearance-none rounded-full bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-sm outline-none ring-1 ring-stone-900/5 transition hover:bg-stone-50">
            <option v-for="order in mvOrders" :key="order" :value="order">排序: {{ order }}</option>
          </select>
          <button
            class="flex items-center justify-center rounded-full bg-white p-2 text-stone-500 shadow-sm ring-1 ring-stone-900/5 transition hover:bg-stone-50 hover:text-stone-900"
            type="button"
            @click="loadMvList({reset: true})"
            title="刷新"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
        </div>

        <p v-if="loading.mv" class="animate-pulse text-sm font-medium text-stone-500">加载中...</p>
        <p v-else-if="errors.mv" class="text-sm font-medium text-red-500">{{ errors.mv }}</p>
        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in mvList"
            :key="item.id"
            class="motion-card group cursor-pointer"
            @click="openMv(item)"
          >
            <div class="relative aspect-video overflow-hidden rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
              <SmartMedia :src="item.cover" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div class="absolute inset-0 rounded-[20px] ring-1 ring-inset ring-black/5" />
              <div class="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">MV</div>
            </div>
            <div class="mt-3 px-1">
              <p class="truncate text-sm font-bold text-stone-800">{{ item.name }}</p>
              <div class="mt-1 flex items-center justify-between">
                <p class="truncate text-xs font-medium text-stone-500">{{ item.artistName || '未知歌手' }}</p>
                <p class="text-[10px] font-bold text-stone-400">{{ Number(item.playCount || 0).toLocaleString() }} 播放</p>
              </div>
            </div>
          </article>
          <p v-if="!mvList.length" class="text-sm font-medium text-stone-500">暂无 MV 数据</p>
        </div>

        <div v-if="activeMvSource === 'all' || activeMvSource === 'exclusive'" class="mt-8 flex items-center justify-end gap-3 text-sm">
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm ring-1 ring-stone-900/5 transition hover:bg-stone-50 disabled:opacity-40"
            type="button"
            :disabled="mvOffset <= 0 || loading.mv"
            @click="prevMvPage"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span class="text-xs font-medium text-stone-400">Page {{ Math.floor(mvOffset / mvLimit) + 1 }}</span>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm ring-1 ring-stone-900/5 transition hover:bg-stone-50 disabled:opacity-40"
            type="button"
            :disabled="!mvHasMore || loading.mv"
            @click="nextMvPage"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </section>

      <section class="mb-10">
        <div class="mb-8 flex items-end justify-between border-b border-stone-900/10 pb-4">
          <h2 class="text-3xl font-bold tracking-tight text-stone-900">热门艺人</h2>
        </div>
        <p v-if="loading.artist" class="animate-pulse text-sm font-medium text-stone-500">加载中...</p>
        <p v-else-if="errors.artist" class="text-sm font-medium text-red-500">{{ errors.artist }}</p>
        <div v-else class="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          <article
            v-for="artist in hotArtists"
            :key="artist.id"
            class="group cursor-pointer text-center"
            @click="openArtist(artist)"
          >
            <div class="mx-auto aspect-square w-full max-w-[160px] overflow-hidden rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
              <SmartMedia :src="artist.picUrl" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
            <p class="mt-4 truncate text-sm font-bold text-stone-800">{{ artist.name }}</p>
          </article>
        </div>
      </section>

    </main>

    <Teleport to="body">
      <div
        v-if="mvPlayerOpen"
        class="fixed inset-0 z-[1002] bg-black/80 p-4 backdrop-blur-xl"
        @click.self="closeMvPlayer"
      >
        <div class="mx-auto mt-[8vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
          <div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
            <p class="truncate text-sm font-bold">{{ currentMv?.name || 'MV 播放' }}</p>
            <div class="flex items-center gap-3">
              <select
                v-if="mvResolutions.length"
                v-model="selectedMvResolution"
                class="appearance-none rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white outline-none backdrop-blur-md transition hover:bg-white/20 cursor-pointer"
                @change="changeMvResolution"
              >
                <option v-for="r in mvResolutions" :key="r" :value="r" class="bg-stone-900">{{ r }}P</option>
              </select>
              <button
                class="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold transition hover:bg-white/20"
                type="button"
                @click="closeMvPlayer"
              >
                关闭
              </button>
            </div>
          </div>

          <div class="aspect-video w-full bg-black">
            <div v-if="mvPlayerLoading" class="grid h-full place-items-center text-sm font-medium text-white/70">MV 加载中...</div>
            <div v-else-if="mvPlayerError" class="grid h-full place-items-center px-6 text-center text-sm font-bold text-red-400">{{ mvPlayerError }}</div>
            <video
              v-else-if="currentMvUrl"
              :src="currentMvUrl"
              :poster="currentMv?.cover || ''"
              controls
              autoplay
              playsinline
              class="h-full w-full"
            />
          </div>
        </div>
      </div>

      <Transition name="release-notes">
        <div
          v-if="releaseNotesOpen"
          class="fixed inset-0 z-[1003] bg-stone-900/40 p-4 backdrop-blur-md"
          @click.self="releaseNotesOpen = false"
        >
          <div class="release-notes-panel ml-auto h-full w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div class="border-b border-stone-100 px-6 py-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-2xl font-black text-stone-900">版本更新</p>
                  <p class="mt-1 text-xs font-medium text-stone-500">展示每个版本的更新亮点与修复记录</p>
                </div>
                <span class="inline-flex items-center rounded-full bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-700">
                  最新版本 {{ latestReleaseTag }}
                </span>
              </div>
            </div>

            <div class="custom-scrollbar h-[calc(100%-88px)] overflow-y-auto p-6">
              <p v-if="loading.releaseNotes" class="animate-pulse text-center text-sm font-medium text-stone-500">正在加载版本日志...</p>
              <p v-else-if="errors.releaseNotes" class="text-center text-sm font-medium text-red-500">{{ errors.releaseNotes }}</p>
              <div v-else-if="releaseNotes.length" class="space-y-6">
                <article
                  v-for="item in releaseNotes"
                  :key="item.id"
                  class="rounded-2xl bg-[#FAFAFA] p-5 ring-1 ring-stone-900/5"
                >
                  <div class="flex items-start justify-between gap-3 border-b border-stone-200/60 pb-4">
                    <div>
                      <div class="inline-flex items-center rounded-md bg-stone-200/60 px-2 py-1 text-[10px] font-black tracking-widest text-stone-700">
                        v{{ item.version || '0.0.0' }}
                      </div>
                      <p class="mt-2 text-base font-bold text-stone-900">{{ item.title }}</p>
                    </div>
                    <span class="shrink-0 text-xs font-medium text-stone-400">{{ item.dateText }}</span>
                  </div>

                  <div class="mt-4 grid grid-cols-1 gap-3">
                    <section v-if="asList(item.highlights).length > 0" class="rounded-xl bg-white p-3 ring-1 ring-stone-900/5">
                      <h4 class="text-xs font-bold text-emerald-600">✨ 更新亮点</h4>
                      <ul class="mt-2 space-y-1.5 text-xs font-medium text-stone-600">
                        <li v-for="(text, idx) in asList(item.highlights)" :key="`h-${item.id}-${idx}`">- {{ text }}</li>
                      </ul>
                    </section>

                    <section v-if="asList(item.knownIssues).length > 0" class="rounded-xl bg-white p-3 ring-1 ring-stone-900/5">
                      <h4 class="text-xs font-bold text-amber-600">⚠️ 已知问题</h4>
                      <ul class="mt-2 space-y-1.5 text-xs font-medium text-stone-600">
                        <li v-for="(text, idx) in asList(item.knownIssues)" :key="`k-${item.id}-${idx}`">- {{ text }}</li>
                      </ul>
                    </section>

                    <section v-if="asList(item.bugFixes).length > 0" class="rounded-xl bg-white p-3 ring-1 ring-stone-900/5">
                      <h4 class="text-xs font-bold text-rose-600">🐛 Bug 修复</h4>
                      <ul class="mt-2 space-y-1.5 text-xs font-medium text-stone-600">
                        <li v-for="(text, idx) in asList(item.bugFixes)" :key="`b-${item.id}-${idx}`">- {{ text }}</li>
                      </ul>
                    </section>
                  </div>
                </article>
              </div>
              <p v-else class="text-center text-sm font-medium text-stone-500">暂无更新日志</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ModalRouterView content-width="90vw" content-height="90vh" />
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {animate, hover, inView, press} from 'motion'
import SmartMedia from '@/components/smartMedia/smartMedia.vue'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import ModalRouterView from '@/components/modalRouterView/ModalRouterView.vue'
import {playListsApi} from '@/api/playListsApi/playListsApi.js'
import {songsApi} from '@/api/songsApi/songsApi.js'
import {artistApi} from '@/api/artistApi/artistApi.js'
import {homeIndexApi} from '@/api/home/homeIndexApi.js'
import {usePlayerStore} from '@/stores/playerStore.js'
import {
  activePlaylistTransitionId,
  buildPlaylistTransitionName,
  runViewTransition,
  setActivePlaylistTransitionId,
} from '@/utils/viewTransition.js'
import {playSongById, playSongWithQueue} from '@/utils/globalPlayer.js'

const router = useRouter()
const route = useRoute()
const playerStore = usePlayerStore()
const motionCleanups = []

const hero = ref({
  media: '',
  title: '',
  subtitle: '',
})

const releaseNotes = ref([])
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

const recommendPlaylists = ref([])
const topPlaylists = ref([])
const newSongs = ref([])
const recentListenSongs = ref([])
const RECENT_PAGE_SIZE = 12
const recentCurrentPage = ref(1)
const recentTotalPages = computed(() => {
  const total = recentListenSongs.value.length
  return Math.max(1, Math.ceil(total / RECENT_PAGE_SIZE))
})
const recentPageStartIndex = computed(() => (recentCurrentPage.value - 1) * RECENT_PAGE_SIZE)
const pagedRecentListenSongs = computed(() => {
  const start = recentPageStartIndex.value
  return recentListenSongs.value.slice(start, start + RECENT_PAGE_SIZE)
})
const topRanks = ref([])
const podcastPrograms = ref([])
const hotArtists = ref([])
const highQualityPlaylists = ref([])
const mvList = ref([])
const playlistTags = ['全部', '华语', '欧美', '流行', '电子']
const activePlaylistTag = ref('全部')

const mvSourceOptions = [
  {label: '全部 MV', value: 'all'},
  {label: '最新 MV', value: 'latest'},
  {label: '网易出品', value: 'exclusive'},
  {label: '推荐 MV', value: 'recommend'},
]
const mvAreas = ['全部', '内地', '港台', '欧美', '日本', '韩国']
const mvTypes = ['全部', '官方版', '原生', '现场版', '网易出品']
const mvOrders = ['上升最快', '最热', '最新']
const activeMvSource = ref('all')
const mvArea = ref('全部')
const mvType = ref('全部')
const mvOrder = ref('上升最快')
const mvLimit = ref(9)
const mvOffset = ref(0)
const mvHasMore = ref(false)
const mvPlayerOpen = ref(false)
const mvPlayerLoading = ref(false)
const mvPlayerError = ref('')
const currentMv = ref(null)
const currentMvUrl = ref('')
const mvResolutions = ref([])
const selectedMvResolution = ref(1080)
const shouldResumeMusicOnClose = ref(false)

const loading = ref({
  banner: true,
  releaseNotes: true,
  recommend: true,
  top: true,
  songs: true,
  recent: true,
  rank: true,
  podcast: true,
  artist: true,
  hq: true,
  mv: true,
})

const errors = ref({
  banner: '',
  releaseNotes: '',
  recommend: '',
  top: '',
  songs: '',
  recent: '',
  rank: '',
  podcast: '',
  artist: '',
  hq: '',
  mv: '',
})

function openArtist(artist) {
  router.push({
    path: '/artistDetial',
    query: {id: artist.id || ''},
  })
}

async function openPlaylist(playlist) {
  if (!playlist?.id) return
  setActivePlaylistTransitionId(playlist.id)
  await runViewTransition(() => {
    return router.push({
      path: '/home/playlistDetail',
      query: {id: playlist.id},
    })
  })
}

function getPlaylistCardTransitionStyle(playlist) {
  if (route.name === 'playlistDetail') return {}
  if (Number(playlist?.id) !== activePlaylistTransitionId.value) return {}
  const transitionName = buildPlaylistTransitionName(playlist?.id, 'card')
  if (!transitionName) return {}
  return {viewTransitionName: transitionName}
}

function getPlaylistCoverTransitionStyle(playlist) {
  if (route.name === 'playlistDetail') return {}
  if (Number(playlist?.id) !== activePlaylistTransitionId.value) return {}
  const transitionName = buildPlaylistTransitionName(playlist?.id, 'cover')
  if (!transitionName) return {}
  return {viewTransitionName: transitionName}
}

async function openSong(song, index = 0) {
  await playSongWithQueue(song, newSongs.value, index)
}

async function openRecentSong(song, index = 0) {
  await playSongWithQueue(song, recentListenSongs.value, index)
}

function goRecentPage(page) {
  const next = Math.min(recentTotalPages.value, Math.max(1, Number(page) || 1))
  recentCurrentPage.value = next
}

function getSongArtists(song) {
  return song?.artists || song?.ar || []
}

function normalizeRecentSongItem(item) {
  const song = item?.data || item?.song || item || {}
  const album = song?.al || song?.album || {}

  return {
    ...song,
    id: song?.id || item?.id || null,
    name: song?.name || item?.name || '未知歌曲',
    ar: song?.ar || song?.artists || item?.artists || [],
    artists: song?.artists || song?.ar || item?.artists || [],
    al: album,
    cover:
      song?.cover ||
      album?.picUrl ||
      song?.picUrl ||
      item?.cover ||
      item?.picUrl ||
      '',
  }
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

function openMv(mv) {
  if (!mv?.id) return
  shouldResumeMusicOnClose.value = Boolean(playerStore.isPlaying && playerStore.hasSong)
  if (shouldResumeMusicOnClose.value) {
    playerStore.setPlaying(false)
  }
  currentMv.value = mv
  currentMvUrl.value = ''
  mvPlayerError.value = ''
  mvPlayerLoading.value = true
  mvPlayerOpen.value = true
  selectedMvResolution.value = 1080
  mvResolutions.value = [1080, 720, 480]

  artistApi.getMvDetail(mv.id)
    .then((res) => {
      const brs = res?.data?.data?.brs || {}
      const available = Object.keys(brs)
        .map(item => Number(item))
        .filter(item => Number.isFinite(item) && item > 0)
        .sort((a, b) => b - a)
      if (available.length) {
        mvResolutions.value = available
        selectedMvResolution.value = available[0]
      }
    })
    .catch(() => {
      mvResolutions.value = [1080, 720, 480]
    })
    .finally(() => {
      loadMvUrl(mv.id, selectedMvResolution.value)
    })
}

async function loadMvUrl(mvId, resolution) {
  mvPlayerLoading.value = true
  mvPlayerError.value = ''

  const candidates = Array.from(new Set([
    Number(resolution),
    ...mvResolutions.value.map(item => Number(item)),
    1080,
    720,
    480,
    240,
  ].filter(item => Number.isFinite(item) && item > 0))).sort((a, b) => b - a)

  try {
    for (const r of candidates) {
      const res = await artistApi.getMvUrl(mvId, r)
      const url = res?.data?.data?.url || ''
      if (!url) continue
      selectedMvResolution.value = r
      currentMvUrl.value = url
      return
    }

    mvPlayerError.value = '该 MV 暂无可播放地址'
  } catch {
    mvPlayerError.value = 'MV 加载失败，请稍后重试'
  } finally {
    mvPlayerLoading.value = false
  }
}

function changeMvResolution() {
  if (!currentMv.value?.id) return
  currentMvUrl.value = ''
  loadMvUrl(currentMv.value.id, Number(selectedMvResolution.value || 1080))
}

function closeMvPlayer() {
  mvPlayerOpen.value = false
  mvPlayerLoading.value = false
  mvPlayerError.value = ''
  currentMvUrl.value = ''
  mvResolutions.value = []
  if (shouldResumeMusicOnClose.value && playerStore.hasSong) {
    playerStore.setPlaying(true)
  }
  shouldResumeMusicOnClose.value = false
}

function normalizeMvItem(item) {
  return {
    id: item?.id || null,
    name: item?.name || item?.copywriter || '未知 MV',
    cover: item?.cover || item?.imgurl || item?.picUrl || '',
    artistName: item?.artistName || item?.artist?.name || item?.artists?.map(a => a.name).join(' / ') || '',
    playCount: item?.playCount || item?.playTime || item?.playtime || 0,
  }
}

async function loadMvList({reset = false} = {}) {
  if (reset) {
    mvOffset.value = 0
  }

  loading.value.mv = true
  errors.value.mv = ''

  try {
    let res
    if (activeMvSource.value === 'all') {
      res = await artistApi.getAllMv({
        area: mvArea.value,
        type: mvType.value,
        order: mvOrder.value,
        limit: mvLimit.value,
        offset: mvOffset.value,
      })
      const list = (res?.data?.data || []).map(normalizeMvItem)
      mvList.value = list
      mvHasMore.value = Boolean(res?.data?.hasMore ?? list.length >= mvLimit.value)
      return
    }

    if (activeMvSource.value === 'latest') {
      res = await artistApi.getLatestMv({
        area: mvArea.value,
        limit: mvLimit.value,
      })
      mvList.value = (res?.data?.data || []).map(normalizeMvItem)
      mvHasMore.value = false
      return
    }

    if (activeMvSource.value === 'exclusive') {
      res = await artistApi.getExclusiveMv({
        limit: mvLimit.value,
        offset: mvOffset.value,
      })
      const raw = res?.data?.data || res?.data?.result || []
      const list = raw.map(normalizeMvItem)
      mvList.value = list
      mvHasMore.value = Boolean(res?.data?.hasMore ?? list.length >= mvLimit.value)
      return
    }

    res = await artistApi.getRecommendMv()
    mvList.value = (res?.data?.result || res?.data?.data || []).map(normalizeMvItem)
    mvHasMore.value = false
  } catch (error) {
    errors.value.mv = 'MV 加载失败'
  } finally {
    loading.value.mv = false
  }
}

function switchMvSource(source) {
  if (activeMvSource.value === source) return
  activeMvSource.value = source
  loadMvList({reset: true})
}

function nextMvPage() {
  if (!mvHasMore.value || loading.value.mv) return
  mvOffset.value += mvLimit.value
  loadMvList()
}

function prevMvPage() {
  if (mvOffset.value <= 0 || loading.value.mv) return
  mvOffset.value = Math.max(0, mvOffset.value - mvLimit.value)
  loadMvList()
}

function formatPodcastDuration(durationMs) {
  const total = Math.floor((durationMs || 0) / 1000)
  const minute = Math.floor(total / 60)
  const second = String(total % 60).padStart(2, '0')
  return `${minute}:${second}`
}

function normalizeBannerItem(item, index = 0) {
  const srcList = Array.isArray(item?.src) ? item.src : []
  const contentList = Array.isArray(item?.content) ? item.content : []
  const image = srcList[0] || item?.pic || item?.imageUrl || item?.cover || item?.coverUrl || ''
  const subtitleFromList = contentList
    .map(entry => String(entry || '').trim())
    .filter(Boolean)
    .join(' · ')
  return {
    id: item?.targetId || item?.bannerId || item?.id || `banner-${index}`,
    media: image,
    title: item?.typeTitle || item?.title || 'Now Playing',
    subtitle: subtitleFromList || item?.copywriter || item?.description || hero.value.subtitle,
  }
}

function normalizeReleaseNoteItem(item, index = 0) {
  const timeSource = item?.createdAt || item?.updatedAt || item?.time || item?.date || 0
  const ts = Number.isFinite(Number(timeSource))
    ? Number(timeSource)
    : Date.parse(String(timeSource || ''))
  const title = item?.title || item?.name || `更新 ${index + 1}`
  const explicitContent = item?.content || item?.description || item?.body || ''
  const highlights = Array.isArray(item?.highlights) ? item.highlights.filter(Boolean) : []
  const bugFixes = Array.isArray(item?.bugFixes) ? item.bugFixes.filter(Boolean) : []
  const knownIssues = Array.isArray(item?.knownIssues) ? item.knownIssues.filter(Boolean) : []
  const mergedBlocks = [
    highlights.length ? `亮点：${highlights.join('；')}` : '',
    bugFixes.length ? `修复：${bugFixes.join('；')}` : '',
    knownIssues.length ? `已知问题：${knownIssues.join('；')}` : '',
  ].filter(Boolean)
  const content = explicitContent || mergedBlocks.join('\n')
  return {
    id: item?.id || `${title}-${index}`,
    title,
    content,
    version: item?.version || item?.tag || item?.release || '',
    highlights,
    highlights,
    bugFixes,
    knownIssues,
    dateText: Number.isFinite(ts) && ts > 0 ? new Date(ts).toLocaleDateString() : '-',
  }
}

function asList(value) {
  return Array.isArray(value) ? value : []
}

function openReleaseNotesPanel() {
  releaseNotesOpen.value = true
  if (!releaseNotes.value.length && !loading.value.releaseNotes) {
    loadReleaseNotes()
  }
}

function setupMotionEffects() {
  if (typeof window === 'undefined') return

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) return

  const sections = document.querySelectorAll('.motion-section')
  sections.forEach((el) => {
    const stop = inView(
      el,
      () => {
        animate(
          el,
          {opacity: [0, 1], y: [18, 0], filter: ['blur(6px)', 'blur(0px)']},
          {duration: 0.32, easing: [0.22, 1, 0.36, 1]},
        )
      },
      {amount: 0.2},
    )
    motionCleanups.push(stop)
  })

  const canUsePointerMotion = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  if (!canUsePointerMotion) return

  const cards = document.querySelectorAll('.motion-card')
  cards.forEach((el) => {
    const stopHover = hover(el, () => {
      const ctrl = animate(el, {y: -4, scale: 1.01}, {type: 'spring', stiffness: 380, damping: 28, mass: 0.35})
      return () => ctrl.stop()
    })
    const stopPress = press(el, () => {
      const down = animate(el, {scale: 0.985}, {duration: 0.1})
      return () => {
        down.stop()
        animate(el, {scale: 1}, {duration: 0.16, easing: [0.22, 1, 0.36, 1]})
      }
    })
    motionCleanups.push(stopHover)
    motionCleanups.push(stopPress)
  })

}

async function loadHomeBanner() {
  loading.value.banner = true
  errors.value.banner = ''
  try {
    const res = await homeIndexApi.getBanner()
    const raw = res?.banners || res?.data?.banners || res?.data?.data?.banners || res?.data?.data || res?.data || res || []
    const list = Array.isArray(raw) ? raw.map(normalizeBannerItem) : []
    if (list.length) {
      const firstUsable = list.find(item => String(item?.media || '').trim()) || list[0]
      hero.value = {
        ...hero.value,
        ...firstUsable,
      }
    }
  } catch (error) {
    errors.value.banner = error?.message || 'Banner 加载失败'
  } finally {
    loading.value.banner = false
  }
}

async function loadReleaseNotes() {
  loading.value.releaseNotes = true
  errors.value.releaseNotes = ''
  try {
    const res = await homeIndexApi.getReleaseNotes({limit: 6})
    const raw = res?.list || res?.data?.list || res?.data?.data?.list || res?.data?.data || res?.data || res || []
    releaseNotes.value = Array.isArray(raw)
      ? raw.map(normalizeReleaseNoteItem)
      : []
  } catch (error) {
    errors.value.releaseNotes = error?.message || '更新日志加载失败'
    releaseNotes.value = []
  } finally {
    loading.value.releaseNotes = false
  }
}

async function loadRecommendPlaylists() {
  try {
    const res = await playListsApi.getRecommendPlayList()
    recommendPlaylists.value = res?.data?.result || []
  } catch (error) {
    errors.value.recommend = '推荐歌单加载失败'
  } finally {
    loading.value.recommend = false
  }
}

async function loadTopPlaylists(tag = activePlaylistTag.value) {
  loading.value.top = true
  errors.value.top = ''
  try {
    const res = await playListsApi.getPlayList(tag, 9, 0)
    topPlaylists.value = res?.data?.playlists || []
  } catch (error) {
    errors.value.top = '网友精选碟加载失败'
  } finally {
    loading.value.top = false
  }
}

function changePlaylistTag(tag) {
  if (activePlaylistTag.value === tag) return
  activePlaylistTag.value = tag
  loadTopPlaylists(tag)
}

async function loadNewSongs() {
  try {
    const res = await songsApi.getNewSongs()
    newSongs.value = res?.data?.result || []
  } catch (error) {
    errors.value.songs = '新音乐加载失败'
  } finally {
    loading.value.songs = false
  }
}

async function loadRecentListenSongs() {
  loading.value.recent = true
  errors.value.recent = ''
  try {
    const res = await songsApi.getRecentListenList(12)
    const list =
      res?.data?.data?.list ||
      res?.data?.list ||
      res?.data?.data ||
      []
    recentListenSongs.value = Array.isArray(list)
      ? list
          .map(normalizeRecentSongItem)
          .filter(item => item?.id)
      : []
    recentCurrentPage.value = 1
  } catch (error) {
    errors.value.recent = '最近听歌加载失败，请先登录账号'
    recentListenSongs.value = []
  } finally {
    loading.value.recent = false
  }
}

async function loadTopRanks() {
  try {
    const res = await songsApi.getTopListDetail()
    const list = res?.data?.list || []
    topRanks.value = list
      .filter(item => item?.id && item?.coverImgUrl)
      .slice(0, 6)
  } catch (error) {
    errors.value.rank = '榜单加载失败'
  } finally {
    loading.value.rank = false
  }
}

async function loadPodcastPrograms() {
  try {
    const res = await songsApi.getPodcastPrograms(6)
    podcastPrograms.value = res?.data?.result || []
  } catch (error) {
    errors.value.podcast = '播客加载失败'
  } finally {
    loading.value.podcast = false
  }
}

async function loadHotArtists() {
  try {
    const res = await artistApi.getHotArtist()
    hotArtists.value = res?.data?.artists || []
  } catch (error) {
    errors.value.artist = '热门歌手加载失败'
  } finally {
    loading.value.artist = false
  }
}

async function loadHighQualityPlaylists() {
  try {
    const res = await songsApi.getHighQualitySongs()
    highQualityPlaylists.value = res?.data?.playlists || []
  } catch (error) {
    errors.value.hq = '高品质歌单加载失败'
  } finally {
    loading.value.hq = false
  }
}

onMounted(() => {
  requestAnimationFrame(() => {
    setupMotionEffects()
  })
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

onBeforeUnmount(() => {
  motionCleanups.splice(0).forEach(stop => {
    if (typeof stop === 'function') stop()
  })
  closeMvPlayer()
})
</script>

<style scoped>
.release-notes-enter-active,
.release-notes-leave-active {
  transition: opacity 220ms ease;
}

.release-notes-enter-from,
.release-notes-leave-to {
  opacity: 0;
}

.release-notes-enter-active .release-notes-panel,
.release-notes-leave-active .release-notes-panel {
  transition: transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 220ms ease;
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
  .release-notes-leave-active .release-notes-panel {
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
    content-visibility: auto;
    contain-intrinsic-size: 1px 760px;
  }
}
</style>
