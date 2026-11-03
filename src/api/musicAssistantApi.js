export class MusicAssistantError extends Error {
  constructor(status,message){super(message);this.name='MusicAssistantError';this.status=status}
}
export function createMusicAssistantApi({baseUrl,fetchImpl=fetch,getScope=()=>'',storage=globalThis.sessionStorage,beforeRequest=()=>{}}){
  const root=String(baseUrl||'').replace(/\/$/,'')+'/api/v1/music-assistant',key='aurora-music-assistant-session'
  let token='',scope=getScope(),epoch=0,pending=null,lifetime=new AbortController()
  try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved?.scope===scope&&typeof saved.token==='string'&&/^[\w-]{43}$/.test(saved.token))token=saved.token;else storage?.removeItem(key)}catch{}
  const abort=()=>new DOMException('操作已取消','AbortError')
  async function raw(path,{method='GET',body,access=token,signal,timeout=65000,detached=false}={}){
    const controller=new AbortController(),stop=()=>controller.abort(),signals=[...(detached?[]:[lifetime.signal]),signal].filter(Boolean)
    for(const source of signals){if(source.aborted)stop();else source.addEventListener('abort',stop,{once:true})}
    const timer=setTimeout(stop,timeout)
    try{
      const response=await fetchImpl(root+path,{method,credentials:'omit',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json',...(access?{Authorization:'Bearer '+access}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})})
      const limit=262144
      if(Number(response.headers?.get('content-length'))>limit)throw new MusicAssistantError(502,'音乐服务返回内容过大')
      let text=''
      if(response.body?.getReader){
        const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0
        try{while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>limit)throw new MusicAssistantError(502,'音乐服务返回内容过大');text+=decoder.decode(next.value,{stream:true})}text+=decoder.decode()}finally{await reader.cancel().catch(()=>{})}
      }else{text=await response.text();if(text.length>limit)throw new MusicAssistantError(502,'音乐服务返回内容过大')}
      let result;try{result=JSON.parse(text)}catch{throw new MusicAssistantError(response.status||502,'暂时无法连接音乐助手，请检查本地后端是否已启动')}
      if(!response.ok||result.code!==200)throw new MusicAssistantError(response.ok?result.code:response.status,String(result.message||'音乐助手暂时不可用').slice(0,220))
      return result.data??null
    }catch(error){if(error.name==='AbortError'||error instanceof MusicAssistantError)throw error;throw new MusicAssistantError(0,'暂时无法连接音乐助手，请检查网络后重试')}
    finally{clearTimeout(timer);for(const source of signals)source.removeEventListener('abort',stop)}
  }
  function reset(){
    const previous=token;token='';epoch++;pending=null;lifetime.abort();lifetime=new AbortController();scope=getScope()
    try{storage?.removeItem(key)}catch{}
    return previous?raw('/session',{method:'DELETE',access:previous,timeout:5000,detached:true}).catch(()=>{}):Promise.resolve()
  }
  async function ready(){
    if(getScope()!==scope)void reset()
    if(token)return token
    if(pending)return pending
    const run=epoch,task=(async()=>{
      const result=await raw('/session',{method:'POST',body:{},access:''})
      if(run!==epoch||scope!==getScope()){void raw('/session',{method:'DELETE',access:result.token,timeout:5000,detached:true}).catch(()=>{});throw abort()}
      if(!/^[\w-]{43}$/.test(result.token||''))throw new MusicAssistantError(502,'音乐连接校验失败')
      token=result.token;try{storage?.setItem(key,JSON.stringify({token,scope}))}catch{};return token
    })();pending=task
    try{return await task}finally{if(pending===task)pending=null}
  }
  async function request(path,options={}){
    beforeRequest();const access=await ready(),run=epoch
    if(options.signal?.aborted)throw abort()
    try{const result=await raw(path,{...options,access});if(run!==epoch||scope!==getScope())throw abort();beforeRequest();return result}
    catch(error){if(error.status===401&&run===epoch){token='';try{storage?.removeItem(key)}catch{}}throw error}
  }
  return {
    capabilities:()=>raw('/capabilities',{access:'',timeout:12000}),
    connection:options=>request('/connection',options),connect:options=>request('/connection',{...options,method:'POST',body:{}}),
    conversation:options=>request('/conversation',options),clear:options=>request('/conversation',{...options,method:'DELETE'}),send:(content,options)=>request('/messages',{...options,method:'POST',body:{content}}),
    job:(id,options)=>request('/jobs/'+encodeURIComponent(id),options),cancel:(id,options)=>token&&getScope()===scope?raw('/jobs/'+encodeURIComponent(id),{...options,method:'DELETE',access:token,timeout:5000,detached:true}):Promise.resolve(null),
    save:(name,ids,options)=>request('/playlists',{...options,method:'POST',body:{name,ids}}),reset,
  }
}
