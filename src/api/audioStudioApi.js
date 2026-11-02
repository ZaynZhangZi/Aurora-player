import {studioAbort,validStudioRoom} from '../utils/studioProtocol.js'
export class StudioApiError extends Error {constructor(status,message){super(message);this.name='StudioApiError';this.status=status}}
const identityKey=i=>i?.userId&&i?.cookie?String(i.userId)+':'+i.cookie:''
export function createStudioApi({baseUrl,getIdentity,fetchImpl=(...args)=>fetch(...args),beforeRequest=()=>{},clientType='WEB'}){
  const root=String(baseUrl||'').replace(/\/$/,'')+'/api/v1/studio'
  const deviceId=crypto.randomUUID()
  let token=null,pending=null,key='',epoch=0,lifetime=new AbortController()
  async function transport(path,{method='GET',access=token,body,binary,signal,timeout=15000,mode='json',keepalive=false}={}){
    const controller=new AbortController(),signals=[signal,lifetime.signal].filter(Boolean),abort=()=>controller.abort()
    for(const s of signals){if(s.aborted)controller.abort();else s.addEventListener('abort',abort,{once:true})}
    let timedOut=false,streaming=false
    const timer=timeout?setTimeout(()=>{timedOut=true;abort()},timeout):null
    try{
      const response=await fetchImpl(root+path,{method,signal:controller.signal,credentials:'omit',cache:'no-store',keepalive,
        headers:{Accept:mode==='stream'?'text/event-stream':mode==='binary'?'application/octet-stream':'application/json',
          ...(access?{Authorization:'Bearer '+access}:{}),...(binary?{'Content-Type':'application/octet-stream'}:body!==undefined?{'Content-Type':'application/json'}:{})},
        ...(binary?{body:binary}:body!==undefined?{body:JSON.stringify(body)}:{})})
      if(!response.ok){let message='音频实验室暂时无法连接';try{message=(await response.json()).message||message}catch{}throw new StudioApiError(response.status,String(message).slice(0,240))}
      if(mode==='binary'){
        const length=Number(response.headers.get('content-length')||0)
        if(length>33554432)throw new StudioApiError(413,'音源超过32MB限制')
        const reader=response.body?.getReader?.()
        if(!reader)throw new StudioApiError(502,'当前连接不支持音源传输')
        const chunks=[];let size=0
        try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>33554432)throw new StudioApiError(413,'音源超过32MB限制');chunks.push(next.value)}}finally{await reader.cancel().catch(()=>{})}
        const result=new Uint8Array(size);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length}
        return result.buffer
      }
      if(mode==='stream'){streaming=true;return {response,controller,detach:()=>signals.forEach(s=>s.removeEventListener('abort',abort))}}
      let value;try{value=await response.json()}catch{throw new StudioApiError(502,'音频实验室响应格式无效')}
      if(value.code!==200)throw new StudioApiError(value.code||502,String(value.message||'操作失败').slice(0,240))
      return value.data??null
    }catch(error){
      if(timedOut)throw new StudioApiError(408,'操作用时较长，请稍后重试')
      if(error.name==='AbortError'||error instanceof StudioApiError)throw error
      throw new StudioApiError(0,'音频连接中断，请检查网络后重试')
    }finally{
      if(timer)clearTimeout(timer)
      if(mode!=='stream'||!streaming)for(const s of signals)s.removeEventListener('abort',abort)
    }
  }
  async function revoke(access){
    if(!access)return
    try{await fetchImpl(root+'/session',{method:'DELETE',credentials:'omit',cache:'no-store',headers:{Authorization:'Bearer '+access},signal:AbortSignal.timeout(5000)})}catch{}
  }
  function reset(){const old=token;epoch++;lifetime.abort();lifetime=new AbortController();token=null;pending=null;key='';return revoke(old)}
  async function ready(){
    const identity=getIdentity(),next=identityKey(identity)
    if(!next){void reset();throw new StudioApiError(401,'同步音响需要先登录网易云账号')}
    if(next!==key){void reset();key=next}
    if(token)return {access:token,run:epoch,identity:{...identity}}
    if(pending)return pending
    const run=epoch
    const task=(async()=>{
      const session=await transport('/session',{method:'POST',access:null,body:{cookie:identity.cookie,deviceId,
        deviceName:clientType==='DESKTOP'?'桌面音响':'网页音响',clientType}})
      if(run!==epoch||identityKey(getIdentity())!==next){void revoke(session.token);throw studioAbort()}
      if(String(session.userId)!==String(identity.userId)){void revoke(session.token);throw new StudioApiError(401,'账号校验失败，请重新登录')}
      token=session.token;return {access:token,run,identity:{...identity}}
    })()
    pending=task;try{return await task}finally{if(pending===task)pending=null}
  }
  async function request(path,options={}){
    beforeRequest();const auth=await ready()
    if(auth.run!==epoch||options.signal?.aborted)throw studioAbort()
    beforeRequest()
    const body=typeof options.body==='function'?options.body(auth.identity):options.body
    const value=await transport(path,{...options,body,access:auth.access})
    if(auth.run!==epoch||identityKey(getIdentity())!==key||options.signal?.aborted)throw studioAbort()
    beforeRequest();return value
  }
  async function stream(signal,onEvent){
    beforeRequest();const auth=await ready()
    const {response,controller,detach}=await transport('/events',{signal,mode:'stream',timeout:0,access:auth.access})
    if(!response.headers.get('content-type')?.includes('text/event-stream')||!response.body?.getReader){controller.abort();detach();throw new StudioApiError(502,'实时连接不可用')}
    const reader=response.body.getReader(),decoder=new TextDecoder()
    let buffer='',name='',data=[],eventSize=0,idle
    const arm=()=>{clearTimeout(idle);idle=setTimeout(()=>controller.abort(),40000)}
    arm()
    try{
      while(!controller.signal.aborted){
        const next=await reader.read();if(next.done)throw new StudioApiError(503,'实时连接已断开')
        arm();buffer+=decoder.decode(next.value,{stream:true})
        if(buffer.length>65536)throw new StudioApiError(502,'实时消息过大')
        let cut
        while((cut=buffer.indexOf('\n'))!==-1){
          const line=buffer.slice(0,cut).replace(/\r$/,'');buffer=buffer.slice(cut+1)
          if(!line){
            if(data.length&&auth.run===epoch&&!signal.aborted){
              let payload;try{payload=JSON.parse(data.join('\n'))}catch{throw new StudioApiError(502,'实时消息无效')}
              if(name==='studio'&&(!validStudioRoom(payload.room)||!Number.isSafeInteger(payload.version)||payload.version<0))throw new StudioApiError(502,'播放组状态无效')
              beforeRequest();onEvent({name,data:payload})
            }
            name='';data=[];eventSize=0
          }else if(line.startsWith('event:'))name=line.slice(6).trim()
          else if(line.startsWith('data:')){eventSize+=line.length;if(eventSize>65536)throw new StudioApiError(502,'实时消息过大');data.push(line.slice(5).trimStart())}
        }
      }
    }finally{clearTimeout(idle);await reader.cancel().catch(()=>{});detach()}
  }
  return {deviceId,reset,stream,
    clock:signal=>request('/clock',{signal}),
    room:signal=>request('/room',{signal}),
    sources:signal=>request('/sources',{signal}),
    create:(name,signal)=>request('/room',{method:'POST',body:{name},signal}),
    join:(id,signal)=>request('/room/'+encodeURIComponent(id)+'/join',{method:'POST',signal}),
    leave:(id,signal)=>request('/room/'+encodeURIComponent(id)+'/member',{method:'DELETE',signal}),
    ready:(id,body,signal)=>request('/room/'+encodeURIComponent(id)+'/ready',{method:'POST',body:{...body},signal}),
    output:(id,device,body,signal)=>request('/room/'+encodeURIComponent(id)+'/output/'+encodeURIComponent(device),{method:'PUT',body:{...body},signal}),
    command:(id,body,signal)=>request('/room/'+encodeURIComponent(id)+'/command',{method:'POST',body:{...body},signal}),
    upload:(blob,name,durationMs,signal)=>request('/sources?name='+encodeURIComponent(name)+'&durationMs='+Math.round(durationMs),{method:'PUT',binary:blob,signal,timeout:90000}),
    importSong:(song,signal)=>{const copy={songId:String(song.id),name:String(song.name).slice(0,160),durationMs:Math.round(song.durationMs)};return request('/sources/import',{method:'POST',body:identity=>({...copy,cookie:identity.cookie}),signal,timeout:60000})},
    audio:(id,signal)=>request('/sources/'+encodeURIComponent(id)+'/audio',{mode:'binary',signal,timeout:90000}),
    remove:(id,signal)=>request('/sources/'+encodeURIComponent(id),{method:'DELETE',signal}),
  }
}
