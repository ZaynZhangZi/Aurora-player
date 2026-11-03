import test from 'node:test'
import assert from 'node:assert/strict'
import {createMusicAssistantApi} from '../src/api/musicAssistantApi.js'

const token='A'.repeat(43),other='B'.repeat(43)
const response=(data,status=200)=>new Response(JSON.stringify({code:status,data,message:status===200?'success':'expired'}),{status,headers:{'Content-Type':'application/json'}})
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key),values}}
test('assistant exchanges an opaque session and never puts credentials in URLs',async()=>{
 const calls=[],saved=storage()
 const api=createMusicAssistantApi({baseUrl:'https://backend.example',storage:saved,getScope:()=> 'alice',fetchImpl:async(url,options)=>{calls.push({url,options});return url.endsWith('/session')?response({token}):response({id:'job',status:'RUNNING'})}})
 await api.send('找点安静的歌曲')
 assert.equal(calls[0].options.headers.Authorization,undefined)
 assert.equal(calls[1].options.headers.Authorization,'Bearer '+token)
 assert.ok(calls.every(call=>!call.url.includes(token)&&call.options.credentials==='omit'&&call.options.cache==='no-store'))
 assert.deepEqual(JSON.parse(calls[1].options.body),{content:'找点安静的歌曲'})
 assert.equal(JSON.parse(saved.getItem('aurora-music-assistant-session')).scope,'alice')
})
test('a changed account does not reuse another account session',async()=>{
 let scope='alice';const saved=storage(),calls=[]
 saved.setItem('aurora-music-assistant-session',JSON.stringify({scope:'bob',token:other}))
 const api=createMusicAssistantApi({baseUrl:'/backend',storage:saved,getScope:()=>scope,fetchImpl:async(url,options)=>{calls.push({url,options});return url.endsWith('/session')&&options.method==='POST'?response({token}):response({status:'DISCONNECTED'})}})
 await api.connection();scope='bob';await api.connection()
 assert.equal(calls.filter(call=>call.url.endsWith('/session')&&call.options.method==='POST').length,2)
 assert.ok(calls.some(call=>call.options.method==='DELETE'&&call.options.headers.Authorization==='Bearer '+token))
 assert.ok(!calls.some(call=>call.options.headers.Authorization==='Bearer '+other))
})
test('late session exchange after reset is revoked and cannot restore the connection',async()=>{
 let release;const ready=new Promise(resolve=>{release=resolve}),calls=[]
 const api=createMusicAssistantApi({baseUrl:'/backend',storage:storage(),fetchImpl:async(url,options)=>{calls.push({url,options});if(options.method==='POST')return ready;return response(null)}})
 const pending=api.connection();await Promise.resolve();await api.reset();release(response({token}))
 await assert.rejects(pending,{name:'AbortError'});await Promise.resolve()
 assert.ok(calls.some(call=>call.options.method==='DELETE'&&call.options.headers.Authorization==='Bearer '+token))
 assert.ok(!calls.some(call=>call.url.endsWith('/connection')))
})
test('maintenance blocks exchange and further music requests',async()=>{
 let calls=0
 const api=createMusicAssistantApi({baseUrl:'/backend',storage:storage(),beforeRequest:()=>{throw new DOMException('maintenance','AbortError')},fetchImpl:async()=>{calls++;return response({token})}})
 await assert.rejects(api.send('找歌'),{name:'AbortError'});assert.equal(calls,0)
})
test('stale HTTP results are discarded after disconnect',async()=>{
 let release;const deferred=new Promise(resolve=>{release=resolve}),saved=storage()
 saved.setItem('aurora-music-assistant-session',JSON.stringify({scope:'',token}))
 const api=createMusicAssistantApi({baseUrl:'/backend',storage:saved,fetchImpl:async(url)=>url.endsWith('/connection')?deferred:response(null)})
 const pending=api.connection();await Promise.resolve();await api.reset();release(response({status:'CONNECTED'}));await assert.rejects(pending,{name:'AbortError'})
})
test('assistant refuses oversized results and clears revoked session tokens',async()=>{
 const saved=storage();saved.setItem('aurora-music-assistant-session',JSON.stringify({scope:'',token}))
 let mode='large'
 const api=createMusicAssistantApi({baseUrl:'/backend',storage:saved,fetchImpl:async()=>mode==='large'?new Response('x'.repeat(262145)):response(null,401)})
 await assert.rejects(api.connection(),error=>error.status===502)
 mode='unauthorized';await assert.rejects(api.connection(),error=>error.status===401)
 assert.equal(saved.getItem('aurora-music-assistant-session'),null)
})
test('repeated resets never abort the first session revocation or bootstrap a cancellation session',async()=>{
 const saved=storage();saved.setItem('aurora-music-assistant-session',JSON.stringify({scope:'',token}))
 let release,revocationSignal,calls=0
 const deferred=new Promise(resolve=>{release=resolve})
 const api=createMusicAssistantApi({baseUrl:'/backend',storage:saved,fetchImpl:async(url,options)=>{calls++;assert.equal(url,'/backend/api/v1/music-assistant/session');assert.equal(options.method,'DELETE');revocationSignal=options.signal;return deferred}})
 const first=api.reset();await Promise.resolve();await api.reset();await api.cancel('old-job')
 assert.equal(revocationSignal.aborted,false);assert.equal(calls,1);release(response(null));await first
})
