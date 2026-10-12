import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {toFoliaLines, foliaLineIndex, FOLIA_MODE_MAP} from '../src/utils/player/foliaTimeline.js'
import {normalizePlayerAppearance, PLAYER_APPEARANCE_OPTIONS} from '../src/utils/player/playerAppearance.js'
import {foliaAudioBands} from '../src/utils/player/foliaAudio.js'
import {foliaBackgroundConfig, normalizeFoliaBackground} from '../src/utils/player/foliaBackground.js'

test('all eight requested renderers and their native helpers match the pinned upstream bytes', async () => {
  const vendor = new URL('../src/vendor/folia/', import.meta.url)
  const manifest = JSON.parse(await readFile(new URL('upstream.json', vendor)))
  assert.equal(manifest.commit, 'd79fa951dfa631fa9b4b7ebb0b4f58bd3e2c1fa8')
  const adapted = new Set(manifest.adaptedFiles)
  let verified = 0
  for (const [path, expected] of Object.entries(manifest.files)) {
    if (adapted.has(path)) continue
    const actual = createHash('sha256').update(await readFile(new URL(path, vendor))).digest('hex')
    assert.equal(actual, expected, path)
    verified++
  }
  assert.ok(verified > 130)
  for (const mode of Object.values(FOLIA_MODE_MAP)) {
    const entry = mode === 'classic' ? 'classic/Visualizer.tsx' : `${mode}/Visualizer${mode[0].toUpperCase() + mode.slice(1)}.tsx`
    assert.ok(manifest.files[`src/components/visualizer/${entry}`], entry)
    assert.equal(adapted.has(`src/components/visualizer/${entry}`), false)
  }
})

test('reference background exceptions and current Folia background are preserved separately', () => {
  assert.equal(normalizeFoliaBackground('obsolete'), 'reference')
  assert.deepEqual(foliaBackgroundConfig('classic', 'latent'), {mode: 'latent'})
  assert.equal(foliaBackgroundConfig('classic').common.useCoverColorBg, false)
  assert.equal(foliaBackgroundConfig('tilt').common.disableVignette, true)
  assert.equal(foliaBackgroundConfig('classic').common.disableVignette, false)
  assert.equal(foliaBackgroundConfig('pendolo').common.disableGeometricBackground, true)
  assert.equal(foliaBackgroundConfig('classic', 'cover').common.useCoverColorBg, true)
  assert.equal(foliaBackgroundConfig('classic', 'cover').common.opacity, .75)
})

test('the bridge preserves word boundaries, gaps, Unicode, duet and both subtitle tracks in seconds', () => {
  const raw = [{startTime: 1000, endTime: 5000, translatedLyric: '听见你', romanLyric: 'ting jian ni', isDuet: true,
    words: [{word: 'Hear ', startTime: 1000, endTime: 1600}, {word: '你👨‍👩‍👧‍👦e\u0301', startTime: 2200, endTime: 4700}]}]
  const original = JSON.stringify(raw)
  const [line] = toFoliaLines(raw)
  assert.equal(line.fullText, 'Hear 你👨‍👩‍👧‍👦e\u0301')
  assert.deepEqual(line.words, [{text: 'Hear ', startTime: 1, endTime: 1.6}, {text: '你👨‍👩‍👧‍👦e\u0301', startTime: 2.2, endTime: 4.7}])
  assert.equal(line.translation, '听见你')
  assert.equal(line.romanization, 'ting jian ni')
  assert.equal(line.agentId, 'v2')
  assert.equal(JSON.stringify(raw), original)
})

test('harmony is attached to its overlapping native line rather than becoming another main lyric', () => {
  const lines = toFoliaLines([
    {startTime: 1000, endTime: 5000, words: [{word: '主唱', startTime: 1000, endTime: 5000}]},
    {startTime: 1200, endTime: 1700, words: [{word: '和声', startTime: 1200, endTime: 1700}], isBG: true, isDuet: true},
    {startTime: 9000, endTime: 12000, words: [{word: '回来', startTime: 9000, endTime: 12000}]},
  ])
  assert.equal(lines.length, 2)
  assert.equal(lines[0].backgroundVocals[0].text, '和声')
  assert.equal(lines[0].backgroundVocals[0].agentId, 'v2')
  for (const [seconds, index] of [[0,-1],[1,0],[4.9,0],[5,0],[5.001,-1],[8.9,-1],[9,1],[12,1],[12.001,-1],[2,0]]) assert.equal(foliaLineIndex(lines, seconds), index)
  assert.equal(foliaLineIndex([{startTime:1,endTime:5},{startTime:3,endTime:4}], 4.5), 0)
  assert.deepEqual(toFoliaLines(null), [])
  assert.equal(foliaLineIndex([], 10), -1)
})

test('all eight themes are selectable, with the original AMLL player and stale preference fallback', () => {
  assert.deepEqual(PLAYER_APPEARANCE_OPTIONS.map(option => option.label), ['原版', '浮名', '流光', '心象', '云阶', '群唱', '倾诉', '镜台', '时计'])
  assert.equal(new Set(PLAYER_APPEARANCE_OPTIONS.map(option => option.id)).size, 9)
  assert.deepEqual(Object.values(FOLIA_MODE_MAP), ['fume', 'classic', 'cadenza', 'partita', 'cappella', 'tilt', 'diorama', 'pendolo'])
  for (const value of [null, undefined, {}, 'obsolete']) assert.equal(normalizePlayerAppearance(value), 'amll')
  for (const {id} of PLAYER_APPEARANCE_OPTIONS) assert.equal(normalizePlayerAppearance(id), id)
})

test('native frequency signals retain the upstream 0–255 range and nonlinear response at both sample rates', () => {
  for (const sampleRate of [44100, 48000]) {
    for (const level of [0, 128, 255]) {
      const bands = foliaAudioBands(new Uint8Array(1024).fill(level), sampleRate, 2048)
      assert.equal(bands.power, Math.pow(level / 255, 3) * 255)
      assert.equal(bands.bass, Math.pow(level / 255, 1.8) * 255)
      assert.equal(bands.vocal, Math.pow(level / 255, 1.5) * 255)
      assert.ok(Object.entries(bands).filter(([key]) => key !== 'spectrum').every(([, value]) => value >= 0 && value <= 255))
    }
  }
})
