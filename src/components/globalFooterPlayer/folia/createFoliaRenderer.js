import React from 'react'
import {createRoot} from 'react-dom/client'
import {motionValue, MotionConfig} from 'framer-motion'
import {createInstance} from 'i18next'
import {I18nextProvider} from 'react-i18next'
import FoliaControls from './FoliaControls.tsx'
import HarmonyOverlay from '@/vendor/folia/src/components/visualizer/VisualizerHarmonyOverlay.tsx'
import {FOLIA_MODE_MAP, foliaLineIndex, foliaPreviewTheme} from '@/utils/player/foliaTimeline.js'
import {foliaBackgroundConfig} from '@/utils/player/foliaBackground.js'
import {DEFAULT_CAPPELLA_TUNING, DEFAULT_PENDOLO_TUNING} from '@/vendor/folia/src/types.ts'
import {attachInterludes} from '@/vendor/folia/src/utils/lyrics/parserCore.ts'
import {FOLIA_ARTIST_AVATAR, FOLIA_USER_AVATAR} from '@/utils/player/foliaAvatars.js'
import './folia.css'

const loaders = {
  fume: () => import('@/vendor/folia/src/components/visualizer/fume/VisualizerFume.tsx'),
  classic: () => import('@/vendor/folia/src/components/visualizer/classic/Visualizer.tsx'),
  cadenza: () => import('@/vendor/folia/src/components/visualizer/cadenza/VisualizerCadenza.tsx'),
  partita: () => import('@/vendor/folia/src/components/visualizer/partita/VisualizerPartita.tsx'),
  cappella: () => import('@/vendor/folia/src/components/visualizer/cappella/VisualizerCappella.tsx'),
  tilt: () => import('@/vendor/folia/src/components/visualizer/tilt/VisualizerTilt.tsx'),
  diorama: () => import('@/vendor/folia/src/components/visualizer/diorama/VisualizerDiorama.tsx'),
  pendolo: () => import('@/vendor/folia/src/components/visualizer/pendolo/VisualizerPendolo.tsx'),
}
const modules = new Map()
const themes = Object.fromEntries(Object.keys(loaders).map(mode => [mode, foliaPreviewTheme(mode)]))
const cappellaPreview = {...DEFAULT_CAPPELLA_TUNING, avatarSource: 'custom'}
const pendoloPreview = {...DEFAULT_PENDOLO_TUNING, showCoverOnWatchFace: true, showGearDecor: 'full'}
const language = createInstance()
language.init({lng: 'zh-CN', initAsync: false, interpolation: {escapeValue: false}, resources: {
  'zh-CN': {translation: {ui: {noTrack: '无音轨', waitingForMusic: '', backToHome: '返回主页'}}},
}})

function NativeClockCommit({clock, mode, lines, index}) {
  React.useEffect(() => {
    // Native GlowWord/Partita chunks subscribe after mount and begin in "waiting".
    // Notify the exact paused position after subscriptions attach, without advancing it.
    const frame = requestAnimationFrame(() => clock.dirty())
    return () => cancelAnimationFrame(frame)
  }, [clock, mode, lines, index])
  return null
}

export function createFoliaRenderer(container, initialOptions) {
  const root = createRoot(container, {onUncaughtError: error => options.onError?.(error)})
  const currentTime = motionValue(0)
  const mediaTime = motionValue(0)
  const audioPower = motionValue(0)
  const audioBands = Object.fromEntries(['bass', 'lowMid', 'mid', 'vocal', 'treble'].map(key => [key, motionValue(0)]))
  audioBands.spectrum = motionValue(new Uint8Array(0))
  let options = initialOptions
  let sourceLines = null
  let nativeLines = []
  let Renderer = null
  let pickCappellaAvatar = null
  let renderedMode = null
  let requestedMode = null
  let lineIndex = -1
  let frame = 0
  let disposed = false
  let generation = 0
  const readClock = () => Math.max(0, Number(options.playing ? options.clock?.() ?? options.currentTimeMs : options.currentTimeMs) || 0)
  function sample() {
    const ms = readClock()
    mediaTime.set(ms / 1000)
    currentTime.set((ms + options.lyricLeadMs) / 1000)
    const bands = options.playing && !document.hidden ? options.bands?.() : null
    const breath = options.reducedMotion || document.hidden ? 0 : (Math.sin(Date.now() / 2000) + 1) * 20
    audioPower.set(bands?.power ?? breath)
    for (const key of ['bass', 'lowMid', 'mid', 'vocal', 'treble']) audioBands[key].set(bands?.[key] ?? breath)
    audioBands.spectrum.set(bands?.spectrum ? bands.spectrum.slice() : new Uint8Array(0))
    const next = foliaLineIndex(options.lines, currentTime.get())
    container.dataset.foliaTime = currentTime.get().toFixed(3)
    if (next !== lineIndex) {lineIndex = next; render()}
  }
  function render() {
    if (disposed || !Renderer) return
    const theme = themes[renderedMode]
    container.style.setProperty('--bg-color', theme.backgroundColor)
    container.style.setProperty('--text-primary', theme.primaryColor)
    container.style.setProperty('--text-secondary', theme.secondaryColor)
    container.style.setProperty('--text-accent', theme.accentColor)
    const shared = {currentTime, currentLineIndex: lineIndex, lines: options.lines, theme, subtitleTheme: theme,
      audioPower, audioBands, showText: true, songTitle: options.musicName, songArtist: options.artistNames,
      songAlbum: '', coverUrl: options.cover, seed: options.trackKey || options.musicName || 1,
      paused: !options.playing || document.hidden, staticMode: options.reducedMotion, backgroundStaticMode: options.reducedMotion || document.hidden,
      lyricsFontScale: 1, subtitleFontScale: 1, showSubtitleTranslation: true, subtitleContentMode: 'translation',
      showHarmonySubtitle: true, isPlayerChromeHidden: false,
      background: foliaBackgroundConfig(renderedMode, options.backgroundMode),
      cappellaTuning: renderedMode === 'cappella' ? cappellaPreview : undefined,
      cappellaCustomAvatarImages: renderedMode === 'cappella' ? cappellaAvatars() : undefined,
      pendoloTuning: renderedMode === 'pendolo' ? pendoloPreview : undefined,
      onLyricLineSeek: seconds => options.onSeek(Math.max(0, seconds * 1000 - options.lyricLeadMs)),
    }
    container.dataset.foliaMode = renderedMode
    container.dataset.foliaLine = String(lineIndex)
    root.render(React.createElement(I18nextProvider, {i18n: language},
      React.createElement(MotionConfig, {reducedMotion: options.reducedMotion ? 'always' : 'never'},
        React.createElement(React.Fragment, null,
          React.createElement(Renderer, {...shared, key: renderedMode}),
          React.createElement(HarmonyOverlay, shared),
          React.createElement(FoliaControls, {options, currentTime: mediaTime, theme}),
          React.createElement(NativeClockCommit, {clock: currentTime, mode: renderedMode, lines: options.lines, index: lineIndex}),
        ),
      ),
    ))
  }
  const shouldTick = () => !disposed && !document.hidden && (options.playing || !options.reducedMotion)
  function cappellaAvatars() {
    const images = [
      {id: 'user', name: '当前用户', url: options.userAvatar || FOLIA_USER_AVATAR},
      {id: 'artist', name: options.artistNames || '歌手', url: options.artistAvatar || options.cover || FOLIA_ARTIST_AVATAR},
    ]
    // Keep native seeded selection, arranging the pair so the right sender is always the user.
    return pickCappellaAvatar?.(images, 0, 'right', options.trackKey || options.musicName || 1)?.id === 'user' ? images : images.reverse()
  }
  function tick() {frame = 0; sample(); if (shouldTick()) frame = requestAnimationFrame(tick)}
  function syncLoop() {
    cancelAnimationFrame(frame); frame = 0
    sample()
    if (shouldTick()) frame = requestAnimationFrame(tick)
  }
  async function changeMode(mode) {
    requestedMode = mode
    const turn = ++generation
    try {
      if (!modules.has(mode)) modules.set(mode, loaders[mode]())
      const module = await modules.get(mode)
      if (mode === 'cappella') {
        const avatars = await import('@/vendor/folia/src/components/visualizer/cappella/avatarImages.ts')
        pickCappellaAvatar = avatars.pickStableBuiltinAvatarImage
      }
      if (disposed || turn !== generation) return
      Renderer = module.default; renderedMode = mode
      sample(); render(); options.onReady?.()
    } catch (error) {
      modules.delete(mode)
      if (!disposed && turn === generation) options.onError?.(error)
    }
  }
  function update(next) {
    if (next.lines !== sourceLines) {
      sourceLines = next.lines
      nativeLines = attachInterludes(sourceLines)
    }
    options = {...next, lines: nativeLines}
    const mode = FOLIA_MODE_MAP[options.mode] || 'classic'
    if (requestedMode !== mode) void changeMode(mode)
    syncLoop(); render()
  }
  const visibility = () => {syncLoop(); render()}
  document.addEventListener('visibilitychange', visibility)
  update(initialOptions)
  return {update, dispose() {
    disposed = true; generation++; cancelAnimationFrame(frame)
    document.removeEventListener('visibilitychange', visibility)
    root.unmount()
    for (const value of [currentTime, mediaTime, audioPower, ...Object.values(audioBands)]) value.destroy()
  }}
}
