import apiClient from "@/axios/apiClient.js";

export const loginAPi = {
  //二维码 key 生成接口
  getQrCodeKey: () => {
    return apiClient.get(`/login/qr/key`);
  },

  //二维码生成接口
  getQrCode: (key) => {
    return apiClient.get(`/login/qr/create?key=${key}&qrimg=true`);
  },

  //二维码检测扫码状态接口
  checkQrCode: (key) => {
    return apiClient.get(`/login/qr/check?key=${key}`);
  },

  //退出登录
  logout: () => {
    return apiClient.get(`/logout`);
  },
}
