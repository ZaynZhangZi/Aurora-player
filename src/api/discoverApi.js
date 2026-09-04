import apiClient from '@/axios/apiClient.js'

export const discoverApi = {
  getStyles() {
    return apiClient.get('/style/list')
  },

  getStyleDetail(tagId) {
    return apiClient.get('/style/detail', {params: {tagId}})
  },

  getStyleSongs(tagId, {size = 12, cursor = 0, sort = 0} = {}) {
    return apiClient.get('/style/song', {params: {tagId, size, cursor, sort}})
  },

  getStyleAlbums(tagId, {size = 10, cursor = 0, sort = 0} = {}) {
    return apiClient.get('/style/album', {params: {tagId, size, cursor, sort}})
  },

  getStylePlaylists(tagId, {size = 10, cursor = 0} = {}) {
    return apiClient.get('/style/playlist', {params: {tagId, size, cursor}})
  },

  getStyleArtists(tagId, {size = 10, cursor = 0} = {}) {
    return apiClient.get('/style/artist', {params: {tagId, size, cursor}})
  },

  getNewAlbums({area = 'ALL', type = 'new', limit = 24, offset = 0} = {}) {
    return apiClient.get('/top/album', {params: {area, type, limit, offset}})
  },

  getCharts() {
    return apiClient.get('/toplist/detail')
  },

  getArtistChart(type = 1) {
    return apiClient.get('/toplist/artist', {params: {type}})
  },

  getArtists({type = -1, area = -1, initial = -1, limit = 30, offset = 0} = {}) {
    return apiClient.get('/artist/list', {params: {type, area, initial, limit, offset}})
  },

  getDjCategories() {
    return apiClient.get('/dj/catelist')
  },

  getHotRadios({cateId, limit = 18, offset = 0} = {}) {
    return apiClient.get('/dj/radio/hot', {params: {cateId, limit, offset}})
  },

  getProgramChart({limit = 12, offset = 0} = {}) {
    return apiClient.get('/dj/program/toplist', {params: {limit, offset}})
  },
}
