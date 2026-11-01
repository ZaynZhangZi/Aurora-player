import {computed,onBeforeUnmount,reactive,watch} from 'vue'
import {onBeforeRouteLeave} from 'vue-router'
import {useCounterStore} from '@/stores/userStores.js'
import {resolveAdminApiBaseUrl} from '@/axios/myBackend.js'
import {createSmartPlaylistApi} from '@/api/smartPlaylistApi.js'
import {createSmartPlaylistState,createSmartPlaylistWorkspace} from '@/utils/smartPlaylistWorkspace.js'
import {smartTrackForPlayer} from '@/utils/smartPlaylists.js'
import {announcePlaybackIntent} from '@/utils/playbackIntent.js'
import {getMaintenanceSnapshot,isTargetAvailable,requireFeature,subscribeMaintenance,MaintenanceBlockedError} from '@/utils/maintenanceAccess.js'
import {useFeatureMaintenance} from '@/composables/useMaintenanceAccess.js'


export function useSmartPlaylists(){
  const user=useCounterStore(),state=reactive(createSmartPlaylistState())
  const targets=['page.smartPlaylists','feature.smartPlaylists']
  const available=()=>targets.every(key=>isTargetAvailable(getMaintenanceSnapshot().settings,key))
  const api=createSmartPlaylistApi({baseUrl:resolveAdminApiBaseUrl(),getIdentity:()=>({userId:user.userId,cookie:user.getUserCookie}),
    
    beforeRequest(){if(!available())throw new MaintenanceBlockedError('feature.smartPlaylists')}})
  const engine=createSmartPlaylistWorkspace({api,state,getIdentityKey:()=>user.userId&&user.getUserCookie?String(user.userId)+':'+user.getUserCookie:'',isAvailable:available,
    async onPlay(tracks,index,signal){
      if(![...targets,'feature.playback'].every(requireFeature))return false
      const {playSongWithQueue}=await import('@/utils/globalPlayer.js')
      if(signal.aborted)return false
      const queue=tracks.map(smartTrackForPlayer)
      announcePlaybackIntent()
      return playSongWithQueue(queue[index],queue,index,{autoplay:true,signal,maintenanceTargets:targets})
    },
  })
  const stopIdentity=watch(()=>[user.userId,user.getUserCookie],()=>{engine.dispose();if(user.userId&&user.getUserCookie&&available())void engine.connect()},{immediate:true})
  let previouslyAvailable=available()
  const stopMaintenance=subscribeMaintenance(()=>{const next=available();if(next===previouslyAvailable)return;previouslyAvailable=next;if(!next)engine.suspend();else if(user.userId&&user.getUserCookie)void engine.connect({preserve:true})})
  useFeatureMaintenance('feature.smartPlaylists',()=>true)
  onBeforeRouteLeave(async()=>{if(!available()||!user.isLoggedIn||!engine.dirty())return true;return engine.persist()})
  onBeforeUnmount(()=>{stopIdentity();stopMaintenance();engine.dispose()})
  return {user,state,engine,dirty:computed(engine.dirty),validation:computed(engine.invalid)}
}
