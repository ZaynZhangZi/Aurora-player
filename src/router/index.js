import { createRouter, createWebHistory } from 'vue-router'
import { visitApi } from '@/api/visitApi/visitApi.js'
import SystemStatus from '@/view/systemStatus.vue'

const routeScrollPositionMap = new Map()
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

function getWindowScrollPosition() {
  return {
    left: window.scrollX || window.pageXOffset || 0,
    top: window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0,
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition

    const cachedPosition = routeScrollPositionMap.get(to.fullPath)
    if (cachedPosition) {
      routeScrollPositionMap.delete(to.fullPath)
      return cachedPosition
    }

    if (to.meta?.keepAlive) return false

    return { left: 0, top: 0 }
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
      path: '/profile',
      name: 'profile',
      component: () => import('@/view/profile/profile.vue'),
      meta: {
        keepAlive: true,
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

router.beforeEach((to, from, next) => {
  if (from.fullPath) {
    routeScrollPositionMap.set(from.fullPath, getWindowScrollPosition())
  }
  next()
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
