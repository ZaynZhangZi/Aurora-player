<template>
  <div class="fixed inset-x-0 top-0 z-50 pointer-events-none">
    <div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">

      <div class="flex items-start gap-2 sm:gap-3 w-full">

        <Transition name="pop">
          <button
            v-if="showBackButton"
            type="button"
            @click="goBack"
            :class="shellToneClass"
            class="mt-2 sm:mt-3 shrink-0 flex items-center justify-center size-12 rounded-full border shadow-lg ring-1 backdrop-blur-md backdrop-saturate-150 pointer-events-auto transition-all duration-300 active:scale-95 will-change-transform"
            aria-label="返回上一页"
          >
            <ChevronLeftIcon class="size-6 mr-0.5" :class="btnToneClass" stroke-width="2.5"/>
          </button>
        </Transition>

        <div
          ref="shell"
          :class="[expanded ? 'rounded-full pl-0 pr-1 sm:pr-6 h-12' : 'h-12 w-12 rounded-full', shellToneClass]"
          class="mt-2 sm:mt-3 grid items-center overflow-hidden border shadow-lg ring-1 backdrop-blur-md backdrop-saturate-150 [grid-template-columns:48px_1fr] pointer-events-auto transition-colors duration-200"
          @mouseenter="hovering = true"
          @mouseleave="hovering = false"
        >
          <div class="col-[1/2] grid place-items-center size-12 shrink-0">
            <button
              ref="btn"
              :aria-pressed="expanded"
              :class="[expanded ? 'scale-95' : 'scale-100', btnToneClass]"
              class="grid place-items-center size-12 transition-transform duration-300 will-change-transform"
              type="button"
              @click="toggle()"
            >
              <span
                class="relative inline-flex items-center justify-center size-6 pointer-events-none">
                <Bars3Icon
                  :class="expanded ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'"
                  aria-hidden="true"
                  class="absolute size-6 transition-all duration-300 ease-out"
                />
                <XMarkIcon
                  :class="expanded ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'"
                  aria-hidden="true"
                  class="absolute size-6 transition-all duration-300 ease-out"
                />
              </span>
            </button>
          </div>

          <div
            v-show="expanded && contentVisible"
            ref="content"
            class="col-[2/3] min-w-0 w-full flex items-center justify-between gap-1 sm:gap-4 pr-1 sm:pr-0"
          >
            <div class="hidden sm:block shrink-0">
              <slot name="left"></slot>
            </div>

            <div class="flex min-w-0 flex-1 px-1 sm:px-0">
              <div
                class="relative h-full w-full max-w-none transition-all duration-300 ease-out sm:max-w-lg md:max-w-2xl">
                <input
                  ref="input"
                  :placeholder="placeholder"
                  :class="inputToneClass"
                  class="w-full h-full text-base sm:text-sm bg-transparent outline-none ring-0 focus:ring-0 focus:outline-none transition-all duration-300 placeholder:text-sm"
                  type="text"
                  @keydown.enter="handleSearchEnter"
                  @keydown.down.prevent="moveSelection(1)"
                  @keydown.up.prevent="moveSelection(-1)"
                  @keydown.esc="clearSearchState"
                  v-model="inputValue"
                />
              </div>
            </div>

            <div v-if="showAuth"
                 class="flex shrink-0 cursor-pointer items-center space-x-1.5 sm:space-x-4">
              <button
                v-if="!isLoggedIn"
                :class="signInToneClass"
                class="text-sm font-medium transition-colors whitespace-nowrap px-2 sm:px-0"
                type="button"
                @click="openLoginDialog"
              >
                {{ signInLabel }}
              </button>
              <div v-else :class="authTextToneClass" class="flex items-center gap-1 sm:gap-2">
                <button
                  :class="chipToneClass"
                  class="relative rounded-full border px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs transition"
                  type="button"
                  @click="openMessageCenter('notice')"
                >
                  <span class="hidden sm:inline">通知</span>
                  <span class="sm:hidden">通</span>
                  <span
                    v-if="noticeBadgeCount > 0"
                    class="absolute -right-1 -top-1 grid min-w-3.5 sm:min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] sm:text-[10px] font-semibold text-white shadow-sm"
                  >
                    {{ noticeBadgeCount > 99 ? '99+' : noticeBadgeCount }}
                  </span>
                </button>
                <button
                  :class="chipToneClass"
                  class="relative rounded-full border px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs transition"
                  type="button"
                  @click="openMessageCenter('private')"
                >
                  <span class="hidden sm:inline">私信</span>
                  <span class="sm:hidden">私</span>
                  <span
                    v-if="privateBadgeCount > 0"
                    class="absolute -right-1 -top-1 grid min-w-3.5 sm:min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] sm:text-[10px] font-semibold text-white shadow-sm"
                  >
                    {{ privateBadgeCount > 99 ? '99+' : privateBadgeCount }}
                  </span>
                </button>
                <button
                  :class="chipSoftToneClass"
                  class="flex items-center gap-1.5 rounded-full p-0.5 sm:px-2 sm:py-1 transition"
                  type="button"
                  @click="openProfile"
                >
                  <img
                    v-if="avatarUrl"
                    :src="avatarUrl"
                    alt="用户头像"
                    class="size-6 sm:size-6 rounded-full object-cover shadow-sm"
                  />
                  <span class="hidden sm:inline text-xs truncate max-w-[80px]">{{
                      userNickname || '已登录'
                    }}</span>
                </button>
                <button
                  :class="chipGhostToneClass"
                  class="hidden sm:block rounded-full px-2 py-0.5 text-[11px] transition"
                  type="button"
                  @click="logout"
                >
                  退出
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="searchPanelVisible"
        class="search-panel-surface pointer-events-auto mt-2 overflow-hidden rounded-2xl border p-2.5 text-slate-900 shadow-xl backdrop-blur-2xl mx-auto w-full max-w-[calc(100vw-1rem)] sm:max-w-none"
      >
        <div class="search-topbar mb-2 flex items-center justify-between gap-2 px-1">
          <div class="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
            <span class="search-stat-pill">歌手 {{ artistEntries.length }}</span>
            <span class="search-stat-pill">歌曲 {{ songEntries.length }}</span>
            <span class="search-stat-pill">歌单 {{ playlistEntries.length }}</span>
          </div>
        </div>

        <div class="search-panel-body max-h-[65vh] sm:max-h-[40vh] overflow-y-auto pr-1">
          <p v-if="searching"
             class="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700">
            正在搜索...</p>
          <p v-else-if="searchError"
             class="rounded-lg border border-red-200 bg-red-50/75 px-3 py-2 text-sm text-red-500">
            {{ searchError }}</p>
          <p v-else-if="isSearchEmpty"
             class="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600">
            没有找到相关结果</p>

          <template v-else>
            <div class="flex flex-col gap-3 sm:gap-2">
              <section v-if="artistEntries.length"
                       class="search-section rounded-xl border border-slate-200/80 bg-white/70 p-2"
                       :class="intentType === 'artist' ? 'search-section-focus' : ''"
                       :style="getResultSectionStyle('artist')">
                <div class="search-section-head px-1 pb-1.5">
                  <p class="text-xs uppercase tracking-wide text-slate-500">歌手</p>
                  <div class="flex items-center gap-1">
                    <span class="text-[11px] text-slate-400">{{ getTotalCount('artist') }} 条</span>
                    <span v-if="isSectionLoading('artist')" class="text-[11px] text-slate-500">加载中...</span>
                  </div>
                </div>
                <p v-if="sectionError.artist" class="px-1 pb-1 text-[11px] text-red-500">
                  {{ sectionError.artist }}</p>
                <div>
                  <button v-for="artist in artistEntries" :key="`artist-${artist.id}`"
                          :class="isActiveEntry(artist.globalIndex) ? 'search-row-active' : 'search-row-idle'"
                          class="search-row flex w-full items-center justify-between rounded-xl px-2 py-2.5 sm:py-2 text-left"
                          type="button" @click="openArtist(artist)">
                    <div class="flex min-w-0 items-center gap-3 sm:gap-2">
                      <img v-if="getArtistAvatar(artist)" :src="getArtistAvatar(artist)"
                           alt="artist"
                           class="size-9 sm:size-8 rounded-full object-cover shrink-0"/>
                      <div v-else class="search-avatar-fallback size-9 sm:size-8 shrink-0">艺</div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-slate-800">{{ artist.name }}</p>
                        <p class="truncate text-[11px] text-slate-500 mt-0.5">
                          {{ getArtistSubtitle(artist) }}</p>
                      </div>
                    </div>
                    <span class="search-tag shrink-0 ml-2">歌手</span>
                  </button>
                </div>
                <div class="mt-2 flex items-center justify-end gap-2 px-1 text-xs text-slate-600">
                  <button class="search-pager-btn" type="button"
                          :disabled="!canPrev('artist') || isSectionLoading('artist')"
                          @click="changePage('artist', -1)">上一页
                  </button>
                  <span>{{ getPageLabel('artist') }}</span>
                  <button class="search-pager-btn" type="button"
                          :disabled="!canNext('artist') || isSectionLoading('artist')"
                          @click="changePage('artist', 1)">下一页
                  </button>
                </div>
              </section>

              <section v-if="songEntries.length"
                       class="search-section rounded-xl border border-slate-200/80 bg-white/70 p-2"
                       :class="intentType === 'song' ? 'search-section-focus' : ''"
                       :style="getResultSectionStyle('song')">
                <div class="search-section-head px-1 pb-1.5">
                  <p class="text-xs uppercase tracking-wide text-slate-500">歌曲</p>
                  <div class="flex items-center gap-1">
                    <span class="text-[11px] text-slate-400">{{ getTotalCount('song') }} 条</span>
                    <span v-if="isSectionLoading('song')"
                          class="text-[11px] text-slate-500">加载中...</span>
                  </div>
                </div>
                <p v-if="sectionError.song" class="px-1 pb-1 text-[11px] text-red-500">
                  {{ sectionError.song }}</p>
                <div>
                  <button v-for="song in songEntries" :key="`song-${song.id}`"
                          :class="isActiveEntry(song.globalIndex) ? 'search-row-active' : 'search-row-idle'"
                          class="search-row flex w-full items-center justify-between rounded-xl px-2 py-2.5 sm:py-2 text-left"
                          type="button" @click="openSong(song)">
                    <div class="flex min-w-0 items-center gap-3 sm:gap-2">
                      <img v-if="getSongCover(song)" :src="getSongCover(song)" alt="song"
                           class="size-9 sm:size-8 rounded-md object-cover shrink-0"/>
                      <div v-else
                           class="search-avatar-fallback rounded-md size-9 sm:size-8 shrink-0">曲
                      </div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-slate-800">{{ song.name }}</p>
                        <ArtistLinks :artists="getSongArtists(song)"
                                     container-class="truncate text-[11px] text-slate-500 mt-0.5"
                                     link-class="hover:text-slate-700 hover:underline"
                                     separator-class="text-slate-400"
                                     fallback-class="text-slate-500"/>
                      </div>
                    </div>
                    <span class="search-tag shrink-0 ml-2">歌曲</span>
                  </button>
                </div>
                <div class="mt-2 flex items-center justify-end gap-2 px-1 text-xs text-slate-600">
                  <button class="search-pager-btn" type="button"
                          :disabled="!canPrev('song') || isSectionLoading('song')"
                          @click="changePage('song', -1)">上一页
                  </button>
                  <span>{{ getPageLabel('song') }}</span>
                  <button class="search-pager-btn" type="button"
                          :disabled="!canNext('song') || isSectionLoading('song')"
                          @click="changePage('song', 1)">下一页
                  </button>
                </div>
              </section>

              <section v-if="playlistEntries.length"
                       class="search-section rounded-xl border border-slate-200/80 bg-white/70 p-2"
                       :class="intentType === 'playlist' ? 'search-section-focus' : ''"
                       :style="getResultSectionStyle('playlist')">
                <div class="search-section-head px-1 pb-1.5">
                  <p class="text-xs uppercase tracking-wide text-slate-500">歌单</p>
                  <div class="flex items-center gap-1">
                    <span class="text-[11px] text-slate-400">{{
                        getTotalCount('playlist')
                      }} 条</span>
                    <span v-if="isSectionLoading('playlist')" class="text-[11px] text-slate-500">加载中...</span>
                  </div>
                </div>
                <p v-if="sectionError.playlist" class="px-1 pb-1 text-[11px] text-red-500">
                  {{ sectionError.playlist }}</p>
                <div>
                  <button v-for="playlist in playlistEntries" :key="`playlist-${playlist.id}`"
                          :class="isActiveEntry(playlist.globalIndex) ? 'search-row-active' : 'search-row-idle'"
                          class="search-row flex w-full items-center justify-between rounded-xl px-2 py-2.5 sm:py-2 text-left"
                          type="button" @click="openPlaylist(playlist)">
                    <div class="flex min-w-0 items-center gap-3 sm:gap-2">
                      <img v-if="getPlaylistCover(playlist)" :src="getPlaylistCover(playlist)"
                           alt="playlist"
                           class="size-9 sm:size-8 rounded-md object-cover shrink-0"/>
                      <div v-else
                           class="search-avatar-fallback rounded-md size-9 sm:size-8 shrink-0">单
                      </div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-slate-800">{{
                            playlist.name
                          }}</p>
                        <p class="truncate text-[11px] text-slate-500 mt-0.5">
                          {{ playlist.creator?.nickname || '歌单' }}</p>
                      </div>
                    </div>
                    <span class="search-tag shrink-0 ml-2">歌单</span>
                  </button>
                </div>
                <div class="mt-2 flex items-center justify-end gap-2 px-1 text-xs text-slate-600">
                  <button class="search-pager-btn" type="button"
                          :disabled="!canPrev('playlist') || isSectionLoading('playlist')"
                          @click="changePage('playlist', -1)">上一页
                  </button>
                  <span>{{ getPageLabel('playlist') }}</span>
                  <button class="search-pager-btn" type="button"
                          :disabled="!canNext('playlist') || isSectionLoading('playlist')"
                          @click="changePage('playlist', 1)">下一页
                  </button>
                </div>
              </section>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>

  <Dialog :open="isOpen" @close="setIsOpen">
    <div ref="dialogOverlay" class="fixed inset-0 bg-black/40 backdrop-blur-sm"
         aria-hidden="true"></div>
    <div class="fixed inset-0 flex items-center justify-center p-4">
      <DialogPanel ref="dialogPanel"
                   class="panel-anim relative w-full max-w-[95vw] sm:max-w-sm rounded-2xl bg-white p-5 sm:p-6 shadow-2xl">
        <button ref="closeBtn"
                :class="['absolute right-3 top-3 sm:right-4 sm:top-4 p-2 text-gray-400 transition-transform hover:scale-110 hover:text-gray-600 focus:outline-none rounded-full', { 'no-hover': isClosing }]"
                type="button" @click="setIsOpen(false)">
          <XMarkIcon class="size-5 sm:size-6"/>
        </button>
        <DialogTitle class="text-lg font-semibold text-gray-900 mt-2 sm:mt-0">扫码登录</DialogTitle>
        <DialogDescription class="mt-1 text-xs sm:text-sm text-gray-500">使用网易云音乐 App
          扫码登录，授权后即可同步你的歌单与账号信息
        </DialogDescription>
        <div class="mt-6 flex flex-col items-center gap-4">
          <div
            class="relative size-48 sm:size-52 overflow-hidden rounded-2xl bg-gray-50/50 p-2 sm:p-3 border border-gray-100">
            <div v-if="qrState === 'loading'"
                 class="flex h-full w-full items-center justify-center text-sm text-gray-500">
              正在生成二维码...
            </div>
            <img v-else-if="qrImage" :src="qrImage" alt="登录二维码"
                 class="h-full w-full rounded-lg bg-white object-contain"/>
            <div v-else
                 class="flex h-full w-full items-center justify-center text-sm text-gray-400">暂无二维码
            </div>
            <div v-if="qrState === 'expired'"
                 class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white backdrop-blur-[2px]">
              <span class="text-sm font-medium">二维码已过期</span>
              <button
                class="rounded-full bg-white px-5 py-1.5 text-xs font-semibold text-gray-900 shadow-sm active:scale-95 transition-transform"
                type="button" @click="refreshQr">重新获取
              </button>
            </div>
            <div v-else-if="qrState === 'success'"
                 class="absolute inset-0 flex items-center justify-center bg-emerald-500/90 text-base font-semibold text-white backdrop-blur-[2px]">
              登录成功
            </div>
            <div v-else-if="qrState === 'confirm' && confirmProfile"
                 class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center text-white backdrop-blur-[2px]">
              <img v-if="confirmProfile.avatarUrl" :src="confirmProfile.avatarUrl"
                   alt="扫码用户头像"
                   class="size-16 rounded-full border-2 border-white/90 object-cover shadow-lg"/>
              <div class="flex flex-col items-center gap-1">
                <span class="text-sm font-semibold">{{ confirmProfile.nickname || '已扫码' }}</span>
                <span class="text-[11px] text-white/80">请在手机端确认登录授权</span>
              </div>
            </div>
          </div>
          <p class="text-sm font-medium text-gray-700">{{ qrStatusText }}</p>
          <p v-if="qrError" class="text-xs text-red-500">{{ qrError }}</p>
        </div>
        <div class="mt-6 flex items-center justify-between text-sm px-1">
          <button class="text-gray-500 transition-colors hover:text-gray-900 px-2 py-1"
                  type="button" :disabled="qrState === 'loading'" @click="refreshQr">换一个二维码
          </button>
        </div>
      </DialogPanel>
    </div>
  </Dialog>

  <Dialog :open="messageDialogOpen" @close="setMessageDialogOpen">
    <div class="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm" aria-hidden="true"></div>
    <div class="fixed inset-0 z-[61] flex items-center justify-center sm:p-4">
      <DialogPanel
        class="flex flex-col h-[90vh] sm:h-auto w-full max-w-3xl sm:rounded-2xl rounded-t-2xl mt-auto sm:mt-0 border border-amber-200/80 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 p-4 sm:p-5 text-stone-800 shadow-2xl overflow-hidden">
        <div class="mb-3 sm:mb-4 flex items-center justify-between shrink-0">
          <DialogTitle class="text-lg font-bold text-amber-900 tracking-tight">消息中心
          </DialogTitle>
          <button
            class="rounded-full bg-white/60 p-1.5 text-stone-500 hover:bg-white transition-colors"
            type="button" @click="setMessageDialogOpen(false)">
            <XMarkIcon class="size-5 sm:size-4"/>
          </button>
        </div>
        <div class="mb-3 sm:mb-4 flex items-center gap-2 shrink-0">
          <button
            :class="messageTab === 'notice' ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-sm' : 'border-amber-200/60 bg-white/60 text-stone-500 hover:bg-white'"
            class="rounded-full border px-4 py-1.5 text-xs font-medium transition-all" type="button"
            @click="switchMessageTab('notice')">通知
          </button>
          <button
            :class="messageTab === 'private' ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-sm' : 'border-amber-200/60 bg-white/60 text-stone-500 hover:bg-white'"
            class="rounded-full border px-4 py-1.5 text-xs font-medium transition-all" type="button"
            @click="switchMessageTab('private')">私信
          </button>
        </div>
        <div class="flex-1 min-h-0 relative">
          <section v-if="messageTab === 'notice'" class="h-full flex flex-col">
            <p v-if="noticeLoading" class="text-sm text-stone-500 py-4 text-center">
              通知加载中...</p>
            <p v-else-if="noticeError" class="text-sm text-red-500 py-4 text-center">{{
                noticeError
              }}</p>
            <div v-else
                 class="flex-1 space-y-3 overflow-y-auto rounded-xl border border-amber-200/70 bg-white/70 p-3 pr-1 backdrop-blur-sm">
              <div v-for="item in noticeList" :key="item.id" class="flex items-start gap-2.5">
                <img
                  :src="item.avatarUrl || 'https://p1.music.126.net/4M6T2Bq8QJz7B4JrQJw8hA==/109951168123456789.jpg'"
                  alt="通知头像"
                  class="mt-0.5 size-9 sm:size-8 rounded-full object-cover shrink-0 shadow-sm"/>
                <div
                  class="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-amber-100/50 bg-white px-3.5 py-2.5 shadow-sm">
                  <div class="mb-1.5 flex items-center justify-between gap-3">
                    <p class="truncate text-xs font-bold text-stone-700">{{ item.senderName }}</p>
                    <span class="shrink-0 text-[10px] text-stone-400">{{
                        formatTime(item.time)
                      }}</span>
                  </div>
                  <p class="mb-1 truncate text-xs text-amber-600/80 font-medium">{{
                      item.title
                    }}</p>
                  <p class="whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-600">
                    {{ item.content }}</p>
                  <a v-if="item.webUrl" :href="item.webUrl"
                     class="mt-2 inline-block text-[11px] font-medium text-amber-600 underline-offset-2 hover:underline"
                     target="_blank" rel="noreferrer">查看详情 &rarr;</a>
                </div>
              </div>
              <div v-if="!noticeList.length"
                   class="flex flex-col items-center justify-center h-32 opacity-50"><p
                class="text-sm text-stone-500">暂无通知</p></div>
              <button v-if="noticeHasMore"
                      class="w-full rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50 to-white px-3 py-2.5 text-xs font-medium text-amber-800 hover:from-amber-100 disabled:opacity-50 transition-colors mt-2"
                      type="button" :disabled="noticeLoadingMore" @click="loadMoreNotices">
                {{ noticeLoadingMore ? '加载中...' : '查看更多通知' }}
              </button>
            </div>
          </section>
          <section v-else class="h-full flex flex-col">
            <div class="flex h-full gap-3 md:grid md:grid-cols-[280px_1fr]">
              <aside
                :class="['min-h-0 flex-col rounded-xl border border-amber-200/70 bg-white/80 p-2 sm:p-2.5 shadow-sm backdrop-blur-sm', selectedPrivateTarget ? 'hidden md:flex' : 'flex w-full md:w-auto']">
                <div class="relative mb-2 shrink-0" data-private-receiver>
                  <input v-model.trim="privateTargetKeyword"
                         class="w-full rounded-lg border border-amber-200 bg-white/90 px-3 py-2 text-sm outline-none placeholder:text-stone-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-shadow"
                         type="text" placeholder="搜索昵称，新建会话"
                         @focus="privateReceiverFocused = true" @blur="handlePrivateReceiverBlur"/>
                  <div v-if="privateReceiverDropdownVisible"
                       class="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-amber-200 bg-white/95 p-1 shadow-xl backdrop-blur-md">
                    <p v-if="privateReceiverLoading" class="px-2 py-2 text-xs text-stone-500">
                      搜索中...</p>
                    <p v-else-if="privateReceiverError" class="px-2 py-2 text-xs text-red-500">
                      {{ privateReceiverError }}</p>
                    <button v-for="user in privateReceiverResults" :key="user.userId"
                            class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-amber-50 active:bg-amber-100 transition-colors"
                            type="button" @mousedown.prevent="selectPrivateTarget(user)">
                      <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="用户头像"
                           class="size-7 rounded-full object-cover shrink-0"/>
                      <div class="min-w-0">
                        <p class="truncate text-xs font-medium text-stone-700">
                          {{ user.nickname || `用户 ${user.userId}` }}</p>
                        <p class="truncate text-[10px] text-stone-400 mt-0.5">uid: {{
                            user.userId
                          }}</p>
                      </div>
                    </button>
                    <p
                      v-if="!privateReceiverLoading && !privateReceiverError && !privateReceiverResults.length"
                      class="px-2 py-2 text-xs text-stone-400">没有搜索到用户</p>
                  </div>
                </div>
                <div class="mb-2 shrink-0">
                  <input v-model.trim="privateConversationKeyword"
                         class="w-full rounded-lg border border-amber-200/60 bg-stone-50/50 px-3 py-1.5 text-xs outline-none placeholder:text-stone-400 focus:bg-white focus:border-amber-300 transition-colors"
                         type="text" placeholder="搜索会话（昵称或内容）"/>
                </div>
                <div class="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                  <p v-if="privateLoading" class="px-2 py-4 text-center text-sm text-stone-500">
                    私信加载中...</p>
                  <p v-else-if="privateError" class="px-2 py-4 text-center text-sm text-red-500">
                    {{ privateError }}</p>
                  <template v-else>
                    <button v-for="item in filteredPrivateList" :key="item.id"
                            :class="activePrivateId === item.counterpartId ? 'bg-gradient-to-r from-amber-100 to-amber-50/50 border-amber-300 shadow-sm' : 'bg-white border-transparent hover:bg-amber-50/50'"
                            class="w-full rounded-xl border px-2.5 py-2.5 text-left transition-all group"
                            type="button" @click="openPrivateConversation(item)">
                      <div class="mb-1 flex items-center justify-between gap-2">
                        <div class="flex min-w-0 items-center gap-2">
                          <img v-if="item.avatarUrl" :src="item.avatarUrl" alt="私信头像"
                               class="size-8 sm:size-7 rounded-full object-cover shrink-0 shadow-sm"/>
                          <p
                            class="truncate text-sm sm:text-xs font-bold text-stone-700 group-hover:text-amber-900 transition-colors">
                            {{ item.counterpartName }}</p>
                          <span v-if="item.unreadCount > 0"
                                class="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">{{
                              item.unreadCount > 99 ? '99+' : item.unreadCount
                            }}</span>
                        </div>
                        <span class="shrink-0 text-[10px] text-stone-400">{{
                            formatTime(item.time)
                          }}</span>
                      </div>
                      <p class="truncate text-xs sm:text-[11px] text-stone-500 pl-10 sm:pl-9">
                        {{ item.content }}</p>
                    </button>
                    <div v-if="!filteredPrivateList.length"
                         class="py-8 text-center text-sm text-stone-400">暂无会话
                    </div>
                    <button v-if="privateHasMore"
                            class="mt-2 w-full rounded-lg border border-amber-200/50 bg-amber-50/50 px-3 py-2 text-xs text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                            type="button" :disabled="privateLoadingMore"
                            @click="loadMorePrivateMessages">
                      {{ privateLoadingMore ? '加载中...' : '查看更早会话' }}
                    </button>
                  </template>
                </div>
              </aside>
              <div
                :class="['min-h-0 flex-col rounded-xl border border-amber-200/80 bg-white/95 shadow-sm overflow-hidden', !selectedPrivateTarget ? 'hidden md:flex md:w-auto' : 'flex w-full md:w-auto']">
                <div
                  class="flex shrink-0 items-center border-b border-amber-100 bg-gradient-to-r from-stone-50 to-white px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm z-10">
                  <button
                    class="md:hidden mr-2 p-1.5 -ml-1.5 rounded-full text-amber-600 hover:bg-amber-100 transition-colors"
                    @click="selectedPrivateTarget = null">
                    <svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <p class="text-sm font-bold text-stone-800 flex-1 truncate">
                    {{ selectedPrivateTarget?.nickname || '选择或新建一个会话' }}</p>
                  <span v-if="selectedPrivateTarget?.userId"
                        class="text-[10px] text-stone-400 font-medium bg-stone-100 px-2 py-0.5 rounded-full">uid: {{
                      selectedPrivateTarget.userId
                    }}</span>
                </div>
                <div ref="privateHistoryScroller"
                     class="chat-panel min-h-0 flex-1 overflow-y-auto px-3 sm:px-4 py-4 overscroll-contain relative">
                  <div
                    class="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:20px_20px]"></div>
                  <div class="relative z-10">
                    <button v-if="privateHistoryHasMore"
                            class="mx-auto mb-4 block rounded-full border border-amber-200/70 bg-white/80 px-4 py-1.5 text-[11px] font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 shadow-sm backdrop-blur-sm transition-colors"
                            type="button" :disabled="privateHistoryLoadingMore"
                            @click="loadMorePrivateHistory">
                      {{ privateHistoryLoadingMore ? '加载中...' : '加载更早消息' }}
                    </button>
                    <p v-if="privateHistoryLoading" class="text-center text-xs text-stone-400 my-4">
                      会话加载中...</p>
                    <p v-else-if="privateHistoryError"
                       class="text-center text-xs text-red-500 my-4">{{ privateHistoryError }}</p>
                    <div v-else class="space-y-4">
                      <div v-for="item in privateHistory" :key="item.id"
                           :class="item.isSelf ? 'justify-end' : 'justify-start'"
                           class="flex w-full">
                        <div
                          :class="[item.isSelf ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-br-sm shadow-md' : 'bg-white border border-stone-200 text-stone-800 rounded-bl-sm shadow-sm', highlightedMessageIds[item.id] ? 'message-highlight' : '']"
                          class="max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 relative group">
                          <p class="whitespace-pre-wrap break-words text-sm leading-relaxed"
                             :class="item.isSelf ? 'text-amber-50 font-medium' : ''">
                            {{ item.content || '（空消息）' }}</p>
                          <p class="mt-1 text-right text-[9px] opacity-70"
                             :class="item.isSelf ? 'text-amber-100' : 'text-stone-400'">
                            {{ formatTime(item.time) }}</p>
                        </div>
                      </div>
                      <div v-if="!privateHistory.length && selectedPrivateTarget"
                           class="py-10 text-center opacity-60">
                        <div
                          class="inline-flex size-12 rounded-full bg-amber-100 text-amber-500 items-center justify-center mb-2">
                          👋
                        </div>
                        <p class="text-xs text-stone-500">打个招呼吧</p></div>
                    </div>
                  </div>
                </div>
                <div class="shrink-0 border-t border-amber-100 bg-stone-50/50 p-2 sm:p-3">
                  <div class="flex gap-2">
                    <input v-model.trim="privateContent"
                           class="flex-1 rounded-xl border border-amber-200/80 bg-white px-4 py-2 text-sm outline-none placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                           type="text" maxlength="300" placeholder="发消息..."
                           @keydown.enter="submitPrivateMessage"
                           :disabled="!selectedPrivateTarget"/>
                    <button
                      class="shrink-0 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-5 py-2 text-sm font-bold text-white shadow-md transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                      type="button" :disabled="sendingPrivate || !selectedPrivateTarget"
                      @click="submitPrivateMessage">{{ sendingPrivate ? '发送中' : '发送' }}
                    </button>
                  </div>
                  <p v-if="privateFeedback"
                     class="absolute bottom-16 right-4 rounded-md bg-stone-800/80 px-2 py-1 text-[10px] text-white shadow-lg backdrop-blur-sm"
                     :class="privateFeedbackIsError ? 'bg-red-500/90' : ''">{{
                      privateFeedback
                    }}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount, watch, nextTick, defineExpose, computed} from 'vue'
import gsap from 'gsap'
import {XMarkIcon, Bars3Icon, ChevronLeftIcon} from '@heroicons/vue/24/outline'
import {Dialog, DialogPanel, DialogTitle, DialogDescription} from '@headlessui/vue'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import {userApi} from '@/api/userApi/userApi.js'
import {useCounterStore} from '@/stores/userStores.js'
import {searchApi} from '@/api/searchApi/searchApi.js'
import {playSongById, playSongWithQueue} from '@/utils/globalPlayer.js'
import {useRouter, useRoute} from 'vue-router'

const props = defineProps({
  modelValue: {type: Boolean, default: false},
  autoExpandOnScroll: {type: Boolean, default: true},
  scrollThreshold: {type: Number, default: 24},
  placeholder: {type: String, default: '搜索'},
  signInLabel: {type: String, default: '登录'},
  signUpLabel: {type: String, default: ''},
  showAuth: {type: Boolean, default: true},
})

const emit = defineEmits(['update:modelValue', 'expand', 'collapse', 'toggle', 'search', 'signin', 'signup'])

const shell = ref(null)
const content = ref(null)
const btn = ref(null)
const input = ref(null)
const dialogOverlay = ref(null)
const dialogPanel = ref(null)
const closeBtn = ref(null)

const expanded = ref(props.modelValue)
const contentVisible = ref(props.modelValue)
const hovering = ref(false)
const inputValue = ref('')

const confirmProfile = ref(null)
const isOpen = ref(false)
const qrKey = ref('')
const qrImage = ref('')
const qrState = ref('idle')
const qrError = ref('')
const pollingTimer = ref(null)
const useNoCookie = ref(false)
const isClosing = ref(false)
const searchResult = ref(null)
const searching = ref(false)
const searchError = ref('')
const sectionLoading = ref({artist: false, song: false, playlist: false})
const sectionError = ref({artist: '', song: '', playlist: ''})
const pageSize = 6
const searchPage = ref({artist: 0, song: 0, playlist: 0})
const activeEntryIndex = ref(-1)

const router = useRouter()
const route = useRoute()

// 只在非首页显示返回按钮
const showBackButton = computed(() => {
  return !['/', '/home'].includes(route.path)
})

function goBack() {
  router.back()
}

const userStore = useCounterStore()
const isLoggedIn = computed(() => userStore.isLoggedIn)
const avatarUrl = computed(() => userStore.avatarUrl)
const userNickname = computed(() => userStore.nickname)

const messageDialogOpen = ref(false)
const messageTab = ref('notice')
const noticeBadgeCount = ref(0)
const privateBadgeCount = ref(0)
const noticeLoading = ref(false)
const noticeError = ref('')
const noticeList = ref([])
const noticeHasMore = ref(false)
const noticeLastTime = ref(-1)
const noticeLoadingMore = ref(false)
const privateLoading = ref(false)
const privateError = ref('')
const privateList = ref([])
const privateHasMore = ref(false)
const privateOffset = ref(0)
const privateLoadingMore = ref(false)
const activePrivateId = ref('')
const privateHistory = ref([])
const privateHistoryLoading = ref(false)
const privateHistoryError = ref('')
const privateHistoryHasMore = ref(false)
const privateHistoryBefore = ref(0)
const privateHistoryLoadingMore = ref(false)
const privateHistoryScroller = ref(null)
const privateConversationKeyword = ref('')
const privateTargetKeyword = ref('')
const privateReceiverLoading = ref(false)
const privateReceiverError = ref('')
const privateReceiverResults = ref([])
const privateReceiverFocused = ref(false)
const privateReceiverSearched = ref(false)
const selectedPrivateTarget = ref(null)
const highlightedMessageIds = ref({})
const privateContent = ref('')
const sendingPrivate = ref(false)
const privateFeedback = ref('')
const privateFeedbackIsError = ref(false)
const fabContrastMode = ref('on-dark')
const viewportWidth = ref(typeof window === 'undefined' ? 0 : window.innerWidth)

let navTl = null
let autoExpandByScroll = false
let searchTimer = null
let searchRequestId = 0
let privateReceiverSearchTimer = null
let privateReceiverSearchRequestId = 0
let privateHistoryRequestId = 0
let contrastRaf = 0

const shellToneClass = computed(() => fabContrastMode.value === 'on-light' ? 'border-stone-800/45 ring-stone-900/20 bg-stone-900/58 text-white' : 'border-white/30 ring-white/20 bg-white/38 text-stone-900')
const btnToneClass = computed(() => fabContrastMode.value === 'on-light' ? 'text-white/90 hover:text-white' : 'text-stone-800 hover:text-black')
const inputToneClass = computed(() => fabContrastMode.value === 'on-light' ? 'text-white placeholder-white/65' : 'text-stone-800 placeholder-stone-500')
const signInToneClass = computed(() => fabContrastMode.value === 'on-light' ? 'text-white/90 hover:text-white' : 'text-stone-700 hover:text-stone-900')
const authTextToneClass = computed(() => fabContrastMode.value === 'on-light' ? 'text-white/90' : 'text-stone-700')
const chipToneClass = computed(() => fabContrastMode.value === 'on-light' ? 'border-white/35 bg-white/10 hover:bg-white/20' : 'border-stone-300 bg-white/60 hover:bg-white/80')
const chipSoftToneClass = computed(() => fabContrastMode.value === 'on-light' ? 'bg-white/20 hover:bg-white/28' : 'bg-white/70 hover:bg-white/90')
const chipGhostToneClass = computed(() => fabContrastMode.value === 'on-light' ? 'bg-white/25 hover:bg-white/35' : 'bg-white/78 hover:bg-white')

watch(() => props.modelValue, (v) => {
  if (v !== expanded.value) animateExpand(v)
})
watch(inputValue, (value) => {
  const keyword = value.trim()
  if (!keyword || !expanded.value) {
    clearSearchState();
    return
  }
  searchPage.value = {artist: 0, song: 0, playlist: 0}
  activeEntryIndex.value = -1
  debounceSearch(keyword)
})
watch(expanded, (value) => {
  if (!value) {
    inputValue.value = '';
    clearSearchState()
  }
  scheduleContrastUpdate()
})
watch(() => router.currentRoute.value.fullPath, () => scheduleContrastUpdate())

// 监听返回按钮状态变化，如果展开中，需要重新测算宽度以避免挤压
watch(showBackButton, () => {
  if (expanded.value) {
    nextTick(() => syncExpandedWidth())
  }
})

watch(isOpen, (open) => {
  if (open) clearSearchState()
})
watch(messageDialogOpen, (open) => {
  if (!open) {
    privateReceiverFocused.value = false;
    privateReceiverResults.value = [];
    privateReceiverError.value = '';
    privateReceiverSearched.value = false;
    privateHistory.value = [];
    privateHistoryError.value = '';
    activePrivateId.value = '';
    selectedPrivateTarget.value = null;
    return
  }
  privateFeedback.value = ''
  if (messageTab.value === 'notice') fetchNotices({reset: true})
  else fetchPrivateMessages({reset: true})
})
watch(isLoggedIn, (value) => {
  if (!value) {
    noticeBadgeCount.value = 0;
    privateBadgeCount.value = 0;
    return
  }
  ;refreshMessageBadges()
}, {immediate: true})
watch(privateTargetKeyword, (value) => {
  const keyword = value.trim()
  if (selectedPrivateTarget.value && keyword !== (selectedPrivateTarget.value.nickname || String(selectedPrivateTarget.value.userId))) selectedPrivateTarget.value = null
  if (!keyword || selectedPrivateTarget.value?.nickname === keyword) {
    privateReceiverResults.value = [];
    privateReceiverError.value = '';
    privateReceiverSearched.value = false;
    return
  }
  debounceSearchPrivateReceiver(keyword)
})
watch(activePrivateId, () => nextTick(() => scrollPrivateHistoryToBottom()))
watch(() => privateHistory.value.map(item => item.id).join(','), (nextIds, prevIds) => {
  if (!nextIds) return
  const prevSet = new Set((prevIds || '').split(',').filter(Boolean))
  const added = privateHistory.value.filter(item => !prevSet.has(item.id))
  if (!added.length || privateHistoryLoadingMore.value) return
  if (!prevSet.size) {
    nextTick(() => scrollPrivateHistoryToBottom());
    return
  }
  if (added.length) {
    markMessageHighlighted(added.slice(-4).map(item => item.id))
    nextTick(() => scrollPrivateHistoryToBottom({smooth: true}))
  }
})

function measureExpandedWidth() {
  const el = shell.value
  if (!el) return 48

  // parentElement 是外层的 div.flex 容器，它的宽度就是实际最大可用宽度
  const parentWidth = el.parentElement?.getBoundingClientRect().width || viewportWidth.value

  // 判断当前屏幕是否是大屏，计算对应的 gap (大屏 sm:gap-3 是 12px, 小屏 gap-2 是 8px)
  const isDesktop = viewportWidth.value >= 640
  const gap = isDesktop ? 12 : 8

  // 如果返回按钮存在，精确扣除按钮的尺寸 (48px) 以及 gap 的距离
  const offset = showBackButton.value ? (48 + gap) : 0

  // 计算得出最终宽度，预留 1 像素容错，防止部分浏览器亚像素渲染导致挤压缩放
  return Math.max(200, Math.floor(parentWidth - offset) - 1)
}

function syncExpandedWidth() {
  const el = shell.value
  if (!el || !expanded.value || navTl) return
  gsap.set(el, {width: measureExpandedWidth()})
}

function animateExpand(toExpand) {
  if (!shell.value) return
  navTl?.kill()
  const toWidth = toExpand ? measureExpandedWidth() : 48
  if (toExpand) {
    contentVisible.value = true;
    expanded.value = true
  }
  navTl = gsap.timeline({
    defaults: {ease: 'power3.out'}, onComplete: () => {
      if (!toExpand) expanded.value = false;
      navTl = null;
      if (toExpand) input.value?.focus()
    }
  })
  if (toExpand) {
    navTl.to(shell.value, {width: toWidth, height: 48, borderRadius: 9999, duration: 0.5}, 0)
    navTl.fromTo(content.value, {opacity: 0, y: -6}, {opacity: 1, y: 0, duration: 0.35}, 0.1)
  } else {
    navTl.to(content.value, {
      opacity: 0,
      y: -6,
      duration: 0.2,
      onComplete: () => contentVisible.value = false
    }, 0)
    navTl.to(shell.value, {width: toWidth, height: 48, borderRadius: 9999, duration: 0.45}, 0.2)
  }
  emit('update:modelValue', toExpand)
  emit(toExpand ? 'expand' : 'collapse')
}

function expand() {
  animateExpand(true)
}

function collapse() {
  animateExpand(false)
}

function toggle() {
  const next = !expanded.value;
  animateExpand(next);
  emit('toggle', next)
}

function handleSearchEnter() {
  if (activeEntryIndex.value >= 0) {
    openEntryByIndex(activeEntryIndex.value);
    return
  }
  const preferredIndex = getPreferredEntryIndex()
  if (preferredIndex >= 0 && intentType.value !== 'mixed' && intentConfidence.value >= 0.56) {
    openEntryByIndex(preferredIndex);
    return
  }
  const keyword = inputValue.value.trim()
  if (!keyword) return
  emit('search', keyword)
  if (!searchResult.value) runSearch(keyword)
}

const artists = computed(() => searchResult.value?.artists || [])
const songs = computed(() => searchResult.value?.songs || [])
const playlists = computed(() => searchResult.value?.playlists || [])
const artistEntries = computed(() => artists.value.map((item, index) => ({
  ...item,
  type: 'artist',
  globalIndex: index
})))
const songEntries = computed(() => songs.value.map((item, index) => ({
  ...item,
  type: 'song',
  globalIndex: artistEntries.value.length + index
})))
const playlistEntries = computed(() => playlists.value.map((item, index) => ({
  ...item,
  type: 'playlist',
  globalIndex: artistEntries.value.length + songEntries.value.length + index
})))
const flatEntries = computed(() => [...artistEntries.value, ...songEntries.value, ...playlistEntries.value])

function normalizeIntentText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '').replace(/[\u3000-\u303f`~!@#$%^&*()_+\-=\[\]{};:'"\\|,.<>/?，。！？、；：“”‘’【】（）《》]/g, '')
}

function charOverlapScore(a, b) {
  if (!a || !b) return 0;
  const sa = new Set(a.split(''));
  const sb = new Set(b.split(''));
  let overlap = 0;
  for (const ch of sa) if (sb.has(ch)) overlap += 1;
  return overlap / Math.max(1, Math.max(sa.size, sb.size))
}

function calcNameMatchScore(keywordRaw, textRaw) {
  const keyword = normalizeIntentText(keywordRaw);
  const text = normalizeIntentText(textRaw);
  if (!keyword || !text) return 0;
  if (keyword === text) return 12;
  if (text.startsWith(keyword) || keyword.startsWith(text)) return 9;
  if (text.includes(keyword) || keyword.includes(text)) return 7;
  return Number((charOverlapScore(keyword, text) * 6).toFixed(2))
}

function calcTopMatchScore(type, keyword) {
  const list = type === 'artist' ? artists.value : type === 'song' ? songs.value : playlists.value;
  const top = list.slice(0, 6);
  if (!top.length) return 0;
  let best = 0;
  let sum = 0;
  top.forEach((item, index) => {
    const weight = 1 - index * 0.12;
    const mainName = item?.name || '';
    const mainScore = calcNameMatchScore(keyword, mainName);
    let extra = 0;
    if (type === 'song') {
      const artistNames = (item?.ar || item?.artists || []).map(a => a?.name).join(' ');
      extra = calcNameMatchScore(keyword, artistNames) * 0.28
    } else if (type === 'playlist') {
      extra = calcNameMatchScore(keyword, item?.creator?.nickname || '') * 0.15
    }
    const score = (mainScore + extra) * Math.max(0.45, weight);
    best = Math.max(best, score);
    sum += score
  });
  return Number((best * 0.72 + (sum / top.length) * 0.28).toFixed(2))
}

function calcHintBoost(keyword) {
  const artistHints = ['歌手', '歌星', '谁唱', 'artist', 'singer', '乐队'];
  const songHints = ['歌曲', '歌名', '单曲', '歌词', 'song', 'track'];
  const playlistHints = ['歌单', 'playlist', '合集', '清单'];
  return {
    artist: artistHints.some(token => keyword.includes(token)) ? 4.8 : 0,
    song: songHints.some(token => keyword.includes(token)) ? 4.8 : 0,
    playlist: playlistHints.some(token => keyword.includes(token)) ? 4.8 : 0
  }
}

const intentAnalysis = computed(() => {
  const keyword = inputValue.value.trim()
  if (!keyword) return {type: 'mixed', confidence: 0, scores: {artist: 0, song: 0, playlist: 0}}
  const counts = {
    artist: Number(getTotalCount('artist') || 0),
    song: Number(getTotalCount('song') || 0),
    playlist: Number(getTotalCount('playlist') || 0)
  }
  const hint = calcHintBoost(keyword.toLowerCase())
  const scores = {
    artist: calcTopMatchScore('artist', keyword) + Math.min(3, Math.log1p(counts.artist) * 0.78) + hint.artist,
    song: calcTopMatchScore('song', keyword) + Math.min(2.6, Math.log1p(counts.song) * 0.58) + hint.song,
    playlist: calcTopMatchScore('playlist', keyword) + Math.min(2.2, Math.log1p(counts.playlist) * 0.52) + hint.playlist
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [topType, topScore] = sorted[0];
  const secondScore = sorted[1]?.[1] || 0;
  const margin = topScore - secondScore
  const confidence = Math.max(0, Math.min(1, (margin + topScore * 0.08) / 8.5))
  if (topScore < 3.5 || margin < 1.05 || confidence < 0.42) return {
    type: 'mixed',
    confidence,
    scores
  }
  return {type: topType, confidence, scores}
})

const intentType = computed(() => intentAnalysis.value.type)
const intentConfidence = computed(() => intentAnalysis.value.confidence)
const isSearchEmpty = computed(() => searchResult.value ? (artists.value.length === 0 && songs.value.length === 0 && playlists.value.length === 0) : false)
const searchPanelVisible = computed(() => (!expanded.value || !inputValue.value.trim() || isOpen.value) ? false : (searching.value || Boolean(searchError.value) || Boolean(searchResult.value)))
const privateReceiverDropdownVisible = computed(() => privateReceiverFocused.value && privateTargetKeyword.value.trim() && (privateReceiverLoading.value || Boolean(privateReceiverError.value) || Boolean(privateReceiverResults.value.length) || privateReceiverSearched.value))
const filteredPrivateList = computed(() => {
  const keyword = privateConversationKeyword.value.trim().toLowerCase();
  if (!keyword) return privateList.value;
  return privateList.value.filter((item) => String(item.counterpartName || '').toLowerCase().includes(keyword) || String(item.content || '').toLowerCase().includes(keyword))
})

function scrollPrivateHistoryToBottom({smooth = false} = {}) {
  const el = privateHistoryScroller.value;
  if (el) el.scrollTo({top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto'})
}

function markMessageHighlighted(ids) {
  const validIds = ids.filter(Boolean);
  if (!validIds.length) return;
  const nextMap = {...highlightedMessageIds.value};
  for (const id of validIds) nextMap[id] = true;
  highlightedMessageIds.value = nextMap;
  window.setTimeout(() => {
    const current = {...highlightedMessageIds.value};
    for (const id of validIds) delete current[id];
    highlightedMessageIds.value = current
  }, 2200)
}

function clearSearchState() {
  searchResult.value = null;
  searchError.value = '';
  searching.value = false;
  sectionLoading.value = {artist: false, song: false, playlist: false};
  sectionError.value = {artist: '', song: '', playlist: ''};
  activeEntryIndex.value = -1;
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null
  }
}

function debounceSearch(keyword) {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(keyword), 280)
}

async function runSearch(keyword, {onlyType = ''} = {}) {
  const currentId = ++searchRequestId
  if (onlyType) {
    sectionLoading.value = {...sectionLoading.value, [onlyType]: true};
    sectionError.value = {...sectionError.value, [onlyType]: ''}
  } else {
    searching.value = true;
    searchError.value = '';
    sectionError.value = {artist: '', song: '', playlist: ''}
  }
  try {
    let res = null
    if (onlyType) {
      const typeMap = {artist: 100, song: 1, playlist: 1000};
      res = await searchApi.searchByType(keyword, {
        type: typeMap[onlyType] || 1,
        limit: pageSize,
        offset: (searchPage.value[onlyType] || 0) * pageSize
      })
    } else {
      res = await searchApi.searchComposite(keyword, {
        limit: pageSize,
        offsets: {
          artist: searchPage.value.artist * pageSize,
          song: searchPage.value.song * pageSize,
          playlist: searchPage.value.playlist * pageSize
        }
      })
    }
    if (currentId !== searchRequestId) return
    if (onlyType) {
      const result = res?.data?.result || {}
      const prev = searchResult.value || {
        artists: [],
        songs: [],
        playlists: [],
        counts: {artist: 0, song: 0, playlist: 0},
        limit: pageSize,
        offsets: {artist: 0, song: 0, playlist: 0}
      }
      searchResult.value = {
        ...prev,
        artists: onlyType === 'artist' ? (result.artists || []) : prev.artists,
        songs: onlyType === 'song' ? (result.songs || []) : prev.songs,
        playlists: onlyType === 'playlist' ? (result.playlists || []) : prev.playlists,
        counts: {
          ...prev.counts,
          artist: onlyType === 'artist' ? (result.artistCount || 0) : (prev.counts?.artist || 0),
          song: onlyType === 'song' ? (result.songCount || 0) : (prev.counts?.song || 0),
          playlist: onlyType === 'playlist' ? (result.playlistCount || 0) : (prev.counts?.playlist || 0)
        },
        offsets: {...prev.offsets, [onlyType]: (searchPage.value[onlyType] || 0) * pageSize}
      }
    } else {
      searchResult.value = res || {}
    }
    const maxIndex = flatEntries.value.length - 1;
    if (maxIndex < 0) {
      activeEntryIndex.value = -1
    } else if (activeEntryIndex.value > maxIndex) {
      activeEntryIndex.value = maxIndex
    }
  } catch (error) {
    if (currentId !== searchRequestId) return
    if (onlyType) sectionError.value = {
      ...sectionError.value,
      [onlyType]: error?.message || '该模块加载失败'
    }; else {
      searchResult.value = null;
      searchError.value = error?.message || '搜索失败，请稍后重试'
    }
  } finally {
    if (currentId === searchRequestId) {
      if (onlyType) sectionLoading.value = {
        ...sectionLoading.value,
        [onlyType]: false
      }; else searching.value = false
    }
  }
}

function openArtist(artist) {
  if (artist?.id) {
    router.push({path: '/artistDetial', query: {id: artist.id}});
    collapse()
  }
}

async function openSong(song) {
  if (song?.id) {
    const queueIndex = songEntries.value.findIndex(item => String(item.id) === String(song.id));
    if (queueIndex >= 0) await playSongWithQueue(song, songEntries.value, queueIndex); else await playSongById(song);
    collapse()
  }
}

function openPlaylist(playlist) {
  if (playlist?.id) {
    router.push({path: '/home/playlistDetail', query: {id: playlist.id}});
    collapse()
  }
}

function openProfile() {
  router.push({path: '/profile'});
  collapse()
}

function openMessageCenter(tab = 'notice') {
  if (!isLoggedIn.value) return;
  messageTab.value = tab;
  if (tab === 'notice') noticeBadgeCount.value = 0;
  if (tab === 'private') privateBadgeCount.value = 0;
  setMessageDialogOpen(true)
}

async function setMessageDialogOpen(value) {
  messageDialogOpen.value = value
}

function switchMessageTab(tab) {
  if (messageTab.value === tab) return;
  messageTab.value = tab;
  privateFeedback.value = '';
  if (!messageDialogOpen.value) return;
  if (tab === 'notice') {
    fetchNotices({reset: true});
    noticeBadgeCount.value = 0
  } else {
    fetchPrivateMessages({reset: true});
    privateBadgeCount.value = 0
  }
}

async function fetchNotices({reset = false} = {}) {
  if (reset) {
    noticeLoading.value = true;
    noticeLastTime.value = -1
  } else {
    noticeLoadingMore.value = true
  }
  noticeError.value = ''
  try {
    const res = await userApi.getNotices(30, noticeLastTime.value)
    const payload = res?.data || {};
    const list = normalizeNoticeList(payload)
    noticeList.value = reset ? list : mergeById(noticeList.value, list)
    noticeHasMore.value = Boolean(payload?.more);
    noticeBadgeCount.value = extractNoticeUnread(payload)
    if (list.length) {
      const nextLast = payload?.lasttime || list[list.length - 1]?.time || noticeLastTime.value;
      noticeLastTime.value = Number.isFinite(Number(nextLast)) ? Number(nextLast) : noticeLastTime.value
    }
  } catch (error) {
    noticeError.value = error?.message || '通知加载失败';
    if (reset) noticeList.value = []
  } finally {
    if (reset) noticeLoading.value = false; else noticeLoadingMore.value = false
  }
}

async function fetchPrivateMessages({reset = false} = {}) {
  if (reset) {
    privateLoading.value = true;
    privateOffset.value = 0
  } else {
    privateLoadingMore.value = true
  }
  privateError.value = ''
  try {
    const res = await userApi.getPrivateMessages(30, privateOffset.value)
    const payload = res?.data || {};
    const list = normalizePrivateList(payload)
    privateList.value = reset ? list : mergeById(privateList.value, list)
    privateHasMore.value = Boolean(payload?.more);
    privateBadgeCount.value = extractPrivateUnread(payload);
    privateOffset.value += 30
    if (reset && window.innerWidth >= 768) {
      const matched = privateList.value[0]
      if (matched) openPrivateConversation(matched); else {
        privateHistory.value = [];
        privateHistoryError.value = '';
        activePrivateId.value = ''
      }
    }
  } catch (error) {
    privateError.value = error?.message || '私信加载失败';
    if (reset) privateList.value = []
  } finally {
    if (reset) privateLoading.value = false; else privateLoadingMore.value = false
  }
}

function loadMoreNotices() {
  if (noticeHasMore.value && !noticeLoadingMore.value) fetchNotices({reset: false})
}

function loadMorePrivateMessages() {
  if (privateHasMore.value && !privateLoadingMore.value) fetchPrivateMessages({reset: false})
}

async function refreshMessageBadges() {
  try {
    const [noticeRes, privateRes] = await Promise.all([userApi.getNotices(10, -1), userApi.getPrivateMessages(10, 0)]);
    noticeBadgeCount.value = extractNoticeUnread(noticeRes?.data || {});
    privateBadgeCount.value = extractPrivateUnread(privateRes?.data || {})
  } catch (error) {
    console.warn('消息刷新失败', error)
  }
}

function normalizeNoticeList(payload) {
  const raw = payload?.notices || payload?.data?.notices || payload?.msgs || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const parsed = parseNoticePayload(item);
    return {
      id: item?.id || item?.noticeId || `${item?.time || Date.now()}-${index}`,
      senderName: item?.user?.nickname || parsed?.senderName || '系统通知',
      avatarUrl: item?.user?.avatarUrl || parsed?.avatarUrl || '',
      title: parsed?.title || item?.typeTitle || item?.noticeType || '系统通知',
      content: parsed?.content || '你有一条新的通知',
      time: item?.time || item?.lastTime || item?.createTime || 0,
      webUrl: parsed?.webUrl || item?.webUrl || '',
      unreadCount: Number(item?.newMsgCount || 0)
    }
  })
}

function parseNoticePayload(item) {
  const source = item?.notice || item?.json || item?.content;
  if (!source) return null;
  let payload = source;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch {
      payload = {msg: source}
    }
  }
  const generalMsg = payload?.generalMsg || payload?.generalNotice || payload?.promotionUrl || {};
  const sender = payload?.user || {};
  return {
    senderName: sender?.nickname || payload?.fromNickName || '',
    avatarUrl: sender?.avatarUrl || '',
    title: generalMsg?.title || generalMsg?.noticeMsg || payload?.title || payload?.actionDesc || '',
    content: payload?.msg || payload?.pushMsg || generalMsg?.inboxBriefContent || generalMsg?.content || generalMsg?.noticeMsg || generalMsg?.actionDesc || '',
    webUrl: payload?.pushUrl || generalMsg?.webUrl || payload?.webUrl || ''
  }
}

function parsePrivateMessageBody(rawText) {
  if (!rawText) return '';
  if (typeof rawText === 'object') return rawText?.msg || rawText?.text || rawText?.message || JSON.stringify(rawText);
  const text = String(rawText);
  try {
    const parsed = JSON.parse(text);
    return parsed?.msg || parsed?.text || parsed?.message || text
  } catch {
    return text
  }
}

function extractPrivateUnread(payload) {
  if (Number.isFinite(Number(payload?.newMsgCount))) return Number(payload.newMsgCount);
  const raw = payload?.msgs || payload?.data?.msgs || [];
  if (!Array.isArray(raw)) return 0;
  return raw.reduce((sum, item) => sum + Number(item?.newMsgCount || 0), 0)
}

function extractNoticeUnread(payload) {
  if (Number.isFinite(Number(payload?.newNoticeCount))) return Number(payload.newNoticeCount);
  const raw = payload?.notices || payload?.data?.notices || [];
  if (!Array.isArray(raw)) return 0;
  return raw.reduce((sum, item) => sum + Number(item?.newMsgCount || 0), 0)
}

function mergeById(oldList, newList) {
  const map = new Map();
  for (const item of oldList) map.set(item.id, item);
  for (const item of newList) map.set(item.id, item);
  return Array.from(map.values()).sort((a, b) => Number(b.time || 0) - Number(a.time || 0))
}

function mergeByIdAsc(oldList, newList) {
  const map = new Map();
  for (const item of oldList) map.set(item.id, item);
  for (const item of newList) map.set(item.id, item);
  return Array.from(map.values()).sort((a, b) => Number(a.time || 0) - Number(b.time || 0))
}

function normalizeUserTarget(user) {
  if (!user) return null;
  return {
    userId: Number(user.userId || user.id || 0),
    nickname: user.nickname || user.userName || '',
    avatarUrl: user.avatarUrl || user.avatar || ''
  }
}

function normalizeUserSearchResult(item) {
  return {
    userId: Number(item?.userId || 0),
    nickname: item?.nickname || '',
    avatarUrl: item?.avatarUrl || ''
  }
}

function debounceSearchPrivateReceiver(keyword) {
  if (privateReceiverSearchTimer) clearTimeout(privateReceiverSearchTimer);
  privateReceiverSearchTimer = setTimeout(() => searchPrivateReceiver(keyword), 260)
}

async function searchPrivateReceiver(keyword) {
  const currentId = ++privateReceiverSearchRequestId
  privateReceiverLoading.value = true;
  privateReceiverError.value = '';
  privateReceiverSearched.value = false
  try {
    const result = await searchApi.searchUsers(keyword, {limit: 8, offset: 0})
    if (currentId !== privateReceiverSearchRequestId) return
    privateReceiverResults.value = (result?.users || []).map(normalizeUserSearchResult).filter(item => item.userId)
  } catch (error) {
    if (currentId !== privateReceiverSearchRequestId) return;
    privateReceiverResults.value = [];
    privateReceiverError.value = error?.message || '搜索失败'
  } finally {
    if (currentId === privateReceiverSearchRequestId) {
      privateReceiverLoading.value = false;
      privateReceiverSearched.value = true
    }
  }
}

function normalizePrivateList(payload) {
  const raw = payload?.msgs || payload?.data?.msgs || payload?.messages || []
  if (!Array.isArray(raw)) return []
  const currentUserId = Number(userStore.userId) || null
  return raw.map((item, index) => {
    const fromUser = item?.fromUser || {};
    const toUser = item?.toUser || {};
    const fromId = Number(item?.fromUserId ?? fromUser?.userId) || null;
    const toId = Number(item?.toUserId ?? toUser?.userId) || null;
    const isSelfSender = currentUserId && fromId === currentUserId;
    const counterpartId = isSelfSender ? toId : fromId;
    const counterpartName = isSelfSender ? (toUser?.nickname || item?.toNickName || `用户 ${toId || '-'}`) : (fromUser?.nickname || item?.fromNickName || `用户 ${fromId || '-'}`)
    return {
      id: item?.id || `${item?.time || Date.now()}-${index}`,
      content: parsePrivateMessageBody(item?.lastMsg || item?.msg || item?.message || ''),
      time: item?.time || item?.lastTime || item?.createTime || 0,
      counterpartId: counterpartId ? String(counterpartId) : '',
      counterpartName,
      avatarUrl: isSelfSender ? (toUser?.avatarUrl || item?.toUserAvatar || '') : (fromUser?.avatarUrl || item?.fromUserAvatar || ''),
      unreadCount: Number(item?.newMsgCount || 0)
    }
  })
}

function normalizePrivateHistoryList(payload) {
  const raw = payload?.msgs || payload?.data?.msgs || []
  if (!Array.isArray(raw)) return []
  const currentUserId = Number(userStore.userId) || null
  return raw.map((item, index) => {
    const fromUser = item?.fromUser || {};
    const toUser = item?.toUser || {};
    const fromId = Number(item?.fromUserId ?? fromUser?.userId) || null;
    const toId = Number(item?.toUserId ?? toUser?.userId) || null;
    const isSelf = currentUserId && fromId === currentUserId
    return {
      id: item?.id || `${item?.time || Date.now()}-${index}`,
      content: parsePrivateMessageBody(item?.msg || item?.message || item?.lastMsg || ''),
      time: Number(item?.time || item?.lastTime || item?.createTime || 0),
      isSelf: Boolean(isSelf),
      fromId,
      toId
    }
  }).sort((a, b) => a.time - b.time)
}

function openPrivateConversation(item) {
  if (!item?.counterpartId) return
  activePrivateId.value = String(item.counterpartId)
  selectPrivateTarget({
    userId: item.counterpartId,
    nickname: item.counterpartName,
    avatarUrl: item.avatarUrl
  })
}

async function fetchPrivateHistory(targetId, {reset = false} = {}) {
  if (!targetId) return
  const currentId = ++privateHistoryRequestId
  if (reset) {
    privateHistoryLoading.value = true;
    privateHistoryError.value = '';
    privateHistory.value = [];
    privateHistoryBefore.value = 0
  } else {
    privateHistoryLoadingMore.value = true
  }
  try {
    const res = await userApi.getPrivateHistory(targetId, 30, privateHistoryBefore.value)
    if (currentId !== privateHistoryRequestId) return
    const payload = res?.data || {};
    const list = normalizePrivateHistoryList(payload)
    privateHistoryHasMore.value = Boolean(payload?.more);
    privateHistory.value = reset ? list : mergeByIdAsc(privateHistory.value, list)
    if (privateHistory.value.length) privateHistoryBefore.value = Number(privateHistory.value[0].time || privateHistoryBefore.value)
  } catch (error) {
    if (currentId !== privateHistoryRequestId) return
    const preview = privateList.value.find(item => String(item.counterpartId) === String(targetId)) || null
    if (reset && preview) {
      privateHistory.value = [{
        id: `${preview.id}-preview`,
        content: preview.content,
        time: Number(preview.time || Date.now()),
        isSelf: false
      }];
      privateHistoryHasMore.value = false
    }
    privateHistoryError.value = error?.message || '会话加载失败'
  } finally {
    if (currentId === privateHistoryRequestId) reset ? privateHistoryLoading.value = false : privateHistoryLoadingMore.value = false
  }
}

function loadMorePrivateHistory() {
  if (privateHistoryHasMore.value && !privateHistoryLoadingMore.value && selectedPrivateTarget.value?.userId) fetchPrivateHistory(String(selectedPrivateTarget.value.userId), {reset: false})
}

function selectPrivateTarget(user) {
  const target = normalizeUserTarget(user);
  if (!target?.userId) return;
  selectedPrivateTarget.value = target;
  activePrivateId.value = String(target.userId);
  privateTargetKeyword.value = target.nickname || String(target.userId);
  privateReceiverResults.value = [];
  privateReceiverFocused.value = false;
  privateReceiverSearched.value = false;
  fetchPrivateHistory(String(target.userId), {reset: true})
}

function handlePrivateReceiverBlur() {
  setTimeout(() => privateReceiverFocused.value = false, 120)
}

async function submitPrivateMessage() {
  privateFeedback.value = '';
  privateFeedbackIsError.value = false
  const target = selectedPrivateTarget.value?.userId;
  const content = privateContent.value.trim()
  if (!target || !Number.isFinite(Number(target))) {
    privateFeedback.value = '请先选择接收方';
    privateFeedbackIsError.value = true;
    return
  }
  if (!content) {
    privateFeedback.value = '内容不能为空';
    privateFeedbackIsError.value = true;
    return
  }
  sendingPrivate.value = true
  try {
    const res = await userApi.sendPrivateMessage(String(target), content)
    const code = res?.data?.code;
    if (code && code !== 200) throw new Error(res?.data?.message || `发送失败，错误码 ${code}`)
    privateFeedback.value = '发送成功';
    privateHistory.value = mergeByIdAsc(privateHistory.value, [{
      id: `local-${Date.now()}`,
      content,
      time: Date.now(),
      isSelf: true
    }]);
    privateContent.value = '';
    await fetchPrivateMessages({reset: true});
    await fetchPrivateHistory(String(target), {reset: true});
    privateBadgeCount.value = 0
  } catch (error) {
    privateFeedback.value = error?.message || '发送失败';
    privateFeedbackIsError.value = true
  } finally {
    sendingPrivate.value = false
  }
}

function formatTime(value) {
  const ts = Number(value);
  if (!Number.isFinite(ts) || ts <= 0) return '-';
  const date = new Date(ts);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function getSongArtists(song) {
  return song?.ar || song?.artists || []
}

function getArtistAvatar(artist) {
  return artist?.img1v1Url || artist?.picUrl || artist?.avatarUrl || ''
}

function getArtistSubtitle(artist) {
  const alias = Array.isArray(artist?.alias) ? artist.alias.filter(Boolean).join(' / ') : '';
  if (alias) return alias;
  const account = artist?.accountId ? `账号 ${artist.accountId}` : '';
  return account || '网易云音乐歌手'
}

function getSongCover(song) {
  return song?.al?.picUrl || song?.album?.picUrl || song?.coverImgUrl || ''
}

function getPlaylistCover(playlist) {
  return playlist?.coverImgUrl || playlist?.picUrl || ''
}

function isActiveEntry(index) {
  return index === activeEntryIndex.value
}

function moveSelection(direction) {
  if (!searchPanelVisible.value || !flatEntries.value.length) return;
  if (activeEntryIndex.value < 0) {
    const preferred = direction > 0 ? getPreferredEntryIndex() : getPreferredEntryIndexFromTail();
    activeEntryIndex.value = preferred >= 0 ? preferred : (direction > 0 ? 0 : flatEntries.value.length - 1);
    return
  }
  const len = flatEntries.value.length;
  activeEntryIndex.value = (activeEntryIndex.value + direction + len) % len
}

function openEntryByIndex(index) {
  const entry = flatEntries.value[index];
  if (!entry) return;
  if (entry.type === 'artist') openArtist(entry);
  if (entry.type === 'song') openSong(entry);
  if (entry.type === 'playlist') openPlaylist(entry)
}

function getTotalCount(type) {
  return searchResult.value?.counts?.[type] || 0
}

function canPrev(type) {
  return (searchPage.value[type] || 0) > 0
}

function canNext(type) {
  const page = searchPage.value[type] || 0;
  return (page + 1) * pageSize < getTotalCount(type)
}

function getPageLabel(type) {
  const totalCount = getTotalCount(type);
  const totalPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = (searchPage.value[type] || 0) + 1;
  return `${page}/${totalPage}`
}

function isSectionLoading(type) {
  return Boolean(sectionLoading.value?.[type])
}

function getResultSectionStyle(type) {
  const orderMap = {
    mixed: {artist: 1, song: 2, playlist: 3},
    artist: {artist: 1, song: 2, playlist: 3},
    song: {song: 1, artist: 2, playlist: 3},
    playlist: {playlist: 1, song: 2, artist: 3}
  };
  const orders = orderMap[intentType.value] || orderMap.mixed;
  return {order: String(orders[type] || 4)}
}

function getPreferredEntryIndex() {
  if (intentType.value === 'artist' && artistEntries.value.length) return artistEntries.value[0].globalIndex;
  if (intentType.value === 'song' && songEntries.value.length) return songEntries.value[0].globalIndex;
  if (intentType.value === 'playlist' && playlistEntries.value.length) return playlistEntries.value[0].globalIndex;
  return flatEntries.value.length ? 0 : -1
}

function getPreferredEntryIndexFromTail() {
  if (intentType.value === 'artist' && artistEntries.value.length) return artistEntries.value.at(-1).globalIndex;
  if (intentType.value === 'song' && songEntries.value.length) return songEntries.value.at(-1).globalIndex;
  if (intentType.value === 'playlist' && playlistEntries.value.length) return playlistEntries.value.at(-1).globalIndex;
  return flatEntries.value.length ? flatEntries.value.length - 1 : -1
}

function changePage(type, delta) {
  const keyword = inputValue.value.trim();
  if (!keyword) return;
  if (isSectionLoading(type)) return;
  const nextPage = (searchPage.value[type] || 0) + delta;
  if (nextPage < 0) return;
  if (delta > 0 && !canNext(type)) return;
  searchPage.value = {...searchPage.value, [type]: nextPage};
  activeEntryIndex.value = -1;
  runSearch(keyword, {onlyType: type})
}

function onScroll() {
  scheduleContrastUpdate();
  if (!props.autoExpandOnScroll) return;
  const y = window.scrollY || document.documentElement.scrollTop;
  const nearTop = y <= props.scrollThreshold;
  if (!nearTop && !expanded.value) {
    autoExpandByScroll = true;
    expand()
  } else if (nearTop && expanded.value && autoExpandByScroll && !hovering.value) {
    collapse();
    autoExpandByScroll = false
  }
}

function parseColorValue(colorString) {
  const text = String(colorString || '').trim();
  if (!text || text === 'transparent') return null;
  const rgbMatch = text.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const raw = rgbMatch[1].split(',').map(item => Number(item.trim()));
    if (raw.length < 3) return null;
    const [r, g, b, a = 1] = raw;
    if (![r, g, b].every(Number.isFinite) || !Number.isFinite(a)) return null;
    return {r, g, b, a}
  }
  const hex = text.replace('#', '');
  if (hex.length === 3 || hex.length === 4) {
    const r = Number.parseInt(hex[0] + hex[0], 16);
    const g = Number.parseInt(hex[1] + hex[1], 16);
    const b = Number.parseInt(hex[2] + hex[2], 16);
    const a = hex.length === 4 ? Number.parseInt(hex[3] + hex[3], 16) / 255 : 1;
    return {r, g, b, a}
  }
  if (hex.length === 6 || hex.length === 8) {
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return {r, g, b, a}
  }
  return null
}

function estimateLuminance({r, g, b}) {
  return 0.2126 * (Number(r) / 255) + 0.7152 * (Number(g) / 255) + 0.0722 * (Number(b) / 255)
}

function pickBackdropElement() {
  if (!shell.value) return null;
  const rect = shell.value.getBoundingClientRect();
  const stack = document.elementsFromPoint(Math.round(rect.left + rect.width * 0.5), Math.round(rect.top + rect.height * 0.5));
  return stack.find(el => el !== shell.value && !shell.value.contains(el)) || null
}

function detectBackdropLuminance() {
  let el = pickBackdropElement();
  while (el && el !== document.documentElement) {
    const parsed = parseColorValue(getComputedStyle(el).backgroundColor);
    if (parsed && parsed.a > 0.06) return estimateLuminance(parsed);
    el = el.parentElement
  }
  const bodyColor = parseColorValue(getComputedStyle(document.body).backgroundColor);
  if (bodyColor) return estimateLuminance(bodyColor);
  return 0.94
}

function updateFabContrast() {
  fabContrastMode.value = detectBackdropLuminance() > 0.74 ? 'on-light' : 'on-dark'
}

function scheduleContrastUpdate() {
  if (contrastRaf) return;
  contrastRaf = requestAnimationFrame(() => {
    contrastRaf = 0;
    updateFabContrast()
  })
}

defineExpose({expand, collapse, toggle, focus: () => input.value?.focus()})

onMounted(async () => {
  await nextTick();
  if (shell.value) gsap.set(shell.value, {
    width: expanded.value ? measureExpandedWidth() : 48,
    height: 48,
    borderRadius: 9999
  });
  updateFabContrast();
  window.addEventListener('scroll', onScroll, {passive: true});
  window.addEventListener('resize', onResize)
})

function onResize() {
  viewportWidth.value = window.innerWidth;
  scheduleContrastUpdate();
  syncExpandedWidth()
}

onBeforeUnmount(() => {
  navTl?.kill();
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onResize);
  if (contrastRaf) {
    cancelAnimationFrame(contrastRaf);
    contrastRaf = 0
  }
  ;stopQrPolling();
  clearSearchState();
  if (privateReceiverSearchTimer) clearTimeout(privateReceiverSearchTimer)
})

watch(isOpen, (open) => {
  if (open) startQrLogin(); else {
    stopQrPolling();
    resetQrState()
  }
})
const qrStatusText = computed(() => {
  const map = {
    loading: '正在生成二维码...',
    wait: '打开网易云音乐 App 扫码',
    confirm: '已扫码，请确认',
    success: '登录成功，同步中...',
    expired: '二维码过期，请刷新',
    error: '生成失败，请重试'
  };
  return map[qrState.value] || '安全快捷登录'
})

function openLoginDialog() {
  setIsOpen(true)
}

async function setIsOpen(value) {
  if (value) {
    if (isOpen.value) return;
    isOpen.value = true;
    await nextTick();
    animateDialogIn();
    return
  }
  if (!isOpen.value) return;
  await animateDialogOut();
  isOpen.value = false
}

function resetQrState() {
  qrKey.value = '';
  qrImage.value = '';
  qrState.value = 'idle';
  qrError.value = '';
  useNoCookie.value = false;
  confirmProfile.value = null
}

async function startQrLogin() {
  resetQrState();
  qrState.value = 'loading';
  try {
    const keyRes = await userApi.getQrKey();
    const key = keyRes?.data?.data?.unikey;
    if (!key) throw new Error('缺Key');
    qrKey.value = key;
    const qrRes = await userApi.getQrCode(key);
    const qrImg = qrRes?.data?.data?.qrimg;
    if (!qrImg) throw new Error('缺图');
    qrImage.value = qrImg;
    qrState.value = 'wait';
    startQrPolling()
  } catch (error) {
    qrState.value = 'error';
    qrError.value = error?.message || '生成失败'
  }
}

function startQrPolling() {
  stopQrPolling();
  fetchQrStatus();
  pollingTimer.value = window.setInterval(fetchQrStatus, 2000)
}

function stopQrPolling() {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value);
    pollingTimer.value = null
  }
}

async function fetchQrStatus() {
  if (!qrKey.value) return;
  try {
    const res = await userApi.checkQrCode(qrKey.value, {noCookie: useNoCookie.value});
    const code = res?.data?.code;
    const qrData = res?.data || {};
    if (code === 800) {
      qrState.value = 'expired';
      stopQrPolling()
    } else if (code === 801) {
      qrState.value = 'wait'
    } else if (code === 802) {
      qrState.value = 'confirm';
      confirmProfile.value = {avatarUrl: qrData.avatarUrl || '', nickname: qrData.nickname || ''}
    } else if (code === 803) {
      await handleLoginSuccess(res?.data)
    } else if (code === 502) {
      useNoCookie.value = true
    } else if (code && code !== 200) {
      qrState.value = 'error';
      qrError.value = res?.data?.message || '登录失败';
      stopQrPolling()
    }
  } catch (error) {
    qrState.value = 'error';
    qrError.value = error?.message || '状态获取失败';
    stopQrPolling()
  }
}

async function handleLoginSuccess(payload) {
  qrState.value = 'success';
  stopQrPolling();
  const cookie = payload?.cookie || payload?.data?.cookie;
  if (cookie) {
    userStore.setLogin(cookie);
    try {
      const infoRes = await userApi.getUserInfo();
      userStore.setProfile(buildProfile(infoRes?.data));
      emit('signin', buildProfile(infoRes?.data))
    } catch (e) {
      if (confirmProfile.value) userStore.setProfile({
        userId: null,
        nickname: confirmProfile.value.nickname || '',
        avatarUrl: confirmProfile.value.avatarUrl || ''
      })
    }
  }
  setTimeout(() => setIsOpen(false), 800)
}

function refreshQr() {
  if (qrState.value !== 'loading') startQrLogin()
}

async function logout() {
  try {
    await userApi.logout()
  } catch (e) {
  } finally {
    userStore.logout()
  }
}

function buildProfile(data) {
  const p = data?.profile || data || {};
  return {
    userId: p.userId ?? p.id ?? null,
    nickname: p.nickname ?? p.userName ?? confirmProfile.value?.nickname ?? '',
    avatarUrl: p.avatarUrl ?? confirmProfile.value?.avatarUrl ?? ''
  }
}

function resolveAnimTarget(target) {
  const el = target?.$el || target;
  return el && el.nodeType === 1 ? el : null
}

function animateDialogIn() {
  const overlay = resolveAnimTarget(dialogOverlay.value);
  const panel = resolveAnimTarget(dialogPanel.value);
  if (!overlay && !panel) return;
  gsap.killTweensOf([overlay, panel]);
  const tl = gsap.timeline({defaults: {ease: 'power3.out'}});
  if (overlay) {
    gsap.set(overlay, {opacity: 0});
    tl.to(overlay, {opacity: 1, duration: 0.22}, 0)
  }
  if (panel) {
    gsap.set(panel, {opacity: 0, scale: 0.95, y: 10, transformOrigin: '50% 50%'});
    tl.to(panel, {opacity: 1, scale: 1, y: 0, duration: 0.3}, 0.05)
  }
}

function animateDialogOut() {
  const overlay = resolveAnimTarget(dialogOverlay.value);
  const panel = resolveAnimTarget(dialogPanel.value);
  if (!overlay && !panel) return Promise.resolve();
  const targets = [overlay, panel].filter(Boolean);
  isClosing.value = true;
  return new Promise((resolve) => {
    gsap.killTweensOf(targets);
    const tl = gsap.timeline({
      defaults: {ease: 'power2.in', duration: 0.18}, onComplete: () => {
        isClosing.value = false;
        for (const target of targets) {
          if (target?.style) gsap.set(target, {clearProps: 'all'})
        }
        resolve()
      }
    });
    if (panel) {
      tl.to(panel, {opacity: 0, scale: 0.95, y: 10}, 0)
    }
    if (overlay) tl.to(overlay, {opacity: 0}, 0)
  })
}
</script>

<style scoped>
button, svg {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
}

.no-hover:hover {
  transform: none !important;
}

.panel-anim {
  will-change: transform, opacity;
}

/* 进出场动画：为返回悬浮球设计 */
.pop-enter-active, .pop-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pop-enter-from, .pop-leave-to {
  opacity: 0;
  transform: scale(0.6) translateX(-15px);
}

.search-panel-surface {
  border-color: rgba(148, 163, 184, 0.36);
  background: rgba(248, 250, 252, 0.85);
}

.search-topbar {
  border-bottom: 1px solid rgba(148, 163, 184, 0.24);
  padding-bottom: 6px;
}

.search-stat-pill {
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.8);
  padding: 1px 7px;
}

.search-section {
  transition: box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease;
}

.search-section-focus {
  border-color: rgba(71, 85, 105, 0.36);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.24);
}

.search-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-row {
  transition: background-color 160ms ease, transform 180ms ease;
}

.search-row-idle:hover {
  background: rgba(241, 245, 249, 0.88);
}

.search-row-active {
  background: rgba(255, 255, 255, 0.8);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.34);
}

.search-tag {
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.46);
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 8px;
  font-size: 11px;
  color: rgb(71, 85, 105);
}

.search-avatar-fallback {
  display: grid;
  place-items: center;
  border-radius: 9999px;
  background: rgba(148, 163, 184, 0.26);
  color: rgb(71, 85, 105);
  font-size: 11px;
  font-weight: 700;
}

.search-pager-btn {
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.52);
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 9px;
  transition: background-color 160ms ease, border-color 160ms ease;
}

.search-pager-btn:hover {
  border-color: rgba(71, 85, 105, 0.5);
  background: rgba(255, 255, 255, 1);
}

.search-pager-btn:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.chat-panel::-webkit-scrollbar {
  width: 4px;
}

.chat-panel::-webkit-scrollbar-track {
  background: transparent;
}

.chat-panel::-webkit-scrollbar-thumb {
  background: rgba(251, 191, 36, 0.3);
  border-radius: 4px;
}

.chat-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(245, 158, 11, 0.5);
}

.message-highlight {
  animation: messageFlash 1.6s ease;
}

@keyframes messageFlash {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45);
    transform: translateY(2px);
  }
  100% {
    box-shadow: 0 0 0 10px rgba(245, 158, 11, 0);
    transform: translateY(0);
  }
}
</style>
