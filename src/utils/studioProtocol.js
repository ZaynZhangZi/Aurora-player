export const STUDIO_MODEL = Object.freeze({
  id:'htdemucs-e5e425c1', bytes:180534758,
  sha256:'e5e425c17683f163a472462eb5f5a4ffcd11c31858d57fbd0833b012d8b88077',
  path:'/api/v1/audio-models/htdemucs-e5e425c1.onnx',
})
export const STEMS = Object.freeze([
  {id:'vocals',name:'人声',color:'#ef8e9c',x:0,z:-1.2,y:0},
  {id:'drums',name:'鼓',color:'#e5b279',x:0,z:-2.4,y:0},
  {id:'bass',name:'贝斯',color:'#83b8b0',x:-1.6,z:-1.5,y:0},
  {id:'other',name:'其他乐器',color:'#a69acb',x:1.6,z:-1.5,y:0},
])
export const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0))
export const studioAbort=()=>new DOMException('操作已取消','AbortError')
export function studioPosition(room,serverNow) {
  if(!room?.source)return 0
  return clamp(room.positionMs+(room.playing?Math.max(0,serverNow-room.startsAt):0),0,room.source.durationMs)
}
// All estimates are in the performance clock, so a local wall-clock adjustment cannot jump playback.
export function createStudioClock({now=()=>performance.now()}={}) {
  let samples=[]
  const recent=()=>{samples=samples.filter(s=>now()-s.at<60000);return samples}
  function estimate() {
    const list=recent().slice().sort((a,b)=>a.rtt-b.rtt)
    if(!list.length)return null
    const best=list.filter(s=>s.rtt<=list[0].rtt+Math.max(5,list[0].rtt*.2)).slice(0,4)
    const values=best.map(s=>s.offset).sort((a,b)=>a-b)
    return {offset:values[Math.floor(values.length/2)],uncertainty:list[0].rtt/2,samples:list.length}
  }
  return {
    add(start,end,{receivedAt,sentAt}) {
      if(![start,end,receivedAt,sentAt].every(Number.isFinite)||end<start||sentAt<receivedAt||end-start>10000||sentAt-receivedAt>end-start+2)return false
      const rtt=Math.max(0,end-start-(sentAt-receivedAt))
      recent().push({at:now(),rtt,offset:((receivedAt-start)+(sentAt-end))/2})
      samples=samples.slice(-16);return true
    },
    estimate,
    epoch(time=now()){const e=estimate();return e?time+e.offset:null},
    performanceTime(epoch){const e=estimate();return e?epoch-e.offset:null},
    clear(){samples=[]},
  }
}
export function audioTimeForPerformance(context,targetPerformance,now=()=>performance.now()) {
  const stamp=context.getOutputTimestamp?.()
  if(stamp&&Number.isFinite(stamp.contextTime)&&stamp.contextTime>0&&Number.isFinite(stamp.performanceTime)
      &&Math.abs(now()-stamp.performanceTime)<5000) {
    return {time:stamp.contextTime+(targetPerformance-stamp.performanceTime)/1000,method:'output-timestamp'}
  }
  const latency=clamp((context.baseLatency||0)+(context.outputLatency||0),0,3)
  return {time:context.currentTime+(targetPerformance-now())/1000-latency,method:'latency-estimate'}
}
export function planStudioStart(context,clock,room,output={},now=()=>performance.now()) {
  if(!room?.source||!clock.estimate())return null
  const delay=clamp(output.delayMs,-1000,1000),current=now()
  let target=Math.max(clock.performanceTime(room.startsAt+delay),current+120)
  let mapping=audioTimeForPerformance(context,target,now)
  if(mapping.time<context.currentTime+.04){
    target+=(context.currentTime+.04-mapping.time)*1000
    mapping=audioTimeForPerformance(context,target,now)
  }
  const position=room.positionMs+Math.max(0,clock.epoch(target)-room.startsAt-delay)
  if(position>=room.source.durationMs)return null
  return {when:mapping.time,offset:Math.max(0,position/1000),targetPerformance:target,method:mapping.method}
}
export function freshStemSettings(){return STEMS.map(s=>({...s,volume:1,mute:false,solo:false}))}
export function validStudioRoom(room) {
  if(room===null)return true
  return typeof room?.id==='string'&&Number.isSafeInteger(room.revision)&&Array.isArray(room.members)&&room.members.length<=12
    &&Number.isFinite(room.startsAt)&&Number.isFinite(room.positionMs)&&Number.isFinite(room.serverTime)
    &&typeof room.playing==='boolean'&&(!room.source||(typeof room.source.id==='string'&&/^[a-f0-9]{64}$/.test(room.source.sha256)
      &&room.source.durationMs>0&&room.source.durationMs<=600000&&room.source.bytes>0&&room.source.bytes<=33554432))
}
