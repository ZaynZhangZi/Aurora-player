<template>
  <div class="maintenance-dialog-backdrop" @click.self="$emit('close')" @keydown="onKeydown">
    <section ref="dialogRef" class="maintenance-dialog" role="alertdialog" aria-modal="true"
      :aria-labelledby="`${id}-title`" :aria-describedby="`${id}-message`" tabindex="-1">
      <button class="maintenance-dialog-close" type="button" aria-label="关闭维护提示" @click="$emit('close')">
        <AppIcon name="x" aria-hidden="true" />
      </button>
      <div class="maintenance-dialog-icon" aria-hidden="true">
        <AppIcon name="triangle-alert" />
      </div>
      <h2 :id="`${id}-title`" class="maintenance-dialog-title">{{ settings.title || `${scopeLabel}暂时不可用` }}</h2>
      <p :id="`${id}-message`" class="maintenance-dialog-message">{{ settings.message || '该功能正在维护，请稍后再试。' }}</p>
      <p v-if="settings.estimatedReturn" class="maintenance-dialog-estimate">预计恢复：{{ settings.estimatedReturn }}</p>
      <p v-if="offline" class="maintenance-dialog-status" role="status">暂时无法检查状态，请稍后重试。</p>
      <div class="maintenance-dialog-actions">
        <button class="maintenance-dialog-check" type="button" :disabled="checking" @click="$emit('check')">{{ checking ? '检查中…' : '重新检查' }}</button>
        <button ref="confirmRef" class="maintenance-dialog-confirm" type="button" @click="$emit('close')">知道了</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import AppIcon from "@/components/icons/AppIcon.vue"
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { lockScroll, unlockScroll } from '../../utils/scrollLock.js';
defineProps({ settings: { type: Object, required: true }, scopeLabel: { type: String, default: '' }, offline: Boolean, checking: Boolean });
const emit = defineEmits(['close', 'check']);
const dialogRef = ref(null);
const confirmRef = ref(null);
const id = useId();
onMounted(() => { lockScroll(); void nextTick(() => confirmRef.value?.focus({ preventScroll: true })); });
onBeforeUnmount(unlockScroll);
function onKeydown(event) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); emit('close'); return; }
  if (event.key !== 'Tab') return;
  const elements = [...dialogRef.value.querySelectorAll('button:not(:disabled)')].filter(el => el.getClientRects().length);
  const first = elements[0], last = elements.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
</script>

<style scoped>
.maintenance-dialog-backdrop{position:fixed;inset:0;z-index:10030;display:grid;place-items:center;padding:20px;background:rgba(20,24,36,.28);box-sizing:border-box;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}
.maintenance-dialog{position:relative;width:min(420px,100%);max-height:calc(100dvh - 40px);overflow:auto;box-sizing:border-box;padding:28px;border:1px solid rgba(24,30,45,.08);border-radius:18px;background:#fff;color:#202430;outline:none;box-shadow:0 20px 80px #131b332b,0 4px 16px #131b330c}
.maintenance-dialog-close{position:absolute;right:14px;top:14px;display:grid;place-items:center;width:28px;height:28px;padding:6px;border:0;border-radius:7px;background:transparent;color:#8d929e;cursor:pointer}.maintenance-dialog-close:hover{background:#f3f4f7;color:#3b4050}.maintenance-dialog-close svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round}
.maintenance-dialog-icon{display:grid;place-items:center;width:42px;height:42px;border:1px solid #f5e6bf;border-radius:12px;background:#fff8e9;color:#c78d19}.maintenance-dialog-icon svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}
.maintenance-dialog-title{margin:18px 0 9px;padding-right:12px;font-size:18px;line-height:1.5;font-weight:650;letter-spacing:-.02em;overflow-wrap:anywhere}.maintenance-dialog-message{margin:0;color:#777d8b;font-size:13px;line-height:1.85;white-space:pre-wrap;overflow-wrap:anywhere;max-height:200px;overflow:auto}.maintenance-dialog-estimate,.maintenance-dialog-status{margin:12px 0 0;font-size:12px;line-height:1.6;color:#9b7b3c}.maintenance-dialog-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:26px}.maintenance-dialog-actions button{height:35px;border-radius:8px;padding:0 16px;font:500 12px/1 system-ui;cursor:pointer;transition:background .15s}.maintenance-dialog-check{border:1px solid #e5e7ed;background:white;color:#6f7583}.maintenance-dialog-check:hover{background:#f7f8fa}.maintenance-dialog-check:disabled{opacity:.5;cursor:wait}.maintenance-dialog-confirm{border:1px solid #252936;background:#252936;color:white}.maintenance-dialog-confirm:hover{background:#3d4253}.maintenance-dialog button:focus-visible{outline:2px solid #8b91d9;outline-offset:3px}
@media(max-width:480px){.maintenance-dialog{padding:24px}.maintenance-dialog-title{font-size:17px}}
</style>
