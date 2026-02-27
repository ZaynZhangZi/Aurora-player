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
        {
          path:'songDetail',
          name:'songDetail',
          component: () => import('@/view/songDetail/songDetail.vue'),
        },
      ]
    },
    {
      path: '/artistDetial',
      name: 'artistDetailPage',
      component: () => import('@/view/artistDetial/artistDetial.vue'),
    },
    {
      path: '/playlistDetail',
      name: 'playlistDetailPage',
      component: () => import('@/view/playlistDetail/playlistDetail.vue'),
    },
    {
      path: '/songDetail',
      name: 'songDetailPage',
      component: () => import('@/view/songDetail/songDetail.vue'),
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
        {
          path: 'songDetail',
          name: 'profileSongDetail',
          component: () => import('@/view/songDetail/songDetail.vue'),
        },
      ],
    },


  ],
})

export default router
