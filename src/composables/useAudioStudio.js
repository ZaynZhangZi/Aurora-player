import {computed,onBeforeUnmount,reactive,watch} from 'vue'
import {onBeforeRouteLeave} from 'vue-router'
import {useCounterStore} from '@/stores/userStores.js'
import {usePlayerStore} from '@/stores/playerStore.js'
import {resolveAdminApiBaseUrl} from '@/axios/myBackend.js'
import {createStudioApi} from '@/api/audioStudioApi.js'
import {StudioSpeaker,SpatialMixer} from '@/audio/StudioAudio.js'
import {decodeStudioAudio,loadStudioModel,separateStudioAudio,separatedBuffers,sha256,wavBlob,clearStudioModelCache} from '@/audio/studioMedia.js'
import {createStudioClock,freshStemSettings,validStudioRoom,clamp,studioAbort} from '@/utils/studioProtocol.js'
import {cancelPlaybackIntent,subscribePlaybackIntent} from '@/utils/playbackIntent.js'
import {getMaintenanceSnapshot,isTargetAvailable,requireFeature,subscribeMaintenance} from '@/utils/maintenanceAccess.js'
import {useFeatureMaintenance} from '@/composables/useMaintenanceAccess.js'

const sourceLimit=33554432
export function useAudioStudio(){
  const user=useCounterStore(),player=usePlayerStore(),baseUrl=resolveAdminApiBaseUrl()
  const state=reactive({
    tab:'speakers',room:null,sources:[],connected:false,connecting:false,groupBusy:'',error:'',sourceError:'',
    enabled:false,sourceBusy:false,clock:null,metrics:{},contextState:'closed',notice:'',now:0,
    space:{name:'',inputDuration:0,range:'clip',start:0,clipSeconds:30,busy:false,progress:null,error:'',ready:false,playing:false,position:0,duration:0,volume:.65,settings:freshStemSettings(),files:{}},
  })
  let context=null,speaker=null,mixer=null,spaceInput=null,stemBuffers={}
  let epoch=0,disposed=false,life=new AbortController(),groupLife=new AbortController(),sourceLife=null,spaceLife=null
  let loadedSource='',loadingSource='',clockPending=null,tickTimer=null,retryTimer=null,streamRunning=false
  const pendingOutputs=new Map(),downloadUrls=new Set()
  let outputChain=Promise.resolve()
  let audioIntent=0
  let roomVersion=-1
  const available=feature=>['page.audioStudio','feature.playback',feature].filter(Boolean).every(key=>isTargetAvailable(getMaintenanceSnapshot().settings,key))
  const gate=feature=>['page.audioStudio','feature.playback',feature].filter(Boolean).every(requireFeature)
  const api=createStudioApi({baseUrl,getIdentity:()=>({userId:user.userId,cookie:user.getUserCookie}),clientType:'WEB',
    beforeRequest(){if(!available(null))throw new Error('音频实验室正在维护')}})
  const clock=createStudioClock()
  const ownMember=computed(()=>state.room?.members.find(m=>m.deviceId===api.deviceId)||null)
  const isHost=computed(()=>state.room?.hostDeviceId===api.deviceId)
  const joined=computed(()=>Boolean(ownMember.value))
  const task=signal=>({epoch,signal:signal||life.signal})
  function current(t){return !disposed&&t.epoch===epoch&&!t.signal.aborted}
  function check(t){if(!current(t))throw studioAbort()}
  function checkIntent(t,intent){check(t);if(intent!==audioIntent)throw studioAbort()}
  function errorMessage(error){return String(error?.message||'操作未完成，请重试').slice(0,260)}
  async function audioContext(){
    if(!context||context.state==='closed'){
      const Constructor=globalThis.AudioContext||globalThis.webkitAudioContext
      if(!Constructor)throw new Error('当前浏览器不支持音频实验室')
      context=new Constructor({sampleRate:44100,latencyHint:'interactive'})
      speaker=new StudioSpeaker({context,clock,onMetrics:metrics=>{state.metrics={...state.metrics,...metrics}}})
      mixer=new SpatialMixer(context)
      mixer.setVolume(state.space.volume)
      context.onstatechange=()=>{
        state.contextState=context?.state||'closed'
        if(context?.state!=='running'){speaker?.stop();state.space.playing=false}
      }
      state.contextState=context.state
    }
    await context.resume()
    if(context.state!=='running')throw new Error('请点击启用音响，并允许浏览器播放声音')
    state.contextState=context.state
    return context
  }
  function takeAudio(){cancelPlaybackIntent();player.autoPlayOnLoad=false;player.setPlaying(false)}
  function stopVoices(){speaker?.stop();mixer?.pause();state.space.playing=false}
  async function groupAction(name,fn){
    if(state.groupBusy)return false
    const t=task(groupLife.signal);state.groupBusy=name;state.error=''
    try{await fn(t);check(t);return true}
    catch(error){if(current(t)&&error.name!=='AbortError'){state.error=errorMessage(error);if(error.status===409)void refreshRoom()}return false}
    finally{if(current(t))state.groupBusy=''}
  }
  function applyRoom(snapshot){
    const wrapped=snapshot&&Object.prototype.hasOwnProperty.call(snapshot,'room')
    const roomValue=wrapped?snapshot.room:snapshot
    const version=wrapped?snapshot.version:roomVersion
    if(!Number.isSafeInteger(version)||version<roomVersion)return
    let room=roomValue
    if(!validStudioRoom(room))throw new Error('播放组状态无效')
    if(room&&state.room?.id===room.id&&(room.revision<state.room.revision||room.revision===state.room.revision&&room.serverTime<state.room.serverTime))return
    roomVersion=version
    if(room)room={...room,members:room.members.map(m=>pendingOutputs.has(m.deviceId)?{...m,...pendingOutputs.get(m.deviceId)}:m)}
    const oldSource=state.room?.source?.id
    state.room=room
    if(!ownMember.value){state.enabled=false;speaker?.stop();sourceLife?.abort();loadedSource='';loadingSource='';speaker?.load(null);return}
    if(oldSource!==room?.source?.id){sourceLife?.abort();speaker?.load(null);loadedSource='';loadingSource='';state.sourceError=''}
    if(state.enabled&&room?.source){
      if(loadedSource!==room.source.id)void prepareSource()
      else if(ownMember.value.ready&&state.connected&&context?.state==='running')speaker?.apply(room,ownMember.value)
      else speaker?.stop()
    }else speaker?.stop()
  }
  async function syncClock(count=1){
    if(clockPending)return clockPending
    const t=task(groupLife.signal)
    const promise=(async()=>{
      for(let i=0;i<count;i++){
        const started=performance.now(),value=await api.clock(t.signal),ended=performance.now()
        check(t);clock.add(started,ended,value);state.clock=clock.estimate()
      }
      if(state.enabled&&loadedSource&&speaker){speaker.key='';applyRoom(state.room)}
    })()
    clockPending=promise
    try{await promise}finally{if(clockPending===promise)clockPending=null}
  }
  async function heartbeat(){
    if(!state.room||!ownMember.value)return
    const t=task(groupLife.signal),roomId=state.room.id
    const data={
      ready:Boolean(state.enabled&&loadedSource===state.room.source?.id&&context?.state==='running'),
      sourceId:state.room.source?.id||null,durationMs:Math.round((speaker?.buffer?.duration||0)*1000),
      outputLatencyMs:clamp(((context?.baseLatency||0)+(context?.outputLatency||0))*1000,0,3000),
      clockUncertaintyMs:clamp(clock.estimate()?.uncertainty??10000,0,10000),
      driftMs:Number.isFinite(state.metrics.driftMs)?clamp(state.metrics.driftMs,-600000,600000):null,
    }
    const room=await api.ready(roomId,data,t.signal);check(t)
    if(state.room?.id===roomId)applyRoom(room)
  }
  async function prepareSource(){
    const source=state.room?.source
    if(!source||!state.enabled||loadingSource===source.id||loadedSource===source.id)return
    sourceLife?.abort();sourceLife=new AbortController()
    const controller=sourceLife,groupSignal=groupLife.signal
    const t=task(controller.signal),groupAbort=()=>controller.abort()
    groupSignal.addEventListener('abort',groupAbort,{once:true})
    loadingSource=source.id;state.sourceBusy=true;state.sourceError=''
    try{
      const bytes=await api.audio(source.id,t.signal);check(t)
      if(await sha256(bytes)!==source.sha256)throw new Error('音源完整性校验失败，请重新加载')
      const ctx=await audioContext();check(t)
      const buffer=await decodeStudioAudio(new Blob([bytes]),ctx,t.signal,600);check(t)
      if(state.room?.source?.id!==source.id||!state.enabled)throw studioAbort()
      speaker.load(buffer);loadedSource=source.id
      if(!clock.estimate())await syncClock(5)
      check(t);await heartbeat()
    }catch(error){
      if(current(t)&&error.name!=='AbortError'){state.sourceError=errorMessage(error);speaker?.stop();loadedSource=''}
    }finally{
      groupSignal.removeEventListener('abort',groupAbort)
      if(loadingSource===source.id){loadingSource='';state.sourceBusy=false}
    }
  }
  async function refreshRoom(){
    const t=task(groupLife.signal)
    try{const room=await api.room(t.signal);check(t);applyRoom(room)}catch(error){if(current(t)&&error.name!=='AbortError')state.error=errorMessage(error)}
  }
  function startStream(){
    if(streamRunning||disposed||groupLife.signal.aborted||!available('feature.speakerGroup'))return
    const t=task(groupLife.signal);streamRunning=true
    void (async()=>{
      try{
        await api.stream(t.signal,event=>{
          if(!current(t))return
          state.connected=true
          if(event.name==='studio')applyRoom(event.data)
          if(event.name==='heartbeat'){
            void syncClock().catch(error=>{if(current(t)&&error.name!=='AbortError')state.error=errorMessage(error)})
            void heartbeat().catch(error=>{if(current(t)&&error.name!=='AbortError')state.sourceError=errorMessage(error)})
          }
        })
      }catch(error){
        if(current(t)&&error.name!=='AbortError'){
          state.connected=false;speaker?.stop();if(speaker)speaker.key=''
          state.error=error.status===401?'连接已失效，请点击重新连接':'实时连接中断，音响已暂停，正在尝试重连'
          if(error.status!==401)retryTimer=setTimeout(()=>{if(current(t))startStream()},3000)
        }
      }finally{if(current(t))streamRunning=false}
    })()
  }
  async function connect(){
    if(!user.userId||!user.getUserCookie||!available('feature.speakerGroup')||state.connecting)return
    state.connecting=true;state.error=''
    const t=task(groupLife.signal)
    try{
      const [room,sources]=await Promise.all([api.room(t.signal),api.sources(t.signal)]);check(t)
      state.sources=sources;applyRoom(room);startStream()
      await syncClock(5);check(t)
    }catch(error){if(current(t)&&error.name!=='AbortError')state.error=errorMessage(error)}
    finally{if(current(t))state.connecting=false}
  }
  async function createRoom(){
    if(!gate('feature.speakerGroup'))return
    const intent=++audioIntent
    return groupAction('create',async t=>{
      await audioContext();checkIntent(t,intent);mixer?.pause();state.space.playing=false;takeAudio()
      const snapshot=await api.create('我的同步音响',t.signal)
      if(!current(t)||intent!==audioIntent){void api.leave(snapshot.room.id).catch(()=>{});throw studioAbort()}
      state.enabled=true;applyRoom(snapshot)
      await syncClock(3)
    })
  }
  async function joinRoom(){
    if(!gate('feature.speakerGroup')||!state.room)return
    const id=state.room.id,intent=++audioIntent
    return groupAction('join',async t=>{
      await audioContext();checkIntent(t,intent);mixer?.pause();state.space.playing=false;takeAudio()
      const room=await api.join(id,t.signal)
      if(!current(t)||intent!==audioIntent){void api.leave(id).catch(()=>{});throw studioAbort()}
      state.enabled=true;applyRoom(room)
      await syncClock(3);check(t)
      if(state.room?.source){if(loadedSource===state.room.source.id)await heartbeat();else await prepareSource()}
    })
  }
  async function leaveRoom(){
    const id=state.room?.id
    const member=ownMember.value
    state.enabled=false;speaker?.stop();sourceLife?.abort();loadedSource='';loadingSource=''
    speaker?.load(null);state.sourceBusy=false
    if(!id||!member)return
    const t=task(groupLife.signal)
    try{const room=await api.leave(id,t.signal);if(current(t))applyRoom(room)}
    catch(error){if(current(t)&&error.name!=='AbortError')state.error=errorMessage(error)}
  }
  async function command(type,extra={}){
    if(!gate('feature.speakerGroup')||!state.room)return
    const id=state.room.id,revision=state.room.revision
    return groupAction(type,async t=>{const room=await api.command(id,{type,revision,...extra},t.signal);check(t);applyRoom(room)})
  }
  function previewOutput(deviceId,patch){
    const member=state.room?.members.find(m=>m.deviceId===deviceId)
    if(!member||!gate('feature.speakerGroup'))return
    Object.assign(member,patch);pendingOutputs.set(deviceId,{volume:member.volume,channel:member.channel,delayMs:member.delayMs})
    if(deviceId===api.deviceId)speaker?.apply(state.room,member)
  }
  async function saveOutput(deviceId){
    const body=pendingOutputs.get(deviceId),id=state.room?.id,t=task(groupLife.signal)
    if(!body||!id||!gate('feature.speakerGroup'))return
    const snapshot={...body}
    outputChain=outputChain.catch(()=>{}).then(async()=>{
      try{check(t);const room=await api.output(id,deviceId,snapshot,t.signal);check(t);if(pendingOutputs.get(deviceId)===body)pendingOutputs.delete(deviceId);applyRoom(room)}
      catch(error){if(current(t)){if(pendingOutputs.get(deviceId)===body)pendingOutputs.delete(deviceId);state.error=errorMessage(error);void refreshRoom()}}
    })
    return outputChain
  }
  async function selectSource(id){
    return command('SOURCE',{sourceId:id})
  }
  async function uploadSource(file){
    if(!file||!gate('feature.speakerGroup'))return
    return groupAction('upload',async t=>{
      const ctx=await audioContext();check(t)
      const buffer=await decodeStudioAudio(file,ctx,t.signal,600);check(t)
      const source=await api.upload(file,file.name.slice(0,160),Math.round(buffer.duration*1000),t.signal);check(t)
      state.sources=[source,...state.sources]
      if(isHost.value){const room=await api.command(state.room.id,{type:'SOURCE',revision:state.room.revision,sourceId:source.id},t.signal);check(t);applyRoom(room)}
    })
  }
  async function importCurrent(){
    const feature=state.tab==='speakers'?'feature.speakerGroup':'feature.spatialMixer'
    if(!gate(feature))return
    const song=player.currentSong,id=String(song?.id||''),durationMs=Number(player.durationMs||song?.durationMs||song?.duration||0)
    if(!/^[1-9][0-9]{0,19}$/.test(id)||!durationMs){state.error='请先在播放器中选择一首可完整播放的歌曲';return}
    const spatial=state.tab==='spatial'
    return groupAction('import',async t=>{
      const source=await api.importSong({id,name:song.name||'当前歌曲',durationMs},t.signal);check(t)
      if(spatial){
        const bytes=await api.audio(source.id,t.signal);check(t)
        if(await sha256(bytes)!==source.sha256)throw new Error('音源校验失败')
        await setSpatialInput(new File([bytes],source.name),t.signal)
        void api.remove(source.id,t.signal).catch(()=>{})
      }else{
        state.sources=[source,...state.sources]
        if(isHost.value){const room=await api.command(state.room.id,{type:'SOURCE',revision:state.room.revision,sourceId:source.id},t.signal);check(t);applyRoom(room)}
      }
    })
  }
  async function calibration(){
    if(!gate('feature.speakerGroup'))return
    return groupAction('calibration',async t=>{
      const ctx=await audioContext();check(t)
      const buffer=ctx.createBuffer(2,44100*10,44100)
      for(let c=0;c<2;c++){const samples=buffer.getChannelData(c);for(let second=0;second<10;second++)for(let i=0;i<1200;i++)samples[second*44100+i]=.18*Math.sin(2*Math.PI*1000*i/44100)*Math.exp(-i/220)}
      const source=await api.upload(wavBlob(buffer),'同步校准节拍',10000,t.signal);check(t);state.sources=[source,...state.sources]
      if(isHost.value){const room=await api.command(state.room.id,{type:'SOURCE',revision:state.room.revision,sourceId:source.id},t.signal);check(t);applyRoom(room)}
    })
  }
  async function removeSource(id){
    if(!gate('feature.speakerGroup'))return
    return groupAction('remove',async t=>{await api.remove(id,t.signal);check(t);state.sources=state.sources.filter(s=>s.id!==id)})
  }
  function cancelSeparation(){spaceLife?.abort();spaceLife=null;state.space.busy=false;state.space.progress=null}
  function emptySpatial(){
    cancelSeparation();mixer?.clear();spaceInput=null;stemBuffers={}
    Object.assign(state.space,{name:'',inputDuration:0,ready:false,playing:false,position:0,duration:0,files:{},error:''})
  }
  async function setSpatialInput(file,signal){
    if(!file||!gate('feature.spatialMixer'))return
    emptySpatial();spaceLife=new AbortController()
    const controller=spaceLife,t=task(controller.signal),abort=()=>controller.abort()
    signal?.addEventListener('abort',abort,{once:true});state.space.busy=true
    try{
      const ctx=await audioContext();check(t)
      const buffer=await decodeStudioAudio(file,ctx,t.signal,300);check(t)
      spaceInput=buffer;state.space.name=file.name;state.space.inputDuration=buffer.duration;state.space.start=0
    }catch(error){if(current(t)&&error.name!=='AbortError')state.space.error=errorMessage(error)}
    finally{signal?.removeEventListener('abort',abort);if(current(t))state.space.busy=false}
  }
  async function separate(){
    if(!spaceInput||state.space.busy||!gate('feature.spatialMixer'))return
    cancelSeparation();spaceLife=new AbortController();const t=task(spaceLife.signal),input=spaceInput
    state.space.busy=true;state.space.error='';state.space.ready=false;mixer?.clear();stemBuffers={};state.space.files={}
    const progress=p=>{if(current(t))state.space.progress=p}
    try{
      const model=await loadStudioModel({baseUrl,fetchImpl:globalThis.fetch.bind(globalThis),signal:t.signal,onProgress:progress});check(t)
      const start=state.space.range==='full'?0:Math.floor(clamp(state.space.start,0,Math.max(0,input.duration-.1))*44100)
      const length=state.space.range==='full'?input.length:Math.min(input.length-start,Math.round(state.space.clipSeconds*44100))
      const buffer=context.createBuffer(2,length,44100)
      for(let c=0;c<2;c++)buffer.copyToChannel(input.getChannelData(c).subarray(start,start+length),c)
      const result=await separateStudioAudio({model,buffer,signal:t.signal,onProgress:progress});check(t)
      if(!available('feature.spatialMixer'))throw studioAbort()
      stemBuffers=separatedBuffers(result,context);mixer.load(stemBuffers,state.space.settings)
      state.space.duration=mixer.duration;state.space.position=0;state.space.ready=true
      state.space.progress={stage:'done',percent:100}
      state.notice='四个声部已在本机分离完成，可以开始空间混音'
    }catch(error){if(current(t)&&error.name!=='AbortError')state.space.error=errorMessage(error)}
    finally{if(current(t))state.space.busy=false}
  }
  const stemVersions={}
  async function importStem(id,file){
    if(!file||!gate('feature.spatialMixer'))return
    cancelSeparation();const version=(stemVersions[id]||0)+1;stemVersions[id]=version
    const t=task();mixer?.clear();state.space.ready=false;state.space.playing=false;state.space.error=''
    if(!Object.keys(state.space.files).length)stemBuffers={}
    delete stemBuffers[id];state.space.files[id]='读取中…'
    try{
      const ctx=await audioContext();check(t)
      const buffer=await decodeStudioAudio(file,ctx,t.signal,300);check(t)
      if(stemVersions[id]!==version)return
      stemBuffers[id]=buffer;state.space.files[id]=file.name
      if(Object.keys(stemBuffers).length===4){mixer.load(stemBuffers,state.space.settings);state.space.duration=mixer.duration;state.space.ready=true;state.space.name='导入的四声部';state.space.position=0}
    }catch(error){if(current(t)&&stemVersions[id]===version){delete stemBuffers[id];delete state.space.files[id];state.space.error=errorMessage(error)}}
  }
  function updateStem(id,patch){
    if(!gate('feature.spatialMixer'))return
    const stem=state.space.settings.find(s=>s.id===id);if(!stem)return
    Object.assign(stem,patch);mixer?.update(state.space.settings)
    saveLayout()
  }
  function layoutKey(){return 'aurora-spatial-layout-'+(user.userId||'guest')}
  function saveLayout(){try{localStorage.setItem(layoutKey(),JSON.stringify(state.space.settings))}catch{}}
  function readLayout(){
    state.space.settings=freshStemSettings()
    try{
      const stored=JSON.parse(localStorage.getItem(layoutKey())||'null')
      if(Array.isArray(stored))for(const stem of state.space.settings){
        const value=stored.find(s=>s.id===stem.id)
        if(value)Object.assign(stem,{x:clamp(value.x,-3,3),y:clamp(value.y,-2,2),z:clamp(value.z,-3,3),volume:clamp(value.volume,0,1.5),mute:value.mute===true,solo:value.solo===true})
      }
    }catch{}
  }
  function resetLayout(){if(!gate('feature.spatialMixer'))return;state.space.settings=freshStemSettings();mixer?.update(state.space.settings);saveLayout()}
  async function toggleSpatial(){
    if(!gate('feature.spatialMixer')||!state.space.ready)return
    const intent=++audioIntent,t=task()
    if(mixer?.playing){mixer.pause();state.space.playing=false;return}
    try{
      await audioContext()
      checkIntent(t,intent)
      if(!available('feature.spatialMixer'))return
      void leaveRoom()
      takeAudio();state.space.playing=Boolean(mixer.play())
    }catch(error){if(current(t)&&error.name!=='AbortError')state.space.error=errorMessage(error)}
  }
  function seekSpatial(seconds){if(gate('feature.spatialMixer')){mixer?.seek(seconds);state.space.position=mixer?.position()||0}}
  function spatialVolume(value){if(gate('feature.spatialMixer')){state.space.volume=clamp(value,0,1);mixer?.setVolume(state.space.volume)}}
  function downloadStem(id){
    if(!gate('feature.spatialMixer')||!stemBuffers[id])return
    const url=URL.createObjectURL(wavBlob(stemBuffers[id]));downloadUrls.add(url)
    const link=document.createElement('a');link.href=url;link.download=id+'.wav';link.click()
    setTimeout(()=>{URL.revokeObjectURL(url);downloadUrls.delete(url)},30000)
  }
  function stopSpeakers(){
    clearTimeout(retryTimer);groupLife.abort();groupLife=new AbortController();sourceLife?.abort()
    state.enabled=false;state.connected=false;state.connecting=false;state.groupBusy='';state.sourceBusy=false
    state.room=null;state.sources=[];state.clock=null;clock.clear();clockPending=null;streamRunning=false
    roomVersion=-1
    pendingOutputs.clear();loadedSource='';loadingSource='';speaker?.load(null)
    void api.reset()
  }
  function resetAll(){
    audioIntent++;epoch++;life.abort();life=new AbortController();stopSpeakers();emptySpatial();stopVoices()
    const old=context;context=null;speaker?.dispose();mixer?.dispose();speaker=null;mixer=null
    if(old&&old.state!=='closed'){old.onstatechange=null;void old.close().catch(()=>{})}
    state.contextState='closed';state.error='';state.sourceError='';state.metrics={};state.notice=''
    for(const url of downloadUrls)URL.revokeObjectURL(url);downloadUrls.clear()
  }
  function setTab(tab){
    if(tab===state.tab)return
    if(tab==='spatial')void leaveRoom()
    else{mixer?.pause();state.space.playing=false;cancelSeparation()}
    state.tab=tab
    if(tab==='speakers'&&user.userId&&available('feature.speakerGroup'))void connect()
  }
  const stopIdentity=watch(()=>[user.userId,user.getUserCookie],()=>{
    resetAll();readLayout();if(state.tab==='speakers')void connect()
  },{immediate:true})
  const globalIntent=()=>{audioIntent++;if(state.enabled)void leaveRoom();mixer?.pause();state.space.playing=false}
  const stopIntent=subscribePlaybackIntent(globalIntent)
  const stopPlaying=watch(()=>player.isPlaying,playing=>{if(playing)globalIntent()},{flush:'sync'})
  const stopMaintenance=subscribeMaintenance(()=>{
    if(!available(null)){resetAll();return}
    if(!available('feature.speakerGroup')&&(state.enabled||state.connected||state.connecting))stopSpeakers()
    if(!available('feature.spatialMixer'))emptySpatial()
  })
  useFeatureMaintenance('feature.speakerGroup',()=>state.tab==='speakers')
  useFeatureMaintenance('feature.spatialMixer',()=>state.tab==='spatial')
  tickTimer=setInterval(()=>{
    state.now=clock.epoch()||0
    if(state.enabled&&state.connected)speaker?.correct()
    if(mixer&&state.space.ready){state.space.position=mixer.position();if(mixer.playing&&mixer.position()>=mixer.duration){mixer.pause();state.space.playing=false}}
  },1000)
  const visibility=()=>{if(!document.hidden&&state.enabled){void syncClock(3).then(()=>heartbeat()).catch(error=>{state.sourceError=errorMessage(error)})}}
  document.addEventListener('visibilitychange',visibility)
  const pagehide=()=>resetAll()
  const pageshow=event=>{if(event.persisted&&state.tab==='speakers')void connect()}
  window.addEventListener('pagehide',pagehide)
  window.addEventListener('pageshow',pageshow)
  onBeforeRouteLeave(()=>{resetAll();return true})
  onBeforeUnmount(()=>{
    disposed=true;clearInterval(tickTimer);stopIdentity();stopIntent();stopPlaying();stopMaintenance()
    document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',pageshow);resetAll()
  })
  return {user,state,api,ownMember,isHost,joined,
    createRoom,joinRoom,leaveRoom,command,selectSource,uploadSource,importCurrent,calibration,removeSource,
    previewOutput,saveOutput,setTab,setSpatialInput,separate,cancelSeparation,importStem,updateStem,resetLayout,
    toggleSpatial,seekSpatial,spatialVolume,downloadStem,clearStudioModelCache,
    reconnect(){stopSpeakers();void connect()},retrySource(){loadedSource='';loadingSource='';void prepareSource()},
  }
}
