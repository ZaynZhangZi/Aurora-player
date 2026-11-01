import {SMART_DEFAULT_RULES,copySmartRules,smartSignature,smartRulesError,uniqueSmartName} from './smartPlaylists.js'

export function createSmartPlaylistState(){
  return {lists:[],selectedId:'',name:'',rules:copySmartRules(),base:null,loading:false,creating:false,saving:false,deleting:false,playing:false,
    previewBusy:false,preview:null,previewSignature:'',error:'',previewError:'',conflict:false,savedAt:0,deleted:null}
}
const message=error=>error?.message||'操作暂时没有完成，请稍后重试。'
export function createSmartPlaylistWorkspace({api,state=createSmartPlaylistState(),getIdentityKey,isAvailable=()=>true,onPlay,
  schedule=setTimeout,cancel=clearTimeout,now=Date.now}){
  let generation=0,owner='',revision=0,previewSerial=0,saveTask=null,saveTimer,previewTimer,previewAbort,playAbort
  const current=run=>run===generation&&!!owner&&owner===getIdentityKey()&&isAvailable()
  const dirty=()=>!!state.base&&smartSignature(state.name,state.rules)!==smartSignature(state.base.name,state.base.rules)
  const rulesSignature=()=>JSON.stringify(copySmartRules(state.rules))
  const invalid=()=>!state.name.trim()?'请输入歌单名称。':state.name.trim().length>80?'歌单名称最多80个字。':smartRulesError(state.rules)
  function cancelTimers(){cancel(saveTimer);cancel(previewTimer);saveTimer=previewTimer=undefined}
  function suspend(){
    generation++;cancelTimers();previewSerial++;previewAbort?.abort();playAbort?.abort();saveTask=null;void api.reset()
    state.loading=state.creating=state.saving=state.deleting=state.playing=state.previewBusy=false
  }
  function dispose(){
    suspend();owner='';Object.assign(state,createSmartPlaylistState())
  }
  function replaceList(row){state.lists=[row,...state.lists.filter(item=>item.id!==row.id)]}
  function selectRow(row,{draft}={}){
    if(row?.id!==state.selectedId)playAbort?.abort()
    cancelTimers();previewSerial++;previewAbort?.abort();revision++
    state.selectedId=row?.id||'';state.base=row||null;state.name=draft?.name??row?.name??''
    state.rules=copySmartRules(draft?.rules||row?.rules||SMART_DEFAULT_RULES)
    state.preview=null;state.previewSignature='';state.previewError='';state.error='';state.conflict=false;state.savedAt=0
    if(row){queuePreview();if(dirty())queueSave()}
  }
  async function connect({preserve=false}={}){
    const previous=preserve?{id:state.selectedId,name:state.name,rules:copySmartRules(state.rules),version:state.base?.version,dirty:dirty()}:null
    suspend();owner=getIdentityKey()
    if(!owner||!isAvailable()){if(!owner)dispose();return false}
    const run=generation;state.loading=true;state.error=''
    try {
      const rows=await api.list()
      if(!current(run))return false
      if(!Array.isArray(rows))throw Error('歌单列表暂时无法读取。')
      state.lists=rows
      const row=previous?.id?rows.find(item=>item.id===previous.id):rows[0]
      selectRow(row||rows[0],{draft:row&&previous?.dirty?previous:undefined})
      if(row&&previous.dirty&&row.version!==previous.version){cancelTimers();state.conflict=true;state.error='歌单已在另一台设备更新。请加载最新版本，或另存当前条件。'}
      return true
    }catch(error){if(current(run)&&error.name!=='AbortError')state.error=message(error);return false}
    finally{if(current(run))state.loading=false}
  }
  function queueSave(){cancel(saveTimer);const run=generation;saveTimer=schedule(()=>{if(current(run))void persist()},650)}
  function queuePreview(){cancel(previewTimer);const run=generation;previewTimer=schedule(()=>{if(current(run))void preview()},350)}
  function change(patch){
    if(!current(generation)||!state.selectedId||state.loading||state.creating||state.deleting)return
    const previous=rulesSignature()
    if(typeof patch.name==='string')state.name=patch.name
    if(patch.rules)state.rules={...state.rules,...patch.rules}
    revision++;cancel(saveTimer)
    if(previous!==rulesSignature()){previewSerial++;previewAbort?.abort();state.previewBusy=false;state.previewError='';queuePreview()}
    if(dirty()&&!state.conflict&&!invalid())queueSave()
  }
  async function persist(){
    cancel(saveTimer)
    if(!current(generation)||state.conflict)return false
    if(!dirty())return true
    if(invalid()){state.error=invalid();return false}
    if(saveTask){const ok=await saveTask;return ok&&dirty()?persist():ok}
    const run=generation,id=state.selectedId,edit=revision
    const data={name:state.name.trim(),rules:copySmartRules(state.rules),version:state.base.version}
    state.saving=true;state.error=''
    const task=(async()=>{
      try {
        const row=await api.update(id,data)
        if(!current(run))return false
        replaceList(row)
        if(state.selectedId===id){
          state.base=row;state.savedAt=now()
          if(revision===edit){state.name=row.name;state.rules=copySmartRules(row.rules)}
        }
        return true
      }catch(error){
        if(current(run)&&error.name!=='AbortError'){state.error=error.status===404?'歌单已在另一台设备删除，你可以另存当前条件。':message(error);if(error.status===409||error.status===404)state.conflict=true}
        return false
      }finally{
        if(run===generation&&saveTask===task){saveTask=null;state.saving=false;if(dirty()&&!state.conflict&&!state.error&&!invalid())queueSave()}
      }
    })()
    saveTask=task;return task
  }
  async function choose(id){
    if(state.creating||state.deleting||state.loading)return false
    const run=generation;state.loading=true
    try{
      if(dirty()&&!await persist())return false
      const row=api.get?await api.get(id):state.lists.find(item=>item.id===id)
      if(!row||!current(run))return false
      state.lists=state.lists.map(item=>item.id===id?row:item)
      selectRow(row);return true
    }catch(error){if(current(run)&&error.name!=='AbortError')state.error=message(error);return false}
    finally{if(current(run))state.loading=false}
  }
  async function create(template,{cloneDraft=false}={}){
    if(!current(generation)||state.creating||state.deleting||state.loading)return false
    const data={name:uniqueSmartName(template.name,state.lists.map(item=>item.name)),rules:copySmartRules(template.rules)}
    if(smartRulesError(data.rules))return false
    state.creating=true;const run=generation
    try {
      if(!cloneDraft&&dirty()&&!await persist())return false
      const row=await api.create(data)
      if(!current(run))return false
      replaceList(row);selectRow(row);return true
    }catch(error){if(current(run)&&error.name!=='AbortError')state.error=message(error);return false}
    finally{if(current(run))state.creating=false}
  }
  async function preview({refresh=false}={}){
    cancel(previewTimer)
    if(!current(generation)||!state.selectedId||smartRulesError(state.rules))return null
    const run=generation,id=state.selectedId,signature=rulesSignature(),serial=++previewSerial
    previewAbort?.abort();const controller=new AbortController();previewAbort=controller
    state.previewBusy=true;state.previewError=''
    try {
      const result=await api.preview(copySmartRules(state.rules),{refresh,signal:controller.signal})
      if(!current(run)||serial!==previewSerial||id!==state.selectedId||signature!==rulesSignature())return null
      state.preview=result;state.previewSignature=signature;return result
    }catch(error){if(current(run)&&serial===previewSerial&&error.name!=='AbortError')state.previewError=message(error);return null}
    finally{if(run===generation&&serial===previewSerial)state.previewBusy=false}
  }
  async function play(trackId){
    if(!current(generation)||state.playing||state.creating||state.deleting)return false
    const run=generation,playId=state.selectedId;state.playing=true;playAbort?.abort();const controller=new AbortController();playAbort=controller
    try {
      if(!await persist())return false
      if(api.get){
        const fresh=await api.get(playId,{signal:controller.signal})
        if(!current(run)||controller.signal.aborted||playId!==state.selectedId)return false
        if(!dirty()&&fresh.version!==state.base.version){replaceList(fresh);selectRow(fresh)}
        if(dirty()&&!await persist())return false
      }
      const result=await preview()
      if(!result||!current(run)||controller.signal.aborted||playId!==state.selectedId)return false
      const index=trackId==null?0:result.tracks.findIndex(item=>String(item.id)===String(trackId))
      if(!result.tracks.length){state.previewError='暂时没有符合条件的歌曲，试着放宽筛选条件。';return false}
      if(index<0){state.previewError='这首歌已不符合当前规则，请从更新后的结果中选择。';return false}
      const ok=await onPlay(result.tracks,index,controller.signal)
      if(!current(run)||controller.signal.aborted)return false
      if(!ok)state.previewError='这首歌暂时无法播放，可以尝试列表里的其他歌曲。'
      return !!ok
    }catch(error){if(current(run)&&error.name!=='AbortError')state.previewError=message(error);return false}
    finally{if(run===generation)state.playing=false}
  }
  async function remove(){
    if(!current(generation)||!state.base||state.deleting||state.creating)return false
    const run=generation,row={...state.base};state.deleting=true
    try{
      if(dirty()&&!await persist())return false
      const latest=state.base
      await api.remove(latest.id,latest.version)
      if(!current(run))return false
      state.deleted={name:latest.name,rules:copySmartRules(latest.rules)}
      state.lists=state.lists.filter(item=>item.id!==row.id);selectRow(state.lists[0]);return true
    }catch(error){if(current(run)&&error.name!=='AbortError'){state.error=message(error);if(error.status===409||error.status===404)state.conflict=true}return false}
    finally{if(current(run))state.deleting=false}
  }
  async function undo(){
    if(!state.deleted)return false
    const item=state.deleted
    if(await create(item)){state.deleted=null;return true}
    return false
  }
  function revert(){if(state.conflict)void connect();else if(state.base)selectRow(state.base)}
  return {state,connect,dispose,suspend,change,persist,choose,create,preview,play,remove,undo,revert,
    dirty,invalid,clone:()=>create({name:state.name.trim().slice(0,70)+' 副本',rules:state.rules},{cloneDraft:true}),
    reload:()=>connect({preserve:true})}
}
