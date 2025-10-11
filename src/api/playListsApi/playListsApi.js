/**
 * author: zijun
 * @description: 歌单接口
 */
import apiClient from "@/axios/apiClient";


export const playListsApi = {
    //获取精品歌单
    getHighQualityPlayList: (limit) => {
        return apiClient.get(`/top/playlist/highquality/5001?limit=${limit}`);
    },

    //获取歌单详情
    getPlayListDetail: (id) => {
        return apiClient.get(`/playlist/detail?id=${id}`);
    },

    //歌单 ( 网友精选碟 )
    getPlayList: (cat, limit, offset) => {
        return apiClient.get(`/top/playlist?cat=${cat}&limit=${limit}`);
    },

    //获取歌单所有歌曲
    getPlayListSongs: (id) => {
        return apiClient.get(`/playlist/track/all?id=${id}`);
    },

    //推荐歌单
    getRecommendPlayList: () => {
        return apiClient.get(`/personalized?limit=8`);
    },
}
