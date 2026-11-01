export function createAnalysisScheduler({max=128}={}) {
  const tasks=new Map()
  return function schedule(key,analyze,complete,failed=()=>{}) {
    if(tasks.has(key))return false
    const marker={}
    tasks.set(key,marker)
    while(tasks.size>max)tasks.delete(tasks.keys().next().value)
    void Promise.resolve().then(analyze).then(profile=>{
      if(!profile){if(tasks.get(key)===marker)tasks.delete(key);return}
      // Keep completed low-confidence results too: cached fallbacks must not
      // dispatch another profile-ready event on every warmup.
      complete(profile)
    }).catch(error=>{if(tasks.get(key)===marker)tasks.delete(key);failed(error)})
    return true
  }
}
