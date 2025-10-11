/**
 * author: zijun
 * @description: 首页接口Api
 */
import apiClient from "@/axios/apiClient";


export const homeIndexApi = {
    getAppindexPage(){
        return apiClient.get('/homepage/block/page');
    }
}
