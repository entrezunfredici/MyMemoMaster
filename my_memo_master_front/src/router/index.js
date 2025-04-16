import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from '@/stores/auth'
import { VITE_APP_NAME } from '@/config';

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0, behavior: 'smooth' }),
  routes,
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - ${VITE_APP_NAME}` : VITE_APP_NAME;

  // Check if the route is private and validate the token
  const authStore = useAuthStore()
  if (to.meta.private === true) {
    if (!authStore.authenticated || !(authStore.user.connectionToken || authStore.token)) {
      authStore.logout(false)
    }
  } else if (to.name === 'auth') {
    if (authStore.authenticated) {
      next({ path: '/' })
    }
  }

  next();
});

export default router