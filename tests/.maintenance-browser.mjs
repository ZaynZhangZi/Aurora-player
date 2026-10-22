import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

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
    if (request.method === 'PUT') { Object.assign(settings, JSON.parse(request.postData)); saves.push({ ...settings }); }
    body = { code: 200, data: settings };
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
    } else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:4187/maintenance-smoke?keep=1' });
  await waitFor("document.querySelector('.maintenance-page') && !document.querySelector('#aurora-boot')", 'initial maintenance screen');
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

  // Authenticate only the isolated mock browser session; no production services are used.
  const auth = JSON.stringify({ token: 'test-token', expiresAt: Date.now() + 86400000 });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `if(location.port==='4188')localStorage.setItem('auth',${JSON.stringify(auth)});` });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  settings.customHtml = '';
  await send('Page.navigate', { url: 'http://127.0.0.1:4188/maintenance' });
  await waitFor("!!document.querySelector('.maintenance-preview')", 'admin settings page');
  await screenshot('admin.png');
  await evaluate(`(() => {
    const title = [...document.querySelectorAll('input')].find(input => input.maxLength === 120);
    title.value = '维护页面已更新'; title.dispatchEvent(new Event('input', {bubbles:true}));
    document.querySelector('input[type=checkbox]').click();
  })()`);
  await waitFor("document.querySelector('.maintenance-preview').textContent.includes('维护页面已更新')", 'live preview');
  await evaluate("document.querySelector('button[type=submit]').click()");
  await waitFor("document.querySelector('form').textContent.includes('当前已发布：维护中')", 'save published maintenance');
  assert.equal(saves.at(-1).title, '维护页面已更新');
  assert.equal(saves.at(-1).enabled, true);
  assert.deepEqual(exceptions, []);
  console.log(JSON.stringify({ passed: true, checks: ['10s polling', 'initial gate', 'mobile layout', 'network failure', 'same-route recovery', 'retained page instance', 'sandboxed HTML', 'admin preview and save'], screenshots: output }, null, 2));
} finally {
  if (ws?.readyState === WebSocket.OPEN) {
    void send('Browser.close').catch(() => {});
    await delay(200); ws.close();
  }
  chrome.kill(); servers.forEach(server => server.kill());
}
