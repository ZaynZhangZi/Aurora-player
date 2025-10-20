import axios from 'axios';
import {useCounterStore} from "@/stores/userStores.js";

// 创建一个封装的 Axios 实例
const axiosInstance = axios.create({
    withCredentials: true, // 自动发送和接收 Cookie
    baseURL: '/api', // 设置默认的 base URL，可根据需要修改
    timeout: 10000, // 设置请求超时时间
});



// 请求拦截器，用于在请求之前做一些处理
axiosInstance.interceptors.request.use(
    (config) => {
        // 添加时间戳参数
        config.params = {
            ...config.params,
            timestamp: new Date().getTime(),
        };

        // 检查是否存在 Cookie，存在时可在请求头中添加
        if (useCounterStore().getUserCookie) {
            config.headers = {
                ...config.headers,
                'Custom-Cookie': useCounterStore().getUserCookie, // 示例：附加 Cookie 数据
            };
        }

        return config;
    },
    (error) => {
        // 请求错误处理
        return Promise.reject(error);
    }
);

// 响应拦截器，用于对响应数据进行处理
axiosInstance.interceptors.response.use(
    (response) => {
        // 可以根据需要对响应数据进行处理
        return response;
    },
    (error) => {
        // 处理响应错误
        return Promise.reject(error);
    }
);

// 导出封装好的 axios 实例
export default axiosInstance;
