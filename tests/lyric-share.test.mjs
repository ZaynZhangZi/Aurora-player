import assert from 'node:assert/strict'
import {after, test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {readFile, access} from 'node:fs/promises'
import {createServer} from 'vite'
import {createShareLayout, DEFAULT_SHARE_OPTIONS, initialShareLine, normalizeShareLines, normalizeShareSong, selectedShareLines, shareExportSize, shareFileName, sharePalette, wrapShareText} from '../src/utils/lyricShare.js'
import {createSharePreviewMotion} from '../src/utils/lyricSharePreviewMotion.js'

const storage = new Map()
Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
}})
const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../', import.meta.url)),
  resolve: {alias: {'@': fileURLToPath(new URL('../src', import.meta.url))}},
  server: {middlewareMode: true, hmr: false},
  optimizeDeps: {noDiscovery: true},
  ssr: {external: ['vue', 'pinia']},
})
after(() => server.close())
const {openLyricShare, closeLyricShare, lyricShare} = await server.ssrLoadModule('/src/composables/useLyricShare.js')
const {renderLyricShareImage} = await server.ssrLoadModule('/src/utils/lyricShareImage.js')
const {usePlayerLyricLoader} = await server.ssrLoadModule('/src/composables/usePlayerLyricLoader.js')
const {songsApi} = await server.ssrLoadModule('/src/api/songsApi/songsApi.js')
const rawLines = () => [
  {startTime: 1000, words: [{word: 'Good '}, {word: 'morning'}], translatedLyric: '早上好'},
  {startTime: 1300, words: [{word: '(oh)'}], isBG: true},
  {startTime: 2000, words: [{word: '…'}]},
  {startTime: 3000, words: [{word: '另一句歌词'}], isDuet: true},
  {startTime: 4000, words: [{word: '下一句'}]},
]
const song = () => normalizeShareSong({name: '今天的歌', artists: [{name: '艺人'}], theme: {base: [40, 60, 80], accent: [110, 70, 100], glow: [130, 110, 155]}})
const context = () => ({font: '', measureText(value) { return {width: Array.from(value).length * (Number(this.font.match(/(\d+)px/)?.[1]) || 20) * .7} }})

test('share lines retain word spacing, translation, backing vocals and duet metadata while ignoring interludes', () => {
  const lines = normalizeShareLines(rawLines())
  assert.equal(lines.length, 4)
  assert.equal(lines[0].text, 'Good morning')
  assert.equal(lines[0].translation, '早上好')
  assert.equal(lines[1].isBG, true)
  assert.equal(lines[2].isDuet, true)
  const longText = '🌌'.repeat(900)
  assert.equal(normalizeShareLines([{startTime: 0, words: [{word: longText}]}])[0].text, longText)
})

test('multi-selection is exported in song order and backing vocals follow the selected lead', () => {
  const lines = normalizeShareLines(rawLines())
  const ids = [lines[2].id, lines[0].id]
  assert.deepEqual(selectedShareLines(lines, ids).map(line => line.text), ['Good morning', '(oh)', '另一句歌词'])
  assert.deepEqual(selectedShareLines(lines, ids, {showBackgroundVocals: false}).map(line => line.text), ['Good morning', '另一句歌词'])
  assert.equal(selectedShareLines(lines, []).length, 0)
})

test('right-click chooses the exact line; the toolbar chooses the current lead line without seeking playback', () => {
  const lines = normalizeShareLines(rawLines())
  assert.equal(initialShareLine(lines, {timeMs: 2700}), lines[0].id)
  assert.equal(initialShareLine(lines, {line: rawLines()[1], timeMs: 0}), lines[1].id)
  assert.equal(initialShareLine([], {}), '')
})

test('a share session owns a snapshot, does not follow the next track, and reopens with a fresh selection', () => {
  const input = {name: '第一首', artists: [{name: '原艺人'}], theme: {base: [10, 20, 30]}}
  const lyrics = rawLines()
  assert.equal(openLyricShare(input, lyrics, {timeMs: 3200}), true)
  const session = lyricShare.session
  input.name = '下一首'
  input.artists[0].name = '其他艺人'
  input.theme.base[0] = 255
  lyrics[0].words[0].word = 'changed'
  assert.equal(lyricShare.song.name, '第一首')
  assert.equal(lyricShare.song.artists, '原艺人')
  assert.equal(lyricShare.song.theme.base[0], 10)
  assert.equal(lyricShare.lines[0].text, 'Good morning')
  closeLyricShare()
  assert.equal(lyricShare.open, false)
  openLyricShare(input, rawLines(), {timeMs: 1000})
  assert.equal(lyricShare.session, session + 1)
  assert.equal(lyricShare.initialId, lyricShare.lines[0].id)
  closeLyricShare()
  assert.equal(openLyricShare(input, []), false)
  assert.equal(lyricShare.open, false)
})

test('layout keeps translations optional and preserves duet alignment, font settings and the full lyric', () => {
  const lines = normalizeShareLines(rawLines())
  const layout = createShareLayout(song(), lines, DEFAULT_SHARE_OPTIONS, context())
  assert.ok(layout.runs.some(run => run.text === '早上好'))
  assert.equal(layout.runs.find(run => run.text === '另一句歌词').align, 'end')
  assert.equal(layout.runs.find(run => run.text === '(oh)').size, 44)
  const plain = createShareLayout(song(), lines, {...DEFAULT_SHARE_OPTIONS, showTranslation: false, boldText: false}, context())
  assert.ok(plain.runs.every(run => run.text !== '早上好' && run.weight === 500))
  const text = '🌌'.repeat(600)
  const long = createShareLayout(song(), [{text, isDuet: false}], DEFAULT_SHARE_OPTIONS, context())
  assert.equal(long.runs.map(run => run.text).join(''), text)
  assert.ok(long.height > layout.height)
  assert.ok(long.runs.at(-1).y < long.height - 136)
})

test('wrapping retains English words, explicit line breaks and Unicode code points', () => {
  const ctx = {measureText: value => ({width: Array.from(value).length * 10})}
  assert.deepEqual(wrapShareText(ctx, 'good morning\n你好 🌌', 80), ['good', 'morning', '你好 🌌'])
  const emoji = '🌌'.repeat(40)
  assert.equal(wrapShareText(ctx, emoji, 100).join(''), emoji)
})

test('preview height eases to the new layout, reverses from its current frame and cancels on unmount or reduced motion', () => {
  const frames = new Map()
  let nextFrame = 0
  let height = 0
  const motion = createSharePreviewMotion(value => { height = value }, {
    requestFrame: callback => { frames.set(++nextFrame, callback); return nextFrame },
    cancelFrame: id => frames.delete(id),
  })
  const tick = time => {
    const callbacks = [...frames.values()]
    frames.clear()
    for (const callback of callbacks) callback(time)
  }
  motion.setHeight(700)
  assert.equal(height, 700)
  assert.equal(frames.size, 0, 'the first preview has no entrance resize')
  motion.setHeight(1000)
  tick(0)
  tick(160)
  assert.equal(height, 850)
  motion.setHeight(700)
  assert.equal(frames.size, 1, 'rapid changes cancel the preceding animation')
  tick(170)
  assert.equal(height, 850, 'a reversal starts at the current visual height without jumping')
  tick(490)
  assert.equal(height, 700)
  assert.equal(frames.size, 0)
  motion.setHeight(1000)
  motion.setHeight(760, {animate: false})
  assert.equal(height, 760)
  assert.equal(frames.size, 0, 'reduced motion immediately applies the final height')
  motion.setHeight(1000)
  motion.stop()
  assert.equal(frames.size, 0, 'unmount cancels all pending frames')
  tick(1000)
  assert.equal(height, 760)
})

test('export resolution is independently scaled and large canvases fail safely instead of clipping lyrics', () => {
  assert.deepEqual(shareExportSize({width: 1500, height: 800}, 1.5), {width: 2250, height: 1200, scale: 1.5})
  assert.deepEqual(shareExportSize({width: 1500, height: 800}, 99), {width: 1500, height: 800, scale: 1})
  assert.throws(() => shareExportSize({width: 1500, height: 20000}, 2), /减少几行/)
  const palette = sharePalette({base: [255, 255, 255], accent: [255, 255, 255], glow: [255, 255, 255]})
  assert.deepEqual(palette.base, [92, 92, 92])
  assert.ok(palette.accent.every(channel => channel <= 148))
})

test('JPEG downloads and PNG clipboard images use the same measured layout and a safe missing-cover fallback', async () => {
  const canvases = []
  const drawnText = []
  const priorDocument = globalThis.document
  globalThis.document = {createElement: tag => {
    assert.equal(tag, 'canvas')
    const ctx = new Proxy({...context(), fillText: text => drawnText.push(text), createLinearGradient: () => ({addColorStop() {}}), createRadialGradient: () => ({addColorStop() {}})}, {get: (target, key) => key in target ? target[key] : () => {}})
    const canvas = {getContext: () => ctx, toBlob: (done, type) => done(new Blob(['image-test'], {type}))}
    canvases.push(canvas)
    return canvas
  }}
  try {
    const lines = normalizeShareLines(rawLines())
    const jpeg = await renderLyricShareImage(song(), lines, DEFAULT_SHARE_OPTIONS)
    const png = await renderLyricShareImage(song(), lines, {...DEFAULT_SHARE_OPTIONS, scale: 2}, {type: 'image/png'})
    assert.equal(jpeg.blob.type, 'image/jpeg')
    assert.equal(png.blob.type, 'image/png')
    assert.equal(jpeg.coverUnavailable, false)
    assert.equal(png.width, jpeg.width * 2)
    assert.equal(png.height, jpeg.height * 2)
    assert.equal(canvases[0].height, jpeg.height)
    const layout = createShareLayout(song(), lines, DEFAULT_SHARE_OPTIONS, context())
    const expectedText = [Array.from(song().name)[0], layout.name, layout.artists, ...layout.runs.map(run => run.text)]
    assert.deepEqual(drawnText, [...expectedText, ...expectedText], 'exports only draw the cover fallback, song metadata and selected lyrics, without a footer logo')
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(renderLyricShareImage(song(), lines, DEFAULT_SHARE_OPTIONS, {signal: controller.signal}), {name: 'AbortError'})
  } finally {
    if (priorDocument === undefined) delete globalThis.document
    else globalThis.document = priorDocument
  }
})

test('filenames and media URLs are sanitized without changing the lyric text', () => {
  assert.equal(shareFileName({name: 'A:🌌/歌?'}), 'A🌌歌-歌词分享.jpg')
  assert.equal(normalizeShareSong({cover: 'javascript:alert(1)'}).cover, '')
})

test('a late lyric response cannot overwrite the active song and published lyrics include their owning track', async () => {
  let finishOld
  const old = new Promise(resolve => { finishOld = resolve })
  const originalSearch = songsApi.getLyricSearch
  songsApi.getLyricSearch = ({id}) => id === 1 ? old : Promise.resolve({data: {text: 'new'}})
  const updates = []
  let current = {id: 1, name: 'old', artists: []}
  try {
    const loader = usePlayerLyricLoader({getSongName: () => current.name, getFirstArtistName: () => '', getCurrentSong: () => current,
      hasLyricText: value => Boolean(value.text), extractLyricPayloadFromSearchResult: value => value,
      normalizeLyricPayloadToAmll: value => [{words: [{word: value.text}]}], isLyricTranslateEnabled: () => false,
      setLyricLines: (lines, id) => updates.push({lines, id}),
    })
    const first = loader.loadCurrentSongLyric(1)
    current = {id: 2, name: 'new', artists: []}
    await loader.loadCurrentSongLyric(2)
    finishOld({data: {text: 'old'}})
    await first
    assert.equal(updates.length, 1)
    assert.equal(updates[0].id, 2)
  } finally { songsApi.getLyricSearch = originalSearch }
})

test('the removed bookmark feature has no remaining components, persistence, routes or player seek hooks', async () => {
  for (const path of ['src/stores/lyricMomentsStore.js', 'src/composables/useLyricMomentDialog.js', 'src/utils/lyricMoments.js', 'src/utils/playLyricMoment.js', 'src/view/lyricMoment/lyricMoment.vue']) {
    await assert.rejects(access(new URL(`../${path}`, import.meta.url)), {code: 'ENOENT'})
  }
  for (const path of ['src/view/profile/profile.vue', 'src/router/index.js', 'src/stores/playerStore.js', 'src/components/globalFooterPlayer/globalFooterPlayer.vue']) {
    const code = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
    assert.doesNotMatch(code, /lyricMoment|lyric-moment|歌词时刻|pendingResumeExact|bookmark-seek/)
  }
})
