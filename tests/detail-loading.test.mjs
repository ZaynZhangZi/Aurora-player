import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequestCache} from '../src/utils/requestCache.js'
import {loadPlaylistPages} from '../src/utils/playlistPages.js'
import {runWhenVisible} from '../src/utils/deferredWork.js'

const flush = () => new Promise(resolve => setImmediate(resolve))
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const deferred = () => {let resolve, reject;const promise = new Promise((a,b) => {resolve=a;reject=b});return {promise,resolve,reject}}

test('preload and page share a request; canceling one preserves the other', async () => {
  const cache=createRequestCache(), value=deferred(), controller=new AbortController();let calls=0, requestSignal
  const fetch=signal=>{calls++;requestSignal=signal;return value.promise}
  const hover=cache.load('album:1',fetch),page=cache.load('album:1',fetch,{signal:controller.signal})
  controller.abort();await assert.rejects(page,{name:'AbortError'});await flush()
  assert.equal(calls,1);assert.equal(requestSignal.aborted,false)
  value.resolve({name:'album'});assert.equal((await hover).name,'album')
})

test('abandoned reads abort and cannot cache a late response', async () => {
  const cache=createRequestCache(),old=deferred(),controller=new AbortController();let signal
  const first=cache.load('1',s=>{signal=s;return old.promise},{signal:controller.signal});await flush()
  controller.abort();await assert.rejects(first,{name:'AbortError'});assert.equal(signal.aborted,true)
  old.resolve('old');await flush();assert.equal(await cache.load('1',async()=> 'new'),'new')
})

test('detail cache bounds lifetime and size and isolates mutations', async () => {
  let time=0,calls=0;const cache=createRequestCache({max:2,ttl:20,now:()=>time}),fetch=async()=>({items:[++calls]})
  const first=await cache.load('a',fetch);first.items[0]=99
  assert.deepEqual((await cache.load('a',fetch)).items,[1])
  await cache.load('b',fetch);await cache.load('c',fetch);await cache.load('a',fetch);assert.equal(calls,4)
  time=21;await cache.load('a',fetch);assert.equal(calls,5)
})

test('failed reads retry and invalidation rejects pending stale data', async () => {
  const cache=createRequestCache();await assert.rejects(cache.load('1',async()=>{throw Error('offline')}))
  assert.equal(await cache.load('1',async()=> 'retry'),'retry')
  cache.invalidate('1');const old=deferred(),request=cache.load('1',()=>old.promise);await flush();cache.invalidate('1');old.resolve('stale')
  await assert.rejects(request,{name:'AbortError'});assert.equal(await cache.load('1',async()=> 'fresh'),'fresh')
})

test('JSON details stay isolated in browsers without structuredClone', async () => {
  const original=globalThis.structuredClone
  globalThis.structuredClone=undefined
  try {
    const cache=createRequestCache(),first=await cache.load('1',async()=>({name:'album'}))
    first.name='changed';assert.equal((await cache.load('1',async()=>null)).name,'album')
  } finally {globalThis.structuredClone=original}
})

function detailLoader(store, check) {
  const code=source('src/utils/detailResourceCache.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ','')
  return Function('useCounterStore','assertMaintenanceRequest','createRequestCache',code+'\nreturn loadDetailResource')(()=>store,check,createRequestCache)
}

test('cached details remain account-scoped and obey maintenance checks', async () => {
  const store={userId:1,getUserCookie:'a'};let blocked=false,calls=0
  const load=detailLoader(store,()=>{if(blocked)throw Error('maintenance')})
  const fetch=async()=>({data:{code:200,user:++calls}})
  assert.equal((await load('playlist',1,{},fetch)).data.user,1)
  blocked=true;await assert.rejects(load('playlist',1,{},fetch),/maintenance/);blocked=false
  store.userId=2;store.getUserCookie='b';assert.equal((await load('playlist',1,{},fetch)).data.user,2)
})

test('switching accounts rejects a pending response without requiring another read', async () => {
  const store={userId:1,getUserCookie:'a'},old=deferred(),load=detailLoader(store,()=>{})
  const request=load('playlist',1,{},()=>old.promise);await flush();store.getUserCookie='b';old.resolve({data:{name:'private'}})
  await assert.rejects(request,{name:'AbortError'})
})

test('playlist pages reuse the prefix and preserve the full ordered playback queue', async () => {
  const all=Array.from({length:350},(_,i)=>({id:i+1})),offsets=[]
  const result=await loadPlaylistPages({initial:all.slice(0,150),total:350,idle:async()=>true,fetchPage:async(limit,offset)=>{offsets.push(offset);return all.slice(offset,offset+limit)}})
  assert.deepEqual(offsets,[150,250]);assert.deepEqual(result.map(s=>s.id),all.map(s=>s.id))
  await loadPlaylistPages({initial:all,total:350,idle:async()=>{throw Error('unnecessary work')},fetchPage:()=>{throw Error('unnecessary fetch')}})
})

test('leaving a playlist cancels later batches and discards canceled results', async () => {
  const controller=new AbortController();let calls=0
  const result=await loadPlaylistPages({initial:[{id:1}],total:501,signal:controller.signal,idle:async()=>true,fetchPage:async()=>{calls++;controller.abort();return [{id:2}]}})
  assert.equal(calls,2);assert.deepEqual(result,[{id:1}])
})

test('secondary sections wait for visibility and foreground; disposal cancels idle work', async () => {
  const descriptors=new Map(['window','document','IntersectionObserver'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
  const events={},idle=new Map();let callback,id=0,calls=0
  Object.defineProperty(globalThis,'window',{configurable:true,value:{requestIdleCallback:fn=>{idle.set(++id,fn);return id},cancelIdleCallback:id=>idle.delete(id)}})
  Object.defineProperty(globalThis,'document',{configurable:true,value:{hidden:false,addEventListener:(key,fn)=>events[key]=fn,removeEventListener:key=>delete events[key]}})
  Object.defineProperty(globalThis,'IntersectionObserver',{configurable:true,value:class{constructor(fn){callback=fn}observe(){}disconnect(){}}})
  try {
    runWhenVisible({},()=>calls++);assert.equal(idle.size,0)
    document.hidden=true;callback([{isIntersecting:true}]);assert.equal(idle.size,0)
    document.hidden=false;events.visibilitychange();idle.values().next().value();await flush();assert.equal(calls,1)
    const next=new AbortController();runWhenVisible({},()=>calls++,{signal:next.signal});callback([{isIntersecting:true}]);next.abort();await flush();assert.equal(calls,1);assert.equal(idle.size,0)
  } finally {for(const [key,value] of descriptors)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key]}
})

test('hover intent is canceled on leave, changed data or disposal', context => {
  context.mock.timers.enable({apis:['setTimeout']})
  const calls=[],handlers={}
  const code=source('src/directives/detailPrefetch.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ','')
  const directive=Function('prefetchDetail',code+'\nreturn createDetailPrefetchDirective')((router,type,id)=>calls.push([type,id]))({})
  const el={isConnected:true,contains:()=>false,addEventListener:(name,fn)=>handlers[name]=fn,removeEventListener:name=>delete handlers[name]}
  directive.mounted(el,{value:{type:'album',id:1}})
  handlers.pointerenter();context.mock.timers.tick(80);handlers.pointerleave({relatedTarget:null});context.mock.timers.tick(100);assert.equal(calls.length,0)
  handlers.focusin();directive.updated(el,{value:{type:'album',id:1}});context.mock.timers.tick(120);assert.deepEqual(calls,[['album',1]])
  handlers.pointerenter();directive.updated(el,{value:{type:'album',id:2}});context.mock.timers.tick(120);assert.equal(calls.length,1)
  handlers.pointerdown();assert.deepEqual(calls.at(-1),['album',2])
  handlers.pointerenter();directive.unmounted(el);context.mock.timers.tick(120);assert.equal(calls.length,2);assert.equal(Object.keys(handlers).length,0)
})

test('speculative reads bound concurrency and skip maintenance-closed queued work', async () => {
  let code=source('src/utils/detailPrefetch.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ','')
  code=code.slice(0,code.indexOf('async function readDetail'))+code.slice(code.indexOf('function drain()'))
  let allowed=true,calls=0,running=0,maxRunning=0;const waiting=[]
  const prefetch=Function('canPreloadRoutes','preloadRouteComponent','getMaintenanceSnapshot','isRouteAvailable','readDetail',code+'\nreturn prefetchDetail')(
    ()=>true,async()=>{},()=>({settings:{}}),()=>allowed,()=>{calls++;running++;maxRunning=Math.max(maxRunning,running);return new Promise(resolve=>waiting.push(()=>{running--;resolve()}))})
  const tasks=Array.from({length:10},(_,i)=>prefetch({},'playlist',i+1))
  await flush();assert.equal(calls,2);assert.equal(maxRunning,2)
  allowed=false;waiting.splice(0).forEach(done=>done());await Promise.all(tasks)
  assert.equal(calls,2);assert.equal(running,0)
})
