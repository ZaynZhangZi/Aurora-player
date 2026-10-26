import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DEFAULT_MAINTENANCE, parseMaintenanceStatus } from '../src/utils/maintenance.js';
import { MAINTENANCE_TARGETS, routeMaintenanceKey, isTargetAvailable, resolveMaintenanceContext,
  requireFeature, getMaintenanceSnapshot, updateMaintenanceSettings, dismissTargetMaintenance,
  assertMaintenanceRequest, MaintenanceBlockedError, setMaintenanceFeatureActive, maintenancePresentation, maintenanceReturnPath } from '../src/utils/maintenanceAccess.js';

const settings = targets => parseMaintenanceStatus({ ...DEFAULT_MAINTENANCE, targets });
beforeEach(() => { updateMaintenanceSettings(settings({})); dismissTargetMaintenance(); });

test('every business route and its aliases share a registered page switch; both applications use the same catalog', () => {
  const source = readFileSync(new URL('../src/router/index.js', import.meta.url), 'utf8');
  const names = [...source.matchAll(/name:\s*'([^']+)',\s*component:/g)].map(match => match[1])
    .filter(name => !['routeError', 'notFound', 'maintenance'].includes(name));
  assert.ok(names.length >= 11);
  for (const name of names) assert.ok(routeMaintenanceKey(name), `Missing page switch: ${name}`);
  assert.equal(routeMaintenanceKey('artist'), routeMaintenanceKey('artistByName'));
  assert.equal(routeMaintenanceKey('routeError'), '');
  assert.equal(new Set(MAINTENANCE_TARGETS.map(target => target.key)).size, MAINTENANCE_TARGETS.length);
  const adminCatalog = new URL('../../../backend/backend-fornt/AuroraPlayeradmin-panel/src/config/maintenanceTargets.json', import.meta.url);
  if (existsSync(adminCatalog)) assert.deepEqual(JSON.parse(readFileSync(adminCatalog, 'utf8')), MAINTENANCE_TARGETS);
});

test('page and site maintenance use a route while features use dismissible dialogs', () => {
  assert.equal(maintenancePresentation('global'), 'page');
  for (const target of MAINTENANCE_TARGETS) {
    assert.equal(maintenancePresentation(target.key), target.key.startsWith('page.') ? 'page' : 'dialog');
  }
});

test('maintenance return links preserve internal parameters and reject external URLs and redirect loops', () => {
  assert.equal(maintenanceReturnPath('/search?q=Taylor%20Swift&tab=songs#results'), '/search?q=Taylor%20Swift&tab=songs#results');
  for (const value of [undefined, ['//evil.test'], 'https://evil.test', '//evil.test', '/\\evil.test', '/maintenance', '/maintenance?from=/home', '/home\n']) {
    assert.equal(maintenanceReturnPath(value), '/home');
  }
});

test('closing a feature dialog suppresses active reminders across polls but does not enable the feature', () => {
  const token = Symbol();
  const closed = settings({ 'feature.cloud': { available: false } });
  updateMaintenanceSettings(closed);
  setMaintenanceFeatureActive(token, 'feature.cloud', true);
  requireFeature('feature.cloud');
  dismissTargetMaintenance('feature.cloud');
  updateMaintenanceSettings(closed);
  const snapshot = getMaintenanceSnapshot();
  assert.equal(resolveMaintenanceContext(closed, 'profile', snapshot.requestedTarget, snapshot.activeTargets, snapshot.dismissedTargets), null);
  assert.equal(isTargetAvailable(closed, 'feature.cloud'), false);
  assert.equal(requireFeature('feature.cloud'), false);
  assert.equal(getMaintenanceSnapshot().requestedTarget, 'feature.cloud');
  setMaintenanceFeatureActive(token, 'feature.cloud', false);
  assert.deepEqual(getMaintenanceSnapshot().dismissedTargets, []);
});

test('old configurations keep all targets open; invalid nested settings cannot silently reopen maintenance', () => {
  const old = parseMaintenanceStatus({ enabled: false });
  for (const target of MAINTENANCE_TARGETS) assert.equal(isTargetAvailable(old, target.key), true);
  for (const targets of [[], { 'feature.login': null }, { 'feature.login': { available: 'false' } },
    { 'feature.login': { available: false, useGlobalPage: 'true' } }, { '__proto__.bad': { available: false } }]) {
    assert.throws(() => parseMaintenanceStatus({ enabled: false, targets }));
  }
});

test('global, route, requested feature and active feature maintenance have deterministic priority and isolated content', () => {
  const scoped = settings({
    'page.search': { available: false, useGlobalPage: false, title: '搜索升级', message: '搜索稍后恢复', customHtml: '<h1>搜索维护</h1>' },
    'feature.login': { available: false, useGlobalPage: true },
    'feature.cloud': { available: false, useGlobalPage: false, title: '云盘维护' },
  });
  assert.equal(resolveMaintenanceContext(scoped, 'search', 'feature.login').key, 'page.search');
  assert.equal(resolveMaintenanceContext(scoped, 'search').page.customHtml, '<h1>搜索维护</h1>');
  assert.equal(resolveMaintenanceContext(scoped, 'home', 'feature.login').page.title, scoped.title);
  assert.equal(resolveMaintenanceContext(scoped, 'home', '', ['feature.cloud']).page.title, '云盘维护');
  assert.equal(resolveMaintenanceContext(scoped, 'home'), null);
  assert.equal(resolveMaintenanceContext({ ...scoped, enabled: true }, 'search', 'feature.login').key, 'global');
  assert.equal(isTargetAvailable(scoped, 'page.home'), true);
});

test('blocked actions show their maintenance page; reopening clears stale requested targets', () => {
  updateMaintenanceSettings(settings({ 'feature.login': { available: false } }));
  assert.equal(requireFeature('feature.login'), false);
  assert.equal(getMaintenanceSnapshot().requestedTarget, 'feature.login');
  assert.equal(requireFeature('feature.settings'), true);
  dismissTargetMaintenance();
  assert.equal(getMaintenanceSnapshot().requestedTarget, '');
  requireFeature('feature.login');
  updateMaintenanceSettings(settings({ 'feature.login': { available: true } }));
  assert.equal(getMaintenanceSnapshot().requestedTarget, '');
  assert.equal(requireFeature('feature.login'), true);
});

test('background requests are blocked without hijacking unrelated pages, while disabled write actions show maintenance', () => {
  updateMaintenanceSettings(settings({ 'feature.cloud': { available: false }, 'feature.favorites': { available: false } }));
  assert.throws(() => assertMaintenanceRequest('/user/cloud?limit=30'), MaintenanceBlockedError);
  assert.equal(getMaintenanceSnapshot().requestedTarget, '');
  assert.doesNotThrow(() => assertMaintenanceRequest('/api/v1/system/maintenance'));
  assert.doesNotThrow(() => assertMaintenanceRequest('/logout'));
  assert.doesNotThrow(() => assertMaintenanceRequest('/song/detail?ids=1'));
  assert.throws(() => assertMaintenanceRequest('/playlist/subscribe?id=1'), MaintenanceBlockedError);
  assert.equal(getMaintenanceSnapshot().requestedTarget, 'feature.favorites');
});

test('active feature tracking survives overlapping instances and releases every registration', () => {
  const first = Symbol(), second = Symbol();
  setMaintenanceFeatureActive(first, 'feature.lyrics', true);
  setMaintenanceFeatureActive(second, 'feature.lyrics', true);
  assert.deepEqual(getMaintenanceSnapshot().activeTargets, ['feature.lyrics']);
  setMaintenanceFeatureActive(first, 'feature.lyrics', false);
  assert.deepEqual(getMaintenanceSnapshot().activeTargets, ['feature.lyrics']);
  setMaintenanceFeatureActive(second, 'feature.lyrics', false);
  assert.deepEqual(getMaintenanceSnapshot().activeTargets, []);
});
