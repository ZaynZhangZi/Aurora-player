import axios from 'axios';
import {useCounterStore} from "@/stores/userStores.js";

const COOKIE_ATTR_KEYS = new Set([
    'path',
    'expires',
    'max-age',
    'domain',
    'secure',
    'httponly',
    'samesite',
    'priority',
]);

function normalizeCookieString(rawCookie) {
    const raw = String(rawCookie || '').trim();
    if (!raw) return '';

    const entries = raw
        .split(';')
        .map(item => item.trim())
        .filter(Boolean)
        .map((item) => {
            const index = item.indexOf('=');
            if (index < 0) return null;
            const key = item.slice(0, index).trim();
            const value = item.slice(index + 1).trim();
            if (!key || !value) return null;
            return {key, value};
        })
        .filter(Boolean)
        .filter(({key}) => !COOKIE_ATTR_KEYS.has(String(key).toLowerCase()));

    if (!entries.length) return '';

    const map = new Map();
    entries.forEach(({key, value}) => {
        if (!map.has(key)) map.set(key, value);
    });

    return Array.from(map.entries()).map(([key, value]) => `${key}=${value}`).join('; ');
}

function readStoredCookieFallback() {
    try {
        return normalizeCookieString(localStorage.getItem('usermasgcookie') || '');
    } catch {
        return '';
    }
}

// 创建一个封装的 Axios 实例
const axiosInstance = axios.create({
    withCredentials: true, // 自动发送和接收 Cookie
    baseURL: '/api', // 设置默认的 base URL，可根据需要修改
    timeout: 10000, // 设置请求超时时间
});



// 请求拦截器，用于在请求之前做一些处理
axiosInstance.interceptors.request.use(
    (config) => {
        const store = useCounterStore();
        const loginCookie = normalizeCookieString(store.getUserCookie || readStoredCookieFallback());
        const noCookie = Boolean(config.params?.noCookie);

        // 添加时间戳参数
        config.params = {
            ...config.params,
            timestamp: new Date().getTime(),
        };

        // 关键：通过 query 透传 cookie，避免浏览器端无法可靠写入后端域 Cookie
        if (loginCookie && !config.params.cookie && !noCookie) {
            config.params.cookie = loginCookie;
        }

        // 检查是否存在 Cookie，存在时可在请求头中添加
        if (loginCookie && !noCookie) {
            config.headers = {
                ...config.headers,
                'Custom-Cookie': loginCookie,
            };
        }

        if (config.params?.noCookie) {
            delete config.params.noCookie;
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
