import {ExpiringCache} from '@/utils/expiringCache.js';
const lyricCache = new ExpiringCache({max: 64, ttl: 30000});
let lyricAuth = '';
/**
 * author: zijun
 * @description: 歌曲接口
 */
import apiClient from "@/axios/apiClient.js";
import requestLocal, {unwrapBackendResponse} from "@/axios/myBackend.js";
import { useCounterStore } from "@/stores/userStores.js";
import {toBackendMediaUrl, toBackendRequestUrl} from "@/utils/backendMedia.js";

async function unwrap(request) {
	return unwrapBackendResponse(await request);
}

export const songsApi = {
	//获取动态封面
	getDynamicCover(id) {
		return apiClient.get(`/song/dynamic/cover?id=${id}`);
	},

	getSongDetail(id) {
		return apiClient.get(`/song/detail?ids=${id}`);
	},

	getSongWikiSummary(id) {
		return apiClient.get('/song/wiki/summary', {
			params: {id},
		});
	},

	getSongMusicDetail(id) {
		return apiClient.get('/song/music/detail', {
			params: {id},
		});
	},

	getSongComments(id, {limit = 8, offset = 0, before = 0} = {}) {
		return apiClient.get('/comment/music', {
			params: {
				id,
				limit,
				offset,
				...(before ? {before} : {}),
			},
		});
	},

	getSimilarSongs(id, {limit = 8, offset = 0} = {}) {
		return apiClient.get('/simi/song', {
			params: {
				id,
				limit,
				offset,
			},
		});
	},

	getSongUrl(id, { level = 'exhigh' } = {}) {
		return apiClient.get('/song/url/v1', {
			timeout: 6000,
			params: {
				id,
				level,
			},
		});
	},

	getSongUrlLegacy(id) {
		return apiClient.get(`/song/url?id=${id}`, {timeout: 6000});
	},

	getLyric(id, {signal} = {}) {
		return apiClient.get(`/lyric?id=${id}`, {signal});
	},

	getLyricNew(id, {signal} = {}) {
		return apiClient.get(`/lyric/new?id=${id}`, {signal});
	},

	async getLyricSearch(params = {}) {
		const songName = params.songName || params.name || params.keyword || '';
		const artist = params.artist || '';
		const songId = String(params.songId || params.id || '');
		const auth = String(useCounterStore().getUserCookie || '');
		if (auth !== lyricAuth) { lyricAuth = auth; lyricCache.clear(); }
		const key = JSON.stringify([songId, songName, artist]);
		const cached = lyricCache.get(key);
		if (cached) return cached;
		const data = await unwrap(requestLocal.get('/api/v1/content/lyrics/search', {
			signal: params.signal,
			params: {
				songId,
				songName,
				artist,
			},
		}));
		const list = Array.isArray(data) ? data : [];
		const ranked = [...list].sort((a, b) => {
            const score = item => (String(item.songId || '') === songId ? 100 : 0) + (item.songName === songName ? 10 : 0) + (item.artist === artist ? 5 : 0);
            return score(b) - score(a);
        });
        const hydrated = ranked.length ? [await hydrateBackendLyric(ranked[0], params.signal)] : [];
        const result = {data: hydrated};
        if (!params.signal?.aborted) lyricCache.set(key, result);
        return result;
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
	async likeSongs(id, like) {
		const store = useCounterStore();
		if (store.userId) {
			const response = await apiClient.get(`/like?id=${id}&like=${like}`);
			return response;
		}
	},

	//推荐新音乐可选参数 : limit: 取出数量 , 默认为 10 (不支持 offset)
	getNewSongs() {
		return apiClient.get(`/personalized/newsong?limit=8`);
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

async function hydrateBackendLyric(item, signal) {
	if (!item || typeof item !== 'object') return item;
	const lyricUrl = toBackendMediaUrl(item.lyricUrl);
	if (String(item.lyricContent || '').trim() || !lyricUrl) {
		return {...item, lyricUrl};
	}
	try {
		const response = await requestLocal.get(toBackendRequestUrl(lyricUrl), {
			signal,
			responseType: 'text',
			transformResponse: [(value) => value],
		});
		return {
			...item,
			lyricUrl,
			lyricContent: String(response?.data || '').replace(/^\uFEFF/, ''),
		};
	} catch (error) {
		if (signal?.aborted) throw error;
		try {
			const detail = await unwrap(requestLocal.get(`/api/v1/content/lyrics/${item.id}`, {signal}));
			return {
				...item,
				...detail,
				lyricUrl: toBackendMediaUrl(detail?.lyricUrl || lyricUrl),
			};
		} catch {
			return {...item, lyricUrl};
		}
	}
}
