import apiClient from '@/axios/apiClient.js'

const recentEndpointMap = {
  song: '/record/recent/song',
  playlist: '/record/recent/playlist',
  album: '/record/recent/album',
  dj: '/record/recent/dj',
}

export const personalHomeApi = {
  getDailySongs() {
    return apiClient.get('/recommend/songs')
  },

  getDailyPlaylists() {
    return apiClient.get('/recommend/resource')
  },

  getPersonalFm() {
    return apiClient.get('/personal_fm')
  },

  getPersonalFmMode(mode = 'DEFAULT', submode = '') {
    return apiClient.get('/personal/fm/mode', {
      params: {
        mode,
        ...(submode ? {submode} : {}),
      },
    })
  },

  getStylePreference() {
    return apiClient.get('/style/preference')
  },

  getRecent(kind = 'song', limit = 12) {
    const endpoint = recentEndpointMap[kind] || recentEndpointMap.song
    return apiClient.get(endpoint, {params: {limit}})
  },

  getGuestSongs(limit = 12) {
    return apiClient.get('/personalized/newsong', {params: {limit}})
  },

  getGuestPlaylists(limit = 6) {
    return apiClient.get('/personalized', {params: {limit}})
  },
}
