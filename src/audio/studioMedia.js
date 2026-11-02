import {STUDIO_MODEL,studioAbort} from '../utils/studioProtocol.js'
export async function sha256(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('')}
export async function audioDuration(blob,signal){
  if(signal?.aborted)throw studioAbort()
  return new Promise((resolve,reject)=>{
    const audio=document.createElement('audio'),url=URL.createObjectURL(blob)
    let settled=false
    const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);audio.onloadedmetadata=null;audio.onerror=null;audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);error?reject(error):resolve(value)}
    const abort=()=>finish(studioAbort()),timer=setTimeout(()=>finish(new Error('读取音频信息超时')),12000)
    audio.preload='metadata'
    audio.onloadedmetadata=()=>finish(Number.isFinite(audio.duration)&&audio.duration>0?null:new Error('无法读取这份音频的时长'),audio.duration)
    audio.onerror=()=>finish(new Error('当前设备无法读取这份音频，请尝试MP3或WAV'))
    signal?.addEventListener('abort',abort,{once:true});audio.src=url
  })
}
export async function decodeStudioAudio(blob,context,signal,maxSeconds=600){
  if(blob.size>33554432)throw new Error('音频文件最大支持32MB')
  const duration=await audioDuration(blob,signal)
  if(duration>maxSeconds)throw new Error('这份音频超过'+Math.round(maxSeconds/60)+'分钟限制')
  const bytes=await blob.arrayBuffer()
  if(signal?.aborted)throw studioAbort()
  const decoded=await context.decodeAudioData(bytes)
  if(signal?.aborted)throw studioAbort()
  if(decoded.duration>maxSeconds)throw new Error('音频实际时长超过限制')
  if(decoded.numberOfChannels===2)return decoded
  const stereo=context.createBuffer(2,decoded.length,decoded.sampleRate)
  stereo.copyToChannel(decoded.getChannelData(0),0)
  stereo.copyToChannel(decoded.getChannelData(Math.min(1,decoded.numberOfChannels-1)),1)
  return stereo
}
async function modelDatabase(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('aurora-audio-models',1)
    request.onupgradeneeded=()=>request.result.createObjectStore('weights')
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)
    request.onblocked=()=>reject(new Error('模型缓存暂时不可用'))
  })
}
async function cacheModel(value){
  let db
  try{
    db=await modelDatabase()
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction('weights',value?'readwrite':'readonly'),store=tx.objectStore('weights')
      const request=value?store.put(value,STUDIO_MODEL.id):store.get(STUDIO_MODEL.id)
      let result;request.onsuccess=()=>{result=request.result}
      tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)
    })
  }catch{return null}finally{db?.close()}
}
export async function clearStudioModelCache(){
  const db=await modelDatabase()
  try{await new Promise((resolve,reject)=>{const tx=db.transaction('weights','readwrite');tx.objectStore('weights').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}finally{db.close()}
}
export async function loadStudioModel({baseUrl,fetchImpl=fetch,signal,onProgress=()=>{}}){
  onProgress({stage:'checking',percent:null})
  let bytes=await cacheModel()
  if(signal?.aborted)throw studioAbort()
  if(bytes?.byteLength===STUDIO_MODEL.bytes&&await sha256(bytes)===STUDIO_MODEL.sha256){onProgress({stage:'cached',percent:100});return bytes}
  bytes=null
  const response=await fetchImpl(String(baseUrl||'').replace(/\/$/,'')+STUDIO_MODEL.path,{credentials:'omit',signal,cache:'default'})
  if(!response.ok||!response.body?.getReader)throw new Error('分离模型暂时无法下载，请稍后重试；也可以直接导入四个声部')
  const reader=response.body.getReader(),data=new Uint8Array(STUDIO_MODEL.bytes);let size=0,last=0
  try{
    while(true){
      const next=await reader.read();if(next.done)break
      if(size+next.value.length>data.length)throw new Error('模型文件大小不匹配')
      data.set(next.value,size);size+=next.value.length
      if(performance.now()-last>250){onProgress({stage:'downloading',percent:Math.round(size/data.length*100),bytes:size,total:data.length});last=performance.now()}
    }
  }finally{await reader.cancel().catch(()=>{})}
  if(size!==STUDIO_MODEL.bytes||await sha256(data)!==STUDIO_MODEL.sha256)throw new Error('模型完整性校验失败，请重新下载')
  if(signal?.aborted)throw studioAbort()
  await cacheModel(data.buffer)
  if(signal?.aborted)throw studioAbort()
  return data.buffer
}
export function separateStudioAudio({model,buffer,signal,onProgress=()=>{},workerFactory=()=>new Worker(new URL('../workers/demucsWorker.js',import.meta.url),{type:'module'})}){
  if(signal?.aborted)return Promise.reject(studioAbort())
  return new Promise((resolve,reject)=>{
    const worker=workerFactory();let finished=false
    const finish=(error,value)=>{if(finished)return;finished=true;signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(value)}
    const abort=()=>finish(studioAbort())
    signal?.addEventListener('abort',abort,{once:true})
    worker.onerror=()=>finish(new Error('本机分离运行失败，可能内存不足；可改用较短片段或导入已有声部'))
    worker.onmessage=({data})=>{
      if(data.stage==='error')finish(new Error(String(data.message).slice(0,250)))
      else if(data.stage==='done')finish(null,data)
      else onProgress(data)
    }
    const channels=[buffer.getChannelData(0).slice(),buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1)).slice()]
    worker.postMessage({model,channels},[model,...channels.map(c=>c.buffer)])
  })
}
export function separatedBuffers(result,context){
  const buffers={}
  for(let index=0;index<4;index++){
    const stereo=result.channels[index],buffer=context.createBuffer(2,stereo[0].length,result.sampleRate)
    buffer.copyToChannel(stereo[0],0);buffer.copyToChannel(stereo[1],1);buffers[result.order[index]]=buffer
  }
  return buffers
}
export function wavBlob(buffer){
  const channels=buffer.numberOfChannels,length=buffer.length,bytes=new ArrayBuffer(44+length*channels*2),view=new DataView(bytes)
  const text=(offset,value)=>[...value].forEach((char,i)=>view.setUint8(offset+i,char.charCodeAt(0)))
  text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVEfmt ')
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true)
  view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true)
  text(36,'data');view.setUint32(40,bytes.byteLength-44,true)
  const data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i))
  for(let i=0;i<length;i++)for(let c=0;c<channels;c++)view.setInt16(44+(i*channels+c)*2,Math.round(Math.max(-1,Math.min(1,data[c][i]))*32767),true)
  return new Blob([bytes],{type:'audio/wav'})
}
