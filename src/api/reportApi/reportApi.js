import requestLocal from '@/axios/myBackend.js'
import { useCounterStore } from '@/stores/userStores.js'

function getUserId() {
  try {
    const storeId = useCounterStore().userId
    if (storeId) return storeId
  } catch {}
  try {
    const legacyId = localStorage.getItem('usermasgId')
    if (legacyId) return legacyId
    const raw = localStorage.getItem('usermasg')
    const profileId = raw ? JSON.parse(raw)?.data?.profile?.userId : null
    return profileId || null
  } catch {
    return null
  }
}

function safeCall(fn, label = 'report') {
  try {
    return fn().catch((error) => {
      if (import.meta.env.DEV || localStorage.getItem('behavior_debug') === '1') {
        console.warn(`[${label}] failed`, error)
      }
    })
  } catch (error) {
    if (import.meta.env.DEV || localStorage.getItem('behavior_debug') === '1') {
      console.warn(`[${label}] failed`, error)
    }
  }
}

export const reportApi = {
  syncNeteaseUser(profile = {}, { force = false } = {}) {
    const neteaseUserId = profile.userId || profile.neteaseUserId || getUserId()
    if (!neteaseUserId) return
    const syncKey = `backend_netease_sync_${neteaseUserId}`
    try {
      const lastSyncedAt = Number(localStorage.getItem(syncKey) || 0)
      if (!force && Date.now() - lastSyncedAt < 6 * 60 * 60 * 1000) return
      localStorage.setItem(syncKey, String(Date.now()))
    } catch {}
    safeCall(() => requestLocal.post('/api/v1/netease-users/sync-login', {
      neteaseUserId: Number(neteaseUserId),
      nickname: profile.nickname || '',
      avatarUrl: profile.avatarUrl || '',
    }), 'syncNeteaseUser')
  },

  /** 上报播放记录 */
  reportPlayRecord({ songId, songName, artist, album, duration, coverUrl, playDuration, playProgress, completed }) {
    const neteaseUserId = getUserId()
    if (!neteaseUserId) return
    safeCall(() => requestLocal.post('/api/v1/user-data/play-record', {
      neteaseUserId: String(neteaseUserId),
      songId: String(songId),
      songName, artist, album,
      duration, coverUrl,
      playDuration, playProgress, completed,
    }), 'reportPlayRecord')
  },

  /** 上报喜欢歌曲 */
  reportLikedSong({ songId, songName, artist, album, duration, coverUrl }) {
    const neteaseUserId = getUserId()
    if (!neteaseUserId) return
    safeCall(() => requestLocal.post('/api/v1/user-data/liked-song', {
      neteaseUserId: String(neteaseUserId),
      songId: String(songId),
      songName, artist, album,
      duration, coverUrl,
    }), 'reportLikedSong')
  },

  /** 上报收藏记录 */
  reportCollection({ collectionType, targetId, targetName, coverUrl }) {
    const neteaseUserId = getUserId()
    if (!neteaseUserId) return
    safeCall(() => requestLocal.post('/api/v1/user-data/collection', {
      neteaseUserId: String(neteaseUserId),
      collectionType, targetId: String(targetId),
      targetName, coverUrl,
    }), 'reportCollection')
  },

  /** 上报搜索记录 */
  reportSearch({ keyword, resultCount }) {
    const neteaseUserId = getUserId()
    if (!neteaseUserId) return
    safeCall(() => requestLocal.post('/api/v1/user-data/search', {
      neteaseUserId: String(neteaseUserId),
      keyword, resultCount,
    }), 'reportSearch')
  },

  /** 上报行为追踪 */
  reportBehavior({ actionType, actionTarget, actionDetail }) {
    const neteaseUserId = getUserId()
    if (!neteaseUserId) return
    safeCall(() => requestLocal.post('/api/v1/user-data/behavior', {
      neteaseUserId: String(neteaseUserId),
      actionType, actionTarget, actionDetail,
    }), 'reportBehavior')
  },
}
