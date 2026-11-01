import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createSmartPlaylistApi,SmartPlaylistApiError} from '../src/api/smartPlaylistApi.js'
import {createSmartPlaylistWorkspace,createSmartPlaylistState} from '../src/utils/smartPlaylistWorkspace.js'
import {SMART_DEFAULT_RULES,SMART_TEMPLATES,copySmartRules,smartRulesError,smartTrackForPlayer} from '../src/utils/smartPlaylists.js'
const drain=async()=>{for(let i=0;i<18;i++)await Promise.resolve()}
const json=(data,status=200,message='error')=>new Response(JSON.stringify({code:status,data,message}),{status,headers:{'Content-Type':'application/json'}})
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
function clock(){let time=0,key=0;const jobs=new Map();return {schedule:(fn,ms)=>{jobs.set(++key,{fn,at:time+ms});return key},cancel:id=>jobs.delete(id),now:()=>time,async advance(ms){const end=time+ms;for(;;){const next=[...jobs].filter(([,job])=>job.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;jobs.delete(next[0]);time=next[1].at;next[1].fn();await drain()}time=end;await drain()},size:()=>jobs.size}}
function workspace(){
  let identity='alice',available=true;const timers=clock(),state=createSmartPlaylistState(),rows=new Map(),calls=[],played=[]
  rows.set('one',{id:'one',name:'第一张',rules:copySmartRules(),version:0})
  rows.set('two',{id:'two',name:'第二张',rules:copySmartRules(),version:0})
  const api={
    reset:async()=>{},
    list:async()=>[...rows.values()].map(row=>structuredClone(row)),
    get:async id=>{calls.push({type:'get',id});if(!rows.has(id))throw new SmartPlaylistApiError(404,'已删除');return structuredClone(rows.get(id))},
    create:async data=>{calls.push({type:'create',data:structuredClone(data)});const row={...structuredClone(data),id:'new-'+rows.size,version:0};rows.set(row.id,row);return structuredClone(row)},
    update:async(id,data)=>{calls.push({type:'update',id,data:structuredClone(data)});const old=rows.get(id);if(old.version!==data.version)throw new SmartPlaylistApiError(409,'版本冲突');const row={...structuredClone(data),id,version:old.version+1};rows.set(id,row);return structuredClone(row)},
    remove:async(id,version)=>{calls.push({type:'remove',id,version});if(rows.get(id).version!==version)throw new SmartPlaylistApiError(409,'版本冲突');rows.delete(id)},
    preview:async rules=>{calls.push({type:'preview',rules:structuredClone(rules)});return {tracks:[{id:'101',name:'A',artists:['Artist'],durationMs:180000}],librarySize:2,totalFavorites:2,matchedCount:1,warnings:[]}},
  }
  const engine=createSmartPlaylistWorkspace({api,state,getIdentityKey:()=>identity,isAvailable:()=>available,onPlay:async(tracks,index,signal)=>{if(signal.aborted)return false;played.push({tracks,index});return true},...timers})
  return {api,state,engine,timers,calls,rows,played,identity:value=>{identity=value},available:value=>{available=value}}
}

test('smart templates validate and never persist playback URLs or credentials in player metadata',()=>{
  for(const template of SMART_TEMPLATES)assert.equal(smartRulesError(template.rules),'')
  assert.ok(smartRulesError({...SMART_DEFAULT_RULES,minDurationSec:300,maxDurationSec:100}))
  assert.ok(smartRulesError({...SMART_DEFAULT_RULES,minPlays:3,maxPlays:0}))
  const song=smartTrackForPlayer({id:'101',name:'A',artists:['Artist'],album:'Album',durationMs:180000,cookie:'secret',url:'https://private.invalid?token=secret'})
  assert.deepEqual(song.artists,[{name:'Artist'}]);assert.doesNotMatch(JSON.stringify(song),/secret|private/);assert.equal(song.dt,180000)
})

test('library authentication is shared in flight, carried in headers and independent of playback claims',async()=>{
  const calls=[]
  const api=createSmartPlaylistApi({baseUrl:'https://admin.invalid',getIdentity:()=>({userId:123,cookie:'MUSIC_U=test'}),fetchImpl:async(url,options)=>{
    calls.push({url,options});return json(url.endsWith('/session')&&options.method==='POST'?{token:'private-token',userId:'123'}:[])
  }})
  await Promise.all([api.list(),api.list()])
  assert.equal(calls.filter(call=>call.url.endsWith('/session')).length,1)
  assert.ok(calls.every(call=>!call.url.includes('private-token')&&!call.url.includes('MUSIC_U')))
  assert.equal(calls.at(-1).options.headers.Authorization,'Bearer private-token')
  assert.equal(calls.at(-1).options.credentials,'omit');assert.ok(calls.every(call=>!call.url.includes('/claim')))
  await api.reset();assert.equal(calls.at(-1).options.method,'DELETE')
})

test('old-account reads are discarded even when the transport ignores cancellation',async()=>{
  let identity={userId:123,cookie:'MUSIC_U=alice'};const old=deferred()
  const api=createSmartPlaylistApi({baseUrl:'/backend-api',getIdentity:()=>identity,fetchImpl:async(url,options)=>{
    if(url.endsWith('/session'))return json(options.method==='POST'?{token:identity.userId+'',userId:identity.userId}:null)
    if(options.headers.Authorization==='Bearer 123')return old.promise
    return json([{id:'bob'}])
  }})
  const pending=api.list();await drain();identity={userId:456,cookie:'MUSIC_U=bob'};await api.reset()
  assert.deepEqual(await api.list(),[{id:'bob'}]);old.resolve(json([{id:'alice'}]));await assert.rejects(pending,error=>error.name==='AbortError');await api.reset()
})

test('a late old-account session is revoked and cannot replace the new account token',async()=>{
  let identity={userId:123,cookie:'MUSIC_U=alice'};const old=deferred(),revoked=[]
  const api=createSmartPlaylistApi({baseUrl:'/backend-api',getIdentity:()=>identity,fetchImpl:async(url,options)=>{
    if(options.method==='DELETE'){revoked.push(options.headers.Authorization);return json(null)}
    if(url.endsWith('/session'))return JSON.parse(options.body).cookie.includes('alice')?old.promise:json({token:'bob',userId:456})
    return json([{tokenOwner:options.headers.Authorization}])
  }})
  const pending=api.list();await drain();identity={userId:456,cookie:'MUSIC_U=bob'}
  assert.deepEqual(await api.list(),[{tokenOwner:'Bearer bob'}])
  old.resolve(json({token:'alice',userId:123}));await assert.rejects(pending,error=>error.name==='AbortError');await drain();assert.ok(revoked.includes('Bearer alice'))
  assert.deepEqual(await api.list(),[{tokenOwner:'Bearer bob'}]);await api.reset()
})

test('write payloads are frozen before authentication and conflicts never retry a mutation',async()=>{
  const auth=deferred(),writes=[]
  const api=createSmartPlaylistApi({baseUrl:'/backend-api',getIdentity:()=>({userId:123,cookie:'MUSIC_U=test'}),fetchImpl:async(url,options)=>{
    if(url.endsWith('/session'))return options.method==='POST'?auth.promise:json(null)
    writes.push(JSON.parse(options.body));return json(null,409,'版本冲突')
  }})
  const data={name:'A',rules:copySmartRules(),version:0},pending=api.update('one',data)
  data.rules.limit=500;auth.resolve(json({token:'test',userId:123}));await assert.rejects(pending,error=>error.status===409)
  assert.equal(writes.length,1);assert.equal(writes[0].rules.limit,50);await api.reset()
})

test('maintenance is checked again before sending and before accepting a private response',async()=>{
  let blocked=false;const auth=deferred();let calls=0
  const api=createSmartPlaylistApi({baseUrl:'/backend-api',getIdentity:()=>({userId:123,cookie:'MUSIC_U=test'}),beforeRequest:()=>{if(blocked)throw new SmartPlaylistApiError(503,'维护中')},fetchImpl:async(_url,options)=>{
    calls++;return options.method==='DELETE'?json(null):auth.promise
  }})
  const pending=api.list();blocked=true;auth.resolve(json({token:'test',userId:123}))
  await assert.rejects(pending,error=>error.status===503);assert.equal(calls,1);await api.reset()
})

test('opening a library never creates a rule or starts playback; edits coalesce into autosave',async()=>{
  const w=workspace();await w.engine.connect();assert.equal(w.calls.length,0);assert.equal(w.played.length,0)
  w.engine.change({rules:{likedDays:30}});await w.timers.advance(100);w.engine.change({rules:{artist:'周杰伦'}});await w.timers.advance(700)
  assert.equal(w.calls.filter(item=>item.type==='update').length,1)
  assert.equal(w.rows.get('one').rules.artist,'周杰伦');assert.equal(w.rows.get('one').version,1);assert.equal(w.engine.dirty(),false);assert.equal(w.played.length,0)
  w.engine.dispose();assert.equal(w.timers.size(),0)
})

test('overlapping edits serialize versions and cannot restore an older form value',async()=>{
  const w=workspace();await w.engine.connect();const gate=deferred(),original=w.api.update;let first=true
  w.api.update=async(id,data)=>{if(first){first=false;await gate.promise}return original(id,data)}
  w.engine.change({rules:{artist:'first'}});const a=w.engine.persist();await drain()
  w.engine.change({rules:{artist:'second'}});const b=w.engine.persist();gate.resolve();await Promise.all([a,b]);await drain()
  const updates=w.calls.filter(item=>item.type==='update');assert.deepEqual(updates.map(item=>item.data.version),[0,1]);assert.equal(w.state.rules.artist,'second');assert.equal(w.rows.get('one').rules.artist,'second');assert.equal(w.state.base.version,2);w.engine.dispose()
})

test('conflicts preserve the draft and require an explicit reload or clone',async()=>{
  const w=workspace();await w.engine.connect();w.rows.get('one').version=3
  w.engine.change({name:'我的条件',rules:{artist:'Artist'}});assert.equal(await w.engine.persist(),false)
  assert.equal(w.state.conflict,true);assert.equal(w.state.name,'我的条件');assert.equal(w.state.rules.artist,'Artist')
  const writes=w.calls.filter(item=>item.type==='update').length;await w.timers.advance(3000);assert.equal(w.calls.filter(item=>item.type==='update').length,writes)
  assert.equal(await w.engine.clone(),true);assert.equal(w.state.conflict,false);assert.equal(w.rows.get('one').name,'第一张');assert.equal(w.state.rules.artist,'Artist');w.engine.dispose()
})

test('switching does not discard invalid unsaved conditions and delete supports undo',async()=>{
  const w=workspace();await w.engine.connect();w.engine.change({name:''})
  assert.equal(await w.engine.choose('two'),false);assert.equal(w.state.selectedId,'one')
  w.engine.revert();assert.equal(await w.engine.choose('two'),true);assert.equal(await w.engine.remove(),true);assert.equal(w.rows.has('two'),false)
  assert.equal(await w.engine.undo(),true);assert.equal(w.state.name,'第二张');assert.equal(w.state.deleted,null);w.engine.dispose()
})

test('late previews and account switches never replace the current private list',async()=>{
  const w=workspace();await w.engine.connect();const old=deferred();w.api.preview=()=>old.promise
  const pending=w.engine.preview();w.identity('bob');w.engine.dispose();w.rows.clear();w.rows.set('bob',{id:'bob',name:'Bob',rules:copySmartRules(),version:0});await w.engine.connect()
  old.resolve({tracks:[{id:'alice'}],librarySize:1});await pending
  assert.equal(w.state.selectedId,'bob');assert.equal(w.state.preview,null);assert.equal(w.state.name,'Bob');w.engine.dispose()
})

test('playback recalculates matching tracks and refuses stale tracks or failed refreshes',async()=>{
  const w=workspace();await w.engine.connect();await w.engine.preview();w.api.preview=async()=>({tracks:[{id:'102'}],matchedCount:1,librarySize:2})
  assert.equal(await w.engine.play('101'),false);assert.equal(w.played.length,0);assert.equal(w.state.preview.tracks[0].id,'102')
  assert.equal(await w.engine.play(),true);assert.equal(w.played[0].tracks[0].id,'102')
  w.api.preview=async()=>{throw new SmartPlaylistApiError(503,'暂时无法同步')}
  assert.equal(await w.engine.play(),false);assert.equal(w.played.length,1);assert.equal(w.state.preview.tracks[0].id,'102')
  w.engine.dispose()
})

test('maintenance suspends autosave and cancels an in-flight play request',async()=>{
  const w=workspace();await w.engine.connect();w.engine.change({rules:{likedDays:7}})
  w.available(false);w.engine.suspend();await w.timers.advance(3000)
  assert.equal(w.calls.filter(item=>item.type==='update').length,0);assert.equal(w.played.length,0);assert.equal(w.timers.size(),0);w.engine.dispose()
})
test('opening and playing a saved rule reads its current cloud version',async()=>{
  const w=workspace();await w.engine.connect()
  const next={...w.rows.get('two'),name:'另一个设备的新规则',rules:{...SMART_DEFAULT_RULES,limit:20},version:2};w.rows.set('two',next)
  assert.equal(await w.engine.choose('two'),true);assert.equal(w.state.name,next.name);assert.equal(w.state.rules.limit,20)
  w.rows.set('two',{...next,rules:{...next.rules,limit:100},version:3})
  assert.equal(await w.engine.play(),true);assert.equal(w.state.base.version,3);assert.equal(w.calls.filter(item=>item.type==='preview').at(-1).rules.limit,100)
  w.engine.dispose()
})

test('switching away cancels an older play preparation instead of reopening its rule',async()=>{
  const w=workspace();await w.engine.connect();const old=deferred(),original=w.api.get
  w.api.get=async(id,options)=>id==='one'?old.promise:original(id,options)
  const playing=w.engine.play();await drain();await w.engine.choose('two')
  old.resolve(structuredClone(w.rows.get('one')));assert.equal(await playing,false);assert.equal(w.state.selectedId,'two');assert.equal(w.played.length,0);w.engine.dispose()
})

test('transport timeouts are actionable errors while caller cancellation stays silent',async context=>{
  context.mock.timers.enable({apis:['setTimeout']})
  const api=createSmartPlaylistApi({baseUrl:'/backend-api',getIdentity:()=>({userId:123,cookie:'MUSIC_U=test'}),fetchImpl:(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}))})
  const pending=api.list();context.mock.timers.tick(12001);await assert.rejects(pending,error=>error.status===408)
  await api.reset()
})
