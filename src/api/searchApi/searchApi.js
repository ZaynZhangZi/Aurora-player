import apiClient from '@/axios/apiClient'

export const searchApi = {
  searchByType(keywords, { type = 1, limit = 30, offset = 0, endpoint = '/cloudsearch' } = {}) {
    return apiClient.get(endpoint, {
      params: {
        keywords,
        type,
        limit,
        offset,
      },
    })
  },

  async searchComposite(keywords, { limit = 6, offsets = {} } = {}) {
    const artistOffset = offsets.artist || 0
    const songOffset = offsets.song || 0
    const playlistOffset = offsets.playlist || 0

    const requests = [
      this.searchByType(keywords, { type: 100, limit, offset: artistOffset }),
      this.searchByType(keywords, { type: 1, limit, offset: songOffset }),
      this.searchByType(keywords, { type: 1000, limit, offset: playlistOffset }),
    ]

    const [artistRes, songRes, playlistRes] = await Promise.allSettled(requests)

    const artistResult = artistRes.status === 'fulfilled' ? artistRes.value?.data?.result || {} : {}
    const songResult = songRes.status === 'fulfilled' ? songRes.value?.data?.result || {} : {}
    const playlistResult = playlistRes.status === 'fulfilled' ? playlistRes.value?.data?.result || {} : {}

    return {
      artists: artistResult.artists || [],
      songs: songResult.songs || [],
      playlists: playlistResult.playlists || [],
      counts: {
        artist: artistResult.artistCount || 0,
        song: songResult.songCount || 0,
        playlist: playlistResult.playlistCount || 0,
      },
      limit,
      offsets: {
        artist: artistOffset,
        song: songOffset,
        playlist: playlistOffset,
      },
    }
  },
}
