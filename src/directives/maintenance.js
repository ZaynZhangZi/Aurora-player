import { requireFeature, isTargetAvailable, getMaintenanceSnapshot, subscribeMaintenance } from '../utils/maintenanceAccess.js';

// Capture before Vue click handlers, including controls inside Teleport surfaces.
export const maintenanceDirective = {
  mounted(element, binding) {
    element.dataset.maintenanceTarget = binding.value;
    let available = isTargetAvailable(getMaintenanceSnapshot().settings, binding.value);
    element.__maintenanceUnsubscribe = subscribeMaintenance(({ settings }) => {
      const next = isTargetAvailable(settings, element.dataset.maintenanceTarget);
      if (next && !available) element.dispatchEvent(new CustomEvent('maintenance-restored', { bubbles: true }));
      available = next;
    });
    const intercept = event => {
      if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
      if (requireFeature(element.dataset.maintenanceTarget)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    element.__maintenanceIntercept = intercept;
    element.addEventListener('click', intercept, true);
    element.addEventListener('keydown', intercept, true);
  },
  updated(element, binding) { element.dataset.maintenanceTarget = binding.value; },
  unmounted(element) {
    element.__maintenanceUnsubscribe?.();
    element.removeEventListener('click', element.__maintenanceIntercept, true);
    element.removeEventListener('keydown', element.__maintenanceIntercept, true);
    delete element.__maintenanceIntercept;
    delete element.__maintenanceUnsubscribe;
  },
};
