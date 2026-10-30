import {parseMaintenanceStatus} from './maintenance.js'

export function createMaintenanceStream({url, onStatus, onConnection, EventSourceImpl = globalThis.EventSource,
  now = Date.now, schedule = setTimeout, cancel = clearTimeout}) {
  if (!EventSourceImpl) return {stop() {}}
  let source, timer, stopped = false, lastSeen = now()
  function watch() {
    cancel(timer)
    timer = schedule(() => {
      if (stopped) return
      if (now() - lastSeen > 45000) {
        const previous = source
        source = undefined
        previous?.close()
        onConnection(false)
        timer = schedule(connect, 3000 + Math.random() * 1000)
      } else watch()
    }, 15000)
  }
  function connect() {
    if (stopped) return
    lastSeen = now()
    let connection
    try { connection = new EventSourceImpl(url) }
    catch {
      onConnection(false)
      timer = schedule(connect, 3000 + Math.random() * 1000)
      return
    }
    source = connection
    connection.addEventListener('maintenance', event => {
      if (stopped || source !== connection) return
      try {
        const status = parseMaintenanceStatus(JSON.parse(event.data))
        lastSeen = now()
        onStatus(status)
        onConnection(true)
      } catch { onConnection(false) }
    })
    connection.addEventListener('heartbeat', () => { if (!stopped && source === connection) lastSeen = now() })
    connection.onerror = () => { if (!stopped && source === connection) onConnection(false) }
    watch()
  }
  connect()
  return {stop() {stopped = true; cancel(timer); source?.close()}}
}
