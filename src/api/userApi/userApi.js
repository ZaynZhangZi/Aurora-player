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
        return apiClient.get(`/login/qr/create?key=${key}&qrimg=true`)
    },

    //二维码检测扫码状态接口
    checkQrCode(key){
        return apiClient.get(`/login/qr/check?key=${key}`)
    },

    //获取账号信息
    getUserInfo(){
        return apiClient.get('/user/account')
    },
}
