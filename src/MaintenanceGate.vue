<template>
  <div :inert="blocked ? '' : null" :aria-hidden="blocked ? 'true' : null" :style="blocked ? { visibility: 'hidden' } : undefined">
    <App v-if="appAllowed" />
  </div>
  <Transition name="maintenance-fade" @after-leave="restoreFocus">
    <MaintenancePage v-if="settings.enabled || recovering" :settings="displaySettings" :offline="offline"
      :checking="checking" :recovering="recovering" @check="check" />
  </Transition>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import App from './App.vue';
import MaintenancePage from './components/maintenance/MaintenancePage.vue';
import { resolveAdminApiBaseUrl } from './axios/myBackend.js';
import { createMaintenancePoller, DEFAULT_MAINTENANCE } from './utils/maintenance.js';

const router = useRouter();
const settings = ref({ ...DEFAULT_MAINTENANCE });
const displaySettings = ref(settings.value);
const appAllowed = ref(false);
const recovering = ref(false);
const offline = ref(false);
const checking = ref(true);
const blocked = computed(() => settings.value.enabled || recovering.value);
let previousFocus;
let disposed = false;

function dismissBootScreen() {
  const boot = document.getElementById('aurora-boot');
  if (typeof boot?.finish === 'function') void boot.finish({ immediate: true });
  else boot?.remove();
  try { sessionStorage.setItem('aurora-splash-seen', '1'); } catch { /* Storage may be disabled. */ }
}

const poller = createMaintenancePoller({
  async fetchStatus(signal) {
    checking.value = true;
    const endpoint = import.meta.env.VITE_MAINTENANCE_STATUS_URL || `${resolveAdminApiBaseUrl().replace(/\/$/, '')}/api/v1/system/maintenance`;
    const response = await fetch(endpoint, { signal, cache: 'no-store', credentials: 'omit', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Maintenance status: ${response.status}`);
    return response.json();
  },
  onStatus(value) {
    offline.value = false;
    const wasEnabled = settings.value.enabled;
    settings.value = value;
    if (value.enabled) {
      if (!wasEnabled) previousFocus = document.activeElement;
      displaySettings.value = value;
      recovering.value = false;
      dismissBootScreen();
    } else {
      appAllowed.value = true;
      if (wasEnabled) {
        recovering.value = true;
        void finishRecovery();
      }
    }
  },
  onError() { offline.value = true; },
  onSettled() {
    checking.value = false;
    if (!settings.value.enabled) appAllowed.value = true;
  },
});

async function finishRecovery() {
  await router.isReady();
  await nextTick();
  if (!disposed && !settings.value.enabled) recovering.value = false;
}
function restoreFocus() {
  if (blocked.value || disposed) return;
  const target = previousFocus?.isConnected && previousFocus !== document.body
    ? previousFocus : document.querySelector('main h1, [data-route-motion-root] button, .aurora-brand');
  if (target && typeof target.focus === 'function') {
    if (!target.hasAttribute('tabindex') && !target.matches('button,a,input')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
}
function check() { void poller.check(); }
function onVisibility() { if (!document.hidden) check(); }
window.addEventListener('online', check);
document.addEventListener('visibilitychange', onVisibility);
onBeforeUnmount(() => {
  disposed = true;
  poller.stop();
  window.removeEventListener('online', check);
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<style>
.maintenance-fade-enter-active,.maintenance-fade-leave-active{transition:opacity .6s ease,filter .6s ease}
.maintenance-fade-enter-from,.maintenance-fade-leave-to{opacity:0;filter:blur(8px);pointer-events:none}
@media(prefers-reduced-motion:reduce){.maintenance-fade-enter-active,.maintenance-fade-leave-active{transition:none}}
</style>
