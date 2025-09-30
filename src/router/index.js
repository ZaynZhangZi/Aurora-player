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
    },
    {
      path:'/artistDetail',
      name:'artistDetail',
      component:()=>import('@/view/artistDetail/artistDetail.vue')
    }
  ],
})

export default router
