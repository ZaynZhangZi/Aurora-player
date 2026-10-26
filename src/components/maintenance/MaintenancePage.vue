<template>
  <section class="maintenance-page" :style="pageStyle" :aria-label="scopeLabel ? `${scopeLabel}维护中` : '网站维护'">
    <iframe v-if="settings.customHtml.trim()" class="maintenance-custom" :srcdoc="settings.customHtml"
      sandbox="" referrerpolicy="no-referrer" title="自定义维护页面" />
    <div v-else class="maintenance-content">
      <p class="maintenance-brand">AURORA PLAYER <span>/ 暂停一下，准备更好的相遇</span></p>
      <div class="maintenance-record" aria-hidden="true"><div /><span /></div>
      <p class="maintenance-eyebrow">{{ recovering ? 'WELCOME BACK' : 'UNDER MAINTENANCE' }}</p>
      <h1 id="maintenance-title" ref="titleRef" tabindex="-1">{{ recovering ? '一切就绪，欢迎回来' : settings.title }}</h1>
      <p class="maintenance-message">{{ recovering ? '正在回到你的音乐空间…' : settings.message }}</p>
      <p v-if="settings.estimatedReturn && !recovering" class="maintenance-estimate">预计恢复 · {{ settings.estimatedReturn }}</p>
      <div class="maintenance-wave" aria-hidden="true"><i v-for="n in 24" :key="n" :style="{ '--n': n }" /></div>
    </div>
    <footer class="maintenance-status" role="status" aria-live="polite">
      <span v-if="scopeLabel" class="maintenance-scope">{{ scopeLabel }}</span>
      <span class="maintenance-indicator" :class="{ offline }" />
      <span>{{ recovering ? '维护已结束，正在返回…' : offline ? '暂时无法连接，正在自动重试…' : '每 10 秒自动检查，恢复后自动返回' }}</span>
      <button v-if="!recovering" type="button" :disabled="checking" @click="$emit('check')">{{ checking ? '检查中…' : '立即检查' }} <span aria-hidden="true">↗</span></button>
      <button v-if="canReturn && !recovering" type="button" @click="$emit('return')">返回可用页面</button>
    </footer>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
const props = defineProps({ settings: { type: Object, required: true }, offline: Boolean, checking: Boolean, recovering: Boolean,
  scopeLabel: { type: String, default: '' }, canReturn: Boolean });
defineEmits(['check', 'return']);
const titleRef = ref(null);
const pageStyle = computed(() => ({ '--maintenance-accent': props.settings.accentColor,
  backgroundImage: props.settings.backgroundUrl ? `linear-gradient(#0d0e18c9, #0d0e18ef), url(${JSON.stringify(props.settings.backgroundUrl)})` : undefined,
}));
onMounted(() => { titleRef.value?.focus({ preventScroll: true }); });
</script>

<style scoped>
.maintenance-page{position:fixed;inset:0;z-index:10020;display:flex;flex-direction:column;overflow:auto;background:#0d0e18;color:#f4f3fa;background-size:cover;background-position:center;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif}
.maintenance-content{width:min(100%,1000px);box-sizing:border-box;margin:auto;padding:42px 28px 20px;text-align:center}
.maintenance-brand{font-size:11px;font-weight:600;letter-spacing:.2em;color:#d8d6e5}.maintenance-brand span{font-weight:400;letter-spacing:.08em;color:#898799;margin-left:12px}
.maintenance-record{position:relative;display:grid;place-items:center;width:160px;height:160px;margin:56px auto 34px;border-radius:50%;background:repeating-radial-gradient(circle,#252433 0px,#252433 1px,#12121e 2px,#12121e 5px);box-shadow:0 0 90px color-mix(in srgb,var(--maintenance-accent) 20%,transparent);animation:maintenance-spin 20s linear infinite}
.maintenance-record div{width:55px;height:55px;border-radius:50%;background:var(--maintenance-accent);opacity:.85}.maintenance-record span{position:absolute;width:10px;height:10px;border-radius:50%;background:#0d0e18}.maintenance-record:after{content:'';position:absolute;inset:0;border-radius:50%;background:conic-gradient(transparent,#ffffff10,transparent,#ffffff10,transparent)}
.maintenance-eyebrow{font-size:10px;letter-spacing:.3em;color:var(--maintenance-accent);margin:0 0 20px}h1{font-size:clamp(28px,5vw,48px);font-weight:500;letter-spacing:-.035em;line-height:1.3;margin:0;outline:none;overflow-wrap:anywhere}
.maintenance-message{max-width:620px;white-space:pre-wrap;overflow-wrap:anywhere;margin:22px auto 0;font-size:14px;line-height:1.95;color:#a6a3b7}.maintenance-estimate{font-size:12px;color:#d6d3e2;margin-top:22px;overflow-wrap:anywhere}
.maintenance-wave{height:35px;display:flex;gap:5px;align-items:center;justify-content:center;margin:30px 0}.maintenance-wave i{width:3px;height:calc(5px + mod(var(--n) * 7, 23) * 1px);border-radius:4px;background:var(--maintenance-accent);opacity:.45;animation:maintenance-wave 2s ease-in-out infinite;animation-delay:calc(var(--n) * -.12s)}
.maintenance-status{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;padding:20px 22px 28px;font-size:11px;color:#aaa7bb;position:relative;background:#0d0e18;border-top:1px solid #ffffff0a}.maintenance-indicator{width:6px;height:6px;border-radius:50%;background:var(--maintenance-accent)}.maintenance-indicator.offline{background:#e4b46c}.maintenance-status button{border:1px solid #ffffff24;border-radius:100px;background:#ffffff06;color:#e9e6f5;padding:8px 14px;font:inherit;cursor:pointer;margin-left:12px}.maintenance-status button:disabled{opacity:.5;cursor:wait}.maintenance-status button:focus-visible{outline:2px solid var(--maintenance-accent);outline-offset:3px}
.maintenance-custom{width:100%;flex:1;min-height:240px;border:0;background:#fff}.maintenance-custom + .maintenance-status{flex-shrink:0}
@keyframes maintenance-spin{to{transform:rotate(360deg)}}@keyframes maintenance-wave{50%{transform:scaleY(.4);opacity:.25}}
@media(max-width:600px){.maintenance-brand span{display:block;margin:12px 0 0;font-size:10px}.maintenance-record{margin-top:36px;width:130px;height:130px}.maintenance-status{font-size:10px}.maintenance-status button{margin-left:0}.maintenance-content{padding-top:28px}}
@media(prefers-reduced-motion:reduce){.maintenance-record,.maintenance-wave i{animation:none}}
</style>
