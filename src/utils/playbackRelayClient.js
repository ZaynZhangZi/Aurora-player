import {usableRelayState} from './playbackRelayProtocol.js'

export function createPlaybackRelayState() {
  return {enabled:true,reminders:true,panelOpen:false,connected:false,connecting:false,busy:false,owned:false,
    remote:null,error:'',notice:'',lastSyncedAt:0,dismissed:''}
}
const identityKey = identity => identity?.cookie && identity?.userId ? String(identity.userId)+':'+identity.cookie : ''
const publicError = error => {
  if (error?.message && /队列|曲目暂不支持/.test(error.message)) return error.message
  return ({401:'接力连接已过期，请重新连接',403:'该账号暂时无法使用接力',409:'播放已由另一台设备接管',413:'队列较大，暂时无法完整同步',429:'接力连接较频繁，请稍后重试',503:'接力暂时不可用，本机仍可播放'})[error?.status] || '暂时无法连接接力服务，本机仍可播放'
}
export function createPlaybackRelay({api,state=createPlaybackRelayState(),deviceId,deviceName,clientType,
  getIdentity,getSnapshot,applyRemote,pauseLocal,isAvailable=()=>true,
  now=()=>globalThis.performance?.now?.() ?? Date.now(),schedule=setTimeout,cancel=clearTimeout}) {
  let epoch=0,identity=null,token=null,controller=null,streamController=null,playController=null
  let generation=0,sequence=0,maxGeneration=0,revision=0,metadataVersion=0,sentVersion=-1,lastSeen=0
  let initializing=null,reading=null,readAgain=false,publishing=null,publishAgain=false,pendingLocalIntent=false
  let tickTimer,reconnectTimer,changeTimer,refreshTimer,reconnectDelay=2000
  const current = run => run===epoch && identityKey(identity)===identityKey(getIdentity()) && !!identityKey(identity) && state.enabled && isAvailable()
  function clearTimers(){for(const timer of [tickTimer,reconnectTimer,changeTimer,refreshTimer])cancel(timer);tickTimer=reconnectTimer=changeTimer=refreshTimer=undefined}
  function detach(revoke=true){
    epoch++;clearTimers();controller?.abort();streamController?.abort();playController?.abort()
    const previous=token;token=null;identity=null;initializing=null;reading=null;publishing=null;readAgain=false;publishAgain=false;pendingLocalIntent=false
    state.connected=false;state.connecting=false;state.busy=false;state.owned=false;state.remote=null;state.lastSyncedAt=0;state.error='';state.notice=''
    if(revoke&&previous)void api.revoke(previous).catch(()=>{})
  }
  function loseOwnership(name='另一台设备') {
    const wasOwned=state.owned
    state.owned=false;playController?.abort();cancel(changeTimer)
    if(wasOwned){pauseLocal();state.notice='已在'+name+'继续播放，本机已暂停'}
  }
  async function refresh() {
    const run=epoch
    if(!current(run)||!token)return null
    if(reading){readAgain=true;return reading}
    const task=(async()=>{
      try{
        const value=await api.read(token,controller.signal)
        if(!current(run))return null
        if(value.revision<revision){readAgain=true;return null}
        revision=value.revision;maxGeneration=Math.max(maxGeneration,value.generation)
        if(state.owned&&value.generation>=generation&&value.ownerDeviceId!==deviceId)loseOwnership(value.ownerDeviceName)
        state.remote=value
        return value
      }catch(error){if(current(run)&&error.name!=='AbortError'){state.error=publicError(error);if(error.status===401||error.status===403){loseOwnership();token=null;streamController?.abort();state.connected=false}}return null}
      finally{if(run===epoch&&reading===task){reading=null;if(readAgain){readAgain=false;queueRefresh()}}}
    })()
    reading=task;return task
  }
  function queueRefresh(){cancel(refreshTimer);const run=epoch;refreshTimer=schedule(()=>{if(current(run))void refresh()},120)}
  function handleEvent(event,run){
    if(!current(run))return
    lastSeen=now();state.connected=true;reconnectDelay=2000
    if(event.name!=='playback')return
    const value=event.data
    if(!Number.isSafeInteger(value?.generation)||!Number.isSafeInteger(value?.revision)||value.revision<revision)return
    maxGeneration=Math.max(maxGeneration,value.generation)
    if(state.owned&&value.generation>=generation&&value.ownerDeviceId!==deviceId)loseOwnership(value.ownerDeviceName)
    if(value.revision>revision&&value.ownerDeviceId!==deviceId)queueRefresh()
  }
  function connectStream(){
    const run=epoch;if(!current(run)||!token)return
    streamController?.abort();const stream=new AbortController();streamController=stream;lastSeen=now()
    void api.stream(token,stream.signal,event=>handleEvent(event,run)).catch(error=>{
      if(current(run)&&streamController===stream&&(error.status===401||error.status===403)){token=null;state.error=publicError(error);loseOwnership()}
    }).finally(()=>{
      if(!current(run)||streamController!==stream)return
      state.connected=false;streamController=null
      if(token){cancel(reconnectTimer);reconnectTimer=schedule(connectStream,reconnectDelay);reconnectDelay=Math.min(30000,reconnectDelay*2)}
    })
  }
  function startTick(){
    cancel(tickTimer);const run=epoch
    tickTimer=schedule(()=>{
      if(!current(run))return
      try {if(state.owned&&getSnapshot(false)?.playing)void flush()} catch(error){state.error=publicError(error)}
      if(!state.connected)void refresh()
      if(streamController&&now()-lastSeen>45000){state.connected=false;streamController.abort()}
      startTick()
    },10000)
  }
  async function connect(next=getIdentity(),force=false){
    if(identityKey(next)===identityKey(identity)&&!force){if(initializing)return initializing;if(token)return true}
    detach(true)
    if(!state.enabled||!isAvailable()||!identityKey(next))return false
    identity={...next};const run=epoch;controller=new AbortController();state.connecting=true;state.error='';state.notice=''
    generation=0;sequence=0;maxGeneration=0;revision=0;metadataVersion=0;sentVersion=-1;reconnectDelay=2000
    const task=(async()=>{
      try{
        const session=await api.exchange({cookie:identity.cookie,deviceId,deviceName,clientType},controller.signal)
        if(!current(run)){if(session?.token)void api.revoke(session.token).catch(()=>{});return false}
        if(String(session.userId)!==String(identity.userId)){void api.revoke(session.token).catch(()=>{});throw Error('identity mismatch')}
        token=session.token;await refresh()
        if(!current(run)||!token)return false
        connectStream();startTick()
        if(pendingLocalIntent&&getSnapshot(false)?.playing){pendingLocalIntent=false;void claim(false)}
        return true
      }catch(error){if(current(run)&&error.name!=='AbortError')state.error=publicError(error);return false}
      finally{if(run===epoch){state.connecting=false;if(initializing===task)initializing=null}}
    })()
    initializing=task;return task
  }
  async function claim(resume){
    if(!current(epoch)||state.busy)return false
    if(!token){if(resume)await connect(getIdentity(),true);else{pendingLocalIntent=true;return false}}
    const run=epoch
    if(!current(run)||!token)return false
    state.busy=true;state.error='';state.notice='';playController?.abort();const operation=new AbortController();playController=operation
    try{
      const value=await api.claim(token,controller.signal)
      if(!current(run)||operation.signal.aborted)return false
      if(value.generation<maxGeneration){if(!state.owned)pauseLocal();loseOwnership();queueRefresh();return false}
      maxGeneration=value.generation;generation=value.generation;sequence=0;revision=Math.max(revision,value.revision);state.owned=true;state.remote=value;sentVersion=-1;metadataVersion++
      if(resume){
        if(!usableRelayState(value))throw Error('没有可用的接力记录')
        const ok=await applyRemote(value,operation.signal)
        if(!current(run)||operation.signal.aborted)return false
        if(!ok)throw Error('无法在本机播放该曲目')
      }
      state.busy=false;void flush();return true
    }catch(error){if(current(run)&&!operation.signal.aborted){if(error.status===409)loseOwnership();else state.owned=false;state.error=resume?'本次接力未完成，请重试或在原设备继续播放':publicError(error)}return false}
    finally{if(run===epoch&&playController===operation){state.busy=false;if(pendingLocalIntent&&current(run)&&token){pendingLocalIntent=false;void claim(false)}}}
  }
  async function flush({keepalive=false}={}){
    const run=epoch
    if(!current(run)||!token||!state.owned||state.busy)return null
    if(publishing){publishAgain=true;return publishing}
    const sentMetadataVersion=metadataVersion,leasedGeneration=generation
    let snapshot
    try{snapshot=getSnapshot(sentVersion!==metadataVersion)}catch(error){state.error=publicError(error);return null}
    if(!snapshot)return null
    const payload={...snapshot,generation,sequence:++sequence}
    if(keepalive&&payload.queue){delete payload.queue;if(sentVersion<0)return null}
    const task=(async()=>{
      try{
        const result=await api.checkpoint(token,payload,controller.signal,keepalive)
        if(!current(run)||!state.owned||leasedGeneration!==generation)return null
        revision=Math.max(revision,result.revision);maxGeneration=Math.max(maxGeneration,result.generation)
        if(result.generation!==generation||result.ownerDeviceId!==deviceId){loseOwnership(result.ownerDeviceName);queueRefresh();return null}
        if(payload.queue)sentVersion=sentMetadataVersion
        state.lastSyncedAt=Date.now();state.error='';return result
      }catch(error){
        if(current(run)&&leasedGeneration===generation&&error.name!=='AbortError'){
          if(error.status===409){loseOwnership();queueRefresh()}
          else if(error.status===401||error.status===403){state.owned=false;token=null;streamController?.abort();state.connected=false}
          state.error=publicError(error)
        }
        return null
      }finally{if(run===epoch&&publishing===task){publishing=null;if(publishAgain){publishAgain=false;localChanged(false)}}}
    })()
    publishing=task;return task
  }
  function localChanged(metadata=false){
    if(metadata)metadataVersion++
    if(!current(epoch)||!state.owned||state.busy)return
    cancel(changeTimer);const run=epoch;changeTimer=schedule(()=>{if(current(run))void flush()},250)
  }
  function userIntent(){
    if(!current(epoch))return
    if(state.busy){pendingLocalIntent=true;playController?.abort();return}
    if(!token){if(!initializing)void connect(getIdentity(),true);pendingLocalIntent=true;return}
    if(!state.owned)void claim(false)
    else localChanged(true)
  }
  function userPlaying(playing){
    if(!current(epoch)||state.busy)return
    if(playing&&!state.owned)userIntent()
    else localChanged(false)
  }
  function hasOffer(){return state.enabled&&state.reminders&&!state.owned&&!state.busy&&usableRelayState(state.remote)&&state.remote.sourceDeviceId!==deviceId&&state.dismissed!==String(state.remote.sourceDeviceId)+':'+state.remote.generation}
  function dismiss(){if(state.remote)state.dismissed=String(state.remote.sourceDeviceId)+':'+state.remote.generation}
  return {state,deviceId,connect,refresh,flush,localChanged,userPlaying,userIntent,accept:()=>claim(true),stop:()=>detach(true),hasOffer,dismiss,
    reconnect:()=>connect(getIdentity(),true),available:()=>isAvailable()}
}
