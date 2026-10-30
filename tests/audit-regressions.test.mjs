import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {reactive, ref, computed, watch, effectScope, getCurrentScope, onScopeDispose} from 'vue'
import {usePlayerReporting} from '../src/composables/usePlayerReporting.js'
import {ExpiringCache} from '../src/utils/expiringCache.js'
import {createMaintenanceStream} from '../src/utils/maintenanceStream.js'

const flush = () => new Promise(resolve => setImmediate(resolve))
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8')
function hook(path, exported, extra = {}) {
  const code = read(path).replace(/^import[^\n]*\n/gm,'').replaceAll('export function','function')
  const deps = {ref, computed, watch, getCurrentScope, onScopeDispose, ...extra}
  return Function(...Object.keys(deps), code+'\nreturn '+exported)(...Object.values(deps))
}

test('audio cache expires early, remains bounded and preserves recent entries', () => {
  let time = 0
  const cache = new ExpiringCache({max:2, ttl:10000, now:()=>time})
  cache.set('a',{entry:{expi:1}}); time=901
  assert.equal(cache.get('a'),undefined)
  cache.set('a',1);cache.set('b',2);cache.get('a');cache.set('c',3)
  assert.equal(cache.has('b'),false);assert.equal(cache.size,2)
})

test('playback snapshots keep one session; single repeat starts another; seeks do not count as listening', () => {
  let time=0
  const audio={currentTime:0,duration:180,paused:false,playbackRate:1}, reports=[]
  const player=usePlayerReporting({reportApi:{getUserKey:()=> '99',reportPlayRecord:value=>reports.push(value)},getCurrentSong:()=>({id:101,name:'song'}),getCurrentAudio:()=>audio,getArtistNames:()=>[],now:()=>time})
  player.reportCurrentPlayRecord({started:true})
  for(let second=1;second<=180;second++){time=second*1000;audio.currentTime=second;player.samplePlayback()}
  player.reportCurrentPlayRecord({completed:true})
  assert.equal(reports.at(-1).playDuration,180)
  assert.equal(reports.at(-1).sessionId,reports[0].sessionId)
  audio.currentTime=0;player.reportCurrentPlayRecord({started:true})
  assert.notEqual(reports.at(-1).sessionId,reports[0].sessionId)
  time+=1000;audio.currentTime=170;player.samplePlayback();player.reportCurrentPlayRecord()
  assert.equal(reports.at(-1).playDuration,0)
})

test('QR requests stay serial and cleanup rejects late responses', async () => {
  let requests=0,resolveCheck,scheduled=[]
  const userApi={getQrKey:async()=>({data:{data:{unikey:'key'}}}),getQrCode:async()=>({data:{data:{qrimg:'image'}}}),checkQrCode:()=>{requests++;return new Promise(resolve=>resolveCheck=resolve)}}
  const create=hook('src/composables/useQrLogin.js','useQrLogin',{userApi,reportApi:{},setTimeout:fn=>{scheduled.push(fn);return fn},clearTimeout:fn=>{scheduled=scheduled.filter(item=>item!==fn)}})
  const qr=create({},()=>{},()=>{})
  await qr.startQrLogin();await flush()
  assert.equal(requests,1);assert.equal(scheduled.length,0)
  qr.cleanup();resolveCheck({data:{code:802,nickname:'late'}});await flush()
  assert.notEqual(qr.qrState.value,'confirm');assert.equal(scheduled.length,0)
})

test('messages remain in the selected conversation after another send finishes; account switch clears private data', async () => {
  let finishSend
  const userApi={sendPrivateMessage:()=>new Promise(resolve=>finishSend=resolve),getPrivateMessages:async()=>({data:{msgs:[]}}),getPrivateHistory:async id=>({data:{msgs:[{id,time:Number(id),msg:JSON.stringify({msg:'history-'+id}),fromUser:{userId:Number(id)}}]}})}
  const create=hook('src/composables/useMessageCenter.js','useMessageCenter',{userApi,searchApi:{},window:{innerWidth:390}})
  const user=reactive({userId:99,getUserCookie:'a'}),scope=effectScope()
  const center=scope.run(()=>create(user))
  try {
    center.selectPrivateTarget({userId:1});await flush();center.privateContent.value='for A'
    const sending=center.submitPrivateMessage();center.selectPrivateTarget({userId:2});await flush()
    finishSend({data:{code:200}});await sending
    assert.equal(center.privateHistory.value[0].content,'history-2')
    user.userId=100
    assert.deepEqual(center.privateHistory.value,[]);assert.equal(center.selectedPrivateTarget.value,null)
  } finally {scope.stop()}
})

test('SSE accepts validated snapshots, falls back on disconnect and ignores closed connections', () => {
  const sources=[],statuses=[],connections=[]
  class Source {handlers={};constructor(){sources.push(this)}addEventListener(name,fn){this.handlers[name]=fn}close(){this.closed=true}}
  const timers=new Map();let id=0
  const stream=createMaintenanceStream({url:'/status/events',EventSourceImpl:Source,onStatus:s=>statuses.push(s),onConnection:s=>connections.push(s),schedule:fn=>{timers.set(++id,fn);return id},cancel:id=>timers.delete(id)})
  sources[0].handlers.maintenance({data:JSON.stringify({enabled:true})})
  assert.equal(statuses[0].enabled,true);assert.equal(connections.at(-1),true)
  sources[0].onerror();assert.equal(connections.at(-1),false)
  stream.stop();sources[0].handlers.maintenance({data:'{"enabled":false}'})
  assert.equal(statuses.length,1);assert.equal(timers.size,0)
})

test('failed profile synchronization does not suppress the next attempt', async () => {
  let calls=0
  const storage=new Map()
  const code=read('src/api/reportApi/reportApi.js').replace(/^import[^\n]*\n/gm,'').replace('export const reportApi','const reportApi').replaceAll('import.meta.env.DEV','false')
  const api=Function('requestLocal','unwrapBackendResponse','useCounterStore','localStorage',code+'\nreturn reportApi')(
    {post:async()=>{calls++;if(calls===1)throw Error('offline');return {data:{code:200,data:{}}}}},r=>r.data.data,()=>({userId:99}),{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)})
  await api.syncNeteaseUser({userId:99});await api.syncNeteaseUser({userId:99});await api.syncNeteaseUser({userId:99})
  assert.equal(calls,2)
})

test('dwell counts foreground segments once and excludes hidden time', () => {
  let time=0,afterEach
  class Clock extends Date {static now(){return time}}
  const events={},windowEvents={},reports=[]
  const document={visibilityState:'visible',documentElement:{scrollHeight:100},body:{scrollHeight:100},addEventListener:(name,fn)=>events[name]=fn}
  const window={innerHeight:100,location:{pathname:'/home'},addEventListener:(name,fn)=>windowEvents[name]=fn}
  const code=read('src/utils/behaviorTracker.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export function','function').replaceAll('import.meta.env.DEV','false')
  const install=Function('reportApi','window','document','localStorage','Date',code+'\nreturn installBehaviorTracker')({reportBehavior:value=>reports.push(JSON.parse(value.actionDetail))},window,document,{getItem:()=>null},Clock)
  install({currentRoute:{value:{name:'home',fullPath:'/home'}},afterEach:fn=>afterEach=fn})
  time=10000;document.visibilityState='hidden';events.visibilitychange()
  time=70000;document.visibilityState='visible';events.visibilitychange()
  time=80000;afterEach({name:'discover',fullPath:'/discover'})
  assert.deepEqual(reports.map(report=>report.durationSec),[10,10])
})

test('an old personal profile cannot replace the logged-in account', async () => {
  const source=read('src/view/profile/profile.vue')
  const start=source.indexOf('async function loadProfilePage()')
  const body=source.slice(start,source.indexOf('onMounted(async () =>',start))
  const pending=[]
  const userStore={userId:101,getUserCookie:'a',setProfile(value){this.userId=value.userId}}
  const create=Function('userStore','userApi',`let profileLoadSequence=0,profileUnmounted=false;const loading={value:false},error={value:''},profile={value:{}},level={value:{}},playlists={value:[]},listeningRange={value:'week'};const pickAvatarTheme=async()=>{},loadCloudSongs=async()=>{},setListeningRange=async()=>{};const reportApi={syncNeteaseUser:()=>{}};\n`+body+'\nreturn loadProfilePage')
  const load=create(userStore,{getUserDetail:id=>new Promise(resolve=>pending.push({id,resolve})),getUserLevel:async()=>({data:{data:{level:1}}}),getUserPlaylist:async()=>({data:{playlist:[]}})})
  const old=load();userStore.userId=202;userStore.getUserCookie='b';const current=load()
  pending[1].resolve({data:{profile:{userId:202}}});await current
  pending[0].resolve({data:{profile:{userId:101}}});await old
  assert.equal(userStore.userId,202);assert.equal(userStore.getUserCookie,'b')
})

test('a playlist subscription updates only the submitted playlist and reports its actual ID', async () => {
  const source=read('src/view/playlistDetail/playlistDetail.vue')
  const body=source.slice(source.indexOf('async function toggleSubscribePlaylist()'),source.indexOf('function getTrackItemStyle('))
  let finish,requested;const reports=[],playlist={value:{id:1,subscribed:false,subscribedCount:0}}
  const toggle=Function('userStore','playlist','subscribing','actionFeedback','playListsApi','triggerPlaylistLikeAnimation','reportApi',body+'\nreturn toggleSubscribePlaylist')({isLoggedIn:true,userId:99},playlist,{value:false},{value:''},{subscribePlayList:id=>{requested=id;return new Promise(resolve=>finish=resolve)}},()=>{},{reportCollection:value=>reports.push(value)})
  const action=toggle();playlist.value={id:2,subscribed:false,subscribedCount:0};finish({});await action
  assert.equal(requested,1);assert.equal(playlist.value.subscribed,false);assert.equal(reports[0].targetId,1)
})


test('SSE constructor failure keeps fallback active; stale timed-out sources cannot overwrite a new connection', () => {
  const timers=new Map(), sources=[], statuses=[], connections=[];let id=0, time=0, attempts=0
  class Source {
    handlers={}
    constructor(){if(++attempts===1)throw Error('unsupported');sources.push(this)}
    addEventListener(name,fn){this.handlers[name]=fn}
    close(){this.closed=true}
  }
  const stream=createMaintenanceStream({url:'/events',EventSourceImpl:Source,onStatus:s=>statuses.push(s),onConnection:s=>connections.push(s),now:()=>time,
    schedule:fn=>{timers.set(++id,fn);return id},cancel:id=>timers.delete(id)})
  const tick=()=>{const [id,fn]=timers.entries().next().value;timers.delete(id);fn()}
  assert.equal(connections.at(-1),false);tick()
  time=46000;tick();assert.equal(sources[0].closed,true);tick()
  sources[1].handlers.maintenance({data:'{"enabled":true}'})
  sources[0].handlers.maintenance({data:'{"enabled":false}'})
  sources[0].onerror()
  assert.equal(statuses.length,1);assert.equal(statuses[0].enabled,true);assert.equal(connections.at(-1),true)
  stream.stop();assert.equal(timers.size,0)
})

test('late QR restriction logout cannot clear a newer account', async () => {
  let finishLogout,logoutStarted=false
  const store={getUserCookie:'',userId:null,setLogin(cookie,profile){this.getUserCookie=cookie;if(profile)this.userId=profile.userId},logout(){throw Error('new account must stay signed in')}}
  const userApi={getQrKey:async()=>({data:{data:{unikey:'k'}}}),getQrCode:async()=>({data:{data:{qrimg:'i'}}}),
    checkQrCode:async()=>({data:{code:803,cookie:'old-cookie'}}),getUserInfo:async()=>({data:{profile:{userId:99}}}),
    logout:()=>{logoutStarted=true;return new Promise(resolve=>finishLogout=resolve)}}
  const create=hook('src/composables/useQrLogin.js','useQrLogin',{userApi,reportApi:{syncNeteaseUser:async()=>({status:'BANNED'})}})
  const qr=create(store,()=>{},()=>{})
  await qr.startQrLogin();await flush();assert.equal(logoutStarted,true)
  qr.cleanup();store.getUserCookie='new-cookie';store.userId=100;finishLogout();await flush()
  assert.equal(store.getUserCookie,'new-cookie');assert.equal(store.userId,100)
})
