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

  //获取banner
  getBanner() {
    return requestLocal.get('/api/banner');
  }

}
