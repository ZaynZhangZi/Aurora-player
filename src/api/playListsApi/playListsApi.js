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
        return apiClient.get(`/top/playlist?cat=${cat}&limit=${limit}&offset=${offset || 0}`);
    },

    //获取歌单所有歌曲
    getPlayListSongs: (id, limit = 200, offset = 0) => {
        return apiClient.get(`/playlist/track/all?id=${id}&limit=${limit}&offset=${offset}`);
    },

    //推荐歌单
    getRecommendPlayList: () => {
        return apiClient.get(`/personalized?limit=8`);
    },

    //更新歌单（完整）
    updatePlayList: (id, {name, desc, tags} = {}) => {
        return apiClient.post('/playlist/update', null, {
            params: {
                id,
                ...(name ? {name} : {}),
                ...(typeof desc === 'string' ? {desc} : {}),
                ...(tags ? {tags} : {}),
            },
        });
    },

    //更新歌单描述
    updatePlayListDesc: (id, desc) => {
        return apiClient.post('/playlist/desc/update', null, {
            params: {
                id,
                desc,
            },
        });
    },

    //更新歌单名
    updatePlayListName: (id, name) => {
        return apiClient.post('/playlist/name/update', null, {
            params: {
                id,
                name,
            },
        });
    },

    //更新歌单标签
    updatePlayListTags: (id, tags) => {
        return apiClient.post('/playlist/tags/update', null, {
            params: {
                id,
                tags,
            },
        });
    },

    //歌单封面上传
    uploadPlayListCover: (id, imgFile, imgSize = 300) => {
        const formData = new FormData()
        formData.append('imgFile', imgFile)
        return apiClient.post('/playlist/cover/update', formData, {
            params: {
                id,
                imgSize,
            },
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    //调整歌单顺序
    updatePlayListOrder: (ids) => {
        return apiClient.post('/playlist/order/update', null, {
            params: {
                ids,
            },
        });
    },

    //调整歌曲顺序
    updateSongOrder: (pid, ids) => {
        return apiClient.post('/song/order/update', null, {
            params: {
                pid,
                ids,
            },
        });
    },

    // 收藏/取消收藏歌单 t=1 收藏, t=2 取消
    subscribePlayList: (id, t = 1) => {
        return apiClient.get(`/playlist/subscribe?t=${t}&id=${id}`);
    },
}
