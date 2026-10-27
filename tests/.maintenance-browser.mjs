import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import catalog from '../src/config/maintenanceTargets.json' with { type: 'json' };

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const output = resolve(process.env.MAINTENANCE_SCREENSHOT_DIR || 'docs/screenshots/maintenance');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'aurora-maintenance-'));
const adminDir = resolve('../../backend/backend-fornt/AuroraPlayeradmin-panel');
const servers = [
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4187', '--strictPort'], { cwd: process.cwd(), windowsHide: true, stdio: 'ignore' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4188', '--strictPort'], { cwd: adminDir, windowsHide: true, stdio: 'ignore' }),
];
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=9431', `--user-data-dir=${profile}`, '--no-first-run',
  '--disable-default-apps', '--disable-background-networking', '--disable-background-timer-throttling', 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
let ws;
const pending = new Map();
let seq = 0;
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout ${method}`)); }, 15000);
    pending.set(id, { resolve: data => { clearTimeout(timer); resolve(data); }, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function waitFor(expression, description) {
  for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await delay(100); }
  throw new Error(`Timed out: ${description}`);
}
const settings = { enabled: true, title: '让好音乐，稍等片刻', message: '正在升级音乐服务，感谢你的耐心等待。\n维护结束后，将自动回到你刚才的页面。', estimatedReturn: '今天 22:00', accentColor: '#a78bfa', backgroundUrl: '', customHtml: '' };
let failStatus = false;
let failSave = false;
let saveDelayMs = 0, activeSaves = 0, maxActiveSaves = 0, saveAttempts = 0;
let statusRequests = [];
const exceptions = [];
const saves = [];
let fixtureSongId = 101;
let holdSongResponse = false;
let releaseSongResponse;
async function intercept({ requestId, request }) {
  const url = new URL(request.url);
  const path = url.pathname;
  const isApi = /\/api\/v1\//.test(path) || path.startsWith('/api/') || /musicadmin\./.test(url.hostname);
  if (!isApi) return send('Fetch.continueRequest', { requestId });
  let body = { code: 200, data: [], result: [] };
  let code = 200;
  if (path.endsWith('/system/maintenance')) {
    statusRequests.push(Date.now());
    code = failStatus ? 503 : 200;
    body = { code, data: settings };
  } else if (path.endsWith('/admin/maintenance')) {
    if (request.method === 'PUT') {
      const payload = JSON.parse(request.postData), failure = failSave;
      saveAttempts++; activeSaves++; maxActiveSaves = Math.max(maxActiveSaves, activeSaves);
      await delay(saveDelayMs);
      activeSaves--;
      if (failure) { code = 500; body = {code:500,message:'模拟保存失败'}; }
      else { Object.assign(settings, payload); saves.push(structuredClone(settings)); body = {code:200,data:settings}; }
    } else body = {code:200,data:settings};
  } else if (path.endsWith('/auth/me')) {
    body = { code: 200, data: { id: 1, username: 'admin', nickname: '维护管理员', roles: 'ROLE_ADMIN' } };
  } else if (/\/(?:cloudsearch|search)$/.test(path)) {
    const type = Number(url.searchParams.get('type') || 1);
    const result = {
      1: {songs: [{id: fixtureSongId, name: '维护回归歌曲', ar: [{id: 201, name: '测试艺人'}], al: {id: 301, name: '测试专辑'}, dt: 180000}], songCount: 40},
      100: {artists: [{id: 201, name: '测试艺人'}], artistCount: 1},
      10: {albums: [{id: 301, name: '测试专辑', artists: [{id: 201, name: '测试艺人'}]}], albumCount: 1},
      1000: {playlists: [{id: 401, name: '测试歌单', trackCount: 1}], playlistCount: 1},
    }[type] || {};
    body = {code: 200, result};
  } else if (path.endsWith('/style/list')) {
    body = {code: 200, data: [{tagId: 1, tagName: '回归曲风', enName: 'TEST'}]};
  } else if (path.endsWith('/top/album')) {
    body = {code: 200, albums: [{id: 301, name: '测试专辑'}]};
  } else if (path.endsWith('/toplist/detail')) {
    body = {code: 200, list: [{id: 401, name: '测试榜单'}]};
  } else if (path.endsWith('/artist/list')) {
    body = {code: 200, artists: [{id: 201, name: '测试艺人'}], more: false};
  } else if (path.endsWith('/user/cloud')) {
    body = {code: 200, data: [{songId: 101, songName: '云盘回归歌曲', artist: '测试艺人', fileSize: 1024}], hasMore: false};
  } else if (path.endsWith('/msg/notices')) {
    body = {code: 200, notices: [{id: 1, typeTitle: '回归通知', notice: JSON.stringify({content: '维护前已加载的通知'})}]};
  } else if (path.endsWith('/msg/private') || path.endsWith('/msg/private/history')) {
    body = {code: 200, msgs: [{id: 1, fromUser: {userId: 2, nickname: '测试联系人'}, toUser: {userId: 1}, msg: JSON.stringify({msg: '维护前的消息'})}]};
  } else if (/\/song\/url(?:\/v1)?$/.test(path)) {
    if (holdSongResponse) await new Promise(resolve => { releaseSongResponse = resolve; });
    body = {code:200,data:[{id:Number(url.searchParams.get('id')),url:'http://127.0.0.1:4187/maintenance-test.mp3',level:'exhigh'}]};
  }
  return send('Fetch.fulfillRequest', { requestId, responseCode: code,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
      {name:'Access-Control-Expose-Headers',value:'X-Maintenance-Server-Time'},
      ...(path.endsWith('/system/maintenance') ? [{name:'X-Maintenance-Server-Time',value:String(Date.now())}] : [])],
    body: Buffer.from(JSON.stringify(body)).toString('base64') });
}
async function screenshot(name) {
  if (process.env.MAINTENANCE_SCREENSHOTS === '0') return;
  await delay(650);
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(join(output, name), Buffer.from(data, 'base64'));
}

try {
  let tab;
  for (let i = 0; i < 60; i++) {
    try { tab = (await (await fetch('http://127.0.0.1:9431/json/list')).json()).find(item => item.type === 'page'); if (tab) break; } catch {}
    await delay(100);
  }
  assert.ok(tab, 'Chrome started');
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const item = pending.get(message.id); pending.delete(message.id);
      if (item) message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result);
    } else if (message.method === 'Fetch.requestPaused') {
      intercept(message.params).catch(error => exceptions.push(error.message));
    } else if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails;
      const error = details.exception?.description || details.text;
      exceptions.push(error);
      console.error('Browser exception:', error);
    }
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  if (process.env.MAINTENANCE_ADMIN_ONLY !== '1') {
  await send('Emulation.setTimezoneOverride', {timezoneId:'America/New_York'});
  const skewScript = await send('Page.addScriptToEvaluateOnNewDocument', {source:"if(location.port==='4187'){window.__maintenanceRealNow=Date.now;Date.now=()=>window.__maintenanceRealNow()+125000}"});
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:4187/maintenance-smoke?keep=1' });
  await waitFor("document.querySelector('.maintenance-page') && !document.querySelector('#aurora-boot')", 'initial maintenance screen');
  await waitFor("location.pathname === '/maintenance'", 'global maintenance route');
  assert.equal(await evaluate("new URLSearchParams(location.search).get('from')"), '/maintenance-smoke?keep=1');
  assert.equal(await evaluate("!!document.querySelector('.app-shell')"), false, 'business app does not mount during initial maintenance');
  await waitFor("document.querySelector('.maintenance-timing').textContent.includes('已校准')", 'clock is calibrated from response headers');
  const clockSeconds = await evaluate("document.querySelector('.maintenance-clock').textContent.split(':').map(Number).reduce((hours,value)=>hours*60+value,0)");
  const expectedSeconds = Math.floor((Date.now()+8*3600000)/1000)%86400;
  assert.ok(Math.min((clockSeconds-expectedSeconds+86400)%86400,(expectedSeconds-clockSeconds+86400)%86400)<=2, 'Beijing display ignores the wrong device clock and browser timezone');
  assert.match(await evaluate("document.querySelector('.maintenance-next-time').textContent"), /:[0-5]0$/);
  await screenshot('desktop.png');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await screenshot('mobile.png');
  assert.ok(await evaluate("document.querySelector('.maintenance-page').scrollWidth <= innerWidth"), 'mobile page does not overflow');
  const alignedSlots=()=>[...new Map(statusRequests.slice(1).filter(time=>Math.min(time%10000,10000-time%10000)<250).map(time=>[Math.round(time/10000),time])).values()];
  for(let i=0;i<220 && alignedSlots().length<2;i++) await delay(100);
  const ticks=alignedSlots();
  assert.ok(ticks.length>=2, 'real timer requests align to shared ten-second boundaries');
  const interval = ticks.at(-1) - ticks.at(-2);
  assert.ok(interval >= 9500 && interval <= 11000, `actual poll interval: ${interval}ms`);
  await send('Page.removeScriptToEvaluateOnNewDocument', {identifier:skewScript.identifier});
  await send('Emulation.setTimezoneOverride', {timezoneId:'Asia/Shanghai'});
  const originalCopy={title:settings.title,message:settings.message};
  settings.title='维护页面也应该清楚展示完整的自定义文案。'.repeat(8).slice(0,120);
  settings.message='我们正在维护和优化音乐服务，恢复后会自动返回。\n'.repeat(70).slice(0,2000);
  await send('Emulation.setDeviceMetricsOverride', {width:320,height:680,deviceScaleFactor:1,mobile:true});
  await evaluate("document.querySelector('.maintenance-status button').click()");
  await waitFor("document.querySelector('.maintenance-message').textContent.length>1000", 'long custom copy');
  await evaluate("const page=document.querySelector('.maintenance-page');page.scrollTop=page.scrollHeight");
  assert.ok(await evaluate("document.querySelector('.maintenance-page').scrollWidth<=innerWidth"),'long copy stays within a narrow screen');
  assert.ok(await evaluate("(()=>{const rect=document.querySelector('.maintenance-check').getBoundingClientRect();return rect.top>=0&&rect.bottom<=innerHeight})()"),'long copy does not overlap or hide the check control');
  await screenshot('long-content-mobile.png');
  Object.assign(settings,originalCopy);
  await evaluate("document.querySelector('.maintenance-status button').click()");
  await waitFor("document.querySelector('.maintenance-message').textContent.length<200",'restore short copy');
  await evaluate("document.querySelector('.maintenance-page').scrollTop=0");
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
  failStatus = true;
  await evaluate("document.querySelector('.maintenance-status button').click()");
  await waitFor("document.querySelector('.maintenance-status').textContent.includes('暂时无法连接')", 'network failure retains maintenance');
  assert.equal(await evaluate("!!document.querySelector('.maintenance-page')"), true);
  failStatus = false;
  settings.enabled = false;
  await evaluate("document.querySelector('.maintenance-status button').click()");
  await waitFor("document.querySelector('.app-shell') && !document.querySelector('.maintenance-page')", 'automatic recovery');
  assert.equal(await evaluate('location.pathname + location.search'), '/maintenance-smoke?keep=1');
  await evaluate("document.querySelector('.app-shell').dataset.retained = 'yes'");
  settings.enabled = true;
  await evaluate("window.dispatchEvent(new Event('online'))");
  await waitFor("!!document.querySelector('.maintenance-page')", 'enter maintenance from running app');
  assert.equal(await evaluate("document.querySelector('.app-shell').dataset.retained"), 'yes');
  settings.customHtml = '<style>body{background:#15352a;color:white;font:24px system-ui;padding:40px}</style><h1>自定义维护页面</h1><script>parent.document.body.dataset.escaped="bad"</script>';
  await evaluate("document.querySelector('.maintenance-status button').click()");
  await waitFor("!!document.querySelector('.maintenance-custom')", 'custom HTML');
  assert.equal(await evaluate("document.querySelector('.maintenance-custom').getAttribute('sandbox')"), '');
  await delay(300);
  assert.equal(await evaluate('document.body.dataset.escaped'), undefined);
  await screenshot('custom.png');
  settings.enabled = false;
  await evaluate("document.querySelector('.maintenance-status button').click()");
  await waitFor("!document.querySelector('.maintenance-page')", 'second recovery');
  assert.equal(await evaluate("document.querySelector('.app-shell').dataset.retained"), 'yes', 'existing page instance survives maintenance');

  // Every business page, including deep links and aliases, must be gated before its content mounts.
  const routePaths = { home: '/home', discover: '/discover?tab=charts', styleDetailPage: '/discover/style/1',
    search: '/search?q=keep-me', playlist: '/playlist/1', album: '/album/1', artist: '/artist/1',
    artistByName: '/artist?name=keep-me', profile: '/home/profile', messages: '/messages', moments: '/moments', releaseNotes: '/release-notes' };
  const targetSettings = key => ({ available: false, useGlobalPage: false, title: `${key}维护中`, message: '独立维护',
    estimatedReturn: '', accentColor: '#a78bfa', backgroundUrl: '', customHtml: `<h1>${key}独立维护</h1>` });
  settings.enabled = false;
  settings.customHtml = '';
  for (const target of catalog.filter(target => target.routeNames)) {
    for (const name of target.routeNames) {
      settings.targets = { [target.key]: targetSettings(target.key) };
      await send('Page.navigate', { url: `http://127.0.0.1:4187${routePaths[name]}` });
      await waitFor(`document.querySelector('.maintenance-custom')?.srcdoc.includes(${JSON.stringify(target.key)})`, `direct page gate: ${name}`);
      assert.equal(await evaluate("!!document.querySelector('.app-shell')"), false, `closed page never mounts: ${name}`);
      await waitFor(`location.pathname === '/maintenance' && new URLSearchParams(location.search).get('from') === ${JSON.stringify(routePaths[name])}`, `maintenance URL: ${name}`);
    }
  }
  settings.targets = { 'page.search': targetSettings('page.search') };
  await send('Page.navigate', { url: 'http://127.0.0.1:4187/search?q=keep-me' });
  await waitFor("!!document.querySelector('.maintenance-custom')", 'custom search maintenance');
  await waitFor("location.pathname === '/maintenance'", 'search page redirects to maintenance route');
  await screenshot('scoped-page.png');
  settings.targets['page.search'].available = true;
  await evaluate("document.querySelector('.maintenance-status button').click()");
  await waitFor("document.querySelector('.search-page') && !document.querySelector('.maintenance-page')", 'page automatically recovers to exact deep link');
  assert.equal(await evaluate('location.pathname + location.search'), '/search?q=keep-me');

  settings.targets = { 'feature.recognition': targetSettings('feature.recognition') };
  await evaluate("window.dispatchEvent(new Event('online'))");
  await delay(200);
  await evaluate("document.querySelector('.recognition-launch').focus(); document.querySelector('.recognition-launch').click()");
  await waitFor("document.querySelector('.maintenance-dialog-title')?.textContent.includes('feature.recognition')", 'blocked recognition action shows a plain alert');
  assert.equal(await evaluate("!!document.querySelector('.maintenance-dialog[role=alertdialog]')"), true);
  assert.equal(await evaluate('location.pathname + location.search'), '/search?q=keep-me', 'feature dialog keeps the URL unchanged');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.search-page')).visibility"), 'visible', 'feature dialog preserves the visible page');
  assert.equal(await evaluate("!!document.querySelector('.recognition-dialog')"), false, 'disabled recognition does not request microphone access');
  assert.equal(await evaluate("!!document.querySelector('.maintenance-dialog iframe, .maintenance-dialog .maintenance-page, .maintenance-dialog .maintenance-record')"), false, 'function alerts contain no maintenance page or HTML');
  assert.ok(await evaluate("document.querySelector('.maintenance-dialog').getBoundingClientRect().height < 340"), 'feature alert stays compact');
  await screenshot('scoped-feature.png');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await waitFor("!document.querySelector('.maintenance-dialog')", 'return from individual feature maintenance');
  await waitFor("document.activeElement === document.querySelector('.recognition-launch')", 'focus returns to the feature button');
  await evaluate("document.querySelector('.recognition-launch').click()");
  await waitFor("!!document.querySelector('.maintenance-dialog')", 'disabled feature can show the dialog again');
  await evaluate("document.querySelector('.maintenance-dialog-backdrop').click()");
  await waitFor("!document.querySelector('.maintenance-dialog')", 'clicking the backdrop closes the feature dialog');
  settings.targets['feature.recognition'].title = '听歌识曲维护中';
  settings.targets['feature.recognition'].customHtml = '';
  await evaluate("window.dispatchEvent(new Event('online'))");
  await delay(200);
  await evaluate("document.querySelector('.recognition-launch').click()");
  await waitFor("document.querySelector('.maintenance-dialog-title')?.textContent.includes('听歌识曲维护中')", 'default maintenance dialog');
  await screenshot('feature-dialog-default.png');
  assert.ok(await evaluate("document.querySelector('.maintenance-dialog').getBoundingClientRect().height <= innerHeight"), 'dialog fits mobile viewport');
  await evaluate("document.querySelector('.maintenance-dialog-close').click()");
  await waitFor("!document.querySelector('.maintenance-dialog')", 'close button dismisses dialog');

  // Close an already-open native dialog before presenting maintenance; it cannot cover the overlay.
  settings.targets = {};
  await send('Page.navigate', { url: 'http://127.0.0.1:4187/home' });
  await waitFor("!!document.querySelector('.aurora-settings')", 'home header');
  await evaluate("document.querySelector('.aurora-settings').click()");
  await waitFor("!!document.querySelector('dialog[open]')", 'settings dialog opens');
  settings.targets = { 'feature.settings': targetSettings('feature.settings') };
  await evaluate("window.dispatchEvent(new Event('online'))");
  await waitFor("!!document.querySelector('.maintenance-dialog') && !document.querySelector('dialog[open]')", 'live switch closes native dialog');
  assert.equal(await evaluate('location.pathname'), '/home');
  settings.targets['feature.settings'].available = true;
  await evaluate("document.querySelector('.maintenance-dialog-check').click()");
  await waitFor("!document.querySelector('.maintenance-dialog')", 'feature automatically reopens');
  assert.notEqual(await evaluate('document.body.style.overflow'), 'hidden', 'nested native dialog does not leave the page scroll locked');

  // Kept-alive pages release active feature registrations when navigating away.
  settings.targets = { 'feature.styles': targetSettings('feature.styles') };
  await send('Page.navigate', { url: 'http://127.0.0.1:4187/discover?tab=styles' });
  await waitFor("document.querySelector('.maintenance-dialog-title')?.textContent.includes('feature.styles')", 'deep-linked discover tab maintenance');
  settings.targets['feature.styles'].available = true;
  await evaluate("document.querySelector('.maintenance-dialog-check').click()");
  await waitFor("!document.querySelector('.maintenance-dialog')", 'discover tab recovery');
  assert.equal(await evaluate('location.search'), '?tab=styles');
  settings.targets['feature.styles'].available = false;
  await evaluate("window.dispatchEvent(new Event('online'))");
  await waitFor("!!document.querySelector('.maintenance-dialog')", 'close active tab live');
  await evaluate("document.querySelector('.maintenance-dialog-close').click()");
  await waitFor("!document.querySelector('.maintenance-dialog')", 'dismiss maintenance for active tab');
  assert.equal(await evaluate('location.pathname + location.search'), '/discover?tab=styles');
  await evaluate("window.dispatchEvent(new Event('online'))");
  await delay(300);
  assert.equal(await evaluate("!!document.querySelector('.maintenance-dialog')"), false, 'polling does not reopen a dismissed dialog');
  await evaluate("document.querySelector('.aurora-brand').click()");
  await waitFor("location.pathname === '/home' && !document.querySelector('.maintenance-page')", 'navigate away from closed tab');
  await evaluate("window.dispatchEvent(new Event('online'))");
  await delay(200);
  assert.equal(await evaluate("!!document.querySelector('.maintenance-page')"), false, 'cached tab never blocks another page');

  // Start with populated caches: dismissal must never expose usable results.
  for (const target of catalog.filter(target => target.searchTab)) {
    settings.targets = {};
    await send('Page.navigate', {url: `http://127.0.0.1:4187/search?q=maintenance&tab=${target.searchTab}`});
    await waitFor("!!document.querySelector('.results-body button')", `populated search: ${target.key}`);
    settings.targets = {[target.key]: targetSettings(target.key)};
    await evaluate("window.dispatchEvent(new Event('online'))");
    await waitFor("!!document.querySelector('.maintenance-dialog')", `live disable: ${target.key}`);
    await evaluate("document.querySelector('.maintenance-dialog-confirm').click()");
    await waitFor(`!!document.querySelector('[data-unavailable-target="${target.key}"]') && !document.querySelector('.maintenance-dialog')`, `dismissed but blocked: ${target.key}`);
    assert.equal(await evaluate("!!document.querySelector('.results-body, .results .pagination')"), false, `${target.key}: cached actions removed`);
    await evaluate("document.querySelector('.maintenance-feature-unavailable button').click()");
    await waitFor("!!document.querySelector('.maintenance-dialog')", 'retry still blocks');
    settings.targets[target.key].available = true;
    await evaluate("document.querySelector('.maintenance-dialog-check').click()");
    await waitFor("!document.querySelector('.maintenance-dialog') && !!document.querySelector('.results-body button')", `${target.key}: recovery reloads results`);
  }
  for (const target of catalog.filter(target => target.discoverTab)) {
    settings.targets = {};
    await send('Page.navigate', {url: `http://127.0.0.1:4187/discover?tab=${target.discoverTab}`});
    await waitFor("!!document.querySelector('.browse-tab-stage .browse-section button')", `populated discover: ${target.key}`);
    settings.targets = {[target.key]: targetSettings(target.key)};
    await evaluate("window.dispatchEvent(new Event('online'))");
    await waitFor("!!document.querySelector('.maintenance-dialog')", `disable cached discover: ${target.key}`);
    await evaluate("document.querySelector('.maintenance-dialog-close').click()");
    await waitFor(`!!document.querySelector('[data-unavailable-target="${target.key}"]') && !document.querySelector('.maintenance-dialog')`, `discover stays blocked: ${target.key}`);
    assert.equal(await evaluate("!!document.querySelector('.browse-tab-stage .browse-section')"), false, `${target.key}: cached browsing removed`);
    // Header navigation remains usable while the current feature is disabled.
    await evaluate("document.querySelector('.aurora-brand').click()");
    await waitFor("location.pathname === '/home' && !document.querySelector('.maintenance-dialog')", 'leave disabled region');
  }

  // Closing either the originating feature or page cancels a pending playback
  // intent, even when that scope recovers before the slow audio URL arrives.
  for (const key of ['feature.searchSongs', 'page.search']) {
    settings.targets = {};
    fixtureSongId++;
    holdSongResponse = true;
    releaseSongResponse = undefined;
    await send('Page.navigate', {url:'http://127.0.0.1:4187/search?q=delayed&tab=songs'});
    await waitFor("!!document.querySelector('.results .song-row')", 'delayed playback fixture');
    await evaluate("document.querySelector('.results .song-row').click()");
    for (let i=0; i<60 && !releaseSongResponse; i++) await delay(50);
    assert.equal(typeof releaseSongResponse, 'function', 'audio URL remains in flight');
    settings.targets = {[key]:targetSettings(key)};
    await evaluate("window.dispatchEvent(new Event('online'))");
    await waitFor(key.startsWith('page.') ? "!!document.querySelector('.maintenance-page')" : "!!document.querySelector('.maintenance-dialog')", `interrupt playback from ${key}`);
    settings.targets = {};
    await evaluate("window.dispatchEvent(new Event('online'))");
    await waitFor("!document.querySelector('.maintenance-page, .maintenance-dialog') && !!document.querySelector('.results')", 'scope recovers before audio URL');
    holdSongResponse = false;
    releaseSongResponse();
    await delay(300);
    assert.equal(await evaluate("Boolean(JSON.parse(localStorage.getItem('global-player-store') || '{}').currentSong?.id)"), false, 'late audio never starts after interrupted action');
  }

  // Previously mounted routes, history and internal links use the same page gate.
  settings.targets = {};
  await send('Page.navigate', {url: 'http://127.0.0.1:4187/discover?tab=releases'});
  await waitFor("!!document.querySelector('.release-spotlight button')", 'album navigation fixture');
  settings.targets = {'page.album': targetSettings('page.album')};
  await evaluate("window.dispatchEvent(new Event('online'))");
  await delay(150);
  await evaluate("document.querySelector('.release-spotlight button').click()");
  await waitFor("location.pathname === '/maintenance' && !!document.querySelector('.maintenance-page')", 'in-app closed detail is gated');
  assert.equal(await evaluate("new URLSearchParams(location.search).get('from')"), '/album/301');
  assert.equal(await evaluate("!!document.querySelector('.detail-overlay')"), false, 'closed detail is not mounted');
  // Replacing the URL with the original route cannot bypass its switch.
  await evaluate("history.pushState({}, '', '/album/301'); window.dispatchEvent(new PopStateEvent('popstate'))");
  await waitFor("location.pathname === '/maintenance' && !!document.querySelector('.maintenance-page')", 'history re-entry remains gated');

  // A business surface teleported outside #app must also stay inert.
  await evaluate("(() => { const layer=document.createElement('div'); layer.id='business-teleport-test'; const button=document.createElement('button');button.textContent='业务操作';button.onclick=()=>window.__escapedMaintenance=true;layer.append(button);document.body.append(layer); })()");
  await waitFor("document.querySelector('#business-teleport-test').inert", 'new business teleport is isolated');
  await evaluate("document.querySelector('#business-teleport-test button').click()");
  assert.equal(await evaluate("window.__escapedMaintenance"), undefined, 'programmatic clicks cannot reach isolated business handlers');
  settings.targets = {};
  await evaluate("document.querySelector('.maintenance-status button').click()");
  await waitFor("!document.querySelector('.maintenance-page') && !document.querySelector('#business-teleport-test').inert", 'teleport isolation restores after recovery');
  await evaluate("document.querySelector('#business-teleport-test').remove()");

  // Simulated login is local to this browser profile, and every API is mocked.
  await send('Page.addScriptToEvaluateOnNewDocument', {source: `if(location.port==='4187') {
    localStorage.setItem('usermasgcookie','MUSIC_U=maintenance-test');
    localStorage.setItem('usermasg',JSON.stringify({data:{profile:{userId:1,nickname:'回归账号'}}}));
  }`});
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate', {url: 'http://127.0.0.1:4187/home/profile'});
  await waitFor("!!document.querySelector('#profile-tab-cloud')", 'profile fixture');
  await evaluate("document.querySelector('#profile-tab-cloud').click()");
  await waitFor("!!document.querySelector('.profile-cloud-actions .is-danger')", 'populated cloud cache');
  await evaluate("document.querySelector('.profile-cloud-actions .is-danger').click()");
  await waitFor("!!document.querySelector('.profile-cloud-delete-layer')", 'cloud confirmation outside app content');
  settings.targets = {'feature.cloud': targetSettings('feature.cloud')};
  await evaluate("window.dispatchEvent(new Event('online'))");
  await waitFor("!!document.querySelector('.maintenance-dialog') && !document.querySelector('.profile-cloud-delete-layer')", 'disable closes pending cloud confirmation');
  await evaluate("document.querySelector('.maintenance-dialog-confirm').click()");
  await waitFor("!document.querySelector('.maintenance-dialog') && !!document.querySelector('[data-unavailable-target=\"feature.cloud\"]')", 'cloud remains unavailable');
  assert.equal(await evaluate("!!document.querySelector('.profile-cloud-row, #profile-panel-cloud input')"), false, 'no cached play/upload/delete controls');
  await evaluate("document.querySelector('#profile-tab-playlist').click()");
  await waitFor("!!document.querySelector('#profile-panel-playlist')", 'available library still opens');
  settings.targets = {};
  await send('Page.navigate', {url:'http://127.0.0.1:4187/messages'});
  await waitFor("!!document.querySelector('.notice-workspace')", 'logged-in messages');
  for (const [key, tab, region] of [['feature.notifications', '通知', '.notice-workspace'], ['feature.privateMessages', '私信', '.private-workspace']]) {
    await evaluate(`[...document.querySelectorAll('.messages-tabs button')].find(button=>button.textContent.includes(${JSON.stringify(tab)})).click()`);
    await waitFor(`!!document.querySelector(${JSON.stringify(region)})`, `message scope: ${key}`);
    settings.targets = {[key]:targetSettings(key)};
    await evaluate("window.dispatchEvent(new Event('online'))");
    await waitFor("!!document.querySelector('.maintenance-dialog')", `close active ${key}`);
    await evaluate("document.querySelector('.maintenance-dialog-close').click()");
    await waitFor(`!document.querySelector('.maintenance-dialog') && !!document.querySelector('[data-unavailable-target="${key}"]')`, `message closure persists: ${key}`);
    assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(region)})`), false, 'cached message controls stay removed');
    settings.targets = {};
    await evaluate("window.dispatchEvent(new Event('online'))");
    await waitFor(`!!document.querySelector(${JSON.stringify(region)})`, 'message recovery');
  }

  // Authenticate only the isolated mock browser session; no production services are used.
  }
  const auth = JSON.stringify({ token: 'test-token', expiresAt: Date.now() + 86400000 });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `if(location.port==='4188')localStorage.setItem('auth',${JSON.stringify(auth)});` });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  settings.customHtml = '';
  settings.enabled = false;
  settings.targets = {};
  settings.targets['feature.login'] = { available: true, useGlobalPage: true, title: null, message: null,
    estimatedReturn: null, accentColor: null, backgroundUrl: null, customHtml: null };
  await send('Page.navigate', { url: 'http://127.0.0.1:4188/maintenance' });
  await waitFor("!!document.querySelector('.control-columns')", 'admin workspace');
  await screenshot('admin-columns.png');
  assert.equal(await evaluate("document.querySelectorAll('.target-row').length"), 11, 'pages form their own partition');
  assert.ok(await evaluate("getComputedStyle(document.querySelector('.control-columns')).gridTemplateColumns.split(' ').length === 3"), 'desktop has three columns');
  assert.equal(await evaluate("!!document.querySelector('.editor-panel iframe')"), false);
  assert.equal(await evaluate("!!document.querySelector('[data-action=save], .draft-badge')"), false, 'there is no extra save confirmation');
  assert.equal(saves.length, 0, 'loading configuration never writes it back');
  await evaluate("document.querySelector('[data-target=\"page.search\"] input').click(); document.querySelector('[data-target=\"page.search\"] .target-select').click()");
  await waitFor("document.querySelector('.editor-heading h2').textContent === '搜索页面'", 'selected page editor');
  await waitFor("document.querySelector('[data-autosave-status]').textContent.includes('所有更改已保存')", 'switch saves immediately');
  assert.equal(saves.at(-1).targets['page.search'].available, false);
  await evaluate("document.querySelector('[data-field=inherit]').click()");
  await waitFor("document.querySelector('[data-autosave-status]').textContent.includes('所有更改已保存')", 'inheritance change saves');
  const savesBeforeTyping = saves.length;
  await evaluate("(() => { const title=document.querySelector('.editor-fields input[maxlength=\"120\"]');for(const text of ['搜索','搜索专用','搜索专用维护页']){title.value=text;title.dispatchEvent(new Event('input',{bubbles:true}))} })()");
  await delay(150);
  assert.equal(saves.length, savesBeforeTyping, 'typing is debounced');
  await evaluate("document.querySelector('[data-editor-tab=preview]').click()");
  await waitFor("document.querySelector('.page-preview h3').textContent.includes('搜索专用维护页')", 'page preview');
  await screenshot('admin-scoped.png');
  await evaluate("document.querySelector('[data-group=\"播放器\"]').click()");
  await waitFor("document.querySelectorAll('.target-row').length === 7", 'player partition');
  await waitFor("document.querySelector('[data-autosave-status]').textContent.includes('所有更改已保存')", 'text saves across partitions');
  assert.equal(saves.length, savesBeforeTyping + 1, 'typing coalesces into one request');
  assert.equal(saves.at(-1).targets['page.search'].title, '搜索专用维护页');
  await evaluate("document.querySelector('[data-target=\"feature.settings\"] .target-select').click()");
  await waitFor("!!document.querySelector('.editor-info')", 'feature text editor');
  assert.equal(await evaluate("!!document.querySelector('[data-editor-tab=appearance]')"), false, 'features have no page appearance editor');
  assert.equal(await evaluate("document.querySelector('.editor-fields input[maxlength=\"120\"]').value"), '外观与播放设置暂时不可用', 'default reminder fields match effective content');
  await evaluate("document.querySelector('[data-field=inherit]').click()");
  await waitFor("document.querySelector('[data-autosave-status]').textContent.includes('所有更改已保存')", 'default reminder setting saves');
  await evaluate("(() => { const title=document.querySelector('.editor-fields input[maxlength=\"120\"]');title.value='设置暂时无法使用';title.dispatchEvent(new Event('input',{bubbles:true})) })()");
  await evaluate("document.querySelector('[data-editor-tab=preview]').click()");
  await waitFor("document.querySelector('.alert-preview h3').textContent === '设置暂时无法使用'", 'compact alert preview');
  assert.equal(await evaluate("!!document.querySelector('.editor-panel iframe')"), false);
  await screenshot('admin-feature-preview.png');
  await waitFor("document.querySelector('[data-autosave-status]').textContent.includes('所有更改已保存')", 'reminder text automatically saves');
  assert.equal(saves.at(-1).targets['page.search'].available, false);
  assert.equal(saves.at(-1).targets['page.search'].title, '搜索专用维护页');
  assert.equal(saves.at(-1).targets['feature.settings'].title, '设置暂时无法使用');
  assert.equal(typeof saves.at(-1).targets['feature.login'].title, 'string');
  assert.equal(Object.keys(saves.at(-1).targets).length, catalog.length);

  await evaluate("document.querySelector('[data-editor-tab=content]').click()");
  saveDelayMs = 450;
  await evaluate("(() => { const title=document.querySelector('.editor-fields input[maxlength=\"120\"]');title.value='第一版';title.dispatchEvent(new Event('input',{bubbles:true}));title.dispatchEvent(new Event('change',{bubbles:true})) })()");
  await waitFor("document.querySelector('[data-autosave-status]').textContent.includes('正在自动保存')", 'slow save is visible');
  assert.equal(await evaluate("document.querySelector('.editor-fields input[maxlength=\"120\"]').disabled || document.querySelector('[data-target=\"feature.queue\"] input').disabled"), false, 'editing remains enabled during save');
  await evaluate("(() => { const title=document.querySelector('.editor-fields input[maxlength=\"120\"]');title.value='连续编辑的最终版本';title.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-target=\"feature.queue\"] input').click() })()");
  await waitFor("document.querySelector('[data-autosave-status]').textContent.includes('所有更改已保存')", 'queued changes save in order');
  assert.equal(saves.at(-1).targets['feature.settings'].title, '连续编辑的最终版本');
  assert.equal(saves.at(-1).targets['feature.queue'].available, false);
  assert.equal(await evaluate("document.querySelector('.editor-fields input[maxlength=\"120\"]').value"), '连续编辑的最终版本', 'slow response never overwrites newer input');
  assert.equal(maxActiveSaves, 1, 'only one settings write runs at a time');
  saveDelayMs = 0;

  await evaluate("(() => { const title=document.querySelector('.editor-fields input[maxlength=\"120\"]');title.value='';title.dispatchEvent(new Event('input',{bubbles:true}));title.dispatchEvent(new Event('change',{bubbles:true})) })()");
  await waitFor("!!document.querySelector('.validation-notice')", 'incomplete text is marked inline');
  await evaluate("document.querySelector('[data-target=\"feature.settings\"] input').click()");
  await waitFor("!document.querySelector('[data-target=\"feature.settings\"] .target-sync-state') || document.querySelector('[data-autosave-status]').textContent.includes('部分内容待补全')", 'valid switch is independent of invalid text');
  await delay(100);
  assert.equal(saves.at(-1).targets['feature.settings'].available, false);
  assert.equal(saves.at(-1).targets['feature.settings'].title, '连续编辑的最终版本', 'invalid title retains server value');
  assert.equal(await evaluate("document.querySelector('.editor-fields input[maxlength=\"120\"]').value"), '', 'invalid input is retained for correction');
  await evaluate("(() => { const title=document.querySelector('.editor-fields input[maxlength=\"120\"]');title.value='修正后的提醒';title.dispatchEvent(new Event('input',{bubbles:true})) })()");
  await waitFor("document.querySelector('[data-autosave-status]').textContent.includes('所有更改已保存')", 'corrected text saves automatically');

  // Batch operations publish once and affect only this partition.
  const savedBeforeBatch=structuredClone(saves.at(-1));
  const requestsBeforeBatch=saveAttempts;
  await evaluate("[...document.querySelectorAll('.target-batch button')].find(button=>button.textContent==='全部关闭').click()");
  await waitFor("document.querySelector('[data-autosave-status]').textContent.includes('所有更改已保存')", 'batch changes automatically save');
  assert.equal(saveAttempts,requestsBeforeBatch+1,'a batch uses one request');
  for(const target of catalog.filter(target=>target.group==='播放器')) assert.equal(saves.at(-1).targets[target.key].available,false);
  await evaluate("document.querySelector('[data-group=\"页面\"]').click()");
  assert.equal(await evaluate("document.querySelector('[data-target=\"page.home\"] input').checked"), savedBeforeBatch.targets['page.home'].available, 'player batch leaves pages unchanged');
  await evaluate("document.querySelector('.target-search input').value='不存在的项目';document.querySelector('.target-search input').dispatchEvent(new Event('input',{bubbles:true}))");
  await waitFor("!!document.querySelector('.empty-targets') && !!document.querySelector('.empty-editor')", 'empty search clears stale selection');
  await evaluate("document.querySelector('.empty-targets button').click()");
  await waitFor("document.querySelectorAll('.target-row').length === 11", 'clear filters');

  // Failure is explicit and does not trigger an automatic retry loop.
  failSave=true;
  await evaluate("document.querySelector('[data-target=\"page.home\"] input').click()");
  await waitFor("!!document.querySelector('.save-error-banner')", 'failed automatic save is visible');
  await screenshot('admin-save-error.png');
  assert.equal(await evaluate("document.querySelector('[data-target=\"page.home\"] input').checked"),false,'failed edit is retained');
  const failedAttempts=saveAttempts;
  await delay(800);
  assert.equal(saveAttempts,failedAttempts,'no endless failure retries');
  failSave=false;
  await evaluate("document.querySelector('[data-action=retry]').click()");
  await waitFor("document.querySelector('[data-autosave-status]').textContent.includes('所有更改已保存') && !document.querySelector('.save-error-banner')", 'retry automatic save');
  await evaluate("document.querySelector('[data-group=global]').click()");
  await waitFor("!!document.querySelector('[data-switch=global]')", 'separate global control');
  await evaluate("document.querySelector('[data-switch=global]').click()");
  await waitFor("!!document.querySelector('.global-notice') && document.querySelector('[data-autosave-status]').textContent.includes('所有更改已保存')", 'global switch takes effect directly');
  assert.equal(saves.at(-1).enabled, true);
  await screenshot('admin-global.png');
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
  await delay(4500);
  await screenshot('admin-mobile.png');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mobile workspace has no horizontal overflow');
  assert.deepEqual(exceptions, []);
  const frontendChecks = process.env.MAINTENANCE_ADMIN_ONLY === '1' ? [] : ['10s polling', 'all page redirects with original URLs', 'compact plain-text feature alerts', 'Escape, backdrop dismissal and focus restoration', 'dismissed alerts stay closed across polls', 'native dialog live closure', 'keep-alive isolation', 'cached search and discover scopes stay blocked', 'cloud confirmation and cached actions close', 'notifications and private messages stay blocked', 'internal links and history stay gated', 'teleported surfaces remain isolated', 'interrupted audio requests never resume automatically'];
  console.log(JSON.stringify({passed:true, checks:[...frontendChecks, 'mobile layout', 'three-column partitioned admin workspace', 'separate page and reminder editors', 'switches save without confirmation', 'debounced typing survives partition changes', 'slow responses preserve newer edits', 'settings requests run serially', 'incomplete fields do not block valid switches', 'partition batches use one request', 'failed saves retain edits and support retry', 'global switch saves directly', 'custom preview and persistence'],screenshots:output},null,2));
} finally {
  if (ws?.readyState === WebSocket.OPEN) {
    void send('Browser.close').catch(() => {});
    await delay(200); ws.close();
  }
  chrome.kill(); servers.forEach(server => server.kill());
}
