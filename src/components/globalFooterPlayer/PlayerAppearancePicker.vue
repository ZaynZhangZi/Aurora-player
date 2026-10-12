<template>
  <div ref="rootRef" class="appearance-picker">
    <div class="appearance-options">
      <button
        v-for="option in PLAYER_APPEARANCE_OPTIONS"
        :key="option.id"
        type="button"
        class="appearance-option"
        :class="{'is-selected': playerAppearance === option.id}"
        :aria-pressed="playerAppearance === option.id"
        :data-player-appearance="option.id"
        @click="setPlayerAppearance(option.id)"
        @keydown="onOptionKeydown"
      >
        <span class="appearance-preview" :class="`preview-${option.preview}`" aria-hidden="true">
          <i v-if="option.id === 'amll'" class="preview-artwork" />
          <span v-if="option.id === 'cadenza'" class="preview-scattered" aria-hidden="true"><i>听</i><i>见</i><i>你</i></span>
          <span class="preview-lyric">{{ option.id === 'manuscript' ? '每一句' : '听见' }}</span>
          <span class="preview-subline">{{ option.id === 'manuscript' ? '都留下回声' : '音乐的形状' }}</span>
        </span>
        <span class="appearance-option-copy"><strong>{{ option.label }}<CheckIcon v-if="playerAppearance === option.id" /></strong><small>{{ option.detail }}</small></span>
      </button>
    </div>

    <label v-if="playerAppearance !== 'amll'" class="appearance-background">
      <span><strong>背景</strong><small>为歌词选择背景效果</small></span>
      <select :value="foliaBackground" aria-label="切换 Folia 背景" data-folia-background-picker @change="setFoliaBackground($event.target.value)">
        <option v-for="option in FOLIA_BACKGROUND_OPTIONS" :key="option.id" :value="option.id">{{ option.label }}</option>
      </select>
    </label>
    <p v-else class="appearance-background-note">原版播放器使用当前歌曲的封面背景</p>
  </div>
</template>

<script setup>
import {ref} from 'vue'
import {CheckIcon} from '@heroicons/vue/24/outline'
import {usePlayerAppearance} from '@/composables/usePlayerAppearance.js'
import {PLAYER_APPEARANCE_OPTIONS} from '@/utils/player/playerAppearance.js'
import {FOLIA_BACKGROUND_OPTIONS} from '@/utils/player/foliaBackground.js'
const {playerAppearance, setPlayerAppearance, foliaBackground, setFoliaBackground} = usePlayerAppearance()
const rootRef = ref(null)
function onOptionKeydown(event) {
  const options = [...rootRef.value.querySelectorAll('.appearance-option')]
  const current = options.indexOf(event.currentTarget)
  const columns = getComputedStyle(rootRef.value.querySelector('.appearance-options')).gridTemplateColumns.split(' ').length
  const next = {ArrowRight: current + 1, ArrowLeft: current - 1, ArrowDown: current + columns, ArrowUp: current - columns, Home: 0, End: options.length - 1}[event.key]
  if (next === undefined) return
  event.preventDefault()
  options[(next + options.length) % options.length]?.focus()
}
</script>

<style scoped>
.appearance-picker { color: #42424e; font-family: inherit; }
.appearance-options { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; }
.appearance-option { min-width: 0; padding: 6px; border: 1px solid #e5e5ec; border-radius: 14px; color: inherit; text-align: left; background: #fff; font: inherit; cursor: pointer; transition: background 150ms, border-color 150ms; }
.appearance-option:hover { border-color: #d3d3df; background: #f7f7fa; }
.appearance-option.is-selected { border-color: #eea3ae; background: #fff2f4; }
.appearance-preview { position: relative; display: flex; height: 72px; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; border-radius: 9px; color: #f4f5fb; background: radial-gradient(ellipse at 25% 10%, #334b64, transparent 80%), #161d30; }
.preview-lyric { font-family: 'Songti SC', SimSun, serif; font-size: 21px; letter-spacing: .1em; }
.preview-subline { margin-top: 3px; color: #bfd8fc85; font-size: 8px; }
.preview-glow .preview-lyric { color: #f5d99c; text-shadow: 0 0 14px rgb(255 201 98 / .5); }
.preview-tilt .preview-lyric { transform: rotate(-8deg); }
.preview-tilt .preview-subline { color: #a2d5ff; font-size: 12px; font-style: italic; transform: rotate(5deg); }
.preview-article { align-items: flex-start; padding-left: 16px; }
.preview-article::before, .preview-article::after { position: absolute; right: -6px; color: rgb(255 255 255 / .13); font-family: serif; font-size: 12px; content: '留下音乐的回声'; }
.preview-article::before { top: 8px; }
.preview-article::after { bottom: 6px; }
.preview-scatter > .preview-lyric, .preview-scatter > .preview-subline { display: none; }
.preview-scattered { position: relative; width: 100%; height: 100%; font-family: SimSun, serif; }
.preview-scattered i { position: absolute; font-size: 20px; font-style: normal; }
.preview-scattered i:nth-child(1) { top: 7px; left: 22%; transform: rotate(-9deg); }
.preview-scattered i:nth-child(2) { top: 30px; left: 44%; color: #f2d46c; transform: rotate(7deg); }
.preview-scattered i:nth-child(3) { top: 10px; left: 69%; transform: rotate(-5deg); }
.preview-stairs .preview-lyric { position: relative; font-size: 16px; transform: translateX(-13px); }
.preview-stairs .preview-subline { position: relative; font-size: 11px; transform: translateX(12px); }
.preview-stairs .preview-lyric::after, .preview-stairs .preview-subline::after { position: absolute; right: -8px; bottom: -2px; left: -8px; height: 1px; background: #a7c8df55; content: ''; }
.preview-chat .preview-lyric { margin-right: 24px; padding: 4px 13px; border-radius: 10px 10px 10px 2px; color: #daf4ff; background: #487e96; font-family: inherit; font-size: 9px; letter-spacing: 0; }
.preview-chat .preview-subline { margin-left: 22px; padding: 4px 10px; border-radius: 10px 10px 2px 10px; color: #153442; background: #80cce3; }
.preview-mirror .preview-lyric { position: relative; z-index: 1; font-family: inherit; font-size: 17px; font-weight: 300; transform: perspective(150px) rotateY(-16deg); text-shadow: 0 0 12px #b7e5ff; }
.preview-mirror::before, .preview-mirror::after { position: absolute; width: 16px; height: 27px; border-radius: 30%; background: radial-gradient(circle at 50% 90%, #dcf8ff, transparent 35%), repeating-radial-gradient(circle, #9cdfff66 0 1px, transparent 1px 4px); content: ''; }
.preview-mirror::before { top: 10px; left: 14px; transform: rotate(8deg); }
.preview-mirror::after { right: 14px; bottom: 12px; transform: rotate(-8deg); }
.preview-clock { align-items: flex-end; padding-right: 9px; }
.preview-clock::before { position: absolute; top: 3px; left: -10px; width: 56px; height: 56px; border: 2px dashed #b2d1e877; border-radius: 50%; background: repeating-conic-gradient(#c1e5ff33 0deg 2deg, transparent 2deg 30deg), radial-gradient(circle, #536f8966, #27344688); box-shadow: inset 0 0 0 8px #161d3044; content: ''; }
.preview-clock .preview-lyric { font-family: inherit; font-size: 13px; }
.preview-clock .preview-subline { font-size: 8px; }
.preview-cover { align-items: flex-end; padding-right: 9px; }
.preview-cover .preview-lyric { font-family: inherit; font-size: 12px; letter-spacing: 0; }
.preview-cover .preview-subline { font-size: 8px; }
.preview-artwork { position: absolute; top: 13px; left: 10px; width: 36px; height: 36px; border-radius: 6px; background: linear-gradient(145deg, #d2b0c7, #736bb0 65%, #444e73); }

.appearance-option-copy { display: grid; gap: 3px; padding: 9px 6px 5px; }
.appearance-option-copy strong { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 650; }
.appearance-option-copy strong svg { width: 14px; color: #e67485; }
.appearance-option-copy small { color: #92929d; font-size: 10px; line-height: 1.5; }
.appearance-background { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 22px; padding-top: 20px; border-top: 1px solid #e9e9ee; }
.appearance-background strong { display: block; font-size: 13px; font-weight: 600; }
.appearance-background small { display: block; margin-top: 5px; color: #9797a1; font-size: 11px; line-height: 1.5; }
.appearance-background select { min-width: 0; max-width: 60%; padding: 10px 12px; border: 1px solid #e0e0e8; border-radius: 9px; color: #61616d; background: #fff; font: inherit; font-size: 12px; cursor: pointer; }
.appearance-background-note { margin: 20px 0 0; padding-top: 18px; border-top: 1px solid #e9e9ee; color: #9b9ba5; font-size: 11px; }
.appearance-option:focus-visible, select:focus-visible { outline: 2px solid #e88090; outline-offset: 3px; }
@media (max-width: 640px) { .appearance-options { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; } .appearance-preview { height: 68px; } .appearance-option-copy small { font-size: 9px; } .appearance-background { flex-direction: column; align-items: flex-start; } .appearance-background select { width: 100%; max-width: none; } }
@media (prefers-reduced-motion: reduce) { .appearance-option { transition: none; } }
</style>
