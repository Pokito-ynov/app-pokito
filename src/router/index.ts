import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/debug',
      name: 'debug',
      component: () => import('../views/DebugClient.vue'),
    },
  ],
})

export default router
