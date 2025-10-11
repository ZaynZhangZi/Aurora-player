/**
 * author: zijun
 * @description: 首页接口Api
 */
import apiClient from "@/axios/apiClient";
import axios from "axios";


export const otherApi = {
    //主页情话
    getHomePraise() {
        return axios.get("https://api.vvhan.com/api/text/love")
    },
}
