import test from 'node:test';
import assert from 'node:assert/strict';
import { createMaintenancePoller, parseMaintenanceStatus, MAINTENANCE_POLL_INTERVAL } from '../src/utils/maintenance.js';

const flush = () => new Promise(resolve => setImmediate(resolve));

test('accepts API envelopes and standalone JSON, rejects failures and missing boolean status', () => {
  assert.equal(parseMaintenanceStatus({ code: 200, data: { enabled: true } }).enabled, true);
  assert.equal(parseMaintenanceStatus({ enabled: false }).enabled, false);
  for (const invalid of [null, '<html>error</html>', {}, { enabled: 'false' }, { code: 500, data: { enabled: false } }]) {
    assert.throws(() => parseMaintenanceStatus(invalid));
  }
  const settings = parseMaintenanceStatus({ enabled: true, accentColor: 'red; background:url(x)', backgroundUrl: 'javascript:alert(1)' });
  assert.equal(settings.accentColor, '#a78bfa');
  assert.equal(settings.backgroundUrl, '');
});

test('checks immediately, polls every 10 seconds, retains maintenance through errors and recovers', async () => {
  let tick;
  let cancelled;
  let next = { enabled: true, title: '正在升级' };
  const received = [];
  let errors = 0;
  const poller = createMaintenancePoller({
    fetchStatus: async () => { if (next instanceof Error) throw next; return next; },
    onStatus: status => received.push(status),
    onError: () => errors++,
    schedule: (callback, interval) => { tick = callback; assert.equal(interval, MAINTENANCE_POLL_INTERVAL); return 42; },
    cancel: id => { cancelled = id; },
  });
  await flush();
  assert.equal(received.at(-1).enabled, true);
  next = new Error('network offline');
  tick(); await flush();
  assert.equal(errors, 1);
  assert.equal(received.length, 1);
  assert.equal(received.at(-1).enabled, true);
  next = { code: 200, data: { enabled: false } };
  tick(); await flush();
  assert.equal(received.at(-1).enabled, false);
  poller.stop();
  assert.equal(cancelled, 42);
});

test('manual checks and timer ticks share an in-flight request; stop aborts and suppresses late updates', async () => {
  let calls = 0;
  let resolve;
  let signal;
  let updates = 0;
  let settled = 0;
  const poller = createMaintenancePoller({
    fetchStatus: requestSignal => { calls++; signal = requestSignal; return new Promise(done => { resolve = done; }); },
    onStatus: () => updates++, onSettled: () => settled++,
    schedule: () => 1, cancel: () => {},
  });
  const pending = poller.check();
  assert.equal(poller.check(), pending);
  assert.equal(calls, 1);
  poller.stop();
  assert.equal(signal.aborted, true);
  resolve({ enabled: true });
  await pending;
  assert.equal(updates, 0);
  assert.equal(settled, 0);
  await poller.check();
  assert.equal(calls, 1);
});

test('slow requests abort after 4 seconds and the next check can succeed', async () => {
  let expire;
  let failure = 0;
  let calls = 0;
  let latest;
  const poller = createMaintenancePoller({
    fetchStatus: signal => {
      if (++calls > 1) return Promise.resolve({ enabled: false });
      return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true }));
    },
    onStatus: value => { latest = value; }, onError: () => failure++,
    schedule: () => 1, cancel: () => {},
    timeout: (callback, ms) => { assert.equal(ms, 4000); expire = callback; return 2; }, clearTimeoutFn: () => {},
  });
  expire(); await flush();
  assert.equal(failure, 1);
  await poller.check();
  assert.equal(latest.enabled, false);
  poller.stop();
});
