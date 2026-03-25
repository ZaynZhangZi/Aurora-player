/**
 * author: zijun
 * @description: 歌曲接口
 */
import apiClient from "@/axios/apiClient.js";
import { useCounterStore } from "@/stores/userStores.js";

export const songsApi = {
	//获取动态封面
	getDynamicCover(id) {
		return apiClient.get(`/song/dynamic/cover?id=${id}`);
	},

	getSongDetail(id) {
		return apiClient.get(`/song/detail?ids=${id}`);
	},

	getSongUrl(id, { level = 'exhigh' } = {}) {
		return apiClient.get('/song/url/v1', {
			params: {
				id,
				level,
			},
		});
	},

	getSongUrlLegacy(id) {
		return apiClient.get(`/song/url?id=${id}`);
	},

	getLyric(id) {
		return apiClient.get(`/lyric?id=${id}`);
	},

	getLyricNew(id) {
		return apiClient.get(`/lyric/new?id=${id}`);
	},

	//搜索歌曲
	searchSongs(keywords, limit, offset) {
		return apiClient.get(
			`/cloudsearch?keywords=${keywords}&limit=${limit}&offset=${offset}`,
		);
	},

	//喜欢音乐列表
	getLikeSongs() {
		const store = useCounterStore();
		if (store.userId) {
			return apiClient.get(`/likelist?uid=${store.userId}`);
		}
	},

	//喜欢音乐
	likeSongs(id, like) {
		const store = useCounterStore();
		if (store.userId) {
			return apiClient.get(`/like?id=${id}&like=${like}`);
		}
	},

	//推荐新音乐可选参数 : limit: 取出数量 , 默认为 10 (不支持 offset)
	getNewSongs() {
		return apiClient.get(`/personalized/newsong?limit=3`);
	},

	//获取精品歌单
	getHighQualitySongs() {
		return apiClient.get(`/top/playlist/highquality?limit=3`);
	},

	//获取榜单概览
	getTopListDetail() {
		return apiClient.get("/toplist/detail");
	},

	//推荐播客节目
	getPodcastPrograms(limit = 6) {
		return apiClient.get(`/personalized/djprogram?limit=${limit}`);
	},

	//最近听歌列表
	async getRecentListenList(limit = 12) {
		try {
			return await apiClient.get('/record/recent/song', {
				params: {
					limit,
				},
			});
		} catch {
			return apiClient.get('/recent/listen/list', {
				params: {
					limit,
				},
			});
		}
	},

};
