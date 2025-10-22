/**
 * author: zijun
 * @description: 歌手接口
 */
import apiClient from "@/axios/apiClient";


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
  getArtistAlbum: (id, offset) => {
    return apiClient.get(`/artist/album?id=${id}&limit=8&offset=${offset}`);
  },

  //获取歌手全部歌曲
  getArtistAllSongs: (id, offset) => {
    return apiClient.get(`/artist/songs?id=${id}&limit=10&offset=${offset}`);
  },

  //获取歌手mv
  getArtistMv: (id, offset) => {
    return apiClient.get(`/artist/mv?id=${id}&limit=8&offset=${offset}`);
  },

  //获取mv播放地址
  getMvUrl: (id) => {
    return apiClient.get(`/mv/url?id=${id}`);
  },

  //热门歌手
  getHotArtist: () => {
    return apiClient.get(`/top/artists?offset=0&limit=10`);
  },

  //搜索歌手
  searchArtist: (keywords) => {
    return apiClient.get(`/ugc/artist/search?keyword=${keywords}`);
  }
}
