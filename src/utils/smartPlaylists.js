export const SMART_DEFAULT_RULES=Object.freeze({
  likedDays:0,excludePlayedDays:0,artist:'',minDurationSec:0,maxDurationSec:0,
  historyDays:90,minPlays:0,maxPlays:-1,sort:'RECENT_FAVORITES',limit:50,
})
export const SMART_SORTS=Object.freeze([
  ['RECENT_FAVORITES','最近收藏优先'],['LEAST_PLAYED','少听的优先'],['MOST_PLAYED','常听的优先'],
  ['LAST_PLAYED_OLDEST','最久未听优先'],['SHORTEST','短歌优先'],['LONGEST','长歌优先'],
])
export const SMART_TEMPLATES=Object.freeze([
  {key:'recent',name:'最近收藏',eyebrow:'FRESH FAVORITES',description:'把最近30天新喜欢的声音放在一起。',rules:{...SMART_DEFAULT_RULES,likedDays:30}},
  {key:'rediscover',name:'久未重听',eyebrow:'MEET AGAIN',description:'找回最近一周在这里没听过的收藏。',rules:{...SMART_DEFAULT_RULES,excludePlayedDays:7,sort:'LAST_PLAYED_OLDEST'}},
  {key:'repeat',name:'常听精选',eyebrow:'ON REPEAT',description:'最近90天在这里听过至少3次的收藏歌曲。',rules:{...SMART_DEFAULT_RULES,minPlays:3,sort:'MOST_PLAYED'}},
])
export function copySmartRules(value={}) {
  return Object.fromEntries(Object.entries(SMART_DEFAULT_RULES).map(([key,fallback])=>[key,value[key]??fallback]))
}
export function smartSignature(name,rules){return JSON.stringify([String(name||'').trim(),copySmartRules(rules)])}
export function smartRulesError(rules) {
  const bounds={likedDays:[0,3650],excludePlayedDays:[0,365],minDurationSec:[0,604800],maxDurationSec:[0,604800],historyDays:[1,365],minPlays:[0,100000],maxPlays:[-1,100000],limit:[1,500]}
  if(Object.entries(bounds).some(([key,[min,max]])=>!Number.isInteger(rules[key])||rules[key]<min||rules[key]>max))return '请填写有效的时间、次数和歌曲数量。'
  if(typeof rules.artist!=='string'||rules.artist.length>100)return '歌手名称最多100个字。'
  if(!SMART_SORTS.some(([key])=>key===rules.sort))return '请选择排序方式。'
  if(rules.maxDurationSec>0&&rules.minDurationSec>rules.maxDurationSec)return '最短时长不能大于最长时长。'
  if(rules.maxPlays>=0&&rules.minPlays>rules.maxPlays)return '最低播放次数不能大于最高次数。'
  return ''
}
export function smartSummary(value) {
  const rules=copySmartRules(value),parts=[]
  if(rules.likedDays)parts.push('近'+rules.likedDays+'天收藏')
  if(rules.excludePlayedDays)parts.push(rules.excludePlayedDays+'天内未听')
  if(rules.artist.trim())parts.push(rules.artist.trim())
  if(rules.minPlays>0)parts.push('近'+rules.historyDays+'天至少听'+rules.minPlays+'次')
  if(rules.maxPlays>=0)parts.push('近'+rules.historyDays+'天最多听'+rules.maxPlays+'次')
  if(rules.minDurationSec||rules.maxDurationSec)parts.push('按时长筛选')
  return (parts.length?parts:['我的收藏']).slice(0,3).join(' · ')
}
export function smartTrackForPlayer(track) {
  return {id:track.id,name:track.name,artists:(track.artists||[]).map(name=>({name})),
    album:{name:track.album||''},cover:track.cover||'',dt:track.durationMs||0}
}
export function uniqueSmartName(base,names) {
  const taken=new Set(names)
  if(!taken.has(base))return base
  for(let index=2;index<1000;index++)if(!taken.has(base+' '+index))return base+' '+index
  return base+' '+Date.now()
}
