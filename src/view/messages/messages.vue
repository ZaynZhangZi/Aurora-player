<template>
  <div class="messages-page">
    <AppHeader />

    <main class="messages-main" :class="{ 'is-private-view': userStore.isLoggedIn && messageTab === 'private' }" data-route-motion-root>
      <header class="messages-heading">
        <div>
          <p>YOUR INBOX</p>
          <h1>消息中心</h1>
        </div>
      </header>

      <section v-if="!userStore.isLoggedIn" class="messages-auth">
        <span class="messages-auth-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25H10l-4.5 3v-3.3a2.25 2.25 0 0 1-1-1.95v-7.5Z"/><path d="M8 9h8M8 12h5"/></svg>
        </span>
        <p>PRIVATE SPACE</p>
        <h2>登录后查看你的消息</h2>
        <span>通知、私信与聊天记录只会在你的账号中出现。</span>
        <button type="button" @click="openLoginDialog">登录网易云音乐</button>
      </section>

      <template v-else>
        <nav class="messages-tabs" role="tablist" aria-label="消息类型">
          <button type="button" role="tab" :aria-selected="messageTab === 'notice'" :class="{ 'is-active': messageTab === 'notice' }" @click="switchMessageTab('notice')">
            <span>通知</span>
            <i v-if="noticeBadgeCount">{{ badgeText(noticeBadgeCount) }}</i>
          </button>
          <button type="button" role="tab" :aria-selected="messageTab === 'private'" :class="{ 'is-active': messageTab === 'private' }" @click="switchMessageTab('private')">
            <span>私信</span>
            <i v-if="privateBadgeCount">{{ badgeText(privateBadgeCount) }}</i>
          </button>
        </nav>

        <Transition name="message-panel" mode="out-in">
          <section v-if="messageTab === 'notice'" key="notice" class="notice-workspace">
            <div class="workspace-title">
              <div><small>NOTIFICATIONS</small><h2>与你有关的新消息</h2></div>
              <button type="button" :disabled="noticeLoading" @click="fetchNotices({ reset: true })">{{ noticeLoading ? '同步中' : '刷新' }}</button>
            </div>

            <p v-if="noticeLoading" class="message-state">正在整理通知…</p>
            <p v-else-if="noticeError" class="message-state is-error">{{ noticeError }}</p>
            <div v-else-if="noticeList.length" class="notice-list">
              <article v-for="item in noticeList" :key="item.id" class="notice-item">
                <div class="notice-avatar">
                  <img v-if="item.avatarUrl" :src="item.avatarUrl" alt="" loading="lazy" />
                  <span v-else>{{ initial(item.senderName) }}</span>
                </div>
                <div class="notice-copy">
                  <div><strong>{{ item.title || '系统通知' }}</strong><time>{{ formatTime(item.time) }}</time></div>
                  <small>{{ item.senderName }}</small>
                  <p>{{ item.content }}</p>
                  <button v-if="safeWebUrl(item.webUrl)" type="button" @click="openNoticeLink(item.webUrl)">查看相关内容 <span>↗</span></button>
                </div>
                <i v-if="item.unreadCount" class="notice-dot" aria-label="未读" />
              </article>
              <button v-if="noticeHasMore" class="load-more" type="button" :disabled="noticeLoadingMore" @click="loadMoreNotices">
                {{ noticeLoadingMore ? '正在加载…' : '加载更早的通知' }}
              </button>
            </div>
            <div v-else class="message-empty"><span>○</span><h3>通知已经读完了</h3><p>新的关注、互动和系统消息会出现在这里。</p></div>
          </section>

          <section v-else key="private" class="private-workspace">
            <aside class="conversation-sidebar">
              <div class="workspace-title is-compact">
                <div><small>CONVERSATIONS</small><h2>私信</h2></div>
                <button type="button" :disabled="privateLoading" @click="fetchPrivateMessages({ reset: true })">刷新</button>
              </div>
              <label class="conversation-filter">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                <input v-model.trim="privateConversationKeyword" type="search" placeholder="筛选会话" />
              </label>
              <p v-if="privateLoading" class="message-state is-small">正在同步会话…</p>
              <p v-else-if="privateError" class="message-state is-small is-error">{{ privateError }}</p>
              <div v-else-if="filteredPrivateList.length" class="conversation-list">
                <button v-for="item in filteredPrivateList" :key="item.id" type="button" :class="{ 'is-active': activePrivateId === String(item.counterpartId) }" @click="openPrivateConversation(item)">
                  <span class="conversation-avatar">
                    <img v-if="item.avatarUrl" :src="item.avatarUrl" alt="" loading="lazy" />
                    <i v-else>{{ initial(item.counterpartName) }}</i>
                  </span>
                  <span class="conversation-copy"><strong>{{ item.counterpartName }}</strong><small>{{ item.content || '打开会话' }}</small></span>
                  <span class="conversation-meta"><time>{{ shortTime(item.time) }}</time><i v-if="item.unreadCount">{{ badgeText(item.unreadCount) }}</i></span>
                </button>
                <button v-if="privateHasMore" class="load-more is-compact" type="button" :disabled="privateLoadingMore" @click="loadMorePrivateMessages">{{ privateLoadingMore ? '加载中…' : '更多会话' }}</button>
              </div>
              <div v-else class="sidebar-empty">还没有私信会话</div>
            </aside>

            <div class="chat-panel">
              <header class="chat-heading">
                <div>
                  <p>发送给</p>
                  <label class="recipient-search">
                    <input v-model.trim="privateTargetKeyword" type="search" placeholder="搜索用户或选择左侧会话" @focus="privateReceiverFocused = true" @blur="handlePrivateReceiverBlur" @input="searchRecipient" />
                    <span v-if="privateReceiverLoading">搜索中</span>
                  </label>
                  <div v-if="privateReceiverFocused && (privateReceiverResults.length || privateReceiverSearched)" class="recipient-results">
                    <button v-for="user in privateReceiverResults" :key="user.userId" type="button" @mousedown.prevent="selectPrivateTarget(user)">
                      <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" /><span v-else>{{ initial(user.nickname) }}</span><strong>{{ user.nickname }}</strong>
                    </button>
                    <p v-if="privateReceiverSearched && !privateReceiverResults.length && !privateReceiverLoading">没有找到匹配用户</p>
                  </div>
                </div>
                <span v-if="selectedPrivateTarget">{{ selectedPrivateTarget.nickname }}</span>
              </header>

              <div v-if="selectedPrivateTarget" ref="chatHistoryRef" class="chat-history">
                <button v-if="privateHistoryHasMore" class="history-more" type="button" :disabled="privateHistoryLoadingMore" @click="loadMorePrivateHistory">{{ privateHistoryLoadingMore ? '正在加载…' : '查看更早的消息' }}</button>
                <p v-if="privateHistoryLoading" class="message-state">正在打开会话…</p>
                <p v-else-if="privateHistoryError && !privateHistory.length" class="message-state is-error">{{ privateHistoryError }}</p>
                <div v-else class="chat-stream">
                  <div v-for="item in visiblePrivateHistory" :key="item.id" class="chat-bubble" :class="{ 'is-self': item.isSelf }">
                    <p>{{ item.content }}</p><time>{{ formatTime(item.time) }}</time>
                  </div>
                  <p v-if="!visiblePrivateHistory.length" class="chat-first">这是你们的第一条消息。</p>
                </div>
              </div>
              <div v-else class="chat-placeholder">
                <span>✦</span><h3>选择一个会话</h3><p>或在上方搜索用户，开始一段关于音乐的对话。</p>
              </div>

              <form class="chat-composer" @submit.prevent="submitPrivateMessage">
                <textarea v-model="privateContent" rows="2" maxlength="500" :disabled="!selectedPrivateTarget || sendingPrivate" placeholder="写一条私信…" @keydown.ctrl.enter.prevent="submitPrivateMessage" @keydown.meta.enter.prevent="submitPrivateMessage" />
                <div><span :class="{ 'is-error': privateFeedbackIsError }">{{ privateFeedback || `${privateContent.length}/500 · Ctrl/⌘ + Enter 发送` }}</span><button type="submit" :disabled="!selectedPrivateTarget || !privateContent.trim() || sendingPrivate">{{ sendingPrivate ? '发送中' : '发送' }}</button></div>
              </form>
            </div>
          </section>
        </Transition>
      </template>
    </main>
  </div>
</template>

<script setup>
defineOptions({name: 'MessagesPage'})

import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import AppHeader from '@/components/appHeader/AppHeader.vue'
import {useCounterStore} from '@/stores/userStores.js'
import {useMessageCenter} from '@/composables/useMessageCenter.js'
import {openLoginDialog} from '@/utils/loginDialog.js'

const userStore = useCounterStore()
const chatHistoryRef = ref(null)
const messageCenter = useMessageCenter(userStore)
const {
  messageTab, noticeBadgeCount, privateBadgeCount, noticeLoading, noticeError, noticeList,
  noticeHasMore, noticeLoadingMore, privateLoading, privateError, privateList, privateHasMore,
  privateLoadingMore, activePrivateId, privateHistory, privateHistoryLoading, privateHistoryError,
  privateHistoryHasMore, privateHistoryLoadingMore, privateHistoryRenderLimit,
  privateConversationKeyword, privateTargetKeyword, privateReceiverLoading, privateReceiverResults,
  privateReceiverFocused, privateReceiverSearched, selectedPrivateTarget, privateContent,
  sendingPrivate, privateFeedback, privateFeedbackIsError, fetchNotices, fetchPrivateMessages,
  loadMoreNotices, loadMorePrivateMessages, clearMessageBadgeCount, debounceSearchPrivateReceiver,
  openPrivateConversation, loadMorePrivateHistory, selectPrivateTarget, handlePrivateReceiverBlur,
  submitPrivateMessage, formatTime, cleanupTimers,
} = messageCenter

const filteredPrivateList = computed(() => {
  const keyword = privateConversationKeyword.value.trim().toLowerCase()
  if (!keyword) return privateList.value
  return privateList.value.filter(item => `${item.counterpartName} ${item.content}`.toLowerCase().includes(keyword))
})
const visiblePrivateHistory = computed(() => privateHistory.value.slice(-privateHistoryRenderLimit.value))

function switchMessageTab(tab) {
  if (messageTab.value === tab) return
  messageTab.value = tab
  clearMessageBadgeCount(tab)
  if (tab === 'notice' && !noticeList.value.length) void fetchNotices({reset: true})
  if (tab === 'private' && !privateList.value.length) void fetchPrivateMessages({reset: true})
}

function searchRecipient() {
  const value = privateTargetKeyword.value.trim()
  if (value !== String(selectedPrivateTarget.value?.nickname || '').trim()) selectedPrivateTarget.value = null
  if (!value) {
    privateReceiverResults.value = []
    privateReceiverSearched.value = false
    return
  }
  debounceSearchPrivateReceiver(value)
}

function initial(value) {
  return String(value || 'A').trim().slice(0, 1).toUpperCase()
}

function badgeText(value) {
  const count = Number(value || 0)
  return count > 99 ? '99+' : count
}

function shortTime(value) {
  const time = Number(value || 0)
  if (!time) return ''
  const date = new Date(time)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function safeWebUrl(value) {
  try {
    const url = new URL(String(value || ''), window.location.origin)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function openNoticeLink(value) {
  const url = safeWebUrl(value)
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}

function loadMessages() {
  if (!userStore.isLoggedIn) return
  void fetchNotices({reset: true})
  void fetchPrivateMessages({reset: true})
}

function scrollChatToLatest(behavior = 'auto') {
  void nextTick(() => {
    const container = chatHistoryRef.value
    if (!container) return
    container.scrollTo({top: container.scrollHeight, behavior})
  })
}

watch(() => userStore.isLoggedIn, (loggedIn) => {
  if (loggedIn) loadMessages()
})

watch(
  () => [activePrivateId.value, privateHistoryLoading.value],
  ([activeId, loading], [previousId]) => {
    if (!activeId || loading) return
    scrollChatToLatest(activeId === previousId ? 'smooth' : 'auto')
  },
)

onMounted(loadMessages)
onBeforeUnmount(cleanupTimers)
</script>

<style scoped>
.messages-page { min-height: 100vh; color: #27272a; background: radial-gradient(circle at 82% 5%, rgba(255, 225, 228, .72), transparent 26%), #f7f7f8; }
button, input, textarea { font: inherit; }
button { cursor: pointer; }
.messages-main { box-sizing: border-box; width: min(100%, 1376px); min-height: calc(100vh - 76px); margin: 0 auto; padding: 62px 28px 150px; }
.messages-main.is-private-view { display: grid; height: calc(100dvh - 76px); grid-template-rows: auto auto minmax(0, 1fr); overflow: hidden; padding-bottom: calc(var(--global-player-space, 92px) + 18px); }
.messages-heading { display: flex; align-items: end; justify-content: space-between; gap: 28px; margin-bottom: 32px; }
.messages-heading p, .workspace-title small { margin: 0 0 8px; color: #ef5267; font-size: 10px; font-weight: 850; letter-spacing: .15em; }
.messages-heading h1 { margin: 0; font-size: clamp(42px, 5vw, 72px); letter-spacing: -.07em; line-height: .94; }
.messages-heading > span { max-width: 360px; color: #85858d; font-size: 13px; line-height: 1.7; }
.messages-tabs { display: flex; gap: 8px; margin-bottom: 18px; }
.messages-tabs button { display: flex; align-items: center; gap: 9px; min-width: 104px; justify-content: center; padding: 11px 18px; color: #74747c; border: 0; border-radius: 999px; background: #ececef; font-size: 13px; font-weight: 760; transition: 180ms ease; }
.messages-tabs button.is-active { color: #fff; background: #262629; box-shadow: 0 10px 26px rgba(24, 24, 27, .14); }
.messages-tabs i, .conversation-meta i { display: grid; min-width: 18px; height: 18px; place-items: center; padding: 0 3px; color: #fff; border-radius: 9px; background: #ef5267; font-size: 9px; font-style: normal; }
.notice-workspace, .private-workspace { min-height: 610px; overflow: hidden; border: 1px solid rgba(24, 24, 27, .06); border-radius: 34px; background: rgba(255, 255, 255, .84); box-shadow: 0 28px 75px rgba(36, 32, 31, .08); }
.notice-workspace { padding: 30px; }
.workspace-title { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.workspace-title h2 { margin: 0; font-size: 24px; letter-spacing: -.04em; }
.workspace-title > button { padding: 9px 14px; color: #69696f; border: 1px solid #e4e4e7; border-radius: 999px; background: #fff; font-size: 11px; font-weight: 740; }
.notice-list { display: grid; gap: 2px; }
.notice-item { position: relative; display: grid; grid-template-columns: 46px minmax(0, 1fr); gap: 16px; padding: 21px 8px; border-top: 1px solid #ececee; }
.notice-item:first-child { border-top: 0; }
.notice-avatar, .conversation-avatar { display: grid; overflow: hidden; place-items: center; border-radius: 50%; background: linear-gradient(145deg, #f4c4c8, #ed8691); color: #fff; font-weight: 850; }
.notice-avatar { width: 46px; height: 46px; }
.notice-avatar img, .conversation-avatar img { width: 100%; height: 100%; object-fit: cover; }
.notice-copy > div { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.notice-copy strong { font-size: 14px; }
.notice-copy time { color: #a1a1aa; font-size: 10px; }
.notice-copy small { display: block; margin-top: 3px; color: #8b8b92; font-size: 10px; }
.notice-copy p { max-width: 840px; margin: 9px 0 0; color: #5d5d64; font-size: 13px; line-height: 1.7; }
.notice-copy button { padding: 8px 0 0; color: #e65063; border: 0; background: transparent; font-size: 11px; font-weight: 760; }
.notice-dot { position: absolute; top: 24px; right: 3px; width: 7px; height: 7px; border-radius: 50%; background: #ef5267; box-shadow: 0 0 0 4px rgba(239, 82, 103, .1); }
.private-workspace { display: grid; grid-template-columns: minmax(260px, 360px) minmax(0, 1fr); }
.messages-main.is-private-view .private-workspace { height: 100%; min-height: 0; }
.conversation-sidebar { display: grid; min-width: 0; min-height: 0; grid-template-rows: auto auto minmax(0, 1fr); overflow: hidden; padding: 28px 18px; border-right: 1px solid #e9e9eb; background: rgba(248, 248, 249, .7); }
.workspace-title.is-compact { padding: 0 8px; margin-bottom: 18px; }
.conversation-filter { display: grid; grid-template-columns: 17px 1fr; gap: 9px; align-items: center; margin: 0 5px 16px; padding: 0 13px; border: 1px solid #e6e6e9; border-radius: 13px; background: #fff; }
.conversation-filter svg { width: 17px; fill: none; stroke: #929299; stroke-width: 1.8; }
.conversation-filter input { width: 100%; padding: 10px 0; border: 0; outline: 0; background: transparent; font-size: 12px; }
.conversation-list { display: grid; min-height: 0; align-content: start; gap: 4px; overflow-y: auto; overscroll-behavior: contain; padding-right: 3px; }
.conversation-list > button:not(.load-more) { display: grid; width: 100%; grid-template-columns: 42px minmax(0, 1fr) auto; gap: 11px; align-items: center; padding: 10px; text-align: left; border: 0; border-radius: 16px; background: transparent; transition: 160ms ease; }
.conversation-list > button:hover { background: #fff; }
.conversation-list > button.is-active { background: #fff; box-shadow: 0 10px 26px rgba(24, 24, 27, .07); }
.conversation-avatar { width: 42px; height: 42px; font-size: 12px; }
.conversation-avatar i { font-style: normal; }
.conversation-copy { min-width: 0; }
.conversation-copy strong, .conversation-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conversation-copy strong { font-size: 12px; }
.conversation-copy small { margin-top: 4px; color: #929299; font-size: 10px; }
.conversation-meta { display: grid; justify-items: end; gap: 5px; }
.conversation-meta time { color: #aaaab0; font-size: 9px; }
.chat-panel { display: grid; min-width: 0; min-height: 0; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; }
.chat-heading { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 24px 28px; border-bottom: 1px solid #ececef; }
.chat-heading p { margin: 0 0 5px; color: #a1a1aa; font-size: 9px; font-weight: 760; letter-spacing: .12em; }
.chat-heading > span { padding: 8px 12px; border-radius: 999px; background: #f4f4f5; color: #5f5f66; font-size: 11px; }
.recipient-search input { width: min(330px, 42vw); padding: 0; color: #252528; border: 0; outline: 0; background: transparent; font-size: 14px; font-weight: 760; }
.recipient-search > span { margin-left: 8px; color: #a1a1aa; font-size: 9px; }
.recipient-results { position: absolute; top: 73px; left: 24px; z-index: 10; width: min(350px, calc(100% - 48px)); padding: 7px; border: 1px solid #e7e7e9; border-radius: 17px; background: rgba(255, 255, 255, .98); box-shadow: 0 20px 48px rgba(24, 24, 27, .13); }
.recipient-results button { display: grid; width: 100%; grid-template-columns: 32px minmax(0, 1fr); gap: 10px; align-items: center; padding: 7px; text-align: left; border: 0; border-radius: 11px; background: transparent; }
.recipient-results button:hover { background: #f4f4f5; }
.recipient-results img, .recipient-results button > span { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 50%; background: #f2c6ca; object-fit: cover; color: #fff; }
.recipient-results strong { font-size: 11px; }
.recipient-results p { margin: 12px; color: #94949b; font-size: 11px; }
.chat-history { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 24px 28px; scroll-behavior: smooth; }
.chat-stream { display: flex; flex-direction: column; gap: 15px; }
.chat-bubble { align-self: flex-start; max-width: min(72%, 520px); }
.chat-bubble p { margin: 0; padding: 11px 14px; color: #45454a; border-radius: 5px 17px 17px 17px; background: #f0f0f2; font-size: 12px; line-height: 1.6; }
.chat-bubble time { display: block; margin: 5px 3px 0; color: #aaaab0; font-size: 8px; }
.chat-bubble.is-self { align-self: flex-end; text-align: right; }
.chat-bubble.is-self p { color: #fff; border-radius: 17px 5px 17px 17px; background: #303033; }
.chat-placeholder, .message-empty, .messages-auth { display: flex; min-height: 390px; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.chat-placeholder > span, .message-empty > span { color: #ef7d8b; font-size: 32px; }
.chat-placeholder h3, .message-empty h3 { margin: 12px 0 6px; font-size: 18px; }
.chat-placeholder p, .message-empty p { margin: 0; color: #95959d; font-size: 11px; }
.chat-first { margin: auto; color: #aaaab0; font-size: 11px; text-align: center; }
.chat-composer { padding: 16px 20px 20px; border-top: 1px solid #ececef; }
.chat-composer textarea { box-sizing: border-box; width: 100%; resize: none; padding: 13px 14px; border: 1px solid #e4e4e7; border-radius: 15px; outline: 0; background: #fafafa; font-size: 12px; line-height: 1.6; }
.chat-composer textarea:focus { border-color: rgba(239, 82, 103, .4); background: #fff; }
.chat-composer > div { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 9px; }
.chat-composer span { color: #a1a1aa; font-size: 9px; }
.chat-composer span.is-error { color: #e65063; }
.chat-composer button { padding: 9px 22px; color: #fff; border: 0; border-radius: 999px; background: #29292c; font-size: 11px; font-weight: 760; }
.chat-composer button:disabled, button:disabled { cursor: default; opacity: .45; }
.message-state { padding: 80px 20px; color: #8b8b92; text-align: center; font-size: 12px; }
.message-state.is-small { padding: 50px 10px; }
.message-state.is-error { color: #d64d60; }
.load-more, .history-more { display: block; margin: 18px auto 0; padding: 9px 16px; color: #696970; border: 1px solid #e3e3e6; border-radius: 999px; background: #fff; font-size: 10px; font-weight: 720; }
.load-more.is-compact { width: auto; }
.history-more { margin: 0 auto 20px; }
.sidebar-empty { padding: 70px 12px; color: #a1a1aa; text-align: center; font-size: 11px; }
.messages-auth { min-height: 540px; border: 1px solid rgba(24, 24, 27, .06); border-radius: 36px; background: rgba(255, 255, 255, .82); box-shadow: 0 28px 70px rgba(36, 32, 31, .07); }
.messages-auth-mark { display: grid; width: 76px; height: 76px; place-items: center; border-radius: 24px; background: #f7e5e7; color: #df6270; }
.messages-auth-mark svg { width: 36px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.5; }
.messages-auth > p { margin: 22px 0 7px; color: #e45466; font-size: 9px; font-weight: 850; letter-spacing: .15em; }
.messages-auth h2 { margin: 0; font-size: 28px; }
.messages-auth > span:not(.messages-auth-mark) { margin-top: 10px; color: #8f8f96; font-size: 12px; }
.messages-auth > button { margin-top: 24px; padding: 12px 22px; color: #fff; border: 0; border-radius: 999px; background: #29292c; font-size: 12px; font-weight: 760; }
.message-panel-enter-active, .message-panel-leave-active { transition: opacity 180ms ease, transform 220ms ease; }
.message-panel-enter-from { opacity: 0; transform: translateY(8px); }
.message-panel-leave-to { opacity: 0; transform: translateY(-5px); }
@media (max-width: 820px) {
  .messages-main { padding: 38px 16px 140px; }
  .messages-main.is-private-view { display: block; height: auto; min-height: calc(100vh - 68px); overflow: visible; padding-bottom: 140px; }
  .messages-heading { display: block; }
  .messages-heading > span { display: block; margin-top: 14px; }
  .private-workspace { grid-template-columns: 1fr; }
  .conversation-sidebar { display: block; overflow: visible; border-right: 0; border-bottom: 1px solid #e9e9eb; }
  .conversation-list { max-height: 260px; overflow-y: auto; }
  .notice-workspace { padding: 20px 16px; }
  .chat-panel { min-height: 610px; }
}
@media (max-width: 560px) {
  .messages-heading h1 { font-size: 46px; }
  .messages-tabs button { flex: 1; }
  .notice-copy > div { display: block; }
  .notice-copy time { display: block; margin-top: 5px; }
  .chat-heading { padding: 20px; }
  .chat-history { padding: 20px; }
  .recipient-search input { width: 68vw; }
}
</style>
