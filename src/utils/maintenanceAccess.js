import catalog from '../config/maintenanceTargets.json' with { type: 'json' };
import { DEFAULT_MAINTENANCE } from './maintenance.js';

export const MAINTENANCE_TARGETS = Object.freeze(catalog);
const routeKeys = new Map(catalog.flatMap(target => (target.routeNames || []).map(name => [name, target.key])));
const apiRules = catalog.flatMap(target => (target.apiPatterns || []).map(pattern => [new RegExp(pattern), target.key]));
const labels = new Map(catalog.map(target => [target.key, target.label]));
export const routeMaintenanceKey = name => routeKeys.get(String(name || '')) || '';
export const targetLabel = key => labels.get(key) || key;
export const maintenancePresentation = key => key === 'global' || key?.startsWith('page.') ? 'page' : 'dialog';
export function maintenanceReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)
    || /^\/maintenance(?:[/?#]|$)/.test(value)) return '/home';
  return value;
}
export const isTargetAvailable = (settings, key) => !settings.enabled && (!key || settings.targets?.[key]?.available !== false);
export const isRouteAvailable = (settings, name) => isTargetAvailable(settings, routeMaintenanceKey(name));

export function targetMaintenancePage(settings, key) {
  const target = settings.targets?.[key];
  if (key.startsWith('feature.') && (!target || target.useGlobalPage !== false)) {
    return { ...DEFAULT_MAINTENANCE, title: `${targetLabel(key)}暂时不可用`, message: '该功能正在维护，请稍后再试。' };
  }
  if (!target || target.useGlobalPage !== false) return settings;
  return { ...DEFAULT_MAINTENANCE, ...target, targets: {}, enabled: true };
}

export function resolveMaintenanceContext(settings, routeName, requestedTarget = '', activeTargets = [], dismissedTargets = []) {
  if (settings.enabled) return { key: 'global', label: '全站维护', page: settings, presentation: 'page' };
  const key = [routeMaintenanceKey(routeName), requestedTarget, ...activeTargets.filter(key => !dismissedTargets.includes(key))]
    .find(key => key && !isTargetAvailable(settings, key));
  return key ? { key, label: targetLabel(key), page: targetMaintenancePage(settings, key), presentation: maintenancePresentation(key) } : null;
}

let snapshot = { settings: { ...DEFAULT_MAINTENANCE }, requestedTarget: '', activeTargets: [], dismissedTargets: [] };
const listeners = new Set();
const activeFeatures = new Map();
function publish(change) {
  snapshot = { ...snapshot, ...change };
  listeners.forEach(listener => listener(snapshot));
}
export const getMaintenanceSnapshot = () => snapshot;
export function subscribeMaintenance(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function updateMaintenanceSettings(settings) {
  publish({ settings, requestedTarget: isTargetAvailable(settings, snapshot.requestedTarget) ? '' : snapshot.requestedTarget,
    dismissedTargets: snapshot.dismissedTargets.filter(key => !isTargetAvailable(settings, key)) });
}
export function dismissTargetMaintenance(key = snapshot.requestedTarget) {
  publish({ requestedTarget: '', dismissedTargets: key ? [...new Set([...snapshot.dismissedTargets, key])] : snapshot.dismissedTargets });
}
export function requireFeature(key) {
  if (isTargetAvailable(snapshot.settings, key)) return true;
  if (snapshot.requestedTarget !== key || snapshot.dismissedTargets.includes(key)) {
    publish({ requestedTarget: key, dismissedTargets: snapshot.dismissedTargets.filter(target => target !== key) });
  }
  return false;
}
export function setMaintenanceFeatureActive(token, key, active) {
  if (active ? activeFeatures.get(token) === key : !activeFeatures.has(token)) return;
  if (active) activeFeatures.set(token, key); else activeFeatures.delete(token);
  const activeTargets = [...new Set(activeFeatures.values())];
  publish({ activeTargets, dismissedTargets: snapshot.dismissedTargets.filter(key => activeTargets.includes(key)) });
}

export class MaintenanceBlockedError extends Error {
  constructor(key) { super(`${targetLabel(key)}正在维护`); this.name = 'MaintenanceBlockedError'; this.target = key; }
}
export function requestMaintenanceTargets(url = '') {
  let path;
  try { path = new URL(url, 'https://maintenance.local').pathname; } catch { return []; }
  return [...new Set(apiRules.filter(([pattern]) => pattern.test(path)).map(([, key]) => key))];
}
// Background data loads must not open a maintenance screen over an unrelated feature.
export function assertMaintenanceRequest(url) {
  const key = requestMaintenanceTargets(url).find(key => !isTargetAvailable(snapshot.settings, key));
  if (key) {
    const path = new URL(url, 'https://maintenance.local').pathname;
    if (/^\/(?:send\/text|share\/resource|event\/(?:forward|del)|comment|resource\/like|follow|like|playlist\/subscribe|album\/sub|artist\/sub|user\/(?:update|bindingcellphone|cloud\/del)|avatar\/upload|cloud(?:\/match)?)$/.test(path)) requireFeature(key);
    throw new MaintenanceBlockedError(key);
  }
}
