import { createRouter, createWebHistory } from 'vue-router'
import { visitApi } from '@/api/visitApi/visitApi.js'

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
  ],
})

router.beforeEach((to, from, next) => {
  if (from.fullPath) {
    routeScrollPositionMap.set(from.fullPath, getWindowScrollPosition())
  }
  next()
})

router.afterEach((to) => {
  visitApi.report(to).catch(() => {})
})

export default router
