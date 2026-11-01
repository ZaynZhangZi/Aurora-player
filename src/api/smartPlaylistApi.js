export class SmartPlaylistApiError extends Error {
  constructor(status,message){super(message);this.name='SmartPlaylistApiError';this.status=status}
}
const abortError=()=>new DOMException('操作已取消','AbortError')
const stamp=identity=>identity?.userId&&identity?.cookie?String(identity.userId)+':'+identity.cookie:''
const copy=value=>JSON.parse(JSON.stringify(value))
export function createSmartPlaylistApi({baseUrl,fetchImpl=(...args)=>globalThis.fetch(...args),getIdentity,beforeRequest=()=>{},clientType='WEB'}) {
  const root=String(baseUrl||'').replace(/\/$/,'')+'/api/v1/library'
  const deviceId=globalThis.crypto?.randomUUID?.()||'library_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)
  let epoch=0,identityStamp='',token=null,authPending=null,lifetime=new AbortController()
  async function raw(path,{method='GET',token:access,body,signals=[],timeout=12000}={}) {
    const controller=new AbortController(),abort=()=>controller.abort()
    for(const signal of signals){if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true})}
    let timedOut=false
    const timer=setTimeout(()=>{timedOut=true;abort()},timeout)
    try {
      if(controller.signal.aborted)throw abortError()
      const response=await fetchImpl(root+path,{method,credentials:'omit',cache:'no-store',signal:controller.signal,
        headers:{Accept:'application/json',...(access?{Authorization:'Bearer '+access}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},
        ...(body!==undefined?{body:JSON.stringify(body)}:{})})
      let envelope
      try{envelope=await response.json()}catch(error){if(error.name==='AbortError')throw error;throw new SmartPlaylistApiError(response.status||502,'音乐库服务暂时无法连接，请稍后重试。')}
      if(!response.ok||envelope?.code!==200)throw new SmartPlaylistApiError(response.ok?envelope?.code||502:response.status,String(envelope?.message||'音乐库服务暂时不可用。').slice(0,240))
      return envelope.data??null
    }catch(error){
      if(timedOut)throw new SmartPlaylistApiError(408,'同步用时较长，请稍后重试。')
      if(error.name==='AbortError'||error instanceof SmartPlaylistApiError)throw error
      throw new SmartPlaylistApiError(0,'暂时无法连接音乐库，请检查网络后重试。')
    }finally{clearTimeout(timer);for(const signal of signals)signal?.removeEventListener('abort',abort)}
  }
  const revoke=access=>raw('/session',{method:'DELETE',token:access,timeout:5000}).catch(()=>{})
  function reset(){
    const previous=token;epoch++;lifetime.abort();lifetime=new AbortController();token=null;authPending=null;identityStamp=''
    return previous?revoke(previous):Promise.resolve()
  }
  function snapshot(){
    const identity=getIdentity()
    if(!stamp(identity)){void reset();throw new SmartPlaylistApiError(401,'请先登录网易云音乐。')}
    if(stamp(identity)!==identityStamp){void reset();identityStamp=stamp(identity)}
    return {identity:{...identity},run:epoch,signal:lifetime.signal,key:identityStamp}
  }
  const current=value=>value.run===epoch&&stamp(getIdentity())===value.key&&!value.signal.aborted
  async function ready(value){
    if(token)return token
    if(authPending)return authPending
    const task=(async()=>{
      const session=await raw('/session',{method:'POST',body:{cookie:value.identity.cookie,deviceId,deviceName:clientType==='DESKTOP'?'桌面音乐库':'网页音乐库',clientType},signals:[value.signal]})
      if(!current(value)){void revoke(session.token);throw abortError()}
      if(String(session.userId)!==String(value.identity.userId)){void revoke(session.token);throw new SmartPlaylistApiError(401,'账号校验未通过，请重新登录。')}
      token=session.token;return token
    })()
    authPending=task
    try{return await task}finally{if(authPending===task)authPending=null}
  }
  async function request(path,{method='GET',body,signal,preview=false}={}) {
    beforeRequest()
    const value=snapshot(),payload=typeof body==='function'?body(value.identity):body
    if(signal?.aborted)throw abortError()
    const access=await ready(value)
    if(!current(value)||signal?.aborted)throw abortError()
    beforeRequest()
    try {
      const result=await raw(path,{method,token:access,body:payload,signals:[value.signal,signal],timeout:preview?45000:12000})
      if(!current(value))throw abortError()
      beforeRequest()
      return result
    }catch(error){if(current(value)&&error.status===401)token=null;throw error}
  }
  return {
    list:options=>request('/smart-playlists',options),
    get:(id,options)=>request('/smart-playlists/'+encodeURIComponent(id),options),
    create:(data,options={})=>request('/smart-playlists',{...options,method:'POST',body:copy(data)}),
    update:(id,data,options={})=>request('/smart-playlists/'+encodeURIComponent(id),{...options,method:'PUT',body:copy(data)}),
    remove:(id,version,options={})=>request('/smart-playlists/'+encodeURIComponent(id)+'?version='+encodeURIComponent(version),{...options,method:'DELETE'}),
    preview:(rules,{refresh=false,signal}={})=>{const frozen=copy(rules);return request('/smart-playlists/preview',{method:'POST',body:identity=>({rules:frozen,cookie:identity.cookie,refresh}),signal,preview:true})},
    reset,
  }
}
