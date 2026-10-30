import { computed, ref } from 'vue'
import { userApi } from '@/api/userApi/userApi.js'
import { reportApi } from '@/api/reportApi/reportApi.js'

export function useQrLogin(userStore, onSignIn, onCloseDialog) {
  const confirmProfile = ref(null)
  const qrKey = ref('')
  const qrImage = ref('')
  const qrState = ref('idle')
  const qrError = ref('')
  const qrStatusCode = ref(null)
  const useNoCookie = ref(false)

  let pollingTimer = null
  let generation = 0
  let controller = null
  let polling = false
  let closingTimer = null

  const qrStatusText = computed(() => {
    const map = {
      loading: '正在生成二维码...',
      wait: '打开网易云音乐 App 扫码',
      confirm: '已扫码，请确认',
      success: '登录成功，同步中...',
      expired: '二维码过期，请刷新',
      retrying: '正在切换兼容模式...',
      error: '生成失败，请重试',
    }
    return map[qrState.value] || '安全快捷登录'
  })

  function resetQrState() {
    qrKey.value = ''
    qrImage.value = ''
    qrState.value = 'idle'
    qrError.value = ''
    qrStatusCode.value = null
    useNoCookie.value = false
    confirmProfile.value = null
  }

  function stopQrPolling() {
    if (pollingTimer) {
      clearTimeout(pollingTimer)
      pollingTimer = null
    }
    polling = false
  }

  function startQrPolling() {
    stopQrPolling()
    polling = true
    void fetchQrStatus(generation)
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

  async function rejectRestrictedLogin(statusInfo, run, activeCookie) {
    try {
      await userApi.logout({signal: controller?.signal})
    } catch {
      // noop
    }
    if (run !== generation || userStore.getUserCookie !== activeCookie) return
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

  async function handleLoginSuccess(payload, run) {
    if (run !== generation) return
    qrState.value = 'success'
    stopQrPolling()

    const cookie = payload?.cookie || payload?.data?.cookie
    if (!cookie) {
      qrState.value = 'error'
      qrError.value = '授权成功，但接口没有返回登录凭证，请重新扫码'
      return
    }

    userStore.setLogin(cookie)
    const activeCookie = userStore.getUserCookie
    let profile = null

    try {
      const infoRes = await userApi.getUserInfo({signal: controller?.signal})
      if (run !== generation || userStore.getUserCookie !== activeCookie) return
      profile = buildProfile(infoRes?.data)
      userStore.setLogin(cookie, profile)
    } catch {
      if (run !== generation || userStore.getUserCookie !== activeCookie) return
      if (confirmProfile.value) {
        profile = {
          userId: null,
          nickname: confirmProfile.value.nickname || '',
          avatarUrl: confirmProfile.value.avatarUrl || '',
        }
        userStore.setProfile(profile)
      }
    }

    // Cookie 和基础资料落地后立即进入个人中心，后台用户同步不再阻塞页面跳转。
    onSignIn(profile)

    if (profile) {
      try {
      const syncedUser = await reportApi.syncNeteaseUser(profile, { force: true })
      if (run !== generation || userStore.getUserCookie !== activeCookie || String(userStore.userId || '') !== String(profile.userId || '')) return
      if (isRestrictedStatus(syncedUser?.status)) {
        await rejectRestrictedLogin(syncedUser, run, activeCookie)
        return
      }
      } catch {
        // 用户数据同步失败不应阻断已经完成的网易云授权。
      }
    }

    closingTimer = setTimeout(() => {
      if (run === generation) onCloseDialog()
    }, 800)
  }

  async function fetchQrStatus(run) {
    if (!qrKey.value || run !== generation || !polling) return

    try {
      const res = await userApi.checkQrCode(qrKey.value, { noCookie: useNoCookie.value, signal: controller?.signal })
      if (run !== generation) return
      const code = res?.data?.code
      const qrData = res?.data || {}
      qrStatusCode.value = code ?? null
      if (code === 800) {
        qrState.value = 'expired'
        stopQrPolling()
      } else if (code === 801) {
        qrState.value = 'wait'
      } else if (code === 802) {
        qrState.value = 'confirm'
        confirmProfile.value = { avatarUrl: qrData.avatarUrl || '', nickname: qrData.nickname || '' }
      } else if (code === 803) {
        await handleLoginSuccess(res?.data, run)
      } else if (code === 502) {
        useNoCookie.value = true
        qrState.value = 'retrying'
        qrError.value = ''
      } else if (code && code !== 200) {
        qrState.value = 'error'
        qrError.value = res?.data?.message || '登录失败'
        stopQrPolling()
      }
    } catch (error) {
      if (run !== generation || controller?.signal.aborted) return
      qrState.value = 'error'
      qrError.value = error?.message || '状态获取失败'
      stopQrPolling()
    } finally {
      if (run === generation && polling) pollingTimer = setTimeout(() => { void fetchQrStatus(run) }, 2000)
    }
  }

  async function startQrLogin() {
    cleanup()
    const run = generation
    controller = new AbortController()
    resetQrState()
    qrState.value = 'loading'
    try {
      const keyRes = await userApi.getQrKey({signal: controller.signal})
      if (run !== generation) return
      const key = keyRes?.data?.data?.unikey
      if (!key) throw new Error('缺Key')
      qrKey.value = key
      const qrRes = await userApi.getQrCode(key, {signal: controller.signal})
      if (run !== generation) return
      const qrImg = qrRes?.data?.data?.qrimg
      if (!qrImg) throw new Error('缺图')
      qrImage.value = qrImg
      qrState.value = 'wait'
      startQrPolling()
    } catch (error) {
      if (run !== generation) return
      qrState.value = 'error'
      qrError.value = error?.message || '生成失败'
    }
  }

  function refreshQr() {
    if (qrState.value !== 'loading') startQrLogin()
  }

  function cleanup() {
    generation += 1
    controller?.abort()
    clearTimeout(closingTimer)
    stopQrPolling()
  }

  return {
    confirmProfile,
    qrImage,
    qrState,
    qrError,
    qrStatusCode,
    qrStatusText,
    startQrLogin,
    stopQrPolling,
    resetQrState,
    refreshQr,
    cleanup,
  }
}
