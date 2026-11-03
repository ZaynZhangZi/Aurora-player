import test from 'node:test'
import assert from 'node:assert/strict'
import {createStudioClock,audioTimeForPerformance,planStudioStart,studioPosition,freshStemSettings} from '../src/utils/studioProtocol.js'
import {StudioSpeaker,SpatialMixer} from '../src/audio/StudioAudio.js'
import {demucsSpec,demucsInverse} from '../src/audio/demucsDsp.js'
import {wavBlob,separateStudioAudio} from '../src/audio/studioMedia.js'
import {createStudioApi} from '../src/api/audioStudioApi.js'
const response=(data,status=200)=>new Response(JSON.stringify({code:status,data,message:'test error'}),{status,headers:{'content-type':'application/json'}})
const deferred=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});return {promise,resolve,reject}}
function clockFixture(){
  let now=1000
  const clock=createStudioClock({now:()=>now})
  clock.add(100,140,{receivedAt:1000120,sentAt:1000120})
  return {clock,setNow:n=>{now=n},now:()=>now}
}
test('round-trip clock estimates ignore slow paths, invalid samples and local wall clock changes',()=>{
  const {clock,setNow}=clockFixture()
  clock.add(200,600,{receivedAt:1000490,sentAt:1000490})
  assert.equal(clock.epoch(1000),1001000);assert.equal(clock.estimate().uncertainty,20)
  assert.equal(clock.add(200,100,{receivedAt:1,sentAt:1}),false)
  assert.equal(clock.add(1,10,{receivedAt:50,sentAt:20}),false)
  assert.equal(clock.add(1,10,{receivedAt:1,sentAt:100}),false)
  assert.equal(clock.add(1,NaN,{receivedAt:1,sentAt:2}),false)
  setNow(62000);assert.equal(clock.estimate(),null);assert.equal(clock.epoch(),null)
})
test('output timestamps align different hardware latencies to the same audible performance deadline',()=>{
  const a={currentTime:5,getOutputTimestamp:()=>({contextTime:4.95,performanceTime:1000})}
  const b={currentTime:7,getOutputTimestamp:()=>({contextTime:6.8,performanceTime:1000})}
  assert.equal(audioTimeForPerformance(a,2000,()=>1200).time,5.95)
  assert.equal(audioTimeForPerformance(b,2000,()=>1200).time,7.8)
  const fallback=audioTimeForPerformance({currentTime:5,baseLatency:.01,outputLatency:.1},2000,()=>1000)
  assert.equal(fallback.method,'latency-estimate');assert.ok(Math.abs(fallback.time-5.89)<1e-10)
})
test('late joining advances the canonical position and respects signed delay compensation',()=>{
  const {clock}=clockFixture(),context={currentTime:1,getOutputTimestamp:()=>({contextTime:1,performanceTime:1000})}
  const room={source:{durationMs:20000},playing:true,positionMs:1000,startsAt:clock.epoch(2000)}
  const future=planStudioStart(context,clock,room,{delayMs:0},()=>1000)
  assert.equal(future.offset,1);assert.equal(future.when,2)
  const later=planStudioStart(context,clock,room,{delayMs:50},()=>3000)
  assert.ok(Math.abs(later.offset-2.07)<.00001)
  assert.equal(studioPosition(room,clock.epoch(2500)),1500)
  assert.equal(planStudioStart(context,clock,{...room,source:{durationMs:1000}},{},()=>10000),null)
})
class Param{
  constructor(value=0){this.value=value;this.calls=[]}
  setValueAtTime(value,time){this.value=value;this.calls.push({value,time})}
  setTargetAtTime(value,time){this.value=value;this.calls.push({value,time})}
  linearRampToValueAtTime(value,time){this.value=value;this.calls.push({value,time})}
  cancelScheduledValues(){}
}
class Node{
  constructor(type){this.type=type;this.connections=[];this.gain=new Param();this.playbackRate=new Param(1);this.positionX=new Param();this.positionY=new Param();this.positionZ=new Param();this.threshold=new Param();this.knee=new Param();this.ratio=new Param();this.attack=new Param();this.release=new Param()}
  connect(...args){this.connections.push(args)}
  disconnect(){this.disconnected=true}
  start(when,offset){this.startArgs={when,offset}}
  stop(){this.stopped=true}
}
function audioFixture(){
  const nodes=[],make=type=>{const node=new Node(type);nodes.push(node);return node}
  const context={state:'running',currentTime:10,baseLatency:0,outputLatency:0,destination:{},listener:{},
    createGain:()=>make('gain'),createBufferSource:()=>make('source'),createChannelSplitter:()=>make('split'),createChannelMerger:()=>make('merge'),createPanner:()=>make('panner'),createDynamicsCompressor:()=>make('compressor')}
  return {context,nodes}
}
test('spatial stems start at one audio deadline and solo/mute affect real graph gains',()=>{
  const {context,nodes}=audioFixture(),mixer=new SpatialMixer(context),settings=freshStemSettings()
  const buffers=Object.fromEntries(settings.map(s=>[s.id,{duration:20}]))
  mixer.load(buffers,settings);mixer.play()
  const sources=nodes.filter(n=>n.type==='source')
  assert.equal(sources.length,4);assert.ok(sources.every(s=>s.startArgs.when===10.04))
  settings[0].solo=true;mixer.update(settings)
  assert.equal(mixer.tracks.get('vocals').gain.value,undefined)
  assert.equal(mixer.tracks.get('vocals').gain.gain.value,1)
  assert.equal(mixer.tracks.get('drums').gain.gain.value,0)
  settings[0].mute=true;mixer.update(settings);assert.equal(mixer.tracks.get('vocals').gain.gain.value,0)
  assert.equal(mixer.tracks.get('bass').panner.panningModel,'HRTF')
  context.currentTime=12.04;mixer.pause();assert.ok(Math.abs(mixer.offset-2)<1e-10)
  mixer.seek(5);mixer.play();assert.ok(nodes.filter(n=>n.type==='source').slice(-4).every(s=>s.startArgs.offset===5))
  mixer.dispose();assert.ok(sources.every(s=>s.stopped))
})
test('mismatched stem durations fail safely and clear the old mix',()=>{
  const {context}=audioFixture(),mixer=new SpatialMixer(context),settings=freshStemSettings()
  const buffers=Object.fromEntries(settings.map(s=>[s.id,{duration:s.id==='vocals'?20:10}]))
  assert.throws(()=>mixer.load(buffers,settings),/相同时长/)
  assert.equal(mixer.tracks.size,0);assert.equal(mixer.play(),false)
})
test('small drift corrections preserve accumulated playback position across rate changes',()=>{
  let perf=10000
  const clock=createStudioClock({now:()=>perf});clock.add(9990,10010,{receivedAt:1010000,sentAt:1010000})
  const {context}=audioFixture();context.currentTime=10.03
  context.getOutputTimestamp=()=>({contextTime:context.currentTime,performanceTime:perf})
  const engine=new StudioSpeaker({context,clock,now:()=>perf})
  engine.room={source:{durationMs:60000},playing:true,positionMs:0,startsAt:1000000}
  engine.voice={source:new Node('source'),gain:new Node('gain'),basePosition:0,baseTime:0,rate:1,when:0}
  engine.correct();assert.equal(engine.voice.rate,.995)
  perf=12000;context.currentTime=12.03
  assert.ok(Math.abs(engine.position()-12.02)<1e-8)
  engine.correct();assert.ok(Math.abs(engine.position()-12.02)<1e-8)
  engine.dispose()
})
test('Demucs STFT layout and inverse retain interior audio and add the time branch',()=>{
  const length=8192,channels=[new Float32Array(length),new Float32Array(length)]
  for(let i=0;i<length;i++){channels[0][i]=Math.sin(2*Math.PI*440*i/44100)*.2;channels[1][i]=Math.sin(2*Math.PI*110*i/44100)*.1}
  const spec=demucsSpec(channels)
  assert.equal(spec.frames,8);assert.equal(spec.data.length,4*2048*8)
  const time=new Float32Array(length*2).fill(.03),result=demucsInverse(spec.data,time,length,spec.frames,1)[0]
  let error=0
  for(let c=0;c<2;c++)for(let i=2048;i<length-2048;i++)error+=(result[c][i]-channels[c][i]-.03)**2
  assert.ok(Math.sqrt(error/(2*(length-4096)))<.00001)
})
test('WAV export has a valid header and correctly interleaves bounded stereo samples',async()=>{
  const buffer={numberOfChannels:2,length:2,sampleRate:44100,getChannelData:c=>Float32Array.from(c?[1,-2]:[.5,-.5])}
  const bytes=await wavBlob(buffer).arrayBuffer(),view=new DataView(bytes)
  assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(view.getUint32(40,true),8)
  assert.equal(view.getUint16(22,true),2);assert.equal(view.getInt16(44,true),16384);assert.equal(view.getInt16(46,true),32767);assert.equal(view.getInt16(50,true),-32767)
})
test('cancelling separation terminates the heavy worker and rejects without late results',async()=>{
  let worker
  const controller=new AbortController(),buffer={getChannelData:()=>new Float32Array(10),numberOfChannels:2}
  const promise=separateStudioAudio({model:new ArrayBuffer(8),buffer,signal:controller.signal,workerFactory:()=>worker={postMessage(){},terminate(){this.terminated=true}}})
  controller.abort()
  await assert.rejects(promise,{name:'AbortError'});assert.equal(worker.terminated,true)
})
test('studio uses its own verified session and never places Cookie or credentials in URLs',async()=>{
  const calls=[],identity={userId:12,cookie:'MUSIC_U=private'}
  const fetchImpl=async(url,options)=>{calls.push({url,options});return response(url.endsWith('/session')?{token:'opaque',userId:'12'}:{room:null,version:0})}
  const api=createStudioApi({baseUrl:'https://backend.test',getIdentity:()=>identity,fetchImpl})
  await api.room()
  assert.equal(calls.length,2);assert.ok(calls[0].url.endsWith('/studio/session'))
  assert.equal(JSON.parse(calls[0].options.body).cookie,identity.cookie)
  assert.equal(calls[1].options.headers.Authorization,'Bearer opaque')
  assert.ok(calls.every(c=>!c.url.includes('private')&&!c.url.includes('opaque')))
  await api.reset();assert.equal(calls.at(-1).options.method,'DELETE')
})
test('a late identity exchange is revoked and cannot read the next account room',async()=>{
  const exchange=deferred(),calls=[];let identity={userId:12,cookie:'alice'}
  const api=createStudioApi({baseUrl:'',getIdentity:()=>identity,fetchImpl:async(url,options)=>{
    calls.push({url,options})
    if(options.method==='POST'&&url.endsWith('/session'))return exchange.promise
    return response(null)
  }})
  const request=api.room()
  await Promise.resolve();identity={userId:13,cookie:'bob'};void api.reset()
  exchange.resolve(response({token:'old-account',userId:'12'}))
  await assert.rejects(request,{name:'AbortError'});await new Promise(r=>setTimeout(r,0))
  assert.equal(calls.filter(c=>c.url.endsWith('/room')).length,0)
  assert.ok(calls.some(c=>c.options.method==='DELETE'&&c.options.headers.Authorization==='Bearer old-account'))
})
test('identity mismatch cannot authorize any private request',async()=>{
  const calls=[]
  const api=createStudioApi({baseUrl:'',getIdentity:()=>({userId:12,cookie:'alice'}),fetchImpl:async(url,options)=>{
    calls.push({url,options});return response(url.endsWith('/session')&&options.method==='POST'?{token:'wrong',userId:'13'}:null)
  }})
  await assert.rejects(api.room(),e=>e.status===401)
  assert.equal(calls.filter(c=>c.url.endsWith('/room')).length,0)
})
test('mutating the caller song while authentication is pending cannot change the imported track',async()=>{
  const exchange=deferred(),calls=[]
  const api=createStudioApi({baseUrl:'',getIdentity:()=>({userId:12,cookie:'alice'}),fetchImpl:async(url,options)=>{
    calls.push({url,options});return url.endsWith('/session')?exchange.promise:response({})
  }})
  const song={id:101,name:'original',durationMs:1000},request=api.importSong(song)
  song.id=999;song.name='changed';exchange.resolve(response({token:'opaque',userId:'12'}));await request
  const payload=JSON.parse(calls.find(c=>c.url.endsWith('/sources/import')).options.body)
  assert.equal(payload.songId,'101');assert.equal(payload.name,'original');assert.equal(payload.cookie,'alice')
})
test('a closed maintenance gate prevents session exchange and authenticated requests',async()=>{
  let calls=0,open=false
  const api=createStudioApi({baseUrl:'',getIdentity:()=>({userId:12,cookie:'alice'}),beforeRequest:()=>{if(!open)throw Error('maintenance')},fetchImpl:async(url)=>{calls++;return response(url.endsWith('/session')?{token:'token',userId:'12'}:{room:null,version:0})}})
  await assert.rejects(api.room(),/maintenance/);assert.equal(calls,0)
  open=true;await api.room();assert.equal(calls,2);open=false
  await assert.rejects(api.room(),/maintenance/);assert.equal(calls,2)
})
test('SSE parses bounded complete snapshots and rejects missing versions',async()=>{
  const events=[]
  const makeApi=payload=>createStudioApi({baseUrl:'',getIdentity:()=>({userId:12,cookie:'alice'}),fetchImpl:async(url)=>url.endsWith('/session')?response({token:'token',userId:'12'}):
    new Response('event: studio\ndata: '+JSON.stringify(payload)+'\n\n',{headers:{'content-type':'text/event-stream'}})})
  const api=makeApi({room:null,version:4})
  await assert.rejects(api.stream(new AbortController().signal,event=>events.push(event)),e=>e.status===503)
  assert.equal(events.length,1);assert.equal(events[0].data.version,4)
  await assert.rejects(makeApi({room:null}).stream(new AbortController().signal,()=>{}),e=>e.status===502)
})
test('binary source downloads refuse oversized bodies rather than allocating an unbounded audio buffer',async()=>{
  const api=createStudioApi({baseUrl:'',getIdentity:()=>({userId:12,cookie:'alice'}),fetchImpl:async(url)=>url.endsWith('/session')?response({token:'token',userId:'12'}):
    new Response('x',{headers:{'content-length':'33554433'}})})
  await assert.rejects(api.audio('source'),e=>e.status===413)
})

test('leaving the speaker tab aborts its pending identity exchange without a timeout error',async()=>{
  const started=deferred();let exchangeSignal
  const api=createStudioApi({baseUrl:'',getIdentity:()=>({userId:12,cookie:'MUSIC_U=fixture'}),fetchImpl:async(url,options)=>{
    if(url.endsWith('/session')&&options.method==='POST')return new Promise((resolve,reject)=>{exchangeSignal=options.signal;options.signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});started.resolve()})
    return response(null)
  }})
  const request=api.room();await started.promise;await api.reset()
  await assert.rejects(request,{name:'AbortError'});assert.equal(exchangeSignal.aborted,true)
})

test('identity exchange timeouts describe the account connection rather than local audio processing',async t=>{
  t.mock.timers.enable({apis:['setTimeout']})
  const started=deferred()
  const api=createStudioApi({baseUrl:'',getIdentity:()=>({userId:12,cookie:'MUSIC_U=fixture'}),fetchImpl:async(url,options)=>new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError')),{once:true});started.resolve()})})
  const request=api.room();await started.promise;t.mock.timers.tick(15000)
  await assert.rejects(request,error=>error.status===408&&error.message.includes('账号连接超时'))
})

test('audio upload timeouts identify the network transfer separately from local decoding',async t=>{
  t.mock.timers.enable({apis:['setTimeout']})
  const started=deferred()
  const api=createStudioApi({baseUrl:'',getIdentity:()=>({userId:12,cookie:'MUSIC_U=fixture'}),fetchImpl:async(url,options)=>{
    if(url.endsWith('/session'))return response({token:'opaque',userId:12})
    return new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError')),{once:true});started.resolve()})
  }})
  const request=api.upload(new Blob(['audio']),'fixture.wav',1000);await started.promise;t.mock.timers.tick(90000)
  await assert.rejects(request,error=>error.status===408&&error.message.includes('音源上传超时'))
})
