import test from 'node:test';
import assert from 'node:assert/strict';
import { createMaintenancePoller, parseMaintenanceStatus, MAINTENANCE_POLL_INTERVAL, nextMaintenanceCheckAt, formatBeijingTime } from '../src/utils/maintenance.js';

const flush = () => new Promise(resolve => setImmediate(resolve));
function fakeClock(start) {
  let current = start, sequence = 0;
  const tasks = new Map();
  const schedule = (callback, delay) => { const id = ++sequence; tasks.set(id, {at: current + delay, callback}); return id; };
  const cancel = id => tasks.delete(id);
  return {
    now: () => current, schedule, cancel, timeout: schedule, clearTimeoutFn: cancel,
    jump(timestamp) { current = timestamp; },
    async advance(ms) {
      const end = current + ms;
      for (;;) {
        const next = [...tasks.entries()].filter(([, task]) => task.at <= end).sort((a,b) => a[1].at - b[1].at)[0];
        if (!next) break;
        tasks.delete(next[0]); current = Math.max(current, next[1].at);
        next[1].callback(); await flush();
      }
      current = end; await flush();
    },
    get pending() { return tasks.size; },
  };
}

test('accepts API envelopes and standalone JSON, rejects failures and missing boolean status', () => {
  assert.equal(parseMaintenanceStatus({ code: 200, data: { enabled: true } }).enabled, true);
  assert.equal(parseMaintenanceStatus({ enabled: false }).enabled, false);
  for (const invalid of [null, '<html>error</html>', {}, { enabled: 'false' }, { code: 500, data: { enabled: false } }]) assert.throws(() => parseMaintenanceStatus(invalid));
  const settings = parseMaintenanceStatus({enabled:true,accentColor:'red; background:url(x)',backgroundUrl:'javascript:alert(1)'});
  assert.equal(settings.accentColor,'#a78bfa');
  assert.equal(settings.backgroundUrl,'');
});

test('checks immediately then aligns to wall-clock slots, preserves maintenance through errors and recovers', async () => {
  const clock=fakeClock(12345),received=[],calls=[];
  let next={enabled:true},errors=0,timing;
  const poller=createMaintenancePoller({...clock,
    fetchStatus:async()=>{calls.push(clock.now());if(next instanceof Error)throw next;return next},
    onStatus:status=>received.push(status),onError:()=>errors++,onTiming:value=>{timing=value},
  });
  await flush();
  assert.deepEqual(calls,[12345]);
  assert.equal(timing.nextCheckAt,20000);
  next=new Error('offline');
  await clock.advance(7655);
  assert.equal(errors,1);
  assert.equal(received.at(-1).enabled,true);
  next={enabled:false};
  await clock.advance(MAINTENANCE_POLL_INTERVAL);
  assert.equal(received.at(-1).enabled,false);
  assert.deepEqual(calls,[12345,20000,30000]);
  poller.stop();
  assert.equal(clock.pending,0);
});

test('clients entering at different times converge on the same 00/10/20/30/40/50 second slots', async () => {
  const clock=fakeClock(2350),first=[],second=[];
  const make=records=>createMaintenancePoller({...clock,fetchStatus:async()=>{records.push(clock.now());return {enabled:true}},onStatus:()=>{}});
  const a=make(first);await flush();
  await clock.advance(5550);
  const b=make(second);await flush();
  await clock.advance(2100);
  await clock.advance(10000);
  assert.deepEqual(first,[2350,10000,20000]);
  assert.deepEqual(second,[7900,10000,20000]);
  a.stop();b.stop();
  assert.equal(clock.pending,0);
});

test('server time corrects a wrong device clock and the displayed Beijing schedule', async () => {
  const serverStart=Date.UTC(2026,9,28,4,0,3,200),deviceError=125000;
  const clock=fakeClock(serverStart+deviceError),received=[];
  let timing;
  const poller=createMaintenancePoller({...clock,
    fetchStatus:async(_signal,syncClock)=>{received.push(clock.now()-deviceError);syncClock(String(clock.now()-deviceError));return {enabled:true}},
    onStatus:()=>{},onTiming:value=>{timing=value},
  });
  await flush();
  assert.equal(timing.clockOffset,-deviceError);
  assert.equal(timing.clockSynced,true);
  assert.equal(formatBeijingTime(timing.nextCheckAt),'12:00:10');
  await clock.advance(6800);
  assert.equal(formatBeijingTime(received.at(-1)),'12:00:10');
  assert.equal(formatBeijingTime(timing.nextCheckAt),'12:00:20');
  poller.stop();
});

test('clock calibration accounts for transport latency and ignores missing or invalid samples', async () => {
  const serverStart=Date.UTC(2026,9,28,4,0,3),deviceError=90000;
  const clock=fakeClock(serverStart+deviceError);
  let timing,request=0;
  const poller=createMaintenancePoller({...clock,onStatus:()=>{},onTiming:value=>{timing=value},
    fetchStatus:(_signal,syncClock)=>{
      if(request++) { for(const sample of [null,'','NaN','-2','Infinity'])syncClock(sample);return Promise.resolve({enabled:true}) }
      return new Promise(resolve=>clock.schedule(()=>{syncClock(serverStart+100);resolve({enabled:true})},200));
    },
  });
  await clock.advance(200);
  assert.equal(timing.clockOffset,-deviceError);
  const boundary=timing.nextCheckAt;
  await poller.check();
  assert.equal(timing.nextCheckAt,boundary,'manual refresh does not restart a private ten-second timer');
  assert.equal(timing.clockOffset,-deviceError,'bad samples cannot replace a valid calibration');
  poller.stop();
});

test('late/background timers skip missed slots and foreground checks re-align after a device clock change', async () => {
  const clock=fakeClock(3000),calls=[];
  let timing;
  const poller=createMaintenancePoller({...clock,fetchStatus:async()=>{calls.push(clock.now());return {enabled:true}},onStatus:()=>{},onTiming:value=>{timing=value}});
  await flush();
  clock.jump(32123);await clock.advance(0);
  assert.deepEqual(calls,[3000,32123]);
  assert.equal(timing.nextCheckAt,40000);
  clock.jump(12000);await poller.check();
  assert.equal(timing.nextCheckAt,20000);
  await clock.advance(8000);
  assert.equal(calls.at(-1),20000);
  poller.stop();
});

test('manual checks and boundary ticks share an in-flight request; stop aborts and suppresses late updates', async () => {
  const clock=fakeClock(9000);
  let calls=0,resolve,signal,updates=0,settled=0;
  const poller=createMaintenancePoller({...clock,
    fetchStatus:requestSignal=>{calls++;signal=requestSignal;return new Promise(done=>{resolve=done})},
    onStatus:()=>updates++,onSettled:()=>settled++,
  });
  const pending=poller.check();
  assert.equal(poller.check(),pending);
  await clock.advance(1000);
  assert.equal(calls,1);
  poller.stop();assert.equal(signal.aborted,true);
  resolve({enabled:true});await pending;
  assert.equal(updates,0);assert.equal(settled,0);
  await poller.check();assert.equal(calls,1);assert.equal(clock.pending,0);
});

test('slow requests abort after four seconds and the next check can succeed', async () => {
  const clock=fakeClock(2000);
  let failure=0,calls=0,latest;
  const poller=createMaintenancePoller({...clock,
    fetchStatus:signal=>{
      if(++calls>1)return Promise.resolve({enabled:false});
      return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('timeout')),{once:true}));
    },
    onStatus:value=>{latest=value},onError:()=>failure++,
  });
  await clock.advance(4000);
  assert.equal(failure,1);
  await poller.check();assert.equal(latest.enabled,false);
  poller.stop();assert.equal(clock.pending,0);
});

test('Beijing formatting is independent of the browser timezone and handles midnight boundaries', () => {
  assert.equal(formatBeijingTime(Date.UTC(2026,9,27,16,0,0)),'00:00:00');
  const endOfDay=Date.UTC(2026,9,27,15,59,59,750);
  assert.equal(formatBeijingTime(nextMaintenanceCheckAt(endOfDay)),'00:00:00');
  const exact=Date.UTC(2026,9,28,4,0,10);
  assert.equal(nextMaintenanceCheckAt(exact),exact+10000);
});
