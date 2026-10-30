import {useCounterStore} from '@/stores/userStores.js'
import {assertMaintenanceRequest} from './maintenanceAccess.js'
import {createRequestCache} from './requestCache.js'

const cache = createRequestCache()
let identity = ''
function account() {
  const user = useCounterStore()
  const next = String(user.userId || '') + ':' + String(user.getUserCookie || '')
  if (next !== identity) { identity = next; cache.clear() }
  return next
}
export async function loadDetailResource(type, id, request, loader, {signal} = {}) {
  const owner = account()
  assertMaintenanceRequest(request, {notify: false})
  const data = await cache.load(type + ':' + String(id), async requestSignal => {
    const response = await loader(requestSignal)
    if (response?.data?.code !== undefined && response.data.code !== 200) throw new Error(response.data.message || '详情加载失败')
    return response.data
  }, {signal})
  if (account() !== owner) throw new DOMException('账号已切换', 'AbortError')
  assertMaintenanceRequest(request, {notify: false})
  return {data}
}
export function invalidateDetailResource(type, id) {
  account()
  cache.invalidate(type + ':' + String(id))
}
