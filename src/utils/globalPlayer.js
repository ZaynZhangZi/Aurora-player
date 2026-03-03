import {songsApi} from '@/api/songsApi/songsApi.js'
import {usePlayerStore} from '@/stores/playerStore.js'

function resolveArtists(song, detail) {
  return song?.artists || song?.ar || detail?.ar || detail?.artists || []
}

function resolveCover(song, detail) {
  return song?.cover || song?.coverImgUrl || song?.picUrl || song?.al?.picUrl || song?.album?.picUrl || detail?.al?.picUrl || detail?.album?.picUrl || ''
}

function resolveName(song, detail) {
  return song?.name || detail?.name || ''
}

export async function playSongById(songInput, {autoplay = true} = {}) {
  const id = Number(songInput?.id || songInput)
  if (!Number.isFinite(id) || id <= 0) return false

  const playerStore = usePlayerStore()

  try {
    const [urlRes, detailRes] = await Promise.all([
      songsApi.getSongUrl(id),
      songsApi.getSongDetail(id),
    ])

    const url = urlRes?.data?.data?.[0]?.url || ''
    if (!url) return false

    const detail = detailRes?.data?.songs?.[0] || null

    playerStore.setTrack(
      {
        id,
        name: resolveName(songInput, detail),
        artists: resolveArtists(songInput, detail),
        cover: resolveCover(songInput, detail),
        url,
      },
      {autoplay, resetTime: true},
    )

    return true
  } catch {
    return false
  }
}
