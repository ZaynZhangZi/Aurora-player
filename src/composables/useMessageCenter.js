import { ref } from 'vue'
import { userApi } from '@/api/userApi/userApi.js'
import { searchApi } from '@/api/searchApi/searchApi.js'

function parseNoticePayload(item) {
  const source = item?.notice || item?.json || item?.content
  if (!source) return null
  let payload = source
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch {
      payload = { msg: source }
    }
  }
  const generalMsg = payload?.generalMsg || payload?.generalNotice || payload?.promotionUrl || {}
  const sender = payload?.user || {}
  return {
    senderName: sender?.nickname || payload?.fromNickName || '',
    avatarUrl: sender?.avatarUrl || '',
    title: generalMsg?.title || generalMsg?.noticeMsg || payload?.title || payload?.actionDesc || '',
    content: payload?.msg || payload?.pushMsg || generalMsg?.inboxBriefContent || generalMsg?.content || generalMsg?.noticeMsg || generalMsg?.actionDesc || '',
    webUrl: payload?.pushUrl || generalMsg?.webUrl || payload?.webUrl || '',
  }
}

function parsePrivateMessageBody(rawText) {
  if (!rawText) return ''
  if (typeof rawText === 'object') return rawText?.msg || rawText?.text || rawText?.message || JSON.stringify(rawText)
  const text = String(rawText)
  try {
    const parsed = JSON.parse(text)
    return parsed?.msg || parsed?.text || parsed?.message || text
  } catch {
    return text
  }
}

function mergeById(oldList, newList) {
  const map = new Map()
  for (const item of oldList) map.set(item.id, item)
  for (const item of newList) map.set(item.id, item)
  return Array.from(map.values()).sort((a, b) => Number(b.time || 0) - Number(a.time || 0))
}

function mergeByIdAsc(oldList, newList) {
  const map = new Map()
  for (const item of oldList) map.set(item.id, item)
  for (const item of newList) map.set(item.id, item)
  return Array.from(map.values()).sort((a, b) => Number(a.time || 0) - Number(b.time || 0))
}

function normalizeUserTarget(user) {
  if (!user) return null
  return {
    userId: Number(user.userId || user.id || 0),
    nickname: user.nickname || user.userName || '',
    avatarUrl: user.avatarUrl || user.avatar || '',
  }
}

function normalizeUserSearchResult(item) {
  return {
    userId: Number(item?.userId || 0),
    nickname: item?.nickname || '',
    avatarUrl: item?.avatarUrl || '',
  }
}

function extractPrivateUnread(payload) {
  if (Number.isFinite(Number(payload?.newMsgCount))) return Number(payload.newMsgCount)
  const raw = payload?.msgs || payload?.data?.msgs || []
  if (!Array.isArray(raw)) return 0
  return raw.reduce((sum, item) => sum + Number(item?.newMsgCount || 0), 0)
}

function extractNoticeUnread(payload) {
  if (Number.isFinite(Number(payload?.newNoticeCount))) return Number(payload.newNoticeCount)
  const raw = payload?.notices || payload?.data?.notices || []
  if (!Array.isArray(raw)) return 0
  return raw.reduce((sum, item) => sum + Number(item?.newMsgCount || 0), 0)
}

export function useMessageCenter(userStore) {
  const messageTab = ref('notice')
  const profileMenuOpen = ref(false)

  const noticeBadgeCount = ref(0)
  const privateBadgeCount = ref(0)

  const noticeLoading = ref(false)
  const noticeError = ref('')
  const noticeList = ref([])
  const noticeHasMore = ref(false)
  const noticeLastTime = ref(-1)
  const noticeLoadingMore = ref(false)

  const privateLoading = ref(false)
  const privateError = ref('')
  const privateList = ref([])
  const privateHasMore = ref(false)
  const privateOffset = ref(0)
  const privateLoadingMore = ref(false)

  const activePrivateId = ref('')
  const privateHistory = ref([])
  const privateHistoryLoading = ref(false)
  const privateHistoryError = ref('')
  const privateHistoryHasMore = ref(false)
  const privateHistoryBefore = ref(0)
  const privateHistoryLoadingMore = ref(false)
  const privateHistoryRenderLimit = ref(180)

  const privateConversationKeyword = ref('')
  const privateTargetKeyword = ref('')
  const privateReceiverLoading = ref(false)
  const privateReceiverError = ref('')
  const privateReceiverResults = ref([])
  const privateReceiverFocused = ref(false)
  const privateReceiverSearched = ref(false)

  const selectedPrivateTarget = ref(null)
  const highlightedMessageIds = ref({})
  const privateContent = ref('')
  const sendingPrivate = ref(false)
  const privateFeedback = ref('')
  const privateFeedbackIsError = ref(false)

  let privateReceiverSearchTimer = null
  let privateReceiverSearchRequestId = 0
  let privateHistoryRequestId = 0

  function normalizeNoticeList(payload) {
    const raw = payload?.notices || payload?.data?.notices || payload?.msgs || []
    if (!Array.isArray(raw)) return []
    return raw.map((item, index) => {
      const parsed = parseNoticePayload(item)
      return {
        id: item?.id || item?.noticeId || `${item?.time || Date.now()}-${index}`,
        senderName: item?.user?.nickname || parsed?.senderName || '系统通知',
        avatarUrl: item?.user?.avatarUrl || parsed?.avatarUrl || '',
        title: parsed?.title || item?.typeTitle || item?.noticeType || '系统通知',
        content: parsed?.content || '你有一条新的通知',
        time: item?.time || item?.lastTime || item?.createTime || 0,
        webUrl: parsed?.webUrl || item?.webUrl || '',
        unreadCount: Number(item?.newMsgCount || 0),
      }
    })
  }

  function normalizePrivateList(payload) {
    const raw = payload?.msgs || payload?.data?.msgs || payload?.messages || []
    if (!Array.isArray(raw)) return []
    const currentUserId = Number(userStore.userId) || null
    return raw.map((item, index) => {
      const fromUser = item?.fromUser || {}
      const toUser = item?.toUser || {}
      const fromId = Number(item?.fromUserId ?? fromUser?.userId) || null
      const toId = Number(item?.toUserId ?? toUser?.userId) || null
      const isSelfSender = currentUserId && fromId === currentUserId
      const counterpartId = isSelfSender ? toId : fromId
      const counterpartName = isSelfSender
        ? (toUser?.nickname || item?.toNickName || `用户 ${toId || '-'}`)
        : (fromUser?.nickname || item?.fromNickName || `用户 ${fromId || '-'}`)

      return {
        id: item?.id || `${item?.time || Date.now()}-${index}`,
        content: parsePrivateMessageBody(item?.lastMsg || item?.msg || item?.message || ''),
        time: item?.time || item?.lastTime || item?.createTime || 0,
        counterpartId: counterpartId ? String(counterpartId) : '',
        counterpartName,
        avatarUrl: isSelfSender ? (toUser?.avatarUrl || item?.toUserAvatar || '') : (fromUser?.avatarUrl || item?.fromUserAvatar || ''),
        unreadCount: Number(item?.newMsgCount || 0),
      }
    })
  }

  function normalizePrivateHistoryList(payload) {
    const raw = payload?.msgs || payload?.data?.msgs || []
    if (!Array.isArray(raw)) return []
    const currentUserId = Number(userStore.userId) || null
    return raw.map((item, index) => {
      const fromUser = item?.fromUser || {}
      const toUser = item?.toUser || {}
      const fromId = Number(item?.fromUserId ?? fromUser?.userId) || null
      const isSelf = currentUserId && fromId === currentUserId
      return {
        id: item?.id || `${item?.time || Date.now()}-${index}`,
        content: parsePrivateMessageBody(item?.msg || item?.message || item?.lastMsg || ''),
        time: Number(item?.time || item?.lastTime || item?.createTime || 0),
        isSelf: Boolean(isSelf),
        fromId,
        toId: Number(item?.toUserId ?? toUser?.userId) || null,
      }
    }).sort((a, b) => a.time - b.time)
  }

  async function fetchNotices({ reset = false } = {}) {
    if (reset) {
      noticeLoading.value = true
      noticeLastTime.value = -1
    } else {
      noticeLoadingMore.value = true
    }
    noticeError.value = ''
    try {
      const res = await userApi.getNotices(30, noticeLastTime.value)
      const payload = res?.data || {}
      const list = normalizeNoticeList(payload)
      noticeList.value = reset ? list : mergeById(noticeList.value, list)
      noticeHasMore.value = Boolean(payload?.more)
      noticeBadgeCount.value = extractNoticeUnread(payload)
      if (list.length) {
        const nextLast = payload?.lasttime || list[list.length - 1]?.time || noticeLastTime.value
        noticeLastTime.value = Number.isFinite(Number(nextLast)) ? Number(nextLast) : noticeLastTime.value
      }
    } catch (error) {
      noticeError.value = error?.message || '通知加载失败'
      if (reset) noticeList.value = []
    } finally {
      if (reset) noticeLoading.value = false
      else noticeLoadingMore.value = false
    }
  }

  async function fetchPrivateHistory(targetId, { reset = false } = {}) {
    if (!targetId) return
    const currentId = ++privateHistoryRequestId
    if (reset) {
      privateHistoryRenderLimit.value = 180
      privateHistoryLoading.value = true
      privateHistoryError.value = ''
      privateHistory.value = []
      privateHistoryBefore.value = 0
    } else {
      privateHistoryLoadingMore.value = true
    }
    try {
      const res = await userApi.getPrivateHistory(targetId, 30, privateHistoryBefore.value)
      if (currentId !== privateHistoryRequestId) return
      const payload = res?.data || {}
      const list = normalizePrivateHistoryList(payload)
      privateHistoryHasMore.value = Boolean(payload?.more)
      privateHistory.value = reset ? list : mergeByIdAsc(privateHistory.value, list)
      if (privateHistory.value.length) {
        privateHistoryBefore.value = Number(privateHistory.value[0].time || privateHistoryBefore.value)
      }
    } catch (error) {
      if (currentId !== privateHistoryRequestId) return
      const preview = privateList.value.find((item) => String(item.counterpartId) === String(targetId)) || null
      if (reset && preview) {
        privateHistory.value = [{
          id: `${preview.id}-preview`,
          content: preview.content,
          time: Number(preview.time || Date.now()),
          isSelf: false,
        }]
        privateHistoryHasMore.value = false
      }
      privateHistoryError.value = error?.message || '会话加载失败'
    } finally {
      if (currentId === privateHistoryRequestId) {
        if (reset) privateHistoryLoading.value = false
        else privateHistoryLoadingMore.value = false
      }
    }
  }

  function selectPrivateTarget(user) {
    const target = normalizeUserTarget(user)
    if (!target?.userId) return
    selectedPrivateTarget.value = target
    activePrivateId.value = String(target.userId)
    privateTargetKeyword.value = target.nickname || String(target.userId)
    privateReceiverResults.value = []
    privateReceiverFocused.value = false
    privateReceiverSearched.value = false
    fetchPrivateHistory(String(target.userId), { reset: true })
  }

  function openPrivateConversation(item) {
    if (!item?.counterpartId) return
    activePrivateId.value = String(item.counterpartId)
    selectPrivateTarget({
      userId: item.counterpartId,
      nickname: item.counterpartName,
      avatarUrl: item.avatarUrl,
    })
  }

  async function fetchPrivateMessages({ reset = false } = {}) {
    if (reset) {
      privateLoading.value = true
      privateOffset.value = 0
    } else {
      privateLoadingMore.value = true
    }
    privateError.value = ''
    try {
      const res = await userApi.getPrivateMessages(30, privateOffset.value)
      const payload = res?.data || {}
      const list = normalizePrivateList(payload)
      privateList.value = reset ? list : mergeById(privateList.value, list)
      privateHasMore.value = Boolean(payload?.more)
      privateBadgeCount.value = extractPrivateUnread(payload)
      privateOffset.value += 30
      if (reset && window.innerWidth >= 768) {
        const matched = privateList.value[0]
        if (matched) openPrivateConversation(matched)
        else {
          privateHistory.value = []
          privateHistoryError.value = ''
          activePrivateId.value = ''
        }
      }
    } catch (error) {
      privateError.value = error?.message || '私信加载失败'
      if (reset) privateList.value = []
    } finally {
      if (reset) privateLoading.value = false
      else privateLoadingMore.value = false
    }
  }

  function loadMoreNotices() {
    if (noticeHasMore.value && !noticeLoadingMore.value) fetchNotices({ reset: false })
  }

  function loadMorePrivateMessages() {
    if (privateHasMore.value && !privateLoadingMore.value) fetchPrivateMessages({ reset: false })
  }

  function loadMorePrivateHistory() {
    if (!privateHistoryHasMore.value || privateHistoryLoadingMore.value || !selectedPrivateTarget.value?.userId) return
    privateHistoryRenderLimit.value += 120
    fetchPrivateHistory(String(selectedPrivateTarget.value.userId), { reset: false })
  }

  async function refreshMessageBadges() {
    try {
      const [noticeRes, privateRes] = await Promise.all([
        userApi.getNotices(10, -1),
        userApi.getPrivateMessages(10, 0),
      ])
      noticeBadgeCount.value = extractNoticeUnread(noticeRes?.data || {})
      privateBadgeCount.value = extractPrivateUnread(privateRes?.data || {})
    } catch (error) {
      console.warn('消息刷新失败', error)
    }
  }

  function debounceSearchPrivateReceiver(keyword) {
    if (privateReceiverSearchTimer) clearTimeout(privateReceiverSearchTimer)
    privateReceiverSearchTimer = setTimeout(() => searchPrivateReceiver(keyword), 260)
  }

  async function searchPrivateReceiver(keyword) {
    const currentId = ++privateReceiverSearchRequestId
    privateReceiverLoading.value = true
    privateReceiverError.value = ''
    privateReceiverSearched.value = false
    try {
      const result = await searchApi.searchUsers(keyword, { limit: 8, offset: 0 })
      if (currentId !== privateReceiverSearchRequestId) return
      privateReceiverResults.value = (result?.users || [])
        .map(normalizeUserSearchResult)
        .filter((item) => item.userId)
    } catch (error) {
      if (currentId !== privateReceiverSearchRequestId) return
      privateReceiverResults.value = []
      privateReceiverError.value = error?.message || '搜索失败'
    } finally {
      if (currentId === privateReceiverSearchRequestId) {
        privateReceiverLoading.value = false
        privateReceiverSearched.value = true
      }
    }
  }

  function handlePrivateReceiverBlur() {
    setTimeout(() => {
      privateReceiverFocused.value = false
    }, 120)
  }

  async function submitPrivateMessage() {
    privateFeedback.value = ''
    privateFeedbackIsError.value = false
    const target = selectedPrivateTarget.value?.userId
    const content = privateContent.value.trim()
    if (!target || !Number.isFinite(Number(target))) {
      privateFeedback.value = '请先选择接收方'
      privateFeedbackIsError.value = true
      return
    }
    if (!content) {
      privateFeedback.value = '内容不能为空'
      privateFeedbackIsError.value = true
      return
    }

    sendingPrivate.value = true
    try {
      const res = await userApi.sendPrivateMessage(String(target), content)
      const code = res?.data?.code
      if (code && code !== 200) throw new Error(res?.data?.message || `发送失败，错误码 ${code}`)
      privateFeedback.value = '发送成功'
      privateHistory.value = mergeByIdAsc(privateHistory.value, [{
        id: `local-${Date.now()}`,
        content,
        time: Date.now(),
        isSelf: true,
      }])
      privateContent.value = ''
      await fetchPrivateMessages({ reset: true })
      await fetchPrivateHistory(String(target), { reset: true })
      privateBadgeCount.value = 0
    } catch (error) {
      privateFeedback.value = error?.message || '发送失败'
      privateFeedbackIsError.value = true
    } finally {
      sendingPrivate.value = false
    }
  }

  function formatTime(value) {
    const ts = Number(value)
    if (!Number.isFinite(ts) || ts <= 0) return '-'
    const date = new Date(ts)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
  }

  function cleanupTimers() {
    if (privateReceiverSearchTimer) clearTimeout(privateReceiverSearchTimer)
  }

  return {
    messageTab,
    profileMenuOpen,
    noticeBadgeCount,
    privateBadgeCount,
    noticeLoading,
    noticeError,
    noticeList,
    noticeHasMore,
    noticeLoadingMore,
    privateLoading,
    privateError,
    privateList,
    privateHasMore,
    privateLoadingMore,
    activePrivateId,
    privateHistory,
    privateHistoryLoading,
    privateHistoryError,
    privateHistoryHasMore,
    privateHistoryLoadingMore,
    privateHistoryRenderLimit,
    privateConversationKeyword,
    privateTargetKeyword,
    privateReceiverLoading,
    privateReceiverError,
    privateReceiverResults,
    privateReceiverFocused,
    privateReceiverSearched,
    selectedPrivateTarget,
    highlightedMessageIds,
    privateContent,
    sendingPrivate,
    privateFeedback,
    privateFeedbackIsError,
    fetchNotices,
    fetchPrivateMessages,
    loadMoreNotices,
    loadMorePrivateMessages,
    refreshMessageBadges,
    debounceSearchPrivateReceiver,
    openPrivateConversation,
    loadMorePrivateHistory,
    selectPrivateTarget,
    handlePrivateReceiverBlur,
    submitPrivateMessage,
    formatTime,
    cleanupTimers,
  }
}
