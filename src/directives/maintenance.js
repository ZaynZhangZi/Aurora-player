import { requireFeature, isTargetAvailable, getMaintenanceSnapshot, subscribeMaintenance } from '../utils/maintenanceAccess.js';

// Guard initiating events too: keyboard, sliders, file inputs and drag/drop.
const guardedEvents = ['click', 'dblclick', 'auxclick', 'contextmenu', 'pointerdown', 'mousedown', 'touchstart',
  'keydown', 'keyup', 'beforeinput', 'input', 'change', 'submit', 'dragstart', 'drop', 'paste', 'cut'];

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
      if (['keydown', 'keyup'].includes(event.type) && ['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
      if (requireFeature(element.dataset.maintenanceTarget)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    element.__maintenanceIntercept = intercept;
    for (const name of guardedEvents) element.addEventListener(name, intercept, { capture: true, passive: false });
  },
  updated(element, binding) { element.dataset.maintenanceTarget = binding.value; },
  unmounted(element) {
    element.__maintenanceUnsubscribe?.();
    for (const name of guardedEvents) element.removeEventListener(name, element.__maintenanceIntercept, true);
    delete element.__maintenanceIntercept;
    delete element.__maintenanceUnsubscribe;
  },
};
