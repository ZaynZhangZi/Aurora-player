import { songsApi } from '@/api/songsApi/songsApi.js'

export function usePlayerAssets({ isVideoUrl }) {
  const dynamicCoverCache = new Map()
  let dynamicCoverToken = 0

  function pickDynamicCover(payload) {
    const data = payload?.data ?? payload
    const root = data?.data ?? data ?? {}
    const hintedType = String(root?.type || root?.format || '').toLowerCase()
    const sources = [
      root?.videoPlayUrl,
      root?.url,
      root?.cover,
      root?.video,
      root?.videoUrl,
      root?.dynamicCover,
      root?.dynamicCoverUrl,
      root?.mvUrl,
      Array.isArray(root) ? root[0]?.videoPlayUrl : '',
      Array.isArray(root) ? root[0]?.url : '',
      Array.isArray(root) ? root[0]?.cover : '',
      Array.isArray(root?.list) ? root.list[0]?.videoPlayUrl : '',
      Array.isArray(root?.list) ? root.list[0]?.url : '',
      Array.isArray(root?.list) ? root.list[0]?.cover : '',
    ]

    for (const candidate of sources) {
      const url = String(candidate || '').trim()
      if (!url || !/^https?:\/\//i.test(url)) continue
      return {
        url,
        isVideo: hintedType.includes('video') || isVideoUrl(url),
      }
    }

    return { url: '', isVideo: false }
  }

  async function loadDynamicCover(songId, applyDynamicCover) {
    const id = Number(songId)
    if (!Number.isFinite(id) || id <= 0) {
      applyDynamicCover({ url: '', isVideo: false })
      return
    }

    if (dynamicCoverCache.has(id)) {
      const cached = dynamicCoverCache.get(id) || { url: '', isVideo: false }
      applyDynamicCover({ url: cached.url || '', isVideo: Boolean(cached.isVideo) })
      return
    }

    const token = ++dynamicCoverToken
    try {
      const res = await songsApi.getDynamicCover(id)
      const dynamic = pickDynamicCover(res)
      dynamicCoverCache.set(id, dynamic)
      if (token !== dynamicCoverToken) return
      applyDynamicCover({ url: dynamic.url, isVideo: Boolean(dynamic.isVideo) })
    } catch {
      dynamicCoverCache.set(id, { url: '', isVideo: false })
      if (token !== dynamicCoverToken) return
      applyDynamicCover({ url: '', isVideo: false })
    }
  }

  return {
    loadDynamicCover,
  }
}
