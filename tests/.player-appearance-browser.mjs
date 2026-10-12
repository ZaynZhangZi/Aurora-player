import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtemp, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {PLAYER_APPEARANCE_OPTIONS} from '../src/utils/player/playerAppearance.js'

const base = process.env.PLAYER_TEST_URL || 'http://127.0.0.1:5186'
const profile = await mkdtemp(join(tmpdir(), 'aurora-player-appearance-'))
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=9451', `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-default-apps', '--disable-extensions',
  '--autoplay-policy=no-user-gesture-required', 'about:blank',
], {windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']})
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let socket
let sequence = 0
const pending = new Map()
const exceptions = []
const stageModes = PLAYER_APPEARANCE_OPTIONS.filter(option => option.id !== 'amll').map(option => option.id)
const text = ['把纷扰留在窗外', '让音乐拥抱此刻', '就让时间慢一些走', '听见风也听见你', '每一句都留下回声', '这一刻是我们的歌', '愿星光落在你肩上', '在旋律里再次相遇']
const yrc = text.map((line, index) => `[${index * 10000},10000]` + Array.from(line).map((char, charIndex, chars) => `(${index * 10000 + Math.floor(charIndex * 10000 / chars.length)},${Math.floor(10000 / chars.length)},0)${char}`).join('')).join('\n')
const translation = text.map((_, index) => `[${String(Math.floor(index * 10 / 60)).padStart(2, '0')}:${String(index * 10 % 60).padStart(2, '0')}.00]Let the music hold this moment.`).join('\n')
const track = id => ({id, name: id === 1 ? '在旋律里，与此刻相遇' : id === 3 ? '无词的夜晚' : `慢一些的时光 ${id}`, artists: [{id: 9, name: '日光花园'}], cover: `${base}/__stage-cover.svg`, url: `${base}/__stage-audio.wav?id=${id}`})
const queue = [track(1), track(2), track(3)]
const wav = Buffer.alloc(44 + 8000 * 2 * 90)
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8)
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34)
wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40)
// A quiet tone, so the real audio graph and timing run without an online music service.
for (let i = 0; i < 8000 * 90; i++) wav.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 220 / 8000) * 400), 44 + i * 2)

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)) }, 18000)
    pending.set(id, {resolve: value => { clearTimeout(timeout); resolve(value) }, reject: error => { clearTimeout(timeout); reject(error) }})
    socket.send(JSON.stringify({id, method, params}))
  })
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
  return result.result.value
}
async function until(expression) {
  for (let i = 0; i < 250; i++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(120) }
  throw new Error(`Timed out: ${expression}; ${await evaluate('document.body.innerText.slice(-1800)')}`)
}
async function intercept({requestId, request}) {
  const url = new URL(request.url)
  const path = url.pathname
  let body = {code: 200, data: [], result: [], songs: []}
  let type = 'application/json'
  if (path.includes('__stage-audio')) {
    const range = /bytes=(\d+)-(\d*)/.exec(request.headers.Range || request.headers.range || '')
    const start = range ? Number(range[1]) : 0
    const end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1
    await send('Fetch.fulfillRequest', {requestId, responseCode: range ? 206 : 200, responseHeaders: [
      {name: 'Content-Type', value: 'audio/wav'}, {name: 'Accept-Ranges', value: 'bytes'},
      {name: 'Content-Length', value: String(end - start + 1)},
      ...(range ? [{name: 'Content-Range', value: `bytes ${start}-${end}/${wav.length}`}] : []),
    ], body: wav.subarray(start, end + 1).toString('base64')})
    return
  } else if (path.includes('__stage-cover')) {
    type = 'image/svg+xml'
    body = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><defs><linearGradient id="a" x2="1" y2="1"><stop stop-color="#798db9"/><stop offset="1" stop-color="#343653"/></linearGradient></defs><rect width="600" height="600" fill="url(#a)"/><circle cx="300" cy="240" r="125" fill="#eacdad" opacity=".5"/><path d="M0 390Q160 270 300 400T600 370V600H0" fill="#273444"/><text x="300" y="520" fill="#eae4d8" font-size="34" text-anchor="middle" letter-spacing="9">AURORA</text></svg>'
  } else if (path.endsWith('/lyric') || path.endsWith('/lyric/new')) {
    body = Number(url.searchParams.get('id')) === 3 ? {code: 200, lrc: {lyric: ''}} : {code: 200, yrc: {lyric: yrc}, tlyric: {lyric: translation}}
  } else if (path.endsWith('/song/detail')) body = {code: 200, songs: [track(Number(url.searchParams.get('ids')))]}
  else if (path.includes('/song/url')) body = {code: 200, data: [{id: Number(url.searchParams.get('id')), url: `${base}/__stage-audio.wav?id=${url.searchParams.get('id')}`} ]}
  else if (path.endsWith('/recommend/songs')) body = {code: 200, data: {dailySongs: queue}}
  else if (path.endsWith('/personalized/newsong')) body = {code: 200, result: queue}
  const bytes = Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))
  await send('Fetch.fulfillRequest', {requestId, responseCode: 200, responseHeaders: [{name: 'Content-Type', value: type}, {name: 'Access-Control-Allow-Origin', value: '*'}], body: bytes.toString('base64')})
}
async function screenshot(name) {
  const capture = await send('Page.captureScreenshot', {format: 'png'})
  const path = fileURLToPath(new URL(`../../tmp/aurora-player-${name}.png`, import.meta.url))
  await writeFile(path, Buffer.from(capture.data, 'base64'))
  console.log('SCREENSHOT', path)
}

const nativeModes = {manuscript:'fume',stage:'classic',cadenza:'cadenza',parata:'partita',cappella:'cappella',tilt:'tilt',diorama:'diorama',pendolo:'pendolo'}
async function closeFullscreen() {
  if(!await evaluate("Boolean(document.querySelector('.amll-wrapper.is-opened'))")) return
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await until("!document.querySelector('.amll-wrapper.is-opened')")
}
async function openSettings(tab = 'appearance') {
  await closeFullscreen()
  await evaluate("document.querySelector('.aurora-settings').focus();document.querySelector('.aurora-settings').click()")
  await until("document.querySelector('.app-settings-dialog[open].is-visible')")
  await evaluate("document.querySelector('#settings-tab-"+tab+"').click()")
  await delay(200)
  assert.ok(await evaluate("document.querySelector('.app-settings-dialog').contains(document.activeElement)"),'Settings focus escaped')
  assert.equal(await evaluate('document.body.style.overflow'),'hidden')
}
async function closeSettings() {
  await evaluate("document.querySelector('[aria-label=\"关闭设置\"]').click()")
  await until("!document.querySelector('.app-settings-dialog[open]')")
  assert.ok(await evaluate("document.activeElement.classList.contains('aurora-settings')"),'Settings did not restore header focus')
  assert.notEqual(await evaluate('document.body.style.overflow'),'hidden')
}
async function verifySettingsDismissal() {
  const escape = async () => {
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  }
  const closed = async () => {
    await until("!document.querySelector('.app-settings-dialog[open]')")
    assert.ok(await evaluate("document.activeElement.classList.contains('aurora-settings')"))
    assert.notEqual(await evaluate('document.body.style.overflow'),'hidden')
    assert.equal(await evaluate("import('/src/utils/scrollLock.js').then(module=>module.getScrollLockCount())"),0)
  }
  await openSettings()
  await escape()
  await closed()
  await openSettings()
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:2,y:2,button:'left',clickCount:1})
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:2,y:2,button:'left',clickCount:1})
  await closed()
  await openSettings()
  await evaluate("import('/src/composables/useAppSettings.js').then(async module=>{module.closeAppSettings();await new Promise(resolve=>setTimeout(resolve,40));module.openAppSettings()})")
  await delay(220)
  assert.ok(await evaluate("Boolean(document.querySelector('.app-settings-dialog[open].is-visible'))"))
  assert.equal(await evaluate("import('/src/utils/scrollLock.js').then(module=>module.getScrollLockCount())"),1)
  await closeSettings()
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  await openSettings()
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.settings-shell')).transitionDuration"),'0s')
  await escape()
  await closed()
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
  console.log('Settings Escape, backdrop, rapid reopening, focus/scroll cleanup and reduced motion passed')
}
async function openFullscreen() {
  await evaluate("document.querySelector('.player-cover-button').click()")
  await until("document.querySelector('.amll-wrapper.is-opened')")
}
async function chooseMode(mode) {
  await openSettings()
  const panel=await evaluate("(()=>{const rect=document.querySelector('.settings-shell').getBoundingClientRect();return {count:document.querySelectorAll('.app-settings-dialog .appearance-option').length,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:innerWidth,height:innerHeight}})()")
  assert.equal(panel.count,9)
  assert.ok(panel.left>=-1&&panel.top>=-1&&panel.right<=panel.width+1&&panel.bottom<=panel.height+1,JSON.stringify(panel))
  await evaluate("document.querySelector('.app-settings-dialog [data-player-appearance=\""+mode+"\"]').click()")
  await closeSettings()
  await openFullscreen()
  await until(mode==='amll'?"Boolean(document.querySelector('.amll-prebuilt'))":"document.querySelector('[data-folia-mode=\""+nativeModes[mode]+"\"]')?.querySelector('[data-folia-controls]')")
  await delay(mode==='diorama'?4000:900)
  assert.ok(await evaluate("document.querySelector('[data-player-amll-host]').contains(document.activeElement)"),mode+' fullscreen did not receive focus')
  assert.equal(await evaluate("Boolean(document.querySelector('.folia-error'))"),false)
  assert.equal(await evaluate("document.querySelectorAll('[data-player-amll-host] .appearance-picker, [data-player-amll-host] .folia-tools, [data-player-amll-host] .amll-share-tools').length"),0,'Settings still clutter fullscreen player')
}
async function seek(seconds) {
  await evaluate(`(()=>{const input=document.querySelector('[data-folium-part="progress.track"] input');input.value='${seconds}';input.dispatchEvent(new Event('input',{bubbles:true}))})()`)
}
async function expand() {
  const center=await evaluate(`(()=>{const r=document.querySelector('[data-folia-controls]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:center.x,y:center.y})
  await until(`document.querySelector('[data-folia-controls]')?.dataset.expanded==='true'`)
}
async function verifyCappellaWrapping() {
  const fixtures=['So follow me to the place where we can hear the music together','让音乐陪着我们慢慢走过很长的一段时光直到听见下一句歌词']
  const viewport=await evaluate('({width:innerWidth,height:innerHeight})')
  try {
    await evaluate(`(async()=>{
      const {createFoliaRenderer}=await import('/src/components/globalFooterPlayer/folia/createFoliaRenderer.js');
      const {toFoliaLines}=await import('/src/utils/player/foliaTimeline.js');
      const {foliaPreviewTheme}=await import('/src/utils/player/foliaTimeline.js');
      const {getOrBuildBubbleMetrics}=await import('/src/vendor/folia/src/components/visualizer/cappella/cappellaBubbleMetrics.ts');
      const cache=new Map(),theme=foliaPreviewTheme('cappella');
      const dimensions={theme,fontSize:24.12,lineHeightPx:24.12*1.45,maxTextWidth:225,paddingX:20,paddingY:16};
      const line=text=>({fullText:text,startTime:5,endTime:65,words:[{text,startTime:5,endTime:65}]});
      const short=getOrBuildBubbleMetrics(cache,{...dimensions,line:line('Hi')});
      const long=getOrBuildBubbleMetrics(cache,{...dimensions,line:line('So follow me to the place where we can hear the music together')});
      const retimed=getOrBuildBubbleMetrics(cache,{...dimensions,line:{...line('Hi'),words:[{text:'Hi',startTime:10,endTime:60}]}});
      window.cappellaCacheProbe={distinct:short!==long&&short!==retimed,longer:long.sizes.length>short.sizes.length,retimed:short.revealTimes[0]!==retimed.revealTimes[0]};
      const probe=document.createElement('div');probe.id='cappella-wrapping-probe';probe.className='folia-surface';Object.assign(probe.style,{position:'fixed',inset:'0',zIndex:'9000'});document.body.append(probe);
      window.cappellaWrappingOptions={mode:'cappella',backgroundMode:'reference',musicName:'Long lyric',trackKey:'cappella-wrapping',lines:[],currentTimeMs:0,duration:130000,playing:false,lyricLeadMs:0,reducedMotion:false,playMode:'sequence',onError:console.error};
      window.cappellaWrappingRenderer=createFoliaRenderer(probe,window.cappellaWrappingOptions);
      window.setCappellaFixture=text=>{window.cappellaWrappingOptions.lines=toFoliaLines([{startTime:5000,endTime:5000+Array.from(text).length*2000,words:Array.from(text,(word,index)=>({word,startTime:5000+index*2000,endTime:7000+index*2000}))}]);window.cappellaWrappingRenderer.update(window.cappellaWrappingOptions)};
    })()`)
    assert.deepEqual(await evaluate('window.cappellaCacheProbe'),{distinct:true,longer:true,retimed:true},'Cappella reused another lyric or timing from its cache')
    await until("document.querySelector('#cappella-wrapping-probe [data-folia-controls]')")
    for(const width of [1440,390,320]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false})
      for(const text of fixtures) {
        await evaluate(`window.setCappellaFixture(${JSON.stringify(text)})`)
        for(const count of [15,18,23,27,31,35,text.length].filter(count=>count<=text.length)) {
          await evaluate(`window.cappellaWrappingOptions.currentTimeMs=${5000+(count-1)*2000+1000};window.cappellaWrappingRenderer.update(window.cappellaWrappingOptions)`)
          await delay(240)
          const bubbles=await evaluate(`Array.from(document.querySelectorAll('#cappella-wrapping-probe div[style*="font-size"]')).filter(element=>Number.parseFloat(element.style.fontSize)>20&&element.querySelector('span.relative.z-10')).map(element=>({text:element.textContent,height:element.clientHeight,scrollHeight:element.scrollHeight,bottom:element.getBoundingClientRect().bottom,textBottom:element.querySelector('span.relative.z-10').getBoundingClientRect().bottom}))`)
          assert.ok(bubbles.length,'Active Cappella bubble missing')
          for(const bubble of bubbles) assert.ok(bubble.scrollHeight<=bubble.height+1&&bubble.textBottom<=bubble.bottom+1,JSON.stringify({width,count,...bubble}))
        }
      }
    }
    console.log('Cappella long English/Chinese lyrics wrap without clipping; replacement lyrics and timing use separate cached metrics')
  } finally {
    await evaluate("window.cappellaWrappingRenderer?.dispose();document.querySelector('#cappella-wrapping-probe')?.remove();delete window.cappellaWrappingRenderer;delete window.cappellaWrappingOptions;delete window.setCappellaFixture;delete window.cappellaCacheProbe")
    await send('Emulation.setDeviceMetricsOverride',{...viewport,deviceScaleFactor:1,mobile:false})
  }
}
try {
  let tab
  for (let i = 0; i < 60; i++) { try { tab = (await (await fetch('http://127.0.0.1:9451/json/list')).json()).find(item => item.type === 'page'); if (tab) break } catch {} await delay(150) }
  if (!tab) throw new Error('Browser could not start')
  socket = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise(resolve => socket.addEventListener('open', resolve, {once: true}))
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id) { const entry = pending.get(message.id); pending.delete(message.id); if (message.error) entry?.reject(message.error); else entry?.resolve(message.result) }
    else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)
    else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') console.error('CONSOLE', message.params.args.map(arg=>arg.description || arg.value).join(' '))
    else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) console.error('HTTP', message.params.response.status, message.params.response.url)
    else if (message.method === 'Fetch.requestPaused') void intercept(message.params).catch(error => console.error('interception', error.message))
  })
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Fetch.enable', {patterns: [{urlPattern: '*', resourceType: 'XHR'}, {urlPattern: '*', resourceType: 'Fetch'}, {urlPattern: '*__stage-*'}]})
  await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false})
  await send('Page.addScriptToEvaluateOnNewDocument', {source: `
    window.appearancePageToken=crypto.randomUUID();
    if (!localStorage.getItem('appearance-smoke-seeded')) {
      localStorage.setItem('appearance-smoke-seeded','1');
      sessionStorage.setItem('aurora-splash-seen','1');
      localStorage.setItem('usermasgcookie','TEST=1');
      localStorage.setItem('usermasg',JSON.stringify({data:{profile:{userId:123,nickname:'Test'}}}));
      localStorage.setItem('global-player-store',JSON.stringify(${JSON.stringify({currentSong: track(1), playQueue: queue, currentQueueIndex: 0, automixEnabled: false})}));
      localStorage.setItem('aurora-playback-position-v1',JSON.stringify({songId:1,currentTimeMs:12500,durationMs:90000}));
    }
    window.appearanceMediaLoads=0;
    const originalLoad=HTMLMediaElement.prototype.load;
    HTMLMediaElement.prototype.load=function(){window.appearanceMediaLoads++;return originalLoad.call(this)};
  `})
  await send('Page.navigate', {url: `${base}/home`})
  await until(`document.querySelector('.player-cover-button') && document.querySelector('audio')?.readyState >= 1`)
  await screenshot('header-home-desktop')
  await verifySettingsDismissal()
  await openSettings()
  await screenshot('header-settings-desktop')
  await evaluate("document.querySelector('[aria-label=\"关闭设置\"]').focus()")
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',modifiers:8,windowsVirtualKeyCode:9})
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',modifiers:8,windowsVirtualKeyCode:9})
  assert.ok(await evaluate("document.querySelector('.app-settings-dialog').contains(document.activeElement)"),'Native dialog did not trap Shift+Tab')
  await evaluate("document.querySelector('#settings-tab-playback').click()")
  await screenshot('header-settings-playback-desktop')
  await evaluate("(()=>{const select=document.querySelector('.settings-row select');select.value='single';select.dispatchEvent(new Event('change',{bubbles:true}))})()")
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('global-player-store')).playMode"),'single')
  await evaluate("(()=>{const select=document.querySelector('.settings-row select');select.value='sequence';select.dispatchEvent(new Event('change',{bubbles:true}))})()")
  await evaluate("document.querySelector('#settings-tab-appearance').click();document.querySelector('[data-player-appearance=\"stage\"]').click()")
  await closeSettings()
  assert.equal(await evaluate("localStorage.getItem('aurora-player-appearance-v1')"),'stage')
  await openFullscreen()

  await until(`document.querySelector('[data-folia-mode="classic"] .folia-play-button')`)
  await delay(1000)
  assert.equal(await evaluate('document.body.style.overflow'),'hidden')
  await screenshot('folia-classic-paused')
  await evaluate(`document.querySelector('.folia-play-button').click()`)
  await until(`!document.querySelector('audio').paused`)
  await evaluate(`window.appearanceAudio=document.querySelector('audio');window.appearanceInitialLoads=window.appearanceMediaLoads`)
  for (const mode of [...stageModes,'amll','stage']) {
    await chooseMode(mode)
    const media=await evaluate(`({same:window.appearanceAudio===document.querySelector('audio'),paused:window.appearanceAudio.paused,loads:window.appearanceMediaLoads,initial:window.appearanceInitialLoads})`)
    assert.ok(media.same && !media.paused && media.loads===media.initial,JSON.stringify(media))
    if(mode!=='amll') {
      const before=await evaluate(`Number(document.querySelector('[data-folia-surface]').dataset.foliaTime)`)
      await delay(250)
      const after=await evaluate(`Number(document.querySelector('[data-folia-surface]').dataset.foliaTime)`)
      assert.ok(after>before+.05,mode+' clock stopped')
      if(['manuscript','diorama','pendolo'].includes(mode)) assert.ok(await evaluate(`Array.from(document.querySelectorAll('[data-folia-surface] canvas')).some(canvas=>canvas.width>0 && canvas.height>0)`),mode+' canvas missing')
      await screenshot('folia-'+nativeModes[mode]+'-desktop')
    }
  }
  console.log('All eight native renderers plus AMLL: audio identity/load count unchanged, live timelines advance')
  for(const background of ['latent','cover','reference','latent']) {
    await openSettings()
    await evaluate("(()=>{const select=document.querySelector('.app-settings-dialog [data-folia-background-picker]');select.value='"+background+"';select.dispatchEvent(new Event('change',{bubbles:true}))})()")
    assert.equal(await evaluate("localStorage.getItem('aurora-folia-background-v1')"),background)
    await closeSettings();await openFullscreen()
    await until("document.querySelector('[data-folia-background=\""+background+"\"]')")
    if(background==='latent')await until("document.querySelector('[data-folia-background=\"latent\"] canvas')?.width>0")
    assert.ok(await evaluate("window.appearanceAudio===document.querySelector('audio')&&!window.appearanceAudio.paused&&window.appearanceMediaLoads===window.appearanceInitialLoads"),'Changing header preferences interrupted audio')
    await delay(600);await screenshot('background-'+background+'-desktop')
  }
  await send('Page.reload')
  await until("document.querySelector('.aurora-settings') && document.querySelector('audio')?.readyState>=1")
  await openFullscreen()
  await until("document.querySelector('[data-folia-background=\"latent\"] canvas')?.width>0")
  await openSettings()
  await evaluate("(()=>{const select=document.querySelector('.app-settings-dialog [data-folia-background-picker]');select.value='reference';select.dispatchEvent(new Event('change',{bubbles:true}))})()")
  await closeSettings();await openFullscreen()
  await until("document.querySelector('[data-folia-background=\"reference\"]')")
  if(await evaluate("document.querySelector('audio').paused"))await evaluate("document.querySelector('.folia-play-button').click()")
  await until("!document.querySelector('audio').paused")
  console.log('Header settings: styles/backgrounds persist and do not interrupt playback')
  await expand()
  await evaluate(`document.querySelector('[data-folia-controls] [aria-label="打开播放列表"]').click()`)
  await until(`document.querySelector('.playlist-dialog-over-fullscreen')`)
  await evaluate(`document.querySelector('[aria-label="关闭播放列表"]').click()`)
  await openSettings('playback')
  await evaluate("Array.from(document.querySelectorAll('.settings-track-actions button')).find(button=>button.textContent.includes('分享歌词')).click()")
  await until("document.querySelector('.lyric-share-dialog[open]')")
  assert.equal(await evaluate("Boolean(document.querySelector('.app-settings-dialog[open]'))"),false)
  await evaluate("document.querySelector('[aria-label=\"关闭歌词分享\"]').click()")
  await until("!document.querySelector('.lyric-share-dialog[open]')")
  await openFullscreen()
  await until("document.querySelector('[data-folia-controls]')")
  await expand()
  await evaluate(`document.querySelector('.folia-play-button').click()`)
  await until(`document.querySelector('audio').paused`)
  await seek(42)
  await until(`document.querySelector('[data-folia-surface]')?.dataset.foliaLine==='4'`)
  assert.ok(Math.abs(await evaluate('document.querySelector("audio").currentTime')-42)<.2)
  for(const width of [390,320]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false})
    await openSettings()
    await screenshot('header-settings-mobile-'+width)
    await closeSettings()
    for(const mode of stageModes) {
      await chooseMode(mode)
      if (mode === 'parata') assert.ok(await evaluate(`Array.from(document.querySelectorAll('[data-folia-surface] .inline-flex.origin-center')).some(element=>Number(getComputedStyle(element).opacity)>.1)`), 'Paused Partita chunks remained in waiting state')
      const box=await evaluate(`(()=>{const r=document.querySelector('[data-folia-controls]').getBoundingClientRect();return {left:r.left,right:r.right,scroll:document.documentElement.scrollWidth}})()`)
      assert.ok(box.left>=-1 && box.right<=width+1 && box.scroll<=width+1,mode+JSON.stringify(box))
      if(width===390) await screenshot('folia-'+nativeModes[mode]+'-mobile')
    }
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:460,deviceScaleFactor:1,mobile:false})
  for(const mode of stageModes) await chooseMode(mode)
  await seek(85)
  await until(`document.querySelector('[data-folia-surface]').dataset.foliaLine==='-1'`)
  for(const mode of stageModes) await chooseMode(mode)
  await expand()
  await evaluate(`document.querySelector('[aria-label="播放下一首"]').click()`)
  await until(`document.querySelector('[data-folia-controls]').textContent.includes('慢一些')`)
  await evaluate(`document.querySelector('[aria-label="播放下一首"]').click()`)
  await until(`document.querySelector('[data-folia-controls]').textContent.includes('无词的夜晚') && !document.querySelector('[data-folia-surface]').textContent.includes('${text[4]}')`)
  for(const mode of stageModes) await chooseMode(mode)
  await chooseMode('tilt')
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  await delay(300)
  const token=await evaluate('window.appearancePageToken')
  await send('Page.reload')
  await until(`window.appearancePageToken!==${JSON.stringify(token)} && document.querySelector('.player-cover-button') && document.querySelector('audio')?.readyState>=1`)
  await evaluate(`document.querySelector('.player-cover-button').click()`)
  await until(`document.querySelector('[data-folia-mode="tilt"]')`)
  await evaluate(`document.querySelector('.folia-play-button').focus()`)
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await until(`!document.querySelector('.amll-wrapper.is-opened')`)
  assert.notEqual(await evaluate('document.body.style.overflow'),'hidden')
  assert.equal(await evaluate(`document.activeElement.classList.contains('player-cover-button')`),true)
  console.log('Seek, queue/share, all mobile themes, gaps/empty tracks, saved choice, Escape/focus and reduced motion passed')
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
  await verifyCappellaWrapping()
  await send('Page.navigate', {url: `${base}/folia-preview.html`})
  await until(`document.querySelector('[data-folia-mode="fume"]')`)
  await evaluate(`document.querySelector('#theme').value='stage';document.querySelector('#theme').dispatchEvent(new Event('change'))`)
  await until(`document.querySelector('[data-folia-mode="classic"]')`)
  await delay(1800)
  await screenshot('reference-background-preview-desktop')
  for(const background of ['latent','cover','reference']) {
    await evaluate(`document.querySelector('#background').value='${background}';document.querySelector('#background').dispatchEvent(new Event('change'))`)
    await until(`document.querySelector('[data-folia-background="${background}"]')`)
    if(background==='latent') await until(`document.querySelector('[data-folia-background="latent"] canvas')?.width>0`)
  }
  await evaluate(`document.querySelector('#theme').value='pendolo';document.querySelector('#theme').dispatchEvent(new Event('change'))`)
  await until(`document.querySelector('[data-folia-mode="pendolo"] canvas')`)
  console.log('Backend-free live preview also renders the production bridge')
  assert.deepEqual(exceptions,[],JSON.stringify(exceptions))
} catch (error) {
  console.error(error)
  if (socket?.readyState === 1) { await screenshot('failure').catch(() => {}); console.error('Browser exceptions', exceptions) }
  process.exitCode = 1
} finally {
  if (socket?.readyState === 1) await send('Browser.close').catch(() => {})
  socket?.close(); browser.kill()
}
