const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
    meta: {
      title: 'Accueil',
      private: false
    }
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
    path: '/exercises/:id',
    name: 'exercise-detail',
    component: () => import('../pages/ExerciseDetailPage.vue'),
    meta: {
      title: 'Exercise Detail',
      private: true,
    },
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('../pages/OnboardingPage.vue'),
    meta: {
      title: 'Onboarding',
      private: true
    }
  },
  {
    path: '/tutorials',
    name: 'tutorials',
    component: () => import('../pages/TutorialsPage.vue'),
    meta: {
      title: 'Tutoriels',
      private: false
    }
  },
  {
    path: '/credits',
    name: 'credits',
    component: () => import('../pages/CreditsPage.vue'),
    meta: {
      title: 'Credits',
      private: false
    }
  },
  {
    path: '/flashcards',
    name: 'flashcards',
    component: () => import('../pages/FlashcardsPage.vue'),
    meta: {
      title: 'Flashcards',
      private: true
    }
  },
  {
    path: '/flashcards/:systemId/cards',
    name: 'flashcards.cards',
    component: () => import('../pages/FlashcardsCardsPage.vue'),
    meta: {
      title: 'Gestion des cartes',
      private: true
    }
  },
  {
    path: '/flashcardssession/:systemId',
    name: 'flashcardssession',
    component: () => import('../pages/FlashcardsSessionPage.vue'),
    meta: {
      title: 'Session de Flashcards',
      private: true
    }
  },
  {
    path: '/mindmaps',
    name: 'mindmaps',
    component: () => import('../pages/MindmapsPage.vue'),
    meta: {
      title: 'Mindmaps',
      private: true
    }
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('../pages/CalendarPage.vue'),
    meta: {
      title: 'Calendar',
      private: true
    }
  },
  {
    path: '/todo',
    name: 'todo',
    component: () => import('../pages/TodoPage.vue'),
    meta: {
      title: 'To-do',
      private: true
    }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../pages/ProfilePage.vue'),
    meta: {
      title: 'Profile',
      private: true
    }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/SettingsPage.vue'),
    meta: {
      title: 'Settings',
      private: true
    }
  },
  {
    path: '/create-test',
    name: 'create.test',
    component: () => import('../pages/CreateTestPage.vue'),
    meta: {
      title: 'Create Test',
      private: true
    }
  },
  {
    path: '/classroom',
    name: 'classroom',
    component: () => import('../pages/ClassroomPage.vue'),
    meta: {
      title: 'Class Group',
      private: true
    }
  },
  {
    path: '/kpi',
    name: 'kpi',
    component: () => import('../pages/KpiPage.vue'),
    meta: {
      title: 'Ma Progression',
      private: true
    }
  },
  {
    path: '/subjects',
    name: 'subjects',
    component: () => import('../pages/SubjectsPage.vue'),
    meta: {
      title: 'Mes contenus par sujet',
      private: true
    }
  },
  // ==================== AUTH & ACCOUNT ====================
  {
    path: '/auth',
    name: 'auth',
    component: () => import('../pages/login/ConnexionPage.vue'),
    meta: {
      title: 'Authentification',
      private: false
    }
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('../pages/ForgotPasswordPage.vue'),
    meta: {
      title: 'Mot de passe oublié',
      private: false
    }
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('../pages/ResetPasswordPage.vue'),
    meta: {
      title: 'Réinitialiser le mot de passe',
      private: false
    }
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('../pages/VerifyEmailPage.vue'),
    meta: {
      title: 'Vérification email',
      private: false
    }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../pages/register/InscriptionPage.vue'),
    meta: {
      title: 'register',
      private: false
    }
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('../pages/AccountPage.vue'),
    meta: {
      title: 'Mon compte',
      private: true
    }
  },
  // ==================== CATCH ====================
  {
    path: '/error-server',
    name: 'error.server',
    component: () => import('../pages/error/ErrorServerPage.vue'),
    meta: {
      title: 'Error'
    }
  },
  {
    path: '/:catchAll(.*)*',
    name: 'error.routing',
    component: () => import('../pages/error/ErrorRoutingPage.vue'),
    meta: {
      title: 'Error'
    }
  }
]

export default routes
