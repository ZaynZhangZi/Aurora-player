/**
 * author: zijun
 * @description: 歌手接口
 */
import apiClient from "@/axios/apiClient";
import requestLocal from "@/axios/myBackend.js";


export const artistApi = {
  //获取歌手信息
  getArtistInfo: (id) => {
    return apiClient.get(`/artist/detail?id=${id}`);
  },

  //获取歌手热门50首歌曲
  getArtistHotSongs: (id) => {
    return apiClient.get(`/artist/top/song?id=${id}`);
  },

  //获取歌手专辑
  getArtistAlbum: (id, {limit = 12, offset = 0} = {}) => {
    return apiClient.get('/artist/album', {
      params: {
        id,
        limit,
        offset,
      },
    });
  },

  //获取歌手全部歌曲
  getArtistAllSongs: (id, {limit = 50, offset = 0, order = 'hot'} = {}) => {
    return apiClient.get('/artist/songs', {
      params: {
        id,
        limit,
        offset,
        order,
      },
    });
  },

  //获取歌手mv
  getArtistMv: (id, {limit = 30, offset = 0} = {}) => {
    return apiClient.get('/artist/mv', {
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
  getAlbumDetail: (id) => {
    return apiClient.get('/album', {
      params: {
        id,
      },
    });
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
  getLikeArtist: () => {
    return requestLocal.get(`/api/manage-list`);
  },

  //获取歌手视频
  getArtistVideo: async (name) => {
    const queryName = String(name || '').trim();
    if (!queryName) {
      return {data: null};
    }

    try {
      return await requestLocal.get('/api/singer-videos/lookup', {
        params: {name: queryName},
      });
    } catch (error) {
      return requestLocal.get('/singer-videos/lookup', {
        params: {name: queryName},
      });
    }
  }
}
