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

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from) {
    const modalRoutes = new Set(['playlistDetail', 'discoverPlaylistDetail', 'discoverAlbumDetail', 'discoverArtistDetail'])
    if (modalRoutes.has(to.name) || modalRoutes.has(from.name)) return false
    if (to.path === from.path) return false
    return { left: 0, top: 0, behavior: 'auto' }
  },
  routes: [
    {
      path:'/',
      redirect:'/home'
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/view/home/home.vue'),
      meta: {
        keepAlive: true,
        keepAliveName: 'HomePage',
      },
      children:[
        {
          path:'playlistDetail',
          name:'playlistDetail',
          component: () => import('@/view/playlistDetail/playlistDetail.vue'),
        },
      ]
    },
    {
      path: '/discover',
      name: 'discover',
      component: () => import('@/view/discover/discover.vue'),
      meta: {
        title: '发现音乐',
        keepAlive: true,
        keepAliveName: 'DiscoverPage',
      },
      children: [
        {
          path: 'playlist',
          name: 'discoverPlaylistDetail',
          component: () => import('@/view/playlistDetail/playlistDetail.vue'),
        },
        {
          path: 'album',
          name: 'discoverAlbumDetail',
          component: () => import('@/view/albumDetail/albumDetail.vue'),
        },
        {
          path: 'artist',
          name: 'discoverArtistDetail',
          component: () => import('@/view/artistDetial/artistDetial.vue'),
        },
      ],
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
      path: '/artistDetial',
      name: 'artistDetailPage',
      component: () => import('@/view/artistDetial/artistDetial.vue'),
    },
    {
      path: '/albumDetail',
      name: 'albumDetailPage',
      component: () => import('@/view/albumDetail/albumDetail.vue'),
    },
    {
      path: '/playlistDetail',
      name: 'playlistDetailPage',
      component: () => import('@/view/playlistDetail/playlistDetail.vue'),
    },
    {
      path: '/home/profile',
      name: 'profile',
      component: () => import('@/view/profile/profile.vue'),
      meta: {
        keepAlive: true,
        keepAliveName: 'ProfilePage',
      },
      children: [
        {
          path: 'playlistDetail',
          name: 'profilePlaylistDetail',
          component: () => import('@/view/playlistDetail/playlistDetail.vue'),
        },
      ],
    },
    {
      path: '/profile',
      redirect: '/home/profile',
    },
    {
      path: '/release-notes',
      name: 'releaseNotes',
      component: () => import('@/view/releaseNotes/releaseNotes.vue'),
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
