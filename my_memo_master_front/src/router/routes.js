const routes = [
  // ==================== HOME ====================
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
    meta: {
      title: 'Home',
      private: true,
      displayInSearch: true,
      tags: ['home', 'welcome', 'index'],
    },
  },
  // ==================== CATCH ====================
  {
    path: '/:catchAll(.*)*',
    name: 'Error',
    component: () => import('../pages/error/ErrorPage.vue'),
    meta: {
      title: 'Error',
      displayInSearch: false,
    },
  },
]

export default routes