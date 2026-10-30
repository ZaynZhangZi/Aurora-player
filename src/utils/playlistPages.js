import {waitForIdle} from './deferredWork.js'

// Reuse the detail response's existing ordered prefix; only fetch missing pages.
// Yield between batches so a large playlist cannot monopolize the network.
export async function loadPlaylistPages({initial = [], total = 0, fetchPage, signal, idle = waitForIdle}) {
  const result = new Map(initial.filter(song => song?.id).map(song => [String(song.id), song]))
  let offset = initial.length
  let expected = total > 0 ? total : offset
  if (!offset && !expected) expected = 100
  while (offset < expected && !signal?.aborted) {
    if (!await idle({signal})) break
    const offsets = [offset, offset + 100].filter(start => start < expected)
    const chunks = await Promise.all(offsets.map(start => fetchPage(100, start).catch(() => [])))
    if (signal?.aborted) break
    for (const chunk of chunks) for (const song of chunk || []) if (song?.id && !result.has(String(song.id))) result.set(String(song.id), song)
    offset += offsets.length * 100
  }
  return [...result.values()]
}
