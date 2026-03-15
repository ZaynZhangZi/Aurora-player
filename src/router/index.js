import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path:'/',
      redirect:'/home'
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/view/home/home.vue'),
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

export default router
