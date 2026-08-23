<template>
  <main class="status-page">
    <section class="status-card" :aria-labelledby="titleId">
      <div class="status-visual" aria-hidden="true">
        <div class="status-record">
          <span class="status-record-label">{{ statusCode }}</span>
        </div>
        <div class="status-bars">
          <span v-for="index in 5" :key="index" />
        </div>
      </div>

      <p class="status-eyebrow">{{ eyebrow }}</p>
      <h1 :id="titleId">{{ title }}</h1>
      <p class="status-description">{{ description }}</p>
      <p v-if="displayPath" class="status-path" :title="displayPath">
        {{ displayPath }}
      </p>

      <div class="status-actions">
        <button v-if="isError" class="status-button status-button-primary" type="button" @click="reloadPage">
          重新加载
        </button>
        <button v-else class="status-button status-button-primary" type="button" @click="goHome">
          返回首页
        </button>
        <button class="status-button status-button-secondary" type="button" @click="secondaryAction">
          {{ isError ? '返回首页' : '返回上一页' }}
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import {computed} from 'vue'
import {useRoute, useRouter} from 'vue-router'

const props = defineProps({
  type: {
    type: String,
    default: 'not-found',
  },
})

const route = useRoute()
const router = useRouter()
const isError = computed(() => props.type === 'error')
const statusCode = computed(() => (isError.value ? '!' : '404'))
const eyebrow = computed(() => (isError.value ? 'PLAYBACK INTERRUPTED' : 'PAGE NOT FOUND'))
const title = computed(() => (isError.value ? '页面没有顺利加载' : '这张唱片暂时找不到'))
const description = computed(() => (
  isError.value
    ? '页面运行时遇到了意外问题。你可以重新加载，或者先回到首页继续浏览。'
    : '你访问的地址不存在、已经移动，或者链接不完整。'
))
const displayPath = computed(() => {
  const path = isError.value ? route.query.from : route.fullPath
  return typeof path === 'string' && path ? path : ''
})
const titleId = computed(() => (isError.value ? 'route-error-title' : 'not-found-title'))

function goHome() {
  router.push('/home')
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  goHome()
}

function reloadPage() {
  window.location.reload()
}

function secondaryAction() {
  if (isError.value) {
    goHome()
    return
  }
  goBack()
}
</script>

<style scoped>
.status-page {
  box-sizing: border-box;
  display: grid;
  width: 100%;
  height: 100dvh;
  min-height: 100svh;
  max-height: 100dvh;
  place-items: center;
  overflow: hidden;
  overscroll-behavior: none;
  padding: clamp(16px, 5dvh, 56px) 20px clamp(88px, 13dvh, 116px);
  color: #18181b;
  background:
    radial-gradient(circle at 16% 18%, rgba(251, 113, 133, 0.17), transparent 34%),
    radial-gradient(circle at 84% 76%, rgba(251, 191, 36, 0.13), transparent 31%),
    linear-gradient(145deg, #fffaf9 0%, #f7f7f8 52%, #fff8ed 100%);
}

.status-card {
  box-sizing: border-box;
  position: relative;
  width: min(100%, 610px);
  max-height: 100%;
  padding: clamp(22px, 5dvh, 58px) clamp(22px, 6vw, 58px);
  overflow: hidden;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 34px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 30px 90px rgba(63, 38, 35, 0.12);
  backdrop-filter: blur(18px);
}

.status-visual {
  position: relative;
  display: grid;
  width: clamp(104px, 21dvh, 164px);
  height: clamp(104px, 21dvh, 164px);
  margin: 0 auto clamp(14px, 3dvh, 28px);
  place-items: center;
}

.status-record {
  display: grid;
  width: calc(100% - 16px);
  aspect-ratio: 1;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background:
    radial-gradient(circle, #fb7185 0 10%, #ffe4e6 10% 18%, transparent 18%),
    repeating-radial-gradient(circle, #27272a 0 4px, #18181b 5px 9px);
  box-shadow: 0 22px 42px rgba(24, 24, 27, 0.24);
  animation: record-float 4s ease-in-out infinite;
}

.status-record-label {
  display: grid;
  width: 47px;
  aspect-ratio: 1;
  place-items: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #fb7185, #f97316);
}

.status-bars {
  position: absolute;
  right: 0;
  bottom: 10px;
  display: flex;
  height: 40px;
  align-items: end;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12px 28px rgba(24, 24, 27, 0.12);
}

.status-bars span {
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(to top, #fb7185, #f59e0b);
  animation: bar-pulse 1.1s ease-in-out infinite alternate;
}

.status-bars span:nth-child(1),
.status-bars span:nth-child(5) { height: 35%; }
.status-bars span:nth-child(2),
.status-bars span:nth-child(4) { height: 68%; animation-delay: 160ms; }
.status-bars span:nth-child(3) { height: 100%; animation-delay: 320ms; }

.status-eyebrow {
  margin: 0 0 10px;
  color: #f43f5e;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.2em;
}

h1 {
  margin: 0;
  font-size: clamp(30px, 6vw, 48px);
  font-weight: 900;
  letter-spacing: -0.055em;
  line-height: 1.08;
}

.status-description {
  max-width: 470px;
  margin: 18px auto 0;
  color: #71717a;
  font-size: 15px;
  line-height: 1.75;
}

.status-path {
  max-width: 100%;
  margin: 18px auto 0;
  padding: 9px 14px;
  overflow: hidden;
  color: #71717a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid rgba(113, 113, 122, 0.12);
  border-radius: 12px;
  background: rgba(244, 244, 245, 0.76);
}

.status-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 28px;
}

.status-button {
  min-width: 126px;
  padding: 12px 20px;
  cursor: pointer;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
}

.status-button:hover { transform: translateY(-2px); }
.status-button:focus-visible { outline: 3px solid rgba(244, 63, 94, 0.24); outline-offset: 3px; }

.status-button-primary {
  color: #fff;
  background: linear-gradient(135deg, #f43f5e, #f97316);
  box-shadow: 0 13px 28px rgba(244, 63, 94, 0.24);
}

.status-button-secondary {
  color: #3f3f46;
  background: rgba(244, 244, 245, 0.94);
}

@keyframes record-float {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-8px) rotate(3deg); }
}

@keyframes bar-pulse {
  to { height: 24%; }
}

@media (max-width: 520px) {
  .status-page { padding-inline: 14px; }
  .status-card { border-radius: 26px; }
  .status-actions { flex-direction: column; }
  .status-button { width: 100%; }
}

@media (max-height: 620px) {
  .status-page { padding-block: 12px 82px; }
  .status-card { padding-block: 16px; }
  .status-visual {
    width: 84px;
    height: 84px;
    margin-bottom: 10px;
  }
  .status-bars { transform: scale(0.8); transform-origin: right bottom; }
  .status-eyebrow { margin-bottom: 5px; }
  h1 { font-size: clamp(26px, 7dvh, 38px); }
  .status-description { margin-top: 9px; line-height: 1.45; }
  .status-path { display: none; }
  .status-actions { margin-top: 13px; }
  .status-button { padding-block: 9px; }
}

@media (prefers-reduced-motion: reduce) {
  .status-record,
  .status-bars span { animation: none; }
  .status-button { transition: none; }
}
</style>
