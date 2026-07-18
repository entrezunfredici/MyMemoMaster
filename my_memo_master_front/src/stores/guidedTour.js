import { defineStore } from 'pinia'

// CHOIX: état du parcours guidé persisté côté front en sessionStorage (pinia-plugin-persistedstate)
// plutôt qu'en localStorage ou via l'API OnboardingState.
// RAISON: OnboardingState est réservé à l'onboarding utilisateur (autre fonctionnalité) ;
// le parcours est un guide ponctuel (~5 min) : l'état doit survivre à un rechargement de page
// pendant la session, mais pas à la fermeture du site ni à une déconnexion (reset() appelé
// par auth.logout) — un parcours ressuscité des jours plus tard référencerait des entités
// potentiellement supprimées.

/**
 * Définition ordonnée des étapes du parcours guidé.
 * Chaque étape référence la route réelle où l'utilisateur réalise l'action,
 * et la clé de `links` qui prouve que l'élément a été créé.
 */
export const GUIDED_TOUR_STEPS = [
  {
    key: 'mindmap',
    route: 'mindmaps',
    label: 'Créez votre carte mentale',
    hint: 'Cliquez sur « + Nouvelle carte », choisissez une matière (ou créez-la), puis construisez votre carte.',
    linkKey: 'mindMapId'
  },
  {
    key: 'leitner',
    route: 'flashcards',
    label: 'Créez le système de Leitner lié',
    hint: 'Cliquez sur « + Nouveau système » — la matière de votre carte mentale est déjà pré-sélectionnée.',
    linkKey: 'leitnerSystemId'
  },
  {
    key: 'exercise',
    route: 'exercises',
    label: 'Créez une série d’exercices',
    hint: 'Cliquez sur « + Créer un exercice » et ajoutez vos questions — la matière est déjà pré-sélectionnée.',
    linkKey: 'testId'
  },
  {
    key: 'planning',
    route: 'calendar',
    label: 'Planifiez vos révisions',
    hint: 'Cliquez sur un jour du calendrier pour planifier une séance — elle sera liée à votre système de Leitner.',
    linkKey: 'revisionSessionId'
  }
]

// Purge l'ancienne persistance localStorage (remplacée par sessionStorage le 2026-07-18)
try {
  localStorage.removeItem('guidedTour')
} catch {
  /* stockage indisponible (SSR, tests) — rien à purger */
}

export const useGuidedTourStore = defineStore('guidedTour', {
  persist: { storage: sessionStorage },

  state: () => ({
    active: false,
    stepIndex: 0,
    // IDs des éléments créés pendant le parcours — servent à lier les entités entre elles.
    links: {
      subjectId: null,
      mindMapId: null,
      leitnerSystemId: null,
      testId: null,
      revisionSessionId: null
    }
  }),

  getters: {
    steps: () => GUIDED_TOUR_STEPS,

    currentStep(state) {
      return GUIDED_TOUR_STEPS[state.stepIndex] || null
    },

    isLastStep(state) {
      return state.stepIndex === GUIDED_TOUR_STEPS.length - 1
    },

    /** L'élément attendu à l'étape courante a-t-il été créé ? */
    currentStepDone(state) {
      const step = GUIDED_TOUR_STEPS[state.stepIndex]
      return step ? state.links[step.linkKey] !== null : false
    }
  },

  actions: {
    /**
     * Démarre (ou redémarre) le parcours guidé depuis la première étape.
     */
    start() {
      this.active = true
      this.stepIndex = 0
      this.links = {
        subjectId: null,
        mindMapId: null,
        leitnerSystemId: null,
        testId: null,
        revisionSessionId: null
      }
    },

    /**
     * Enregistre un élément créé pendant le parcours (liaison entre étapes).
     * No-op si le parcours n'est pas actif — les pages peuvent appeler sans garde.
     *
     * @param {Object} ids - Sous-ensemble de `links` à enregistrer (ex : { mindMapId: 3, subjectId: 1 })
     */
    recordLinks(ids) {
      if (!this.active) return
      for (const [key, value] of Object.entries(ids)) {
        if (key in this.links && value !== undefined && value !== null) {
          this.links[key] = value
        }
      }
    },

    /**
     * Passe à l'étape suivante.
     *
     * @returns {string|null} Nom de la route de la nouvelle étape, ou null si le parcours est terminé
     */
    advance() {
      if (!this.active) return null
      if (this.isLastStep) {
        this.finish()
        return null
      }
      this.stepIndex++
      return this.currentStep.route
    },

    /** Termine le parcours (dernière étape validée). */
    finish() {
      this.active = false
      this.stepIndex = 0
    },

    /** Quitte le parcours sans le terminer. */
    quit() {
      this.active = false
      this.stepIndex = 0
    },

    /**
     * Réinitialise complètement le parcours (état + liens).
     * Appelé à la déconnexion : l'état ne doit pas survivre à un changement d'utilisateur.
     */
    reset() {
      this.active = false
      this.stepIndex = 0
      this.links = {
        subjectId: null,
        mindMapId: null,
        leitnerSystemId: null,
        testId: null,
        revisionSessionId: null
      }
    }
  }
})
