const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
    meta: {
      title: 'Accueil'
    },
  },
  {
    path: '/exercises',
    name: 'exercises',
    component: () => import('../pages/ExercisesPage.vue'),
    meta: {
      title: 'Exercises',
      private: true,
    },
  },
  {
    path: '/tutorials',
    name: 'tutorials',
    component: () => import('../pages/TutorialsPage.vue'),
    meta: {
      title: 'Tutoriels',
      private: true,
    },
  },
  {
    path: '/flashcards',
    name: 'flashcards',
    component: () => import('../pages/FlashcardsPage.vue'),
    meta: {
      title: 'Flashcards',
      private: true,
    },
  },
  {
    path: '/mindmaps',
    name: 'mindmaps',
    component: () => import('../pages/MindmapsPage.vue'),
    meta: {
      title: 'Mindmaps',
      private: true,
    },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../pages/ProfilePage.vue'),
    meta: {
      title: 'Profile',
      private: true,
    },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../pages/register/InscriptionPage.vue'),
    meta: {
      title: 'register',
    },
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('../pages/login/ConnexionPage.vue'),
    meta: {
      title: 'login',
    },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/SettingsPage.vue'),
    meta: {
      title: 'Settings',
      private: true,
    },
  },
    {
    path: '/create-test',
    name: 'create.test',
    component: () => import('../pages/CreateTestPage.vue'),
    meta: {
      title: 'Create Test',
      private: true,
    },
  },
  // ==================== CATCH ====================
  {
    path: '/error-server',
    name: 'error.server',
    component: () => import('../pages/error/ErrorServerPage.vue'),
    meta: {
      title: 'Error',
    },
  },
  {
    path: '/:catchAll(.*)*',
    name: 'error.routing',
    component: () => import('../pages/error/ErrorRoutingPage.vue'),
    meta: {
      title: 'Error',
    },
  }
  
]

export default routes
