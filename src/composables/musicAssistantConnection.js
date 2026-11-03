import {createMusicAssistantApi} from '@/api/musicAssistantApi.js'
import {getMaintenanceSnapshot,isTargetAvailable,requireFeature} from '@/utils/maintenanceAccess.js'
import {backendBaseUrl} from '@/utils/backendMedia.js'

const connections=new WeakMap()
const subscriptions=new Set()
export function musicAssistantConnection(user){
  if(connections.has(user))return connections.get(user)
  const getScope=()=>user.isLoggedIn?String(user.userId):'guest'
  let scope=getScope()
  const api=createMusicAssistantApi({
    baseUrl:import.meta.env.VITE_MUSIC_ASSISTANT_API_BASE_URL||backendBaseUrl(),getScope,
    beforeRequest:()=>{
      const settings=getMaintenanceSnapshot().settings
      const key=['page.musicAssistant','feature.musicAssistant','feature.ai'].find(key=>!isTargetAvailable(settings,key))
      if(key){requireFeature(key);throw new DOMException('维护中','AbortError')}
    },
  })
  // Keep logout revocation active while the user visits other pages.
  subscriptions.add(user.$subscribe(()=>{const current=getScope();if(current!==scope){scope=current;void api.reset()}},{detached:true,flush:'sync'}))
  connections.set(user,api)
  return api
}
if(import.meta.hot)import.meta.hot.dispose(()=>{subscriptions.forEach(unsubscribe=>unsubscribe());subscriptions.clear()})
