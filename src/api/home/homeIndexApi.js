/**
 * author: zijun
 * @description: 首页接口Api
 */
import apiClient from "@/axios/apiClient";
import requestLocal from "@/axios/myBackend.js";


export const homeIndexApi = {
  getAppindexPage() {
    return apiClient.get('/homepage/block/page');
  },

  // 获取主页 banner
  getBanner() {
    return requestLocal.get('/api/banner');
  },

  // 获取发布日志
  getReleaseNotes(params = {}) {
    return requestLocal.get('/api/release-notes', { params });
  },

}
