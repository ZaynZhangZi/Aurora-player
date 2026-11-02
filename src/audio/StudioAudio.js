import {audioTimeForPerformance,clamp,planStudioStart,studioPosition} from '../utils/studioProtocol.js'

export class StudioSpeaker {
  constructor({context,clock,now=()=>performance.now(),onMetrics=()=>{}}){
    this.context=context;this.clock=clock;this.now=now;this.onMetrics=onMetrics
    this.buffer=null;this.voice=null;this.room=null;this.output={volume:.65,channel:'STEREO',delayMs:0};this.key=''
    this.master=context.createGain();this.master.gain.value=.65;this.master.connect(context.destination)
  }
  load(buffer){this.stop();this.buffer=buffer;this.key=''}
  configure(output={}){
    const changed=this.output.channel!==output.channel||this.output.delayMs!==output.delayMs
    this.output={...this.output,...output}
    this.master.gain.setTargetAtTime(clamp(this.output.volume,0,1),this.context.currentTime,.015)
    if(changed)this.key=''
  }
  apply(room,output){
    this.configure(output);this.room=room
    const key=JSON.stringify([room?.source?.id,room?.playing,room?.startsAt,room?.positionMs,this.output.channel,this.output.delayMs])
    if(key===this.key)return
    this.key=key
    if(!room?.playing||!this.buffer){this.stop();return}
    this.start()
  }
  start(){
    this.stop()
    if(this.context.state!=='running'||!this.buffer||!this.room?.playing)return
    const plan=planStudioStart(this.context,this.clock,this.room,this.output,this.now)
    if(!plan||plan.offset>=this.buffer.duration)return
    const source=this.context.createBufferSource(),gain=this.context.createGain()
    source.buffer=this.buffer
    const split=this.context.createChannelSplitter(2),merge=this.context.createChannelMerger(2)
    source.connect(split)
    const left=this.output.channel==='RIGHT'?1:0,right=this.output.channel==='LEFT'?0:1
    // Decoded mono buffers are duplicated by the loader before being assigned.
    split.connect(merge,left,0);split.connect(merge,right,1);merge.connect(gain);gain.connect(this.master)
    gain.gain.setValueAtTime(0,plan.when);gain.gain.linearRampToValueAtTime(1,plan.when+.012)
    const voice={source,gain,split,merge,baseTime:plan.when,basePosition:plan.offset,rate:1,when:plan.when}
    this.voice=voice
    source.onended=()=>{if(this.voice===voice)this.voice=null;[source,gain,split,merge].forEach(n=>{try{n.disconnect()}catch{}})}
    source.start(plan.when,plan.offset)
    this.onMetrics({method:plan.method,driftMs:0,rate:1})
  }
  position(time=this.context.currentTime){
    const v=this.voice
    return v?v.basePosition+Math.max(0,time-v.baseTime)*v.rate:0
  }
  correct(){
    if(!this.voice||!this.room?.playing||this.context.state!=='running'||!this.clock.estimate())return
    const time=this.now(),mapping=audioTimeForPerformance(this.context,time,this.now),v=this.voice
    if(mapping.time<v.when)return
    const desired=studioPosition(this.room,this.clock.epoch(time)-this.output.delayMs)/1000
    const drift=this.position(mapping.time)-desired
    if(Math.abs(drift)>.15){this.start();this.onMetrics({driftMs:drift*1000,correcting:true,method:mapping.method});return}
    const rate=1+clamp(-drift/4,-.005,.005)
    v.basePosition=this.position(this.context.currentTime);v.baseTime=this.context.currentTime;v.rate=rate
    v.source.playbackRate.setValueAtTime(rate,this.context.currentTime)
    this.onMetrics({driftMs:drift*1000,rate,method:mapping.method,correcting:false})
  }
  stop(){
    const v=this.voice;this.voice=null
    if(v){try{v.gain.gain.cancelScheduledValues(this.context.currentTime);v.gain.gain.setTargetAtTime(0,this.context.currentTime,.008);v.source.stop(this.context.currentTime+.05)}catch{}}
  }
  dispose(){this.stop();this.master.disconnect();this.buffer=null;this.room=null}
}

export class SpatialMixer {
  constructor(context){
    this.context=context;this.tracks=new Map();this.voices=[];this.playing=false;this.offset=0;this.started=0;this.duration=0
    this.master=context.createGain();this.master.gain.value=.65
    this.compressor=context.createDynamicsCompressor()
    this.compressor.threshold.value=-6;this.compressor.knee.value=6;this.compressor.ratio.value=12
    this.compressor.attack.value=.003;this.compressor.release.value=.15
    this.master.connect(this.compressor);this.compressor.connect(context.destination)
    if(context.listener.forwardX){context.listener.forwardX.value=0;context.listener.forwardY.value=0;context.listener.forwardZ.value=-1;context.listener.upY.value=1}
  }
  load(buffers,settings){
    this.pause();this.clear();this.offset=0
    const durations=Object.values(buffers).map(b=>b.duration)
    if(durations.length!==4||Math.max(...durations)-Math.min(...durations)>.1)throw new Error('四个声部需要从同一时间点开始，并具有相同时长。')
    this.duration=Math.min(...durations)
    for(const setting of settings){
      const panner=this.context.createPanner(),gain=this.context.createGain()
      panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=1;panner.maxDistance=8;panner.rolloffFactor=.35
      panner.connect(gain);gain.connect(this.master)
      this.tracks.set(setting.id,{buffer:buffers[setting.id],panner,gain})
    }
    this.update(settings)
  }
  update(settings){
    const solo=settings.some(s=>s.solo)
    for(const setting of settings){
      const track=this.tracks.get(setting.id);if(!track)continue
      const t=this.context.currentTime,p=track.panner
      p.positionX.setTargetAtTime(clamp(setting.x,-3,3),t,.02)
      p.positionY.setTargetAtTime(clamp(setting.y,-2,2),t,.02)
      p.positionZ.setTargetAtTime(clamp(setting.z,-3,3),t,.02)
      track.gain.gain.setTargetAtTime(setting.mute||solo&&!setting.solo?0:clamp(setting.volume,0,1.5),t,.015)
    }
  }
  setVolume(value){this.master.gain.setTargetAtTime(clamp(value,0,1),this.context.currentTime,.015)}
  position(){return this.playing?Math.min(this.duration,this.offset+Math.max(0,this.context.currentTime-this.started)):this.offset}
  play(){
    if(!this.tracks.size||this.context.state!=='running')return false
    if(this.playing)return true
    if(this.offset>=this.duration-.01)this.offset=0
    const when=this.context.currentTime+.04
    this.started=when;this.playing=true
    for(const track of this.tracks.values()){
      const source=this.context.createBufferSource(),fade=this.context.createGain()
      source.buffer=track.buffer;source.connect(fade);fade.connect(track.panner)
      fade.gain.setValueAtTime(0,when);fade.gain.linearRampToValueAtTime(1,when+.012)
      source.onended=()=>{try{source.disconnect();fade.disconnect()}catch{}}
      source.start(when,this.offset);this.voices.push({source,fade})
    }
    return true
  }
  pause(){
    const position=this.position();this.playing=false;this.offset=position
    for(const voice of this.voices.splice(0)){try{voice.fade.gain.setTargetAtTime(0,this.context.currentTime,.008);voice.source.stop(this.context.currentTime+.04)}catch{}}
  }
  seek(seconds){const playing=this.playing;this.pause();this.offset=clamp(seconds,0,this.duration);if(playing)this.play()}
  clear(){this.pause();for(const track of this.tracks.values()){track.panner.disconnect();track.gain.disconnect()}this.tracks.clear();this.duration=0;this.offset=0}
  dispose(){this.clear();this.master.disconnect();this.compressor.disconnect()}
}
