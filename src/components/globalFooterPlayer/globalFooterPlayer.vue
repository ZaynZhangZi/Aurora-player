<template>
  <div
    ref="playerRootRef"
    class="fixed inset-x-0 bottom-0 z-[999] px-0"
    role="region"
    aria-label="全局播放器"
  >
    <div
      class="player-shell w-full rounded-none border-x-0 border-b-0"
      :class="{ 'player-shell-idle': !isPlaying, 'player-shell-crossfading': crossfadeVisualActive }"
      :style="playerStyle"
    >
      <div
        class="hidden h-[74px] grid-cols-[minmax(360px,1fr)_minmax(320px,520px)_minmax(180px,1fr)] items-center gap-3 px-4 lg:grid"
      >
        <div class="flex min-w-0 items-center gap-3">
          <Transition :name="trackSwapTransitionName" mode="out-in">
            <div :key="songTransitionKey" class="flex min-w-0 flex-1 items-center gap-3">
              <button
                class="h-12 w-12 overflow-hidden rounded-lg bg-white/20"
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
              <div class="min-w-0">
                <p class="player-text-primary truncate text-sm font-semibold">
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

          <div class="flex shrink-0 items-center gap-2.5">
            <button
              class="player-soft-btn grid h-7 w-7 place-items-center rounded-full transition disabled:opacity-50"
              type="button"
              :disabled="!canPlayPrev"
              @click="playPrevSong"
            >
              <BackwardIcon class="h-3.5 w-3.5"/>
            </button>
            <button
              class="player-main-btn grid h-9 w-9 place-items-center rounded-full transition disabled:opacity-40"
              type="button"
              :disabled="!hasSong"
              @click="togglePlay"
            >
              <PauseIcon v-if="isPlaying" class="h-[18px] w-[18px]"/>
              <PlayIcon v-else class="h-[18px] w-[18px]"/>
            </button>
            <button
              class="player-soft-btn grid h-7 w-7 place-items-center rounded-full transition disabled:opacity-50"
              type="button"
              :disabled="!canPlayNext"
              @click="playNextSong"
            >
              <ForwardIcon class="h-3.5 w-3.5"/>
            </button>
          </div>
        </div>

        <div class="player-text-muted flex h-full items-center gap-2 text-[11px]">
          <span class="w-10 text-right">{{ formatMs(currentTimeMs) }}</span>
          <input
            class="player-range h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
            type="range"
            min="0"
            :max="Math.max(durationMs, 1)"
            :value="Math.min(currentTimeMs, durationMs || 0)"
            @input="seekByInput"
          >
          <span class="w-10">{{ formatMs(durationMs) }}</span>
        </div>

        <div class="flex items-center justify-end gap-2">
          <div class="player-side-menu">
            <button
              ref="moreMenuButtonRef"
              class="player-chip-btn grid h-7 w-7 place-items-center rounded-full text-[11px] transition"
              type="button"
              aria-label="显示更多播放设置"
              @click="toggleMorePanel"
            >
              <EllipsisHorizontalIcon class="h-4 w-4"/>
            </button>
          </div>
          <SpeakerWaveIcon class="player-text-muted h-4 w-4"/>
          <input
            class="player-range h-1.5 w-24 cursor-pointer appearance-none rounded-full"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="volume"
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
            <div class="min-w-0 flex-1">
              <p class="player-text-primary truncate text-sm font-semibold">
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
                class="player-soft-btn grid h-7 w-7 place-items-center rounded-full disabled:opacity-50"
                type="button"
                :disabled="!canPlayPrev"
                @click="playPrevSong"
              >
                <BackwardIcon class="h-3.5 w-3.5"/>
              </button>
              <button
                class="player-main-btn grid h-8 w-8 place-items-center rounded-full"
                type="button"
                :disabled="!hasSong"
                @click="togglePlay"
              >
                <PauseIcon v-if="isPlaying" class="h-4 w-4"/>
                <PlayIcon v-else class="h-4 w-4"/>
              </button>
              <button
                class="player-soft-btn grid h-7 w-7 place-items-center rounded-full disabled:opacity-50"
                type="button"
                :disabled="!canPlayNext"
                @click="playNextSong"
              >
                <ForwardIcon class="h-3.5 w-3.5"/>
              </button>
            </div>
          </div>
        </Transition>

        <div class="flex max-w-[46vw] flex-wrap items-center justify-end gap-1 sm:gap-1.5">
          <button
            class="player-chip-btn rounded-full px-2 py-1 text-[10px]"
            type="button"
            @click="toggleAutomix"
          >
            {{ automixLabel }}
          </button>
          <button
            class="player-chip-btn rounded-full px-2 py-1 text-[10px]"
            type="button"
            @click="toggleLyricTranslate"
          >
            {{ lyricTranslateLabel }}
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
            @input="seekByInput"
          >
          <span class="w-9">{{ formatMs(durationMs) }}</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <AMLLWrapper
        v-if="amllMounted"
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
    </Teleport>

    <Teleport to="body">
      <Transition name="playlist-dialog">
        <div
          v-if="playlistPanelOpen"
          class="playlist-dialog-backdrop fixed inset-0 z-[1001] bg-black/35 p-4 backdrop-blur-[2px]"
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
              <button
                class="grid h-8 w-8 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100"
                type="button"
                @click="closePlaylistPanel"
              >
                <XMarkIcon class="h-4 w-4"/>
              </button>
            </div>

            <div class="max-h-[56vh] overflow-y-auto p-2">
              <button
                v-for="(song, index) in playQueue"
                :key="song.id || index"
                class="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition"
                :class="index === currentQueueIndex ? 'bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900' : 'text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5'"
                type="button"
                @click="playSongAtIndex(index)"
              >
                <span class="w-6 shrink-0 text-center text-[11px] font-bold opacity-50">{{
                    index + 1
                  }}</span>
                <span class="truncate text-[14px] font-semibold">{{
                    song.name || '未知歌曲'
                  }}</span>
              </button>
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

    <audio
      ref="audioRef"
      crossorigin="anonymous"
      playsinline
      webkit-playsinline="true"
      preload="auto"
      @loadedmetadata="onLoadedMetadata"
      @durationchange="onDurationChange"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
    />
    <audio
      ref="crossfadeAudioRef"
      crossorigin="anonymous"
      playsinline
      webkit-playsinline="true"
      preload="auto"
      @loadedmetadata="onLoadedMetadata"
      @durationchange="onDurationChange"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
    />
  </div>
</template>

<script setup>
import {XMarkIcon} from "@heroicons/vue/24/outline";
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
import {reportApi} from "@/api/reportApi/reportApi.js";
import {songsApi} from "@/api/songsApi/songsApi.js";
import ArtistLinks from "@/components/artistLinks/artistLinks.vue";
import {usePlayerLyric} from "@/composables/usePlayerLyric.js";
import {usePlayerLyricLoader} from "@/composables/usePlayerLyricLoader.js";
import {usePlayerThemeFromCover} from "@/composables/usePlayerThemeFromCover.js";
import {usePlayerRhythmAnalyzer} from "@/composables/usePlayerRhythmAnalyzer.js";
import {usePlayerReporting} from "@/composables/usePlayerReporting.js";
import {usePlayerManualSwitch} from "@/composables/usePlayerManualSwitch.js";
import {usePlayerMorePanel} from "@/composables/usePlayerMorePanel.js";
import {usePlayerLyricOverlay} from "@/composables/usePlayerLyricOverlay.js";
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
  playQueueByDirection,
  playQueueByIndex,
  warmupNextTrack,
} from "@/utils/globalPlayer.js";
import {
  getLastAutomixAnalysis,
  recommendNextQueueIndex,
  resolveTempoRateForTransition,
} from "@/utils/automixEngine.js";
import {normalizeLyricPayloadToAmll} from "@/utils/lyricAdapter.js";

const AMLLWrapper = defineAsyncComponent({
  loader: () =>
    import("@applemusic-like-lyrics/vue").then((module) => module.AMLLWrapper),
  suspensible: false,
});

const playerStore = usePlayerStore();
const router = useRouter();
const {
  collectLyricRowsForTranslate,
  hasLyricText,
  extractLyricPayloadFromSearchResult,
  attachAiTranslationIfNeeded,
} = usePlayerLyric();
const audioRef = ref(null);
const crossfadeAudioRef = ref(null);
const playerRootRef = ref(null);
let playerResizeObserver = null;
let mediaQueryMotion = null;
let mediaQueryMotionHandler = null;
let visibilityChangeHandler = null;
let backgroundCheckTimer = null;

const themeBaseRgb = ref([38, 56, 98]);
const themeAccentRgb = ref([78, 114, 176]);
const themeGlowRgb = ref([138, 176, 236]);
const themeIsDark = ref(true);
const prefersReducedMotion = ref(false);
const isIOSDevice = ref(false);

let crossfadeActive = false;
let crossfadePreparing = false;
let crossfadeTriggeredForSongId = null;
let crossfadeRafId = 0;
let pendingPromotedStartSec = -1;
let skipNextCoverThemePick = false;
let skipAudioResetOnNextSrcChange = false;
let activeDeck = "primary";
const playableUrlCache = new Map();

const DEV_CROSSFADE_DEBUG = Boolean(import.meta.env.DEV);

function debugCrossfade(label, payload = {}) {
  if (!DEV_CROSSFADE_DEBUG || typeof console === "undefined") return;
  try {
    console.log(`[CrossfadeDebug] ${label}`, JSON.parse(JSON.stringify(payload)));
  } catch {
    console.log(`[CrossfadeDebug] ${label}`, payload);
  }
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
  openLyricPage,
  onAmllOpenedChange,
  disposeLyricOverlay,
} = usePlayerLyricOverlay({
  hasSong: () => hasSong.value,
  nextTick,
  requestFrame: (cb) => requestAnimationFrame(cb),
  clearTimer: (id) => window.clearTimeout(id),
  setTimer: (cb, ms) => window.setTimeout(cb, ms),
});

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
const shouldScrollArtists = computed(
  () => normalizedArtistList.value.length > 5,
);
const artistLinksContainerClass = computed(() => "text-xs player-text-muted");
const artistLinksClass = computed(() => "hover:underline player-link");
const artistSeparatorClass = computed(() => "player-separator");
const coverUrl = computed(() => playerStore.currentSong?.cover || "");
const currentSongUrl = computed(() => playerStore.currentSong?.url || "");
const isPlaying = computed(() => playerStore.isPlaying);
const currentTimeMs = computed(() => playerStore.currentTimeMs);
const durationMs = computed(() => playerStore.durationMs);
const volume = computed(() => playerStore.volume);
const playQueue = computed(() => playerStore.playQueue);
const currentQueueIndex = computed(() => playerStore.currentQueueIndex);
const playlistPanelOpen = computed(() => playerStore.playlistPanelOpen);
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
  get: () => Math.max(0, currentTimeMs.value + AMLL_LYRIC_LEAD_MS),
  set: (next) => {
    const ms = Number(next);
    if (!Number.isFinite(ms)) return;
    const safeMs = Math.max(0, ms - AMLL_LYRIC_LEAD_MS);
    playerStore.setCurrentTimeMs(safeMs);
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
const crossfadeVisualActive = ref(false);
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
  playPrev: () => playQueueByDirection("prev", {trigger: "manual"}),
  playNext: () => playQueueByDirection("next", {trigger: "manual"}),
  getActiveAudio: () => getActiveAudio(),
  onPlayFailed: () => playerStore.setPlaying(false),
  onPause: () => {
    playerStore.autoPlayOnLoad = false;
  },
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
  getCrossfadeCoverState: () => ({
    progress: crossfadeCoverProgress.value,
    url: crossfadeCoverUrl.value,
    isVideo: crossfadeCoverIsVideo.value,
  }),
  setCrossfadeCoverState: ({progress, url, isVideo}) => {
    if (typeof progress === "number") crossfadeCoverProgress.value = progress;
    if (typeof url === "string") crossfadeCoverUrl.value = url;
    if (typeof isVideo === "boolean") crossfadeCoverIsVideo.value = isVideo;
  },
  setCrossfadeActive: (next) => {
    crossfadeActive = next;
  },
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
  setCrossfadeActive: (next) => {
    crossfadeActive = next;
  },
  setCrossfadePreparing: (next) => {
    crossfadePreparing = next;
  },
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
  setCrossfadeActive: (next) => {
    crossfadeActive = next;
  },
  setCrossfadePreparing: (next) => {
    crossfadePreparing = next;
  },
  setCrossfadeVisualActive: (next) => {
    crossfadeVisualActive.value = next;
  },
  setCrossfadeTriggeredSongId: (next) => {
    crossfadeTriggeredForSongId = next;
  },
  getVolume: () => volume.value,
  resolvePlayableUrlById,
  recommendNextQueueIndex,
  waitAudioMetadata,
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
  router.push({
    path: "/artistDetial",
    query: {
      id: artist.id || "",
      name: artist.name,
    },
  });
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

function getSongUrlEntry(response) {
  return response?.data?.data?.[0] || null;
}

async function resolvePlayableUrlById(id) {
  const cacheKey = String(id);
  if (playableUrlCache.has(cacheKey)) {
    return playableUrlCache.get(cacheKey) || "";
  }

  const levels = ["exhigh", "higher", "standard"];
  for (const level of levels) {
    try {
      const res = await songsApi.getSongUrl(id, {level});
      const url = getSongUrlEntry(res)?.url || "";
      if (url) {
        playableUrlCache.set(cacheKey, url);
        return url;
      }
    } catch {
      // try next level
    }
  }

  try {
    const legacyRes = await songsApi.getSongUrlLegacy(id);
    const url = getSongUrlEntry(legacyRes)?.url || "";
    if (url) playableUrlCache.set(cacheKey, url);
    return url;
  } catch {
    return "";
  }
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
    if (active.paused) {
      active.play().catch(() => {
      });
      idle.play().catch(() => {
      });
    } else {
      active.pause();
      idle.pause();
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
  const targetSec = startTime / 1000;
  active.currentTime = targetSec;
  playerStore.setCurrentTimeMs(startTime);
}


function seekByInput(event) {
  const active = getActiveAudio();
  if (!active) return;
  const nextMs = Number(event?.target?.value || 0);
  active.currentTime = nextMs / 1000;
  playerStore.setCurrentTimeMs(nextMs);
}

function changeVolume(event) {
  playerStore.setVolume(event?.target?.value);
  syncAudioVolume();
}

function cyclePlayMode() {
  playerStore.cyclePlayMode();
}

function requestAutomixWarmup(reason = "unknown") {
  warmupNextTrack()
    .then(() => prewarmCrossfadeDeck(reason))
    .catch(() => {
      if (typeof console !== "undefined") {
        console.log("[Automix/Warmup] failed", {reason});
      }
    });
}

function toggleAutomix() {
  playerStore.toggleAutomixEnabled();
  reportBehavior("TOGGLE_AUTOMIX", "global-player", {
    enabled: Boolean(playerStore.automixEnabled),
  });
  if (!playerStore.automixEnabled) {
    stopCrossfade();
  } else {
    requestAutomixWarmup("toggle-enabled");
  }
  if (typeof console !== "undefined") {
    console.log("[Automix] feature toggled", {
      enabled: Boolean(playerStore.automixEnabled),
    });
  }
}

function toggleLyricTranslate() {
  playerStore.toggleLyricTranslateEnabled();
}

function togglePlaylistPanel() {
  playerStore.togglePlaylistPanel();
}

function closePlaylistPanel() {
  playerStore.setPlaylistPanelOpen(false);
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

function onPlay(event) {
  if (!isEventFromActiveDeck(event)) return;
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
  const active = getActiveAudio();
  if (!active) return;
  if (crossfadeActive) return;

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
    } else {
      stopRhythmLoop();
      resetRhythmVisual();
    }
  },
);

watch(
  automixEnabled,
  (enabled) => {
    if (!enabled) {
      stopCrossfade();
      return;
    }
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
    () => playerStore.playQueue.length,
    currentQueueIndex,
    () => playerStore.playMode,
  ],
  () => {
    setupMediaSessionHandlers({force: isIOSDevice.value});
    requestAutomixWarmup("queue-or-mode-changed");
  },
);

watch([currentTimeMs, durationMs], () => {
  scheduleMediaSessionPositionStateUpdate();
});

onMounted(() => {
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
  clearMediaSessionHandlers();
  stopCrossfade();
  disposeRhythmAnalyzer();
  disposeLyricOverlay();
  clearScheduledPositionStateUpdate();

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
.player-shell {
  position: relative;
  isolation: isolate;
  overflow: hidden;
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
  box-shadow: 0 16px 44px rgba(15, 23, 42, var(--player-shadow-alpha));
  backdrop-filter: blur(22px);
  filter: saturate(var(--player-sat)) brightness(var(--player-brightness));
  transition: background 320ms ease,
  border-color 240ms ease,
  filter 180ms ease,
  box-shadow 200ms ease;
  animation: player-shell-drift 18s ease-in-out infinite alternate;
}

.player-shell-idle {
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
}

.player-soft-btn:hover {
  background: rgba(var(--player-fg), calc(var(--player-soft-bg-alpha) + 0.08));
}

.player-main-btn {
  border: 1px solid rgba(var(--player-main-bg), 0.65);
  color: rgb(var(--player-main-fg));
  background: rgba(var(--player-main-bg), 0.96);
}

.player-main-btn:hover {
  background: rgba(var(--player-main-bg), 0.88);
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
  background: rgba(var(--player-fg), 0.2);
  accent-color: rgba(var(--player-main-bg), 0.95);
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

.artist-marquee {
  overflow: hidden;
  width: min(300px, 50vw);
  white-space: nowrap;
}

@media (max-width: 639px) {
  .artist-marquee {
    width: min(210px, 54vw);
  }
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
  .player-shell::after {
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
