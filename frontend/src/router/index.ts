import { createRouter, createWebHistory } from 'vue-router';
import DisplayView from '@/views/DisplayView.vue';
import AdminView from '@/views/AdminView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/display'
    },
    {
      path: '/display',
      name: 'display',
      component: DisplayView
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView
    }
  ]
});

export default router;