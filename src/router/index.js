import { createRouter, createWebHistory } from 'vue-router'
import { visitApi } from '@/api/visitApi/visitApi.js'
import SystemStatus from '@/view/systemStatus.vue'

let navigatingBackMarkedAt = 0

export function markNavigatingBack() {
  navigatingBackMarkedAt = Date.now()
}

export function consumeNavigatingBack(maxAgeMs = 800) {
  const markedAt = navigatingBackMarkedAt
  navigatingBackMarkedAt = 0
  if (!markedAt) return false
  return Date.now() - markedAt <= maxAgeMs
}

/**
 * 旧「查询参数式」详情地址 -> 新「路径参数式」详情地址。
 * 兼容：/playlistDetail?id=、/albumDetail?id=、/artistDetial?id=（拼写错误保留兼容）、
 *      /discover/playlist|album|artist?id=、/home/playlistDetail?id=、/home/profile/playlistDetail?id=
 */
function legacyDetailRedirect(type, fallbackName = 'home') {
  return (to) => {
    const id = String(to.query?.id ?? '').trim()
    if (!id) return { name: fallbackName }
    const query = { ...to.query }
    delete query.id
    // 去掉仅用于旧弹窗状态保留的字段，避免污染新详情 URL
    delete query.tab
    return {
      name: type,
      params: { id },
      query: Object.keys(query).length ? query : undefined,
    }
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    // 详情悬浮层的开/关不应改变底层页面的窗口滚动位置；
    // 背景页保持挂载，滚动位置天然保留。
    if (to.meta?.detail || from.meta?.detail) return false
    if (savedPosition) return savedPosition
    if (to.path === from.path) return false
    return { left: 0, top: 0, behavior: 'auto' }
  },
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/view/home/home.vue'),
      meta: {
        title: '首页',
        keepAlive: true,
        keepAliveName: 'HomePage',
      },
    },

    // ── 统一实体详情路由（悬浮层 / 整页由 App 背景状态机决定）──
    {
      path: '/playlist/:id',
      name: 'playlist',
      component: () => import('@/view/playlistDetail/playlistDetail.vue'),
      meta: { detail: true, type: 'playlist', title: '歌单' },
    },
    {
      path: '/album/:id',
      name: 'album',
      component: () => import('@/view/albumDetail/albumDetail.vue'),
      meta: { detail: true, type: 'album', title: '专辑' },
    },
    {
      path: '/artist/:id',
      name: 'artist',
      component: () => import('@/view/artistDetail/artistDetail.vue'),
      meta: { detail: true, type: 'artist', title: '歌手' },
    },
    {
      // 仅有歌手名、无 id 的入口（如部分 ArtistLinks / 播放器）：按名称解析
      path: '/artist',
      name: 'artistByName',
      component: () => import('@/view/artistDetail/artistDetail.vue'),
      meta: { detail: true, type: 'artist', title: '歌手' },
    },

    // ── 旧地址兼容 redirect ──
    { path: '/playlistDetail', redirect: legacyDetailRedirect('playlist') },
    { path: '/albumDetail', redirect: legacyDetailRedirect('album') },
    // 修正 artistDetial 拼写：规范地址为 /artist/:id，旧拼写地址保留兼容跳转
    { path: '/artistDetial', redirect: legacyDetailRedirect('artist') },
    { path: '/artistDetail', redirect: legacyDetailRedirect('artist') },
    { path: '/discover/playlist', redirect: legacyDetailRedirect('playlist', 'discover') },
    { path: '/discover/album', redirect: legacyDetailRedirect('album', 'discover') },
    { path: '/discover/artist', redirect: legacyDetailRedirect('artist', 'discover') },
    { path: '/home/playlistDetail', redirect: legacyDetailRedirect('playlist') },
    // 旧「个人中心内嵌歌单详情」：优先打开歌单详情，无 id 时回到个人中心
    { path: '/home/profile/playlistDetail', redirect: legacyDetailRedirect('playlist', 'profile') },

    {
      path: '/discover',
      name: 'discover',
      component: () => import('@/view/discover/discover.vue'),
      meta: {
        title: '发现音乐',
        keepAlive: true,
        keepAliveName: 'DiscoverPage',
      },
    },
    {
      path: '/discover/style/:id',
      name: 'styleDetailPage',
      component: () => import('@/view/styleDetail/styleDetail.vue'),
      meta: { title: '曲风详情' },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/view/search/search.vue'),
      meta: { title: '搜索' },
    },
    {
      path: '/messages',
      name: 'messages',
      component: () => import('@/view/messages/messages.vue'),
      meta: { title: '消息中心' },
    },
    {
      path: '/moments',
      name: 'moments',
      component: () => import('@/view/moments/moments.vue'),
      meta: { title: '音乐动态' },
    },
    {
      path: '/home/profile',
      name: 'profile',
      component: () => import('@/view/profile/profile.vue'),
      meta: {
        title: '个人中心',
        keepAlive: true,
        keepAliveName: 'ProfilePage',
      },
    },
    {
      path: '/profile',
      redirect: '/home/profile',
    },
    {
      path: '/release-notes',
      name: 'releaseNotes',
      component: () => import('@/view/releaseNotes/releaseNotes.vue'),
      meta: { title: '更新日志' },
    },
    {
      path: '/error',
      name: 'routeError',
      component: SystemStatus,
      props: { type: 'error' },
      meta: { title: '页面出错' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'notFound',
      component: SystemStatus,
      props: { type: 'not-found' },
      meta: { title: '页面未找到' },
    },
  ],
})

router.afterEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} - AuroraPlayer` : 'AuroraPlayer'
  visitApi.report(to).catch(() => {})
})

const ROUTE_ERROR_STORAGE_KEY = 'aurora-route-error'

export function showRouteError(error, from = '') {
  try {
    window.sessionStorage.setItem(ROUTE_ERROR_STORAGE_KEY, JSON.stringify({
      message: error instanceof Error ? error.message : String(error || '未知错误'),
      from,
      occurredAt: Date.now(),
    }))
  } catch {
    // Storage may be disabled; the fallback page remains available.
  }

  if (router.currentRoute.value.name === 'routeError') return Promise.resolve()

  return router.replace({
    name: 'routeError',
    query: from ? { from } : {},
  })
}

router.onError((error, to) => {
  if (import.meta.env.DEV) {
    console.error('[router] navigation failed', error)
  }
  void showRouteError(error, to?.fullPath || router.currentRoute.value.fullPath).catch(() => {})
})

export default router
