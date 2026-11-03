<template>
  <Teleport to="body">
    <dialog id="app-settings" ref="dialogRef" class="app-settings-dialog" :class="{'is-visible': visible}" aria-labelledby="app-settings-title" @cancel.prevent="emit('close')" @close="onNativeClose" @keydown="onDialogKeydown" @pointerdown="backdropPressed = $event.target === dialogRef" @click="onBackdropClick">
      <section class="settings-shell">
        <header class="settings-header">
          <div><h2 id="app-settings-title">设置</h2><p>调整音乐的呈现与播放方式</p></div>
          <button type="button" class="settings-close" autofocus aria-label="关闭设置" @click="emit('close')"><XMarkIcon /></button>
        </header>
        <div class="settings-body">
          <nav class="settings-tabs" role="tablist" aria-label="设置分类" @keydown="onTabKeydown">
            <button id="settings-tab-appearance" type="button" role="tab" :aria-selected="section === 'appearance'" aria-controls="settings-appearance" :tabindex="section === 'appearance' ? 0 : -1" @click="section = 'appearance'"><Squares2X2Icon /><span>外观</span></button>
            <button id="settings-tab-playback" type="button" role="tab" :aria-selected="section === 'playback'" aria-controls="settings-playback" :tabindex="section === 'playback' ? 0 : -1" @click="section = 'playback'"><MusicalNoteIcon /><span>播放</span></button>
          </nav>
          <div class="settings-content">
            <section v-show="section === 'appearance'" id="settings-appearance" role="tabpanel" aria-labelledby="settings-tab-appearance" tabindex="0">
              <div class="settings-section-heading"><h3>播放器样式</h3><p>选择全屏歌词的呈现方式</p></div>
              <PlayerAppearancePicker />
            </section>
            <section v-show="section === 'playback'" id="settings-playback" role="tabpanel" aria-labelledby="settings-tab-playback" tabindex="0">
              <div class="settings-section-heading"><h3>播放偏好</h3><p>为每一次聆听选择合适的声音</p></div>
              <label v-maintenance="'feature.automix'" class="settings-row">
                <span><strong>智能混音</strong><small>自动优化歌曲之间的衔接</small></span>
                <input type="checkbox" role="switch" :checked="automixEnabled" aria-label="智能混音" @change="emit('toggle-automix')" />
                <span class="settings-switch" aria-hidden="true" />
              </label>
              <div class="settings-row">
                <span><strong>播放模式</strong><small>选择歌曲播放的顺序</small></span>
                <select :value="playMode" aria-label="播放模式" @change="emit('play-mode', $event.target.value)"><option value="sequence">顺序播放</option><option value="single">单曲循环</option><option value="shuffle">随机播放</option></select>
              </div>
              <div v-maintenance="'feature.audioQuality'" class="settings-quality">
                <div class="settings-quality-heading"><h3>播放音质</h3><small v-if="hasSong">当前 · {{ qualityLabel(currentQuality) }}</small></div>
                <div class="settings-quality-options">
                  <button v-for="option in AUDIO_QUALITY_OPTIONS" :key="option.level" type="button" :class="{'is-selected': selectedQuality === option.level}" :aria-pressed="selectedQuality === option.level" :disabled="qualitySwitching" @click="emit('quality', option.level)"><strong>{{ option.label }}<CheckIcon v-if="selectedQuality === option.level" /></strong><small>{{ qualityLoadingLevel === option.level ? '获取音源中…' : option.detail }}</small></button>
                </div>
                <p v-if="hasSong && qualityRank(currentQuality) < qualityRank(selectedQuality)" class="settings-hint">这首歌目前仅提供 {{ qualityLabel(currentQuality) }} 音源</p>
              </div>
              <div class="settings-current-track">
                <div class="settings-section-heading"><h3>当前播放</h3><p>{{ songName || '还没有正在播放的歌曲' }}</p></div>
                <div class="settings-track-actions"><button type="button" :disabled="!hasSong" @click="emit('playlist')"><QueueListIcon />播放列表 <small>{{ queueLength }} 首</small></button><button type="button" :disabled="!shareAvailable" @click="emit('share')"><ArrowUpTrayIcon />分享歌词</button></div>
              </div>
            </section>
          </div>
        </div>
        <footer class="settings-footer"><CheckCircleIcon /><span>偏好会自动保存</span></footer>
      </section>
    </dialog>
  </Teleport>
</template>

<script setup>
import {nextTick, onBeforeUnmount, ref, watch} from 'vue'
import {ArrowUpTrayIcon, CheckCircleIcon, CheckIcon, MusicalNoteIcon, QueueListIcon, Squares2X2Icon, XMarkIcon} from '@/components/icons'
import PlayerAppearancePicker from '@/components/globalFooterPlayer/PlayerAppearancePicker.vue'
import {AUDIO_QUALITY_OPTIONS, qualityLabel, qualityRank} from '@/utils/player/audioQuality.js'
import {lockScroll, unlockScroll} from '@/utils/scrollLock.js'

const props = defineProps({open: Boolean, automixEnabled: Boolean, playMode: {type: String, default: 'sequence'},
  selectedQuality: {type: String, default: 'exhigh'}, currentQuality: {type: String, default: 'standard'},
  qualitySwitching: Boolean, qualityLoadingLevel: {type: String, default: ''}, hasSong: Boolean,
  songName: {type: String, default: ''}, queueLength: {type: Number, default: 0}, shareAvailable: Boolean})
const emit = defineEmits(['close', 'after-close', 'toggle-automix', 'play-mode', 'quality', 'playlist', 'share'])
const dialogRef = ref(null)
const visible = ref(false)
const section = ref('appearance')
let backdropPressed = false, scrollLocked = false, returnFocus = null, closeTimer = 0, turn = 0

function finishClose(notify = true) {
  const wasOpen = dialogRef.value?.open || scrollLocked
  dialogRef.value?.close()
  if (scrollLocked) { unlockScroll(); scrollLocked = false }
  if (wasOpen) {
    const focusTarget = returnFocus?.isConnected ? returnFocus : document.querySelector('.aurora-settings')
    focusTarget?.focus({preventScroll: true})
  }
  returnFocus = null
  if (notify && wasOpen) emit('after-close')
}
function onNativeClose() {
  if (!scrollLocked) return
  clearTimeout(closeTimer)
  visible.value = false
  emit('close')
  finishClose()
}
function onBackdropClick(event) {
  if (backdropPressed && event.target === dialogRef.value) emit('close')
  backdropPressed = false
}
function onDialogKeydown(event) {
  if (event.key !== 'Tab') return
  const controls = [...dialogRef.value.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')]
    .filter(element => element.tabIndex >= 0 && element.getClientRects().length)
  const first = controls[0], last = controls.at(-1)
  if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault()
    const target = event.shiftKey ? last : first
    target?.focus({preventScroll: true})
  }
}
function onTabKeydown(event) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  section.value = event.key === 'Home' ? 'appearance' : event.key === 'End' ? 'playback' : section.value === 'appearance' ? 'playback' : 'appearance'
  nextTick(() => dialogRef.value?.querySelector('[role="tab"][aria-selected="true"]')?.focus())
}
watch(() => props.open, async opened => {
  const request = ++turn
  clearTimeout(closeTimer)
  if (!opened) {
    visible.value = false
    if (dialogRef.value?.open) closeTimer = window.setTimeout(finishClose, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150)
    return
  }
  await nextTick()
  if (request !== turn || !props.open || !dialogRef.value) return
  if (!dialogRef.value.open) {
    returnFocus = document.activeElement
    dialogRef.value.showModal()
    lockScroll(); scrollLocked = true
  }
  visible.value = true
}, {immediate: true, flush: 'post'})
onBeforeUnmount(() => {turn++; clearTimeout(closeTimer); finishClose(false)})
</script>

<style scoped>
.app-settings-dialog { box-sizing: border-box; width: min(900px, calc(100vw - 40px)); max-width: none; max-height: none; margin: auto; padding: 0; border: 0; color: #2b2b33; background: transparent; overflow: visible; font-family: inherit; }
.app-settings-dialog::backdrop { background: rgb(24 24 32 / .38); backdrop-filter: blur(8px); }
.settings-shell { display: flex; height: min(800px, calc(100dvh - 56px)); flex-direction: column; overflow: hidden; border: 1px solid #ffffffcc; border-radius: 24px; background: #fbfbfc; box-shadow: 0 28px 100px #14142233; opacity: 0; transform: translateY(12px); transition: opacity 150ms, transform 180ms cubic-bezier(.22,1,.36,1); }
.is-visible .settings-shell { opacity: 1; transform: translateY(0); }
.settings-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 24px 28px 22px; border-bottom: 1px solid #ececef; background: #fff; }
.settings-header h2 { margin: 0; font-size: 21px; font-weight: 750; letter-spacing: -.03em; }
.settings-header p, .settings-section-heading p { margin: 6px 0 0; color: #909097; font-size: 12px; line-height: 1.6; }
.settings-close { display: grid; width: 40px; height: 40px; place-items: center; flex-shrink: 0; border: 0; border-radius: 50%; color: #76767e; background: #f2f2f5; cursor: pointer; }
.settings-close svg { width: 19px; }
.settings-body { display: flex; flex: 1; min-height: 0; }
.settings-tabs { display: flex; width: 164px; flex-direction: column; flex-shrink: 0; gap: 6px; padding: 22px 16px; border-right: 1px solid #eaeaf0; background: #f5f5f7; }
.settings-tabs button { display: flex; min-height: 44px; align-items: center; gap: 10px; padding: 10px 14px; border: 0; border-radius: 10px; color: #777780; background: transparent; font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
.settings-tabs button[aria-selected="true"] { color: #df6576; background: #fff; box-shadow: 0 2px 10px #14142205; font-weight: 650; }
.settings-tabs svg { width: 19px; }
.settings-content { flex: 1; min-width: 0; overflow-y: auto; overscroll-behavior: contain; padding: 26px 28px; scrollbar-width: thin; scrollbar-color: #d9d9df transparent; }
.settings-section-heading { margin-bottom: 18px; }
.settings-section-heading h3, .settings-quality-heading h3 { margin: 0; font-size: 15px; font-weight: 680; }
.settings-row { position: relative; display: flex; min-height: 76px; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid #ededf0; }
.settings-row > span:first-child { min-width: 0; }
.settings-row strong { display: block; font-size: 13px; font-weight: 600; }
.settings-row small { display: block; margin-top: 5px; color: #909097; font-size: 11px; line-height: 1.6; }
.settings-row input { position: absolute; right: 0; width: 42px; height: 26px; margin: 0; opacity: 0; cursor: pointer; }
.settings-switch { width: 42px; height: 26px; flex-shrink: 0; padding: 3px; border-radius: 20px; background: #d8d8df; transition: background 160ms; }
.settings-switch::before { display: block; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px #0002; content: ''; transition: transform 160ms; }
.settings-row input:checked + .settings-switch { background: #ee7a89; }
.settings-row input:checked + .settings-switch::before { transform: translateX(16px); }
.settings-row select { max-width: 50%; padding: 9px 12px; border: 1px solid #e1e1e7; border-radius: 9px; color: #5e5e68; background: #fff; font: inherit; font-size: 12px; }
.settings-quality { margin-top: 28px; }
.settings-quality-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.settings-quality-heading > small { color: #909097; font-size: 11px; }
.settings-quality-options { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
.settings-quality-options button { display: grid; gap: 6px; padding: 14px; border: 1px solid #e5e5eb; border-radius: 12px; color: #4c4c57; background: #fff; font: inherit; text-align: left; cursor: pointer; }
.settings-quality-options button.is-selected { border-color: #eea3ae; background: #fff3f5; }
.settings-quality-options strong { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 650; }
.settings-quality-options svg { width: 15px; color: #e67485; }
.settings-quality-options small { color: #93939c; font-size: 10px; }
.settings-hint { margin: 12px 0 0; color: #9a9aa3; font-size: 11px; line-height: 1.6; }
.settings-current-track { margin-top: 28px; }
.settings-track-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.settings-track-actions button { display: flex; min-height: 40px; align-items: center; gap: 8px; padding: 10px 13px; border: 1px solid #e5e5eb; border-radius: 10px; color: #62626c; background: #fff; font: inherit; font-size: 12px; cursor: pointer; }
.settings-track-actions svg { width: 17px; }
.settings-track-actions small { color: #a0a0aa; font-size: 10px; }
.settings-footer { display: flex; align-items: center; justify-content: flex-end; gap: 6px; padding: 13px 28px; border-top: 1px solid #ececef; color: #a0a0aa; background: #fff; font-size: 10px; }
.settings-footer svg { width: 14px; }
button:disabled { opacity: .45; cursor: default; }
button:focus-visible, select:focus-visible, [role="tabpanel"]:focus-visible, input:focus-visible + .settings-switch { outline: 2px solid #e88090; outline-offset: 3px; }
@media (max-width: 640px) {
  .app-settings-dialog { width: calc(100vw - 24px); }
  .settings-shell { height: min(780px, calc(100dvh - 32px)); border-radius: 20px; }
  .settings-header { padding: 20px; }
  .settings-header h2 { font-size: 19px; }
  .settings-header p { font-size: 11px; }
  .settings-body { flex-direction: column; }
  .settings-tabs { width: auto; flex-direction: row; padding: 10px 16px; border-right: 0; border-bottom: 1px solid #eaeaf0; }
  .settings-tabs button { flex: 1; justify-content: center; }
  .settings-content { padding: 22px 18px; }
  .settings-footer { padding: 12px 20px; }
}
@media (prefers-reduced-motion: reduce) { .settings-shell, .settings-switch, .settings-switch::before { transition: none; } }
</style>
