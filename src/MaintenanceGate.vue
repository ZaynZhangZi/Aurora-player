<template>
  <div :inert="blocked ? '' : null" :aria-hidden="blocked ? 'true' : null" :style="pageVisible ? { visibility: 'hidden' } : undefined">
    <App v-if="appAllowed" />
  </div>
  <Transition name="maintenance-fade" @after-leave="restoreFocus">
    <MaintenancePage v-if="pageVisible" :settings="displaySettings" :offline="offline"
      :scope-label="displayLabel" :can-return="context && context.key !== 'global'" :checking="checking"
      :recovering="recovering" @check="check" @return="returnToAvailablePage" />
  </Transition>
  <Teleport to="body">
    <Transition name="maintenance-dialog" @after-leave="restoreFocus">
      <MaintenanceDialog v-if="context?.presentation === 'dialog'" :settings="displaySettings" :scope-label="displayLabel"
        :offline="offline" :checking="checking" @check="check" @close="closeFeatureDialog" />
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import App from './App.vue';
import MaintenancePage from './components/maintenance/MaintenancePage.vue';
import MaintenanceDialog from './components/maintenance/MaintenanceDialog.vue';
import { resolveAdminApiBaseUrl } from './axios/myBackend.js';
import { createMaintenancePoller, DEFAULT_MAINTENANCE } from './utils/maintenance.js';
import { useMaintenanceAccess } from './composables/useMaintenanceAccess.js';
import { dismissTargetMaintenance, isRouteAvailable, maintenanceReturnPath, resolveMaintenanceContext, updateMaintenanceSettings } from './utils/maintenanceAccess.js';

const router = useRouter();
const access = useMaintenanceAccess();
const destination = computed(() => router.currentRoute.value.name === 'maintenance'
  ? router.resolve(maintenanceReturnPath(router.currentRoute.value.query.from)) : router.currentRoute.value);
const context = computed(() => resolveMaintenanceContext(access.value.settings, destination.value.name,
  access.value.requestedTarget, access.value.activeTargets, access.value.dismissedTargets));
const displaySettings = ref({ ...DEFAULT_MAINTENANCE });
const displayLabel = ref('');
const appAllowed = ref(false);
const recovering = ref(false);
const displayPresentation = ref('page');
const offline = ref(false);
const checking = ref(true);
const blocked = computed(() => Boolean(context.value) || recovering.value);
const pageVisible = computed(() => context.value?.presentation === 'page' || (recovering.value && displayPresentation.value === 'page'));
const checked = ref(false);
let previousFocus;
let disposed = false;
let reconciling = false;

watch(context, (value, previous) => {
  if (value) {
    if (!previous) previousFocus = document.activeElement;
    displaySettings.value = value.page;
    displayLabel.value = value.key === 'global' ? '' : value.label;
    displayPresentation.value = value.presentation;
    recovering.value = false;
    dismissBootScreen();
  } else if (previous) {
    recovering.value = previous.presentation === 'page';
  }
}, { flush: 'sync' });
watch([checked, () => router.currentRoute.value.fullPath, context], reconcileView, { flush: 'post' });

function dismissBootScreen() {
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
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
    updateMaintenanceSettings(value);
  },
  onError() { offline.value = true; },
  onSettled() {
    checking.value = false;
    checked.value = true;
    void reconcileView();
  },
});

async function reconcileView() {
  if (!checked.value || disposed || reconciling) return;
  await router.isReady();
  if (disposed || reconciling) return;
  reconciling = true;
  try {
    const current = router.currentRoute.value;
    if (context.value?.presentation === 'page' && current.name !== 'maintenance') {
      await router.replace({ name: 'maintenance', query: { from: current.fullPath } });
    } else if (context.value?.presentation !== 'page' && current.name === 'maintenance') {
      await router.replace(maintenanceReturnPath(current.query.from));
    }
    if (context.value?.presentation !== 'page' && router.currentRoute.value.name !== 'maintenance') {
      appAllowed.value = true;
      await nextTick();
      if (!context.value) recovering.value = false;
    }
  } finally {
    reconciling = false;
    const routeIsMaintenance = router.currentRoute.value.name === 'maintenance';
    if (!disposed && (context.value?.presentation === 'page') !== routeIsMaintenance) void reconcileView();
  }
}
function closeFeatureDialog() {
  if (context.value?.presentation === 'dialog') dismissTargetMaintenance(context.value.key);
}
async function returnToAvailablePage() {
  dismissTargetMaintenance();
  const fallback = ['home', 'discover', 'profile', 'search', 'messages', 'moments', 'releaseNotes']
    .find(name => name !== destination.value.name && isRouteAvailable(access.value.settings, name));
  // If every page is closed, keep the maintenance screen and its polling alive.
  if (fallback) await router.push({ name: fallback });
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
.maintenance-dialog-enter-active,.maintenance-dialog-leave-active{transition:opacity .2s ease}
.maintenance-dialog-enter-active .maintenance-dialog,.maintenance-dialog-leave-active .maintenance-dialog{transition:transform .2s ease}
.maintenance-dialog-enter-from,.maintenance-dialog-leave-to{opacity:0;pointer-events:none}
.maintenance-dialog-enter-from .maintenance-dialog,.maintenance-dialog-leave-to .maintenance-dialog{transform:translateY(12px) scale(.98)}
@media(prefers-reduced-motion:reduce){.maintenance-fade-enter-active,.maintenance-fade-leave-active{transition:none}}
@media(prefers-reduced-motion:reduce){.maintenance-dialog-enter-active,.maintenance-dialog-leave-active,.maintenance-dialog-enter-active .maintenance-dialog,.maintenance-dialog-leave-active .maintenance-dialog{transition:none}}
</style>
