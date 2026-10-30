import {createServer} from 'node:http'
import {readFile, mkdtemp, writeFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {spawn} from 'node:child_process'
import {resolve, join, extname, sep} from 'node:path'
import {tmpdir} from 'node:os'
import {gzipSync} from 'node:zlib'
import assert from 'node:assert/strict'

const baseline=resolve(process.env.ROUTE_BASELINE_DIST || '../../tmp/route-speed-20261031/baseline-dist')
const current=resolve('dist'),output=resolve(process.env.ROUTE_BENCHMARK_OUTPUT || '../../tmp/route-speed-20261031/benchmark.json')
assert.ok(existsSync(join(baseline,'index.html')), 'Build and save the baseline before running this comparison')
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const servers=[]
for(const [root,port] of [[baseline,4191],[current,4192]]) {
  const server=createServer(async(req,res)=>{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
    if(pathname==='/cover.svg') {res.writeHead(200,{'Content-Type':'image/svg+xml'});res.end('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><rect width="480" height="480" fill="#c6ad93"/></svg>');return}
    let file=resolve(root,'.'+pathname)
    if(!file.startsWith(root+sep)&&file!==root){res.writeHead(403);res.end();return}
    if(!extname(file))file=join(root,'index.html')
    try{const body=await readFile(file),mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.wasm':'application/wasm','.svg':'image/svg+xml','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime,'Content-Encoding':'gzip','Cache-Control':'no-store'});res.end(gzipSync(body))}catch{res.writeHead(404);res.end()}
  })
  await new Promise(done=>server.listen(port,'127.0.0.1',done));servers.push(server)
}
const profile=await mkdtemp(join(tmpdir(),'aurora-route-speed-'))
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=9442',`--user-data-dir=${profile}`,'--no-first-run','--disable-default-apps','--disable-background-networking','about:blank'],{windowsHide:true,stdio:'ignore'})
let ws,seq=0,base,requests=[],exceptions=[]
const pending=new Map()
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method))},20000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value}
async function waitFor(expression,label){for(let i=0;i<200;i++){if(await evaluate(expression))return;await delay(50)}throw Error('Timed out: '+label)}
const song=(id=101)=>({id,name:'测速歌曲 '+id,dt:180000,ar:[{id:201,name:'测速歌手'}],al:{id:301,name:'测速专辑',picUrl:base+'/cover.svg'}})
async function intercept({requestId,request,resourceType}) {
  const url=new URL(request.url),path=url.pathname.replace(/^\/api(?!\/v1)/,'')
  if(url.hostname==='127.0.0.1'&&!url.pathname.startsWith('/api/')){await send('Fetch.continueRequest',{requestId});return}
  if(path.endsWith('/system/maintenance/events')){await send('Fetch.failRequest',{requestId,errorReason:'Failed'});return}
  const item={path,at:Date.now()};requests.push(item)
  let body={code:200,data:[],result:[]}
  if(path.endsWith('/system/maintenance'))body={code:200,data:{enabled:false,title:'维护',message:'维护',estimatedReturn:'',accentColor:'#a78bfa',backgroundUrl:'',customHtml:'',targets:{}}}
  else if(path==='/album'){await delay(500);body={code:200,album:{id:301,name:'测速专辑',picUrl:base+'/cover.svg',artist:{id:201,name:'测速歌手'},artists:[{id:201,name:'测速歌手'}],publishTime:1700000000000,size:2},songs:[song(),song(102)]}}
  else if(path==='/top/album')body={code:200,albums:[{id:301,name:'测速专辑',picUrl:base+'/cover.svg',artists:[{id:201,name:'测速歌手'}]}]}
  else if(path==='/artist/detail'){await delay(450);body={code:200,data:{artist:{id:201,name:'测速歌手',cover:base+'/cover.svg',albumSize:1,musicSize:2,mvSize:1}}}}
  else if(path==='/artist/top/song'){await delay(450);body={code:200,songs:[song(),song(102)]}}
  else if(path==='/artist/album')body={code:200,hotAlbums:[{id:301,name:'测速专辑',picUrl:base+'/cover.svg'}],more:false}
  else if(path==='/artist/songs')body={code:200,songs:[song(),song(102)],more:false}
  else if(path==='/artist/mv')body={code:200,mvs:[],hasMore:false}
  else if(path==='/artist/list')body={code:200,artists:[{id:201,name:'测速歌手',picUrl:base+'/cover.svg'}],more:false}
  else if(path==='/toplist/detail')body={code:200,list:[]}
  item.finishedAt=Date.now()
  if(!url.pathname.includes('/api/')&&!url.pathname.includes('/api/v1/')){await send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});return}
  await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:base},{name:'Access-Control-Allow-Credentials',value:'true'},{name:'Access-Control-Allow-Headers',value:'Content-Type,Custom-Cookie,Authorization'},{name:'Access-Control-Allow-Methods',value:'GET,POST,OPTIONS'},{name:'X-Maintenance-Server-Time',value:String(Date.now())}],body:Buffer.from(JSON.stringify(body)).toString('base64')})
}
try {
  let tab
  for(let i=0;i<60;i++){try{tab=(await(await fetch('http://127.0.0.1:9442/json/list')).json()).find(x=>x.type==='page');if(tab)break}catch{}await delay(100)}
  assert.ok(tab,'Chrome started');ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(done=>ws.addEventListener('open',done,{once:true}))
  ws.addEventListener('message',async event=>{const message=JSON.parse(event.data);if(message.id){const task=pending.get(message.id);if(task){pending.delete(message.id);if(message.error)task.reject(Error(JSON.stringify(message.error)));else task.resolve(message.result)}}else if(message.method==='Fetch.requestPaused'){try{await intercept(message.params)}catch(error){exceptions.push(error.message)}}else if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails.text)})
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true})
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await send('Emulation.setCPUThrottlingRate',{rate:4})
  await send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:1500000,uploadThroughput:750000})
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"try {localStorage.clear();sessionStorage.clear()} catch {}"})
  await send('Fetch.enable',{patterns:[{urlPattern:'*'}]})
  const results=[]
  for(const [label,port] of [['baseline',4191],['optimized',4192]]){
    base='http://127.0.0.1:'+port
    const cold=[]
    for(let i=0;i<3;i++){
      await send('Network.clearBrowserCache');await send('Page.navigate',{url:base+'/search?bench='+i})
      await waitFor(`performance.getEntriesByType('navigation')[0]?.name === ${JSON.stringify(base+'/search?bench='+i)} && !!document.querySelector('.app-shell:not([inert])')`,'startup')
      cold.push(await evaluate("({readyMs:Math.round(performance.now()),jsBytes:performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/')&&e.name.split('?')[0].endsWith('.js')&&e.responseEnd>0).reduce((n,e)=>n+e.decodedBodySize,0)})"))
    }
    const first=[],repeat=[],albumRequests=[]
    for(let i=0;i<3;i++){
      requests=[];await send('Page.navigate',{url:base+'/discover?bench='+i})
      await waitFor(`performance.getEntriesByType('navigation')[0]?.name === ${JSON.stringify(base+'/discover?bench='+i)} && !!document.querySelector('.release-spotlight button') && !!document.querySelector('.app-shell:not([inert])')`,'discovery fixture')
      await evaluate("document.querySelector('.release-spotlight button').dispatchEvent(new PointerEvent('pointerenter'))")
      await delay(900)
      const prefetched=requests.filter(r=>r.path==='/album').length
      const start=await evaluate("(()=>{const now=performance.now();document.querySelector('.release-spotlight button').click();return now})()")
      await waitFor("location.pathname==='/album/301' && document.querySelector('.detail-overlay-layer h1')?.textContent.includes('测速专辑')",'first album details')
      first.push(Math.round(await evaluate('performance.now()')-start))
      await evaluate('history.back()');await waitFor("location.pathname==='/discover' && !document.querySelector('.detail-overlay-layer')",'close detail')
      const next=await evaluate("(()=>{const now=performance.now();document.querySelector('.release-spotlight button').click();return now})()")
      await waitFor("location.pathname==='/album/301' && document.querySelector('.detail-overlay-layer h1')?.textContent.includes('测速专辑')",'repeat album details')
      repeat.push(Math.round(await evaluate('performance.now()')-next));albumRequests.push({prefetched,total:requests.filter(r=>r.path==='/album').length})
    }
    requests=[];await send('Page.navigate',{url:base+'/artist/201'})
    await waitFor("document.querySelector('h1')?.textContent.includes('测速歌手')",'artist core')
    if(label==='optimized')await evaluate("document.querySelector('[data-artist-secondary]')?.scrollIntoView()")
    await waitFor("!!document.querySelector('.album-card')",'artist secondary content')
    const core=requests.filter(r=>r.path==='/artist/detail'||r.path==='/artist/top/song'),secondary=requests.filter(r=>['/artist/album','/artist/mv','/artist/songs'].includes(r.path))
    const secondaryAfterCore=secondary.length===3&&secondary.every(r=>r.at>=Math.max(...core.map(r=>r.finishedAt)))
    results.push({label,cold,firstAlbumMs:first,repeatAlbumMs:repeat,albumRequests,secondaryAfterCore})
    if(label==='optimized'){assert.ok(albumRequests.every(r=>r.prefetched===1&&r.total===1),'hover, click and revisit share one API read');assert.equal(secondaryAfterCore,true,'secondary calls do not contend with core API reads')}
  }
  assert.deepEqual(exceptions,[])
  const report={passed:true,conditions:{cpuSlowdown:4,latencyMs:40,downloadBytesPerSecond:1500000,detailApiDelayMs:500,hoverBeforeClickMs:900},results}
  await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
} finally {
  if(ws?.readyState===WebSocket.OPEN){void send('Browser.close').catch(()=>{});await delay(100);ws.close()}
  chrome.kill();await Promise.all(servers.map(server=>new Promise(done=>server.close(done))))
}
