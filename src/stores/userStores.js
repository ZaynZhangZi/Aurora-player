// stores/user.js
import {defineStore} from 'pinia'

const COOKIE_ATTR_KEYS = new Set([
  'path',
  'expires',
  'max-age',
  'domain',
  'secure',
  'httponly',
  'samesite',
  'priority',
])

function safeReadLocalStorage(key, fallback = '') {
  try {
    const value = localStorage.getItem(key)
    return value ?? fallback
  } catch {
    return fallback
  }
}

function readLegacyProfile() {
  try {
    const raw = localStorage.getItem('usermasg')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const profile = parsed?.data?.profile || null
    if (!profile) return null
    return {
      userId: profile.userId ?? null,
      nickname: profile.nickname ?? '',
      avatarUrl: profile.avatarUrl ?? '',
    }
  } catch {
    return null
  }
}

function persistLegacyProfile(profile) {
  if (!profile) {
    localStorage.removeItem('usermasg')
    localStorage.removeItem('usermasgId')
    return
  }
  const normalized = {
    userId: profile.userId ?? null,
    nickname: profile.nickname ?? '',
    avatarUrl: profile.avatarUrl ?? '',
  }
  const legacy = {data: {profile: normalized}}
  localStorage.setItem('usermasg', JSON.stringify(legacy))
  if (normalized.userId) localStorage.setItem('usermasgId', String(normalized.userId))
  else localStorage.removeItem('usermasgId')
}

function normalizeCookieString(rawCookie) {
  const raw = String(rawCookie || '').trim()
  if (!raw) return ''

  const kvPairs = raw
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const index = item.indexOf('=')
      if (index < 0) return null
      const key = item.slice(0, index).trim()
      const value = item.slice(index + 1).trim()
      if (!key || !value) return null
      return {key, value}
    })
    .filter(Boolean)
    .filter(({key}) => !COOKIE_ATTR_KEYS.has(String(key).toLowerCase()))

  if (!kvPairs.length) return ''

  const unique = new Map()
  kvPairs.forEach(({key, value}) => {
    if (!unique.has(key)) unique.set(key, value)
  })

  const preferredOrder = ['MUSIC_U', '__csrf', 'NMTID', 'MUSIC_A']
  const ordered = []
  preferredOrder.forEach((key) => {
    if (unique.has(key)) {
      ordered.push(`${key}=${unique.get(key)}`)
      unique.delete(key)
    }
  })

  unique.forEach((value, key) => {
    ordered.push(`${key}=${value}`)
  })

  return ordered.join('; ')
}

export const useCounterStore = defineStore('userinfo', {
  state: () => ({
    userCookie: normalizeCookieString(safeReadLocalStorage('usermasgcookie', '')), // 服务端返回的 cookie 字符串
    userMessage: null,              // 兼容你之前的命名（原 userMassage）
    profile: readLegacyProfile(),   // { userId, nickname, avatarUrl }
  }),

  getters: {
    getUserCookie: (state) => state.userCookie,
    getUserMessage: (state) => state.userMessage,
    isLoggedIn: (state) => Boolean(state.userCookie),
    nickname: (state) => state.profile?.nickname ?? '',
    avatarUrl: (state) => state.profile?.avatarUrl ?? '',
    userId: (state) => state.profile?.userId ?? null,
  },

  actions: {
    // 803 成功后调用：一次性写入 cookie + 基本资料
    setLogin(cookie, profile = null) {
      const normalizedCookie = normalizeCookieString(cookie)
      if (normalizedCookie) {
        this.userCookie = normalizedCookie
        // 同步到 document.cookie（可选）
        try {
          document.cookie = normalizedCookie
        } catch {
        }
        // 也可按你项目需要单独存一份
        localStorage.setItem('usermasgcookie', normalizedCookie)
      }
      if (profile && (profile.userId || profile.nickname || profile.avatarUrl)) {
        this.profile = {
          userId: profile.userId ?? null,
          nickname: profile.nickname ?? '',
          avatarUrl: profile.avatarUrl ?? '',
        }
        // 兼容你之前的结构（如果你的其它代码在读它）
        const legacy = {data: {profile: this.profile}}
        localStorage.setItem('usermasg', JSON.stringify(legacy))
        if (this.profile.userId) localStorage.setItem('usermasgId', this.profile.userId)
      }
    },

    // 仅设置 Cookie（不改资料）
    setUserCookie(cookie) {
      const normalizedCookie = normalizeCookieString(cookie)
      this.userCookie = normalizedCookie
      try {
        if (normalizedCookie) document.cookie = normalizedCookie
      } catch {
      }
      if (normalizedCookie) localStorage.setItem('usermasgcookie', normalizedCookie)
      else localStorage.removeItem('usermasgcookie')
    },

    // 写入“用户信息文本”（如果你还有地方用得到）
    setUserMessage(message) {
      this.userMessage = message || null
    },

    // 更新/覆盖资料
    setProfile(profile) {
      this.profile = profile
        ? {
          userId: profile.userId ?? null,
          nickname: profile.nickname ?? '',
          avatarUrl: profile.avatarUrl ?? '',
        }
        : null
      persistLegacyProfile(this.profile)
    },

    // 登出：彻底清理
    logout() {
      this.userCookie = ''
      this.userMessage = null
      this.profile = null
      localStorage.removeItem('usermasg')
      localStorage.removeItem('usermasgId')
      localStorage.removeItem('usermasgcookie')
      localStorage.removeItem('userinfo-store')
    },
  },

  // 需要 pinia-plugin-persistedstate（v3）或等价插件
  persist: {
    key: 'userinfo-store',
    storage: localStorage,
    // v4 使用 pick；保留 paths 兼容旧配置
    pick: ['userCookie', 'userMessage', 'profile'],
    paths: ['userCookie', 'userMessage', 'profile'],
  },
})
