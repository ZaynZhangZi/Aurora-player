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
          path:'/home/artistDetial',
          name:'artisthero',
          component: () => import('@/view/artistDetial/artistDetial.vue'),
        },
      ]
    },


  ],
})

export default router
