import {test} from 'node:test'
import assert from 'node:assert/strict'
import {captureRelaySnapshot,restoreRelaySnapshot,relayTrack} from '../src/utils/playbackRelayProtocol.js'
import {createPlaybackRelay,createPlaybackRelayState} from '../src/utils/playbackRelayClient.js'
import {createPlaybackRelayApi} from '../src/api/playbackRelayApi.js'

const drain=async()=>{for(let n=0;n<15;n++)await Promise.resolve()}
const clone=value=>structuredClone(value)
function clock(){let at=0,id=0;const timers=new Map();return {now:()=>at,schedule:(fn,delay)=>{timers.set(++id,{fn,at:at+delay});return id},cancel:key=>timers.delete(key),async advance(ms){const end=at+ms;for(;;){const next=[...timers].filter(([,item])=>item.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;timers.delete(next[0]);at=next[1].at;next[1].fn();await drain()}at=end;await drain()},size:()=>timers.size}}
function hub(){
  const sessions=new Map(),records=new Map(),listeners=new Map(),writes=[];let serial=0,reads=0,claims=0
  const record=token=>{const session=sessions.get(token);if(!session)throw Object.assign(Error('expired'),{status:401});return records.get(session.userId)}
  const event=value=>({generation:value.generation,revision:value.revision,ownerDeviceId:value.ownerDeviceId,ownerDeviceName:value.ownerDeviceName})
  const broadcast=(token,value)=>{const user=sessions.get(token).userId;for(const [key,callback]of listeners)if(sessions.get(key)?.userId===user)callback({name:'playback',data:event(value)})}
  const api={async exchange(body){const userId=body.cookie.split('=')[1];const token='test-'+ ++serial;sessions.set(token,{...body,userId});if(!records.has(userId))records.set(userId,{queue:[],queueIndex:0,generation:0,revision:0,positionMs:0,durationMs:180000,playMode:'sequence'});return {token,userId}},async read(token){reads++;return clone(record(token))},async claim(token){claims++;const value=record(token);value.generation++;value.revision++;value.ownerDeviceId=sessions.get(token).deviceId;value.ownerDeviceName=sessions.get(token).deviceName;value.playing=false;value.seq=0;broadcast(token,value);return clone(value)},async checkpoint(token,body){const value=record(token);if(value.ownerDeviceId!==sessions.get(token).deviceId||value.generation!==body.generation)throw Object.assign(Error('taken'),{status:409});writes.push(clone(body));if(body.sequence>value.seq){Object.assign(value,clone(body),{revision:value.revision+1,sourceDeviceId:sessions.get(token).deviceId,sourceDeviceName:sessions.get(token).deviceName,seq:body.sequence});broadcast(token,value)}return event(value)},async revoke(token){sessions.delete(token);listeners.delete(token)},stream(token,signal,callback){listeners.set(token,callback);callback({name:'playback',data:event(record(token))});return new Promise(resolve=>signal.addEventListener('abort',()=>{listeners.delete(token);resolve()},{once:true}))}}
  return {api,writes,records,get reads(){return reads},get claims(){return claims},listeners}
}
function device(server,id,userId='101'){
  const timers=clock(),state=createPlaybackRelayState();let identity={userId,cookie:'MUSIC_U='+userId},paused=0,applied=0,available=true
  const player={currentSong:{id:101,name:'测试歌曲',artists:[{name:'歌手'}],url:'https://private.invalid/audio?token=secret'},playQueue:[{id:101,name:'测试歌曲',artists:[{name:'歌手'}]}],currentQueueIndex:0,currentTimeMs:32000,durationMs:180000,isPlaying:false,playMode:'shuffle'}
  const engine=createPlaybackRelay({api:server.api,state,deviceId:id,deviceName:id,clientType:'WEB',getIdentity:()=>identity,getSnapshot:full=>captureRelaySnapshot(player,full),pauseLocal(){paused++;player.isPlaying=false},async applyRemote(value,signal){if(signal.aborted)return false;applied++;const restored=restoreRelaySnapshot(value);Object.assign(player,{playQueue:restored.queue,currentSong:restored.song,currentQueueIndex:restored.queueIndex,currentTimeMs:restored.resumeMs,isPlaying:true,playMode:restored.playMode});return true},isAvailable:()=>available,...timers})
  return {engine,state,player,timers,get paused(){return paused},get applied(){return applied},identity:value=>{identity=value},available:value=>{available=value}}
}

test('relay strips audio credentials and keeps repeated queue entries, progress and local settings separate',()=>{
  const song={id:101,name:'歌',artists:[{name:'A'}],url:'https://private.invalid?token=secret',cookie:'secret',cover:'javascript:alert(1)'}
  const player={currentSong:song,playQueue:[song,song],currentQueueIndex:1,currentTimeMs:45000,pendingResumeMs:60000,durationMs:180000,isPlaying:true,playMode:'shuffle',volume:.2,audioQuality:'lossless'}
  const snapshot=captureRelaySnapshot(player)
  assert.equal(snapshot.queueIndex,1);assert.equal(snapshot.positionMs,60000);assert.doesNotMatch(JSON.stringify(snapshot),/secret|url|volume|lossless|javascript/)
  const restored=restoreRelaySnapshot({...snapshot,positionMs:180000});assert.equal(restored.queueIndex,1);assert.equal(restored.resumeMs,178500);assert.deepEqual(restored.song.artists,[{name:'A'}]);assert.equal(restored.playMode,'shuffle')
  assert.throws(()=>relayTrack({id:'local-file'}));assert.throws(()=>captureRelaySnapshot({...player,playQueue:Array(5001).fill(song)}),/5000/)
  const absent={...player,playQueue:[{id:102}],currentQueueIndex:0};assert.equal(captureRelaySnapshot(absent,true).queueIndex,1);assert.equal(captureRelaySnapshot(absent,false).queueIndex,1)
})

test('an idle device never replaces playback; explicit handoff restores queue and pauses the prior owner',async()=>{
  const server=hub(),a=device(server,'web'),b=device(server,'desktop'),other=device(server,'other','202')
  await a.engine.connect();a.player.isPlaying=true;a.engine.userPlaying(true);await drain()
  assert.equal(a.state.owned,true);assert.equal(server.writes.length,1)
  await b.engine.connect();await other.engine.connect();assert.equal(b.state.owned,false);assert.equal(server.writes.length,1);assert.equal(other.state.remote.queue.length,0)
  assert.equal(b.engine.hasOffer(),true);assert.equal(b.applied,0)
  assert.equal(await b.engine.accept(),true);await drain()
  assert.equal(a.paused,1);assert.equal(a.player.isPlaying,false);assert.equal(a.state.owned,false);assert.equal(b.player.currentTimeMs,32000);assert.equal(b.player.playMode,'shuffle');assert.equal(b.state.owned,true)
  const writes=server.writes.length;await a.engine.flush();assert.equal(server.writes.length,writes)
  a.engine.stop();b.engine.stop();other.engine.stop();assert.equal(a.timers.size(),0)
})

test('connected devices use push, metadata is sent once and progress checkpoints remain small',async()=>{
  const server=hub(),a=device(server,'a');await a.engine.connect();a.player.isPlaying=true;a.engine.userPlaying(true);await drain();const reads=server.reads
  await a.timers.advance(30000);assert.equal(server.reads,reads);assert.equal(server.writes.filter(item=>item.queue).length,1);assert.equal(server.writes.length,4)
  a.player.playQueue.push({id:102,name:'next'});a.engine.localChanged(true);await a.timers.advance(300);assert.equal(server.writes.at(-1).queue.length,2)
  a.player.currentTimeMs=60000;a.engine.localChanged();await a.timers.advance(300);assert.equal(server.writes.at(-1).queue,undefined);assert.equal(server.writes.at(-1).positionMs,60000)
  a.engine.stop()
})

test('logout/account switch discards late reads and never uploads into the previous account',async()=>{
  const server=hub(),a=device(server,'a');await a.engine.connect();const original=server.api.read;let resolve
  server.api.read=()=>new Promise(done=>resolve=done);const pending=a.engine.refresh();a.identity({userId:'202',cookie:'MUSIC_U=202'});a.engine.stop();resolve({queue:[{id:999}],revision:999,generation:999});await pending
  assert.equal(a.state.remote,null);assert.equal(a.state.owned,false);assert.equal(a.state.connected,false)
  server.api.read=original;await a.engine.connect();assert.equal(a.state.remote.queue.length,0);assert.equal(server.writes.length,0);a.engine.stop()
})

test('takeover aborts in-flight resume and ignores a late claim from an older generation',async()=>{
  const server=hub(),a=device(server,'a'),b=device(server,'b');await a.engine.connect();a.player.isPlaying=true;a.engine.userPlaying(true);await drain();await b.engine.connect()
  const original=server.api.claim;let release
  server.api.claim=async token=>{const value=await original(token);return new Promise(resolve=>release=()=>resolve(value))}
  const accepting=b.engine.accept();await drain();server.api.claim=original;a.engine.userIntent();await drain();release();assert.equal(await accepting,false);assert.equal(b.applied,0);assert.equal(b.state.owned,false)
  a.engine.stop();b.engine.stop()
})

test('maintenance and disabled preferences prevent connections, claims and writes',async()=>{
  const server=hub(),a=device(server,'a');a.available(false);assert.equal(await a.engine.connect(),false);assert.equal(server.claims,0)
  a.available(true);await a.engine.connect();a.state.enabled=false;a.player.isPlaying=true;a.engine.userPlaying(true);assert.equal(await a.engine.accept(),false);assert.equal(server.claims,0);a.engine.stop()
})

test('SSE decodes fragmented UTF-8/CRLF with bearer headers and no credential in its URL',async()=>{
  const calls=[],events=[],encoder=new TextEncoder();const bytes=encoder.encode('event: playback\r\ndata: {"generation":2,"device":"手机"}\r\n\r\nevent: heartbeat\ndata: 123\n\n')
  const api=createPlaybackRelayApi({baseUrl:'https://admin.invalid/',fetchImpl:async(url,options)=>{calls.push({url,options});return new Response(new ReadableStream({start(controller){for(let n=0;n<bytes.length;n+=3)controller.enqueue(bytes.slice(n,n+3));controller.close()}}),{headers:{'Content-Type':'text/event-stream'}})}})
  await api.stream('relay_secret',new AbortController().signal,event=>events.push(event))
  assert.equal(calls[0].url,'https://admin.invalid/api/v1/playback/events');assert.equal(calls[0].options.headers.Authorization,'Bearer relay_secret');assert.equal(calls[0].options.credentials,'omit');assert.equal(events[0].data.device,'手机');assert.equal(events[1].data,123)
})
test('late checkpoint failure from an old lease cannot cancel a newly acquired lease',async()=>{
  const server=hub(),a=device(server,'a'),b=device(server,'b');await a.engine.connect();a.player.isPlaying=true;a.engine.userPlaying(true);await drain();await b.engine.connect()
  const original=server.api.checkpoint;let rejectOld
  server.api.checkpoint=(...args)=>rejectOld?original(...args):new Promise((_resolve,reject)=>rejectOld=reject)
  const old=a.engine.flush();await drain();await b.engine.accept();await drain()
  server.api.checkpoint=original;a.player.isPlaying=true;a.engine.userIntent();await drain()
  rejectOld(Object.assign(Error('old lease'),{status:409}));await old;await drain();await a.timers.advance(300)
  assert.equal(a.state.owned,true);assert.equal(a.player.isPlaying,true);assert.equal(a.state.error,'');a.engine.stop();b.engine.stop()
})

test('a local selection during a pending handoff is serialized and wins over the superseded restore',async()=>{
  const server=hub(),a=device(server,'a'),b=device(server,'b');await a.engine.connect();a.player.isPlaying=true;a.engine.userPlaying(true);await drain();await b.engine.connect()
  const original=server.api.claim;let release
  server.api.claim=async token=>{const value=await original(token);return new Promise(resolve=>release=()=>resolve(value))}
  const accepting=b.engine.accept();await drain();server.api.claim=original
  b.player.currentSong={id:102,name:'用户新选的歌'};b.player.playQueue=[b.player.currentSong];b.player.currentTimeMs=0;b.player.isPlaying=true;b.engine.userIntent()
  release();assert.equal(await accepting,false);await drain()
  assert.equal(b.applied,0);assert.equal(b.state.owned,true);assert.equal(server.records.get('101').queue[0].id,'102');assert.equal(b.state.busy,false)
  a.engine.stop();b.engine.stop()
})

test('disconnected streams use bounded reconnect and ten-second reads without claiming an idle player',async()=>{
  const server=hub(),a=device(server,'a');let streams=0
  server.api.stream=async()=>{streams++;throw Object.assign(Error('offline'),{status:503})}
  await a.engine.connect();await drain();assert.equal(a.state.connected,false);await a.timers.advance(30000)
  assert.equal(server.reads,4);assert.ok(streams<=5);assert.equal(server.claims,0);a.engine.stop();assert.equal(a.timers.size(),0)
})

test('unsupported large queues do not kill the periodic worker or send partial metadata',async()=>{
  const server=hub(),a=device(server,'a');await a.engine.connect();a.player.playQueue=Array(5001).fill(a.player.currentSong);a.player.isPlaying=true;a.engine.userPlaying(true);await drain()
  await a.timers.advance(20000);assert.match(a.state.error,/5000/);assert.equal(server.writes.length,0)
  a.player.playQueue=[a.player.currentSong];a.engine.localChanged(true);await a.timers.advance(300);assert.equal(server.writes.length,1);a.engine.stop()
})

test('SSE rejects oversized multiline events even when each individual chunk is small',async()=>{
  let canceled=false
  const api=createPlaybackRelayApi({baseUrl:'/backend-api',fetchImpl:async()=>new Response(new ReadableStream({start(controller){for(let i=0;i<100;i++)controller.enqueue(new TextEncoder().encode('data: '+ 'x'.repeat(1000)+'\n'))},cancel(){canceled=true}}),{headers:{'Content-Type':'text/event-stream'}})})
  await assert.rejects(api.stream('test',new AbortController().signal,()=>assert.fail('invalid oversized event accepted')),error=>error.status===502)
  assert.equal(canceled,true)
})
