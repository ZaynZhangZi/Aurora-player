import {computed, reactive} from 'vue'
import {requireFeature} from '@/utils/maintenanceAccess.js'
let preferences={}
try {preferences=JSON.parse(localStorage.getItem('aurora-relay-preferences-v1') || '{}')} catch {}
export const playbackRelayState=reactive({enabled:preferences.enabled!==false,reminders:preferences.reminders!==false,
  panelOpen:false,connected:false,connecting:false,busy:false,owned:false,remote:null,error:'',notice:'',lastSyncedAt:0,dismissed:'',deviceId:''})
export const playbackRelayActions={accept:async()=>false,reconnect:async()=>false,refresh:async()=>null,updatePreferences:()=>{}}
export const playbackRelayTrack=computed(()=>playbackRelayState.remote?.queue?.[playbackRelayState.remote?.queueIndex] || null)
export const playbackRelayOffer=computed(()=>{
  const state=playbackRelayState,remote=state.remote
  return state.enabled&&state.reminders&&!state.owned&&!state.busy&&!!playbackRelayTrack.value
    &&remote.sourceDeviceId!==state.deviceId&&state.dismissed!==String(remote.sourceDeviceId)+':'+remote.generation
})
export function openPlaybackRelay(){if(requireFeature('feature.handoff'))playbackRelayState.panelOpen=true}
export function dismissPlaybackRelay(){const remote=playbackRelayState.remote;if(remote)playbackRelayState.dismissed=String(remote.sourceDeviceId)+':'+remote.generation}
export function setPlaybackRelayPreferences(patch){
  if(typeof patch.enabled==='boolean')playbackRelayState.enabled=patch.enabled
  if(typeof patch.reminders==='boolean')playbackRelayState.reminders=patch.reminders
  if(typeof patch.enabled==='boolean')playbackRelayActions.updatePreferences()
  try {localStorage.setItem('aurora-relay-preferences-v1',JSON.stringify({enabled:playbackRelayState.enabled,reminders:playbackRelayState.reminders}))} catch {}
}
