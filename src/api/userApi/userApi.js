/**
 * author: zijun
 * @description: 用户接口
 */
import apiClient from "@/axios/apiClient";

export const userApi={
    //二维码 key 生成接口
    getQrKey(){
        return apiClient.get('/login/qr/key')
    },

    //生成二维码图片
    getQrCode(key){
        return apiClient.get('/login/qr/create', {
            params: {
                key,
                qrimg: true,
            },
        })
    },

    //二维码检测扫码状态接口
    checkQrCode(key, {noCookie = false} = {}){
        return apiClient.get('/login/qr/check', {
            params: {
                key,
                ...(noCookie ? {noCookie: true} : {}),
            },
        })
    },

    //获取账号信息
    getUserInfo(){
        return apiClient.get('/user/account')
    },

    getUserDetail(uid){
        return apiClient.get(`/user/detail?uid=${uid}`)
    },

    getUserSubCount(){
        return apiClient.get('/user/subcount')
    },

    getUserLevel(){
        return apiClient.get('/user/level')
    },

    getUserPlaylist(uid, limit = 20, offset = 0){
        return apiClient.get(`/user/playlist?uid=${uid}&limit=${limit}&offset=${offset}`)
    },

    getNotices(limit = 30, lasttime = -1) {
        return apiClient.get('/msg/notices', {
            params: {
                limit,
                lasttime,
            },
        })
    },

    getPrivateMessages(limit = 30, offset = 0) {
        return apiClient.get('/msg/private', {
            params: {
                limit,
                offset,
            },
        })
    },

    getPrivateHistory(uid, limit = 30, before = 0) {
        return apiClient.get('/msg/private/history', {
            params: {
                uid,
                limit,
                before,
            },
        })
    },

    sendPrivateMessage(userIds, msg) {
        return apiClient.post('/send/text', null, {
            params: {
                user_ids: userIds,
                msg,
            },
        })
    },

    logout() {
        return apiClient.get('/logout')
    },
}
