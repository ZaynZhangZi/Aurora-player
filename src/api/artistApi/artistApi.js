import {loadDetailResource} from '@/utils/detailResourceCache.js';
/**
 * author: zijun
 * @description: 歌手接口
 */
import apiClient from "@/axios/apiClient";
import requestLocal, {getPageRecords, unwrapBackendResponse} from "@/axios/myBackend.js";
import {toBackendMediaUrl} from "@/utils/backendMedia.js";

async function unwrap(request) {
  return unwrapBackendResponse(await request);
}


export const artistApi = {
  //获取歌手信息
  getArtistInfo: (id, options = {}) => {
    return loadDetailResource('artist', id, {url: '/artist/detail'}, signal => apiClient.get('/artist/detail', {...options, params: {...options.params, id}, signal}), options);
  },

  //获取歌手热门50首歌曲
  getArtistHotSongs: (id, options = {}) => {
    return loadDetailResource('artistSongs', id, {url: '/artist/top/song'}, signal => apiClient.get('/artist/top/song', {params: {id}, signal}), options);
  },

  //获取歌手专辑
  getArtistAlbum: (id, {limit = 12, offset = 0, signal} = {}) => {
    return apiClient.get('/artist/album', {signal,
      params: {
        id,
        limit,
        offset,
      },
    });
  },

  //获取歌手全部歌曲
  getArtistAllSongs: (id, {limit = 50, offset = 0, order = 'hot', signal} = {}) => {
    return apiClient.get('/artist/songs', {signal,
      params: {
        id,
        limit,
        offset,
        order,
      },
    });
  },

  //获取歌手mv
  getArtistMv: (id, {limit = 30, offset = 0, signal} = {}) => {
    return apiClient.get('/artist/mv', {signal,
      maintenanceTargets: ['feature.mv'],
      params: {
        id,
        limit,
        offset,
      },
    });
  },

  //获取mv播放地址
  getMvUrl: (id, r = 1080) => {
    return apiClient.get('/mv/url', {
      params: {
        id,
        r,
      },
    });
  },

  //获取mv详情
  getMvDetail: (mvid) => {
    return apiClient.get('/mv/detail', {
      params: {
        mvid,
      },
    });
  },

  //获取专辑详情
  getAlbumDetail: (id, {signal} = {}) => {
    return loadDetailResource('album', id, {url: '/album'}, requestSignal => apiClient.get('/album', {params: {id}, signal: requestSignal}), {signal});
  },

  //全部 mv
  getAllMv: ({area = '全部', type = '全部', order = '上升最快', limit = 30, offset = 0} = {}) => {
    return apiClient.get('/mv/all', {
      params: {
        area,
        type,
        order,
        limit,
        offset,
      },
    });
  },

  //最新 mv
  getLatestMv: ({area = '全部', limit = 30} = {}) => {
    return apiClient.get('/mv/first', {
      params: {
        area,
        limit,
      },
    });
  },

  //网易出品 mv
  getExclusiveMv: ({limit = 30, offset = 0} = {}) => {
    return apiClient.get('/mv/exclusive/rcmd', {
      params: {
        limit,
        offset,
      },
    });
  },

  //推荐 mv
  getRecommendMv: () => {
    return apiClient.get('/personalized/mv');
  },

  //热门歌手
  getHotArtist: () => {
    return apiClient.get(`/top/artists?offset=0&limit=10`);
  },

  //搜索歌手
  searchArtist: (keywords) => {
    return apiClient.get(`/ugc/artist/search?keyword=${keywords}`);
  },

  //获取我们喜欢的歌手
  getLikeArtist: async () => {
    const data = await unwrap(requestLocal.get('/api/v1/content/manage-lists', {
      params: {page: 0, size: 20},
    }));
    return {
      data: {
        list: getPageRecords(data),
        data: getPageRecords(data),
        raw: data,
      },
    };
  },

  //获取歌手视频
  getArtistVideo: async (name) => {
    const queryName = String(name || '').trim();
    if (!queryName) {
      return {data: null};
    }

    try {
      const data = await unwrap(requestLocal.get('/api/v1/content/singer-videos/by-name', {
        params: {name: queryName},
      }));
      return {data: normalizeSingerVideo(data)};
    } catch (error) {
      const data = await unwrap(requestLocal.get('/api/v1/content/singer-videos/search', {
        params: {keyword: queryName},
      }));
      const first = Array.isArray(data) ? data[0] || null : data;
      return {data: normalizeSingerVideo(first)};
    }
  }
}

function normalizeSingerVideo(item) {
  if (!item) return null;
  return {
    ...item,
    videoUrl: toBackendMediaUrl(item.videoUrl),
    url: toBackendMediaUrl(item.videoUrl || item.url),
    bannerVideo: toBackendMediaUrl(item.videoUrl || item.bannerVideo || item.bannerUrl),
    firstFrameUrl: toBackendMediaUrl(item.firstFrameUrl),
    coverUrl: toBackendMediaUrl(item.coverUrl),
  };
}
