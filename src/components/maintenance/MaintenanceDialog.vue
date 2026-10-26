<template>
    <div class="maintenance-dialog-backdrop" @click.self="$emit('close')" @keydown="onKeydown">
      <section ref="dialogRef" class="maintenance-dialog" role="dialog" aria-modal="true" :aria-label="`${scopeLabel}维护提示`" tabindex="-1">
        <header class="maintenance-dialog-heading">
          <span>{{ scopeLabel }} · 维护提示</span>
          <button class="maintenance-dialog-close" type="button" aria-label="关闭维护提示" @click="$emit('close')">×</button>
        </header>
        <MaintenancePage embedded :settings="settings" :scope-label="scopeLabel" :offline="offline"
          :checking="checking" :recovering="recovering" can-return @check="$emit('check')" @return="$emit('close')" />
      </section>
    </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import MaintenancePage from './MaintenancePage.vue';
import { lockScroll, unlockScroll } from '../../utils/scrollLock.js';
defineProps({ settings: { type: Object, required: true }, scopeLabel: { type: String, default: '' }, offline: Boolean, checking: Boolean, recovering: Boolean });
const emit = defineEmits(['close', 'check']);
const dialogRef = ref(null);
onMounted(() => {
  lockScroll();
  void nextTick(() => dialogRef.value?.querySelector('button')?.focus({ preventScroll: true }));
});
onBeforeUnmount(unlockScroll);
function onKeydown(event) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); emit('close'); return; }
  if (event.key !== 'Tab') return;
  const elements = [...dialogRef.value.querySelectorAll('button:not(:disabled), iframe, [tabindex="0"]')].filter(el => el.getClientRects().length);
  const first = elements[0], last = elements.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
</script>

<style scoped>
.maintenance-dialog-backdrop{position:fixed;inset:0;z-index:10030;display:grid;place-items:center;padding:24px;background:#080a1673;backdrop-filter:blur(9px);box-sizing:border-box}
.maintenance-dialog{position:relative;width:min(660px,100%);border-radius:22px;outline:none;box-shadow:0 28px 100px #0007;border:1px solid #ffffff20}
.maintenance-dialog-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:54px;box-sizing:border-box;padding:10px 14px 10px 22px;border-radius:22px 22px 0 0;background:#0d0e18;border-bottom:1px solid #ffffff12;color:#d9d6e7;font:12px system-ui}
.maintenance-dialog-close{display:grid;place-items:center;flex-shrink:0;width:34px;height:34px;border:1px solid #ffffff24;border-radius:50%;background:#161722dc;color:white;font:24px/1 system-ui;cursor:pointer}
.maintenance-dialog-close:focus-visible{outline:2px solid white;outline-offset:3px}
@media(max-width:600px){.maintenance-dialog-backdrop{padding:16px}}
</style>
