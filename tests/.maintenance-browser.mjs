import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import catalog from '../src/config/maintenanceTargets.json' with { type: 'json' };

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const output = resolve('docs/screenshots/maintenance');
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
let statusRequests = [];
const exceptions = [];
const saves = [];
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
    if (request.method === 'PUT' && failSave) { code = 500; body = {code:500,message:'模拟保存失败'}; }
    else { if (request.method === 'PUT') { Object.assign(settings, JSON.parse(request.postData)); saves.push({ ...settings }); } body = {code:200,data:settings}; }
  } else if (path.endsWith('/auth/me')) {
    body = { code: 200, data: { id: 1, username: 'admin', nickname: '维护管理员', roles: 'ROLE_ADMIN' } };
  }
  return send('Fetch.fulfillRequest', { requestId, responseCode: code,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }],
    body: Buffer.from(JSON.stringify(body)).toString('base64') });
}
async function screenshot(name) {
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:4187/maintenance-smoke?keep=1' });
  await waitFor("document.querySelector('.maintenance-page') && !document.querySelector('#aurora-boot')", 'initial maintenance screen');
  await waitFor("location.pathname === '/maintenance'", 'global maintenance route');
  assert.equal(await evaluate("new URLSearchParams(location.search).get('from')"), '/maintenance-smoke?keep=1');
  assert.equal(await evaluate("!!document.querySelector('.app-shell')"), false, 'business app does not mount during initial maintenance');
  await screenshot('desktop.png');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await screenshot('mobile.png');
  assert.ok(await evaluate("document.querySelector('.maintenance-page').scrollWidth <= innerWidth"), 'mobile page does not overflow');
  const requestsBefore = statusRequests.length;
  await delay(10500);
  assert.ok(statusRequests.length > requestsBefore, 'timer checks without user interaction');
  const interval = statusRequests.at(-1) - statusRequests.at(-2);
  assert.ok(interval >= 9500 && interval <= 11000, `actual poll interval: ${interval}ms`);
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

  // Authenticate only the isolated mock browser session; no production services are used.
  const auth = JSON.stringify({ token: 'test-token', expiresAt: Date.now() + 86400000 });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `if(location.port==='4188')localStorage.setItem('auth',${JSON.stringify(auth)});` });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  settings.customHtml = '';
  settings.targets['feature.login'] = { available: true, useGlobalPage: true, title: null, message: null,
    estimatedReturn: null, accentColor: null, backgroundUrl: null, customHtml: null };
  await send('Page.navigate', { url: 'http://127.0.0.1:4188/maintenance' });
  await waitFor("!!document.querySelector('.control-columns')", 'admin workspace');
  await screenshot('admin-columns.png');
  assert.equal(await evaluate("document.querySelectorAll('.target-row').length"), 11, 'pages form their own partition');
  assert.ok(await evaluate("getComputedStyle(document.querySelector('.control-columns')).gridTemplateColumns.split(' ').length === 3"), 'desktop has three columns');
  assert.equal(await evaluate("!!document.querySelector('.editor-panel iframe')"), false);
  await evaluate("document.querySelector('[data-target=\"page.search\"] input').click(); document.querySelector('[data-target=\"page.search\"] .target-select').click()");
  await waitFor("document.querySelector('.editor-heading h2').textContent === '搜索页面'", 'selected page editor');
  assert.equal(saves.length, 0, 'draft changes do not publish automatically');
  await evaluate("document.querySelector('[data-field=inherit]').click()");
  await evaluate("(() => { const title=document.querySelector('.editor-fields input[maxlength=\"120\"]');title.value='搜索专用维护页';title.dispatchEvent(new Event('input',{bubbles:true})) })()");
  await evaluate("document.querySelector('[data-editor-tab=preview]').click()");
  await waitFor("document.querySelector('.page-preview h3').textContent.includes('搜索专用维护页')", 'page preview');
  await screenshot('admin-scoped.png');
  await evaluate("document.querySelector('[data-group=\"播放器\"]').click()");
  await waitFor("document.querySelectorAll('.target-row').length === 7", 'player partition');
  await evaluate("document.querySelector('[data-target=\"feature.settings\"] .target-select').click()");
  await waitFor("!!document.querySelector('.editor-info')", 'feature text editor');
  assert.equal(await evaluate("!!document.querySelector('[data-editor-tab=appearance]')"), false, 'features have no page appearance editor');
  assert.equal(await evaluate("document.querySelector('.editor-fields input[maxlength=\"120\"]').value"), '外观与播放设置暂时不可用', 'default reminder fields match effective content');
  await evaluate("document.querySelector('[data-field=inherit]').click()");
  await evaluate("(() => { const title=document.querySelector('.editor-fields input[maxlength=\"120\"]');title.value='设置暂时无法使用';title.dispatchEvent(new Event('input',{bubbles:true})) })()");
  await evaluate("document.querySelector('[data-editor-tab=preview]').click()");
  await waitFor("document.querySelector('.alert-preview h3').textContent === '设置暂时无法使用'", 'compact alert preview');
  assert.equal(await evaluate("!!document.querySelector('.editor-panel iframe')"), false);
  await screenshot('admin-feature-preview.png');
  await evaluate("document.querySelector('[data-action=save]').click()");
  await waitFor("!document.querySelector('.draft-badge')", 'save all drafts');
  assert.equal(saves.at(-1).targets['page.search'].available, false);
  assert.equal(saves.at(-1).targets['page.search'].title, '搜索专用维护页');
  assert.equal(saves.at(-1).targets['feature.settings'].title, '设置暂时无法使用');
  assert.equal(typeof saves.at(-1).targets['feature.login'].title, 'string');
  assert.equal(Object.keys(saves.at(-1).targets).length, catalog.length);

  await evaluate("document.querySelector('[data-editor-tab=content]').click()");
  await evaluate("(() => { const title=document.querySelector('.editor-fields input[maxlength=\"120\"]');title.value='临时修改';title.dispatchEvent(new Event('input',{bubbles:true})) })()");
  await evaluate("document.querySelector('.reset-target').click()");
  await waitFor("document.querySelector('.editor-fields input[maxlength=\"120\"]').value === '设置暂时无法使用' && !document.querySelector('.draft-badge')", 'restore only the selected item');

  // Batch operations affect only this partition, and undo restores persisted values.
  const savedBeforeBatch=structuredClone(saves.at(-1));
  await evaluate("[...document.querySelectorAll('.target-batch button')].find(button=>button.textContent==='全部关闭').click()");
  await waitFor("!!document.querySelector('.draft-badge')", 'batch draft');
  await evaluate("document.querySelector('[data-group=\"页面\"]').click()");
  assert.equal(await evaluate("document.querySelector('[data-target=\"page.home\"] input').checked"), savedBeforeBatch.targets['page.home'].available, 'player batch leaves pages unchanged');
  await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='放弃修改').click()");
  await waitFor("!document.querySelector('.draft-badge')", 'discard drafts');
  await evaluate("document.querySelector('.target-search input').value='不存在的项目';document.querySelector('.target-search input').dispatchEvent(new Event('input',{bubbles:true}))");
  await waitFor("!!document.querySelector('.empty-targets') && !!document.querySelector('.empty-editor')", 'empty search clears stale selection');
  await evaluate("document.querySelector('.empty-targets button').click()");
  await waitFor("document.querySelectorAll('.target-row').length === 11", 'clear filters');

  // A failed save retains the user's draft and supports retry.
  await evaluate("document.querySelector('[data-target=\"page.home\"] input').click()");
  failSave=true;
  await evaluate("document.querySelector('[data-action=save]').click()");
  await waitFor("!!document.querySelector('.save-error')", 'failed save inline error');
  assert.ok(await evaluate("!!document.querySelector('.draft-badge')"), 'failed save retains draft');
  failSave=false;
  await evaluate("document.querySelector('[data-action=save]').click()");
  await waitFor("!document.querySelector('.draft-badge') && !document.querySelector('.save-error')", 'retry save');
  await evaluate("document.querySelector('[data-group=global]').click()");
  await waitFor("!!document.querySelector('[data-switch=global]')", 'separate global control');
  await evaluate("document.querySelector('[data-switch=global]').click()");
  await waitFor("!!document.querySelector('.global-notice') && !!document.querySelector('.draft-badge')", 'global toggle remains a draft until saved');
  await evaluate("document.querySelector('[data-action=save]').click()");
  await waitFor("!document.querySelector('.draft-badge')", 'global switch saves');
  assert.equal(saves.at(-1).enabled, true);
  await screenshot('admin-global.png');
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
  await delay(4500);
  await screenshot('admin-mobile.png');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mobile workspace has no horizontal overflow');
  assert.deepEqual(exceptions, []);
  console.log(JSON.stringify({ passed: true, checks: ['10s polling', 'all page redirects with original URLs', 'compact plain-text feature alerts', 'Escape, backdrop dismissal and focus restoration', 'dismissed alerts stay closed across polls', 'native dialog live closure', 'keep-alive isolation', 'mobile layout', 'three-column partitioned admin workspace', 'separate page and reminder editors', 'drafts retained across partitions', 'partition-scoped batch changes and discard', 'failed save retains drafts and supports retry', 'custom preview and persistence'], screenshots: output }, null, 2));
} finally {
  if (ws?.readyState === WebSocket.OPEN) {
    void send('Browser.close').catch(() => {});
    await delay(200); ws.close();
  }
  chrome.kill(); servers.forEach(server => server.kill());
}
