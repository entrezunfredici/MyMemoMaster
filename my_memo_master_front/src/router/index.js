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

  const authStore = useAuthStore()

  // Guard authentification
  if (to.meta.private === true) {
    if (!authStore.authenticated || !authStore.token) {
      authStore.logout(false, null)
      return next({ path: '/auth' })
    }
  }

  // Guard rôles : meta.roles = [1, 4] signifie "admin plateforme ou admin établissement seulement"
  if (to.meta.roles && to.meta.roles.length > 0) {
    const userRoleId = authStore.user?.roleId ?? null
    if (!to.meta.roles.includes(userRoleId)) {
      return next({ path: '/' })
    }
  }

  if (['register', 'auth'].includes(to.name) && authStore.authenticated) {
    return next({ path: '/profile' })
  }

  next();
});

export default router

