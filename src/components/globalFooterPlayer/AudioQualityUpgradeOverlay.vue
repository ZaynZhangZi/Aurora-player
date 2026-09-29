<template>
  <Teleport to="body">
    <Transition name="quality-screen">
      <div
        v-if="visible"
        :key="tier"
        class="quality-screen"
        :class="[`quality-screen-${tier}`, {'is-ready': phase === 'ready'}]"
        role="dialog"
        aria-modal="true"
        :aria-label="`${label}音质${phase === 'ready' ? '已就绪' : '加载中'}`"
      >
        <button class="quality-screen-skip" type="button" @click="emit('skip')">跳过动画</button>

        <div class="quality-screen-stage" aria-hidden="true">
          <!-- 标准：一束光沿音轨扫过。 -->
          <div v-if="tier === 'standard'" class="standard-scene">
            <span class="standard-halo" />
            <span class="standard-track"><i /></span>
            <span class="standard-wave"><i v-for="index in 9" :key="index" :style="{'--index': index}" /></span>
            <span class="standard-cursor" />
          </div>

          <!-- 极高：频谱向外扩散。 -->
          <div v-else-if="tier === 'exhigh'" class="exhigh-scene">
            <span v-for="index in 3" :key="index" class="exhigh-ripple" :style="{'--index': index}" />
            <span class="exhigh-spokes"><i v-for="index in 16" :key="index" :style="{'--index': index}" /></span>
            <span class="exhigh-core">
              <svg viewBox="0 0 80 80" fill="none"><path d="M12 43V37m9 14V29m9 28V23m10 36V21m10 36V23m9 28V29m9 14V37" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
            </span>
          </div>

          <!-- 无损：晶体切面聚合。 -->
          <div v-else-if="tier === 'lossless'" class="lossless-scene">
            <span class="lossless-grid" />
            <span v-for="index in 6" :key="index" class="lossless-shard" :style="{'--index': index}" />
            <span class="lossless-gem"><i /></span>
            <span v-for="index in 4" :key="index" class="lossless-glint" :style="{'--index': index}" />
          </div>

          <!-- Hi-Res：极光、轨道和宽频谱铺满声场。 -->
          <div v-else class="hires-scene">
            <span v-for="index in 3" :key="`ribbon-${index}`" class="hires-ribbon" :style="{'--index': index}" />
            <span v-for="index in 3" :key="`orbit-${index}`" class="hires-orbit" :style="{'--index': index}" />
            <span class="hires-spectrum"><i v-for="index in 25" :key="index" :style="{'--index': index}" /></span>
            <span class="hires-star"><i /></span>
          </div>
        </div>

        <div class="quality-screen-copy" aria-live="polite">
          <span class="quality-screen-kicker">AURORA AUDIO · {{ tierCaption }}</span>
          <strong>{{ label }}</strong>
          <p>{{ phase === 'ready' ? '音源已就绪' : loadingCopy }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import {computed} from 'vue'
import {qualityLabel, qualityRank} from '@/utils/player/audioQuality.js'

const props = defineProps({
  visible: {type: Boolean, default: false},
  level: {type: String, default: 'exhigh'},
  phase: {type: String, default: 'loading'},
})
const emit = defineEmits(['skip'])

const label = computed(() => qualityLabel(props.level))
const tier = computed(() => {
  const rank = qualityRank(props.level)
  if (rank >= 4) return 'hires'
  if (rank >= 3) return 'lossless'
  if (rank >= 1) return 'exhigh'
  return 'standard'
})
const tierCaption = computed(() => ({standard: 'CLEAR', exhigh: 'DETAIL', lossless: 'PURE', hires: 'IMMERSIVE'})[tier.value])
const loadingCopy = computed(() => ({
  standard: '正在切换为轻盈流畅的声音',
  exhigh: '更多细节，正逐层展开',
  lossless: '还原每一处原本的细节',
  hires: '正在打开更宽广的声音空间',
})[tier.value])
</script>

<style scoped>
.quality-screen { position: fixed; inset: 0; z-index: 5000; display: flex; align-items: center; flex-direction: column; justify-content: center; overflow: hidden; color: #fff; isolation: isolate; }
.quality-screen-standard { background: radial-gradient(circle at 50% 45%, #283447, #101621 66%); }
.quality-screen-exhigh { background: radial-gradient(circle at 50% 45%, #293666, #10162c 67%); }
.quality-screen-lossless { background: radial-gradient(circle at 50% 45%, #45376a, #171527 70%); }
.quality-screen-hires { background: radial-gradient(ellipse at 50% 40%, #28445c, #0d1427 72%); }
.quality-screen-stage { position: relative; width: min(78vw, 520px); height: min(64vw, 370px); display: grid; place-items: center; }
.quality-screen-stage > div { position: absolute; inset: 0; display: grid; place-items: center; }
.quality-screen-copy { position: relative; z-index: 2; display: grid; justify-items: center; gap: 8px; margin-top: -4px; text-align: center; }
.quality-screen-kicker { color: rgba(255, 255, 255, .6); font-size: 10px; font-weight: 760; letter-spacing: .26em; }
.quality-screen-copy strong { font-size: clamp(36px, 7vw, 64px); font-weight: 780; letter-spacing: -.045em; line-height: 1.1; }
.quality-screen-copy p { margin: 0; color: rgba(255, 255, 255, .74); font-size: 13px; }
.quality-screen-skip { position: absolute; z-index: 5; top: max(24px, env(safe-area-inset-top)); right: max(26px, env(safe-area-inset-right)); padding: 9px 14px; color: rgba(255, 255, 255, .82); border: 1px solid rgba(255, 255, 255, .24); border-radius: 999px; background: rgba(255, 255, 255, .08); font-size: 12px; cursor: pointer; }
.quality-screen-skip:hover { color: #fff; background: rgba(255, 255, 255, .17); }
.quality-screen-skip:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
.quality-screen-enter-active, .quality-screen-leave-active { transition: opacity 320ms ease; }
.quality-screen-enter-from, .quality-screen-leave-to { opacity: 0; }

/* 标准：短促的线性扫光，刻意保持克制。 */
.standard-halo { position: absolute; width: 250px; height: 150px; border-radius: 50%; background: #98aacb; filter: blur(74px); opacity: .15; }
.standard-track { position: absolute; width: min(78%, 300px); height: 2px; border-radius: 4px; background: rgba(218, 231, 255, .26); overflow: hidden; }
.standard-track i { display: block; width: 100%; height: 100%; background: #ecf5ff; transform: translateX(-100%); animation: standard-scan 1.1s cubic-bezier(.18,.7,.2,1) infinite; }
.standard-wave { position: absolute; display: flex; align-items: center; justify-content: center; gap: 9px; height: 86px; }
.standard-wave i { width: 3px; height: 18px; border-radius: 8px; background: #dceaff; transform-origin: center; animation: standard-wave 920ms ease-in-out infinite alternate; animation-delay: calc(var(--index) * -95ms); }
.standard-cursor { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: #fff; box-shadow: 0 0 16px #e8f3ff; animation: standard-cursor 1.1s cubic-bezier(.18,.7,.2,1) infinite; }
.is-ready .standard-wave i { animation-play-state: paused; transform: scaleY(.7); }
@keyframes standard-scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
@keyframes standard-wave { to { transform: scaleY(calc(.5 + var(--index) * .14)); } }
@keyframes standard-cursor { 0% { transform: translateX(-150px); opacity: 0; } 12%, 85% { opacity: 1; } 100% { transform: translateX(150px); opacity: 0; } }

/* 极高：有方向的同心声波与环形频谱。 */
.exhigh-ripple { position: absolute; width: 112px; aspect-ratio: 1; border: 1px solid rgba(177, 205, 255, .57); border-radius: 50%; box-shadow: 0 0 24px rgba(115, 158, 255, .15); animation: exhigh-expand 2.15s ease-out infinite; animation-delay: calc(var(--index) * -710ms); }
.exhigh-spokes { position: absolute; width: 264px; height: 264px; animation: exhigh-turn 12s linear infinite; }
.exhigh-spokes i { position: absolute; top: 50%; left: 50%; width: 2px; height: 18px; border-radius: 5px; background: rgba(192, 211, 255, .85); transform: rotate(calc(var(--index) * 22.5deg)) translateY(-132px); animation: exhigh-spoke 1.35s ease-in-out infinite alternate; animation-delay: calc(var(--index) * -80ms); }
.exhigh-core { display: grid; width: 104px; height: 104px; place-items: center; border: 1px solid rgba(210, 226, 255, .6); border-radius: 50%; background: radial-gradient(circle at 30% 22%, rgba(200, 220, 255, .55), rgba(97, 136, 223, .14) 68%); box-shadow: 0 0 48px rgba(112, 160, 255, .3); animation: exhigh-breathe 2.15s ease-in-out infinite; }
.exhigh-core svg { width: 49px; height: 49px; }
.is-ready .exhigh-core { animation: exhigh-finish 480ms ease-out both; }
@keyframes exhigh-expand { from { opacity: .9; transform: scale(.9); } to { opacity: 0; transform: scale(3); } }
@keyframes exhigh-turn { to { transform: rotate(360deg); } }
@keyframes exhigh-spoke { to { height: 31px; opacity: .4; } }
@keyframes exhigh-breathe { 50% { transform: scale(1.09); } }
@keyframes exhigh-finish { to { transform: scale(1.15); box-shadow: 0 0 80px rgba(146, 182, 255, .6); } }

/* 无损：切面从不同方向汇聚。 */
.lossless-grid { position: absolute; width: min(88vw, 430px); height: 250px; opacity: .14; background-image: linear-gradient(rgba(221, 208, 255, .6) 1px, transparent 1px), linear-gradient(90deg, rgba(221, 208, 255, .6) 1px, transparent 1px); background-size: 28px 28px; mask-image: radial-gradient(ellipse, #000, transparent 72%); }
.lossless-shard { position: absolute; width: 83px; height: 112px; clip-path: polygon(50% 0, 100% 58%, 50% 100%, 0 58%); background: linear-gradient(145deg, rgba(238, 226, 255, .65), rgba(147, 113, 224, .12) 63%, rgba(199, 174, 255, .55)); transform: rotate(calc(var(--index) * 60deg)) translateY(-90px) scale(.92); animation: lossless-assemble 1.5s cubic-bezier(.18,.76,.22,1) both; animation-delay: calc(var(--index) * 85ms); }
.lossless-gem { display: grid; width: 128px; height: 128px; place-items: center; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); background: linear-gradient(128deg, rgba(255,255,255,.92), rgba(208,181,255,.57) 40%, rgba(104,78,186,.5) 75%, rgba(246,238,255,.85)); filter: drop-shadow(0 0 28px rgba(185,151,255,.5)); animation: lossless-gem 1.4s ease-out both; }
.lossless-gem i { width: 83px; height: 83px; clip-path: inherit; background: linear-gradient(315deg, rgba(87,62,151,.8), rgba(221,207,255,.12) 58%, rgba(255,255,255,.8)); }
.lossless-glint { position: absolute; width: 6px; height: 6px; background: #fff; transform: rotate(45deg) translate(calc((var(--index) - 2.5) * 63px), calc((var(--index) - 2.5) * -26px)); box-shadow: 0 0 18px #e5d4ff; animation: lossless-glint 1.8s ease-in-out infinite; animation-delay: calc(var(--index) * -350ms); }
.is-ready .lossless-gem { animation: lossless-finish 500ms ease-out both; }
@keyframes lossless-assemble { from { opacity: 0; transform: rotate(calc(var(--index) * 60deg)) translateY(-225px) scale(.2); } to { opacity: .9; transform: rotate(calc(var(--index) * 60deg)) translateY(-90px) scale(.92); } }
@keyframes lossless-gem { from { opacity: 0; transform: scale(.35) rotate(-45deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes lossless-glint { 50% { opacity: .15; transform: rotate(45deg) translate(calc((var(--index) - 2.5) * 63px), calc((var(--index) - 2.5) * -26px)) scale(.35); } }
@keyframes lossless-finish { to { transform: scale(1.12); filter: drop-shadow(0 0 30px rgba(223, 205, 255, .85)); } }

/* Hi-Res：横向极光和宽频谱。 */
.hires-ribbon { position: absolute; width: min(140vw, 850px); height: 108px; border-radius: 50%; background: linear-gradient(90deg, transparent, rgba(83, 224, 219, .15) 20%, rgba(173, 158, 255, .34) 48%, rgba(117, 210, 255, .18) 75%, transparent); filter: blur(20px); transform: translateY(calc((var(--index) - 2) * 65px)) rotate(calc((var(--index) - 2) * 13deg)); animation: hires-aurora 4.8s ease-in-out infinite alternate; animation-delay: calc(var(--index) * -1.2s); }
.hires-orbit { position: absolute; width: calc(180px + var(--index) * 77px); height: calc(85px + var(--index) * 50px); border: 1px solid rgba(177, 237, 255, .4); border-radius: 50%; transform: rotate(calc(var(--index) * -21deg)); animation: hires-orbit 7s ease-in-out infinite alternate; animation-delay: calc(var(--index) * -800ms); }
.hires-spectrum { position: absolute; display: flex; align-items: center; justify-content: center; gap: 6px; height: 200px; }
.hires-spectrum i { width: 3px; height: 22px; border-radius: 4px; background: linear-gradient(#d7ffff, #b6a8ff); box-shadow: 0 0 14px rgba(140, 236, 255, .7); animation: hires-frequency 1.5s ease-in-out infinite alternate; animation-delay: calc(var(--index) * -62ms); }
.hires-star { display: grid; width: 70px; height: 70px; place-items: center; border-radius: 50%; background: radial-gradient(circle, #fff, rgba(191, 250, 255, .7) 18%, rgba(126, 184, 242, .1) 68%); box-shadow: 0 0 60px 16px rgba(131, 224, 255, .28); animation: hires-star 3s ease-in-out infinite; }
.hires-star i { width: 13px; height: 13px; border-radius: 50%; background: #fff; }
.is-ready .hires-star { animation: hires-finish 700ms ease-out both; }
@keyframes hires-aurora { to { opacity: .4; transform: translateY(calc((var(--index) - 2) * 45px)) translateX(65px) rotate(calc((var(--index) - 2) * -10deg)); } }
@keyframes hires-orbit { to { opacity: .4; transform: rotate(calc(var(--index) * 19deg)) scale(1.08); } }
@keyframes hires-frequency { to { height: calc(18px + var(--index) * 3px); opacity: .55; } }
@keyframes hires-star { 50% { transform: scale(1.18); } }
@keyframes hires-finish { to { transform: scale(1.45); box-shadow: 0 0 110px 35px rgba(178, 241, 255, .55); } }

@media (max-width: 600px) { .quality-screen-stage { width: 100vw; height: 290px; } .hires-spectrum { gap: 4px; } .hires-spectrum i { width: 2px; } .quality-screen-copy { padding-inline: 18px; } }
@media (prefers-reduced-motion: reduce) { .quality-screen *, .quality-screen *::before, .quality-screen *::after { animation: none !important; transition: none !important; } .quality-screen-enter-active, .quality-screen-leave-active { transition: none; } .standard-track i { transform: translateX(0); } .standard-cursor { opacity: 0; } .lossless-shard { opacity: .9; } }
</style>
