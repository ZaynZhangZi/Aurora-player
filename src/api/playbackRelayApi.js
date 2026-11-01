export class PlaybackRelayError extends Error {
  constructor(status, message) {super(message);this.name='PlaybackRelayError';this.status=status}
}
export function createPlaybackRelayApi({baseUrl, fetchImpl = (...args) => globalThis.fetch(...args)}) {
  const root = String(baseUrl || '').replace(/\/$/, '') + '/api/v1/playback'
  async function request(path, {method='GET', token, body, signal, keepalive=false} = {}) {
    const controller = new AbortController()
    const abort = () => controller.abort()
    if (signal?.aborted) controller.abort()
    else signal?.addEventListener('abort', abort, {once:true})
    const timer = setTimeout(abort, body?.queue ? 30000 : 10000)
    try {
      const response = await fetchImpl(root + path, {method, credentials:'omit', cache:'no-store', signal:controller.signal, keepalive,
        headers:{Accept:'application/json', ...(token ? {Authorization:'Bearer ' + token} : {}), ...(body !== undefined ? {'Content-Type':'application/json'} : {})},
        ...(body !== undefined ? {body:JSON.stringify(body)} : {})})
      let envelope
      try {envelope=await response.json()} catch {throw new PlaybackRelayError(response.status || 502, '接力响应无效')}
      if (!response.ok || envelope?.code !== 200) throw new PlaybackRelayError(response.ok ? envelope?.code || 502 : response.status, envelope?.message || '接力暂时不可用')
      return envelope.data ?? null
    } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort)}
  }
  async function stream(token, signal, onEvent) {
    const response = await fetchImpl(root + '/events', {headers:{Accept:'text/event-stream',Authorization:'Bearer ' + token},credentials:'omit',cache:'no-store',signal})
    if (!response.ok) throw new PlaybackRelayError(response.status, '接力连接中断')
    if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body?.getReader) throw new PlaybackRelayError(502,'接力连接不可用')
    const reader=response.body.getReader(),decoder=new TextDecoder()
    let buffer='',name='message',data=[],eventSize=0
    try {
      while (!signal.aborted) {
        const next=await reader.read()
        if (next.done) break
        buffer+=decoder.decode(next.value,{stream:true})
        if (buffer.length>65536) throw new PlaybackRelayError(502,'接力事件过大')
        let index
        while ((index=buffer.indexOf('\n'))>=0) {
          const line=buffer.slice(0,index).replace(/\r$/, '');buffer=buffer.slice(index+1)
          if (!line) {
            if (data.length) {try {onEvent({name,data:JSON.parse(data.join('\n'))})} catch { /* Invalid events never change playback. */ }}
            name='message';data=[];eventSize=0
          } else if (line.startsWith('event:')) name=line.slice(6).trim()
          else if (line.startsWith('data:')) {
            eventSize+=line.length
            if(eventSize>65536)throw new PlaybackRelayError(502,'接力事件过大')
            data.push(line.slice(5).replace(/^ /,''))
          }
        }
      }
    } finally {await reader.cancel().catch(()=>{})}
  }
  return {
    exchange:(body,signal)=>request('/session',{method:'POST',body,signal}),
    read:(token,signal)=>request('/state',{token,signal}),
    claim:(token,signal)=>request('/claim',{method:'POST',token,signal}),
    checkpoint:(token,body,signal,keepalive=false)=>request('/checkpoint',{method:'POST',token,body,signal,keepalive}),
    revoke:token=>request('/session',{method:'DELETE',token}),stream,
  }
}
