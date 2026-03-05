<template>
  <!-- 固定在顶部：你也可以通过 props 改位置/宽度 -->
  <div class="fixed inset-x-0 top-0 z-50 pointer-events-none">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- 外壳：grid 两列，左 48px 固定按钮，右侧自适应内容 -->
      <div
        ref="shell"
        :class="[expanded ? 'rounded-full pl-0 pr-4 sm:pr-6 h-12' : 'h-12 w-12 rounded-full', shellToneClass]"
        class="mt-3 grid items-center overflow-hidden border shadow-lg ring-1 backdrop-blur-md backdrop-saturate-150 [grid-template-columns:48px_1fr] pointer-events-auto transition-colors duration-200"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
      >
        <!-- 固定占位容器：按钮不会被右侧内容挤动 -->
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
              <!-- Bars3：收起态 -->
              <Bars3Icon
                :class="expanded ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'"
                aria-hidden="true"
                class="absolute size-6 transition-all duration-300 ease-out"
              />
              <!-- X：展开态 -->
              <XMarkIcon
                :class="expanded ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'"
                aria-hidden="true"
                class="absolute size-6 transition-all duration-300 ease-out"
              />
            </span>
          </button>
        </div>

        <!-- 展开态内容：锁定第二列 -->
        <div
          v-show="expanded && contentVisible"
          ref="content"
          class="col-[2/3] min-w-0 w-full flex items-center justify-between gap-4"
        >
          <!-- 左侧插槽（可选：比如货币/分类） -->
          <div class="hidden sm:block">
            <slot name="left"></slot>
          </div>

          <!-- 搜索框 -->
          <div class="flex-1 hidden sm:flex">
            <div
              class="relative w-full h-full max-w-lg md:max-w-2xl transition-all duration-300 ease-out">
              <input
                ref="input"
                :placeholder="placeholder"
                :class="inputToneClass"
                class="w-full h-full text-sm bg-transparent outline-none ring-0 focus:ring-0 focus:outline-none transition-all duration-300"
                type="text"
                @keydown.enter="handleSearchEnter"
                @keydown.down.prevent="moveSelection(1)"
                @keydown.up.prevent="moveSelection(-1)"
                @keydown.esc="clearSearchState"
                v-model="inputValue"
              />
            </div>
          </div>

          <!-- 右侧 登录 / 注册（可隐藏） -->
          <div v-if="showAuth" class="flex items-center space-x-4 cursor-pointer">
            <button
              v-if="!isLoggedIn"
              :class="signInToneClass"
              class="text-sm font-medium transition-colors whitespace-nowrap"
              type="button"
              @click="openLoginDialog"
            >
              {{ signInLabel }}
            </button>
            <div v-else :class="authTextToneClass" class="flex items-center gap-2">
              <button
                :class="chipToneClass"
                class="relative rounded-full border px-2.5 py-1 text-xs transition"
                type="button"
                @click="openMessageCenter('notice')"
              >
                通知
                <span
                  v-if="noticeBadgeCount > 0"
                  class="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white"
                >
                  {{ noticeBadgeCount > 99 ? '99+' : noticeBadgeCount }}
                </span>
              </button>
              <button
                :class="chipToneClass"
                class="relative rounded-full border px-2.5 py-1 text-xs transition"
                type="button"
                @click="openMessageCenter('private')"
              >
                私信
                <span
                  v-if="privateBadgeCount > 0"
                  class="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white"
                >
                  {{ privateBadgeCount > 99 ? '99+' : privateBadgeCount }}
                </span>
              </button>
              <button
                :class="chipSoftToneClass"
                class="flex items-center gap-2 rounded-full px-2 py-1 transition"
                type="button"
                @click="openProfile"
              >
                <img
                  v-if="avatarUrl"
                  :src="avatarUrl"
                  alt="用户头像"
                  class="size-6 rounded-full object-cover"
                />
                <span class="text-xs">{{ userNickname || '已登录' }}</span>
              </button>
              <button
                :class="chipGhostToneClass"
                class="rounded-full px-2 py-0.5 text-[11px] transition"
                type="button"
                @click="logout"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </div>

      <Transition name="search-panel">
        <div
          v-if="searchPanelVisible"
          class="pointer-events-auto mt-2 overflow-hidden rounded-2xl border border-white/45 bg-white/35 p-3 text-slate-900 shadow-2xl backdrop-blur-2xl"
        >
        <p v-if="searching" class="px-2 py-2 text-sm text-slate-700">正在搜索...</p>
        <p v-else-if="searchError" class="px-2 py-2 text-sm text-red-300">{{ searchError }}</p>
        <p v-else-if="isSearchEmpty" class="px-2 py-2 text-sm text-slate-700">没有找到相关结果</p>

        <template v-else>
          <section v-if="artistEntries.length" class="mb-2">
            <p class="search-group-title px-2 pb-1 text-xs uppercase tracking-wide text-slate-500" :style="getGroupTitleStyle(0)">歌手</p>
            <TransitionGroup name="search-item" tag="div" appear>
              <button
                v-for="artist in artistEntries"
                :key="`artist-${artist.id}`"
                :class="isActiveEntry(artist.globalIndex) ? 'bg-white/60' : 'hover:bg-white/45'"
                :style="getItemStaggerStyle(artist.globalIndex)"
                class="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left"
                type="button"
                @click="openArtist(artist)"
              >
                <span class="text-sm">{{ artist.name }}</span>
                <span class="text-xs text-slate-500">歌手</span>
              </button>
            </TransitionGroup>
            <div class="mt-1 flex items-center justify-end gap-2 px-2 text-xs text-slate-600">
              <button
                class="rounded-full border border-slate-400/50 px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-30"
                type="button"
                :disabled="!canPrev('artist')"
                @click="changePage('artist', -1)"
              >
                上一页
              </button>
              <span>{{ getPageLabel('artist') }}</span>
              <button
                class="rounded-full border border-slate-400/50 px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-30"
                type="button"
                :disabled="!canNext('artist')"
                @click="changePage('artist', 1)"
              >
                下一页
              </button>
            </div>
          </section>

          <section v-if="songEntries.length" class="mb-2">
            <p class="search-group-title px-2 pb-1 text-xs uppercase tracking-wide text-slate-500" :style="getGroupTitleStyle(1)">歌曲</p>
            <TransitionGroup name="search-item" tag="div" appear>
              <button
                v-for="song in songEntries"
                :key="`song-${song.id}`"
                :class="isActiveEntry(song.globalIndex) ? 'bg-white/60' : 'hover:bg-white/45'"
                :style="getItemStaggerStyle(song.globalIndex)"
                class="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left"
                type="button"
                @click="openSong(song)"
              >
                <span class="truncate text-sm">{{ song.name }}</span>
                <ArtistLinks
                  :artists="getSongArtists(song)"
                  container-class="ml-4 truncate text-xs text-slate-500"
                  link-class="hover:text-slate-700 hover:underline"
                  separator-class="text-slate-400"
                  fallback-class="text-slate-500"
                />
              </button>
            </TransitionGroup>
            <div class="mt-1 flex items-center justify-end gap-2 px-2 text-xs text-slate-600">
              <button
                class="rounded-full border border-slate-400/50 px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-30"
                type="button"
                :disabled="!canPrev('song')"
                @click="changePage('song', -1)"
              >
                上一页
              </button>
              <span>{{ getPageLabel('song') }}</span>
              <button
                class="rounded-full border border-slate-400/50 px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-30"
                type="button"
                :disabled="!canNext('song')"
                @click="changePage('song', 1)"
              >
                下一页
              </button>
            </div>
          </section>

          <section v-if="playlistEntries.length">
            <p class="search-group-title px-2 pb-1 text-xs uppercase tracking-wide text-slate-500" :style="getGroupTitleStyle(2)">歌单</p>
            <TransitionGroup name="search-item" tag="div" appear>
              <button
                v-for="playlist in playlistEntries"
                :key="`playlist-${playlist.id}`"
                :class="isActiveEntry(playlist.globalIndex) ? 'bg-white/60' : 'hover:bg-white/45'"
                :style="getItemStaggerStyle(playlist.globalIndex)"
                class="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left"
                type="button"
                @click="openPlaylist(playlist)"
              >
                <span class="truncate text-sm">{{ playlist.name }}</span>
                <span class="ml-4 truncate text-xs text-slate-500">{{ playlist.creator?.nickname || '歌单' }}</span>
              </button>
            </TransitionGroup>
            <div class="mt-1 flex items-center justify-end gap-2 px-2 text-xs text-slate-600">
              <button
                class="rounded-full border border-slate-400/50 px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-30"
                type="button"
                :disabled="!canPrev('playlist')"
                @click="changePage('playlist', -1)"
              >
                上一页
              </button>
              <span>{{ getPageLabel('playlist') }}</span>
              <button
                class="rounded-full border border-slate-400/50 px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-30"
                type="button"
                :disabled="!canNext('playlist')"
                @click="changePage('playlist', 1)"
              >
                下一页
              </button>
            </div>
          </section>
        </template>
        </div>
      </Transition>
    </div>
  </div>

  <!-- 登录对话框 -->
  <Dialog :open="isOpen" @close="setIsOpen">
    <div ref="dialogOverlay" class="fixed inset-0 bg-black/40 backdrop-blur-sm"
         aria-hidden="true"></div>
    <div class="fixed inset-0 flex items-center justify-center p-4">
      <DialogPanel
        ref="dialogPanel"
        class="panel-anim relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button
          ref="closeBtn"
          :class="[
            'absolute right-4 top-4 text-gray-400 transition-transform hover:scale-110 hover:text-gray-600 focus:outline-none',
            { 'no-hover': isClosing }
          ]"
          type="button"
          @click="setIsOpen(false)"
        >
          <XMarkIcon class="size-5"/>
        </button>

        <DialogTitle class="text-lg font-semibold text-gray-900">扫码登录</DialogTitle>
        <DialogDescription class="mt-1 text-sm text-gray-500">
          使用网易云音乐 App 扫码登录，授权后即可同步你的歌单与账号信息
        </DialogDescription>

        <div class="mt-6 flex flex-col items-center gap-4">
          <div class="relative size-52 overflow-hidden rounded-2xl bg-gray-100 p-3">
            <div
              v-if="qrState === 'loading'"
              class="flex h-full w-full items-center justify-center text-sm text-gray-500"
            >
              正在生成二维码...
            </div>
            <img
              v-else-if="qrImage"
              :src="qrImage"
              alt="登录二维码"
              class="h-full w-full rounded-lg bg-white object-contain"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-sm text-gray-400"
            >
              暂无二维码
            </div>

            <div
              v-if="qrState === 'expired'"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white"
            >
              <span class="text-sm">二维码已过期</span>
              <button
                class="rounded-full bg-white/90 px-4 py-1 text-xs font-medium text-black"
                type="button"
                @click="refreshQr"
              >
                重新获取
              </button>
            </div>

            <div
              v-else-if="qrState === 'success'"
              class="absolute inset-0 flex items-center justify-center bg-green-600/90 text-base font-semibold text-white"
            >
              登录成功
            </div>
            <div
              v-else-if="qrState === 'confirm' && confirmProfile"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center text-white"
            >
              <img
                v-if="confirmProfile.avatarUrl"
                :src="confirmProfile.avatarUrl"
                alt="扫码用户头像"
                class="size-14 rounded-full border-2 border-white/90 object-cover"
              />
              <div class="flex flex-col items-center gap-1">
                <span class="text-sm font-semibold">
                  {{ confirmProfile.nickname || '已扫码' }}
                </span>
                <span class="text-xs text-white/70">请在手机端确认登录授权</span>
              </div>
            </div>
          </div>

          <p class="text-sm text-gray-600">{{ qrStatusText }}</p>
          <p v-if="qrError" class="text-xs text-red-500">{{ qrError }}</p>
        </div>

        <div class="mt-6 flex items-center justify-between text-sm">
          <button
            class="text-gray-500 transition-colors hover:text-gray-900"
            type="button"
            :disabled="qrState === 'loading'"
            @click="refreshQr"
          >
            换一个二维码
          </button>
          <button
            class="rounded-full bg-gray-900 px-5 py-2 text-white transition-colors hover:bg-gray-800"
            type="button"
            @click="setIsOpen(false)"
          >
            关闭
          </button>
        </div>
      </DialogPanel>
    </div>
  </Dialog>

  <Dialog :open="messageDialogOpen" @close="setMessageDialogOpen">
    <div class="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm" aria-hidden="true"></div>
    <div class="fixed inset-0 z-[61] flex items-center justify-center p-4">
      <DialogPanel class="w-full max-w-3xl rounded-2xl border border-amber-200/80 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 p-5 text-stone-800 shadow-2xl">
        <div class="mb-4 flex items-center justify-between">
          <DialogTitle class="text-lg font-semibold">消息中心</DialogTitle>
          <button class="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-xs text-stone-700 hover:bg-white" type="button" @click="setMessageDialogOpen(false)">
            关闭
          </button>
        </div>

        <div class="mb-4 flex items-center gap-2">
          <button
            :class="messageTab === 'notice' ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-amber-200 bg-white/70 text-stone-600 hover:bg-white'"
            class="rounded-full border px-3 py-1 text-xs"
            type="button"
            @click="switchMessageTab('notice')"
          >
            通知
          </button>
          <button
            :class="messageTab === 'private' ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-amber-200 bg-white/70 text-stone-600 hover:bg-white'"
            class="rounded-full border px-3 py-1 text-xs"
            type="button"
            @click="switchMessageTab('private')"
          >
            私信
          </button>
        </div>

        <section v-if="messageTab === 'notice'">
          <p v-if="noticeLoading" class="text-sm text-stone-500">通知加载中...</p>
          <p v-else-if="noticeError" class="text-sm text-red-500">{{ noticeError }}</p>
          <div v-else class="max-h-[56vh] space-y-3 overflow-y-auto rounded-xl border border-amber-200 bg-white/85 p-3 pr-1">
            <div
              v-for="item in noticeList"
              :key="item.id"
              class="flex items-start gap-2"
            >
              <img
                :src="item.avatarUrl || 'https://p1.music.126.net/4M6T2Bq8QJz7B4JrQJw8hA==/109951168123456789.jpg'"
                alt="通知头像"
                class="mt-0.5 size-8 rounded-full object-cover"
              />
              <div class="min-w-0 max-w-[84%] rounded-2xl rounded-tl-md border border-stone-200 bg-stone-50 px-3 py-2 shadow-sm">
                <div class="mb-1 flex items-center justify-between gap-3">
                  <p class="truncate text-xs font-semibold text-stone-700">{{ item.senderName }}</p>
                  <span class="shrink-0 text-[11px] text-stone-400">{{ formatTime(item.time) }}</span>
                </div>
                <p class="mb-1 truncate text-xs text-stone-500">{{ item.title }}</p>
                <p class="whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">{{ item.content }}</p>
                <a
                  v-if="item.webUrl"
                  :href="item.webUrl"
                  class="mt-1 inline-block text-xs text-amber-700 underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  查看详情
                </a>
              </div>
            </div>
            <p v-if="!noticeList.length" class="text-center text-sm text-stone-500">暂无通知</p>
            <button
              v-if="noticeHasMore"
              class="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              type="button"
              :disabled="noticeLoadingMore"
              @click="loadMoreNotices"
            >
              {{ noticeLoadingMore ? '加载中...' : '查看更多通知' }}
            </button>
          </div>
        </section>

        <section v-else>
          <div class="grid h-[62vh] gap-3 md:grid-cols-[280px_1fr]">
            <aside class="flex min-h-0 flex-col rounded-2xl border border-amber-200 bg-white/85 p-2.5 shadow-sm">
              <div class="relative mb-2" data-private-receiver>
                <input
                  v-model.trim="privateTargetKeyword"
                  class="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-stone-400 focus:border-amber-400"
                  type="text"
                  placeholder="搜索昵称，新建会话"
                  @focus="privateReceiverFocused = true"
                  @blur="handlePrivateReceiverBlur"
                />
                <div
                  v-if="privateReceiverDropdownVisible"
                  class="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-amber-200 bg-white p-1 shadow-xl"
                >
                  <p v-if="privateReceiverLoading" class="px-2 py-2 text-xs text-stone-500">搜索中...</p>
                  <p v-else-if="privateReceiverError" class="px-2 py-2 text-xs text-red-500">{{ privateReceiverError }}</p>
                  <button
                    v-for="user in privateReceiverResults"
                    :key="user.userId"
                    class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-amber-50"
                    type="button"
                    @mousedown.prevent="selectPrivateTarget(user)"
                  >
                    <img
                      v-if="user.avatarUrl"
                      :src="user.avatarUrl"
                      alt="用户头像"
                      class="size-6 rounded-full object-cover"
                    />
                    <div class="min-w-0">
                      <p class="truncate text-xs font-medium text-stone-700">{{ user.nickname || `用户 ${user.userId}` }}</p>
                      <p class="truncate text-[11px] text-stone-400">uid: {{ user.userId }}</p>
                    </div>
                  </button>
                  <p v-if="!privateReceiverLoading && !privateReceiverError && !privateReceiverResults.length" class="px-2 py-2 text-xs text-stone-400">没有搜索到用户</p>
                </div>
              </div>

              <div class="mb-2">
                <input
                  v-model.trim="privateConversationKeyword"
                  class="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs outline-none placeholder:text-stone-400 focus:border-amber-400"
                  type="text"
                  placeholder="搜索会话（昵称或内容）"
                />
              </div>

              <div class="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                <p v-if="privateLoading" class="px-2 py-2 text-sm text-stone-500">私信加载中...</p>
                <p v-else-if="privateError" class="px-2 py-2 text-sm text-red-500">{{ privateError }}</p>
                <template v-else>
                  <button
                    v-for="item in filteredPrivateList"
                    :key="item.id"
                    :class="activePrivateId === item.counterpartId ? 'bg-amber-100 border-amber-300' : 'bg-white border-stone-200 hover:bg-amber-50'"
                    class="w-full rounded-xl border px-2.5 py-2 text-left transition"
                    type="button"
                    @click="openPrivateConversation(item)"
                  >
                    <div class="mb-1 flex items-center justify-between gap-2">
                      <div class="flex min-w-0 items-center gap-2">
                        <img
                          v-if="item.avatarUrl"
                          :src="item.avatarUrl"
                          alt="私信头像"
                          class="size-6 rounded-full object-cover"
                        />
                        <p class="truncate text-xs font-medium">{{ item.counterpartName }}</p>
                        <span v-if="item.unreadCount > 0" class="rounded-full bg-rose-500 px-1 text-[10px] text-white">
                          {{ item.unreadCount > 99 ? '99+' : item.unreadCount }}
                        </span>
                      </div>
                      <span class="shrink-0 text-[10px] text-stone-400">{{ formatTime(item.time) }}</span>
                    </div>
                    <p class="truncate text-[11px] text-stone-500">{{ item.content }}</p>
                  </button>
                  <p v-if="!filteredPrivateList.length" class="px-2 py-2 text-sm text-stone-500">暂无私信</p>
                  <button
                    v-if="privateHasMore"
                    class="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    type="button"
                    :disabled="privateLoadingMore"
                    @click="loadMorePrivateMessages"
                  >
                    {{ privateLoadingMore ? '加载中...' : '查看更多私信' }}
                  </button>
                </template>
              </div>
            </aside>

            <div class="flex min-h-0 flex-col rounded-2xl border border-amber-200 bg-white/90">
              <div class="flex items-center justify-between border-b border-amber-200 px-4 py-2.5">
                <p class="text-sm font-semibold">
                  {{ selectedPrivateTarget?.nickname || '选择一个会话' }}
                </p>
                <span v-if="selectedPrivateTarget?.userId" class="text-[11px] text-stone-400">uid: {{ selectedPrivateTarget.userId }}</span>
              </div>

              <div ref="privateHistoryScroller" class="chat-panel min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <button
                  v-if="privateHistoryHasMore"
                  class="mb-3 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                  type="button"
                  :disabled="privateHistoryLoadingMore"
                  @click="loadMorePrivateHistory"
                >
                  {{ privateHistoryLoadingMore ? '加载中...' : '加载更早消息' }}
                </button>

                <p v-if="privateHistoryLoading" class="text-center text-sm text-stone-500">会话加载中...</p>
                <p v-else-if="privateHistoryError" class="text-center text-sm text-red-500">{{ privateHistoryError }}</p>
                <div v-else class="space-y-3">
                  <div
                    v-for="item in privateHistory"
                    :key="item.id"
                    :class="item.isSelf ? 'justify-end' : 'justify-start'"
                    class="flex"
                  >
                    <div
                      :class="[
                        item.isSelf ? 'bg-amber-200/60 border-amber-300 rounded-br-md' : 'bg-stone-100 border-stone-200 rounded-bl-md',
                        highlightedMessageIds[item.id] ? 'message-highlight' : ''
                      ]"
                      class="max-w-[78%] rounded-2xl border px-3 py-2"
                    >
                      <p class="whitespace-pre-wrap break-words text-sm leading-6">{{ item.content || '（空消息）' }}</p>
                      <p class="mt-1 text-right text-[10px] text-stone-400">{{ formatTime(item.time) }}</p>
                    </div>
                  </div>
                  <p v-if="!privateHistory.length" class="text-center text-sm text-stone-500">还没有消息，发一条试试</p>
                </div>
              </div>

              <div class="border-t border-amber-200 p-3">
                <div class="flex gap-2">
                  <input
                    v-model.trim="privateContent"
                    class="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-stone-400 focus:border-amber-400"
                    type="text"
                    maxlength="300"
                    placeholder="输入私信内容"
                    @keydown.enter="submitPrivateMessage"
                  />
                  <button
                    class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    :disabled="sendingPrivate"
                    @click="submitPrivateMessage"
                  >
                    {{ sendingPrivate ? '发送中...' : '发送' }}
                  </button>
                </div>
                <p v-if="privateFeedback" class="mt-2 text-xs" :class="privateFeedbackIsError ? 'text-red-500' : 'text-amber-700'">
                  {{ privateFeedback }}
                </p>
              </div>
            </div>
          </div>
        </section>
      </DialogPanel>
    </div>
  </Dialog>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount, watch, nextTick, defineExpose, computed} from 'vue'
import gsap from 'gsap'
import {XMarkIcon, Bars3Icon} from '@heroicons/vue/24/outline'
import {Dialog, DialogPanel, DialogTitle, DialogDescription} from '@headlessui/vue'
import ArtistLinks from '@/components/artistLinks/artistLinks.vue'
import {userApi} from '@/api/userApi/userApi.js'
import {useCounterStore} from '@/stores/userStores.js'
import {searchApi} from '@/api/searchApi/searchApi.js'
import {playSongById, playSongWithQueue} from '@/utils/globalPlayer.js'
import {useRouter} from 'vue-router'

const props = defineProps({
  modelValue: {type: Boolean, default: false},          // 受控展开
  autoExpandOnScroll: {type: Boolean, default: true},   // 滚动后自动展开
  scrollThreshold: {type: Number, default: 24},         // 触发的滚动阈值
  placeholder: {type: String, default: '搜索音乐、歌手或专辑'},
  signInLabel: {type: String, default: '登录'},
  signUpLabel: {type: String, default: ''},             // 不传则不展示
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
const qrState = ref('idle') // idle | loading | wait | confirm | expired | success | error
const qrError = ref('')
const pollingTimer = ref(null)
const useNoCookie = ref(false)
const isClosing = ref(false)
const searchResult = ref(null)
const searching = ref(false)
const searchError = ref('')
const pageSize = 6
const searchPage = ref({artist: 0, song: 0, playlist: 0})
const activeEntryIndex = ref(-1)

const router = useRouter()

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

let navTl = null
let autoExpandByScroll = false
let searchTimer = null
let searchRequestId = 0
let privateReceiverSearchTimer = null
let privateReceiverSearchRequestId = 0
let privateHistoryRequestId = 0
let contrastRaf = 0

const shellToneClass = computed(() => {
  if (fabContrastMode.value === 'on-light') {
    return 'border-stone-800/45 ring-stone-900/20 bg-stone-900/58 text-white'
  }
  return 'border-white/30 ring-white/20 bg-white/38 text-stone-900'
})

const btnToneClass = computed(() => {
  if (fabContrastMode.value === 'on-light') {
    return 'text-white/90 hover:text-white'
  }
  return 'text-stone-800 hover:text-black'
})

const inputToneClass = computed(() => {
  if (fabContrastMode.value === 'on-light') {
    return 'text-white placeholder-white/65'
  }
  return 'text-stone-800 placeholder-stone-500'
})

const signInToneClass = computed(() => {
  if (fabContrastMode.value === 'on-light') {
    return 'text-white/90 hover:text-white'
  }
  return 'text-stone-700 hover:text-stone-900'
})

const authTextToneClass = computed(() => {
  if (fabContrastMode.value === 'on-light') {
    return 'text-white/90'
  }
  return 'text-stone-700'
})

const chipToneClass = computed(() => {
  if (fabContrastMode.value === 'on-light') {
    return 'border-white/35 bg-white/10 hover:bg-white/20'
  }
  return 'border-stone-300 bg-white/60 hover:bg-white/80'
})

const chipSoftToneClass = computed(() => {
  if (fabContrastMode.value === 'on-light') {
    return 'bg-white/20 hover:bg-white/28'
  }
  return 'bg-white/70 hover:bg-white/90'
})

const chipGhostToneClass = computed(() => {
  if (fabContrastMode.value === 'on-light') {
    return 'bg-white/25 hover:bg-white/35'
  }
  return 'bg-white/78 hover:bg-white'
})

watch(() => props.modelValue, (v) => {
  if (v !== expanded.value) animateExpand(v)
})

watch(inputValue, (value) => {
  const keyword = value.trim()
  if (!keyword || !expanded.value) {
    clearSearchState()
    return
  }
  searchPage.value = {artist: 0, song: 0, playlist: 0}
  activeEntryIndex.value = -1
  debounceSearch(keyword)
})

watch(expanded, (value) => {
  if (!value) {
    inputValue.value = ''
    clearSearchState()
  }
  scheduleContrastUpdate()
})

watch(() => router.currentRoute.value.fullPath, () => {
  scheduleContrastUpdate()
})

watch(isOpen, (open) => {
  if (open) clearSearchState()
})

watch(messageDialogOpen, (open) => {
  if (!open) {
    privateReceiverFocused.value = false
    privateReceiverResults.value = []
    privateReceiverError.value = ''
    privateReceiverSearched.value = false
    privateHistory.value = []
    privateHistoryError.value = ''
    activePrivateId.value = ''
    return
  }
  privateFeedback.value = ''
  if (messageTab.value === 'notice') {
    fetchNotices({reset: true})
  } else {
    fetchPrivateMessages({reset: true})
  }
})

watch(isLoggedIn, (value) => {
  if (!value) {
    noticeBadgeCount.value = 0
    privateBadgeCount.value = 0
    return
  }
  refreshMessageBadges()
}, {immediate: true})

watch(privateTargetKeyword, (value) => {
  const keyword = value.trim()
  if (selectedPrivateTarget.value && keyword !== (selectedPrivateTarget.value.nickname || String(selectedPrivateTarget.value.userId))) {
    selectedPrivateTarget.value = null
  }
  if (!keyword || selectedPrivateTarget.value?.nickname === keyword) {
    privateReceiverResults.value = []
    privateReceiverError.value = ''
    privateReceiverSearched.value = false
    return
  }
  debounceSearchPrivateReceiver(keyword)
})

watch(activePrivateId, () => {
  nextTick(() => {
    scrollPrivateHistoryToBottom()
  })
})

watch(
  () => privateHistory.value.map(item => item.id).join(','),
  (nextIds, prevIds) => {
    if (!nextIds) return
    const prevSet = new Set((prevIds || '').split(',').filter(Boolean))
    const added = privateHistory.value.filter(item => !prevSet.has(item.id))
    if (!added.length || privateHistoryLoadingMore.value) return
    if (!prevSet.size) {
      nextTick(() => {
        scrollPrivateHistoryToBottom()
      })
      return
    }
    if (added.length) {
      markMessageHighlighted(added.slice(-4).map(item => item.id))
      nextTick(() => {
        scrollPrivateHistoryToBottom({ smooth: true })
      })
    }
  },
)

function measureExpandedWidth() {
  const el = shell.value
  const cnt = content.value
  if (!el || !cnt) return 48
  const prev = {width: el.style.width}
  el.style.width = 'auto'
  const rect = el.getBoundingClientRect()
  el.style.width = prev.width
  return rect.width
}

function animateExpand(toExpand) {
  if (!shell.value) return
  navTl?.kill()

  const toWidth = toExpand ? measureExpandedWidth() : 48
  if (toExpand) {
    contentVisible.value = true
    expanded.value = true
  }

  navTl = gsap.timeline({
    defaults: {ease: 'power3.out'},
    onComplete: () => {
      if (!toExpand) expanded.value = false
      navTl = null
      if (toExpand) input.value?.focus()
    },
  })

  if (toExpand) {
    navTl.to(shell.value, {
      width: toWidth,
      height: 48,
      borderRadius: 9999,
      duration: 0.5,
    }, 0)
    navTl.fromTo(content.value, {opacity: 0, y: -6}, {opacity: 1, y: 0, duration: 0.35}, 0.1)
  } else {
    navTl.to(content.value, {
      opacity: 0,
      y: -6,
      duration: 0.2,
      onComplete: () => {
        contentVisible.value = false
      },
    }, 0)
    navTl.to(shell.value, {
      width: toWidth,
      height: 48,
      borderRadius: 9999,
      duration: 0.45,
    }, 0.2)
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
  const next = !expanded.value
  animateExpand(next)
  emit('toggle', next) // 修正：抛出目标状态
}

function handleSearchEnter() {
  if (activeEntryIndex.value >= 0) {
    openEntryByIndex(activeEntryIndex.value)
    return
  }
  const keyword = inputValue.value.trim()
  if (!keyword) return
  emit('search', keyword)
  if (!searchResult.value) {
    runSearch(keyword)
  }
}

const artists = computed(() => searchResult.value?.artists || [])
const songs = computed(() => searchResult.value?.songs || [])
const playlists = computed(() => searchResult.value?.playlists || [])

const artistEntries = computed(() => artists.value.map((item, index) => ({
  ...item,
  type: 'artist',
  globalIndex: index,
})))

const songEntries = computed(() => songs.value.map((item, index) => ({
  ...item,
  type: 'song',
  globalIndex: artistEntries.value.length + index,
})))

const playlistEntries = computed(() => playlists.value.map((item, index) => ({
  ...item,
  type: 'playlist',
  globalIndex: artistEntries.value.length + songEntries.value.length + index,
})))

const flatEntries = computed(() => [
  ...artistEntries.value,
  ...songEntries.value,
  ...playlistEntries.value,
])

const isSearchEmpty = computed(() => {
  if (!searchResult.value) return false
  return artists.value.length === 0 && songs.value.length === 0 && playlists.value.length === 0
})

const searchPanelVisible = computed(() => {
  if (!expanded.value || !inputValue.value.trim() || isOpen.value) return false
  return searching.value || Boolean(searchError.value) || Boolean(searchResult.value)
})

const privateReceiverDropdownVisible = computed(() => {
  if (!privateReceiverFocused.value) return false
  const keyword = privateTargetKeyword.value.trim()
  if (!keyword) return false
  return privateReceiverLoading.value || Boolean(privateReceiverError.value) || Boolean(privateReceiverResults.value.length) || privateReceiverSearched.value
})

const filteredPrivateList = computed(() => {
  const keyword = privateConversationKeyword.value.trim().toLowerCase()
  if (!keyword) return privateList.value
  return privateList.value.filter((item) => {
    const name = String(item.counterpartName || '').toLowerCase()
    const content = String(item.content || '').toLowerCase()
    return name.includes(keyword) || content.includes(keyword)
  })
})

function scrollPrivateHistoryToBottom({ smooth = false } = {}) {
  const el = privateHistoryScroller.value
  if (!el) return
  el.scrollTo({
    top: el.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto',
  })
}

function markMessageHighlighted(ids) {
  const validIds = ids.filter(Boolean)
  if (!validIds.length) return
  const nextMap = {...highlightedMessageIds.value}
  for (const id of validIds) nextMap[id] = true
  highlightedMessageIds.value = nextMap

  window.setTimeout(() => {
    const current = {...highlightedMessageIds.value}
    for (const id of validIds) delete current[id]
    highlightedMessageIds.value = current
  }, 2200)
}

function clearSearchState() {
  searchResult.value = null
  searchError.value = ''
  searching.value = false
  activeEntryIndex.value = -1
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
}

function debounceSearch(keyword) {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    runSearch(keyword)
  }, 280)
}

async function runSearch(keyword) {
  const currentId = ++searchRequestId
  searching.value = true
  searchError.value = ''
  try {
    const res = await searchApi.searchComposite(keyword, {
      limit: pageSize,
      offsets: {
        artist: searchPage.value.artist * pageSize,
        song: searchPage.value.song * pageSize,
        playlist: searchPage.value.playlist * pageSize,
      },
    })
    if (currentId !== searchRequestId) return
    searchResult.value = res || {}
    const maxIndex = flatEntries.value.length - 1
    if (maxIndex < 0) {
      activeEntryIndex.value = -1
    } else if (activeEntryIndex.value > maxIndex) {
      activeEntryIndex.value = maxIndex
    }
  } catch (error) {
    if (currentId !== searchRequestId) return
    searchResult.value = null
    searchError.value = error?.message || '搜索失败，请稍后重试'
  } finally {
    if (currentId === searchRequestId) searching.value = false
  }
}

function openArtist(artist) {
  if (!artist?.id) return
  router.push({
    path: '/artistDetial',
    query: {id: artist.id},
  })
  collapse()
}

async function openSong(song) {
  if (!song?.id) return
  const queueIndex = songEntries.value.findIndex(item => String(item.id) === String(song.id))
  if (queueIndex >= 0) {
    await playSongWithQueue(song, songEntries.value, queueIndex)
  } else {
    await playSongById(song)
  }
  collapse()
}

function openPlaylist(playlist) {
  if (!playlist?.id) return
  router.push({
    path: '/home/playlistDetail',
    query: {id: playlist.id},
  })
  collapse()
}

function openProfile() {
  router.push({ path: '/profile' })
  collapse()
}

function openMessageCenter(tab = 'notice') {
  if (!isLoggedIn.value) return
  messageTab.value = tab
  if (tab === 'notice') noticeBadgeCount.value = 0
  if (tab === 'private') privateBadgeCount.value = 0
  setMessageDialogOpen(true)
}

async function setMessageDialogOpen(value) {
  messageDialogOpen.value = value
}

function switchMessageTab(tab) {
  if (messageTab.value === tab) return
  messageTab.value = tab
  privateFeedback.value = ''
  if (!messageDialogOpen.value) return
  if (tab === 'notice') {
    fetchNotices({reset: true})
    noticeBadgeCount.value = 0
  } else {
    fetchPrivateMessages({reset: true})
    privateBadgeCount.value = 0
  }
}

async function fetchNotices({reset = false} = {}) {
  if (reset) {
    noticeLoading.value = true
    noticeLastTime.value = -1
  } else {
    noticeLoadingMore.value = true
  }
  noticeError.value = ''
  try {
    const res = await userApi.getNotices(30, noticeLastTime.value)
    const payload = res?.data || {}
    const list = normalizeNoticeList(payload)
    noticeList.value = reset ? list : mergeById(noticeList.value, list)
    noticeHasMore.value = Boolean(payload?.more)
    noticeBadgeCount.value = extractNoticeUnread(payload)
    if (list.length) {
      const nextLast = payload?.lasttime || list[list.length - 1]?.time || noticeLastTime.value
      noticeLastTime.value = Number.isFinite(Number(nextLast)) ? Number(nextLast) : noticeLastTime.value
    }
  } catch (error) {
    noticeError.value = error?.message || '通知加载失败'
    if (reset) noticeList.value = []
  } finally {
    if (reset) {
      noticeLoading.value = false
    } else {
      noticeLoadingMore.value = false
    }
  }
}

async function fetchPrivateMessages({reset = false} = {}) {
  if (reset) {
    privateLoading.value = true
    privateOffset.value = 0
  } else {
    privateLoadingMore.value = true
  }
  privateError.value = ''
  try {
    const res = await userApi.getPrivateMessages(30, privateOffset.value)
    const payload = res?.data || {}
    const list = normalizePrivateList(payload)
    privateList.value = reset ? list : mergeById(privateList.value, list)
    privateHasMore.value = Boolean(payload?.more)
    privateBadgeCount.value = extractPrivateUnread(payload)
    privateOffset.value += 30

    if (reset) {
      const targetId = selectedPrivateTarget.value?.userId
      const matched = targetId
        ? privateList.value.find(item => Number(item.counterpartId) === Number(targetId))
        : privateList.value[0]
      if (matched) {
        openPrivateConversation(matched)
      } else {
        privateHistory.value = []
        privateHistoryError.value = ''
        activePrivateId.value = ''
      }
    }
  } catch (error) {
    privateError.value = error?.message || '私信加载失败'
    if (reset) privateList.value = []
  } finally {
    if (reset) {
      privateLoading.value = false
    } else {
      privateLoadingMore.value = false
    }
  }
}

function loadMoreNotices() {
  if (!noticeHasMore.value || noticeLoadingMore.value) return
  fetchNotices({reset: false})
}

function loadMorePrivateMessages() {
  if (!privateHasMore.value || privateLoadingMore.value) return
  fetchPrivateMessages({reset: false})
}

async function refreshMessageBadges() {
  try {
    const [noticeRes, privateRes] = await Promise.all([
      userApi.getNotices(10, -1),
      userApi.getPrivateMessages(10, 0),
    ])
    noticeBadgeCount.value = extractNoticeUnread(noticeRes?.data || {})
    privateBadgeCount.value = extractPrivateUnread(privateRes?.data || {})
  } catch (error) {
    console.warn('消息未读数刷新失败', error)
  }
}

function normalizeNoticeList(payload) {
  const raw = payload?.notices || payload?.data?.notices || payload?.msgs || []
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    const parsed = parseNoticePayload(item)
    return {
      id: item?.id || item?.noticeId || `${item?.time || Date.now()}-${index}`,
      senderName: item?.user?.nickname || parsed?.senderName || '系统通知',
      avatarUrl: item?.user?.avatarUrl || parsed?.avatarUrl || '',
      title: parsed?.title || item?.typeTitle || item?.noticeType || '系统通知',
      content: parsed?.content || '你有一条新的通知',
      time: item?.time || item?.lastTime || item?.createTime || 0,
      webUrl: parsed?.webUrl || item?.webUrl || '',
      unreadCount: Number(item?.newMsgCount || 0),
    }
  })
}

function parseNoticePayload(item) {
  const source = item?.notice || item?.json || item?.content
  if (!source) return null
  let payload = source
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch {
      payload = {msg: source}
    }
  }

  const generalMsg = payload?.generalMsg || payload?.generalNotice || payload?.promotionUrl || {}
  const sender = payload?.user || {}
  return {
    senderName: sender?.nickname || payload?.fromNickName || '',
    avatarUrl: sender?.avatarUrl || '',
    title: generalMsg?.title || generalMsg?.noticeMsg || payload?.title || payload?.actionDesc || '',
    content:
      payload?.msg
      || payload?.pushMsg
      || generalMsg?.inboxBriefContent
      || generalMsg?.content
      || generalMsg?.noticeMsg
      || generalMsg?.actionDesc
      || '',
    webUrl: payload?.pushUrl || generalMsg?.webUrl || payload?.webUrl || '',
  }
}

function parsePrivateMessageBody(rawText) {
  if (!rawText) return ''
  if (typeof rawText === 'object') {
    return rawText?.msg || rawText?.text || rawText?.message || JSON.stringify(rawText)
  }
  const text = String(rawText)
  try {
    const parsed = JSON.parse(text)
    return parsed?.msg || parsed?.text || parsed?.message || text
  } catch {
    return text
  }
}

function extractPrivateUnread(payload) {
  if (Number.isFinite(Number(payload?.newMsgCount))) return Number(payload.newMsgCount)
  const raw = payload?.msgs || payload?.data?.msgs || []
  if (!Array.isArray(raw)) return 0
  return raw.reduce((sum, item) => sum + Number(item?.newMsgCount || 0), 0)
}

function extractNoticeUnread(payload) {
  if (Number.isFinite(Number(payload?.newNoticeCount))) return Number(payload.newNoticeCount)
  const raw = payload?.notices || payload?.data?.notices || []
  if (!Array.isArray(raw)) return 0
  return raw.reduce((sum, item) => sum + Number(item?.newMsgCount || 0), 0)
}

function mergeById(oldList, newList) {
  const map = new Map()
  for (const item of oldList) map.set(item.id, item)
  for (const item of newList) map.set(item.id, item)
  return Array.from(map.values()).sort((a, b) => Number(b.time || 0) - Number(a.time || 0))
}

function mergeByIdAsc(oldList, newList) {
  const map = new Map()
  for (const item of oldList) map.set(item.id, item)
  for (const item of newList) map.set(item.id, item)
  return Array.from(map.values()).sort((a, b) => Number(a.time || 0) - Number(b.time || 0))
}

function normalizeUserTarget(user) {
  if (!user) return null
  return {
    userId: Number(user.userId || user.id || 0),
    nickname: user.nickname || user.userName || '',
    avatarUrl: user.avatarUrl || user.avatar || '',
  }
}

function normalizeUserSearchResult(item) {
  return {
    userId: Number(item?.userId || 0),
    nickname: item?.nickname || '',
    avatarUrl: item?.avatarUrl || '',
  }
}

function debounceSearchPrivateReceiver(keyword) {
  if (privateReceiverSearchTimer) clearTimeout(privateReceiverSearchTimer)
  privateReceiverSearchTimer = setTimeout(() => {
    searchPrivateReceiver(keyword)
  }, 260)
}

async function searchPrivateReceiver(keyword) {
  const currentId = ++privateReceiverSearchRequestId
  privateReceiverLoading.value = true
  privateReceiverError.value = ''
  privateReceiverSearched.value = false
  try {
    const result = await searchApi.searchUsers(keyword, {limit: 8, offset: 0})
    if (currentId !== privateReceiverSearchRequestId) return
    privateReceiverResults.value = (result?.users || [])
      .map(normalizeUserSearchResult)
      .filter(item => item.userId)
  } catch (error) {
    if (currentId !== privateReceiverSearchRequestId) return
    privateReceiverResults.value = []
    privateReceiverError.value = error?.message || '搜索用户失败'
  } finally {
    if (currentId === privateReceiverSearchRequestId) {
      privateReceiverLoading.value = false
      privateReceiverSearched.value = true
    }
  }
}

function normalizePrivateList(payload) {
  const raw = payload?.msgs || payload?.data?.msgs || payload?.messages || []
  if (!Array.isArray(raw)) return []
  const currentUserId = Number(userStore.userId) || null
  return raw.map((item, index) => {
    const fromUser = item?.fromUser || {}
    const toUser = item?.toUser || {}
    const fromId = Number(item?.fromUserId ?? fromUser?.userId) || null
    const toId = Number(item?.toUserId ?? toUser?.userId) || null
    const isSelfSender = currentUserId && fromId === currentUserId
    const counterpartId = isSelfSender ? toId : fromId
    const counterpartName = isSelfSender
      ? (toUser?.nickname || item?.toNickName || `用户 ${toId || '-'}`)
      : (fromUser?.nickname || item?.fromNickName || `用户 ${fromId || '-'}`)

    return {
      id: item?.id || `${item?.time || Date.now()}-${index}`,
      content: parsePrivateMessageBody(item?.lastMsg || item?.msg || item?.message || ''),
      time: item?.time || item?.lastTime || item?.createTime || 0,
      counterpartId: counterpartId ? String(counterpartId) : '',
      counterpartName,
      avatarUrl: isSelfSender
        ? (toUser?.avatarUrl || item?.toUserAvatar || '')
        : (fromUser?.avatarUrl || item?.fromUserAvatar || ''),
      unreadCount: Number(item?.newMsgCount || 0),
    }
  })
}

function normalizePrivateHistoryList(payload) {
  const raw = payload?.msgs || payload?.data?.msgs || []
  if (!Array.isArray(raw)) return []
  const currentUserId = Number(userStore.userId) || null
  return raw.map((item, index) => {
    const fromUser = item?.fromUser || {}
    const toUser = item?.toUser || {}
    const fromId = Number(item?.fromUserId ?? fromUser?.userId) || null
    const toId = Number(item?.toUserId ?? toUser?.userId) || null
    const isSelf = currentUserId && fromId === currentUserId
    return {
      id: item?.id || `${item?.time || Date.now()}-${index}`,
      content: parsePrivateMessageBody(item?.msg || item?.message || item?.lastMsg || ''),
      time: Number(item?.time || item?.lastTime || item?.createTime || 0),
      isSelf: Boolean(isSelf),
      fromId,
      toId,
    }
  }).sort((a, b) => a.time - b.time)
}

function openPrivateConversation(item) {
  if (!item?.counterpartId) return
  activePrivateId.value = String(item.counterpartId)
  selectPrivateTarget({
    userId: item.counterpartId,
    nickname: item.counterpartName,
    avatarUrl: item.avatarUrl,
  })
}

async function fetchPrivateHistory(targetId, {reset = false} = {}) {
  if (!targetId) return
  const currentId = ++privateHistoryRequestId

  if (reset) {
    privateHistoryLoading.value = true
    privateHistoryError.value = ''
    privateHistory.value = []
    privateHistoryBefore.value = 0
  } else {
    privateHistoryLoadingMore.value = true
  }

  try {
    const res = await userApi.getPrivateHistory(targetId, 30, privateHistoryBefore.value)
    if (currentId !== privateHistoryRequestId) return
    const payload = res?.data || {}
    const list = normalizePrivateHistoryList(payload)
    privateHistoryHasMore.value = Boolean(payload?.more)
    privateHistory.value = reset ? list : mergeByIdAsc(privateHistory.value, list)
    if (privateHistory.value.length) {
      privateHistoryBefore.value = Number(privateHistory.value[0].time || privateHistoryBefore.value)
    }
  } catch (error) {
    if (currentId !== privateHistoryRequestId) return
    if (reset && itemFromConversationList(targetId)) {
      const preview = itemFromConversationList(targetId)
      privateHistory.value = [{
        id: `${preview.id}-preview`,
        content: preview.content,
        time: Number(preview.time || Date.now()),
        isSelf: false,
      }]
      privateHistoryHasMore.value = false
    }
    privateHistoryError.value = error?.message || '会话加载失败'
  } finally {
    if (currentId !== privateHistoryRequestId) return
    if (reset) {
      privateHistoryLoading.value = false
    } else {
      privateHistoryLoadingMore.value = false
    }
  }
}

function itemFromConversationList(targetId) {
  return privateList.value.find(item => String(item.counterpartId) === String(targetId)) || null
}

function loadMorePrivateHistory() {
  if (!privateHistoryHasMore.value || privateHistoryLoadingMore.value) return
  const targetId = selectedPrivateTarget.value?.userId
  if (!targetId) return
  fetchPrivateHistory(String(targetId), {reset: false})
}

function selectPrivateTarget(user) {
  const target = normalizeUserTarget(user)
  if (!target?.userId) return
  selectedPrivateTarget.value = target
  activePrivateId.value = String(target.userId)
  privateTargetKeyword.value = target.nickname || String(target.userId)
  privateReceiverResults.value = []
  privateReceiverFocused.value = false
  privateReceiverSearched.value = false
  fetchPrivateHistory(String(target.userId), {reset: true})
}

function handlePrivateReceiverBlur() {
  setTimeout(() => {
    privateReceiverFocused.value = false
  }, 120)
}

async function submitPrivateMessage() {
  privateFeedback.value = ''
  privateFeedbackIsError.value = false

  const target = selectedPrivateTarget.value?.userId
  const content = privateContent.value.trim()
  if (!target || !Number.isFinite(Number(target))) {
    privateFeedback.value = '请先搜索并选择接收方'
    privateFeedbackIsError.value = true
    return
  }
  if (!content) {
    privateFeedback.value = '私信内容不能为空'
    privateFeedbackIsError.value = true
    return
  }

  sendingPrivate.value = true
  try {
    const res = await userApi.sendPrivateMessage(String(target), content)
    const code = res?.data?.code
    if (code && code !== 200) {
      throw new Error(res?.data?.message || `发送失败，错误码 ${code}`)
    }
    privateFeedback.value = '发送成功'
    privateHistory.value = mergeByIdAsc(privateHistory.value, [{
      id: `local-${Date.now()}`,
      content,
      time: Date.now(),
      isSelf: true,
    }])
    privateContent.value = ''
    await fetchPrivateMessages({reset: true})
    await fetchPrivateHistory(String(target), {reset: true})
    privateBadgeCount.value = 0
  } catch (error) {
    privateFeedback.value = error?.message || '发送失败，请稍后重试'
    privateFeedbackIsError.value = true
  } finally {
    sendingPrivate.value = false
  }
}

function formatTime(value) {
  const ts = Number(value)
  if (!Number.isFinite(ts) || ts <= 0) return '-'
  const date = new Date(ts)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function getSongArtists(song) {
  return song?.ar || song?.artists || []
}

function isActiveEntry(index) {
  return index === activeEntryIndex.value
}

function moveSelection(direction) {
  if (!searchPanelVisible.value || !flatEntries.value.length) return
  if (activeEntryIndex.value < 0) {
    activeEntryIndex.value = direction > 0 ? 0 : flatEntries.value.length - 1
    return
  }
  const len = flatEntries.value.length
  activeEntryIndex.value = (activeEntryIndex.value + direction + len) % len
}

function openEntryByIndex(index) {
  const entry = flatEntries.value[index]
  if (!entry) return
  if (entry.type === 'artist') openArtist(entry)
  if (entry.type === 'song') openSong(entry)
  if (entry.type === 'playlist') openPlaylist(entry)
}

function getTotalCount(type) {
  return searchResult.value?.counts?.[type] || 0
}

function canPrev(type) {
  return (searchPage.value[type] || 0) > 0
}

function canNext(type) {
  const page = searchPage.value[type] || 0
  return (page + 1) * pageSize < getTotalCount(type)
}

function getPageLabel(type) {
  const totalCount = getTotalCount(type)
  const totalPage = Math.max(1, Math.ceil(totalCount / pageSize))
  const page = (searchPage.value[type] || 0) + 1
  return `${page}/${totalPage}`
}

function getItemStaggerStyle(globalIndex) {
  const capped = Math.min(Math.max(globalIndex, 0), 18)
  return {
    '--stagger-delay': `${capped * 28}ms`,
  }
}

function getGroupTitleStyle(groupIndex) {
  const base = Math.min(Math.max(groupIndex, 0), 4)
  return {
    '--group-delay': `${base * 80}ms`,
  }
}

function changePage(type, delta) {
  const keyword = inputValue.value.trim()
  if (!keyword) return
  const nextPage = (searchPage.value[type] || 0) + delta
  if (nextPage < 0) return
  if (delta > 0 && !canNext(type)) return
  searchPage.value = {
    ...searchPage.value,
    [type]: nextPage,
  }
  activeEntryIndex.value = -1
  runSearch(keyword)
}

function onScroll() {
  scheduleContrastUpdate()
  if (!props.autoExpandOnScroll) return
  const y = window.scrollY || document.documentElement.scrollTop
  const nearTop = y <= props.scrollThreshold
  if (!nearTop && !expanded.value) {
    autoExpandByScroll = true
    expand()
  } else if (nearTop && expanded.value && autoExpandByScroll && !hovering.value) {
    collapse()
    autoExpandByScroll = false
  }
}

function parseColorValue(colorString) {
  const text = String(colorString || '').trim()
  if (!text || text === 'transparent') return null

  const rgbMatch = text.match(/^rgba?\(([^)]+)\)$/i)
  if (rgbMatch) {
    const raw = rgbMatch[1].split(',').map(item => Number(item.trim()))
    if (raw.length < 3) return null
    const [r, g, b, a = 1] = raw
    if (![r, g, b].every(Number.isFinite) || !Number.isFinite(a)) return null
    return {r, g, b, a}
  }

  const hex = text.replace('#', '')
  if (hex.length === 3 || hex.length === 4) {
    const r = Number.parseInt(hex[0] + hex[0], 16)
    const g = Number.parseInt(hex[1] + hex[1], 16)
    const b = Number.parseInt(hex[2] + hex[2], 16)
    const a = hex.length === 4 ? Number.parseInt(hex[3] + hex[3], 16) / 255 : 1
    return {r, g, b, a}
  }
  if (hex.length === 6 || hex.length === 8) {
    const r = Number.parseInt(hex.slice(0, 2), 16)
    const g = Number.parseInt(hex.slice(2, 4), 16)
    const b = Number.parseInt(hex.slice(4, 6), 16)
    const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1
    return {r, g, b, a}
  }

  return null
}

function estimateLuminance({r, g, b}) {
  const rr = Number(r) / 255
  const gg = Number(g) / 255
  const bb = Number(b) / 255
  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb
}

function pickBackdropElement() {
  if (!shell.value) return null
  const rect = shell.value.getBoundingClientRect()
  const x = Math.round(rect.left + rect.width * 0.5)
  const y = Math.round(rect.top + rect.height * 0.5)
  const stack = document.elementsFromPoint(x, y)
  return stack.find(el => el !== shell.value && !shell.value.contains(el)) || null
}

function detectBackdropLuminance() {
  let el = pickBackdropElement()
  while (el && el !== document.documentElement) {
    const parsed = parseColorValue(getComputedStyle(el).backgroundColor)
    if (parsed && parsed.a > 0.06) {
      return estimateLuminance(parsed)
    }
    el = el.parentElement
  }

  const bodyColor = parseColorValue(getComputedStyle(document.body).backgroundColor)
  if (bodyColor) return estimateLuminance(bodyColor)
  return 0.94
}

function updateFabContrast() {
  const luminance = detectBackdropLuminance()
  fabContrastMode.value = luminance > 0.74 ? 'on-light' : 'on-dark'
}

function scheduleContrastUpdate() {
  if (contrastRaf) return
  contrastRaf = requestAnimationFrame(() => {
    contrastRaf = 0
    updateFabContrast()
  })
}

defineExpose({expand, collapse, toggle, focus: () => input.value?.focus()})

onMounted(async () => {
  await nextTick()
  if (shell.value) gsap.set(shell.value, {width: 48, height: 48, borderRadius: 9999})
  updateFabContrast()
  window.addEventListener('scroll', onScroll, {passive: true})
  window.addEventListener('resize', scheduleContrastUpdate)
})

onBeforeUnmount(() => {
  navTl?.kill()
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', scheduleContrastUpdate)
  if (contrastRaf) {
    cancelAnimationFrame(contrastRaf)
    contrastRaf = 0
  }
  stopQrPolling()
  clearSearchState()
  if (privateReceiverSearchTimer) {
    clearTimeout(privateReceiverSearchTimer)
    privateReceiverSearchTimer = null
  }
})

watch(isOpen, (open) => {
  if (open) {
    startQrLogin()
  } else {
    stopQrPolling()
    resetQrState()
  }
})

const qrStatusText = computed(() => {
  switch (qrState.value) {
    case 'loading':
      return '正在生成二维码，请稍候...'
    case 'wait':
      return '打开网易云音乐 App 扫码登录'
    case 'confirm':
      return '已扫码，请在手机端确认授权'
    case 'success':
      return '登录成功，正在同步资料...'
    case 'expired':
      return '二维码已过期，请重新获取'
    case 'error':
      return '二维码生成失败，请稍后重试'
    default:
      return '扫码登录更安全快捷'
  }
})

function openLoginDialog() {
  setIsOpen(true)
}

async function setIsOpen(value) {
  if (value) {
    if (isOpen.value) return
    isOpen.value = true
    await nextTick()
    animateDialogIn()
    return
  }
  if (!isOpen.value) return
  await animateDialogOut()
  isOpen.value = false
}

function resetQrState() {
  qrKey.value = ''
  qrImage.value = ''
  qrState.value = 'idle'
  qrError.value = ''
  useNoCookie.value = false
  confirmProfile.value = null
}

async function startQrLogin() {
  resetQrState()
  qrState.value = 'loading'
  try {
    const keyRes = await userApi.getQrKey()
    const key = keyRes?.data?.data?.unikey
    if (!key) throw new Error('未获取到二维码 key')
    qrKey.value = key

    const qrRes = await userApi.getQrCode(key)
    const qrImg = qrRes?.data?.data?.qrimg
    if (!qrImg) throw new Error('未获取到二维码图片')
    qrImage.value = qrImg
    qrState.value = 'wait'
    startQrPolling()
  } catch (error) {
    qrState.value = 'error'
    qrError.value = error?.message || '二维码生成失败'
  }
}

function startQrPolling() {
  stopQrPolling()
  fetchQrStatus()
  pollingTimer.value = window.setInterval(fetchQrStatus, 2000)
}

function stopQrPolling() {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

async function fetchQrStatus() {
  if (!qrKey.value) return
  try {
    const res = await userApi.checkQrCode(qrKey.value, {noCookie: useNoCookie.value})
    const code = res?.data?.code
    const qrData = res?.data || {}
    switch (code) {
      case 800:
        qrState.value = 'expired'
        stopQrPolling()
        break
      case 801:
        qrState.value = 'wait'
        break
      case 802:
        qrState.value = 'confirm'
        confirmProfile.value = {
          avatarUrl: qrData.avatarUrl || '',
          nickname: qrData.nickname || '',
        }
        break
      case 803:
        await handleLoginSuccess(res?.data)
        break
      case 502:
        useNoCookie.value = true
        break
      default:
        if (code && code !== 200) {
          qrState.value = 'error'
          qrError.value = res?.data?.message || `登录失败，错误码：${code}`
          stopQrPolling()
        }
    }
  } catch (error) {
    qrState.value = 'error'
    qrError.value = error?.message || '二维码状态获取失败'
    stopQrPolling()
  }
}

async function handleLoginSuccess(payload) {
  qrState.value = 'success'
  stopQrPolling()
  const cookie = payload?.cookie || payload?.data?.cookie
  if (cookie) {
    userStore.setLogin(cookie)
    try {
      const infoRes = await userApi.getUserInfo()
      const profile = buildProfile(infoRes?.data)
      userStore.setProfile(profile)
      emit('signin', profile)
    } catch (error) {
      console.error('获取用户信息失败', error)
      if (confirmProfile.value) {
        userStore.setProfile({
          userId: null,
          nickname: confirmProfile.value.nickname || '',
          avatarUrl: confirmProfile.value.avatarUrl || '',
        })
      }
    }
  }
  setTimeout(() => setIsOpen(false), 800)
}

function refreshQr() {
  if (qrState.value === 'loading') return
  startQrLogin()
}

async function logout() {
  try {
    await userApi.logout()
  } catch (error) {
    console.warn('退出登录接口调用失败，已执行本地退出', error)
  } finally {
    userStore.logout()
  }
}

function buildProfile(data) {
  const profileSource = data?.profile || data || {}
  return {
    userId: profileSource.userId ?? profileSource.id ?? null,
    nickname: profileSource.nickname ?? profileSource.userName ?? confirmProfile.value?.nickname ?? '',
    avatarUrl: profileSource.avatarUrl ?? confirmProfile.value?.avatarUrl ?? '',
  }
}

/** 进场动画：固定 transformOrigin，轻微缩放+模糊 */
function animateDialogIn() {
  const overlay = dialogOverlay.value
  const panel = dialogPanel.value
  if (!overlay && !panel) return
  gsap.killTweensOf([overlay, panel])

  const tl = gsap.timeline({defaults: {ease: 'power3.out'}})

  if (overlay) {
    gsap.set(overlay, {opacity: 0})
    tl.to(overlay, {opacity: 1, duration: 0.22}, 0)
  }

  if (panel) {
    gsap.set(panel, {opacity: 0, scale: 0.98, filter: 'blur(8px)', transformOrigin: '50% 20%'})
    tl.to(panel, {opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.28}, 0.02)
  }
}

/** 退场动画：不做 y 位移；关闭期间禁用 hover 放大 */
function animateDialogOut() {
  const overlay = dialogOverlay.value
  const panel = dialogPanel.value
  if (!overlay && !panel) return Promise.resolve()

  isClosing.value = true

  return new Promise((resolve) => {
    gsap.killTweensOf([overlay, panel])

    const tl = gsap.timeline({
      defaults: {ease: 'power2.in', duration: 0.18},
      onComplete: () => {
        isClosing.value = false
        gsap.set([overlay, panel], {clearProps: 'all'})
        resolve()
      },
    })

    if (panel) {
      tl.to(panel, {opacity: 0, scale: 0.98, filter: 'blur(8px)', transformOrigin: '50% 20%'}, 0)
    }
    if (overlay) tl.to(overlay, {opacity: 0}, 0)
  })
}
</script>

<style scoped>
/* 抗抖动：在部分浏览器减少亚像素抖动 */
button, svg {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
}

/* 关闭动画期间，锁定按钮 hover，避免与父级缩放叠加造成“弹回”视觉 */
.no-hover:hover {
  transform: none !important;
}

/* 稳定绘制，减少合成抖动（给 DialogPanel 一个静态类以便 scoped 匹配） */
.panel-anim {
  will-change: transform, opacity, filter;
}

.search-panel-enter-active,
.search-panel-leave-active {
  transition: opacity 220ms ease, transform 220ms ease, filter 220ms ease;
}

.search-panel-enter-from,
.search-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
  filter: blur(8px);
}

.search-item-enter-active {
  transition: opacity 280ms ease, transform 280ms ease, filter 280ms ease;
  transition-delay: var(--stagger-delay, 0ms);
}

.search-item-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.search-item-enter-from,
.search-item-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.985);
  filter: blur(6px);
}

.search-item-move {
  transition: transform 220ms ease;
}

.search-group-title {
  animation: searchGroupTitleIn 320ms ease both;
  animation-delay: var(--group-delay, 0ms);
}

.chat-panel {
  background-image:
    radial-gradient(circle at 18% 0%, rgba(245, 158, 11, 0.12), transparent 42%),
    radial-gradient(circle at 85% 15%, rgba(251, 191, 36, 0.10), transparent 40%);
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

@keyframes searchGroupTitleIn {
  from {
    opacity: 0;
    transform: translateY(4px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}
</style>
