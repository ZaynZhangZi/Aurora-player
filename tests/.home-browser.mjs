import {spawn} from 'node:child_process'
import {mkdtemp, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import assert from 'node:assert/strict'

const base = 'http://127.0.0.1:5173'
const profile = await mkdtemp(join(tmpdir(), 'aurora-home-smoke-'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=9427', `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-default-apps', '--autoplay-policy=no-user-gesture-required',
  '--disable-background-networking', 'about:blank',
], {windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']})
chrome.stderr.on('data', data => { if (String(data).includes('ERROR')) console.error(String(data).trim()) })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let tab
for (let i = 0; i < 40; i++) {
  try { tab = (await (await fetch('http://127.0.0.1:9427/json/list')).json()).find(item => item.type === 'page'); if (tab) break } catch {}
  await delay(150)
}
if (!tab) throw new Error('Headless browser did not start')
const ws = new WebSocket(tab.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, {once: true}))
let seq = 0
const pending = new Map()
const exceptions = []
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq
    const timeout = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 12000)
    pending.set(id, {resolve: result => { clearTimeout(timeout); resolve(result) }, reject: error => { clearTimeout(timeout); reject(error) }})
    ws.send(JSON.stringify({id, method, params}))
  })
}
const cover = base + '/__smoke-cover.svg'
const track = id => ({id, name: id === 1 ? 'I Forgot That You Existed' : `轻轻听 · ${id}`, ar: [{id: 2, name: 'Taylor Swift'}], artists: [{id: 2, name: 'Taylor Swift'}], al: {picUrl: cover, name: 'Lover'}, cover, dt: 24000, url: base + `/__smoke-audio.wav?id=${id}`})
const tracks = [track(1), track(2), track(3)]
const playlists = [31, 32, 33, 34].map(id => ({id, name: `留给今天的旋律 ${id}`, picUrl: cover, trackCount: 3}))
const wav = Buffer.alloc(44 + 24000 * 16)
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8)
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34)
wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40)
async function intercept({requestId, request}) {
  const url = new URL(request.url)
  const path = url.pathname
  let body = {code: 200, data: [], result: []}
  let type = 'application/json'
  if (path.includes('__smoke-cover')) {
    type = 'image/svg+xml'
    body = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="a" x2="1" y2="1"><stop stop-color="#dc729c"/><stop offset="1" stop-color="#565d9e"/></linearGradient></defs><rect width="400" height="400" fill="url(#a)"/><circle cx="200" cy="200" r="110" fill="#fff" opacity=".14"/><text x="200" y="215" text-anchor="middle" font-size="45" fill="#fff">AURORA</text></svg>'
  } else if (path.includes('__smoke-audio')) {
    const range = /bytes=(\d+)-(\d*)/.exec(request.headers.Range || request.headers.range || '')
    const start = range ? Number(range[1]) : 0
    const end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1
    await send('Fetch.fulfillRequest', {requestId, responseCode: range ? 206 : 200, responseHeaders: [{name: 'Content-Type', value: 'audio/wav'}, {name: 'Accept-Ranges', value: 'bytes'}, {name: 'Content-Length', value: String(end - start + 1)}, ...(range ? [{name: 'Content-Range', value: `bytes ${start}-${end}/${wav.length}`}] : [])], body: wav.subarray(start, end + 1).toString('base64')})
    return
  } else if (path.endsWith('/recommend/songs')) body = {code: 200, data: {dailySongs: tracks}}
  else if (path.endsWith('/personal_fm')) { await delay(700); body = {code: 200, data: [track(4), track(5), track(6)]} }
  else if (path.endsWith('/recommend/resource')) body = {code: 200, recommend: playlists}
  else if (path.endsWith('/personalized/newsong')) body = {code: 200, result: tracks}
  else if (path.endsWith('/personalized')) body = {code: 200, result: playlists}
  else if (path.endsWith('/playlist/detail')) body = {code: 200, playlist: {...playlists[0], tracks, coverImgUrl: cover}}
  else if (path.endsWith('/playlist/track/all')) body = {code: 200, songs: tracks}
  else if (path.includes('/song/url')) body = {code: 200, data: [{id: Number(url.searchParams.get('id')), url: base + `/__smoke-audio.wav?id=${url.searchParams.get('id')}`} ]}
  else if (path.endsWith('/song/detail')) body = {code: 200, songs: [track(Number(url.searchParams.get('ids')))]}
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))
  await send('Fetch.fulfillRequest', {requestId, responseCode: 200, responseHeaders: [{name: 'Content-Type', value: type}, {name: 'Access-Control-Allow-Origin', value: '*'}], body: bytes.toString('base64')})
}
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.id) {
    const promise = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) promise?.reject(message.error)
    else promise?.resolve(message.result)
  } else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)
  else if (message.method === 'Fetch.requestPaused') void intercept(message.params).catch(error => console.error('interception', error))
})
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
async function until(expression) {
  for (let i = 0; i < 80; i++) { if (await evaluate(expression)) return; await delay(150) }
  console.log('diagnostic', await evaluate(`({url:location.href,body:document.body.innerText.slice(0,1500),audio:[...document.querySelectorAll('audio')].map(a=>({src:a.currentSrc,state:a.readyState,error:a.error?.message}))})`), exceptions)
  throw new Error('Timed out: ' + expression)
}
try {
  await send('Page.enable'); await send('Runtime.enable')
  await send('Fetch.enable', {patterns: [{urlPattern: `${base}/api/*`}, {urlPattern: `${base}/backend-api/*`}, {urlPattern: '*__smoke-*'}]})
  await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false})
  await send('Page.addScriptToEvaluateOnNewDocument', {source: `if (!localStorage.getItem('smoke-seeded')) {
    localStorage.setItem('smoke-seeded', '1');
    sessionStorage.setItem('aurora-splash-seen', '1');
    localStorage.setItem('usermasgcookie', 'TEST=1');
    localStorage.setItem('usermasg', JSON.stringify({data:{profile:{userId:123,nickname:'Test'}}}));
    localStorage.setItem('global-player-store', JSON.stringify(${JSON.stringify({currentSong: tracks[0], playQueue: tracks, currentQueueIndex: 0, automixEnabled: false})}));
    localStorage.setItem('aurora-playback-position-v1', JSON.stringify({songId:1,currentTimeMs:7000,durationMs:24000}));
  }
  window.smokeSeeks=[]; const d=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');
  Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{...d,set(value){window.smokeSeeks.push({value,stack:new Error().stack});d.set.call(this,value)}});
  `})
  await send('Page.navigate', {url: base + '/home'})
  await until(`document.querySelector('.personal-station-action') && document.querySelector('audio')?.readyState >= 1`)
  await delay(1000)
  const resumed = await evaluate(`({time:document.querySelector('audio').currentTime,paused:document.querySelector('audio').paused,copy:document.querySelector('.lofi-resume-copy b')?.textContent})`)
  console.log('seek diagnostic', await evaluate(`({seeks:window.smokeSeeks,stored:localStorage.getItem('aurora-playback-position-v1'),duration:document.querySelector('audio').duration})`))
  assert.equal(resumed.paused, true); assert.ok(Math.abs(resumed.time - 7) < .2, JSON.stringify(resumed))
  console.log('restored position', resumed)
  assert.equal(await evaluate(`document.querySelector('.player-desktop-timeline .is-current').textContent`), '0:07')
  await evaluate(`window.scrollTo(0,document.querySelector('.home-listening-grid').offsetTop - 50)`)
  await delay(350)
  const screenshot = await send('Page.captureScreenshot', {format: 'png'})
  const imagePath = join(tmpdir(), 'aurora-home-desktop.png')
  await writeFile(imagePath, Buffer.from(screenshot.data, 'base64'))
  console.log('SCREENSHOT', imagePath)
  const layout = await evaluate(`({viewport:innerWidth,width:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('.home-listening-grid')).gridTemplateColumns,artistSize:getComputedStyle(document.querySelector('.station-artists')).fontSize})`)
  assert.ok(layout.width <= layout.viewport + 1, JSON.stringify(layout)); console.log('desktop', layout)
  await evaluate(`document.querySelector('.lofi-resume-play').click()`)
  await until(`!document.querySelector('audio').paused`)
  await evaluate(`document.querySelector('.lofi-resume-play').click()`)
  await until(`document.querySelector('audio').paused`)
  await evaluate(`document.querySelector('.personal-station-action').click()`)
  await until(`document.querySelector('.lofi-resume-copy strong').textContent.includes('4') && !document.querySelector('audio').paused`)
  await evaluate(`document.querySelector('.personal-station-action').click()`)
  await until(`document.querySelector('audio').paused`)
  const oldUrl = await evaluate('location.href')
  await evaluate(`document.querySelector('.personal-playlist-grid .playlist-play').click()`)
  await until(`document.querySelector('.lofi-resume-copy strong').textContent.includes('I Forgot') && !document.querySelector('audio').paused`)
  assert.equal(await evaluate('location.href'), oldUrl)
  await evaluate(`document.querySelector('.lofi-resume-play').click()`)
  console.log('resume, radio, and independent playlist play controls passed')
  await evaluate(`window.scrollTo(0,900)`)
  const savedScroll = await evaluate('scrollY')
  await evaluate(`import('/src/router/index.js').then(({default:router})=>router.push({name:'releaseNotes'}))`)
  await until(`location.pathname === '/release-notes'`)
  await evaluate(`history.back()`)
  await until(`location.pathname === '/home' && Math.abs(scrollY - ${savedScroll}) < 4`)
  await evaluate(`document.querySelector('.aurora-nav button').click()`)
  await until(`scrollY < 2`)
  console.log('back navigation preserves scroll; home navigation scrolls to top')
  for (const width of [1024, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', {width, height: 844, deviceScaleFactor: 1, mobile: false})
    await delay(150)
    const result = await evaluate(`({viewport:innerWidth,width:document.documentElement.scrollWidth,artistSize:getComputedStyle(document.querySelector('.station-artists')).fontSize})`)
    assert.ok(result.width <= width + 1, JSON.stringify(result)); console.log('responsive', result)
    if (width === 390) {
      await evaluate(`window.scrollTo(0,document.querySelector('.home-listening-grid').offsetTop - 20)`)
      const image = await send('Page.captureScreenshot', {format: 'png'})
      const path = join(tmpdir(), 'aurora-home-mobile.png')
      await writeFile(path, Buffer.from(image.data, 'base64')); console.log('SCREENSHOT', path)
    }
  }
  assert.deepEqual(exceptions, [], JSON.stringify(exceptions))
} finally {
  await send('Browser.close').catch(() => {})
  ws.close()
  chrome.kill()
}
