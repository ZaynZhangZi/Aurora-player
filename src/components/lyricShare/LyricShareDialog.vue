<template>
  <Teleport to="body">
    <dialog ref="dialogRef" class="lyric-share-dialog" :class="{'is-visible': visible}" aria-labelledby="lyric-share-title" @cancel.prevent="closeLyricShare" @pointerdown="backdropPressed = $event.target === dialogRef" @click="onBackdropClick">
      <section v-if="ui.song" class="share-panel" :class="{'is-preview': step === 'preview'}">
        <header class="share-header">
          <button v-if="step === 'preview'" class="share-icon-button" type="button" :disabled="busy" aria-label="返回选择歌词" @click="step = 'select'"><ChevronLeftIcon /></button>
          <div><h2 id="lyric-share-title">{{ step === 'select' ? '选择歌词' : '分享歌词' }}</h2><p>{{ step === 'select' ? `${ui.song.name} · ${ui.song.artists}` : 'Apple Music 样式' }}</p></div>
          <button class="share-icon-button share-close" type="button" autofocus aria-label="关闭歌词分享" @click="closeLyricShare"><XMarkIcon /></button>
        </header>
        <Transition name="share-step" mode="out-in" @after-enter="onStepEntered">
          <div v-if="step === 'select'" key="select" class="share-selection-step">
            <div class="share-selection-toolbar"><span>选择你想分享的歌词</span><button type="button" :disabled="!selectedIds.length" @click="selectedIds = []">清空选择</button></div>
            <div ref="lyricListRef" class="share-lyrics-list" role="group" aria-label="选择要分享的歌词">
              <button v-for="line in ui.lines" :key="line.id" :ref="element => setLineRef(line.id, element)" class="share-lyric-row" :class="{'is-selected': selectedSet.has(line.id), 'is-background': line.isBG, 'is-duet': line.isDuet}" type="button" :aria-pressed="selectedSet.has(line.id)" @click="toggleLine(line.id, $event)">
                <span class="share-selection-mark" aria-hidden="true"><CheckIcon v-if="selectedSet.has(line.id)" /></span>
                <span class="share-lyric-text"><span>{{ line.text }}</span><small v-if="line.translation">{{ line.translation }}</small><em v-if="line.isBG">背景人声</em></span>
                <time>{{ formatShareTime(line.timeMs) }}</time>
              </button>
            </div>
            <footer class="share-selection-footer"><span aria-live="polite">已选择 <strong>{{ selectedIds.length }}</strong> 行歌词</span><button type="button" class="share-primary-button" :disabled="!selectedIds.length" @click="step = 'preview'">继续 <ArrowRightIcon /></button></footer>
          </div>
          <div v-else key="preview" class="share-preview-step">
            <div class="share-preview-stage"><LyricSharePreview :song="ui.song" :lines="outputLines" :options="options" /></div>
            <div class="share-settings">
              <div class="share-settings-heading"><span>分享图片</span><small>{{ outputLines.length }} 行 · 封面主题色</small></div>
              <label class="share-setting"><span>显示翻译<small v-if="!hasTranslation">所选歌词暂无翻译</small></span><input v-model="options.showTranslation" type="checkbox" :disabled="busy || !hasTranslation" /><span class="share-switch" aria-hidden="true" /></label>
              <label class="share-setting"><span>显示背景人声<small v-if="!hasBackgroundVocals">这首歌暂无背景人声标记</small></span><input v-model="options.showBackgroundVocals" type="checkbox" :disabled="busy || !hasBackgroundVocals" /><span class="share-switch" aria-hidden="true" /></label>
              <label class="share-setting"><span>粗体文本</span><input v-model="options.boldText" type="checkbox" :disabled="busy" /><span class="share-switch" aria-hidden="true" /></label>
              <label class="share-resolution"><span>图片清晰度</span><select v-model.number="options.scale" :disabled="busy"><option :value="1">标准 · 1500px</option><option :value="1.5">高清 · 2250px</option><option :value="2">超清 · 3000px</option></select></label>
              <p class="share-export-hint">图片高度随所选歌词调整，不裁切歌词。</p>
              <div class="share-export-buttons"><button type="button" class="share-secondary-button" :disabled="busy || !outputLines.length" @click="copyImage"><DocumentDuplicateIcon />{{ busyAction === 'copy' ? '复制中…' : '复制图片' }}</button><button type="button" class="share-primary-button" :disabled="busy || !outputLines.length" @click="saveImage"><ArrowDownTrayIcon />{{ busyAction === 'save' ? '保存中…' : '保存图片' }}</button></div>
              <div class="share-gif-actions"><button type="button" class="share-secondary-button share-gif-button" :disabled="busy || !outputLines.length" @click="saveGif"><FilmIcon />{{ busyAction === 'gif' ? `生成中 · ${gifProgress}%` : '保存 GIF 动图' }}</button><button v-if="busyAction === 'gif'" type="button" class="share-secondary-button" @click="cancelGifExport">取消</button></div>
              <p class="share-export-hint">GIF · {{ gifWidth }}px · 6 秒循环，无声音。复制图片仍为静态图片。</p>
              <p class="share-status" role="status">{{ status }}</p>
            </div>
          </div>
        </Transition>
      </section>
    </dialog>
  </Teleport>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, ref, watch} from 'vue'
import {ArrowDownTrayIcon, ArrowRightIcon, CheckIcon, ChevronLeftIcon, DocumentDuplicateIcon, FilmIcon, XMarkIcon} from '@/components/icons'
import LyricSharePreview from './LyricSharePreview.vue'
import {closeLyricShare, lyricShare as ui} from '@/composables/useLyricShare.js'
import {DEFAULT_SHARE_OPTIONS, formatShareTime, selectedShareLines, shareFileName} from '@/utils/lyricShare.js'
import {renderLyricShareImage} from '@/utils/lyricShareImage.js'
import {requireFeature, isTargetAvailable, getMaintenanceSnapshot} from '@/utils/maintenanceAccess.js'

const dialogRef = ref(null)
const lyricListRef = ref(null)
const visible = ref(false)
const step = ref('select')
const options = ref({...DEFAULT_SHARE_OPTIONS})
const selectedIds = ref([])
const status = ref('')
const busyAction = ref('')
const gifProgress = ref(0)
const busy = computed(() => Boolean(busyAction.value))
const gifWidth = computed(() => ({1: 480, 1.5: 720, 2: 960})[options.value.scale] || 480)
const selectedSet = computed(() => new Set(selectedIds.value))
const outputLines = computed(() => selectedShareLines(ui.lines, selectedIds.value, options.value))
const hasTranslation = computed(() => outputLines.value.some(line => Boolean(line.translation)))
const hasBackgroundVocals = computed(() => ui.lines.some(line => line.isBG))
const lineRefs = new Map()
let selectionAnchor = ''
let closeTimer = 0
let revealFrame = 0
let previousOverflow = ''
let scrollLocked = false
let focusBeforeDialog = null
let backdropPressed = false
let exportController = null

watch(() => ui.session, () => {
  exportController?.abort()
  selectedIds.value = ui.initialId ? [ui.initialId] : []
  selectionAnchor = ui.initialId
  options.value = {...DEFAULT_SHARE_OPTIONS}
  step.value = 'select'
  status.value = ''
  busyAction.value = ''
  gifProgress.value = 0
}, {immediate: true, flush: 'sync'})
watch([selectedIds, options], () => { status.value = '' }, {deep: true})

function setLineRef(id, element) { if (element) lineRefs.set(id, element); else lineRefs.delete(id) }
function toggleLine(id, event) {
  const next = new Set(selectedIds.value)
  if (event.shiftKey && selectionAnchor) {
    const start = ui.lines.findIndex(line => line.id === selectionAnchor)
    const end = ui.lines.findIndex(line => line.id === id)
    for (const line of ui.lines.slice(Math.min(start, end), Math.max(start, end) + 1)) next.add(line.id)
  } else if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = [...next]
  selectionAnchor = id
}
function onStepEntered() {
  if (step.value === 'select') {
    const line = lineRefs.get(selectedIds.value[0] || ui.initialId)
    if (line && lyricListRef.value) lyricListRef.value.scrollTop = Math.max(0, line.offsetTop - lyricListRef.value.clientHeight / 2 + line.clientHeight / 2)
    line?.focus({preventScroll: true})
  } else dialogRef.value?.querySelector('.share-settings input:not(:disabled), .share-resolution select')?.focus({preventScroll: true})
}

function startExport(action) {
  if (!requireFeature('feature.lyricShare')) return null
  if (busy.value || !outputLines.value.length) return null
  exportController = new AbortController()
  busyAction.value = action
  gifProgress.value = 0
  status.value = ''
  const session = ui.session
  const song = ui.song
  const lines = outputLines.value.map(line => ({...line}))
  const settings = {...options.value}
  const signal = exportController.signal
  return {session, song, lines, settings, signal}
}
function isCurrentExport(task) { return ui.open && ui.session === task.session && !task.signal.aborted && isTargetAvailable(getMaintenanceSnapshot().settings, 'feature.lyricShare') }
function exportFailed(error, task, message) {
  if (isCurrentExport(task) && error?.name !== 'AbortError') status.value = error?.message || message
}
function finishExport(task) { if (ui.session === task.session) busyAction.value = '' }
function downloadShareImage(result, filename) {
  if (!requireFeature('feature.lyricShare')) return
  const url = URL.createObjectURL(result.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}
async function saveImage() {
  const task = startExport('save')
  if (!task) return
  try {
    const result = await renderLyricShareImage(task.song, task.lines, task.settings, {signal: task.signal})
    if (!isCurrentExport(task)) return
    downloadShareImage(result, shareFileName(task.song))
    status.value = result.coverUnavailable ? '图片已准备好；封面受跨域限制，已使用主题色占位。' : '图片已准备好，查看浏览器的下载列表。'
  } catch (error) { exportFailed(error, task, '图片保存失败，请重试。') }
  finally { finishExport(task) }
}
async function saveGif() {
  const task = startExport('gif')
  if (!task) return
  status.value = '正在生成 GIF，可以随时取消。'
  try {
    // Load the exporter/encoder only when requested; normal preview remains lightweight.
    const {renderLyricShareGif} = await import('@/utils/lyricShareGif.js')
    if (!isCurrentExport(task)) return
    const result = await renderLyricShareGif(task.song, task.lines, task.settings, {
      signal: task.signal,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      onProgress: ({completed, total}) => { if (isCurrentExport(task)) gifProgress.value = Math.round(completed / total * 100) },
    })
    if (!isCurrentExport(task)) return
    downloadShareImage(result, shareFileName(task.song, 'gif'))
    status.value = result.coverUnavailable ? 'GIF 已准备好；封面受跨域限制，已使用主题色占位。' : `GIF 已准备好 · ${(result.blob.size / 1024 / 1024).toFixed(1)} MB，查看浏览器的下载列表。`
  } catch (error) { exportFailed(error, task, 'GIF 保存失败，请重试。') }
  finally { finishExport(task) }
}
function cancelGifExport() {
  if (busyAction.value !== 'gif') return
  exportController?.abort()
  status.value = '已取消 GIF 生成。'
}
async function copyImage() {
  if (!window.isSecureContext || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    status.value = '当前浏览器无法复制图片，请使用“保存图片”。'
    return
  }
  const task = startExport('copy')
  if (!task) return
  let result = null
  try {
    const image = renderLyricShareImage(task.song, task.lines, task.settings, {type: 'image/png', signal: task.signal}).then(value => {
      if (!isCurrentExport(task)) throw new DOMException('Export canceled', 'AbortError')
      result = value
      return value.blob
    })
    void image.catch(() => {}) // The clipboard may reject before it consumes the image promise.
    // Invoke write during the user gesture, not after a slow cover fetch (Safari).
    await navigator.clipboard.write([new ClipboardItem({'image/png': image})])
    if (isCurrentExport(task)) status.value = result?.coverUnavailable ? '图片已复制；封面受跨域限制，已使用主题色占位。' : '图片已复制，可以直接粘贴到聊天窗口。'
  } catch (error) {
    const message = error?.name === 'NotAllowedError' ? '浏览器未允许复制图片，请使用“保存图片”。' : '复制失败，请使用“保存图片”。'
    exportFailed({name: error?.name, message}, task, message)
  } finally { finishExport(task) }
}

function unlockScroll() {
  if (scrollLocked) document.body.style.overflow = previousOverflow
  scrollLocked = false
}
watch(() => ui.open, async open => {
  clearTimeout(closeTimer)
  cancelAnimationFrame(revealFrame)
  if (open) {
    await nextTick()
    if (!ui.open) return
    if (!dialogRef.value.open) {
      focusBeforeDialog = document.activeElement
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      scrollLocked = true
      dialogRef.value.showModal()
    }
    revealFrame = requestAnimationFrame(() => { visible.value = true; onStepEntered() })
  } else {
    exportController?.abort()
    if (!dialogRef.value?.open) return
    visible.value = false
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240
    closeTimer = window.setTimeout(() => {
      dialogRef.value?.close()
      unlockScroll()
      if (focusBeforeDialog?.isConnected && !focusBeforeDialog.closest('[inert]')) focusBeforeDialog.focus?.({preventScroll: true})
      else document.querySelector('.amll-wrapper.is-opened button:not(:disabled)')?.focus({preventScroll: true})
    }, delay)
  }
}, {immediate: true})
watch(step, () => { status.value = '' })
function onBackdropClick(event) { if (backdropPressed && event.target === dialogRef.value) closeLyricShare() }
onBeforeUnmount(() => {
  exportController?.abort()
  clearTimeout(closeTimer)
  cancelAnimationFrame(revealFrame)
  dialogRef.value?.close()
  unlockScroll()
  closeLyricShare()
})
</script>

<style scoped>
.lyric-share-dialog { position: fixed; inset: 0; display: none; width: 100%; max-width: none; height: 100dvh; max-height: none; margin: 0; padding: 24px; border: 0; outline: 0; color: #29272e; background: transparent; overflow: hidden; }
.lyric-share-dialog[open] { display: flex; align-items: center; justify-content: center; }
.lyric-share-dialog::backdrop { background: rgb(10 9 16 / .55); backdrop-filter: blur(16px); opacity: 0; transition: opacity 240ms ease; }
.lyric-share-dialog.is-visible::backdrop { opacity: 1; }
.share-panel { display: flex; width: min(100%, 620px); max-height: calc(100dvh - 48px); flex-direction: column; padding: 26px; border: 1px solid rgb(255 255 255 / .6); border-radius: 26px; background: #faf9fb; box-shadow: 0 30px 90px rgb(0 0 0 / .25); opacity: 0; transform: translateY(12px) scale(.985); transition: opacity 220ms ease, transform 240ms var(--spring-soft), width 240ms var(--spring-soft); }
.share-panel.is-preview { width: min(100%, 880px); }
.is-visible .share-panel { opacity: 1; transform: none; }
.share-header { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
.share-header > div { min-width: 0; }
.share-header h2 { margin: 0; font-size: 20px; font-weight: 750; letter-spacing: -.03em; }
.share-header p { overflow: hidden; margin: 6px 0 0; color: #98929d; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.share-icon-button { display: grid; width: 38px; height: 38px; flex: none; place-items: center; border: 0; border-radius: 50%; color: #837b8b; background: #eeecf1; cursor: pointer; }
.share-icon-button svg { width: 19px; height: 19px; }
.share-close { margin-left: auto; }
.share-selection-step { display: flex; min-height: 0; flex-direction: column; }
.share-selection-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 0 2px 14px; color: #a19aa6; font-size: 11px; }
.share-selection-toolbar button { padding: 0; border: 0; color: #b76681; background: transparent; font-size: 11px; cursor: pointer; }
.share-lyrics-list { position: relative; max-height: min(56dvh, 520px); overflow-y: auto; padding: 3px; scrollbar-width: thin; scrollbar-color: #d8d2dd transparent; overscroll-behavior: contain; }
.share-lyric-row { display: flex; width: 100%; align-items: center; gap: 14px; margin-bottom: 5px; padding: 15px 14px; border: 1px solid transparent; border-radius: 13px; color: #5a5263; background: transparent; text-align: left; cursor: pointer; transition: background 140ms ease, color 140ms ease; }
.share-lyric-row:hover { background: #f1edf3; }
.share-lyric-row.is-selected { color: #a44667; border-color: #ebd3de; background: #f5eaf0; }
.share-selection-mark { display: grid; width: 20px; height: 20px; flex: none; place-items: center; border: 1.5px solid #d3ccd9; border-radius: 50%; }
.is-selected .share-selection-mark { color: #fff; border-color: #b8607d; background: #b8607d; }
.share-selection-mark svg { width: 13px; height: 13px; stroke-width: 2.5; }
.share-lyric-text { min-width: 0; flex: 1; }
.share-lyric-text > span { display: block; font-size: 15px; font-weight: 650; line-height: 1.55; overflow-wrap: anywhere; }
.share-lyric-text small { display: block; margin-top: 6px; opacity: .6; font-size: 11px; line-height: 1.6; overflow-wrap: anywhere; }
.share-lyric-text em { display: block; margin-top: 5px; opacity: .5; font-size: 10px; font-style: normal; }
.share-lyric-row.is-background { padding-left: 36px; }
.share-lyric-row.is-duet .share-lyric-text { text-align: right; }
.share-lyric-row time { flex: none; color: #b4acbc; font-size: 10px; font-variant-numeric: tabular-nums; }
.share-selection-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 18px; padding-top: 18px; border-top: 1px solid #eae5ee; }
.share-selection-footer > span { color: #a096a7; font-size: 12px; }
.share-selection-footer strong { color: #706477; font-weight: 650; }
.share-primary-button, .share-secondary-button { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; border: 0; border-radius: 12px; color: #fff; background: #b65a78; font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; }
.share-primary-button svg, .share-secondary-button svg { width: 17px; height: 17px; }
.share-secondary-button { color: #75697f; background: #eeebf1; }
button:disabled { opacity: .4; cursor: default; }
.share-preview-step { display: grid; min-height: 0; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); align-items: center; gap: 32px; overflow-y: auto; }
.share-preview-stage { max-height: min(69dvh, 640px); align-self: start; overflow-y: auto; padding: 4px 18px 24px; scrollbar-width: thin; scrollbar-color: #d8d2dd transparent; }
.share-settings { min-width: 0; padding: 4px 4px 0; }
.share-settings-heading { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.share-settings-heading > span { font-size: 16px; font-weight: 700; }
.share-settings-heading small { color: #a399ab; font-size: 11px; }
.share-setting { position: relative; display: flex; min-height: 56px; align-items: center; justify-content: space-between; gap: 18px; border-bottom: 1px solid #eee9f2; font-size: 12px; cursor: pointer; }
.share-setting > span:first-child { color: #73667d; }
.share-setting small { display: block; margin-top: 4px; color: #aaa0b2; font-size: 10px; }
.share-setting input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.share-switch { position: relative; width: 32px; height: 19px; flex: none; border-radius: 20px; background: #d7d0df; transition: background 160ms ease; }
.share-switch::after { position: absolute; top: 3px; left: 3px; width: 13px; height: 13px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgb(0 0 0 / .12); content: ''; transition: transform 160ms ease; }
.share-setting input:checked + .share-switch { background: #b65a78; }
.share-setting input:checked + .share-switch::after { transform: translateX(13px); }
.share-setting input:disabled + .share-switch { opacity: .35; }
.share-setting input:focus-visible + .share-switch { outline: 2px solid #b65a78; outline-offset: 4px; }
.share-resolution { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 22px; color: #8f819a; font-size: 11px; }
.share-resolution select { max-width: 160px; padding: 8px; border: 1px solid #e6dfe9; border-radius: 9px; color: #73667d; background: #fff; font: inherit; font-size: 11px; }
.share-export-hint { margin: 12px 0 0; color: #b0a6b8; font-size: 10px; line-height: 1.6; }
.share-export-buttons { display: flex; gap: 9px; margin-top: 25px; }
.share-export-buttons > button { flex: 1; padding-inline: 8px; }
.share-gif-actions { display: flex; gap: 9px; margin-top: 10px; }
.share-gif-button { flex: 1; }
.share-status { min-height: 38px; margin: 12px 0 0; color: #a55c77; font-size: 11px; line-height: 1.6; }
button:focus-visible, select:focus-visible { outline: 2px solid #b65a78; outline-offset: 3px; }
.share-step-enter-active, .share-step-leave-active { transition: opacity 140ms ease; }
.share-step-enter-from, .share-step-leave-to { opacity: 0; }
@media (max-width: 650px) { .lyric-share-dialog { padding: 12px; } .share-panel { max-height: calc(100dvh - 24px); padding: 21px; border-radius: 22px; } .share-preview-step { grid-template-columns: 1fr; gap: 22px; } .share-preview-stage { width: min(100%, 310px); max-height: 48dvh; margin: auto; padding: 4px 4px 16px; } .share-lyric-row { gap: 10px; padding-inline: 9px; } .share-lyric-text > span { font-size: 14px; } .share-header h2 { font-size: 18px; } .share-export-buttons { margin-top: 18px; } }
@media (prefers-reduced-motion: reduce) { .share-panel, .lyric-share-dialog::backdrop, .share-step-enter-active, .share-step-leave-active, .share-switch, .share-switch::after, .share-lyric-row { transition: none; transform: none; } }
</style>
