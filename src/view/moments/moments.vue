<template>
  <div class="moments-page" :class="{ 'is-comments-open': commentsDrawerOpen }">
    <AppHeader />

    <main class="moments-main" data-route-motion-root>
      <header class="moments-heading">
        <div>
          <p>MUSIC & PEOPLE</p>
          <h1>音乐动态</h1>
        </div>
        <span>这里不负责推荐下一首，只记录人们为什么分享这一首。</span>
      </header>

      <section v-if="!userStore.isLoggedIn" class="moments-auth">
        <div class="moments-auth-orbit" aria-hidden="true"><span>♪</span></div>
        <p>YOUR MUSIC CIRCLE</p>
        <h2>登录后进入音乐动态</h2>
        <span>查看关注的人、分享歌曲，也可以参与正在发生的话题。</span>
        <button type="button" @click="openLoginDialog">登录网易云音乐</button>
      </section>

      <template v-else>
        <section class="share-studio">
          <div class="share-avatar">
            <img v-if="userStore.avatarUrl" :src="userStore.avatarUrl" alt="你的头像" />
            <span v-else>{{ initial(userStore.nickname) }}</span>
          </div>
          <form @submit.prevent="submitShare">
            <textarea v-model="shareText" rows="2" maxlength="140" placeholder="这首歌让你想到了什么？" />

            <Transition name="attachment">
              <div v-if="selectedSong" class="selected-song">
                <img :src="songCover(selectedSong)" alt="" />
                <div><small>准备分享的歌曲</small><strong>{{ selectedSong.name }}</strong><span>{{ artistNames(selectedSong) }}</span></div>
                <button type="button" aria-label="移除歌曲" @click="selectedSong = null">×</button>
              </div>
            </Transition>

            <div v-if="songSearchOpen" class="song-finder">
              <div class="song-finder-input">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                <input v-model.trim="songKeyword" type="search" placeholder="搜索要分享的歌曲" @keydown.enter.prevent="searchSongs" />
                <button type="button" :disabled="songSearching || !songKeyword" @click="searchSongs">{{ songSearching ? '搜索中' : '搜索' }}</button>
              </div>
              <div v-if="songResults.length" class="song-results">
                <button v-for="song in songResults" :key="song.id" type="button" @click="chooseSong(song)">
                  <img :src="songCover(song)" alt="" loading="lazy" />
                  <span><strong>{{ song.name }}</strong><small>{{ artistNames(song) }}</small></span>
                  <i>选择</i>
                </button>
              </div>
              <p v-else-if="songSearched && !songSearching">没有找到匹配歌曲</p>
            </div>

            <footer>
              <div>
                <button type="button" :class="{ 'is-active': songSearchOpen }" @click="songSearchOpen = !songSearchOpen">
                  <svg viewBox="0 0 24 24"><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>
                  关联歌曲
                </button>
                <span>{{ shareText.length }}/140</span>
              </div>
              <div><small :class="{ 'is-error': shareFeedbackError }">{{ shareFeedback }}</small><button class="share-submit" type="submit" :disabled="sharing || (!shareText.trim() && !selectedSong)">{{ sharing ? '发布中' : '发布动态' }}</button></div>
            </footer>
          </form>
        </section>

        <div class="moments-layout">
          <section class="feed-column">
            <header class="feed-toolbar">
              <div>
                <button type="button" :class="{ 'is-active': feedMode === 'following' && !selectedFollow }" @click="showFollowingFeed">关注动态</button>
                <button type="button" :class="{ 'is-active': feedMode === 'mine' }" @click="showMyFeed">我的分享</button>
              </div>
              <span v-if="selectedFollow">只看 {{ selectedFollow.nickname }} <button type="button" @click="showFollowingFeed">×</button></span>
              <button v-else type="button" :disabled="feedLoading" @click="loadEvents({reset: true})">刷新</button>
            </header>

            <div v-if="feedLoading" class="event-feed-skeleton" aria-label="正在加载音乐动态">
              <article v-for="index in 4" :key="index" :style="{ '--feed-skeleton-delay': `${index * 90}ms` }">
                <header><span/><div><i/><i/></div></header><b/><b/><footer><i/><i/><i/></footer>
              </article>
            </div>
            <p v-else-if="feedError" class="moments-state is-error">{{ feedError }} <button type="button" @click="loadEvents({reset: true})">重试</button></p>
            <TransitionGroup v-else-if="events.length" name="moment-event" tag="div" class="event-list" appear>
              <article v-for="(event, eventIndex) in events" :key="event.id" class="event-card" :style="{ '--event-delay': `${Math.min(eventIndex, 10) * 58}ms` }">
                <header>
                  <div class="event-avatar">
                    <img v-if="event.user.avatarUrl" :src="event.user.avatarUrl" alt="" loading="lazy" />
                    <span v-else>{{ initial(event.user.nickname) }}</span>
                  </div>
                  <div><strong>{{ event.user.nickname }}</strong><span>{{ event.actionLabel }} · {{ relativeTime(event.time) }}</span></div>
                  <i v-if="event.user.userId === Number(userStore.userId)">我</i>
                </header>

                <p v-if="event.text" class="event-text">{{ event.text }}</p>

                <button v-if="event.resource" type="button" class="event-resource" @click="openResource(event.resource)">
                  <img v-if="event.resource.cover" :src="event.resource.cover" alt="" loading="lazy" />
                  <span v-else class="resource-note">♪</span>
                  <span><small>{{ event.resource.label }}</small><strong>{{ event.resource.name }}</strong><i>{{ event.resource.subtitle }}</i></span>
                  <b v-if="event.resource.kind === 'song'" aria-label="播放歌曲">
                    <svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z"/></svg>
                  </b>
                  <em v-else>打开</em>
                </button>

                <div v-if="event.pictures.length" class="event-pictures" :class="`has-${Math.min(event.pictures.length, 3)}`">
                  <img v-for="(picture, index) in event.pictures.slice(0, 3)" :key="`${event.id}-pic-${index}`" :src="picture" alt="动态图片" loading="lazy" />
                </div>

                <footer class="event-actions">
                  <button type="button" :class="{ 'is-active': forwardingEventId === event.id }" @click="toggleForward(event.id)">
                    <svg viewBox="0 0 24 24"><path d="m9 7-5 5 5 5M4 12h9a6 6 0 0 1 6 6"/></svg>{{ event.shareCount || '转发' }}
                  </button>
                  <button type="button" @click="openComments(event)"><svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-2 2v-9.5A7.5 7.5 0 0 1 10.5 4H13a7 7 0 0 1 7 7.5Z"/></svg>{{ event.commentCount || '评论' }}</button>
                  <button type="button" class="event-like" :class="{ 'is-liked': event.liked, 'is-pending': event.likePending }" :disabled="event.likePending || !event.threadId" :aria-pressed="event.liked" @click="toggleEventLike(event)"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>{{ event.likedCount || '喜欢' }}</button>
                </footer>

                <Transition name="attachment">
                  <form v-if="forwardingEventId === event.id" class="forward-composer" @submit.prevent="submitForward(event)">
                    <input v-model.trim="forwardText" maxlength="140" placeholder="说点什么再转发…" />
                    <button type="submit" :disabled="forwarding">{{ forwarding ? '转发中' : '确认转发' }}</button>
                  </form>
                </Transition>
                <p v-if="forwardFeedbackId === event.id" class="forward-feedback" :class="{ 'is-error': forwardFeedbackError }">{{ forwardFeedback }}</p>
              </article>

              <button v-if="feedHasMore" class="feed-more" type="button" :disabled="feedLoadingMore" @click="loadEvents({reset: false})">{{ feedLoadingMore ? '正在加载…' : '继续往下看' }}</button>
            </TransitionGroup>
            <div v-else class="feed-empty"><span>♪</span><h3>这里还很安静</h3><p>{{ feedMode === 'mine' ? '分享一首正在听的歌，留下第一条动态。' : '关注一些喜欢的音乐人，动态会出现在这里。' }}</p></div>
          </section>

          <aside class="moments-sidebar">
            <section class="following-panel">
              <header><div><small>FOLLOWING</small><h2>关注的人</h2></div><span>{{ follows.length }}</span></header>
              <p v-if="followsLoading" class="sidebar-state">正在读取关注列表…</p>
              <div v-else-if="follows.length" class="following-list">
                <button v-for="user in follows.slice(0, 8)" :key="user.userId" type="button" :class="{ 'is-active': selectedFollow?.userId === user.userId }" @click="showUserFeed(user)">
                  <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" loading="lazy" /><span v-else>{{ initial(user.nickname) }}</span>
                  <strong>{{ user.nickname }}</strong><i>查看</i>
                </button>
              </div>
              <p v-else class="sidebar-state">暂时没有关注的人</p>
            </section>

            <section class="topics-panel">
              <header><div><small>HOT TOPICS</small><h2>热门话题</h2></div><span>此刻</span></header>
              <p v-if="topicsLoading" class="sidebar-state">正在同步话题…</p>
              <div v-else-if="topics.length" class="topic-list">
                <button v-for="(topic, index) in topics.slice(0, 8)" :key="topic.id" type="button" @click="openTopic(topic)">
                  <span>{{ String(index + 1).padStart(2, '0') }}</span>
                  <div><strong># {{ topic.title }}</strong><small>{{ compactCount(topic.count) }} 人参与</small></div>
                  <i>→</i>
                </button>
              </div>
              <p v-else class="sidebar-state">话题暂时没有更新</p>
            </section>
          </aside>
        </div>
      </template>
    </main>

    <Teleport to="body">
      <Transition name="comments-layer">
        <div v-if="commentsDrawerOpen" class="comments-layer" role="dialog" aria-modal="true" aria-labelledby="comments-title">
          <button class="comments-backdrop" type="button" aria-label="关闭评论" @click="closeComments" />
          <aside class="comments-drawer">
            <span class="comments-drawer-accent" aria-hidden="true" />
            <header class="comments-drawer-heading">
              <div><p>CONVERSATION</p><h2 id="comments-title">评论</h2><span>{{ commentsTotal ? `${compactCount(commentsTotal)} 条回应` : '听听大家怎么说' }}</span></div>
              <button type="button" aria-label="关闭评论" @click="closeComments">
                <svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>
              </button>
            </header>

            <article v-if="activeCommentEvent" class="comments-event-preview">
              <div>
                <img v-if="activeCommentEvent.user.avatarUrl" :src="activeCommentEvent.user.avatarUrl" alt="" />
                <span v-else>{{ initial(activeCommentEvent.user.nickname) }}</span>
              </div>
              <p><strong>{{ activeCommentEvent.user.nickname }}</strong><span>{{ activeCommentEvent.text || activeCommentEvent.resource?.name || '分享了一条音乐动态' }}</span></p>
            </article>

            <section ref="commentsScrollRef" class="comments-scroll">
              <div v-if="commentsLoading" class="comments-skeleton" aria-label="正在加载评论">
                <article v-for="index in 5" :key="index" :style="{ '--skeleton-delay': `${index * 70}ms` }"><span/><div><i/><i/><i/></div></article>
              </div>
              <div v-else-if="commentsError && !allComments.length" class="comments-state is-error"><span>!</span><h3>评论没有加载出来</h3><p>{{ commentsError }}</p><button type="button" @click="loadComments({reset: true})">重新加载</button></div>
              <div v-else-if="allComments.length">
                <TransitionGroup name="comment-item" tag="div" class="comments-list" appear>
                  <article v-for="(comment, index) in allComments" :key="comment.id" :style="{ '--comment-delay': `${Math.min(index, 12) * 42}ms` }">
                    <div class="comment-avatar"><img v-if="comment.user.avatarUrl" :src="comment.user.avatarUrl" alt="" loading="lazy" /><span v-else>{{ initial(comment.user.nickname) }}</span></div>
                    <div class="comment-copy">
                      <header><strong>{{ comment.user.nickname }}</strong><time>{{ relativeTime(comment.time) }}</time></header>
                      <p>{{ comment.content }}</p>
                      <blockquote v-if="comment.reply"><strong>@{{ comment.reply.nickname }}</strong>{{ comment.reply.content }}</blockquote>
                      <footer>
                        <span v-if="comment.likedCount"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>{{ compactCount(comment.likedCount) }}</span>
                        <button type="button" @click="selectCommentReply(comment)">回复</button>
                      </footer>
                    </div>
                  </article>
                </TransitionGroup>
                <p v-if="commentsError" class="comments-load-error">{{ commentsError }}</p>
                <button v-if="commentsHasMore" class="comments-more" type="button" :disabled="commentsLoadingMore" @click="loadComments({reset: false})">{{ commentsLoadingMore ? '正在载入更多回应…' : '继续查看评论' }}</button>
              </div>
              <div v-else class="comments-state"><span>○</span><h3>还没有评论</h3><p>这条动态正在等待第一条回应。</p></div>
            </section>

            <form class="comments-composer" @submit.prevent="submitEventComment">
              <Transition name="reply-target">
                <div v-if="replyTarget" class="reply-target">
                  <span>正在回复 <strong>@{{ replyTarget.user.nickname }}</strong></span>
                  <button type="button" aria-label="取消回复" @click="cancelCommentReply">×</button>
                </div>
              </Transition>
              <textarea ref="commentInputRef" v-model="commentContent" rows="2" maxlength="140" :placeholder="replyTarget ? `回复 @${replyTarget.user.nickname}` : '写一条评论…'" @keydown.ctrl.enter.prevent="submitEventComment" @keydown.meta.enter.prevent="submitEventComment" />
              <footer>
                <span :class="{ 'is-error': commentFeedbackError }">{{ commentFeedback || `${commentContent.length}/140 · Ctrl/⌘ + Enter 发送` }}</span>
                <button type="submit" :disabled="commentSending || !commentContent.trim()">{{ commentSending ? '发送中' : (replyTarget ? '回复' : '评论') }}</button>
              </footer>
            </form>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <Transition name="topic-dialog">
      <div v-if="topicDialogOpen" class="topic-dialog" role="dialog" aria-modal="true" aria-labelledby="topic-dialog-title">
        <button class="topic-backdrop" type="button" aria-label="关闭话题" @click="closeTopic" />
        <section class="topic-sheet">
          <button class="topic-close" type="button" aria-label="关闭" @click="closeTopic">×</button>
          <p>TRENDING CONVERSATION</p>
          <h2 id="topic-dialog-title"># {{ activeTopic?.title }}</h2>
          <span>{{ topicDetailText || activeTopic?.text || '看看大家正在围绕这段声音聊些什么。' }}</span>
          <div v-if="topicLoading" class="topic-loading">正在打开话题…</div>
          <div v-else-if="topicEvents.length" class="topic-event-list">
            <article v-for="event in topicEvents.slice(0, 6)" :key="`topic-${event.id}`">
              <img v-if="event.user.avatarUrl" :src="event.user.avatarUrl" alt="" /><i v-else>{{ initial(event.user.nickname) }}</i>
              <div><strong>{{ event.user.nickname }}</strong><p>{{ event.text || event.resource?.name || '分享了一条音乐动态' }}</p><small>{{ relativeTime(event.time) }}</small></div>
            </article>
          </div>
          <div v-else class="topic-loading">这个话题还没有可展示的动态。</div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<script setup>
defineOptions({name: 'MomentsPage'})

import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import AppHeader from '@/components/appHeader/AppHeader.vue'
import {userApi} from '@/api/userApi/userApi.js'
import {searchApi} from '@/api/searchApi/searchApi.js'
import {useCounterStore} from '@/stores/userStores.js'
import {playSongWithQueue} from '@/utils/globalPlayer.js'
import {openLoginDialog} from '@/utils/loginDialog.js'
import {useDetailNavigation} from '@/composables/useDetailNavigation.js'

const router = useRouter()
const {openDetail} = useDetailNavigation()
const userStore = useCounterStore()

const follows = ref([])
const followsLoading = ref(false)
const topics = ref([])
const topicsLoading = ref(false)
const events = ref([])
const feedLoading = ref(false)
const feedLoadingMore = ref(false)
const feedError = ref('')
const feedHasMore = ref(false)
const feedLastTime = ref(-1)
const feedMode = ref('following')
const selectedFollow = ref(null)
let feedRequestId = 0

const shareText = ref('')
const sharing = ref(false)
const shareFeedback = ref('')
const shareFeedbackError = ref(false)
const songSearchOpen = ref(false)
const songKeyword = ref('')
const songSearching = ref(false)
const songSearched = ref(false)
const songResults = ref([])
const selectedSong = ref(null)

const forwardingEventId = ref('')
const forwardText = ref('')
const forwarding = ref(false)
const forwardFeedback = ref('')
const forwardFeedbackId = ref('')
const forwardFeedbackError = ref(false)

const commentsDrawerOpen = ref(false)
const activeCommentEvent = ref(null)
const comments = ref([])
const hotComments = ref([])
const commentsLoading = ref(false)
const commentsLoadingMore = ref(false)
const commentsError = ref('')
const commentsHasMore = ref(false)
const commentsOffset = ref(0)
const commentsTotal = ref(0)
const commentsScrollRef = ref(null)
const commentInputRef = ref(null)
const commentContent = ref('')
const commentSending = ref(false)
const commentFeedback = ref('')
const commentFeedbackError = ref(false)
const replyTarget = ref(null)
let commentsRequestId = 0
let previousBodyOverflow = ''

const topicDialogOpen = ref(false)
const activeTopic = ref(null)
const topicLoading = ref(false)
const topicEvents = ref([])
const topicDetailText = ref('')
let topicRequestId = 0

const currentFeedUserId = computed(() => {
  if (selectedFollow.value?.userId) return selectedFollow.value.userId
  if (feedMode.value === 'mine') return Number(userStore.userId || 0)
  return 0
})
const allComments = computed(() => {
  const merged = new Map()
  hotComments.value.forEach(item => merged.set(item.id, {...item, isHot: true}))
  comments.value.forEach(item => merged.set(item.id, item))
  return Array.from(merged.values())
})

function safeJson(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try { return JSON.parse(value) || {} } catch { return {msg: String(value)} }
}

function artistNames(song) {
  return (song?.ar || song?.artists || []).map(item => item?.name || item).filter(Boolean).join(' / ') || song?.artistName || '未知艺人'
}

function songCover(song) {
  return song?.al?.picUrl || song?.album?.picUrl || song?.cover || song?.picUrl || ''
}

function normalizeResource(payload) {
  const candidates = [
    ['song', payload?.song, '单曲'],
    ['playlist', payload?.playlist, '歌单'],
    ['album', payload?.album, '专辑'],
    ['mv', payload?.mv, 'MV'],
    ['program', payload?.program || payload?.djProgram, '播客节目'],
    ['radio', payload?.djRadio || payload?.radio, '播客'],
    ['video', payload?.video, '视频'],
  ]
  const matched = candidates.find(([, value]) => value && typeof value === 'object')
  if (!matched) return null
  const [kind, value, label] = matched
  const creator = value?.creator?.nickname || value?.artist?.name || artistNames(value)
  return {
    kind,
    id: Number(value?.id || value?.vid || 0),
    name: value?.name || value?.title || value?.al?.name || '音乐内容',
    subtitle: creator,
    cover: songCover(value) || value?.coverImgUrl || value?.coverUrl || value?.picUrl || value?.blurPicUrl || value?.creator?.avatarUrl || '',
    label,
    raw: value,
  }
}

function normalizeEvent(item, index = 0) {
  const payload = safeJson(item?.json || item?.content)
  const user = item?.user || payload?.user || {}
  const pictures = (item?.pics || item?.pictures || []).map(pic => pic?.originUrl || pic?.pcSquareUrl || pic?.squareUrl || pic?.url).filter(Boolean)
  const info = item?.info || {}
  return {
    id: String(item?.id || item?.eventId || item?.evId || `${item?.eventTime || Date.now()}-${index}`),
    user: {
      userId: Number(user?.userId || user?.id || 0),
      nickname: user?.nickname || '音乐用户',
      avatarUrl: user?.avatarUrl || '',
    },
    text: String(payload?.msg || payload?.message || item?.forwardInfo?.eventData?.msg || '').trim(),
    actionLabel: item?.actName || (payload?.song ? '分享单曲' : '分享动态'),
    time: Number(item?.eventTime || item?.showTime || item?.time || Date.now()),
    resource: normalizeResource(payload),
    pictures,
    threadId: info?.threadId || item?.threadId || '',
    commentCount: Number(info?.commentCount || item?.commentCount || 0),
    likedCount: Number(info?.likedCount || item?.likedCount || 0),
    liked: Boolean(info?.liked || item?.liked),
    likePending: false,
    shareCount: Number(info?.shareCount || item?.forwardCount || 0),
  }
}

function normalizeComment(item, index = 0) {
  const user = item?.user || {}
  const replySource = Array.isArray(item?.beReplied) ? item.beReplied[0] : null
  return {
    id: String(item?.commentId || item?.id || `${item?.time || Date.now()}-${index}`),
    content: String(item?.content || '').trim(),
    time: Number(item?.time || Date.now()),
    likedCount: Number(item?.likedCount || 0),
    user: {
      userId: Number(user?.userId || user?.id || 0),
      nickname: user?.nickname || '音乐用户',
      avatarUrl: user?.avatarUrl || '',
    },
    reply: replySource ? {
      nickname: replySource?.user?.nickname || '音乐用户',
      content: replySource?.content || '',
    } : null,
  }
}

function mergeComments(oldList, newList) {
  const merged = new Map(oldList.map(item => [item.id, item]))
  newList.forEach(item => merged.set(item.id, item))
  return Array.from(merged.values())
}

async function loadComments({reset = false} = {}) {
  const event = activeCommentEvent.value
  if (!event?.threadId) {
    commentsError.value = '这条动态暂时没有可读取的评论入口。'
    commentsLoading.value = false
    return
  }
  const requestId = ++commentsRequestId
  if (reset) {
    commentsLoading.value = true
    commentsError.value = ''
    commentsOffset.value = 0
    comments.value = []
    hotComments.value = []
  } else {
    commentsLoadingMore.value = true
  }
  try {
    const response = await userApi.getEventComments(event.threadId, null, 30, commentsOffset.value, 0)
    if (requestId !== commentsRequestId) return
    const payload = response?.data || {}
    const rawComments = Array.isArray(payload?.comments) ? payload.comments : []
    const normalized = rawComments.map(normalizeComment)
    comments.value = reset ? normalized : mergeComments(comments.value, normalized)
    if (reset) {
      const rawHot = payload?.hotComments || payload?.topComments || []
      hotComments.value = (Array.isArray(rawHot) ? rawHot : []).map(normalizeComment)
    }
    commentsOffset.value += rawComments.length
    commentsTotal.value = Number(payload?.total || event.commentCount || comments.value.length)
    commentsHasMore.value = Boolean(payload?.more) || (commentsOffset.value < commentsTotal.value && rawComments.length > 0)
    if (commentsTotal.value > event.commentCount) event.commentCount = commentsTotal.value
  } catch (error) {
    if (requestId !== commentsRequestId) return
    commentsError.value = error?.message || '评论加载失败，请稍后重试'
  } finally {
    if (requestId === commentsRequestId) {
      commentsLoading.value = false
      commentsLoadingMore.value = false
    }
  }
}

function openComments(event) {
  activeCommentEvent.value = event
  commentsDrawerOpen.value = true
  commentsTotal.value = Number(event?.commentCount || 0)
  commentContent.value = ''
  commentFeedback.value = ''
  commentFeedbackError.value = false
  replyTarget.value = null
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  void loadComments({reset: true})
}

function closeComments() {
  commentsRequestId += 1
  commentsDrawerOpen.value = false
  commentsLoading.value = false
  commentsLoadingMore.value = false
  document.body.style.overflow = previousBodyOverflow
}

function selectCommentReply(comment) {
  replyTarget.value = comment
  commentFeedback.value = ''
  commentFeedbackError.value = false
  void nextTick(() => commentInputRef.value?.focus())
}

function cancelCommentReply() {
  replyTarget.value = null
  commentFeedback.value = ''
  void nextTick(() => commentInputRef.value?.focus())
}

async function submitEventComment() {
  const event = activeCommentEvent.value
  const content = commentContent.value.trim()
  if (!event?.threadId || !content || commentSending.value) return
  commentSending.value = true
  commentFeedback.value = ''
  commentFeedbackError.value = false
  try {
    const response = await userApi.sendEventComment(event.threadId, content, replyTarget.value?.id || null)
    const code = Number(response?.data?.code || 200)
    if (code !== 200) throw new Error(response?.data?.message || '评论发送失败')
    const serverComment = response?.data?.comment || response?.data?.data?.comment || null
    const created = serverComment ? normalizeComment(serverComment) : {
      id: `local-comment-${Date.now()}`,
      content,
      time: Date.now(),
      likedCount: 0,
      user: {
        userId: Number(userStore.userId || 0),
        nickname: userStore.nickname || '我',
        avatarUrl: userStore.avatarUrl || '',
      },
      reply: replyTarget.value ? {
        nickname: replyTarget.value.user.nickname,
        content: replyTarget.value.content,
      } : null,
    }
    if (!created.user.userId && userStore.userId) {
      created.user = {
        userId: Number(userStore.userId),
        nickname: userStore.nickname || '我',
        avatarUrl: userStore.avatarUrl || '',
      }
    }
    comments.value = [created, ...comments.value.filter(item => item.id !== created.id)]
    commentsTotal.value += 1
    event.commentCount = Number(event.commentCount || 0) + 1
    commentContent.value = ''
    replyTarget.value = null
    commentFeedback.value = '已经发送'
    await nextTick()
    commentsScrollRef.value?.scrollTo({top: 0, behavior: 'smooth'})
  } catch (error) {
    commentFeedback.value = error?.message || '发送失败，请稍后重试'
    commentFeedbackError.value = true
  } finally {
    commentSending.value = false
  }
}

async function toggleEventLike(event) {
  if (!event?.threadId || event.likePending) return
  const previousLiked = Boolean(event.liked)
  const previousCount = Number(event.likedCount || 0)
  const nextLiked = !previousLiked
  event.liked = nextLiked
  event.likedCount = Math.max(0, previousCount + (nextLiked ? 1 : -1))
  event.likePending = true
  try {
    const response = await userApi.likeEvent(event.threadId, nextLiked ? 1 : 0)
    const code = Number(response?.data?.code || 200)
    if (code !== 200) throw new Error(response?.data?.message || '操作失败')
  } catch {
    event.liked = previousLiked
    event.likedCount = previousCount
  } finally {
    event.likePending = false
  }
}

function handleOverlayEscape(event) {
  if (event.key !== 'Escape') return
  if (commentsDrawerOpen.value) closeComments()
  else if (topicDialogOpen.value) closeTopic()
}

function mergeEvents(oldList, newList) {
  const merged = new Map(oldList.map(item => [item.id, item]))
  newList.forEach(item => merged.set(item.id, item))
  return Array.from(merged.values()).sort((a, b) => b.time - a.time)
}

async function loadFollows() {
  if (!userStore.userId) return
  followsLoading.value = true
  try {
    const response = await userApi.getUserFollows(userStore.userId, 30, 0)
    const raw = response?.data?.follow || response?.data?.follows || []
    follows.value = (Array.isArray(raw) ? raw : []).map(item => ({
      userId: Number(item?.userId || item?.id || 0),
      nickname: item?.nickname || '音乐用户',
      avatarUrl: item?.avatarUrl || '',
    })).filter(item => item.userId)
  } catch {
    follows.value = []
  } finally {
    followsLoading.value = false
  }
}

function normalizeTopic(item, index) {
  return {
    id: Number(item?.actId || item?.id || item?.topicId || 0),
    title: item?.title || item?.name || `热门话题 ${index + 1}`,
    text: item?.text || item?.summary || '',
    count: Number(item?.participateCount || item?.participateCountLong || item?.shareCount || 0),
    cover: item?.sharePicUrl || item?.coverUrl || '',
  }
}

async function loadTopics() {
  topicsLoading.value = true
  try {
    const response = await userApi.getHotTopics(20, 0)
    const raw = response?.data?.hot || response?.data?.topics || response?.data?.data || []
    topics.value = (Array.isArray(raw) ? raw : []).map(normalizeTopic).filter(item => item.id)
  } catch {
    topics.value = []
  } finally {
    topicsLoading.value = false
  }
}

async function loadFollowFeedFallback() {
  if (!follows.value.length) return []
  const responses = await Promise.allSettled(follows.value.slice(0, 6).map(user => userApi.getUserEvent(user.userId, 6, -1)))
  return responses.flatMap(result => {
    if (result.status !== 'fulfilled') return []
    const raw = result.value?.data?.events || result.value?.data?.event || []
    return Array.isArray(raw) ? raw : []
  })
}

async function loadEvents({reset = false} = {}) {
  if (!userStore.isLoggedIn) return
  const requestId = ++feedRequestId
  if (reset) {
    feedLoading.value = true
    feedLastTime.value = -1
    feedError.value = ''
  } else {
    feedLoadingMore.value = true
  }
  try {
    let response
    let raw = []
    let payload = {}
    if (currentFeedUserId.value) {
      response = await userApi.getUserEvent(currentFeedUserId.value, 30, feedLastTime.value)
      payload = response?.data || {}
      raw = payload?.events || payload?.event || []
    } else {
      try {
        response = await userApi.getFollowEvents(30, feedLastTime.value)
        payload = response?.data || {}
        raw = payload?.event || payload?.events || []
      } catch (error) {
        if (!reset) throw error
        raw = await loadFollowFeedFallback()
        payload = {more: false}
      }
    }
    if (requestId !== feedRequestId) return
    const normalized = (Array.isArray(raw) ? raw : []).map(normalizeEvent)
    events.value = reset ? normalized : mergeEvents(events.value, normalized)
    feedHasMore.value = Boolean(payload?.more)
    const last = payload?.lasttime || raw.at?.(-1)?.eventTime || normalized.at(-1)?.time
    if (last) feedLastTime.value = Number(last)
  } catch (error) {
    if (requestId !== feedRequestId) return
    feedError.value = error?.message || '动态加载失败'
    if (reset) events.value = []
  } finally {
    if (requestId === feedRequestId) {
      feedLoading.value = false
      feedLoadingMore.value = false
    }
  }
}

function showFollowingFeed() {
  feedMode.value = 'following'
  selectedFollow.value = null
  void loadEvents({reset: true})
}

function showMyFeed() {
  feedMode.value = 'mine'
  selectedFollow.value = null
  void loadEvents({reset: true})
}

function showUserFeed(user) {
  feedMode.value = 'following'
  selectedFollow.value = user
  void loadEvents({reset: true})
}

async function searchSongs() {
  const keyword = songKeyword.value.trim()
  if (!keyword) return
  songSearching.value = true
  songSearched.value = false
  try {
    const response = await searchApi.searchByType(keyword, {type: 1, limit: 8, offset: 0})
    songResults.value = response?.data?.result?.songs || []
  } catch {
    songResults.value = []
  } finally {
    songSearching.value = false
    songSearched.value = true
  }
}

function chooseSong(song) {
  selectedSong.value = song
  songSearchOpen.value = false
  songResults.value = []
}

async function submitShare() {
  const content = shareText.value.trim()
  if (!content && !selectedSong.value) return
  sharing.value = true
  shareFeedback.value = ''
  shareFeedbackError.value = false
  try {
    const type = selectedSong.value ? 'song' : 'noresource'
    const response = await userApi.shareResource(type, content, selectedSong.value?.id || null)
    const code = Number(response?.data?.code || 200)
    if (code !== 200) throw new Error(response?.data?.message || '发布失败')
    shareText.value = ''
    selectedSong.value = null
    songSearchOpen.value = false
    shareFeedback.value = '已经分享到音乐动态'
    feedMode.value = 'mine'
    selectedFollow.value = null
    await loadEvents({reset: true})
  } catch (error) {
    shareFeedback.value = error?.message || '发布失败，请稍后重试'
    shareFeedbackError.value = true
  } finally {
    sharing.value = false
  }
}

function toggleForward(eventId) {
  forwardingEventId.value = forwardingEventId.value === eventId ? '' : eventId
  forwardText.value = ''
  forwardFeedback.value = ''
  forwardFeedbackId.value = ''
}

async function submitForward(event) {
  forwarding.value = true
  try {
    const response = await userApi.forwardUserEvent(event.id, forwardText.value.trim(), userStore.userId)
    const code = Number(response?.data?.code || 200)
    if (code !== 200) throw new Error(response?.data?.message || '转发失败')
    forwardingEventId.value = ''
    forwardText.value = ''
    forwardFeedback.value = '已经转发到你的动态'
    forwardFeedbackId.value = event.id
    forwardFeedbackError.value = false
  } catch (error) {
    forwardFeedback.value = error?.message || '转发失败，请稍后重试'
    forwardFeedbackId.value = event.id
    forwardFeedbackError.value = true
  } finally {
    forwarding.value = false
  }
}

async function openResource(resource) {
  if (resource.kind === 'song') {
    await playSongWithQueue(resource.raw, [resource.raw], 0)
    return
  }
  if (resource.kind === 'playlist' && resource.id) openDetail('playlist', resource.id)
  if (resource.kind === 'album' && resource.id) openDetail('album', resource.id)
  if (['mv', 'program', 'radio', 'video'].includes(resource.kind)) router.push({name: 'discover', query: {tab: 'airwaves'}})
}

async function openTopic(topic) {
  activeTopic.value = topic
  topicDialogOpen.value = true
  topicLoading.value = true
  topicEvents.value = []
  topicDetailText.value = ''
  const requestId = ++topicRequestId
  try {
    const [detailResult, eventsResult] = await Promise.allSettled([
      userApi.getTopicDetail(topic.id),
      userApi.getTopicDetailHotEvents(topic.id),
    ])
    if (requestId !== topicRequestId) return
    if (detailResult.status === 'fulfilled') {
      const detail = detailResult.value?.data?.data || detailResult.value?.data?.act || detailResult.value?.data || {}
      topicDetailText.value = detail?.text || detail?.summary || detail?.desc || ''
    }
    if (eventsResult.status === 'fulfilled') {
      const payload = eventsResult.value?.data || {}
      const raw = payload?.events || payload?.event || payload?.hotEvents || []
      topicEvents.value = (Array.isArray(raw) ? raw : []).map(normalizeEvent)
    }
  } finally {
    if (requestId === topicRequestId) topicLoading.value = false
  }
}

function closeTopic() {
  topicRequestId += 1
  topicDialogOpen.value = false
}

function initial(value) {
  return String(value || 'A').trim().slice(0, 1).toUpperCase()
}

function compactCount(value) {
  const count = Number(value || 0)
  if (count >= 10000) return `${(count / 10000).toFixed(count >= 100000 ? 0 : 1)}万`
  return count.toLocaleString()
}

function relativeTime(value) {
  const time = Number(value || 0)
  if (!time) return '刚刚'
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000))
  if (seconds < 60) return '刚刚'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} 天前`
  const date = new Date(time)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function loadPage() {
  if (!userStore.isLoggedIn) return
  void Promise.all([loadFollows(), loadTopics()]).then(() => loadEvents({reset: true}))
}

watch(() => userStore.isLoggedIn, (loggedIn) => {
  if (loggedIn) loadPage()
})

onMounted(() => {
  loadPage()
  window.addEventListener('keydown', handleOverlayEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleOverlayEscape)
  if (commentsDrawerOpen.value) document.body.style.overflow = previousBodyOverflow
})
</script>

<style scoped>
.moments-page { min-height: 100vh; color: #29292d; background: radial-gradient(circle at 12% 8%, rgba(232, 239, 234, .92), transparent 25%), radial-gradient(circle at 88% 18%, rgba(250, 223, 226, .7), transparent 24%), #f7f7f8; }
.moments-page :deep(.aurora-header), .moments-main { transition: filter 420ms cubic-bezier(.22, 1, .36, 1), opacity 380ms ease; }
.moments-page.is-comments-open :deep(.aurora-header), .moments-page.is-comments-open .moments-main { filter: blur(9px); opacity: .72; }
button, input, textarea { font: inherit; }
button { cursor: pointer; }
.moments-main { box-sizing: border-box; width: min(100%, 1376px); margin: 0 auto; padding: 62px 28px 155px; }
.moments-heading { animation: moments-section-in 620ms 40ms cubic-bezier(.22, 1, .36, 1) backwards; }
.share-studio { animation: moments-section-in 660ms 120ms cubic-bezier(.22, 1, .36, 1) backwards; }
.moments-layout { animation: moments-section-in 700ms 200ms cubic-bezier(.22, 1, .36, 1) backwards; }
.following-panel { animation: moments-section-in 620ms 290ms cubic-bezier(.22, 1, .36, 1) backwards; }
.topics-panel { animation: moments-section-in 620ms 360ms cubic-bezier(.22, 1, .36, 1) backwards; }
@keyframes moments-section-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
.moments-heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 34px; }
.moments-heading p { margin: 0 0 8px; color: #e85265; font-size: 10px; font-weight: 850; letter-spacing: .16em; }
.moments-heading h1 { margin: 0; font-size: clamp(44px, 5vw, 72px); letter-spacing: -.075em; line-height: .94; }
.moments-heading > span { max-width: 350px; color: #85858d; font-size: 13px; line-height: 1.7; }
.share-studio { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 16px; padding: 22px 24px; border: 1px solid rgba(24, 24, 27, .06); border-radius: 28px; background: rgba(255, 255, 255, .86); box-shadow: 0 20px 55px rgba(38, 35, 34, .07); }
.share-avatar { display: grid; width: 48px; height: 48px; overflow: hidden; place-items: center; color: #fff; border-radius: 50%; background: linear-gradient(145deg, #ef8f9b, #d95465); font-weight: 850; }
.share-avatar img { width: 100%; height: 100%; object-fit: cover; }
.share-studio form { min-width: 0; }
.share-studio textarea { box-sizing: border-box; width: 100%; resize: none; padding: 8px 2px; border: 0; outline: 0; background: transparent; color: #29292c; font-size: 15px; line-height: 1.7; }
.share-studio > form > footer { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-top: 14px; border-top: 1px solid #ededee; }
.share-studio footer > div { display: flex; align-items: center; gap: 14px; }
.share-studio footer button:not(.share-submit) { display: flex; align-items: center; gap: 7px; padding: 7px 10px; color: #74747b; border: 0; border-radius: 10px; background: transparent; font-size: 10px; font-weight: 740; }
.share-studio footer button.is-active { color: #df5567; background: #fbedef; }
.share-studio footer svg { width: 17px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
.share-studio footer span, .share-studio footer small { color: #aaaab0; font-size: 9px; }
.share-studio footer small.is-error { color: #d84d60; }
.share-submit { padding: 10px 18px; color: #fff; border: 0; border-radius: 999px; background: #2c2c2f; font-size: 11px; font-weight: 770; }
button:disabled { cursor: default; opacity: .45; }
.selected-song { position: relative; display: grid; grid-template-columns: 54px minmax(0, 1fr) 28px; gap: 12px; align-items: center; margin: 8px 0 14px; padding: 10px; border-radius: 16px; background: #f2f2f3; }
.selected-song img { width: 54px; height: 54px; border-radius: 11px; background: #e4e4e7; object-fit: cover; }
.selected-song div { min-width: 0; }
.selected-song small, .selected-song strong, .selected-song span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.selected-song small { color: #e05365; font-size: 8px; font-weight: 800; letter-spacing: .1em; }
.selected-song strong { margin-top: 4px; font-size: 12px; }
.selected-song span { margin-top: 3px; color: #8c8c93; font-size: 10px; }
.selected-song > button { color: #8c8c93; border: 0; background: transparent; font-size: 22px; }
.song-finder { margin: 8px 0 14px; padding: 13px; border: 1px solid #e8e8ea; border-radius: 18px; background: #fafafa; }
.song-finder-input { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 8px; align-items: center; }
.song-finder-input svg { width: 17px; fill: none; stroke: #8f8f96; stroke-width: 1.8; }
.song-finder-input input { min-width: 0; padding: 8px 3px; border: 0; outline: 0; background: transparent; font-size: 11px; }
.song-finder-input button { padding: 7px 12px; color: #fff; border: 0; border-radius: 999px; background: #333336; font-size: 9px; }
.song-results { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; margin-top: 10px; }
.song-results button { display: grid; min-width: 0; grid-template-columns: 38px minmax(0, 1fr) auto; gap: 9px; align-items: center; padding: 7px; text-align: left; border: 0; border-radius: 11px; background: #fff; }
.song-results button:hover { background: #f1f1f3; }
.song-results img { width: 38px; height: 38px; border-radius: 8px; background: #e4e4e7; object-fit: cover; }
.song-results span { min-width: 0; }
.song-results strong, .song-results small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.song-results strong { font-size: 10px; }
.song-results small { margin-top: 3px; color: #96969c; font-size: 8px; }
.song-results i { color: #e45768; font-size: 9px; font-style: normal; }
.song-finder > p { margin: 12px 0 2px; color: #a1a1aa; font-size: 10px; text-align: center; }
.moments-layout { display: grid; grid-template-columns: minmax(0, 1fr) 350px; gap: 28px; margin-top: 28px; }
.feed-column, .following-panel, .topics-panel { border: 1px solid rgba(24, 24, 27, .06); border-radius: 28px; background: rgba(255, 255, 255, .82); box-shadow: 0 20px 60px rgba(38, 35, 34, .055); }
.feed-column { min-width: 0; padding: 8px 26px 28px; }
.feed-toolbar { display: flex; min-height: 66px; align-items: center; justify-content: space-between; gap: 18px; border-bottom: 1px solid #ebebed; }
.feed-toolbar > div { display: flex; gap: 18px; }
.feed-toolbar button { padding: 8px 0; color: #8b8b92; border: 0; background: transparent; font-size: 11px; font-weight: 740; }
.feed-toolbar button.is-active { color: #29292c; }
.feed-toolbar > div button { position: relative; }
.feed-toolbar > div button.is-active::after { position: absolute; right: 0; bottom: -16px; left: 0; height: 2px; border-radius: 2px; background: #e85869; content: ''; }
.feed-toolbar > span { margin-left: auto; padding: 7px 10px; color: #65656c; border-radius: 999px; background: #f2f2f3; font-size: 9px; }
.feed-toolbar > span button { margin-left: 6px; padding: 0; }
.event-card { padding: 26px 4px; border-bottom: 1px solid #ececee; }
.moment-event-enter-active { transition: opacity 520ms ease, transform 620ms cubic-bezier(.22, 1, .36, 1); transition-delay: var(--event-delay); }
.moment-event-enter-from { opacity: 0; transform: translateY(22px) scale(.992); }
.moment-event-move { transition: transform 420ms cubic-bezier(.22, 1, .36, 1); }
.moment-event-leave-active { position: absolute; transition: opacity 180ms ease, transform 220ms ease; }
.moment-event-leave-to { opacity: 0; transform: translateY(-8px); }
.event-feed-skeleton { display: grid; }
.event-feed-skeleton > article { padding: 27px 4px; border-bottom: 1px solid #ececee; opacity: 0; animation: feed-skeleton-enter 440ms ease forwards; animation-delay: var(--feed-skeleton-delay); }
.event-feed-skeleton header { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 12px; align-items: center; }
.event-feed-skeleton header > span { width: 44px; height: 44px; border-radius: 50%; background: #e3e3e5; }
.event-feed-skeleton header > div { display: grid; gap: 7px; }
.event-feed-skeleton i, .event-feed-skeleton b { display: block; border-radius: 6px; background: linear-gradient(100deg, #e6e6e8 18%, #f4f4f5 42%, #e6e6e8 68%); background-size: 220% 100%; animation: feed-skeleton-shimmer 1.45s linear infinite; }
.event-feed-skeleton header i { width: 32%; height: 8px; }
.event-feed-skeleton header i + i { width: 21%; height: 6px; }
.event-feed-skeleton > article > b { width: calc(100% - 56px); height: 11px; margin: 22px 0 0 56px; }
.event-feed-skeleton > article > b + b { width: 68%; height: 76px; margin-top: 10px; }
.event-feed-skeleton footer { display: flex; gap: 18px; margin: 18px 0 0 56px; }
.event-feed-skeleton footer i { width: 48px; height: 7px; }
@keyframes feed-skeleton-enter { to { opacity: 1; } }
@keyframes feed-skeleton-shimmer { to { background-position: -220% 0; } }
.event-card > header { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 12px; align-items: center; }
.event-avatar { display: grid; width: 44px; height: 44px; overflow: hidden; place-items: center; color: #fff; border-radius: 50%; background: linear-gradient(145deg, #abc4b1, #6f987a); font-size: 12px; font-weight: 850; }
.event-avatar img { width: 100%; height: 100%; object-fit: cover; }
.event-card > header strong, .event-card > header span { display: block; }
.event-card > header strong { font-size: 12px; }
.event-card > header span { margin-top: 4px; color: #99999f; font-size: 9px; }
.event-card > header > i { padding: 5px 8px; color: #e05567; border-radius: 999px; background: #fbeaec; font-size: 8px; font-style: normal; font-weight: 800; }
.event-text { margin: 17px 0 14px 56px; color: #46464c; font-size: 13px; line-height: 1.75; white-space: pre-wrap; }
.event-resource { display: grid; width: calc(100% - 56px); grid-template-columns: 64px minmax(0, 1fr) auto; gap: 13px; align-items: center; margin-left: 56px; padding: 10px; text-align: left; border: 0; border-radius: 17px; background: #f1f1f2; transition: 160ms ease; }
.event-resource:hover { background: #ebebed; transform: translateY(-1px); }
.event-resource > img, .resource-note { display: grid; width: 64px; height: 64px; place-items: center; border-radius: 12px; background: #dedee1; object-fit: cover; }
.resource-note { color: #6f6f76; font-size: 24px; }
.event-resource > span { min-width: 0; }
.event-resource small, .event-resource strong, .event-resource i { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-resource small { color: #e25365; font-size: 8px; font-weight: 800; letter-spacing: .12em; }
.event-resource strong { margin-top: 5px; color: #2d2d31; font-size: 12px; }
.event-resource i { margin-top: 4px; color: #8e8e95; font-size: 9px; font-style: normal; }
.event-resource b { display: grid; width: 36px; height: 36px; place-items: center; color: #fff; border-radius: 50%; background: #303033; }
.event-resource b svg { width: 18px; fill: currentColor; }
.event-resource em { padding-right: 8px; color: #8b8b92; font-size: 9px; font-style: normal; }
.event-pictures { display: grid; width: calc(100% - 56px); gap: 6px; margin: 10px 0 0 56px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.event-pictures.has-1 { grid-template-columns: minmax(0, 380px); }
.event-pictures.has-2 { grid-template-columns: repeat(2, minmax(0, 260px)); }
.event-pictures img { width: 100%; aspect-ratio: 1.25; border-radius: 13px; object-fit: cover; }
.event-actions { display: flex; gap: 24px; margin: 16px 0 0 56px; }
.event-actions button { display: flex; align-items: center; gap: 6px; padding: 3px 0; color: #97979e; border: 0; background: transparent; font-size: 9px; transition: color 160ms ease, transform 160ms ease; }
.event-actions button.is-active { color: #df5264; }
.event-actions svg { width: 15px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.6; }
.event-actions .event-like.is-liked { color: #e54f63; }
.event-actions .event-like.is-liked svg { fill: currentColor; animation: heart-pop 420ms cubic-bezier(.2, 1.5, .5, 1); }
.event-actions .event-like.is-pending { transform: scale(.94); }
@keyframes heart-pop { 0% { transform: scale(.7); } 48% { transform: scale(1.34); } 100% { transform: scale(1); } }
.forward-composer { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; margin: 14px 0 0 56px; padding: 8px; border-radius: 13px; background: #f3f3f4; }
.forward-composer input { min-width: 0; padding: 5px 7px; border: 0; outline: 0; background: transparent; font-size: 10px; }
.forward-composer button { padding: 7px 12px; color: #fff; border: 0; border-radius: 999px; background: #343437; font-size: 9px; }
.forward-feedback { margin: 9px 0 0 56px; color: #6f9678; font-size: 9px; }
.forward-feedback.is-error { color: #d94f61; }
.feed-more { display: block; margin: 24px auto 0; padding: 10px 18px; color: #67676e; border: 1px solid #e2e2e5; border-radius: 999px; background: #fff; font-size: 10px; font-weight: 740; }
.moments-state, .feed-empty { padding: 100px 20px; color: #929299; text-align: center; font-size: 11px; }
.moments-state.is-error { color: #d94f61; }
.moments-state button { margin-left: 6px; color: inherit; border: 0; border-bottom: 1px solid currentColor; background: transparent; }
.feed-empty span { color: #df6574; font-size: 32px; }
.feed-empty h3 { margin: 11px 0 6px; color: #343438; font-size: 18px; }
.feed-empty p { margin: 0; }
.moments-sidebar { display: grid; align-content: start; gap: 20px; }
.following-panel, .topics-panel { padding: 24px; }
.following-panel > header, .topics-panel > header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.following-panel header small, .topics-panel header small { color: #e35567; font-size: 8px; font-weight: 850; letter-spacing: .14em; }
.following-panel h2, .topics-panel h2 { margin: 5px 0 0; font-size: 19px; letter-spacing: -.04em; }
.following-panel header > span, .topics-panel header > span { color: #9b9ba2; font-size: 9px; }
.following-list { display: grid; gap: 4px; }
.following-list button { display: grid; width: 100%; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 7px; text-align: left; border: 0; border-radius: 12px; background: transparent; }
.following-list button:hover, .following-list button.is-active { background: #f2f2f3; }
.following-list img, .following-list button > span { display: grid; width: 36px; height: 36px; place-items: center; color: #fff; border-radius: 50%; background: #9db6a3; object-fit: cover; font-size: 10px; font-weight: 800; }
.following-list strong { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.following-list i { color: #9b9ba2; font-size: 8px; font-style: normal; }
.topic-list { display: grid; }
.topic-list button { display: grid; width: 100%; grid-template-columns: 26px minmax(0, 1fr) auto; gap: 7px; align-items: center; padding: 12px 2px; text-align: left; border: 0; border-top: 1px solid #ededee; background: transparent; }
.topic-list button:first-child { border-top: 0; }
.topic-list > button > span { color: #c2c2c7; font-size: 9px; font-weight: 800; }
.topic-list strong, .topic-list small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.topic-list strong { font-size: 10px; }
.topic-list small { margin-top: 4px; color: #a0a0a7; font-size: 8px; }
.topic-list i { color: #d85a69; font-size: 11px; font-style: normal; }
.sidebar-state { padding: 35px 4px; color: #9c9ca3; text-align: center; font-size: 10px; }
.moments-auth { display: flex; min-height: 550px; flex-direction: column; align-items: center; justify-content: center; border: 1px solid rgba(24, 24, 27, .06); border-radius: 36px; background: rgba(255, 255, 255, .82); box-shadow: 0 26px 70px rgba(38, 35, 34, .07); text-align: center; }
.moments-auth-orbit { display: grid; width: 80px; height: 80px; place-items: center; border: 1px solid #efcdd2; border-radius: 50%; box-shadow: 0 0 0 13px rgba(239, 205, 210, .2), 0 0 0 26px rgba(239, 205, 210, .09); color: #dd596a; font-size: 30px; }
.moments-auth > p { margin: 35px 0 7px; color: #e35567; font-size: 9px; font-weight: 850; letter-spacing: .16em; }
.moments-auth h2 { margin: 0; font-size: 28px; }
.moments-auth > span { margin-top: 10px; color: #8f8f96; font-size: 12px; }
.moments-auth > button { margin-top: 24px; padding: 12px 22px; color: #fff; border: 0; border-radius: 999px; background: #2d2d30; font-size: 12px; font-weight: 760; }
.comments-layer { position: fixed; inset: 0; z-index: 1600; display: flex; justify-content: flex-end; }
.comments-backdrop { position: absolute; inset: 0; border: 0; background: rgba(32, 29, 30, .28); backdrop-filter: blur(11px) saturate(.9); }
.comments-drawer { position: relative; box-sizing: border-box; display: grid; width: min(620px, 100%); height: 100%; grid-template-rows: auto auto minmax(0, 1fr) auto; overflow: hidden; border-left: 1px solid rgba(255, 255, 255, .75); background: #f9f9fa; box-shadow: -30px 0 90px rgba(27, 24, 25, .18); }
.comments-drawer-accent { position: absolute; top: -110px; right: -100px; width: 330px; height: 330px; border-radius: 50%; background: radial-gradient(circle, rgba(240, 112, 129, .14), rgba(240, 112, 129, 0) 68%); pointer-events: none; }
.comments-drawer-heading { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 38px 40px 26px; }
.comments-drawer-heading p { margin: 0 0 7px; color: #e85467; font-size: 8px; font-weight: 850; letter-spacing: .16em; }
.comments-drawer-heading h2 { margin: 0; font-size: 32px; letter-spacing: -.055em; }
.comments-drawer-heading div > span { display: block; margin-top: 7px; color: #96969d; font-size: 10px; }
.comments-drawer-heading > button { display: grid; width: 38px; height: 38px; place-items: center; color: #68686f; border: 0; border-radius: 50%; background: #ededee; transition: 160ms ease; }
.comments-drawer-heading > button:hover { color: #fff; background: #303033; transform: rotate(5deg); }
.comments-drawer-heading svg { width: 18px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.7; }
.comments-event-preview { display: grid; grid-template-columns: 38px minmax(0, 1fr); gap: 11px; margin: 0 40px; padding: 15px; border: 1px solid #e8e8ea; border-radius: 17px; background: rgba(255, 255, 255, .76); }
.comments-event-preview > div { display: grid; width: 38px; height: 38px; overflow: hidden; place-items: center; color: #fff; border-radius: 50%; background: #859e8b; font-size: 10px; font-weight: 800; }
.comments-event-preview img { width: 100%; height: 100%; object-fit: cover; }
.comments-event-preview p { min-width: 0; margin: 0; }
.comments-event-preview strong, .comments-event-preview p > span { display: block; }
.comments-event-preview strong { font-size: 10px; }
.comments-event-preview p > span { display: -webkit-box; overflow: hidden; margin-top: 5px; color: #6d6d74; font-size: 10px; line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.comments-scroll { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 22px 40px 44px; }
.comments-list { display: grid; }
.comments-list > article { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 12px; padding: 20px 2px; border-top: 1px solid #e8e8ea; }
.comments-list > article:first-child { border-top: 0; }
.comment-avatar { display: grid; width: 40px; height: 40px; overflow: hidden; place-items: center; color: #fff; border-radius: 50%; background: linear-gradient(145deg, #b1c7b7, #799481); font-size: 10px; font-weight: 800; }
.comment-avatar img { width: 100%; height: 100%; object-fit: cover; }
.comment-copy { min-width: 0; }
.comment-copy > header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.comment-copy > header strong { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.comment-copy > header time { flex: none; color: #aaaab0; font-size: 8px; }
.comment-copy > p { margin: 7px 0 0; color: #47474d; font-size: 11px; line-height: 1.75; white-space: pre-wrap; }
.comment-copy blockquote { margin: 9px 0 0; padding: 9px 11px; color: #77777e; border-left: 2px solid #e6a4ad; border-radius: 0 9px 9px 0; background: #f0f0f2; font-size: 9px; line-height: 1.55; }
.comment-copy blockquote strong { margin-right: 5px; color: #de5a6a; }
.comment-copy footer { display: flex; align-items: center; gap: 14px; margin-top: 9px; color: #a0a0a7; font-size: 8px; }
.comment-copy footer span { display: flex; align-items: center; gap: 5px; }
.comment-copy footer svg { width: 13px; fill: none; stroke: currentColor; stroke-width: 1.5; }
.comment-copy footer button { padding: 2px 0; color: #8b8b92; border: 0; background: transparent; font-size: 8px; font-weight: 740; }
.comment-copy footer button:hover { color: #df5668; }
.comments-composer { position: relative; padding: 14px 28px 20px; border-top: 1px solid rgba(220, 220, 224, .9); background: rgba(249, 249, 250, .92); box-shadow: 0 -14px 38px rgba(36, 32, 33, .055); backdrop-filter: blur(18px); }
.comments-composer textarea { box-sizing: border-box; width: 100%; resize: none; padding: 12px 14px; color: #36363a; border: 1px solid #e0e0e3; border-radius: 15px; outline: 0; background: #fff; font-size: 11px; line-height: 1.6; transition: border-color 170ms ease, box-shadow 170ms ease; }
.comments-composer textarea:focus { border-color: rgba(229, 79, 99, .38); box-shadow: 0 0 0 4px rgba(229, 79, 99, .065); }
.comments-composer > footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 8px; }
.comments-composer > footer span { color: #a0a0a7; font-size: 8px; }
.comments-composer > footer span.is-error { color: #d95062; }
.comments-composer > footer button { padding: 8px 17px; color: #fff; border: 0; border-radius: 999px; background: #303033; font-size: 9px; font-weight: 760; }
.reply-target { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; padding: 7px 10px; color: #77777e; border-radius: 10px; background: #efeff1; font-size: 8px; }
.reply-target strong { color: #dd5868; }
.reply-target button { padding: 0 3px; color: #8d8d94; border: 0; background: transparent; font-size: 15px; }
.reply-target-enter-active, .reply-target-leave-active { overflow: hidden; transition: opacity 180ms ease, transform 220ms ease, max-height 240ms ease, margin 220ms ease, padding 220ms ease; }
.reply-target-enter-from, .reply-target-leave-to { max-height: 0; margin: 0; padding-top: 0; padding-bottom: 0; opacity: 0; transform: translateY(5px); }
.comments-more { display: block; margin: 22px auto 0; padding: 10px 17px; color: #68686f; border: 1px solid #dfdfe2; border-radius: 999px; background: #fff; font-size: 9px; font-weight: 740; }
.comments-load-error { margin: 18px 0 0; color: #d95163; font-size: 9px; text-align: center; }
.comments-state { display: flex; min-height: 360px; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.comments-state > span { color: #e86b7b; font-size: 27px; }
.comments-state h3 { margin: 10px 0 6px; font-size: 17px; }
.comments-state p { max-width: 330px; margin: 0; color: #96969d; font-size: 10px; line-height: 1.6; }
.comments-state button { margin-top: 17px; padding: 9px 15px; color: #fff; border: 0; border-radius: 999px; background: #333336; font-size: 9px; }
.comments-state.is-error > span, .comments-state.is-error h3 { color: #d95163; }
.comments-skeleton { display: grid; }
.comments-skeleton article { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 12px; padding: 20px 2px; border-top: 1px solid #ececee; opacity: 0; animation: skeleton-enter 420ms ease forwards; animation-delay: var(--skeleton-delay); }
.comments-skeleton article > span { width: 40px; height: 40px; border-radius: 50%; background: #e5e5e7; }
.comments-skeleton article > div { display: grid; align-content: center; gap: 7px; }
.comments-skeleton i { display: block; height: 8px; border-radius: 5px; background: linear-gradient(100deg, #e9e9eb 20%, #f4f4f5 42%, #e9e9eb 65%); background-size: 220% 100%; animation: skeleton-shimmer 1.4s linear infinite; }
.comments-skeleton i:nth-child(1) { width: 28%; }
.comments-skeleton i:nth-child(2) { width: 92%; }
.comments-skeleton i:nth-child(3) { width: 61%; }
@keyframes skeleton-enter { to { opacity: 1; } }
@keyframes skeleton-shimmer { to { background-position: -220% 0; } }
.comment-item-enter-active { transition: opacity 400ms ease, transform 460ms cubic-bezier(.22, 1, .36, 1); transition-delay: var(--comment-delay); }
.comment-item-enter-from { opacity: 0; transform: translateX(18px) translateY(5px); }
.comment-item-leave-active { transition: opacity 140ms ease; }
.comment-item-leave-to { opacity: 0; }
.comments-layer-enter-active, .comments-layer-leave-active { transition: opacity 250ms ease; }
.comments-layer-enter-active .comments-drawer, .comments-layer-leave-active .comments-drawer { transition: transform 520ms cubic-bezier(.22, 1, .36, 1), opacity 260ms ease; }
.comments-layer-enter-from, .comments-layer-leave-to { opacity: 0; }
.comments-layer-enter-from .comments-drawer, .comments-layer-leave-to .comments-drawer { opacity: .6; transform: translateX(100%); }
.topic-dialog { position: fixed; inset: 0; z-index: 1500; display: grid; place-items: center; padding: 22px; overflow-y: auto; overscroll-behavior: contain; }
.topic-backdrop { position: absolute; inset: 0; border: 0; background: rgba(24, 24, 27, .28); backdrop-filter: blur(12px); }
.topic-sheet { position: relative; box-sizing: border-box; width: min(680px, 100%); max-height: min(720px, calc(100dvh - 44px)); overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; padding: 38px; border-radius: 32px; background: #fbfbfb; box-shadow: 0 32px 100px rgba(24, 24, 27, .22); }
.topic-close { position: absolute; top: 18px; right: 18px; width: 34px; height: 34px; color: #74747b; border: 0; border-radius: 50%; background: #ededee; font-size: 20px; }
.topic-sheet > p { margin: 0 0 7px; color: #e35466; font-size: 9px; font-weight: 850; letter-spacing: .15em; }
.topic-sheet > h2 { margin: 0; padding-right: 38px; font-size: 30px; letter-spacing: -.045em; }
.topic-sheet > span { display: block; margin-top: 12px; color: #77777f; font-size: 12px; line-height: 1.7; }
.topic-event-list { display: grid; gap: 2px; margin-top: 26px; }
.topic-event-list article { display: grid; grid-template-columns: 38px minmax(0, 1fr); gap: 11px; padding: 15px 0; border-top: 1px solid #e7e7e9; }
.topic-event-list img, .topic-event-list article > i { display: grid; width: 38px; height: 38px; place-items: center; color: #fff; border-radius: 50%; background: #9eb6a4; object-fit: cover; font-size: 10px; font-style: normal; }
.topic-event-list strong { font-size: 10px; }
.topic-event-list p { margin: 5px 0; color: #56565d; font-size: 11px; line-height: 1.6; }
.topic-event-list small { color: #a0a0a7; font-size: 8px; }
.topic-loading { padding: 70px 0; color: #9a9aa1; text-align: center; font-size: 11px; }
.topic-dialog-enter-active, .topic-dialog-leave-active { transition: opacity 180ms ease; }
.topic-dialog-enter-active .topic-sheet, .topic-dialog-leave-active .topic-sheet { transition: transform 230ms ease, opacity 180ms ease; }
.topic-dialog-enter-from, .topic-dialog-leave-to { opacity: 0; }
.topic-dialog-enter-from .topic-sheet { opacity: 0; transform: translateY(14px) scale(.98); }
.attachment-enter-active, .attachment-leave-active { overflow: hidden; transition: opacity 180ms ease, transform 200ms ease, max-height 240ms ease; }
.attachment-enter-from, .attachment-leave-to { max-height: 0; opacity: 0; transform: translateY(-5px); }
@media (max-width: 980px) {
  .moments-layout { grid-template-columns: 1fr; }
  .moments-sidebar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .moments-main { padding: 38px 16px 140px; }
  .moments-heading { display: block; }
  .moments-heading > span { display: block; margin-top: 14px; }
  .share-studio { grid-template-columns: 1fr; padding: 18px; }
  .share-avatar { width: 40px; height: 40px; }
  .song-results { grid-template-columns: 1fr; }
  .moments-sidebar { grid-template-columns: 1fr; }
  .feed-column { padding: 6px 17px 24px; }
  .event-text { margin-left: 0; }
  .event-resource, .event-pictures { width: 100%; margin-left: 0; }
  .event-actions, .forward-composer { margin-left: 0; }
  .forward-feedback { margin-left: 0; }
  .comments-layer { align-items: flex-end; }
  .comments-drawer { width: 100%; height: min(88vh, 820px); border-top: 1px solid rgba(255, 255, 255, .8); border-left: 0; border-radius: 28px 28px 0 0; box-shadow: 0 -24px 70px rgba(27, 24, 25, .2); }
  .comments-drawer-heading { padding: 26px 22px 20px; }
  .comments-event-preview { margin: 0 22px; }
  .comments-scroll { padding: 18px 22px 36px; }
  .comments-composer { padding: 12px 18px max(16px, env(safe-area-inset-bottom)); }
  .comments-layer-enter-from .comments-drawer, .comments-layer-leave-to .comments-drawer { transform: translateY(100%); }
}
@media (max-width: 520px) {
  .moments-heading h1 { font-size: 46px; }
  .share-studio > form > footer { align-items: stretch; flex-direction: column; }
  .share-studio footer > div:last-child { justify-content: space-between; }
  .feed-toolbar { flex-wrap: wrap; padding: 12px 0; }
  .feed-toolbar > div button.is-active::after { bottom: -8px; }
  .event-resource { grid-template-columns: 54px minmax(0, 1fr) auto; }
  .event-resource > img, .resource-note { width: 54px; height: 54px; }
  .topic-sheet { padding: 30px 22px; }
}
@media (prefers-reduced-motion: reduce) {
  .comments-layer-enter-active,
  .comments-layer-leave-active,
  .comments-layer-enter-active .comments-drawer,
  .comments-layer-leave-active .comments-drawer,
  .comment-item-enter-active,
  .comments-skeleton article,
  .comments-skeleton i,
  .event-actions .event-like.is-liked svg,
  .moments-heading,
  .share-studio,
  .moments-layout,
  .following-panel,
  .topics-panel,
  .event-feed-skeleton > article,
  .event-feed-skeleton i,
  .event-feed-skeleton b { animation-duration: 1ms; transition-duration: 1ms; transition-delay: 0ms; }
}
</style>
