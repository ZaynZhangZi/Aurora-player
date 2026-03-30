// src/api/requestLocal.js
import axios from 'axios'
import { useCounterStore } from '@/stores/userStores.js'

const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || '/backend-api'
const ADMIN_API_TIMEOUT = Number(import.meta.env.VITE_ADMIN_API_TIMEOUT || 10000)

const requestLocal = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  timeout: ADMIN_API_TIMEOUT,
  withCredentials: true,
})

// ====================== 请求拦截器 ======================
requestLocal.interceptors.request.use(
  (config) => {
    // ① 自动拼接时间戳，避免缓存
    config.params = {
      ...config.params,
      timestamp: Date.now(),
    }

    // ② 如果你用 Pinia 存了 token，可以自动挂上请求头
    const userStore = useCounterStore()
    const token = userStore?.token || userStore?.getUserCookie
    if (token) {
      config.headers['Authorization'] = token  // 或者 `Bearer ${token}` 看后端要求
    }

    return config
  },
  (error) => {
    console.error('❌ 请求出错:', error)
    return Promise.reject(error)
  }
)

// ====================== 响应拦截器 ======================
requestLocal.interceptors.response.use(
  (response) => {
    // 统一返回 data 数据
    return response.data
  },
  (error) => {
    console.error('❌ 服务器请求出错:', error?.response || error)
    return Promise.reject(error)
  }
)

export default requestLocal
