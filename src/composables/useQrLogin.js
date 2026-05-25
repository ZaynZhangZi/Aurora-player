import { computed, ref } from 'vue'
import { userApi } from '@/api/userApi/userApi.js'
import { reportApi } from '@/api/reportApi/reportApi.js'

export function useQrLogin(userStore, onSignIn, onCloseDialog) {
  const confirmProfile = ref(null)
  const qrKey = ref('')
  const qrImage = ref('')
  const qrState = ref('idle')
  const qrError = ref('')
  const useNoCookie = ref(false)

  let pollingTimer = null

  const qrStatusText = computed(() => {
    const map = {
      loading: '正在生成二维码...',
      wait: '打开网易云音乐 App 扫码',
      confirm: '已扫码，请确认',
      success: '登录成功，同步中...',
      expired: '二维码过期，请刷新',
      error: '生成失败，请重试',
    }
    return map[qrState.value] || '安全快捷登录'
  })

  function resetQrState() {
    qrKey.value = ''
    qrImage.value = ''
    qrState.value = 'idle'
    qrError.value = ''
    useNoCookie.value = false
    confirmProfile.value = null
  }

  function stopQrPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }

  function startQrPolling() {
    stopQrPolling()
    fetchQrStatus()
    pollingTimer = window.setInterval(fetchQrStatus, 2000)
  }

  function isRestrictedStatus(status) {
    const normalized = String(status || '').toUpperCase()
    return normalized === 'BANNED' || normalized === 'DISABLED'
  }

  function getRestrictedLoginMessage(statusInfo) {
    const status = String(statusInfo?.status || '').toUpperCase()
    const action = status === 'DISABLED' ? '禁用' : '封禁'
    return statusInfo?.banReason ? `账号已被${action}：${statusInfo.banReason}` : `账号已被${action}，无法登录`
  }

  async function rejectRestrictedLogin(statusInfo) {
    try {
      await userApi.logout()
    } catch {
      // noop
    }
    userStore.logout()
    qrState.value = 'error'
    qrError.value = getRestrictedLoginMessage(statusInfo)
  }

  function buildProfile(data) {
    const p = data?.profile || data || {}
    return {
      userId: p.userId ?? p.id ?? null,
      nickname: p.nickname ?? p.userName ?? confirmProfile.value?.nickname ?? '',
      avatarUrl: p.avatarUrl ?? confirmProfile.value?.avatarUrl ?? '',
    }
  }

  async function handleLoginSuccess(payload) {
    qrState.value = 'success'
    stopQrPolling()

    const cookie = payload?.cookie || payload?.data?.cookie
    if (cookie) {
      userStore.setLogin(cookie)
      try {
        const infoRes = await userApi.getUserInfo()
        const profile = buildProfile(infoRes?.data)
        userStore.setLogin(cookie, profile)
        const syncedUser = await reportApi.syncNeteaseUser(profile, { force: true })
        if (isRestrictedStatus(syncedUser?.status)) {
          await rejectRestrictedLogin(syncedUser)
          return
        }
        onSignIn(profile)
      } catch {
        if (confirmProfile.value) {
          const profile = {
            userId: null,
            nickname: confirmProfile.value.nickname || '',
            avatarUrl: confirmProfile.value.avatarUrl || '',
          }
          userStore.setProfile(profile)
          reportApi.syncNeteaseUser(profile)
          onSignIn(profile)
        }
      }
    }

    setTimeout(() => {
      onCloseDialog()
    }, 800)
  }

  async function fetchQrStatus() {
    if (!qrKey.value) return

    try {
      const res = await userApi.checkQrCode(qrKey.value, { noCookie: useNoCookie.value })
      const code = res?.data?.code
      const qrData = res?.data || {}
      if (code === 800) {
        qrState.value = 'expired'
        stopQrPolling()
      } else if (code === 801) {
        qrState.value = 'wait'
      } else if (code === 802) {
        qrState.value = 'confirm'
        confirmProfile.value = { avatarUrl: qrData.avatarUrl || '', nickname: qrData.nickname || '' }
      } else if (code === 803) {
        await handleLoginSuccess(res?.data)
      } else if (code === 502) {
        useNoCookie.value = true
      } else if (code && code !== 200) {
        qrState.value = 'error'
        qrError.value = res?.data?.message || '登录失败'
        stopQrPolling()
      }
    } catch (error) {
      qrState.value = 'error'
      qrError.value = error?.message || '状态获取失败'
      stopQrPolling()
    }
  }

  async function startQrLogin() {
    resetQrState()
    qrState.value = 'loading'
    try {
      const keyRes = await userApi.getQrKey()
      const key = keyRes?.data?.data?.unikey
      if (!key) throw new Error('缺Key')
      qrKey.value = key
      const qrRes = await userApi.getQrCode(key)
      const qrImg = qrRes?.data?.data?.qrimg
      if (!qrImg) throw new Error('缺图')
      qrImage.value = qrImg
      qrState.value = 'wait'
      startQrPolling()
    } catch (error) {
      qrState.value = 'error'
      qrError.value = error?.message || '生成失败'
    }
  }

  function refreshQr() {
    if (qrState.value !== 'loading') startQrLogin()
  }

  function cleanup() {
    stopQrPolling()
  }

  return {
    confirmProfile,
    qrImage,
    qrState,
    qrError,
    qrStatusText,
    startQrLogin,
    stopQrPolling,
    resetQrState,
    refreshQr,
    cleanup,
  }
}
