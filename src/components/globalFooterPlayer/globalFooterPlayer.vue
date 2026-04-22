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
import {aiAPi} from "@/api/aiApi/aiAPi.js";
import {songsApi} from "@/api/songsApi/songsApi.js";
import ArtistLinks from "@/components/artistLinks/artistLinks.vue";
import {PLAY_MODE, usePlayerStore} from "@/stores/playerStore.js";
import {
  playQueueByDirection,
  playQueueByIndex,
  warmupNextTrack,
} from "@/utils/globalPlayer.js";
import {
  getLastAutomixAnalysis,
  recommendNextQueueIndex,
} from "@/utils/automixEngine.js";
import {normalizeLyricPayloadToAmll} from "@/utils/lyricAdapter.js";

const AMLLWrapper = defineAsyncComponent({
  loader: () =>
    import("@applemusic-like-lyrics/vue").then((module) => module.AMLLWrapper),
  suspensible: false,
});

const playerStore = usePlayerStore();
const router = useRouter();
const audioRef = ref(null);
const crossfadeAudioRef = ref(null);
const playerRootRef = ref(null);
let playerResizeObserver = null;
let themePickToken = 0;
let mediaQueryMotion = null;
let mediaQueryMotionHandler = null;
let visibilityChangeHandler = null;
let backgroundCheckTimer = null;

const themeBaseRgb = ref([38, 56, 98]);
const themeAccentRgb = ref([78, 114, 176]);
const themeGlowRgb = ref([138, 176, 236]);
const themeIsDark = ref(true);
const rhythmLevel = ref(0);
const beatLevel = ref(0);
const visualPulse = ref(0);
const prefersReducedMotion = ref(false);
const isIOSDevice = ref(false);

let audioContext = null;
let analyserNode = null;
let mediaSourceNode = null;
let analyserFrame = 0;
let analyserData = null;
let analyserPrevData = null;
let analyserLastTs = 0;
let lastStoreTimeSyncTs = 0;
let rhythmEnergyEma = 0;
let rhythmFluxEma = 0;
let lowBandEma = 0;
let rhythmGain = 1;
let mediaSessionHandlersBound = false;
let mediaSessionPositionUpdateTimer = 0;
let crossfadeActive = false;
let crossfadePreparing = false;
let crossfadeTriggeredForSongId = null;
let crossfadeRafId = 0;
let crossfadePrewarmedSongId = "";
let crossfadePrewarmedUrl = "";
let pendingPromotedStartSec = -1;
let skipNextCoverThemePick = false;
let skipAudioResetOnNextSrcChange = false;
let activeDeck = "primary";
const playableUrlCache = new Map();
const STORE_TIME_SYNC_INTERVAL_MS = 72;

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

const amllOpened = ref(false);
const amllMounted = ref(false);
const amllHideLyricView = ref(false);
const amllLyricLines = ref([]);
const amllAlbum = ref("");
let amllUnmountTimer = 0;
const AMLL_LYRIC_LEAD_MS = 320;

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
const moreMenuButtonRef = ref(null);
const morePanelOpen = ref(false);
const morePanelStyle = ref({right: "18px", bottom: "110px"});
const morePanelThemeStyle = computed(() => ({
  "--more-bg": themeIsDark.value ? "34, 44, 68" : "244, 247, 255",
  "--more-border": themeIsDark.value ? "255, 255, 255" : "24, 31, 45",
  "--more-fg": themeIsDark.value ? "238, 244, 255" : "24, 31, 45",
  "--more-fg-muted": themeIsDark.value ? "205, 218, 238" : "84, 94, 114",
}));

const dynamicCoverUrl = ref("");
const dynamicCoverIsVideo = ref(false);
const crossfadeCoverUrl = ref("");
const crossfadeCoverIsVideo = ref(false);
const crossfadeCoverProgress = ref(0);
let dynamicCoverToken = 0;
const dynamicCoverCache = new Map();
const lyricTranslationCache = new Map();
let lyricLoadToken = 0;

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHsl(r, g, b) {
  const rn = clamp(r / 255, 0, 1);
  const gn = clamp(g / 255, 0, 1);
  const bn = clamp(b / 255, 0, 1);
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return {h: 0, s: 0, l};

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / delta + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;

  return {h: h * 60, s, l};
}

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 1);
  const lig = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;

  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (hue < 60) {
    rn = c;
    gn = x;
  } else if (hue < 120) {
    rn = x;
    gn = c;
  } else if (hue < 180) {
    gn = c;
    bn = x;
  } else if (hue < 240) {
    gn = x;
    bn = c;
  } else if (hue < 300) {
    rn = x;
    bn = c;
  } else {
    rn = c;
    bn = x;
  }

  return [
    Math.round((rn + m) * 255),
    Math.round((gn + m) * 255),
    Math.round((bn + m) * 255),
  ];
}

function getRgbBrightness([r, g, b]) {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function mixRgb(from, to, ratio) {
  const t = clamp(ratio, 0, 1);
  return [
    Math.round(from[0] * (1 - t) + to[0] * t),
    Math.round(from[1] * (1 - t) + to[1] * t),
    Math.round(from[2] * (1 - t) + to[2] * t),
  ];
}

function getYellowGreenBias(hue) {
  const d1 = Math.abs(hue - 78);
  const d2 = Math.abs(hue - 118);
  const nearest = Math.min(d1, d2);
  return clamp(1 - nearest / 65, 0, 1);
}

function buildThemeByBase(baseRgb) {
  const [r, g, b] = baseRgb;
  const hsl = rgbToHsl(r, g, b);
  const yellowGreenBias = getYellowGreenBias(hsl.h);
  const neutral = [48, 58, 84];

  const base = hslToRgb(
    hsl.h,
    clamp(hsl.s * (0.78 - yellowGreenBias * 0.14) + 0.06, 0.22, 0.62),
    clamp(hsl.l * (0.48 - yellowGreenBias * 0.08) + 0.08, 0.16, 0.38),
  );
  const accent = hslToRgb(
    hsl.h + 14,
    clamp(hsl.s * (0.62 - yellowGreenBias * 0.12) + 0.08, 0.2, 0.52),
    clamp(hsl.l * (0.62 - yellowGreenBias * 0.1) + 0.16, 0.3, 0.56),
  );
  const glow = hslToRgb(
    hsl.h - 8,
    clamp(hsl.s * (0.46 - yellowGreenBias * 0.12) + 0.06, 0.16, 0.42),
    clamp(hsl.l + 0.2 - yellowGreenBias * 0.12, 0.48, 0.74),
  );

  const mixedBase = mixRgb(base, neutral, 0.12 + yellowGreenBias * 0.2);
  const mixedAccent = mixRgb(accent, neutral, 0.08 + yellowGreenBias * 0.16);
  const mixedGlow = mixRgb(glow, neutral, 0.05 + yellowGreenBias * 0.12);

  return {
    base: mixedBase,
    accent: mixedAccent,
    glow: mixedGlow,
    isDark: getRgbBrightness(mixedBase) < 146,
  };
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

function blendTheme(fromTheme, toTheme, ratio) {
  const t = clamp(ratio, 0, 1);
  const base = mixRgb(fromTheme.base, toTheme.base, t);
  const accent = mixRgb(fromTheme.accent, toTheme.accent, t);
  const glow = mixRgb(fromTheme.glow, toTheme.glow, t);
  return {
    base,
    accent,
    glow,
    isDark: getRgbBrightness(base) < 146,
  };
}

function applyThemeByBase(baseRgb) {
  applyTheme(buildThemeByBase(baseRgb));
}

function createFallbackTheme(seedText = "") {
  const text = String(seedText || "player");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const fallbackBase = hslToRgb(hue, 0.56, 0.44);
  return buildThemeByBase(fallbackBase);
}

function applyFallbackTheme(seedText = "") {
  applyTheme(createFallbackTheme(seedText));
}

async function extractDominantBaseColorFromCover(cover) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.referrerPolicy = "no-referrer";

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = cover;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", {willReadFrequently: true});
  if (!ctx) throw new Error("canvas unavailable");

  const size = 52;
  canvas.width = size;
  canvas.height = size;
  ctx.drawImage(image, 0, 0, size, size);

  const {data} = ctx.getImageData(0, 0, size, size);
  const bucketMap = new Map();

  for (let i = 0; i < data.length; i += 16) {
    const alpha = data[i + 3] / 255;
    if (alpha < 0.08) continue;

    const pr = data[i];
    const pg = data[i + 1];
    const pb = data[i + 2];
    const max = Math.max(pr, pg, pb);
    const min = Math.min(pr, pg, pb);
    const sat = max === 0 ? 0 : (max - min) / max;
    const light = (max + min) / 510;
    if (light < 0.06 || light > 0.94) continue;

    const weight =
      alpha * (0.3 + sat * 1.2 + (1 - Math.abs(light - 0.48)) * 0.75);
    const key = `${Math.round(pr / 24)}-${Math.round(pg / 24)}-${Math.round(pb / 24)}`;
    const current = bucketMap.get(key) || {r: 0, g: 0, b: 0, w: 0};
    current.r += pr * weight;
    current.g += pg * weight;
    current.b += pb * weight;
    current.w += weight;
    bucketMap.set(key, current);
  }

  let best = null;
  for (const item of bucketMap.values()) {
    if (!best || item.w > best.w) best = item;
  }
  if (!best || best.w <= 0) throw new Error("no color");

  return [
    Math.round(best.r / best.w),
    Math.round(best.g / best.w),
    Math.round(best.b / best.w),
  ];
}

async function resolveThemeFromCover(cover, fallbackSeed = "") {
  if (!cover) {
    return createFallbackTheme(fallbackSeed || songName.value);
  }

  try {
    const dominant = await extractDominantBaseColorFromCover(cover);
    return buildThemeByBase(dominant);
  } catch {
    return createFallbackTheme(fallbackSeed || songName.value);
  }
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

async function pickThemeFromCover(cover) {
  if (!cover) {
    applyFallbackTheme(songName.value);
    return;
  }

  const currentToken = ++themePickToken;

  try {
    const theme = await resolveThemeFromCover(cover, songName.value);
    if (currentToken !== themePickToken) return;
    applyTheme(theme);
  } catch {
    if (currentToken !== themePickToken) return;
    applyFallbackTheme(songName.value);
  }
}

function ensureAnalyser() {
  if (!audioRef.value || typeof window === "undefined") return false;
  if (isIOSDevice.value) return false;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return false;

  try {
    if (!audioContext) {
      audioContext = new Context();
    }
    if (!analyserNode) {
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.82;
    }
    if (!mediaSourceNode) {
      mediaSourceNode = audioContext.createMediaElementSource(audioRef.value);
      mediaSourceNode.connect(analyserNode);
      analyserNode.connect(audioContext.destination);
      analyserData = new Uint8Array(analyserNode.frequencyBinCount);
      analyserPrevData = new Uint8Array(analyserNode.frequencyBinCount);
    }
    return true;
  } catch {
    return false;
  }
}

function stopRhythmLoop() {
  if (analyserFrame) {
    cancelAnimationFrame(analyserFrame);
    analyserFrame = 0;
  }
}

function tickRhythm(now) {
  const active = getActiveAudio();
  if (
    active &&
    !active.paused &&
    (now - lastStoreTimeSyncTs > STORE_TIME_SYNC_INTERVAL_MS ||
      !lastStoreTimeSyncTs)
  ) {
    playerStore.setCurrentTimeMs(
      Math.floor((active.currentTime || 0) * 1000),
    );
    lastStoreTimeSyncTs = now;
  }

  if (!analyserNode || !analyserData || !analyserPrevData) {
    analyserFrame = requestAnimationFrame(tickRhythm);
    return;
  }

  if (now - analyserLastTs > 34) {
    analyserNode.getByteFrequencyData(analyserData);
    let low = 0;
    let mid = 0;
    let high = 0;
    let flux = 0;
    let total = 0;
    const lowCount = Math.max(6, Math.floor(analyserData.length * 0.08));
    const midStart = lowCount;
    const midEnd = Math.max(
      midStart + 1,
      Math.floor(analyserData.length * 0.28),
    );
    const highStart = midEnd;
    const highEnd = Math.max(
      highStart + 1,
      Math.floor(analyserData.length * 0.62),
    );

    for (let i = 0; i < lowCount; i += 1) low += analyserData[i];
    for (let i = midStart; i < midEnd; i += 1) mid += analyserData[i];
    for (let i = highStart; i < highEnd; i += 1) high += analyserData[i];
    for (let i = 0; i < analyserData.length; i += 1) {
      const current = analyserData[i];
      total += current;
      const diff = current - analyserPrevData[i];
      if (diff > 0) flux += diff;
      analyserPrevData[i] = current;
    }

    const lowEnergy = low / (lowCount * 255);
    const midEnergy = mid / ((midEnd - midStart) * 255);
    const highEnergy = high / ((highEnd - highStart) * 255);
    const totalEnergy = total / (analyserData.length * 255);
    const fluxEnergy = flux / (analyserData.length * 255);

    rhythmEnergyEma =
      rhythmEnergyEma > 0
        ? rhythmEnergyEma * 0.88 + totalEnergy * 0.12
        : totalEnergy;
    rhythmFluxEma =
      rhythmFluxEma > 0 ? rhythmFluxEma * 0.9 + fluxEnergy * 0.1 : fluxEnergy;

    const energyBoost = clamp(
      (totalEnergy - rhythmEnergyEma * 0.9) * 3.4,
      0,
      1,
    );
    const fluxBoost = clamp((fluxEnergy - rhythmFluxEma * 0.72) * 7.8, 0, 1);
    const fluxRatio = clamp(fluxEnergy / (rhythmFluxEma + 0.016), 0, 2.6);

    lowBandEma =
      lowBandEma > 0 ? lowBandEma * 0.86 + lowEnergy * 0.14 : lowEnergy;
    const lowTransient = clamp((lowEnergy - lowBandEma * 0.9) * 4.6, 0, 1);

    const bodyRaw = clamp(
      totalEnergy * 1.08 +
      lowEnergy * 0.56 +
      midEnergy * 0.38 +
      highEnergy * 0.18,
      0,
      1,
    );
    const targetLevel = 0.42;
    const adaptive = clamp(targetLevel / (bodyRaw + 0.08), 0.9, 2.4);
    rhythmGain = rhythmGain * 0.93 + adaptive * 0.07;

    const bodyLevel = clamp(bodyRaw * rhythmGain, 0, 1);
    const beatKickRaw =
      fluxBoost * 0.78 +
      fluxRatio * 0.22 +
      energyBoost * 0.4 +
      lowTransient * 1.05;
    const beatKick = clamp((beatKickRaw - 0.1) / 0.9, 0, 1) ** 0.78;

    rhythmLevel.value = clamp(rhythmLevel.value * 0.5 + bodyLevel * 0.5, 0, 1);
    beatLevel.value = clamp(Math.max(beatLevel.value * 0.86, beatKick), 0, 1);

    const targetPulse = clamp(
      rhythmLevel.value * 0.42 + beatLevel.value * 0.78,
      0,
      1,
    );
    if (targetPulse > visualPulse.value) {
      visualPulse.value = clamp(
        visualPulse.value + (targetPulse - visualPulse.value) * 0.24,
        0,
        1,
      );
    } else {
      visualPulse.value = clamp(
        visualPulse.value + (targetPulse - visualPulse.value) * 0.08,
        0,
        1,
      );
    }
    analyserLastTs = now;
  }

  analyserFrame = requestAnimationFrame(tickRhythm);
}

async function startRhythmLoop() {
  if (!hasSong.value) return;
  if (!playerStore.isPlaying) return;
  if (prefersReducedMotion.value) return;
  if (!ensureAnalyser()) return;

  if (audioContext?.state === "suspended") {
    try {
      await audioContext.resume();
    } catch {
      return;
    }
  }

  if (!analyserFrame) {
    analyserLastTs = 0;
    analyserFrame = requestAnimationFrame(tickRhythm);
  }
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

function updateMediaSessionMetadata() {
  if (typeof navigator === "undefined") return;
  if (!("mediaSession" in navigator)) return;
  const title = songName.value || "未在播放";
  const artist = normalizedArtistList.value.map((item) => item.name).join(" / ");
  const artworkSrc = resolveMediaSessionArtworkUrl();
  if (typeof window.MediaMetadata !== "function") return;
  try {
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title,
      artist,
      album: amllAlbum.value || "",
      artwork: artworkSrc
        ? [
          {src: artworkSrc, sizes: "96x96"},
          {src: artworkSrc, sizes: "128x128"},
          {src: artworkSrc, sizes: "192x192"},
          {src: artworkSrc, sizes: "256x256"},
          {src: artworkSrc, sizes: "384x384"},
          {src: artworkSrc, sizes: "512x512"},
        ]
        : [],
    });
  } catch {
    // noop
  }
}

function updateMediaSessionPlaybackState() {
  if (typeof navigator === "undefined") return;
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.playbackState = hasSong.value && isPlaying.value
      ? "playing"
      : "paused";
  } catch {
    // noop
  }
}

function updateMediaSessionPositionState() {
  if (typeof navigator === "undefined") return;
  if (!("mediaSession" in navigator)) return;
  if (typeof navigator.mediaSession.setPositionState !== "function") return;
  const durationSec = Math.max(0, Number(durationMs.value || 0) / 1000);
  const positionSec = Math.max(0, Number(currentTimeMs.value || 0) / 1000);
  if (!Number.isFinite(durationSec) || !Number.isFinite(positionSec)) return;
  if (durationSec <= 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: durationSec,
      position: Math.min(positionSec, durationSec),
      playbackRate: 1,
    });
  } catch {
    // noop
  }
}

function scheduleMediaSessionPositionStateUpdate() {
  if (mediaSessionPositionUpdateTimer) return;
  mediaSessionPositionUpdateTimer = window.setTimeout(() => {
    mediaSessionPositionUpdateTimer = 0;
    updateMediaSessionPositionState();
  }, 800);
}

function setupMediaSessionHandlers({force = false} = {}) {
  if (typeof navigator === "undefined") return;
  if (!("mediaSession" in navigator)) return;
  if (force && mediaSessionHandlersBound) {
    clearMediaSessionHandlers();
  }
  if (mediaSessionHandlersBound) return;

  const setHandler = (action, handler) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // noop
    }
  };

  const handlePrevTrack = async () => {
    if (!playQueue.value.length) return;
    if (!canPlayPrev.value) return;
    await playQueueByDirection("prev", {trigger: "manual"});
  };

  const handleNextTrack = async () => {
    if (!playQueue.value.length) return;
    if (!canPlayNext.value) return;
    await playQueueByDirection("next", {trigger: "manual"});
  };

  setHandler("play", async () => {
    const active = getActiveAudio();
    if (!active || !hasSong.value) return;
    try {
      await active.play();
    } catch {
      playerStore.setPlaying(false);
    }
  });
  setHandler("pause", () => {
    playerStore.autoPlayOnLoad = false;
    getActiveAudio()?.pause();
  });
  setHandler("previoustrack", canPlayPrev.value ? handlePrevTrack : null);
  setHandler("nexttrack", canPlayNext.value ? handleNextTrack : null);
  setHandler("seekbackward", null);
  setHandler("seekforward", null);
  setHandler("seekto", (details = {}) => {
    const active = getActiveAudio();
    if (!active) return;
    const seekTime = Number(details.seekTime);
    if (!Number.isFinite(seekTime)) return;
    active.currentTime = Math.max(0, seekTime);
    playerStore.setCurrentTimeMs(Math.floor((active.currentTime || 0) * 1000));
    updateMediaSessionPositionState();
  });

  mediaSessionHandlersBound = true;
}

function clearMediaSessionHandlers() {
  if (typeof navigator === "undefined") return;
  if (!("mediaSession" in navigator)) return;
  const actions = [
    "play",
    "pause",
    "previoustrack",
    "nexttrack",
    "seekbackward",
    "seekforward",
    "seekto",
  ];
  actions.forEach((action) => {
    try {
      navigator.mediaSession.setActionHandler(action, null);
    } catch {
      // noop
    }
  });
  mediaSessionHandlersBound = false;
}

function formatMs(ms) {
  const sec = Math.floor((ms || 0) / 1000);
  const min = Math.floor(sec / 60);
  const remain = String(sec % 60).padStart(2, "0");
  return `${min}:${remain}`;
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

function getExt(url = "") {
  const clean = String(url).split("?")[0].split("#")[0].toLowerCase();
  const index = clean.lastIndexOf(".");
  return index >= 0 ? clean.slice(index + 1) : "";
}

function isVideoUrl(url = "") {
  return ["mp4", "webm", "m4v", "mov", "ogg", "ogv"].includes(getExt(url));
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

async function prewarmCrossfadeDeck(reason = "unknown") {
  const idle = getIdleAudio();
  if (!idle || crossfadeActive || crossfadePreparing) return;
  if (!automixEnabled.value) return;
  if (!playerStore.playQueue.length || playerStore.currentQueueIndex < 0) return;

  const targetIndex = await getCrossfadeTargetIndex();
  if (targetIndex < 0 || targetIndex >= playerStore.playQueue.length) return;
  if (targetIndex === playerStore.currentQueueIndex) return;

  const targetSong = playerStore.playQueue[targetIndex];
  const targetId = Number(targetSong?.id);
  if (!Number.isFinite(targetId) || targetId <= 0) return;

  const targetUrl = await resolvePlayableUrlById(targetId);
  if (!targetUrl || !idle || crossfadeActive) return;

  if (
    crossfadePrewarmedSongId === String(targetSong.id) &&
    crossfadePrewarmedUrl === targetUrl
  ) {
    return;
  }

  if (!idle.paused) return;

  idle.src = targetUrl;
  idle.load();
  crossfadePrewarmedSongId = String(targetSong.id);
  crossfadePrewarmedUrl = targetUrl;

  if (typeof console !== "undefined") {
    console.log("[Automix/Warmup] deck prewarmed", {
      reason,
      targetId: targetSong.id,
      targetIndex,
    });
  }
}

function stopCrossfade({keepCoverOverlay = false} = {}) {
  if (crossfadeRafId) {
    cancelAnimationFrame(crossfadeRafId);
    crossfadeRafId = 0;
  }
  const active = getActiveAudio();
  const idle = getIdleAudio();
  if (idle) {
    idle.pause();
    idle.removeAttribute("src");
    idle.load();
  }
  if (active) {
    active.volume = volume.value;
  }
  if (!keepCoverOverlay) {
    crossfadeCoverProgress.value = 0;
    crossfadeCoverUrl.value = "";
    crossfadeCoverIsVideo.value = false;
  }
  crossfadeActive = false;
  crossfadeVisualActive.value = false;
}

function clearCrossfadeCoverSoon() {
  window.setTimeout(() => {
    crossfadeCoverProgress.value = 0;
    crossfadeCoverUrl.value = "";
    crossfadeCoverIsVideo.value = false;
  }, 120);
}

function completeCrossfadeByDeckSwap({
                                       fromTrackId,
                                       toTrackId,
                                       mixOutStart,
                                       mixInStart,
                                       crossfadeDuration,
                                       promotedStartSec,
                                     }) {
  const oldActive = getActiveAudio();
  flipActiveDeck();
  const newActive = getActiveAudio();
  if (newActive) {
    newActive.volume = clamp(Number(volume.value || 0.85), 0, 1);
    playerStore.setCurrentTimeMs(Math.floor((newActive.currentTime || 0) * 1000));
    lastStoreTimeSyncTs = 0;
  }
  if (oldActive) {
    oldActive.pause();
    oldActive.removeAttribute("src");
    oldActive.load();
  }
  crossfadeActive = false;
  crossfadeVisualActive.value = false;
  clearCrossfadeCoverSoon();

  // 补齐状态同步，防止 onPlay 被 isEventFromActiveDeck 过滤掉
  playerStore.setPlaying(true);
  setupMediaSessionHandlers({force: isIOSDevice.value});
  startRhythmLoop();
  updateMediaSessionPlaybackState();
  requestAutomixWarmup("crossfade-complete");
  // 重置，确保下一轮 crossfade 可以正常触发
  crossfadeTriggeredForSongId = null;

  if (newActive?.paused) {
    newActive.play().catch(() => {
      playerStore.setPlaying(false);
    });
  }
  debugCrossfade("completeCrossfadeByDeckSwap", {
    fromTrackId,
    toTrackId,
    promotedStartSec,
    mixInStart,
    mixOutStart,
    crossfadeDuration,
    activeDeck,
    newActiveCurrentTime: Number(newActive?.currentTime || 0).toFixed(3),
  });

  if (typeof console !== "undefined") {
    console.log("[Automix] crossfade complete", {
      fromTrackId,
      toTrackId,
      mixOutStart,
      mixInStart,
      crossfadeDuration,
      promotedStartSec,
      activeDeck,
    });
  }
}

async function getCrossfadeTargetIndex() {
  const queue = playerStore.playQueue || [];
  if (!queue.length || playerStore.currentQueueIndex < 0) return -1;
  const currentIndex = playerStore.currentQueueIndex;
  const sequenceMode = playerStore.playMode === PLAY_MODE.SEQUENCE;

  const analysis = getLastAutomixAnalysis();
  if (
    analysis?.currentTrackId &&
    String(analysis.currentTrackId) === String(playerStore.currentSong?.id) &&
    Number.isInteger(analysis.selectedQueueIndex) &&
    analysis.selectedQueueIndex >= 0
  ) {
    const selected = analysis.selectedQueueIndex;
    if (!sequenceMode || selected > currentIndex) {
      return selected;
    }
  }

  const suggested = await recommendNextQueueIndex(queue, currentIndex);
  if (!sequenceMode || suggested > currentIndex) {
    return suggested;
  }

  return currentIndex < queue.length - 1 ? currentIndex + 1 : -1;
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

async function tryStartAutomixCrossfade(currentSec) {
  const primary = getActiveAudio();
  const secondary = getIdleAudio();
  if (crossfadeActive || crossfadePreparing || !primary || !secondary || !hasSong.value)
    return false;
  if (!automixEnabled.value) return false;
  if (playerStore.playMode === PLAY_MODE.SINGLE) return false;

  const currentSongId = String(playerStore.currentSong?.id || "");
  if (!currentSongId) return false;
  if (crossfadeTriggeredForSongId === currentSongId) return false;

  const analysis = getLastAutomixAnalysis();
  if (
    !analysis?.transition ||
    String(analysis.currentTrackId || "") !== currentSongId
  ) {
    return false;
  }

  const transition = analysis.transition;
  const mixOutStart = Number(transition.mix_out_start || 0);
  const mixInStart = Math.max(0, Number(transition.mix_in_start || 0));
  const crossfadeDuration = Math.max(0.4, Number(transition.crossfade_duration || 0));
  if (!Number.isFinite(mixOutStart) || !Number.isFinite(crossfadeDuration)) return false;
  if (currentSec + 0.08 < mixOutStart) return false;

  crossfadePreparing = true;
  try {
    const targetIndex = await getCrossfadeTargetIndex();
    if (targetIndex < 0 || targetIndex >= playerStore.playQueue.length)
      return false;
    if (targetIndex === playerStore.currentQueueIndex) return false;

    const targetSong = playerStore.playQueue[targetIndex];
    const targetId = Number(targetSong?.id);
    if (!Number.isFinite(targetId) || targetId <= 0) return false;

    const prewarmedMatch =
      crossfadePrewarmedSongId === String(targetSong.id) &&
      Boolean(crossfadePrewarmedUrl);
    const targetUrl = prewarmedMatch
      ? crossfadePrewarmedUrl
      : await resolvePlayableUrlById(targetId);
    if (!targetUrl || !primary || !secondary) return false;
    const fromTheme = getCurrentThemeSnapshot();
    let toTheme = fromTheme;
    resolveThemeFromCover(resolveSongCover(targetSong), targetSong?.name || "")
      .then((theme) => {
        if (theme) toTheme = theme;
      })
      .catch(() => {
      });

    crossfadeActive = true;
    crossfadeVisualActive.value = true;
    crossfadeTriggeredForSongId = currentSongId;
    crossfadeCoverUrl.value = resolveSongCover(targetSong);
    crossfadeCoverIsVideo.value = isVideoUrl(crossfadeCoverUrl.value);
    crossfadeCoverProgress.value = 0;

    if (!prewarmedMatch || secondary.getAttribute("src") !== targetUrl) {
      secondary.src = targetUrl;
      secondary.load();
    }
    await waitAudioMetadata(secondary);
    const safeMixInStart = sanitizePlaybackStartSec(secondary, mixInStart);
    secondary.currentTime = safeMixInStart;
    secondary.volume = 0;
    debugCrossfade("crossfadeStart", {
      fromTrackId: currentSongId,
      toTrackId: String(targetSong?.id || ""),
      currentQueueIndex: playerStore.currentQueueIndex,
      targetQueueIndex: targetIndex,
      playMode: playerStore.playMode,
      transitionMixOutStart: mixOutStart,
      transitionMixInStart: mixInStart,
      safeMixInStart,
      crossfadeDuration,
      secondaryDuration: Number(secondary?.duration || 0),
      prewarmedMatch,
    });

    try {
      await secondary.play();
    } catch {
      crossfadeActive = false;
      return false;
    }

    const baseVolume = clamp(Number(volume.value || 0.85), 0, 1);
    const startTs = performance.now();

    const step = async (now) => {
      if (!crossfadeActive || !primary || !secondary) {
        stopCrossfade();
        return;
      }

      const elapsed = (now - startTs) / 1000;
      const progress = clamp(elapsed / crossfadeDuration, 0, 1);

      primary.volume = baseVolume * (1 - progress);
      secondary.volume = baseVolume * progress;
      applyThemeBlend(fromTheme, toTheme, progress);
      crossfadeCoverProgress.value = progress;

      if (progress >= 1) {
        const promotedStartSec = Number(secondary.currentTime || safeMixInStart || 0);
        debugCrossfade("promoteCrossfadedTrack", {
          fromTrackId: currentSongId,
          toTrackId: String(targetSong?.id || ""),
          promotedStartSec,
          safeMixInStart,
          secondaryCurrentTime: Number(secondary.currentTime || 0).toFixed(3),
        });
        skipNextCoverThemePick = true;
        applyTheme(toTheme);
        completeCrossfadeByDeckSwap({
          fromTrackId: currentSongId,
          toTrackId: targetSong.id,
          mixOutStart,
          mixInStart: safeMixInStart,
          crossfadeDuration,
          promotedStartSec,
        });
        await promoteCrossfadedTrack(targetSong, targetUrl, promotedStartSec, targetIndex);
        return;
      }

      crossfadeRafId = requestAnimationFrame((ts) => {
        step(ts).catch(() => {
          stopCrossfade();
        });
      });
    };

    crossfadeRafId = requestAnimationFrame((ts) => {
      step(ts).catch(() => {
        stopCrossfade();
      });
    });

    if (typeof console !== "undefined") {
      console.log("[Automix] crossfade started", {
        fromTrackId: currentSongId,
        toTrackId: targetSong.id,
        mixOutStart,
        mixInStart,
        crossfadeDuration,
      });
    }

    return true;
  } finally {
    crossfadePreparing = false;
  }
}

function syncDurationFromAudio() {
  const active = getActiveAudio();
  if (!active) return;
  const seconds = Number(active.duration || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  playerStore.setDurationMs(Math.floor(seconds * 1000));
}

function pickDynamicCover(payload) {
  const data = payload?.data ?? payload;
  const root = data?.data ?? data ?? {};
  const hintedType = String(root?.type || root?.format || "").toLowerCase();
  const sources = [
    root?.videoPlayUrl,
    root?.url,
    root?.cover,
    root?.video,
    root?.videoUrl,
    root?.dynamicCover,
    root?.dynamicCoverUrl,
    root?.mvUrl,
    Array.isArray(root) ? root[0]?.videoPlayUrl : "",
    Array.isArray(root) ? root[0]?.url : "",
    Array.isArray(root) ? root[0]?.cover : "",
    Array.isArray(root?.list) ? root.list[0]?.videoPlayUrl : "",
    Array.isArray(root?.list) ? root.list[0]?.url : "",
    Array.isArray(root?.list) ? root.list[0]?.cover : "",
  ];

  for (const candidate of sources) {
    const url = String(candidate || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) continue;
    return {
      url,
      isVideo: hintedType.includes("video") || isVideoUrl(url),
    };
  }

  return {url: "", isVideo: false};
}

async function loadDynamicCover(songId) {
  const id = Number(songId);
  if (!Number.isFinite(id) || id <= 0) {
    dynamicCoverUrl.value = "";
    dynamicCoverIsVideo.value = false;
    return;
  }

  if (dynamicCoverCache.has(id)) {
    const cached = dynamicCoverCache.get(id) || {url: "", isVideo: false};
    dynamicCoverUrl.value = cached.url || "";
    dynamicCoverIsVideo.value = Boolean(cached.isVideo);
    return;
  }

  const token = ++dynamicCoverToken;
  try {
    const res = await songsApi.getDynamicCover(id);
    const dynamic = pickDynamicCover(res);
    dynamicCoverCache.set(id, dynamic);
    if (token !== dynamicCoverToken) return;
    dynamicCoverUrl.value = dynamic.url;
    dynamicCoverIsVideo.value = Boolean(dynamic.isVideo);
  } catch {
    dynamicCoverCache.set(id, {url: "", isVideo: false});
    if (token !== dynamicCoverToken) return;
    dynamicCoverUrl.value = "";
    dynamicCoverIsVideo.value = false;
  }
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

function openLyricPage() {
  if (!hasSong.value) return;
  if (amllUnmountTimer) {
    window.clearTimeout(amllUnmountTimer);
    amllUnmountTimer = 0;
  }
  if (!amllMounted.value) {
    amllMounted.value = true;
    nextTick(() => {
      requestAnimationFrame(() => {
        amllOpened.value = true;
      });
    });
    return;
  }
  amllOpened.value = true;
}

function onAmllOpenedChange(nextOpened) {
  const opened = Boolean(nextOpened);
  if (opened) {
    if (amllUnmountTimer) {
      window.clearTimeout(amllUnmountTimer);
      amllUnmountTimer = 0;
    }
    amllMounted.value = true;
    amllOpened.value = true;
    return;
  }
  amllOpened.value = false;
  if (amllUnmountTimer) window.clearTimeout(amllUnmountTimer);
  amllUnmountTimer = window.setTimeout(() => {
    if (!amllOpened.value) amllMounted.value = false;
    amllUnmountTimer = 0;
  }, 560);
}

function onAmllLineClick(event) {
  const startTime = event?.line?.getLine?.()?.startTime;
  const active = getActiveAudio();
  if (!active || !Number.isFinite(startTime)) return;
  const targetSec = startTime / 1000;
  active.currentTime = targetSec;
  playerStore.setCurrentTimeMs(startTime);
}

function isChineseOnly(text = "") {
  const meaningful = String(text).replace(/[\s\d\p{P}\p{S}a-zA-Z]/gu, "");
  if (!meaningful) return false;
  return /^[\u3400-\u9fff\u{20000}-\u{2a6df}\u{2a700}-\u{2ebef}]+$/u.test(meaningful);
}

function parseTimestampToMs(min, sec, frac = "") {
  const minute = Number(min);
  const second = Number(sec);
  if (!Number.isFinite(minute) || !Number.isFinite(second)) return 0;

  const fractionText = String(frac || "").trim();
  let milli = 0;
  if (fractionText) {
    if (fractionText.length >= 3) milli = Number(fractionText.slice(0, 3));
    else if (fractionText.length === 2) milli = Number(fractionText) * 10;
    else milli = Number(fractionText) * 100;
  }

  return Math.max(0, minute * 60 * 1000 + second * 1000 + milli);
}

function normalizeLrcLineText(text = "") {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function collectLyricRowsForTranslate(payload = {}) {
  const rows = [];
  const lrcText = payload?.lrc?.lyric || payload?.lyric || "";
  const yrcText = payload?.yrc?.lyric || payload?.yrc || "";

  if (lrcText) {
    for (const line of String(lrcText).split(/\r?\n/)) {
      if (!line || !line.trim()) continue;
      const stamps = [
        ...line.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g),
      ];
      if (!stamps.length) continue;

      const text = normalizeLrcLineText(line.replace(/\[[^\]]+\]/g, ""));
      if (!text || /^\w+[:：]/.test(text)) continue;

      for (const stamp of stamps) {
        rows.push({
          timeMs: parseTimestampToMs(stamp[1], stamp[2], stamp[3]),
          text,
        });
      }
    }
  }

  if (!rows.length && yrcText) {
    for (const line of String(yrcText).split(/\r?\n/)) {
      const match = line.match(/^\[(\d+),(\d+)\](.*)$/);
      if (!match) continue;
      const timeMs = Number(match[1]);
      const text = normalizeLrcLineText(
        String(match[3] || "").replace(/\(\d+,\d+,\d+\)/g, ""),
      );
      if (!Number.isFinite(timeMs) || !text || /^\w+[:：]/.test(text)) continue;
      rows.push({timeMs: Math.max(0, timeMs), text});
    }
  }

  rows.sort((a, b) => a.timeMs - b.timeMs);
  return rows;
}

function toLrcTimestamp(timeMs) {
  const safeMs = Math.max(0, Math.floor(Number(timeMs) || 0));
  const min = Math.floor(safeMs / 60000);
  const sec = Math.floor((safeMs % 60000) / 1000);
  const cent = Math.floor((safeMs % 1000) / 10);
  return `[${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cent).padStart(2, "0")}]`;
}

function extractDeepseekText(payload) {
  const candidate = payload?.data ?? payload;
  if (!candidate) return "";

  if (typeof candidate === "string") return candidate;
  if (typeof candidate?.content === "string") return candidate.content;
  if (typeof candidate?.result === "string") return candidate.result;
  if (typeof candidate?.message === "string") return candidate.message;
  if (typeof candidate?.data === "string") return candidate.data;
  if (typeof candidate?.data?.content === "string") return candidate.data.content;
  if (typeof candidate?.data?.result === "string") return candidate.data.result;
  if (typeof candidate?.choices?.[0]?.message?.content === "string") {
    return candidate.choices[0].message.content;
  }

  return "";
}

function parseTranslatedLines(rawText = "", expectedCount = 0) {
  const text = String(rawText || "").trim();
  if (!text) return [];

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonSource = fencedMatch?.[1] || text;

  try {
    const parsed = JSON.parse(jsonSource);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || "").trim());
    }
  } catch {
    // fallback below
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d+[.)、:\-]\s*/, "").trim())
    .filter(Boolean);

  if (expectedCount && lines.length > expectedCount) {
    return lines.slice(0, expectedCount);
  }
  return lines;
}

async function attachAiTranslationIfNeeded(payload = {}, songId) {
  if (!lyricTranslateEnabled.value) return payload;

  const rows = collectLyricRowsForTranslate(payload);
  if (!rows.length) return payload;

  const sourceText = rows.map((row) => row.text).join("\n");
  if (!sourceText || isChineseOnly(sourceText)) return payload;

  const existingTlyric = String(payload?.tlyric?.lyric || "").trim();
  const existingMap = new Map();
  if (existingTlyric) {
    for (const line of existingTlyric.split(/\r?\n/)) {
      const match = line.match(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\](.*)/);
      if (match) {
        const t = parseTimestampToMs(match[1], match[2], match[3]);
        const text = String(match[4] || "").trim();
        if (text) existingMap.set(t, text);
      }
    }
  }

  const missingRows = rows.filter((row) => {
    if (existingMap.has(row.timeMs)) return false;
    for (const [t] of existingMap) {
      if (Math.abs(t - row.timeMs) <= 900) return false;
    }
    return true;
  });

  if (!missingRows.length) return payload;

  const cacheKey = String(songId || payload?.songId || "");
  if (cacheKey && lyricTranslationCache.has(cacheKey)) {
    return {
      ...payload,
      tlyric: {
        ...(payload?.tlyric || {}),
        lyric: lyricTranslationCache.get(cacheKey) || "",
      },
    };
  }

  const linesToTranslate = missingRows.slice(0, 120).map((row) => row.text);
  const prompt = [
    "请把下面歌词逐行翻译成简体中文。",
    "要求：",
    "1. 保持行数一致，不要合并或拆分。",
    "2. 只输出 JSON 数组字符串，不要输出其他解释。",
    "3. 空行请输出空字符串。",
    "原歌词：",
    JSON.stringify(linesToTranslate),
  ].join("\n");

  try {
    const response = await aiAPi.deepseekAPi({prompt});
    const translatedText = extractDeepseekText(response?.data);
    const translatedLines = parseTranslatedLines(
      translatedText,
      linesToTranslate.length,
    );
    if (!translatedLines.length) return payload;

    const aiMap = new Map();
    missingRows.forEach((row, index) => {
      if (index < translatedLines.length) {
        const text = String(translatedLines[index] || "").trim();
        if (text) aiMap.set(row.timeMs, text);
      }
    });

    const mergedLines = rows.map((row) => {
      const existing = existingMap.get(row.timeMs)
        || [...existingMap.entries()].find(([t]) => Math.abs(t - row.timeMs) <= 900)?.[1];
      const ai = aiMap.get(row.timeMs);
      return `${toLrcTimestamp(row.timeMs)}${existing || ai || ""}`;
    });

    const mergedLrc = mergedLines.join("\n");
    if (!mergedLrc.trim()) return payload;
    if (cacheKey) lyricTranslationCache.set(cacheKey, mergedLrc);

    return {
      ...payload,
      tlyric: {
        ...(payload?.tlyric || {}),
        lyric: mergedLrc,
      },
    };
  } catch {
    return payload;
  }
}

function hasLyricText(payload = {}) {
  const yrcText = String(payload?.yrc?.lyric || payload?.yrc || "").trim();
  const lrcText = String(payload?.lrc?.lyric || payload?.lyric || "").trim();
  return Boolean(yrcText || lrcText);
}

function extractLyricPayloadFromSearchResult(raw = null) {
  if (!raw) return null;

  if (typeof raw === "string") {
    const text = raw.trim();
    return text ? {lrc: {lyric: text}} : null;
  }

  const candidate = raw?.data?.data ?? raw?.data ?? raw;
  if (Array.isArray(candidate)) {
    for (const item of candidate) {
      const picked = extractLyricPayloadFromSearchResult(item);
      if (picked) return picked;
    }
    return null;
  }

  if (typeof candidate !== "object") return null;
  if (hasLyricText(candidate)) return candidate;

  const lyricContentText = String(candidate?.lyricContent ?? "").trim();
  if (lyricContentText && lyricContentText.toLowerCase() !== "null") {
    return {lrc: {lyric: lyricContentText}};
  }

  const nested = [candidate?.lyric, candidate?.result, candidate?.payload];
  for (const item of nested) {
    const picked = extractLyricPayloadFromSearchResult(item);
    if (picked) return picked;
  }

  return null;
}

async function tryLoadLyricFromSearch(songId, title = "", artist = "") {
  if (!title) title = String(songName.value || "").trim();
  if (!artist) artist = String(normalizedArtistList.value?.[0]?.name || "").trim();
  const keyword = [title, artist].filter(Boolean).join("-");

  try {
    const response = await songsApi.getLyricSearch({
      keyword,
      id: songId,
      name: title,
      artist,
    });
    const payload = extractLyricPayloadFromSearchResult(response?.data ?? response);
    return hasLyricText(payload || {}) ? payload : null;
  } catch {
    return null;
  }
}

async function loadCurrentSongLyric(songId) {
  const requestToken = ++lyricLoadToken;
  const id = Number(songId);
  if (!Number.isFinite(id) || id <= 0) {
    if (requestToken === lyricLoadToken) amllLyricLines.value = [];
    return;
  }

  const currentSong = playerStore.currentSong;
  const snapshotTitle = String(currentSong?.name || "").trim();
  const snapshotArtist = String(
    (currentSong?.artists || [])[0]?.name || "",
  ).trim();

  let lyricPayload = await tryLoadLyricFromSearch(id, snapshotTitle, snapshotArtist);
  if (requestToken !== lyricLoadToken) return;

  if (!hasLyricText(lyricPayload || {})) {
    if (requestToken !== lyricLoadToken) return;
    try {
      const {data: newData} = await songsApi.getLyricNew(id);
      if (requestToken !== lyricLoadToken) return;
      const hasWordByWord = /\[\d+,\d+\]\(\d+,\d+,\d+\)/.test(
        String(newData?.yrc?.lyric || ""),
      );
      if (hasWordByWord && hasLyricText(newData || {})) {
        lyricPayload = newData || {};
      } else {
        const {data: normalData} = await songsApi.getLyric(id);
        if (requestToken !== lyricLoadToken) return;
        lyricPayload = normalData || {};
      }
    } catch {
      if (requestToken !== lyricLoadToken) return;
      try {
        const {data: normalData} = await songsApi.getLyric(id);
        if (requestToken !== lyricLoadToken) return;
        lyricPayload = normalData || {};
      } catch {
        lyricPayload = null;
      }
    }
  }

  if (!lyricPayload) {
    if (requestToken === lyricLoadToken) amllLyricLines.value = [];
    return;
  }

  const baseLines = normalizeLyricPayloadToAmll(lyricPayload);
  if (requestToken !== lyricLoadToken) return;
  amllLyricLines.value = baseLines;

  if (!lyricTranslateEnabled.value) return;

  const hasMissingTranslation = baseLines.some(
    (line) => line.words?.some((w) => w.word?.trim()) && !line.translatedLyric?.trim(),
  );
  if (!hasMissingTranslation) return;

  const rows = collectLyricRowsForTranslate(lyricPayload);
  const sourceText = rows.map((row) => row.text).join("\n");
  const needsTranslation = rows.length > 0 && sourceText && !isChineseOnly(sourceText);

  if (!needsTranslation) return;

  const cacheKey = String(id || "");
  if (cacheKey && lyricTranslationCache.has(cacheKey)) {
    const cachedPayload = {
      ...lyricPayload,
      tlyric: { ...(lyricPayload?.tlyric || {}), lyric: lyricTranslationCache.get(cacheKey) || "" },
    };
    amllLyricLines.value = normalizeLyricPayloadToAmll(cachedPayload);
    return;
  }

  amllLyricLines.value = baseLines.map((line) => {
    if (line.translatedLyric?.trim()) return line;
    if (!line.words?.some((w) => w.word?.trim())) return line;
    return { ...line, translatedLyric: "正在翻译..." };
  });

  Promise.resolve().then(async () => {
    const translatedPayload = await attachAiTranslationIfNeeded(lyricPayload, id);
    if (requestToken !== lyricLoadToken) return;
    if (translatedPayload === lyricPayload) {
      amllLyricLines.value = baseLines;
      return;
    }

    const translatedLines = normalizeLyricPayloadToAmll(translatedPayload);
    if (!translatedLines.length) return;
    amllLyricLines.value = translatedLines;
  });
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

function updateMorePanelPosition() {
  if (!moreMenuButtonRef.value || typeof window === "undefined") return;
  const rect = moreMenuButtonRef.value.getBoundingClientRect();
  const right = Math.max(12, window.innerWidth - rect.right);
  const bottom = Math.max(14, window.innerHeight - rect.top + 10);
  morePanelStyle.value = {
    right: `${right}px`,
    bottom: `${bottom}px`,
  };
}

function openMorePanel() {
  updateMorePanelPosition();
  morePanelOpen.value = true;
}

function closeMorePanel() {
  morePanelOpen.value = false;
}

function toggleMorePanel() {
  if (morePanelOpen.value) {
    closeMorePanel();
    return;
  }
  openMorePanel();
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

function pickRandomQueueIndex(length, currentIndex) {
  if (length <= 1) return currentIndex;
  let nextIndex = currentIndex;
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * length);
  }
  return nextIndex;
}

async function resolveManualDirectionTargetIndex(direction = "next") {
  const queue = playerStore.playQueue || [];
  const length = queue.length;
  if (!length) return -1;

  const currentIndex = Number.isInteger(playerStore.currentQueueIndex)
    ? playerStore.currentQueueIndex
    : 0;
  const safeCurrent = Math.min(Math.max(currentIndex, 0), length - 1);
  const mode =
    playerStore.playMode === PLAY_MODE.SINGLE
      ? PLAY_MODE.SEQUENCE
      : playerStore.playMode;

  if (direction === "prev") {
    if (mode === PLAY_MODE.SHUFFLE) {
      return pickRandomQueueIndex(length, safeCurrent);
    }
    return safeCurrent > 0 ? safeCurrent - 1 : -1;
  }

  if (automixEnabled.value) {
    const suggestedIndex = await recommendNextQueueIndex(queue, safeCurrent);
    const isForwardSequence = mode === PLAY_MODE.SEQUENCE
      ? suggestedIndex > safeCurrent
      : suggestedIndex !== safeCurrent;
    if (
      suggestedIndex >= 0 &&
      suggestedIndex < length &&
      isForwardSequence
    ) {
      return suggestedIndex;
    }
  }

  if (mode === PLAY_MODE.SHUFFLE) {
    return pickRandomQueueIndex(length, safeCurrent);
  }

  return safeCurrent < length - 1 ? safeCurrent + 1 : -1;
}

async function tryManualSeamlessSwitch(direction = "next") {
  const primary = getActiveAudio();
  const secondary = getIdleAudio();
  if (!primary || !secondary || !hasSong.value) return false;
  if (crossfadeActive || crossfadePreparing) return false;

  crossfadePreparing = true;
  try {
    const targetIndex = await resolveManualDirectionTargetIndex(direction);
    if (targetIndex < 0 || targetIndex >= playerStore.playQueue.length) return false;
    if (targetIndex === playerStore.currentQueueIndex) return false;

    const targetSong = playerStore.playQueue[targetIndex];
    const targetId = Number(targetSong?.id);
    if (!Number.isFinite(targetId) || targetId <= 0) return false;

    const targetUrl = await resolvePlayableUrlById(targetId);
    if (!targetUrl || !primary || !secondary) return false;

    const fromTrackId = String(playerStore.currentSong?.id || "");
    const crossfadeDuration = 0.14;

    crossfadeActive = true;
    crossfadeVisualActive.value = false;
    crossfadeTriggeredForSongId = fromTrackId || null;

    if (secondary.getAttribute("src") !== targetUrl) {
      secondary.src = targetUrl;
      secondary.load();
    }
    await waitAudioMetadata(secondary);
    secondary.currentTime = 0;
    secondary.volume = 0;

    try {
      await secondary.play();
    } catch {
      crossfadeActive = false;
      return false;
    }

    const baseVolume = clamp(Number(volume.value || 0.85), 0, 1);
    const startTs = performance.now();

    await new Promise((resolve) => {
      const step = (now) => {
        if (!primary || !secondary) {
          resolve();
          return;
        }

        const progress = clamp((now - startTs) / (crossfadeDuration * 1000), 0, 1);
        primary.volume = baseVolume * (1 - progress);
        secondary.volume = baseVolume * progress;

        if (progress >= 1) {
          resolve();
          return;
        }

        requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    });

    const promotedStartSec = Number(secondary.currentTime || 0);
    skipNextCoverThemePick = true;
    pickThemeFromCover(resolveSongCover(targetSong));
    await promoteCrossfadedTrack(targetSong, targetUrl, promotedStartSec, targetIndex);
    completeCrossfadeByDeckSwap({
      fromTrackId,
      toTrackId: targetSong.id,
      mixOutStart: Number(primary.currentTime || 0),
      mixInStart: 0,
      crossfadeDuration,
      promotedStartSec,
    });

    requestAutomixWarmup("manual-seamless-switch");
    return true;
  } finally {
    crossfadePreparing = false;
  }
}

async function playPrevSong() {
  if (!canPlayPrev.value) return;
  const switched = await tryManualSeamlessSwitch("prev");
  if (switched) return;
  await playQueueByDirection("prev");
}

async function playNextSong() {
  if (!canPlayNext.value) return;
  const switched = await tryManualSeamlessSwitch("next");
  if (switched) return;
  await playQueueByDirection("next");
}

async function playSongAtIndex(index) {
  await playQueueByIndex(index);
  closePlaylistPanel();
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
}

function onPause(event) {
  if (!isEventFromActiveDeck(event)) return;
  // ✅ crossfade 进行中或刚完成时，忽略来自 deck 切换产生的 pause 事件
  if (crossfadeActive || crossfadePreparing) return;
  playerStore.setPlaying(false);
  stopRhythmLoop();
  updateMediaSessionPlaybackState();
  rhythmLevel.value = 0;
  beatLevel.value = 0;
  visualPulse.value = 0;
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
      crossfadePrewarmedSongId = "";
      crossfadePrewarmedUrl = "";
    }
    if (!promotedByCrossfade) {
      rhythmLevel.value = 0;
      beatLevel.value = 0;
      visualPulse.value = 0;
    }
    lastStoreTimeSyncTs = 0;
    if (!promotedByCrossfade) {
      rhythmEnergyEma = 0;
      rhythmFluxEma = 0;
      lowBandEma = 0;
      rhythmGain = 1;
      if (analyserPrevData) {
        analyserPrevData.fill(0);
      }
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
    pickThemeFromCover(nextCover);
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
      rhythmLevel.value = 0;
      beatLevel.value = 0;
      visualPulse.value = 0;
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
        rhythmLevel.value = 0;
        beatLevel.value = 0;
        visualPulse.value = 0;
        lowBandEma = 0;
        rhythmGain = 1;
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
  stopRhythmLoop();
  if (amllUnmountTimer) {
    window.clearTimeout(amllUnmountTimer);
    amllUnmountTimer = 0;
  }
  if (mediaSessionPositionUpdateTimer) {
    window.clearTimeout(mediaSessionPositionUpdateTimer);
    mediaSessionPositionUpdateTimer = 0;
  }

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

  if (mediaSourceNode) {
    try {
      mediaSourceNode.disconnect();
    } catch {
      // noop
    }
    mediaSourceNode = null;
  }

  if (analyserNode) {
    try {
      analyserNode.disconnect();
    } catch {
      // noop
    }
    analyserNode = null;
  }

  if (audioContext) {
    audioContext.close().catch(() => {
    });
    audioContext = null;
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
