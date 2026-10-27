import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { maintenanceDirective } from '../src/directives/maintenance.js';
import { usePlayerMediaSession } from '../src/composables/usePlayerMediaSession.js';
import { DEFAULT_MAINTENANCE } from '../src/utils/maintenance.js';
import { MAINTENANCE_TARGETS, updateMaintenanceSettings, requireFeature, dismissTargetMaintenance,
  getMaintenanceSnapshot, assertMaintenanceRequest, requestMaintenanceTargets, MaintenanceBlockedError } from '../src/utils/maintenanceAccess.js';

const settings = targets => ({ ...DEFAULT_MAINTENANCE, targets });
beforeEach(() => { updateMaintenanceSettings(settings({})); dismissTargetMaintenance(); });

test('every switch remains enforced after dismissing its reminder and receiving another poll', () => {
  for (const {key} of MAINTENANCE_TARGETS) {
    const closed = settings({[key]: {available: false}});
    updateMaintenanceSettings(closed);
    assert.equal(requireFeature(key), false, key);
    dismissTargetMaintenance(key);
    updateMaintenanceSettings(closed);
    assert.equal(requireFeature(key), false, `${key}: dismiss + poll`);
    updateMaintenanceSettings(settings({}));
    assert.equal(requireFeature(key), true, `${key}: restored`);
  }
});

test('disabled regions block keyboard, form, slider, file, pointer and drag actions after closing the dialog', () => {
  const element = new EventTarget();
  element.dataset = {};
  const key = 'feature.cloud';
  updateMaintenanceSettings(settings({[key]: {available: false}}));
  maintenanceDirective.mounted(element, {value: key});
  try {
    for (const type of ['click', 'dblclick', 'auxclick', 'contextmenu', 'pointerdown', 'mousedown', 'touchstart',
      'keydown', 'keyup', 'beforeinput', 'input', 'change', 'submit', 'dragstart', 'drop', 'paste', 'cut']) {
      dismissTargetMaintenance(key);
      let calls = 0;
      const action = () => calls++;
      element.addEventListener(type, action);
      const event = new Event(type, {cancelable: true});
      if (type.startsWith('key')) Object.defineProperty(event, 'key', {value: type === 'keyup' ? 'Enter' : 'ArrowRight'});
      element.dispatchEvent(event);
      assert.equal(calls, 0, type);
      assert.equal(event.defaultPrevented, true, type);
      assert.equal(getMaintenanceSnapshot().requestedTarget, key, type);
      element.removeEventListener(type, action);
    }
    for (const key of ['Tab', 'Escape']) {
      const event = new Event('keydown', {cancelable: true});
      Object.defineProperty(event, 'key', {value: key});
      element.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false, `${key} remains usable`);
    }
    let restored = 0, calls = 0;
    element.addEventListener('maintenance-restored', () => restored++);
    element.addEventListener('change', () => calls++);
    updateMaintenanceSettings(settings({}));
    element.dispatchEvent(new Event('change', {cancelable: true}));
    assert.equal(restored, 1);
    assert.equal(calls, 1);
    maintenanceDirective.updated(element, {value: 'feature.automix'});
    updateMaintenanceSettings(settings({'feature.automix': {available: false}}));
    element.dispatchEvent(new Event('change', {cancelable: true}));
    assert.equal(calls, 1, 'a reused region checks its new target');
  } finally { maintenanceDirective.unmounted(element); }
});

test('search request guards account for category parameters, proxy prefixes and the composite search scope', () => {
  for (const [type, target] of [[1, 'searchSongs'], [10, 'searchAlbums'], [100, 'searchArtists'], [1000, 'searchPlaylists']]) {
    const key = `feature.${target}`;
    updateMaintenanceSettings(settings({[key]: {available: false}}));
    for (const request of [`/cloudsearch?type=${type}`, {url: '/search', params: {type}},
      {url: '/api/cloudsearch', params: new URLSearchParams({type})}]) {
      assert.ok(requestMaintenanceTargets(request).includes(key));
      assert.throws(() => assertMaintenanceRequest(request), MaintenanceBlockedError);
    }
    assert.doesNotThrow(() => assertMaintenanceRequest('/api/v1/system/maintenance'));
  }
  updateMaintenanceSettings(settings({'feature.searchAll': {available: false}}));
  assert.throws(() => assertMaintenanceRequest({url: '/cloudsearch', params: {type: 1}, maintenanceTargets: ['feature.searchAll']}), MaintenanceBlockedError);
  assert.doesNotThrow(() => assertMaintenanceRequest({url: '/cloudsearch', params: {type: 1}}));
  updateMaintenanceSettings(settings({'feature.homeBanners': {available: false}}));
  assert.throws(() => assertMaintenanceRequest('/backend-api/api/v1/content/banners'), MaintenanceBlockedError);
});

test('responses from a request started before maintenance are discarded without reopening a dismissed alert', () => {
  const request = {url: '/user/cloud'};
  assert.doesNotThrow(() => assertMaintenanceRequest(request));
  updateMaintenanceSettings(settings({'feature.cloud': {available: false}}));
  requireFeature('feature.cloud');
  dismissTargetMaintenance('feature.cloud');
  assert.throws(() => assertMaintenanceRequest(request, {notify: false}), MaintenanceBlockedError);
  assert.equal(getMaintenanceSnapshot().requestedTarget, '');
  updateMaintenanceSettings(settings({}));
  assert.doesNotThrow(() => assertMaintenanceRequest(request, {notify: false}));
});

test('system media controls cannot play or seek during playback maintenance', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const handlers = new Map();
  const audio = {play: async () => { plays++; }, currentTime: 0};
  let plays = 0;
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
    mediaSession: {setActionHandler: (key, handler) => handlers.set(key, handler)},
  }});
  const controls = usePlayerMediaSession({getActiveAudio: () => audio, getHasSong: () => true,
    getCanPlayPrev: () => false, getCanPlayNext: () => false, setCurrentTimeMs: () => {}});
  try {
    controls.setupMediaSessionHandlers();
    updateMaintenanceSettings(settings({'feature.playback': {available: false}}));
    dismissTargetMaintenance('feature.playback');
    await handlers.get('play')();
    handlers.get('seekto')({seekTime: 30});
    assert.equal(plays, 0);
    assert.equal(audio.currentTime, 0);
    updateMaintenanceSettings(settings({}));
    await handlers.get('play')();
    assert.equal(plays, 1);
  } finally {
    controls.clearMediaSessionHandlers();
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else delete globalThis.navigator;
  }
});
