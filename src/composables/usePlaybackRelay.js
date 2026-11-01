import {watch} from 'vue'
import {useCounterStore} from '@/stores/userStores.js'
import {usePlayerStore} from '@/stores/playerStore.js'
import {resolveAdminApiBaseUrl} from '@/axios/myBackend.js'
import {createPlaybackRelayApi} from '@/api/playbackRelayApi.js'
import {createPlaybackRelay} from '@/utils/playbackRelayClient.js'
import {captureRelaySnapshot,restoreRelaySnapshot,relayDeviceName} from '@/utils/playbackRelayProtocol.js'
import {cancelPlaybackIntent,subscribePlaybackIntent} from '@/utils/playbackIntent.js'
import {getMaintenanceSnapshot,isTargetAvailable,subscribeMaintenance,requireFeature} from '@/utils/maintenanceAccess.js'
import {playbackRelayState as state,playbackRelayActions as actions} from './playbackRelayState.js'

let stopInstalled
export function installPlaybackRelay({clientType='WEB',fetchImpl}={}) {
  if(stopInstalled)return stopInstalled
  const user=useCounterStore(),player=usePlayerStore()
  const identity=()=>({userId:user.userId,cookie:user.getUserCookie})
  const available=()=>['feature.handoff','feature.playback'].every(key=>isTargetAvailable(getMaintenanceSnapshot().settings,key))
  const deviceId=crypto.randomUUID()
  state.deviceId=deviceId
  const api=createPlaybackRelayApi({baseUrl:resolveAdminApiBaseUrl(),...(fetchImpl?{fetchImpl}:{})})
  const engine=createPlaybackRelay({api,state,deviceId,deviceName:relayDeviceName(clientType),clientType,getIdentity:identity,isAvailable:available,
    getSnapshot:includeQueue=>captureRelaySnapshot(player,includeQueue),
    pauseLocal(){cancelPlaybackIntent();player.autoPlayOnLoad=false;player.setPlaying(false)},
    async applyRemote(value,signal){
      if(!['feature.handoff','feature.playback'].every(requireFeature))return false
      const snapshot=restoreRelaySnapshot(value)
      const {playSongWithQueue}=await import('@/utils/globalPlayer.js')
      if(signal.aborted)return false
      const played=await playSongWithQueue(snapshot.song,snapshot.queue,snapshot.queueIndex,{autoplay:true,resumeMs:snapshot.resumeMs,signal,maintenanceTargets:['feature.handoff']})
      if(played&&!signal.aborted){player.setCurrentQueueIndex(snapshot.queueIndex);player.setPlayMode(snapshot.playMode)}
      return played&&!signal.aborted
    },
  })
  actions.accept=()=>['feature.handoff','feature.playback'].every(requireFeature)?engine.accept():Promise.resolve(false)
  actions.reconnect=()=>engine.reconnect();actions.refresh=()=>engine.refresh()
  actions.updatePreferences=()=>{if(state.enabled&&available())void engine.connect(identity());else engine.stop()}
  const stops=[
    subscribePlaybackIntent(()=>engine.userIntent()),
    watch(()=>[user.userId,user.getUserCookie],()=>actions.updatePreferences(),{immediate:true}),
    watch(()=>player.isPlaying,playing=>engine.userPlaying(playing),{flush:'post'}),
    watch(()=>player.playQueue,()=>engine.localChanged(true),{deep:1,flush:'post'}),
    watch(()=>[player.currentSong?.id,player.currentQueueIndex,player.playMode],()=>engine.localChanged(true),{flush:'post'}),
    watch(()=>player.currentTimeMs,(value,previous)=>{if(Math.abs(value-previous)>3000)engine.localChanged(false)},{flush:'post'}),
    subscribeMaintenance(()=>{if(!available()){state.panelOpen=false;engine.stop()}else if(state.enabled)void engine.connect(identity())}),
  ]
  const hidden=()=>{if(!document.hidden){void engine.refresh();if(state.owned)void engine.flush()}}
  const pagehide=()=>{void engine.flush({keepalive:true})}
  const online=()=>{void engine.refresh()}
  document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',pagehide);window.addEventListener('online',online)
  stopInstalled=()=>{stops.forEach(stop=>stop());document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',pagehide);window.removeEventListener('online',online);engine.stop();state.panelOpen=false;actions.accept=async()=>false;actions.reconnect=async()=>false;actions.refresh=async()=>null;actions.updatePreferences=()=>{};stopInstalled=null}
  return stopInstalled
}
