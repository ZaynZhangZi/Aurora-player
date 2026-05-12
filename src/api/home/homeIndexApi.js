/**
 * author: zijun
 * @description: 首页接口Api
 */
import apiClient from "@/axios/apiClient";
import requestLocal, {getPageRecords, unwrapBackendResponse} from "@/axios/myBackend.js";

async function unwrap(request) {
  return unwrapBackendResponse(await request);
}


export const homeIndexApi = {
  getAppindexPage() {
    return apiClient.get('/homepage/block/page');
  },

  // 获取主页 banner
  async getBanner(params = {}) {
    const data = await unwrap(requestLocal.get('/api/v1/content/banners', {
      params: {
        page: 0,
        size: 10,
        ...params,
      },
    }));
    const banners = getPageRecords(data);
    return {
      data: {
        banners,
        data: banners,
        raw: data,
      },
    };
  },

  // 获取发布日志
  async getReleaseNotes(params = {}) {
    const data = await unwrap(requestLocal.get('/api/v1/content/release-notes'));
    const list = Array.isArray(data) ? data : [];
    const limit = Number(params.limit || 0);
    const releaseNotes = limit > 0 ? list.slice(0, limit) : list;
    return {
      data: {
        list: releaseNotes,
        data: releaseNotes,
      },
    };
  },

}
