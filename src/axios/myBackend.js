// src/axios/myBackend.js
import axios from 'axios'
import { useCounterStore } from '@/stores/userStores.js'

const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || '/backend-api'
const ADMIN_API_TIMEOUT = Number(import.meta.env.VITE_ADMIN_API_TIMEOUT || 10000)

export const BACKEND_ACCESS_TOKEN_KEY = 'backend_access_token'
export const BACKEND_REFRESH_TOKEN_KEY = 'backend_refresh_token'

const requestLocal = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  timeout: ADMIN_API_TIMEOUT,
  withCredentials: true,
})

requestLocal.interceptors.request.use(
  (config) => {
    config.params = {
      ...config.params,
      timestamp: Date.now(),
    }

    const userStore = useCounterStore()
    const token = userStore?.token || userStore?.getUserCookie
    if (token) {
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

requestLocal.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
)

export function unwrapBackendResponse(response) {
  const body = response?.data
  if (body && typeof body === 'object' && 'code' in body) {
    if (body.code === 200) return body.data ?? null
    throw new Error(body.message || `API error ${body.code}`)
  }
  return body
}

export function getPageRecords(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.content)) return data.content
  return []
}

export default requestLocal
