import { onActivated, onBeforeUnmount, onDeactivated, ref, shallowRef, watch } from 'vue';
import { getMaintenanceSnapshot, subscribeMaintenance, setMaintenanceFeatureActive, requireFeature, isTargetAvailable } from '../utils/maintenanceAccess.js';

export function useMaintenanceAccess() {
  const state = shallowRef(getMaintenanceSnapshot());
  const unsubscribe = subscribeMaintenance(value => { state.value = value; });
  onBeforeUnmount(unsubscribe);
  return state;
}

export function useFeatureMaintenance(key, isActive, onBlocked = () => {}, onRecovered = () => {}) {
  const state = useMaintenanceAccess();
  const token = Symbol(key);
  const componentActive = ref(true);
  let awaitingRecovery = false;
  onActivated(() => { componentActive.value = true; });
  onDeactivated(() => {
    componentActive.value = false;
    setMaintenanceFeatureActive(token, key, false);
  });
  watch([() => componentActive.value && isActive(), () => state.value.settings], ([active, settings]) => {
    // Remember an already-open surface when it is disabled, then close native dialogs
    // so they cannot cover the maintenance screen in the browser's top layer.
    if (active && (settings.enabled || settings.targets?.[key]?.available === false)) {
      if (!awaitingRecovery) requireFeature(key);
      awaitingRecovery = true;
      onBlocked();
    } else if (active && awaitingRecovery && isTargetAvailable(settings, key)) {
      awaitingRecovery = false;
      void Promise.resolve(onRecovered()).catch(() => {});
    }
    setMaintenanceFeatureActive(token, key, Boolean(componentActive.value && isActive()));
  }, { immediate: true, flush: 'sync' });
  onBeforeUnmount(() => setMaintenanceFeatureActive(token, key, false));
}
