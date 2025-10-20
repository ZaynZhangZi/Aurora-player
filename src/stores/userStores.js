// stores/user.js
import {defineStore} from 'pinia'

export const useCounterStore = defineStore('userinfo', {
  state: () => ({
    userCookie: '',                 // 服务端返回的 cookie 字符串
    userMessage: null,              // 兼容你之前的命名（原 userMassage）
    profile: null,                  // { userId, nickname, avatarUrl }
  }),

  getters: {
    getUserCookie: (state) => state.userCookie,
    getUserMessage: (state) => state.userMessage,
    isLoggedIn: (state) => Boolean(state.userCookie || (state.profile && state.profile.userId)),
    nickname: (state) => state.profile?.nickname ?? '',
    avatarUrl: (state) => state.profile?.avatarUrl ?? '',
    userId: (state) => state.profile?.userId ?? null,
  },

  actions: {
    // 803 成功后调用：一次性写入 cookie + 基本资料
    setLogin(cookie, profile = null) {
      if (cookie) {
        this.userCookie = cookie
        // 同步到 document.cookie（可选）
        try {
          document.cookie = cookie
        } catch (_) {
        }
        // 也可按你项目需要单独存一份
        localStorage.setItem('usermasgcookie', cookie)
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
      this.userCookie = cookie || ''
      try {
        document.cookie = cookie
      } catch (_) {
      }
      if (cookie) localStorage.setItem('usermasgcookie', cookie)
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
    },

    // 登出：彻底清理
    logout() {
      this.userCookie = ''
      this.userMessage = null
      this.profile = null
      localStorage.removeItem('usermasg')
      localStorage.removeItem('usermasgId')
      localStorage.removeItem('usermasgcookie')
    },
  },

  // 需要 pinia-plugin-persistedstate（v3）或等价插件
  persist: {
    key: 'userinfo-store',
    storage: localStorage,
    // 只持久化这些字段，避免把临时状态写进去
    paths: ['userCookie', 'userMessage', 'profile'],
  },
})
