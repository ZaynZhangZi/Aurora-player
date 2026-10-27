// Teleport places business dialogs outside the inert app root. Isolate those
// siblings as well, including surfaces inserted while maintenance is visible.
export function createMaintenanceIsolation(isBlocked, root = document) {
  const previous = new Map();
  const events = ['click', 'dblclick', 'auxclick', 'pointerdown', 'mousedown', 'touchstart', 'keydown', 'keyup',
    'beforeinput', 'input', 'change', 'submit', 'drop', 'paste'];
  const allowed = '.maintenance-page, .maintenance-dialog-backdrop';
  function intercept(event) {
    if (!isBlocked() || event.target?.closest?.(allowed)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function sync() {
    if (!isBlocked()) {
      for (const [element, wasInert] of previous) element.inert = wasInert;
      previous.clear();
      return;
    }
    for (const element of root.body.children) {
      if (element.id === 'app' || element.matches(`${allowed}, script, style, link`)) continue;
      if (!previous.has(element)) previous.set(element, element.inert);
      element.inert = true;
    }
  }
  const observer = new MutationObserver(sync);
  observer.observe(root.body, {childList: true});
  for (const name of events) root.addEventListener(name, intercept, {capture: true, passive: false});
  return {
    sync,
    destroy() {
      observer.disconnect();
      for (const name of events) root.removeEventListener(name, intercept, true);
      for (const [element, wasInert] of previous) element.inert = wasInert;
      previous.clear();
    },
  };
}
