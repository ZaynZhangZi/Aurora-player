<template>
  <div
    ref="playerRootRef"
    class="player-root fixed inset-x-0 z-[1210]"
    role="region"
    aria-label="全局播放器"
  >
    <div
      ref="playerShellRef"
      :inert="amllOpened ? '' : null"
      :aria-hidden="amllOpened ? 'true' : null"
      class="player-shell"
      :class="{ 'player-shell-idle': !isPlaying, 'player-shell-crossfading': crossfadeVisualActive }"
      :style="playerStyle"
    >
      <div class="player-desktop-layout hidden lg:grid">
        <div class="player-desktop-track">
          <Transition :name="trackSwapTransitionName" mode="out-in">
            <div :key="songTransitionKey" class="flex min-w-0 flex-1 items-center gap-3">
              <button
                ref="desktopCoverRef"
                data-player-transition-cover
                class="player-cover-button h-[52px] w-[52px] overflow-hidden rounded-xl bg-white/20"
                type="button"
                :disabled="!hasSong"
                aria-label="打开歌词页"
                @click="openLyricPage"
              >
                <div class="cover-stack">
                  <video
                    v-if="dynamicCoverUrl && dynamicCoverIsVideo"
                    :src="dynamicCoverUrl"
                    class="cover-media"
                    autoplay
                    muted
                    loop
                    playsinline
                    preload="metadata"
                  />
                  <img
                    v-else-if="dynamicCoverUrl"
                    :src="dynamicCoverUrl"
                    alt="dynamic-cover"
                    class="cover-media"
                  >
                  <img
                    v-else-if="coverUrl"
                    :src="coverUrl"
                    alt="cover"
                    class="cover-media"
                  >
                  <div
                    v-if="crossfadeCoverUrl"
                    class="cover-crossfade-layer"
                    :style="{ opacity: crossfadeCoverProgress }"
                  >
                    <video
                      v-if="crossfadeCoverIsVideo"
                      :src="crossfadeCoverUrl"
                      class="cover-media"
                      autoplay
                      muted
                      loop
                      playsinline
                      preload="metadata"
                    />
                    <img
                      v-else
                      :src="crossfadeCoverUrl"
                      alt="next-cover"
                      class="cover-media"
                    >
                  </div>
                </div>
              </button>
              <div class="player-track-copy min-w-0 flex-1">
                <p
                  class="player-track-title player-text-primary truncate text-sm font-semibold"
                  :title="songName || '未在播放'"
                >
                  {{ songName || '未在播放' }}
                </p>
                <div
                  v-if="shouldScrollArtists"
                  class="artist-marquee player-text-muted mt-0.5 text-xs"
                >
                  <div class="artist-marquee-track">
                    <div class="artist-marquee-segment">
                      <template
                        v-for="(artist, index) in normalizedArtistList"
                        :key="`desktop-marquee-a-${artist.id || artist.name}-${index}`"
                      >
                        <button
                          class="artist-marquee-link"
                          type="button"
                          @click.stop="openArtistFromPlayer(artist)"
                        >
                          {{ artist.name }}
                        </button>
                        <span
                          v-if="index < normalizedArtistList.length - 1"
                          class="player-separator"
                        >
             /
            </span>
                      </template>
                    </div>
                    <div class="artist-marquee-segment" aria-hidden="true">
                      <template
                        v-for="(artist, index) in normalizedArtistList"
                        :key="`desktop-marquee-b-${artist.id || artist.name}-${index}`"
                      >
                        <span>{{ artist.name }}</span>
                        <span
                          v-if="index < normalizedArtistList.length - 1"
                          class="player-separator"
                        >
             /
            </span>
                      </template>
                    </div>
                  </div>
                </div>
                <ArtistLinks
                  v-else
                  :artists="artistList"
                  :container-class="artistLinksContainerClass"
                  :link-class="artistLinksClass"
                  :separator-class="artistSeparatorClass"
                  :fallback-class="artistLinksContainerClass"
                />
              </div>
            </div>
          </Transition>
        </div>

        <div class="player-desktop-transport">
          <button
            class="player-soft-btn grid h-8 w-8 place-items-center rounded-full transition disabled:opacity-50"
            type="button"
            :disabled="!canPlayPrev"
            aria-label="播放上一首"
            @click="playPrevSong"
          >
            <BackwardIcon class="h-3.5 w-3.5"/>
          </button>
          <button
            class="player-main-btn grid h-11 w-11 place-items-center rounded-full transition disabled:opacity-40"
            type="button"
            :disabled="!hasSong"
            :aria-label="isPlaying ? '暂停播放' : '开始播放'"
            @click="togglePlay"
          >
            <PauseIcon v-if="isPlaying" class="h-5 w-5"/>
            <PlayIcon v-else class="h-5 w-5"/>
          </button>
          <button
            class="player-soft-btn grid h-8 w-8 place-items-center rounded-full transition disabled:opacity-50"
            type="button"
            :disabled="!canPlayNext"
            aria-label="播放下一首"
            @click="playNextSong"
          >
            <ForwardIcon class="h-3.5 w-3.5"/>
          </button>
        </div>

        <div class="player-desktop-timeline player-text-muted">
          <span class="player-time text-right">{{ formatMs(currentTimeMs) }}</span>
          <input
            class="player-range flex-1 cursor-pointer appearance-none rounded-full"
            type="range"
            min="0"
            :max="Math.max(durationMs, 1)"
            :value="Math.min(currentTimeMs, durationMs || 0)"
            :style="timelineRangeStyle"
            aria-label="播放进度"
            @input="seekByInput"
          >
          <span class="player-time">{{ formatMs(durationMs) }}</span>
        </div>

        <div class="player-desktop-volume">
          <div class="player-side-menu">
            <button
              ref="moreMenuButtonRef"
              class="player-chip-btn grid h-8 w-8 place-items-center rounded-full text-[11px] transition"
              type="button"
              aria-label="显示更多播放设置"
              @click="toggleMorePanel"
            >
              <EllipsisHorizontalIcon class="h-4 w-4"/>
            </button>
          </div>
          <SpeakerWaveIcon class="player-volume-icon player-text-muted h-4 w-4"/>
          <input
            class="player-range w-24 cursor-pointer appearance-none rounded-full"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="volume"
            :style="volumeRangeStyle"
            aria-label="播放音量"
            @input="changeVolume"
          >
        </div>
      </div>

      <div
        class="grid min-h-[82px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-1.5 sm:px-3 lg:hidden"
      >
        <Transition :name="trackSwapTransitionName" mode="out-in">
          <div :key="songTransitionKey" class="flex min-w-0 items-center gap-2.5">
            <button
              ref="mobileCoverRef"
              data-player-transition-cover
              class="h-10 w-10 overflow-hidden rounded-lg bg-white/20"
              type="button"
              :disabled="!hasSong"
              aria-label="打开歌词页"
              @click="openLyricPage"
            >
              <div class="cover-stack">
                <video
                  v-if="dynamicCoverUrl && dynamicCoverIsVideo"
                  :src="dynamicCoverUrl"
                  class="cover-media"
                  autoplay
                  muted
                  loop
                  playsinline
                  preload="metadata"
                />
                <img
                  v-else-if="dynamicCoverUrl"
                  :src="dynamicCoverUrl"
                  alt="dynamic-cover"
                  class="cover-media"
                >
                <img
                  v-else-if="coverUrl"
                  :src="coverUrl"
                  alt="cover"
                  class="cover-media"
                >
                <div
                  v-if="crossfadeCoverUrl"
                  class="cover-crossfade-layer"
                  :style="{ opacity: crossfadeCoverProgress }"
                >
                  <video
                    v-if="crossfadeCoverIsVideo"
                    :src="crossfadeCoverUrl"
                    class="cover-media"
                    autoplay
                    muted
                    loop
                    playsinline
                    preload="metadata"
                  />
                  <img
                    v-else
                    :src="crossfadeCoverUrl"
                    alt="next-cover"
                    class="cover-media"
                  >
                </div>
              </div>
            </button>
            <div class="min-w-0 flex-1 overflow-hidden">
              <p
                class="player-text-primary truncate text-sm font-semibold"
                :title="songName || '未在播放'"
              >
                {{ songName || '未在播放' }}
              </p>
              <div
                v-if="shouldScrollArtists"
                class="artist-marquee player-text-muted mt-0.5 text-xs"
              >
                <div class="artist-marquee-track">
                  <div class="artist-marquee-segment">
                    <template
                      v-for="(artist, index) in normalizedArtistList"
                      :key="`mobile-marquee-a-${artist.id || artist.name}-${index}`"
                    >
                      <button
                        class="artist-marquee-link"
                        type="button"
                        @click.stop="openArtistFromPlayer(artist)"
                      >
                        {{ artist.name }}
                      </button>
                      <span
                        v-if="index < normalizedArtistList.length - 1"
                        class="player-separator"
                      >
             /
            </span>
                    </template>
                  </div>
                  <div class="artist-marquee-segment" aria-hidden="true">
                    <template
                      v-for="(artist, index) in normalizedArtistList"
                      :key="`mobile-marquee-b-${artist.id || artist.name}-${index}`"
                    >
                      <span>{{ artist.name }}</span>
                      <span
                        v-if="index < normalizedArtistList.length - 1"
                        class="player-separator"
                      >
             /
            </span>
                    </template>
                  </div>
                </div>
              </div>
              <ArtistLinks
                v-else
                :artists="artistList"
                :container-class="artistLinksContainerClass"
                :link-class="artistLinksClass"
                :separator-class="artistSeparatorClass"
                :fallback-class="artistLinksContainerClass"
              />
            </div>

            <div class="ml-1 flex shrink-0 items-center gap-1">
              <button
                class="player-soft-btn hidden h-7 w-7 place-items-center rounded-full disabled:opacity-50 sm:grid"
                type="button"
                :disabled="!canPlayPrev"
                aria-label="播放上一首"
                @click="playPrevSong"
              >
                <BackwardIcon class="h-3.5 w-3.5"/>
              </button>
              <button
                class="player-main-btn grid h-8 w-8 place-items-center rounded-full"
                type="button"
                :disabled="!hasSong"
                :aria-label="isPlaying ? '暂停播放' : '开始播放'"
                @click="togglePlay"
              >
                <PauseIcon v-if="isPlaying" class="h-4 w-4"/>
                <PlayIcon v-else class="h-4 w-4"/>
              </button>
              <button
                class="player-soft-btn hidden h-7 w-7 place-items-center rounded-full disabled:opacity-50 sm:grid"
                type="button"
                :disabled="!canPlayNext"
                aria-label="播放下一首"
                @click="playNextSong"
              >
                <ForwardIcon class="h-3.5 w-3.5"/>
              </button>
            </div>
          </div>
        </Transition>

        <div class="player-mobile-options flex max-w-[46vw] flex-wrap items-center justify-end gap-1 sm:gap-1.5">
          <button
            class="player-chip-btn rounded-full px-2 py-1 text-[10px]"
            type="button"
            :title="automixLabel"
            @click="toggleAutomix"
          >
            {{ automixMobileLabel }}
          </button>
          <button
            class="player-chip-btn rounded-full px-2 py-1 text-[10px]"
            type="button"
            :title="lyricTranslateLabel"
            @click="toggleLyricTranslate"
          >
            {{ lyricTranslateMobileLabel }}
          </button>
          <button
            class="player-chip-btn hidden rounded-full px-2 py-1 text-[10px] sm:inline-flex"
            type="button"
            @click="cyclePlayMode"
          >
            {{ playModeLabel }}
          </button>
          <input
            class="player-range hidden h-1.5 w-14 cursor-pointer appearance-none rounded-full sm:block"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="volume"
            :style="volumeRangeStyle"
            aria-label="播放音量"
            @input="changeVolume"
          >
        </div>

        <div class="player-text-muted col-span-2 flex items-center gap-2 px-0.5 text-[11px]">
          <span class="w-9 text-right">{{ formatMs(currentTimeMs) }}</span>
          <input
            class="player-range h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
            type="range"
            min="0"
            :max="Math.max(durationMs, 1)"
            :value="Math.min(currentTimeMs, durationMs || 0)"
            :style="timelineRangeStyle"
            aria-label="播放进度"
            @input="seekByInput"
          >
          <span class="w-9">{{ formatMs(durationMs) }}</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="amllMounted"
        ref="amllHostRef"
        data-player-amll-host
      >
        <AMLLWrapper
          :opened="amllOpened"
          @update:opened="onAmllOpenedChange"
          v-model:current-time="amllCurrentTimeMs"
          v-model:hide-lyric-view="amllHideLyricView"
          v-model:volume="amllVolume"
          :music-name="songName"
          :music-artists="amllArtists"
          :music-album="amllAlbum"
          :cover="amllCoverUrl"
          :cover-is-video="amllCoverIsVideo"
          :lyric-lines="amllLyricLines"
          :duration="durationMs"
          :playing="isPlaying"
          :low-freq-volume="amllLowFreqVolume"
          @play-or-pause="togglePlay"
          @prev="playPrevSong"
          @next="playNextSong"
          @line-click="onAmllLineClick"
        />
      </div>
    </Teleport>

    <Teleport to="body">
      <Transition name="playlist-dialog">
        <div
          v-if="playlistPanelOpen"
          class="playlist-dialog-backdrop fixed inset-0 z-[1001] bg-black/35 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="播放列表"
          @click.self="closePlaylistPanel"
        >
          <div
            class="playlist-dialog-panel mx-auto mt-[12vh] w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
          >
            <div
              class="flex items-center justify-between border-b border-stone-200 px-4 py-3"
            >
              <div>
                <p class="text-sm font-semibold text-stone-900">播放列表</p>
                <p class="text-xs text-stone-500">
                  队列 {{ playQueue.length }} 首 · {{ playModeLabel }}
                </p>
              </div>
              <div class="flex items-center gap-1.5">
                <button
                  v-if="playQueue.length > 1"
                  class="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  :disabled="queueMutationLocked"
                  @click="clearQueuedSongs"
                >
                  <TrashIcon class="h-3.5 w-3.5"/>
                  清除待播
                </button>
                <button
                  class="grid h-8 w-8 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100"
                  type="button"
                  aria-label="关闭播放列表"
                  @click="closePlaylistPanel"
                >
                  <XMarkIcon class="h-4 w-4"/>
                </button>
              </div>
            </div>

            <div
              ref="queueListRef"
              class="queue-list relative max-h-[56vh] overflow-y-auto p-2"
              @scroll.passive="onQueueListScroll"
            >
              <TransitionGroup
                name="queue-item"
                :css="!queueVirtualized"
                tag="div"
                class="relative"
              >
                <div
                  v-if="queueTopSpacerPx"
                  key="queue-spacer-top"
                  class="pointer-events-none"
                  :style="{height: `${queueTopSpacerPx}px`}"
                  aria-hidden="true"
                />
                <div
                  v-for="({song, index}) in queueDisplayItems"
                  :key="song.queueEntryId"
                  :ref="element => setQueueRowRef(song.queueEntryId, element)"
                  class="queue-row relative mb-1 overflow-hidden rounded-xl"
                >
                  <div
                    v-if="index !== currentQueueIndex"
                    class="pointer-events-none absolute inset-y-0 right-0 flex w-24 items-center justify-end bg-gradient-to-l from-rose-600 to-rose-500 px-4 text-[11px] font-semibold tracking-wide text-white transition-opacity duration-300"
                    :class="queueSwipe.entryId === song.queueEntryId && queueSwipe.dragging && queueSwipe.offsetX < 0
                      ? 'opacity-100'
                      : 'opacity-0'"
                    aria-hidden="true"
                  >
                    松开移除
                  </div>
                  <div
                    class="queue-row-content relative flex w-full items-center gap-1 text-left"
                    :class="[
                      index === currentQueueIndex
                        ? 'bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900'
                        : 'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
                      queueSwipe.entryId === song.queueEntryId && queueSwipe.dragging
                        ? 'will-change-transform'
                        : 'transition-transform duration-300',
                    ]"
                    :style="queueRowSwipeStyle(song.queueEntryId)"
                    @pointerdown="onQueueRowPointerDown($event, song, index)"
                    @pointermove="onQueueRowPointerMove($event, song)"
                    @pointerup="onQueueRowPointerEnd($event, song, index)"
                    @pointercancel="onQueueRowPointerCancel($event, song)"
                    @click.capture="onQueueRowClickCapture"
                  >
                    <button
                      class="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                      type="button"
                      @click="onQueueSongClick(index)"
                    >
                      <span class="w-6 shrink-0 text-center text-[11px] font-bold opacity-50">{{
                          index + 1
                        }}</span>
                      <span class="truncate text-[14px] font-semibold">{{
                          song.name || '未知歌曲'
                        }}</span>
                    </button>
                    <button
                      v-if="index !== currentQueueIndex"
                      class="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-full text-current opacity-45 transition hover:bg-black/5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-20 dark:hover:bg-white/10"
                      type="button"
                      :disabled="queueMutationLocked"
                      :aria-label="`从播放队列移除《${song.name || '未知歌曲'}》`"
                      @click.stop="removeQueuedSong(song)"
                    >
                      <XMarkIcon class="h-4 w-4"/>
                    </button>
                  </div>
                </div>
                <div
                  v-if="queueBottomSpacerPx"
                  key="queue-spacer-bottom"
                  class="pointer-events-none"
                  :style="{height: `${queueBottomSpacerPx}px`}"
                  aria-hidden="true"
                />
              </TransitionGroup>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="more-dialog">
        <div
          v-if="morePanelOpen"
          class="more-dialog-backdrop fixed inset-0 z-[1000]"
          role="dialog"
          aria-modal="true"
          aria-label="更多播放设置"
          @click.self="closeMorePanel"
        >
          <div
            class="more-dialog-panel"
            :style="[morePanelStyle, morePanelThemeStyle]"
            @click.stop
          >
            <button
              class="more-dialog-btn rounded-full px-2.5 py-1.5 text-[12px] transition"
              type="button"
              @click="onClickMoreAutomix"
            >
              {{ automixLabel }}
            </button>
            <button
              class="more-dialog-btn rounded-full px-2.5 py-1.5 text-[12px] transition"
              type="button"
              @click="onClickMoreLyricTranslate"
            >
              {{ lyricTranslateLabel }}
            </button>
            <button
              class="more-dialog-btn rounded-full px-2.5 py-1.5 text-[12px] transition"
              type="button"
              @click="onClickMorePlayMode"
            >
              {{ playModeLabel }}
            </button>
            <button
              class="more-dialog-btn rounded-full px-2.5 py-1.5 text-[12px] transition"
              type="button"
              @click="onClickMorePlaylist"
            >
              播放列表
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <AutoMixDebugPanel
      v-if="AUTOMIX_DEBUG_VISIBLE"
      :status="playerStore.automixStatus"
      :debug="playerStore.automixDebug"
      :capabilities="playerStore.automixCapabilities"
    />

    <audio
      ref="audioRef"
      crossorigin="anonymous"
      playsinline
      webkit-playsinline="true"
      preload="auto"
      @loadedmetadata="onLoadedMetadata"
      @durationchange="onDurationChange"
      @timeupdate="throttledOnTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @error="onAudioError"
    />
    <audio
      ref="crossfadeAudioRef"
      crossorigin="anonymous"
      playsinline
      webkit-playsinline="true"
      preload="auto"
      @loadedmetadata="onLoadedMetadata"
      @durationchange="onDurationChange"
      @timeupdate="throttledOnTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @error="onAudioError"
    />
  </div>
</template>

<script setup>
import {TrashIcon, XMarkIcon} from "@heroicons/vue/24/outline";
import {
  BackwardIcon,
  EllipsisHorizontalIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
} from "@heroicons/vue/24/solid";
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import {useRouter} from "vue-router";
import {useDetailNavigation} from "@/composables/useDetailNavigation.js";
import {reportApi} from "@/api/reportApi/reportApi.js";
import ArtistLinks from "@/components/artistLinks/artistLinks.vue";
import AutoMixDebugPanel from "@/components/globalFooterPlayer/AutoMixDebugPanel.vue";
import {AudioEngine} from "@/audio/AudioEngine.js";
import {autoMixEngine} from "@/audio/AutoMixEngine.js";
import {usePlayerLyric} from "@/composables/usePlayerLyric.js";
import {usePlayerLyricLoader} from "@/composables/usePlayerLyricLoader.js";
import {usePlayerThemeFromCover} from "@/composables/usePlayerThemeFromCover.js";
import {usePlayerRhythmAnalyzer} from "@/composables/usePlayerRhythmAnalyzer.js";
import {usePlayerReporting} from "@/composables/usePlayerReporting.js";
import {usePlayerManualSwitch} from "@/composables/usePlayerManualSwitch.js";
import {usePlayerMorePanel} from "@/composables/usePlayerMorePanel.js";
import {usePlayerLyricOverlay} from "@/composables/usePlayerLyricOverlay.js";
import {usePlayerFullscreenTransition} from "@/composables/usePlayerFullscreenTransition.js";
import {usePlayerCrossfade} from "@/composables/usePlayerCrossfade.js";
import {usePlayerCrossfadeFlow} from "@/composables/usePlayerCrossfadeFlow.js";
import {usePlayerCrossfadeRuntime} from "@/composables/usePlayerCrossfadeRuntime.js";
import {usePlayerMediaSession} from "@/composables/usePlayerMediaSession.js";
import {usePlayerAssets} from "@/composables/usePlayerAssets.js";
import {PLAY_MODE, usePlayerStore} from "@/stores/playerStore.js";
import {
  blendTheme,
  buildThemeByBase,
  createFallbackTheme,
  getRgbBrightness,
} from "@/utils/player/playerTheme.js";
import {formatMs, isVideoUrl} from "@/utils/player/playerMedia.js";
import {
  clearSongPlayableUrlCache,
  playQueueByDirection,
  playQueueByIndex,
  resolveSongPlayableUrl,
  warmupNextTrack,
} from "@/utils/globalPlayer.js";
import {showPlaybackNotice} from "@/utils/playbackNotice.js";
import {
  getLastAutomixAnalysis,
  recommendNextQueueIndex,
  resolveTempoRateForTransition,
} from "@/audio/TransitionPlanner.js";
import {normalizeLyricPayloadToAmll} from "@/utils/lyricAdapter.js";
import {dissolveElement} from "@/utils/particleDissolve.js";
// 🔧 性能优化：导入性能工具
import {rafThrottle, getOptimizedConfig, MemoryManager} from "@/utils/performanceOptimizer.js";

// 🔧 获取设备性能配置
const perfConfig = getOptimizedConfig();
const memoryManager = new MemoryManager();

const AMLLWrapper = defineAsyncComponent({
  loader: () =>
    import("@applemusic-like-lyrics/vue").then((module) => module.AMLLWrapper),
  suspensible: false,
});

const playerStore = usePlayerStore();
const AUTOMIX_DEBUG_VISIBLE = Boolean(
  import.meta.env.DEV && import.meta.env.VITE_AUTOMIX_DEBUG === "true",
);
let stopAutomixRuntimeSubscription = autoMixEngine.subscribe((snapshot) => {
  playerStore.setAutomixRuntimeSnapshot(snapshot);
});
const router = useRouter();
const {openDetail} = useDetailNavigation();
const {
  collectLyricRowsForTranslate,
  hasLyricText,
  extractLyricPayloadFromSearchResult,
  attachAiTranslationIfNeeded,
} = usePlayerLyric();
const audioRef = ref(null);
const crossfadeAudioRef = ref(null);
const playerRootRef = ref(null);
const playerShellRef = ref(null);
const desktopCoverRef = ref(null);
const mobileCoverRef = ref(null);
const amllHostRef = ref(null);
const queueListRef = ref(null);
const queueRowRefs = new Map();
const queueDissolvingEntryIds = ref(new Set());
const queueClearing = ref(false);
const queueSwipe = ref({
  entryId: "",
  pointerId: null,
  startX: 0,
  startY: 0,
  offsetX: 0,
  dragging: false,
});
let queueClickSuppressedUntil = 0;
let queuePointerCaptureTarget = null;
let queueEffectAbortController = null;
let playerResizeObserver = null;
let mediaQueryMotion = null;
let mediaQueryMotionHandler = null;
let visibilityChangeHandler = null;
let automixProfileReadyHandler = null;
let backgroundCheckTimer = null;

const themeBaseRgb = ref([38, 56, 98]);
const themeAccentRgb = ref([78, 114, 176]);
const themeGlowRgb = ref([138, 176, 236]);
const themeIsDark = ref(true);
const prefersReducedMotion = ref(false);
const isIOSDevice = ref(false);

let crossfadeActive = false;
let crossfadePreparing = false;
const queueCrossfadeBusy = ref(false);
let crossfadeTriggeredForSongId = null;
let crossfadeRafId = 0;
let pendingPromotedStartSec = -1;
let skipNextCoverThemePick = false;
let skipAudioResetOnNextSrcChange = false;
let activeDeck = "primary";

const DEV_CROSSFADE_DEBUG = Boolean(import.meta.env.DEV);

function debugCrossfade(label, payload = {}) {
  if (!DEV_CROSSFADE_DEBUG || typeof console === "undefined") return;
  try {
    console.log(`[CrossfadeDebug] ${label}`, JSON.parse(JSON.stringify(payload)));
  } catch {
    console.log(`[CrossfadeDebug] ${label}`, payload);
  }
}

function syncQueueCrossfadeBusy() {
  queueCrossfadeBusy.value = crossfadeActive || crossfadePreparing;
}

function setCrossfadeActiveState(next) {
  const wasActive = crossfadeActive;
  crossfadeActive = Boolean(next);
  if (crossfadeActive && !wasActive) {
    autoMixEngine.startTransition(getLastAutomixAnalysis()?.transition);
  } else if (!crossfadeActive && wasActive) {
    autoMixEngine.completeTransition();
  }
  syncQueueCrossfadeBusy();
}

function setCrossfadePreparingState(next) {
  crossfadePreparing = Boolean(next);
  syncQueueCrossfadeBusy();
}

function getActiveAudio() {
  return activeDeck === "primary" ? audioRef.value : crossfadeAudioRef.value;
}

function getIdleAudio() {
  return activeDeck === "primary" ? crossfadeAudioRef.value : audioRef.value;
}

function flipActiveDeck() {
  activeDeck = activeDeck === "primary" ? "secondary" : "primary";
}

const automixAudioGraph = new AudioEngine({
  getPrimaryAudio: () => audioRef.value,
  getSecondaryAudio: () => crossfadeAudioRef.value,
  getVolume: () => playerStore.volume,
});

function isEventFromActiveDeck(event) {
  const target = event?.target || null;
  return Boolean(target && target === getActiveAudio());
}

const amllHideLyricView = ref(false);
const amllLyricLines = ref([]);
const amllAlbum = ref("");
const AMLL_LYRIC_LEAD_MS = 320;
const {
  amllOpened,
  amllMounted,
  prepareLyricPage,
  onAmllOpenedChange: commitAmllOpenedChange,
  disposeLyricOverlay,
} = usePlayerLyricOverlay({
  hasSong: () => hasSong.value,
  nextTick,
  requestFrame: (cb) => requestAnimationFrame(cb),
  clearTimer: (id) => window.clearTimeout(id),
  setTimer: (cb, ms) => window.setTimeout(cb, ms),
});

function getVisibleMiniCover() {
  for (const cover of [desktopCoverRef.value, mobileCoverRef.value]) {
    const rect = cover?.getBoundingClientRect();
    if (
      cover?.getClientRects().length &&
      rect?.width > 0 &&
      rect?.height > 0
    ) {
      return cover;
    }
  }
  return null;
}

const {
  openFullscreen,
  closeFullscreen,
  disposeFullscreenTransition,
} = usePlayerFullscreenTransition({
  nextTick,
  prepareOverlay: prepareLyricPage,
  commitOverlayOpened: commitAmllOpenedChange,
  getOverlayOpened: () => amllOpened.value,
  getOverlayHost: () => amllHostRef.value,
  getMiniShell: () => playerShellRef.value,
  getMiniCover: getVisibleMiniCover,
});

function openLyricPage() {
  void openFullscreen();
}

function onAmllOpenedChange(nextOpened) {
  if (nextOpened) {
    commitAmllOpenedChange(true);
    return;
  }
  void closeFullscreen();
}

const amllCurrentTimeMsRef = ref(0);
let amllClockRafId = 0;

const hasSong = computed(() => playerStore.hasSong);
const songName = computed(() => playerStore.currentSong?.name || "");
const artistList = computed(() => playerStore.currentSong?.artists || []);
const normalizedArtistList = computed(() => {
  return (artistList.value || [])
    .map((item) => ({
      id: item?.id || item?.artistId || "",
      name: String(item?.name || item?.artistName || "").trim(),
    }))
    .filter((item) => item.name);
});
const shouldScrollArtists = computed(() => {
  const artists = normalizedArtistList.value;
  const labelLength = artists.reduce((total, artist) => total + artist.name.length, 0);
  return artists.length > 5 || labelLength + Math.max(0, artists.length - 1) * 2 > 64;
});
const artistLinksContainerClass = computed(
  () => "player-artist-links text-xs player-text-muted",
);
const artistLinksClass = computed(() => "hover:underline player-link");
const artistSeparatorClass = computed(() => "player-separator");
const coverUrl = computed(() => playerStore.currentSong?.cover || "");
const currentSongUrl = computed(() => playerStore.currentSong?.url || "");
const isPlaying = computed(() => playerStore.isPlaying);
const currentTimeMs = computed(() => playerStore.currentTimeMs);
const durationMs = computed(() => playerStore.durationMs);
const volume = computed(() => playerStore.volume);
const playbackProgressPercent = computed(() => {
  const duration = Number(durationMs.value || 0);
  if (duration <= 0) return 0;
  return clamp((Number(currentTimeMs.value || 0) / duration) * 100, 0, 100);
});
const timelineRangeStyle = computed(() => ({
  "--range-progress": `${playbackProgressPercent.value}%`,
}));
const volumeRangeStyle = computed(() => ({
  "--range-progress": `${clamp(Number(volume.value || 0), 0, 1) * 100}%`,
}));
const playQueue = computed(() => playerStore.playQueue);
const currentQueueIndex = computed(() => playerStore.currentQueueIndex);
const playlistPanelOpen = computed(() => playerStore.playlistPanelOpen);
const QUEUE_VIRTUAL_THRESHOLD = 120;
const QUEUE_ROW_HEIGHT_PX = 44;
const QUEUE_OVERSCAN_ROWS = 8;
const queueScrollTop = ref(0);
const queueViewportHeight = ref(520);
const queueVirtualized = computed(
  () => playQueue.value.length > QUEUE_VIRTUAL_THRESHOLD,
);
const queueVisibleStart = computed(() => {
  if (!queueVirtualized.value) return 0;
  return Math.max(
    0,
    Math.floor(queueScrollTop.value / QUEUE_ROW_HEIGHT_PX) - QUEUE_OVERSCAN_ROWS,
  );
});
const queueVisibleEnd = computed(() => {
  if (!queueVirtualized.value) return playQueue.value.length;
  const visibleRows = Math.ceil(queueViewportHeight.value / QUEUE_ROW_HEIGHT_PX);
  return Math.min(
    playQueue.value.length,
    queueVisibleStart.value + visibleRows + QUEUE_OVERSCAN_ROWS * 2,
  );
});
const queueDisplayItems = computed(() =>
  playQueue.value
    .slice(queueVisibleStart.value, queueVisibleEnd.value)
    .map((song, offset) => ({song, index: queueVisibleStart.value + offset})),
);
const queueTopSpacerPx = computed(
  () => queueVisibleStart.value * QUEUE_ROW_HEIGHT_PX,
);
const queueBottomSpacerPx = computed(
  () => (playQueue.value.length - queueVisibleEnd.value) * QUEUE_ROW_HEIGHT_PX,
);
const songTransitionKey = computed(() => {
  const song = playerStore.currentSong || {};
  return `${song.id || "none"}-${song.url || ""}-${song.name || ""}`;
});

const amllArtists = computed(() =>
  normalizedArtistList.value.map((item) => item.name),
);
const amllCoverUrl = computed(() => dynamicCoverUrl.value || coverUrl.value);
const amllCoverIsVideo = computed(
  () => Boolean(dynamicCoverUrl.value && dynamicCoverIsVideo.value),
);

const amllCurrentTimeMs = computed({
  get: () => amllCurrentTimeMsRef.value,
  set: (next) => {
    const ms = Number(next);
    if (!Number.isFinite(ms)) return;
    const safeMs = Math.max(0, ms - AMLL_LYRIC_LEAD_MS);
    playerStore.setCurrentTimeMs(safeMs);
    amllCurrentTimeMsRef.value = Math.max(0, Math.floor(ms));
    const active = getActiveAudio();
    if (active) {
      const targetSec = safeMs / 1000;
      if (Math.abs((active.currentTime || 0) - targetSec) > 0.05) {
        active.currentTime = targetSec;
      }
    }
  },
});

const amllVolume = computed({
  get: () => volume.value,
  set: (next) => {
    playerStore.setVolume(next);
    syncAudioVolume();
  },
});

const amllLowFreqVolume = computed(() =>
  clamp(0.08 + rhythmLevel.value * 0.48 + beatLevel.value * 0.64, 0.08, 1),
);
const automixEnabled = computed(() => Boolean(playerStore.automixEnabled));
const lyricTranslateEnabled = computed(() =>
  Boolean(playerStore.lyricTranslateEnabled),
);
const automixLabel = computed(() =>
  automixEnabled.value ? "智能混音: 开" : "智能混音: 关",
);
const lyricTranslateLabel = computed(() =>
  lyricTranslateEnabled.value ? "歌词翻译: 开" : "歌词翻译: 关",
);
const automixMobileLabel = computed(() =>
  automixEnabled.value ? "混音 · 开" : "混音 · 关",
);
const lyricTranslateMobileLabel = computed(() =>
  lyricTranslateEnabled.value ? "译词 · 开" : "译词 · 关",
);
const crossfadeVisualActive = ref(false);
const queueMutationLocked = computed(
  () =>
    queueClearing.value ||
    queueDissolvingEntryIds.value.size > 0 ||
    queueCrossfadeBusy.value ||
    crossfadeVisualActive.value,
);
const suppressTrackSwapAnimation = ref(false);
const trackSwapTransitionName = computed(() =>
  suppressTrackSwapAnimation.value ? "track-swap-none" : "track-swap",
);
const {
  moreMenuButtonRef,
  morePanelOpen,
  morePanelStyle,
  updateMorePanelPosition,
  closeMorePanel,
  toggleMorePanel,
} = usePlayerMorePanel();
const morePanelThemeStyle = computed(() => ({
  "--more-bg": themeIsDark.value ? "34, 44, 68" : "244, 247, 255",
  "--more-border": themeIsDark.value ? "255, 255, 255" : "24, 31, 45",
  "--more-fg": themeIsDark.value ? "238, 244, 255" : "24, 31, 45",
  "--more-fg-muted": themeIsDark.value ? "205, 218, 238" : "84, 94, 114",
}));
const {
  updateMediaSessionMetadata,
  updateMediaSessionPlaybackState,
  updateMediaSessionPositionState,
  scheduleMediaSessionPositionStateUpdate,
  clearScheduledPositionStateUpdate,
  setupMediaSessionHandlers,
  clearMediaSessionHandlers,
} = usePlayerMediaSession({
  getSongName: () => songName.value,
  getArtistNames: () => normalizedArtistList.value.map((item) => item.name),
  getAlbumName: () => amllAlbum.value,
  getArtworkSrc: () => resolveMediaSessionArtworkUrl(),
  getHasSong: () => hasSong.value,
  getIsPlaying: () => isPlaying.value,
  getDurationMs: () => durationMs.value,
  getCurrentTimeMs: () => currentTimeMs.value,
  getPlayQueueLength: () => playQueue.value.length,
  getCanPlayPrev: () => canPlayPrev.value,
  getCanPlayNext: () => canPlayNext.value,
  playPrev: () => playPrevSong(),
  playNext: () => playNextSong(),
  getActiveAudio: () => getActiveAudio(),
  onPlayFailed: () => playerStore.setPlaying(false),
  onPause: () => {
    playerStore.autoPlayOnLoad = false;
    interruptAutomixForUserAction("media-session-pause");
  },
  onSeek: () => interruptAutomixForUserAction("media-session-seek"),
  setCurrentTimeMs: (next) => playerStore.setCurrentTimeMs(next),
});

const dynamicCoverUrl = ref("");
const dynamicCoverIsVideo = ref(false);
const crossfadeCoverUrl = ref("");
const crossfadeCoverIsVideo = ref(false);
const crossfadeCoverProgress = ref(0);
const {loadDynamicCover: loadDynamicCoverAsset} = usePlayerAssets({
  isVideoUrl,
});
const {
  resolveThemeFromCover,
  pickThemeFromCover,
} = usePlayerThemeFromCover();
const {loadCurrentSongLyric} = usePlayerLyricLoader({
  getSongName: () => songName.value,
  getFirstArtistName: () => normalizedArtistList.value?.[0]?.name || "",
  getCurrentSong: () => playerStore.currentSong,
  hasLyricText,
  extractLyricPayloadFromSearchResult,
  normalizeLyricPayloadToAmll,
  collectLyricRowsForTranslate,
  attachAiTranslationIfNeeded,
  isLyricTranslateEnabled: () => lyricTranslateEnabled.value,
  setLyricLines: (next) => {
    amllLyricLines.value = next;
  },
});
const {
  rhythmLevel,
  beatLevel,
  visualPulse,
  startRhythmLoop,
  stopRhythmLoop,
  resetRhythmVisual,
  resetRhythmEnergy,
  disposeRhythmAnalyzer,
} = usePlayerRhythmAnalyzer({
  getHasSong: () => hasSong.value,
  getIsPlaying: () => playerStore.isPlaying,
  getPrefersReducedMotion: () => prefersReducedMotion.value,
  getIsIOSDevice: () => isIOSDevice.value,
  getActiveAudio: () => getActiveAudio(),
  getPrimaryAudio: () => audioRef.value,
  ensureSharedAudioGraph: () => automixAudioGraph.ensure(),
  resumeSharedAudioGraph: () => automixAudioGraph.resume(),
  getSharedAnalyserNode: () => automixAudioGraph.getAnalyserNode(),
  onSyncCurrentTimeMs: (nextMs) => {
    playerStore.setCurrentTimeMs(nextMs);
  },
});
const {
  reportBehavior,
  reportCurrentPlayRecord,
  resetPlayRecordCache,
} = usePlayerReporting({
  reportApi,
  getCurrentSong: () => playerStore.currentSong,
  getCurrentAudio: () => getActiveAudio(),
  getArtistNames: () => normalizedArtistList.value.map((item) => item.name),
});

const playerStyle = computed(() => {
  const [b1, b2, b3] = themeBaseRgb.value;
  const [a1, a2, a3] = themeAccentRgb.value;
  const [g1, g2, g3] = themeGlowRgb.value;
  const strongBeat = clamp((beatLevel.value - 0.1) / 0.84, 0, 1);
  const baseFlow = isPlaying.value
    ? clamp(rhythmLevel.value * 0.26 + 0.12, 0.12, 0.34)
    : 0;
  const pulse = prefersReducedMotion.value
    ? 0
    : Math.max(
      baseFlow,
      clamp(
        strongBeat * 0.82 +
        visualPulse.value * 0.66 +
        rhythmLevel.value * 0.22,
        0,
        1,
      ),
    );

  return {
    "--player-fg": themeIsDark.value ? "245, 248, 255" : "24, 31, 45",
    "--player-fg-muted": themeIsDark.value ? "205, 218, 238" : "84, 94, 114",
    "--player-separator": themeIsDark.value ? "168, 184, 213" : "126, 136, 156",
    "--player-border": themeIsDark.value ? "255, 255, 255" : "24, 31, 45",
    "--player-border-alpha": (themeIsDark.value ? 0.24 : 0.16).toFixed(2),
    "--player-base": `${b1}, ${b2}, ${b3}`,
    "--player-accent": `${a1}, ${a2}, ${a3}`,
    "--player-glow": `${g1}, ${g2}, ${g3}`,
    "--player-glow-alpha": (0.14 + pulse * 0.5).toFixed(3),
    "--player-sat": (1 + pulse * 0.34).toFixed(3),
    "--player-brightness": (1 + pulse * 0.12).toFixed(3),
    "--player-shadow-alpha": (0.24 + pulse * 0.22).toFixed(3),
    "--player-aura-scale": (1 + pulse * 0.2).toFixed(4),
    "--player-soft-bg-alpha": themeIsDark.value ? "0.18" : "0.08",
    "--player-main-bg": themeIsDark.value ? "248, 251, 255" : "24, 31, 45",
    "--player-main-fg": themeIsDark.value ? "18, 24, 36" : "244, 248, 255",
  };
});

const playModeLabel = computed(() => {
  if (playerStore.playMode === PLAY_MODE.SINGLE) return "单曲循环";
  if (playerStore.playMode === PLAY_MODE.SHUFFLE) return "随机播放";
  return "顺序播放";
});

const canPlayPrev = computed(() => {
  if (!playQueue.value.length) return false;
  if (playerStore.playMode === PLAY_MODE.SHUFFLE)
    return playQueue.value.length > 1;
  return currentQueueIndex.value > 0;
});

const canPlayNext = computed(() => {
  if (!playQueue.value.length) return false;
  if (playerStore.playMode === PLAY_MODE.SHUFFLE)
    return playQueue.value.length > 1;
  return (
    currentQueueIndex.value >= 0 &&
    currentQueueIndex.value < playQueue.value.length - 1
  );
});
const {
  getCrossfadeTargetIndex,
  prewarmCrossfadeDeck,
  isPrewarmedMatch,
  getPrewarmedUrl,
  clearPrewarmed,
} = usePlayerCrossfade({
  playerStore,
  isSequenceMode: () => playerStore.playMode === PLAY_MODE.SEQUENCE,
  automixEnabled: () => automixEnabled.value,
  getIdleAudio: () => getIdleAudio(),
  isCrossfadeBusy: () => crossfadeActive || crossfadePreparing,
  resolvePlayableUrlById,
  getLastAutomixAnalysis,
  recommendNextQueueIndex,
  log: (...args) => {
    if (typeof console !== "undefined") console.log(...args);
  },
});
const {
  stopCrossfade,
  completeCrossfadeByDeckSwap,
} = usePlayerCrossfadeRuntime({
  getCrossfadeRafId: () => crossfadeRafId,
  setCrossfadeRafId: (next) => {
    crossfadeRafId = next;
  },
  getActiveAudio: () => getActiveAudio(),
  getIdleAudio: () => getIdleAudio(),
  getVolume: () => clamp(Number(volume.value || 0.85), 0, 1),
  setCrossfadeCoverState: ({progress, url, isVideo}) => {
    if (typeof progress === "number") crossfadeCoverProgress.value = progress;
    if (typeof url === "string") crossfadeCoverUrl.value = url;
    if (typeof isVideo === "boolean") crossfadeCoverIsVideo.value = isVideo;
  },
  setCrossfadeActive: setCrossfadeActiveState,
  setCrossfadeVisualActive: (next) => {
    crossfadeVisualActive.value = next;
  },
  flipActiveDeck,
  syncCurrentTimeMs: (nextMs) => {
    playerStore.setCurrentTimeMs(nextMs);
    resetRhythmEnergy();
  },
  onCrossfadeCompleted: () => {
    playerStore.setPlaying(true);
  },
  setupMediaSessionHandlers: () => setupMediaSessionHandlers({force: isIOSDevice.value}),
  startRhythmLoop,
  updateMediaSessionPlaybackState,
  requestAutomixWarmup,
  resetTriggeredSong: () => {
    crossfadeTriggeredForSongId = null;
  },
  onResumePlayFailed: () => {
    playerStore.setPlaying(false);
  },
  audioGraph: automixAudioGraph,
  debugCrossfade,
  log: (...args) => {
    if (typeof console !== "undefined") console.log(...args);
  },
});
const {tryStartAutomixCrossfade} = usePlayerCrossfadeFlow({
  getActiveAudio: () => getActiveAudio(),
  getIdleAudio: () => getIdleAudio(),
  isCrossfadeActive: () => crossfadeActive,
  isCrossfadePreparing: () => crossfadePreparing,
  setCrossfadeActive: setCrossfadeActiveState,
  setCrossfadePreparing: setCrossfadePreparingState,
  getCrossfadeTriggeredSongId: () => crossfadeTriggeredForSongId,
  setCrossfadeTriggeredSongId: (next) => {
    crossfadeTriggeredForSongId = next;
  },
  getHasSong: () => hasSong.value,
  isAutomixEnabled: () => automixEnabled.value,
  isSinglePlayMode: () => playerStore.playMode === PLAY_MODE.SINGLE,
  getCurrentSong: () => playerStore.currentSong,
  getPlayQueue: () => playerStore.playQueue || [],
  getCurrentQueueIndex: () => playerStore.currentQueueIndex,
  getCrossfadeTargetIndex,
  isPrewarmedMatch,
  getPrewarmedUrl,
  resolvePlayableUrlById,
  getLastAutomixAnalysis,
  getCurrentThemeSnapshot,
  resolveThemeFromCover,
  resolveSongCover,
  isVideoUrl,
  setCrossfadeVisualActive: (next) => {
    crossfadeVisualActive.value = next;
  },
  setCrossfadeCoverState: ({url, isVideo, progress}) => {
    if (typeof url === "string") crossfadeCoverUrl.value = url;
    if (typeof isVideo === "boolean") crossfadeCoverIsVideo.value = isVideo;
    if (typeof progress === "number") crossfadeCoverProgress.value = progress;
  },
  waitAudioMetadata,
  sanitizePlaybackStartSec,
  resolveTempoRateForTransition,
  debugCrossfade,
  clamp,
  getVolume: () => volume.value,
  applyThemeBlend,
  applyTheme,
  setSkipNextCoverThemePick: (next) => {
    skipNextCoverThemePick = next;
  },
  completeCrossfadeByDeckSwap,
  promoteCrossfadedTrack,
  setCrossfadeRafId: (next) => {
    crossfadeRafId = next;
  },
  stopCrossfade,
  audioGraph: automixAudioGraph,
  log: (...args) => {
    if (typeof console !== "undefined") console.log(...args);
  },
});
const {playPrevSong, playNextSong, playSongAtIndex} = usePlayerManualSwitch({
  playerStore,
  automixEnabled: () => automixEnabled.value,
  canPlayPrev: () => canPlayPrev.value,
  canPlayNext: () => canPlayNext.value,
  hasSong: () => hasSong.value,
  getActiveAudio: () => getActiveAudio(),
  getIdleAudio: () => getIdleAudio(),
  getCrossfadeActive: () => crossfadeActive,
  getCrossfadePreparing: () => crossfadePreparing,
  setCrossfadeActive: setCrossfadeActiveState,
  setCrossfadePreparing: setCrossfadePreparingState,
  setCrossfadeVisualActive: (next) => {
    crossfadeVisualActive.value = next;
  },
  setCrossfadeTriggeredSongId: (next) => {
    crossfadeTriggeredForSongId = next;
  },
  getVolume: () => volume.value,
  resolvePlayableUrlById,
  recommendNextQueueIndex,
  getLastAutomixAnalysis,
  waitAudioMetadata,
  sanitizePlaybackStartSec,
  resolveTempoRateForTransition,
  resolveSongCover,
  pickThemeFromCover,
  getSongName: () => songName.value,
  applyTheme,
  setSkipNextCoverThemePick: (next) => {
    skipNextCoverThemePick = next;
  },
  promoteCrossfadedTrack,
  completeCrossfadeByDeckSwap,
  requestAutomixWarmup,
  reportBehavior,
  playQueueByDirection,
  playQueueByIndex,
  closePlaylistPanel,
  onManualSkip: (reason) => {
    interruptAutomixForUserAction(`manual-${reason}`);
    void autoMixEngine.skip();
  },
  audioGraph: automixAudioGraph,
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}


function applyTheme(theme) {
  if (!theme) return;
  const base = Array.isArray(theme.base) ? theme.base : [38, 56, 98];
  const accent = Array.isArray(theme.accent) ? theme.accent : [78, 114, 176];
  const glow = Array.isArray(theme.glow) ? theme.glow : [138, 176, 236];

  themeBaseRgb.value = base;
  themeAccentRgb.value = accent;
  themeGlowRgb.value = glow;
  themeIsDark.value =
    typeof theme.isDark === "boolean"
      ? theme.isDark
      : getRgbBrightness(base) < 146;
}

function applyThemeByBase(baseRgb) {
  applyTheme(buildThemeByBase(baseRgb));
}

function applyFallbackTheme(seedText = "") {
  applyTheme(createFallbackTheme(seedText));
}


function resolveSongCover(song) {
  return (
    song?.cover ||
    song?.coverImgUrl ||
    song?.picUrl ||
    song?.al?.picUrl ||
    song?.album?.picUrl ||
    ""
  );
}

function getCurrentThemeSnapshot() {
  return {
    base: [...themeBaseRgb.value],
    accent: [...themeAccentRgb.value],
    glow: [...themeGlowRgb.value],
    isDark: themeIsDark.value,
  };
}

function applyThemeBlend(fromTheme, toTheme, progress) {
  applyTheme(blendTheme(fromTheme, toTheme, progress));
}

function detectIOSDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = String(navigator.userAgent || "");
  const platform = String(navigator.platform || "");
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  return /iPad|iPhone|iPod/i.test(ua) ||
    (platform === "MacIntel" && touchPoints > 1);
}

function setAudioSessionPlaybackMode() {
  if (typeof navigator === "undefined") return;
  const audioSession = navigator.audioSession;
  if (!audioSession || typeof audioSession !== "object") return;
  try {
    audioSession.type = "playback";
  } catch {
    // noop
  }
}

function openArtistFromPlayer(artist) {
  if (!artist?.name) return;
  const id = String(artist.id || "").trim();
  if (id) {
    openDetail("artist", id, {query: {name: artist.name}});
    return;
  }
  router.push({name: "artistByName", query: {name: artist.name}});
}

function resolveMediaSessionArtworkUrl() {
  const dynamic = String(dynamicCoverUrl.value || "").trim();
  if (dynamic && !dynamicCoverIsVideo.value && !isVideoUrl(dynamic)) {
    return dynamic;
  }
  const cover = String(coverUrl.value || "").trim();
  if (cover && !isVideoUrl(cover)) {
    return cover;
  }
  return "";
}

async function resolvePlayableUrlById(id) {
  return resolveSongPlayableUrl(id);
}

async function waitAudioMetadata(media, {timeoutMs = 1200} = {}) {
  if (!media) return false;
  if (media.readyState >= 1) return true;

  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      media.removeEventListener("loadedmetadata", onReady);
      media.removeEventListener("canplay", onReady);
      window.clearTimeout(timer);
    };
    const finish = (ok) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(ok);
    };
    const onReady = () => finish(true);
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    media.addEventListener("loadedmetadata", onReady, {once: true});
    media.addEventListener("canplay", onReady, {once: true});
  });
}

function sanitizePlaybackStartSec(media, targetSec = 0) {
  const target = Math.max(0, Number(targetSec) || 0);
  const duration = Number(media?.duration || 0);
  if (!Number.isFinite(duration) || duration <= 0) return target;

  const maxStart = Math.max(0, duration - 0.35);
  if (maxStart <= 0) return 0;
  return Math.min(target, maxStart);
}


async function promoteCrossfadedTrack(targetSong, targetUrl, promotedStartSec, targetIndex = -1) {
  if (!targetSong?.id || !targetUrl) return;

  suppressTrackSwapAnimation.value = true;
  skipAudioResetOnNextSrcChange = true;
  pendingPromotedStartSec = Math.max(0, Number(promotedStartSec || 0));
  playerStore.setTrack(
    {
      id: targetSong.id,
      name: targetSong.name || "",
      artists: targetSong.artists || targetSong.ar || [],
      cover:
        targetSong.cover ||
        targetSong.coverImgUrl ||
        targetSong.picUrl ||
        targetSong.al?.picUrl ||
        targetSong.album?.picUrl ||
        "",
      url: targetUrl,
      mixProfile: targetSong.mixProfile || null,
    },
    {autoplay: true, resetTime: false},
  );
  if (pendingPromotedStartSec > 0) {
    playerStore.setCurrentTimeMs(Math.floor(pendingPromotedStartSec * 1000));
  }
  if (Number.isInteger(targetIndex) && targetIndex >= 0) {
    playerStore.setCurrentQueueIndex(targetIndex);
  } else {
    playerStore.syncQueueIndexBySongId(targetSong.id);
  }
}

function syncDurationFromAudio() {
  const active = getActiveAudio();
  if (!active) return;
  const seconds = Number(active.duration || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  playerStore.setDurationMs(Math.floor(seconds * 1000));
}

async function loadDynamicCover(songId) {
  await loadDynamicCoverAsset(songId, ({url, isVideo}) => {
    dynamicCoverUrl.value = url || "";
    dynamicCoverIsVideo.value = Boolean(isVideo);
  });
}

function syncAudioVolume() {
  const active = getActiveAudio();
  const idle = getIdleAudio();
  if (automixAudioGraph.isReady() && automixAudioGraph.setMasterVolume(volume.value)) {
    if (active) active.volume = 1;
    if (idle) idle.volume = 1;
    return;
  }
  if (active) active.volume = volume.value;
  if (idle) {
    idle.volume = Math.min(Number(idle.volume || 0), Number(volume.value || 0));
  }
}

async function ensurePlaybackState() {
  const active = getActiveAudio();
  if (!active) return;
  const shouldPlay = playerStore.isPlaying || playerStore.autoPlayOnLoad;
  if (shouldPlay) {
    try {
      await active.play();
      playerStore.setPlaying(true);
      playerStore.autoPlayOnLoad = false;
    } catch {
      // play 失败不清除 autoPlayOnLoad，让下次 canplay 时重试
    }
  } else {
    active.pause();
  }
}

function togglePlay() {
  const active = getActiveAudio();
  const idle = getIdleAudio();
  if (!active || !hasSong.value) return;
  // 用户主动操作时，清除 autoPlayOnLoad 防止 ensurePlaybackState 自动恢复播放
  playerStore.autoPlayOnLoad = false;
  if (crossfadeActive && idle) {
    interruptAutomixForUserAction("pause-during-transition");
    const restoredActive = getActiveAudio();
    if (active.paused) {
      restoredActive?.play().catch(() => {
      });
    } else {
      restoredActive?.pause();
    }
    return;
  }
  if (active.paused) {
    active.play().catch(() => {
    });
  } else {
    active.pause();
  }
}

function onAmllLineClick(event) {
  const startTime = event?.line?.getLine?.()?.startTime;
  const active = getActiveAudio();
  if (!active || !Number.isFinite(startTime)) return;
  interruptAutomixForUserAction("lyric-seek");
  const targetSec = startTime / 1000;
  active.currentTime = targetSec;
  playerStore.setCurrentTimeMs(startTime);
  amllCurrentTimeMsRef.value = Math.max(0, Math.floor(startTime + AMLL_LYRIC_LEAD_MS));
}

function stopAmllClock() {
  if (!amllClockRafId) return;
  cancelAnimationFrame(amllClockRafId);
  amllClockRafId = 0;
}

function tickAmllClock() {
  const active = getActiveAudio();
  const safeMs = Math.max(0, Math.floor(Number(active?.currentTime || 0) * 1000));
  amllCurrentTimeMsRef.value = safeMs + AMLL_LYRIC_LEAD_MS;
  if (!amllOpened.value || !playerStore.isPlaying) {
    amllClockRafId = 0;
    return;
  }
  amllClockRafId = requestAnimationFrame(tickAmllClock);
}

function ensureAmllClock() {
  if (!amllOpened.value || !playerStore.isPlaying) {
    stopAmllClock();
    return;
  }
  if (amllClockRafId) return;
  amllClockRafId = requestAnimationFrame(tickAmllClock);
}


function seekByInput(event) {
  const active = getActiveAudio();
  if (!active) return;
  interruptAutomixForUserAction("timeline-seek");
  const nextMs = Number(event?.target?.value || 0);
  active.currentTime = nextMs / 1000;
  playerStore.setCurrentTimeMs(nextMs);
}

function interruptAutomixForUserAction(reason) {
  if (crossfadeActive || crossfadePreparing) {
    stopCrossfade();
    setCrossfadePreparingState(false);
  }
  autoMixEngine.cancelTransition(reason);
}

function changeVolume(event) {
  playerStore.setVolume(event?.target?.value);
  syncAudioVolume();
}

function cyclePlayMode() {
  playerStore.cyclePlayMode();
}

function prewarmLoopTransition(reason = "unknown") {
  if (!playerStore.automixEnabled) return false;
  const active = getActiveAudio();
  const analysis = getLastAutomixAnalysis();
  const transition = analysis?.transition;
  const currentTrackId = String(playerStore.currentSong?.id || "");
  if (!active || String(analysis?.currentTrackId || "") !== currentTrackId) return false;
  if (String(transition?.kind || "") !== "loop_bridge") return false;
  if (!automixAudioGraph.supportsSampleAccurateLoop()) return false;

  const prepared = automixAudioGraph.prepareLoopTransition(active, transition);
  if (prepared) {
    debugCrossfade("loopCaptureArmed", {
      reason,
      currentTrackId,
      loopStart: Number(transition.loop_start || 0),
      loopEnd: Number(transition.loop_end || 0),
    });
  }
  return prepared;
}

function requestAutomixWarmup(reason = "unknown") {
  warmupNextTrack()
    .then(() => {
      prewarmLoopTransition(reason);
      return prewarmCrossfadeDeck(reason);
    })
    .catch(() => {
      if (typeof console !== "undefined") {
        console.log("[AutoMix/Warmup] failed", {reason});
      }
    });
}

function toggleAutomix() {
  playerStore.toggleAutomixEnabled();
  if (playerStore.automixEnabled) {
    autoMixEngine.enable();
    autoMixEngine.setQueue(playerStore.playQueue);
    autoMixEngine.setCurrentTrack(playerStore.currentSong);
  } else {
    autoMixEngine.disable();
  }
  reportBehavior("TOGGLE_AUTOMIX", "global-player", {
    enabled: Boolean(playerStore.automixEnabled),
  });
  if (!playerStore.automixEnabled) {
    stopCrossfade();
  } else {
    requestAutomixWarmup("toggle-enabled");
  }
  if (typeof console !== "undefined") {
    console.log("[AutoMix] feature toggled", {
      enabled: Boolean(playerStore.automixEnabled),
    });
  }
}

function toggleLyricTranslate() {
  playerStore.toggleLyricTranslateEnabled();
}

function togglePlaylistPanel() {
  if (playlistPanelOpen.value) {
    closePlaylistPanel();
    return;
  }
  playerStore.togglePlaylistPanel();
  nextTick(prepareQueueWindow);
}

function closePlaylistPanel() {
  cancelQueueEffects();
  resetQueueSwipe();
  playerStore.setPlaylistPanelOpen(false);
}

function setQueueRowRef(queueEntryId, element) {
  const entryId = String(queueEntryId || "").trim();
  if (!entryId) return;
  if (element instanceof HTMLElement) {
    queueRowRefs.set(entryId, element);
  } else {
    queueRowRefs.delete(entryId);
  }
}

function syncQueueViewport(element = queueListRef.value) {
  if (!element) return;
  queueScrollTop.value = Math.max(0, Number(element.scrollTop) || 0);
  queueViewportHeight.value = Math.max(1, Number(element.clientHeight) || 520);
}

function onQueueListScroll(event) {
  syncQueueViewport(event.currentTarget);
}

function prepareQueueWindow() {
  const element = queueListRef.value;
  if (!element) return;
  queueViewportHeight.value = Math.max(1, Number(element.clientHeight) || 520);

  if (!queueVirtualized.value || currentQueueIndex.value < 0) {
    syncQueueViewport(element);
    return;
  }

  const centeredTop = currentQueueIndex.value * QUEUE_ROW_HEIGHT_PX
    - element.clientHeight / 2
    + QUEUE_ROW_HEIGHT_PX / 2;
  const maxTop = Math.max(
    0,
    playQueue.value.length * QUEUE_ROW_HEIGHT_PX - element.clientHeight,
  );
  element.scrollTop = Math.min(maxTop, Math.max(0, centeredTop));
  syncQueueViewport(element);
}

function updateQueueDissolvingEntry(entryId, dissolving) {
  const next = new Set(queueDissolvingEntryIds.value);
  if (dissolving) next.add(entryId);
  else next.delete(entryId);
  queueDissolvingEntryIds.value = next;
}

function queueEffectsBusy() {
  return queueMutationLocked.value || crossfadeActive || crossfadePreparing;
}

function queueParticleColors() {
  const toRgba = (channels, alpha) =>
    `rgba(${channels.join(", ")}, ${alpha})`;
  return [
    toRgba(themeBaseRgb.value, 0.56),
    toRgba(themeAccentRgb.value, 0.46),
    toRgba(themeGlowRgb.value, 0.36),
    "rgba(255, 255, 255, 0.72)",
    "rgba(226, 232, 240, 0.42)",
  ];
}

function queueRowSwipeStyle(queueEntryId) {
  if (queueSwipe.value.entryId !== queueEntryId || !queueSwipe.value.offsetX) {
    return undefined;
  }
  return {transform: `translate3d(${queueSwipe.value.offsetX}px, 0, 0)`};
}

function releaseQueuePointerCapture(pointerId = queueSwipe.value.pointerId) {
  const target = queuePointerCaptureTarget;
  queuePointerCaptureTarget = null;
  if (!target || pointerId === null || pointerId === undefined) return;
  try {
    if (target.hasPointerCapture?.(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
  } catch {
    // Pointer capture may already have been released by the browser.
  }
}

function resetQueueSwipe() {
  releaseQueuePointerCapture();
  queueSwipe.value = {
    entryId: "",
    pointerId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    dragging: false,
  };
}

function onQueueRowPointerDown(event, song, index) {
  if (
    queueEffectsBusy() ||
    index === currentQueueIndex.value ||
    !song?.queueEntryId ||
    (event.pointerType === "mouse" && event.button !== 0)
  ) {
    return;
  }
  resetQueueSwipe();
  queueSwipe.value = {
    entryId: song.queueEntryId,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: 0,
    dragging: false,
  };
  queuePointerCaptureTarget = event.currentTarget || null;
  try {
    queuePointerCaptureTarget?.setPointerCapture?.(event.pointerId);
  } catch {
    queuePointerCaptureTarget = null;
  }
}

function onQueueRowPointerMove(event, song) {
  const swipe = queueSwipe.value;
  if (
    swipe.entryId !== song?.queueEntryId ||
    swipe.pointerId !== event.pointerId
  ) {
    return;
  }

  const deltaX = event.clientX - swipe.startX;
  const deltaY = event.clientY - swipe.startY;
  if (!swipe.dragging) {
    if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
      queueClickSuppressedUntil = Date.now() + 360;
      resetQueueSwipe();
      return;
    }
    if (Math.abs(deltaX) < 6 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
  }

  event.preventDefault();
  queueSwipe.value = {
    ...swipe,
    offsetX: Math.max(-88, Math.min(0, deltaX)),
    dragging: true,
  };
}

function onQueueRowPointerEnd(event, song, index) {
  const swipe = queueSwipe.value;
  if (
    swipe.entryId !== song?.queueEntryId ||
    swipe.pointerId !== event.pointerId
  ) {
    return;
  }
  if (swipe.dragging) {
    event.preventDefault();
    queueClickSuppressedUntil = Date.now() + 360;
  }
  if (
    swipe.dragging &&
    swipe.offsetX <= -56 &&
    index !== currentQueueIndex.value
  ) {
    void removeQueuedSong(song, {direction: "left"});
  }
  resetQueueSwipe();
}

function onQueueRowPointerCancel(event, song) {
  if (
    queueSwipe.value.entryId !== song?.queueEntryId ||
    queueSwipe.value.pointerId !== event.pointerId
  ) {
    return;
  }
  resetQueueSwipe();
}

function onQueueRowClickCapture(event) {
  if (Date.now() >= queueClickSuppressedUntil) return;
  event.preventDefault();
  event.stopPropagation();
}

function onQueueSongClick(index) {
  if (Date.now() < queueClickSuppressedUntil || queueMutationLocked.value) return;
  void playSongAtIndex(index);
}

function beginQueueEffectRun() {
  queueEffectAbortController?.abort();
  const controller = new AbortController();
  queueEffectAbortController = controller;
  return controller;
}

function finishQueueEffectRun(controller) {
  if (queueEffectAbortController === controller) {
    queueEffectAbortController = null;
  }
}

function cancelQueueEffects() {
  queueEffectAbortController?.abort();
  queueEffectAbortController = null;
}

async function removeQueuedSong(song, {direction = "right"} = {}) {
  const entryId = String(song?.queueEntryId || "").trim();
  const targetIndex = playQueue.value.findIndex(
    (item) => item?.queueEntryId === entryId,
  );
  if (
    !entryId ||
    targetIndex < 0 ||
    targetIndex === currentQueueIndex.value ||
    queueEffectsBusy()
  ) {
    return false;
  }

  const row = queueRowRefs.get(entryId);
  const controller = beginQueueEffectRun();
  updateQueueDissolvingEntry(entryId, true);
  let effectResult = null;
  try {
    let effect = Promise.resolve(null);
    let layoutReady = Promise.resolve();
    try {
      effect = dissolveElement(row, {
        preset: "harmony-row",
        duration: 520,
        particleCount: 52,
        direction,
        distance: 64,
        colors: queueParticleColors(),
        keepSourceHidden: true,
        zIndex: 4100,
        signal: controller.signal,
      });
      layoutReady = effect.layoutReady || layoutReady;
    } catch {
      // The queue mutation remains usable if the optional visual effect fails.
    }
    await layoutReady.catch(() => null);
    const removed = playerStore.removeQueueEntry(entryId);
    effectResult = await effect.catch(() => null);
    return removed;
  } finally {
    effectResult?.restoreSource?.();
    updateQueueDissolvingEntry(entryId, false);
    finishQueueEffectRun(controller);
  }
}

async function clearQueuedSongs() {
  if (queueEffectsBusy() || playQueue.value.length <= 1) return;
  const currentEntryId = playQueue.value[currentQueueIndex.value]?.queueEntryId;
  if (!currentEntryId) return;

  resetQueueSwipe();
  const targets = playQueue.value.filter(
    (song) => song?.queueEntryId && song.queueEntryId !== currentEntryId,
  );
  const firstRow = queueRowRefs.get(currentEntryId) ||
    queueRowRefs.get(targets[0]?.queueEntryId);
  const listRect = firstRow?.closest?.(".queue-list")?.getBoundingClientRect();
  const visibleTargets = targets
    .filter((song) => {
      const rect = queueRowRefs.get(song.queueEntryId)?.getBoundingClientRect();
      if (!rect || !listRect) return false;
      return rect.bottom > listRect.top && rect.top < listRect.bottom;
    })
    .slice(0, 6);

  const controller = beginQueueEffectRun();
  queueClearing.value = true;
  const effectResults = [];
  try {
    const effects = visibleTargets.map((song, index) => {
      try {
        return dissolveElement(queueRowRefs.get(song.queueEntryId), {
          preset: "harmony-row",
          duration: 540,
          delay: prefersReducedMotion.value ? 0 : Math.min(index * 24, 120),
          particleCount: 36,
          direction: "right",
          distance: 62,
          colors: queueParticleColors(),
          keepSourceHidden: true,
          zIndex: 4100,
          signal: controller.signal,
        });
      } catch {
        return Promise.resolve(null);
      }
    });
    await Promise.all(
      effects.map((effect) => effect.layoutReady?.catch(() => null)),
    );
    playerStore.clearQueueExceptCurrent();
    const results = await Promise.all(effects.map((effect) => effect.catch(() => null)));
    effectResults.push(...results);
  } finally {
    effectResults.forEach((result) => result?.restoreSource?.());
    queueClearing.value = false;
    finishQueueEffectRun(controller);
  }
}

function onClickMoreAutomix() {
  toggleAutomix();
}

function onClickMoreLyricTranslate() {
  toggleLyricTranslate();
}

function onClickMorePlayMode() {
  cyclePlayMode();
}

function onClickMorePlaylist() {
  togglePlaylistPanel();
  closeMorePanel();
}


function onLoadedMetadata() {
  syncDurationFromAudio();
  syncAudioVolume();
  scheduleMediaSessionPositionStateUpdate();
  if (playerStore.autoPlayOnLoad) {
    ensurePlaybackState();
  }
}

function onDurationChange() {
  syncDurationFromAudio();
  scheduleMediaSessionPositionStateUpdate();
}

function onTimeUpdate(event) {
  if (!isEventFromActiveDeck(event)) return;
  const active = getActiveAudio();
  if (!active) return;
  if (!crossfadeActive) {
    const currentSec = Number(active.currentTime || 0);
    tryStartAutomixCrossfade(currentSec).catch(() => {
      // ignore crossfade failure, fallback to default ended behavior
    });
  }
  syncDurationFromAudio();
  playerStore.setCurrentTimeMs(Math.floor((active.currentTime || 0) * 1000));
  scheduleMediaSessionPositionStateUpdate();
}

// 🔧 性能优化：节流 timeUpdate 事件（每 100ms 最多触发一次）
const throttledOnTimeUpdate = rafThrottle(onTimeUpdate);

function onPlay(event) {
  if (!isEventFromActiveDeck(event)) return;
  if (playerStore.automixEnabled) {
    autoMixEngine.enable();
    autoMixEngine.setQueue(playerStore.playQueue);
    autoMixEngine.setCurrentTrack(playerStore.currentSong);
    autoMixEngine.resume();
  }
  automixAudioGraph.resume().then((ready) => {
    if (ready) syncAudioVolume();
  }).catch(() => {});
  playerStore.setPlaying(true);
  setupMediaSessionHandlers({force: isIOSDevice.value});
  startRhythmLoop();
  updateMediaSessionPlaybackState();
  requestAutomixWarmup("audio-play");
  reportCurrentPlayRecord({started: true});
}

function onPause(event) {
  if (!isEventFromActiveDeck(event)) return;
  // ✅ crossfade 进行中或刚完成时，忽略来自 deck 切换产生的 pause 事件
  if (crossfadeActive || crossfadePreparing) return;
  playerStore.setPlaying(false);
  autoMixEngine.pause();
  stopRhythmLoop();
  updateMediaSessionPlaybackState();
  resetRhythmVisual();
  reportCurrentPlayRecord({completed: false});
}

function updatePlayerSpaceVar() {
  const el = playerRootRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const bottom = Number.parseFloat(getComputedStyle(el).bottom || "0") || 0;
  const safeSpace = Math.ceil(rect.height + bottom);
  document.documentElement.style.setProperty(
    "--global-player-space",
    `${safeSpace}px`,
  );
  if (morePanelOpen.value) {
    updateMorePanelPosition();
  }
}

async function onEnded(event) {
  if (!isEventFromActiveDeck(event)) return;
  let active = getActiveAudio();
  if (!active) return;
  if (crossfadeActive) return;

  // A cold CDN response can finish a fraction after the outgoing media fires
  // `ended`. Give the already-running deck preparation a brief chance to take
  // ownership instead of racing it with the ordinary hard-switch path.
  if (crossfadePreparing) {
    const waitStartedAt = performance.now();
    while (crossfadePreparing && performance.now() - waitStartedAt < 1600) {
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }
    if (crossfadeActive || !isEventFromActiveDeck(event)) return;
    active = getActiveAudio();
    if (!active) return;
  }

  reportCurrentPlayRecord({completed: true});

  if (playerStore.playMode === PLAY_MODE.SINGLE && hasSong.value) {
    active.currentTime = 0;
    active.play().catch(() => {
    });
    return;
  }

  const played = await playQueueByDirection("next", {trigger: "ended"});
  if (!played) {
    playerStore.setPlaying(false);
  }
}

function onAudioError(event) {
  if (!isEventFromActiveDeck(event) || !playerStore.currentSong?.id || !currentSongUrl.value) return;

  const mediaErrorCode = Number(event?.target?.error?.code || 0);
  const songId = playerStore.currentSong.id;
  const songNameCopy = String(playerStore.currentSong.name || "").trim();
  const songLabel = songNameCopy ? `《${songNameCopy}》` : "当前歌曲";

  clearSongPlayableUrlCache(songId);
  playerStore.autoPlayOnLoad = false;
  playerStore.setPlaying(false);

  if (mediaErrorCode === 2) {
    showPlaybackNotice({
      kind: "network",
      eyebrow: "CONNECTION",
      title: "播放连接中断",
      message: `${songLabel}的音频加载失败，请检查网络连接后重试。`,
      dedupeKey: `media-network:${songId}`,
    });
    return;
  }

  showPlaybackNotice({
    kind: "unavailable",
    eyebrow: "AUDIO SOURCE",
    title: mediaErrorCode === 3 ? "当前音频无法解码" : "音源暂时不可用",
    message: `${songLabel}的播放链接可能已失效，重新点击歌曲时会自动获取新地址。`,
    dedupeKey: `media-source:${songId}:${mediaErrorCode}`,
  });
}

watch(
  hasSong,
  (has) => {
    if (has) prepareLyricPage();
  },
  {immediate: true},
);

watch(
  currentSongUrl,
  async () => {
    const nextSrc = String(currentSongUrl.value || "");
    const promotedByCrossfade = skipAudioResetOnNextSrcChange;
    skipAudioResetOnNextSrcChange = false;
    debugCrossfade("audioSrcWatch", {
      promotedByCrossfade,
      nextAudioSrc: nextSrc.slice(0, 120),
      pendingPromotedStartSec,
      currentSongId: String(playerStore.currentSong?.id || ""),
      activeDeck,
      activeCurrentTime: Number(getActiveAudio()?.currentTime || 0).toFixed(3),
    });
    if (!promotedByCrossfade) {
      stopCrossfade({ keepCoverOverlay: false });
    } else {
      const promotedSec = pendingPromotedStartSec;
      pendingPromotedStartSec = -1;
      const active = getActiveAudio();
      if (active && Number.isFinite(promotedSec) && promotedSec > 0) {
        const drift = Math.abs((active.currentTime || 0) - promotedSec);
        if (drift > 0.45) {
          active.currentTime = promotedSec;
          debugCrossfade("audioSrcWatchSeekCorrection", {
            promotedSec,
            drift,
            correctedCurrentTime: Number(active.currentTime || 0).toFixed(3),
          });
        }
      }
      syncAudioVolume();
      await ensurePlaybackState();
      startRhythmLoop();
      updateMediaSessionPlaybackState();
      updateMediaSessionPositionState();
      suppressTrackSwapAnimation.value = false;
      crossfadeTriggeredForSongId = null;
      return;
    }
    crossfadeTriggeredForSongId = null;
    if (!promotedByCrossfade) {
      clearPrewarmed();
    }
    if (!promotedByCrossfade) {
      resetRhythmVisual();
    }
    resetRhythmEnergy();
    if (!promotedByCrossfade) {
      resetRhythmEnergy();
    }
    if (!promotedByCrossfade) {
      playerStore.setDurationMs(0);
      playerStore.setCurrentTimeMs(0);
      amllCurrentTimeMsRef.value = AMLL_LYRIC_LEAD_MS;
    }
    await nextTick();
    const active = getActiveAudio();
    if (active) {
      if (!nextSrc) {
        active.pause();
        active.removeAttribute("src");
        active.load();
      } else if (active.getAttribute("src") !== nextSrc) {
        active.src = nextSrc;
        active.load();
      }
    }
    syncAudioVolume();
    await ensurePlaybackState();
    startRhythmLoop();
    ensureAmllClock();
    if (promotedByCrossfade) {
      requestAnimationFrame(() => {
        suppressTrackSwapAnimation.value = false;
      });
    }
  },
  { immediate: true },
);

watch(
  () => playerStore.currentSong?.id,
  async (songId) => {
    resetPlayRecordCache();
    closeMorePanel();
    setupMediaSessionHandlers({force: isIOSDevice.value});
    loadDynamicCover(songId);
    loadCurrentSongLyric(songId);
    amllAlbum.value = "";
    amllHideLyricView.value = false;
    amllCurrentTimeMsRef.value = Math.max(0, currentTimeMs.value + AMLL_LYRIC_LEAD_MS);
    updateMediaSessionMetadata();
    updateMediaSessionPlaybackState();
    updateMediaSessionPositionState();
    requestAutomixWarmup("song-changed");
  },
  {immediate: true},
);

watch(
  morePanelOpen,
  (opened) => {
    if (!opened) return;
    nextTick(() => {
      updateMorePanelPosition();
    });
  },
);

watch([songName, normalizedArtistList, coverUrl, dynamicCoverUrl], () => {
  updateMediaSessionMetadata();
});

watch(
  coverUrl,
  (nextCover) => {
    if (skipNextCoverThemePick) {
      skipNextCoverThemePick = false;
      return;
    }
    if (crossfadeActive || crossfadePreparing) return;
    pickThemeFromCover(nextCover, songName.value, applyTheme);
  },
  {immediate: true},
);

watch(
  () => playerStore.isPlaying,
  () => {
    setupMediaSessionHandlers({force: isIOSDevice.value});
    const active = getActiveAudio();
    if (active) {
      if (playerStore.isPlaying && active.paused && active.src) {
        active.play().catch(() => {});
      } else if (!playerStore.isPlaying && !active.paused) {
        active.pause();
      }
    }
    updateMediaSessionPlaybackState();
    if (playerStore.isPlaying) {
      startRhythmLoop();
      ensureAmllClock();
    } else {
      stopRhythmLoop();
      stopAmllClock();
      resetRhythmVisual();
    }
  },
);

watch(
  amllOpened,
  (opened) => {
    if (!opened) {
      stopAmllClock();
      amllCurrentTimeMsRef.value = Math.max(0, currentTimeMs.value + AMLL_LYRIC_LEAD_MS);
      return;
    }
    ensureAmllClock();
  },
);

watch(
  currentTimeMs,
  (next) => {
    if (amllOpened.value) return;
    amllCurrentTimeMsRef.value = Math.max(0, next + AMLL_LYRIC_LEAD_MS);
  },
  {immediate: true},
);

watch(
  automixEnabled,
  (enabled) => {
    if (!enabled) {
      autoMixEngine.disable();
      stopCrossfade();
      return;
    }
    autoMixEngine.enable();
    autoMixEngine.setQueue(playerStore.playQueue);
    autoMixEngine.setCurrentTrack(playerStore.currentSong);
    requestAutomixWarmup("automix-watch-enabled");
  },
);

watch(
  lyricTranslateEnabled,
  () => {
    loadCurrentSongLyric(playerStore.currentSong?.id);
  },
);

watch(
  [
    () => playerStore.playQueue
      .map((item) => String(item?.queueEntryId || item?.id || ""))
      .join("|"),
    currentQueueIndex,
    () => playerStore.playMode,
  ],
  () => {
    autoMixEngine.setQueue(playerStore.playQueue);
    autoMixEngine.setCurrentTrack(playerStore.currentSong);
    setupMediaSessionHandlers({force: isIOSDevice.value});
    requestAutomixWarmup("queue-or-mode-changed");
  },
);

watch([currentTimeMs, durationMs], () => {
  scheduleMediaSessionPositionStateUpdate();
});

onMounted(() => {
  if (playerStore.automixEnabled) {
    autoMixEngine.enable();
    autoMixEngine.setQueue(playerStore.playQueue);
    autoMixEngine.setCurrentTrack(playerStore.currentSong);
  } else {
    autoMixEngine.disable();
  }
  isIOSDevice.value = detectIOSDevice();
  setAudioSessionPlaybackMode();
  setupMediaSessionHandlers();
  updateMediaSessionMetadata();
  updateMediaSessionPlaybackState();
  updateMediaSessionPositionState();

  applyFallbackTheme("global-player");
  updatePlayerSpaceVar();
  playerResizeObserver = new ResizeObserver(() => {
    updatePlayerSpaceVar();
  });
  if (playerRootRef.value) {
    playerResizeObserver.observe(playerRootRef.value);
  }
  window.addEventListener("resize", updatePlayerSpaceVar);
  automixProfileReadyHandler = () => requestAutomixWarmup("analysis-profile-ready");
  window.addEventListener("aurora:automix-profile-ready", automixProfileReadyHandler);

  visibilityChangeHandler = () => {
    if (typeof document === "undefined") return;
    if (document.hidden) {
      if (backgroundCheckTimer) clearInterval(backgroundCheckTimer);
      const active = getActiveAudio();
      if (!active) return;
      backgroundCheckTimer = setInterval(() => {
        if (document.hidden && playerStore.isPlaying && active) {
          const currentTime = Number(active.currentTime || 0);
          const duration = Number(active.duration || 0);
          if (duration > 0 && currentTime >= duration - 0.2) {
            onEnded({target: active});
          }
        }
      }, 500);
      return;
    }
    if (backgroundCheckTimer) {
      clearInterval(backgroundCheckTimer);
      backgroundCheckTimer = null;
    }
    const active = getActiveAudio();
    if (!active || !hasSong.value) return;
    const shouldPlay = playerStore.isPlaying || playerStore.autoPlayOnLoad;
    if (shouldPlay && active.paused) {
      active.play().catch(() => {});
    }
  };
  document.addEventListener("visibilitychange", visibilityChangeHandler);

  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
  ) {
    mediaQueryMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    mediaQueryMotionHandler = () => {
      prefersReducedMotion.value = Boolean(mediaQueryMotion?.matches);
      if (prefersReducedMotion.value) {
        stopRhythmLoop();
        resetRhythmVisual();
        resetRhythmEnergy();
      } else if (playerStore.isPlaying) {
        startRhythmLoop();
      }
    };
    mediaQueryMotionHandler();
    if (typeof mediaQueryMotion.addEventListener === "function") {
      mediaQueryMotion.addEventListener("change", mediaQueryMotionHandler);
    } else if (typeof mediaQueryMotion.addListener === "function") {
      mediaQueryMotion.addListener(mediaQueryMotionHandler);
    }
  }
});

onBeforeUnmount(() => {
  autoMixEngine.cancelAnalysis();
  stopAutomixRuntimeSubscription?.();
  stopAutomixRuntimeSubscription = null;
  cancelQueueEffects();
  queueRowRefs.clear();
  resetQueueSwipe();
  clearMediaSessionHandlers();
  stopCrossfade();
  disposeRhythmAnalyzer();
  automixAudioGraph.dispose();
  disposeFullscreenTransition();
  disposeLyricOverlay();
  stopAmllClock();
  clearScheduledPositionStateUpdate();
  if (automixProfileReadyHandler) {
    window.removeEventListener("aurora:automix-profile-ready", automixProfileReadyHandler);
    automixProfileReadyHandler = null;
  }

  // 🔧 性能优化：清理所有定时器和监听器
  memoryManager.cleanup();

  if (mediaQueryMotion) {
    if (mediaQueryMotionHandler) {
      if (typeof mediaQueryMotion.removeEventListener === "function") {
        mediaQueryMotion.removeEventListener("change", mediaQueryMotionHandler);
      } else if (typeof mediaQueryMotion.removeListener === "function") {
        mediaQueryMotion.removeListener(mediaQueryMotionHandler);
      }
    }
    mediaQueryMotion = null;
    mediaQueryMotionHandler = null;
  }

  if (playerResizeObserver) {
    playerResizeObserver.disconnect();
    playerResizeObserver = null;
  }
  window.removeEventListener("resize", updatePlayerSpaceVar);
  if (visibilityChangeHandler) {
    document.removeEventListener("visibilitychange", visibilityChangeHandler);
    visibilityChangeHandler = null;
  }
  if (backgroundCheckTimer) {
    clearInterval(backgroundCheckTimer);
    backgroundCheckTimer = null;
  }
});
</script>

<style scoped>
.player-root {
  bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
}

.player-shell {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: min(calc(100vw - 20px), 1380px);
  margin-inline: auto;
  border-radius: 22px;
  pointer-events: auto;
  border: 1px solid rgba(var(--player-border), var(--player-border-alpha));
  background: radial-gradient(
    120% 140% at 12% 12%,
    rgba(var(--player-glow), calc(var(--player-glow-alpha) * 0.9)) 0%,
    rgba(var(--player-glow), 0) 56%
  ),
  linear-gradient(
    128deg,
    rgba(var(--player-base), 0.88) 0%,
    rgba(var(--player-accent), 0.94) 100%
  );
  background-size: 170% 180%,
  100% 100%;
  background-position: 2% 8%,
  50% 50%;
  box-shadow:
    0 18px 54px rgba(15, 23, 42, calc(var(--player-shadow-alpha) + 0.08)),
    0 3px 12px rgba(15, 23, 42, 0.18),
    inset 0 1px 0 rgba(var(--player-fg), 0.12);
  backdrop-filter: blur(22px);
  filter: saturate(var(--player-sat)) brightness(var(--player-brightness));
  transition: background 320ms ease,
  border-color 240ms ease,
  filter 180ms ease,
  box-shadow 200ms ease;
  animation: player-shell-drift 18s ease-in-out infinite alternate;
}

@media (min-width: 640px) {
  .player-root {
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  }

  .player-shell {
    width: min(calc(100vw - 40px), 1380px);
    border-radius: 24px;
  }
}

.player-desktop-layout {
  min-height: 78px;
  grid-template-columns: minmax(250px, 0.95fr) auto minmax(280px, 1.45fr) auto;
  align-items: center;
  gap: clamp(14px, 1.6vw, 28px);
  padding-inline: 20px;
}

.player-desktop-track,
.player-desktop-transport,
.player-desktop-timeline,
.player-desktop-volume {
  min-width: 0;
  display: flex;
  align-items: center;
}

.player-desktop-transport {
  flex: none;
  gap: 9px;
}

.player-desktop-timeline {
  gap: 10px;
  font-size: 11px;
}

.player-desktop-volume {
  justify-content: flex-end;
  gap: 9px;
}

.player-track-copy {
  overflow: hidden;
}

.player-track-title {
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.player-time {
  width: 38px;
  flex: none;
  color: rgba(var(--player-fg-muted), 0.9);
  font-variant-numeric: tabular-nums;
}

.player-cover-button {
  flex: none;
  border: 1px solid rgba(var(--player-fg), 0.14);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.22);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.player-cover-button:hover {
  transform: translateY(-1px) scale(1.025);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.3);
}

@media (min-width: 1024px) and (max-width: 1199px) {
  .player-desktop-layout {
    grid-template-columns: minmax(210px, 0.9fr) auto minmax(220px, 1.2fr) auto;
    gap: 12px;
    padding-inline: 14px;
  }

  .player-desktop-transport,
  .player-desktop-volume {
    gap: 6px;
  }

  .player-desktop-volume .player-range {
    width: 64px;
  }
}

.player-shell-idle {
  animation-play-state: paused;
}

.player-shell-idle::before,
.player-shell-idle::after {
  animation-play-state: paused;
}

.player-shell-crossfading {
  box-shadow: 0 20px 58px rgba(15, 23, 42, calc(var(--player-shadow-alpha) + 0.16)),
  0 0 0 1px rgba(var(--player-fg), 0.22);
  filter: saturate(calc(var(--player-sat) + 0.18)) brightness(calc(var(--player-brightness) + 0.08));
  animation: player-shell-drift 8s ease-in-out infinite alternate;
}

@media (max-width: 768px) {
  .player-shell {
    animation: none;
  }
}

.player-shell::before,
.player-shell::after {
  content: "";
  position: absolute;
  inset: -30%;
  pointer-events: none;
  z-index: 0;
  transition: opacity 220ms ease,
  transform 240ms ease;
}

.player-shell::before {
  background: radial-gradient(
    34% 36% at 24% 30%,
    rgba(var(--player-glow), calc(var(--player-glow-alpha) * 0.8)) 0%,
    rgba(var(--player-glow), 0) 72%
  ),
  radial-gradient(
    30% 34% at 76% 64%,
    rgba(var(--player-accent), calc(var(--player-glow-alpha) * 0.64)) 0%,
    rgba(var(--player-accent), 0) 76%
  );
  opacity: 0.78;
  transform: scale(var(--player-aura-scale));
  mix-blend-mode: screen;
  animation: player-aura-drift-a 14s ease-in-out infinite alternate;
}

.player-shell::after {
  background: radial-gradient(
    60% 42% at 52% 14%,
    rgba(var(--player-fg), 0.16) 0%,
    rgba(var(--player-fg), 0) 74%
  );
  opacity: 0.6;
  animation: player-aura-drift-b 22s ease-in-out infinite alternate-reverse;
}

.player-shell > * {
  position: relative;
  z-index: 1;
}

.player-text-primary {
  color: rgb(var(--player-fg));
}

.player-text-muted {
  color: rgba(var(--player-fg-muted), 0.92);
}

.player-separator {
  color: rgba(var(--player-separator), 0.85);
}

.player-link {
  color: rgba(var(--player-fg-muted), 0.95);
}

.player-link:hover {
  color: rgb(var(--player-fg));
}

.player-soft-btn {
  border: 1px solid rgba(var(--player-border), 0.34);
  color: rgba(var(--player-fg), 0.9);
  background: rgba(var(--player-fg), var(--player-soft-bg-alpha));
  transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease;
}

.player-soft-btn:hover {
  background: rgba(var(--player-fg), calc(var(--player-soft-bg-alpha) + 0.08));
  transform: translateY(-1px);
}

.player-main-btn {
  border: 1px solid rgba(var(--player-main-bg), 0.65);
  color: rgb(var(--player-main-fg));
  background: rgba(var(--player-main-bg), 0.96);
  box-shadow: 0 7px 18px rgba(15, 23, 42, 0.2);
  transition: transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}

.player-main-btn:hover {
  background: rgba(var(--player-main-bg), 0.88);
  transform: translateY(-1px) scale(1.025);
  box-shadow: 0 9px 22px rgba(15, 23, 42, 0.26);
}

.player-chip-btn {
  border: 1px solid rgba(var(--player-border), 0.34);
  color: rgba(var(--player-fg), 0.9);
  background: rgba(var(--player-fg), 0.1);
}

.player-chip-btn:hover {
  background: rgba(var(--player-fg), 0.18);
}

.player-side-menu {
  display: grid;
  place-items: center;
}

.more-dialog-backdrop {
  background: transparent;
}

.more-dialog-panel {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem;
  border-radius: 14px;
  border: 1px solid rgba(var(--more-border), 0.24);
  background: rgba(var(--more-bg), 0.94);
  color: rgba(var(--more-fg), 0.95);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(16px);
  z-index: 1002;
}

.more-dialog-btn {
  border: 1px solid rgba(var(--more-border), 0.26);
  color: rgba(var(--more-fg), 0.94);
  background: rgba(var(--more-fg), 0.08);
}

.more-dialog-btn:hover {
  background: rgba(var(--more-fg), 0.14);
}

.more-dialog-enter-active,
.more-dialog-leave-active {
  transition: opacity 0.18s ease;
}

.more-dialog-enter-from,
.more-dialog-leave-to {
  opacity: 0;
}

.more-dialog-enter-active .more-dialog-panel,
.more-dialog-leave-active .more-dialog-panel {
  transition: opacity 0.2s ease,
  transform 0.2s ease;
}

.more-dialog-enter-from .more-dialog-panel,
.more-dialog-leave-to .more-dialog-panel {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.player-range {
  --range-progress: 0%;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(var(--player-fg), 0.88) 0%,
    rgba(var(--player-fg), 0.88) var(--range-progress),
    rgba(var(--player-fg), 0.22) var(--range-progress),
    rgba(var(--player-fg), 0.22) 100%
  );
  accent-color: rgba(var(--player-main-bg), 0.95);
  transition: filter 160ms ease;
}

.player-range:hover {
  filter: brightness(1.08);
}

.player-range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: transparent;
}

.player-range::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  margin-top: -5px;
  appearance: none;
  border: 3px solid rgba(var(--player-main-bg), 0.98);
  border-radius: 999px;
  background: rgb(var(--player-main-fg));
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.28);
}

.player-range::-moz-range-track {
  height: 4px;
  border: 0;
  border-radius: 999px;
  background: transparent;
}

.player-range::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border: 3px solid rgba(var(--player-main-bg), 0.98);
  border-radius: 999px;
  background: rgb(var(--player-main-fg));
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.28);
}

.player-range:focus-visible,
.player-soft-btn:focus-visible,
.player-main-btn:focus-visible,
.player-chip-btn:focus-visible,
.player-cover-button:focus-visible {
  outline: 2px solid rgba(var(--player-fg), 0.9);
  outline-offset: 3px;
}

.cover-stack {
  position: relative;
  height: 100%;
  width: 100%;
}

.cover-media {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.cover-crossfade-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 90ms linear;
}

.track-swap-enter-active,
.track-swap-leave-active {
  transition: opacity 0.2s ease,
  transform 0.24s ease;
}

.track-swap-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}

.track-swap-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.track-swap-none-enter-active,
.track-swap-none-leave-active {
  transition: none;
}

.track-swap-none-enter-from,
.track-swap-none-leave-to {
  opacity: 1;
  transform: none;
}

.playlist-dialog-enter-active,
.playlist-dialog-leave-active {
  transition: opacity 0.22s ease;
}

.playlist-dialog-enter-from,
.playlist-dialog-leave-to {
  opacity: 0;
}

.playlist-dialog-enter-active .playlist-dialog-panel,
.playlist-dialog-leave-active .playlist-dialog-panel {
  transition: transform 0.22s ease,
  opacity 0.22s ease;
}

.playlist-dialog-enter-from .playlist-dialog-panel,
.playlist-dialog-leave-to .playlist-dialog-panel {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}

.queue-row-content {
  touch-action: pan-y;
  user-select: none;
}

.queue-row {
  content-visibility: auto;
  contain-intrinsic-size: auto 52px;
}

.queue-item-move,
.queue-item-enter-active,
.queue-item-leave-active {
  transition: opacity 0.28s ease,
  transform 0.36s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.queue-item-enter-from,
.queue-item-leave-to {
  opacity: 0;
  transform: translateX(28px) scale(0.98);
}

.queue-item-leave-active {
  position: absolute;
  left: 0.5rem;
  right: 0.5rem;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .queue-item-move,
  .queue-item-enter-active,
  .queue-item-leave-active {
    transition-duration: 0.12s;
  }
}

.artist-marquee {
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  white-space: nowrap;
  mask-image: linear-gradient(90deg, #000 0%, #000 88%, transparent 100%);
}

@media (max-width: 639px) {
  .artist-marquee {
    width: min(210px, 54vw);
  }
}

:deep(.player-artist-links) {
  max-width: 100%;
  flex-wrap: nowrap;
  overflow: hidden;
  white-space: nowrap;
  mask-image: linear-gradient(90deg, #000 0%, #000 88%, transparent 100%);
}

.artist-marquee-track {
  display: inline-flex;
  min-width: max-content;
  gap: 2rem;
  animation: artist-marquee 18s linear infinite;
}

.artist-marquee-segment {
  min-width: max-content;
}

.artist-marquee-track span {
  display: inline-block;
}

.artist-marquee-link {
  background: transparent;
  border: 0;
  padding: 0;
  font: inherit;
  line-height: inherit;
  color: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: color 180ms ease;
}

.artist-marquee-link:hover {
  color: rgb(var(--player-fg));
  text-decoration: underline;
}

@keyframes artist-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(-50% - 1rem));
  }
}

@keyframes player-shell-drift {
  0% {
    background-position: 2% 8%,
    50% 50%;
  }
  100% {
    background-position: 26% -2%,
    50% 50%;
  }
}

@keyframes player-aura-drift-a {
  0% {
    transform: translate3d(-2.2%, -1.6%, 0) scale(var(--player-aura-scale));
  }
  100% {
    transform: translate3d(2.4%, 1.8%, 0) scale(calc(var(--player-aura-scale) * 1.06));
  }
}

@keyframes player-aura-drift-b {
  0% {
    transform: translate3d(1.8%, -1.1%, 0);
    opacity: 0.52;
  }
  100% {
    transform: translate3d(-1.8%, 1.9%, 0);
    opacity: 0.7;
  }
}

@media (prefers-reduced-motion: reduce) {
  .player-shell,
  .player-shell::before,
  .player-shell::after,
  .artist-marquee-track {
    animation: none;
  }
}

:deep(.amll-wrapper) {
  background-color: #222;
  z-index: 2000;
}

:deep(.amll-prebuilt) {
  background-color: #222;
}

:deep(.amll-prebuilt__overlay) {
  pointer-events: none !important;
}

:deep(.amll-prebuilt__vertical-mobile-controls),
:deep(.amll-prebuilt__bar),
:deep(.amll-prebuilt__volumeRow),
:deep(.amll-prebuilt__controls) {
  position: relative;
  z-index: 3;
  pointer-events: auto;
}

:deep(.amll-prebuilt__nowPlayingSliderInner),
:deep(.amll-prebuilt__nowPlayingSliderThumb) {
  pointer-events: none;
}

:deep(.amll-prebuilt__rangeHit) {
  pointer-events: auto;
  touch-action: none;
  -webkit-appearance: none;
  appearance: none;
}
</style>
