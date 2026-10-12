import { defineStore } from 'pinia'

// CHOIX: état du parcours guidé persisté côté front en sessionStorage (pinia-plugin-persistedstate)
// plutôt qu'en localStorage ou via l'API OnboardingState.
// RAISON: OnboardingState est réservé à l'onboarding utilisateur (autre fonctionnalité) ;
// le parcours est un guide ponctuel (~5 min) : l'état doit survivre à un rechargement de page
// pendant la session, mais pas à la fermeture du site ni à une déconnexion (reset() appelé
// par auth.logout) — un parcours ressuscité des jours plus tard référencerait des entités
// potentiellement supprimées.

/** Nœuds minimum à ajouter autour du nœud central pour valider l'étape « carte mentale ». */
export const MIN_MINDMAP_CHILD_NODES = 2

/** Valeurs initiales des liens (un nouvel objet à chaque appel — jamais partagé entre états). */
const emptyLinks = () => ({
  subjectId: null,
  mindMapId: null,
  mindMapChildNodes: 0,
  leitnerSystemId: null,
  flashcardId: null,
  testId: null,
  revisionSessionId: null
})

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
    hint: `Cliquez sur « + Nouvelle carte », choisissez une matière (ou créez-la), puis ajoutez au moins ${MIN_MINDMAP_CHILD_NODES} nœuds autour du nœud central.`,
    linkKey: 'mindMapId'
  },
  {
    key: 'leitner',
    route: 'flashcards',
    // La page « cartes » du système fait partie de l'étape : on y atterrit juste après la création.
    extraRoutes: ['flashcards.cards'],
    label: 'Créez votre système de Leitner et sa première flashcard',
    hint: 'Cliquez sur « + Nouveau système » (matière et carte mentale pré-sélectionnées), puis ajoutez au moins une carte.',
    linkKey: 'flashcardId'
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
    hint: 'Cliquez sur « + » ou sur un jour du calendrier : votre système de Leitner est pré-sélectionné pour lier la séance.',
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
    // true une fois la dernière étape validée : le bandeau affiche alors le récapitulatif de fin
    completed: false,
    // IDs des éléments créés pendant le parcours — servent à lier les entités entre elles.
    links: emptyLinks()
  }),

  getters: {
    steps: () => GUIDED_TOUR_STEPS,

    currentStep(state) {
      return GUIDED_TOUR_STEPS[state.stepIndex] || null
    },

    isLastStep(state) {
      return state.stepIndex === GUIDED_TOUR_STEPS.length - 1
    },

    /** L'élément attendu à l'étape courante a-t-il été créé (avec un contenu minimal) ? */
    currentStepDone(state) {
      const step = GUIDED_TOUR_STEPS[state.stepIndex]
      if (!step) return false
      // La carte mentale doit contenir un minimum de nœuds, pas seulement exister
      if (step.key === 'mindmap' && state.links.mindMapChildNodes < MIN_MINDMAP_CHILD_NODES) return false
      return state.links[step.linkKey] !== null
    }
  },

  actions: {
    /**
     * Démarre (ou redémarre) le parcours guidé depuis la première étape.
     */
    start() {
      this.active = true
      this.completed = false
      this.stepIndex = 0
      this.links = emptyLinks()
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

    /**
     * Termine le parcours (dernière étape validée).
     * Les liens sont conservés : le récapitulatif de fin s'en sert (ex : lancer la session du système créé).
     */
    finish() {
      this.active = false
      this.completed = true
      this.stepIndex = 0
    },

    /** Ferme le récapitulatif de fin et efface les liens du parcours terminé. */
    dismissCompletion() {
      this.completed = false
      this.links = emptyLinks()
    },

    /** Quitte le parcours sans le terminer. */
    quit() {
      this.active = false
      this.completed = false
      this.stepIndex = 0
    },

    /**
     * Réinitialise complètement le parcours (état + liens).
     * Appelé à la déconnexion : l'état ne doit pas survivre à un changement d'utilisateur.
     */
    reset() {
      this.active = false
      this.completed = false
      this.stepIndex = 0
      this.links = emptyLinks()
    }
  }
})
