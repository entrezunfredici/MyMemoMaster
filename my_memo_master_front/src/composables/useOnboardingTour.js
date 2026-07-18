import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useOnboardingStore } from '@/stores/onboarding'

// CHOIX: driver.js (MIT) plutôt qu'intro.js.
// RAISON: intro.js est sous AGPL avec licence commerciale payante ; driver.js offre le même
// principe de visite guidée (surbrillance + popover) sous licence MIT, sans restriction d'usage.

/**
 * Définition ordonnée des étapes de la visite de l'interface.
 * `selector: null` = étape flottante (popover centré, non ancré à un élément).
 * Une étape dont le sélecteur ne matche aucun élément du DOM courant est ignorée
 * (ex: le bouton parcours guidé n'existe que sur la HomePage).
 */
export const ONBOARDING_TOUR_STEPS = [
  {
    selector: null,
    title: 'Bienvenue 👋',
    intro:
      "Bienvenue sur MyMemoMaster ! Suivez cette courte visite pour découvrir les principales fonctionnalités de l'application."
  },
  {
    selector: '[data-tour="mindmaps"]',
    title: 'Cartes mentales',
    intro: 'Structurez vos connaissances sous forme de cartes mentales.'
  },
  {
    selector: '[data-tour="flashcards"]',
    title: 'Systèmes de Leitner',
    intro: 'Mémorisez durablement avec des flashcards et la répétition espacée.'
  },
  {
    selector: '[data-tour="exercises"]',
    title: 'Exercices',
    intro: "Créez des séries d'exercices et évaluez vos connaissances."
  },
  {
    selector: '[data-tour="classroom"]',
    title: 'Espace classe',
    intro: 'Rejoignez vos groupes de classe : ressources, échéances et rendus.'
  },
  {
    selector: '[data-tour="calendar"]',
    title: 'Calendrier',
    intro: 'Planifiez vos séances de révision et vos rappels.'
  },
  {
    selector: '[data-tour="todo"]',
    title: 'To-do',
    intro: 'Retrouvez chaque jour les séances de révision à réaliser.'
  },
  {
    selector: '[data-tour="kpi"]',
    title: 'Ma progression',
    intro: 'Suivez vos statistiques de révision, votre régularité et vos badges.'
  },
  {
    selector: '[data-tour="notifications"]',
    title: 'Rappels',
    intro: 'Vos rappels à venir et récents apparaissent ici.'
  },
  {
    selector: '[data-tour="guided-tour"]',
    title: 'Parcours guidé',
    intro:
      'Pour démarrer, lancez le parcours guidé : il vous accompagne pas à pas dans la création de vos premiers contenus.'
  }
]

/**
 * Pilote la visite guidée de l'interface avec driver.js.
 * La fin de la visite (terminée ou quittée) est persistée via le store onboarding.
 *
 * @returns {{ startTour: () => boolean }}
 */
export function useOnboardingTour() {
  const onboardingStore = useOnboardingStore()

  /**
   * Construit les étapes driver.js à partir des éléments réellement présents dans le DOM
   * (le layout desktop et le layout mobile n'affichent pas les mêmes éléments).
   * Une étape sans élément devient un popover flottant centré.
   *
   * @returns {Array<{element?: Element, popover: {title: string, description: string}}>}
   */
  const buildSteps = () =>
    ONBOARDING_TOUR_STEPS.map(({ selector, title, intro }) => ({
      element: selector ? document.querySelector(selector) : undefined,
      popover: { title, description: intro }
    })).filter((step) => step.element !== null)

  /**
   * Démarre la visite de l'interface.
   *
   * @returns {boolean} true si la visite a démarré, false si aucune étape n'est affichable
   */
  const startTour = () => {
    const steps = buildSteps()
    if (steps.length === 0) return false

    const tour = driver({
      steps,
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: 'Suivant',
      prevBtnText: 'Précédent',
      doneBtnText: 'Terminer',
      popoverClass: 'onboarding-popover',
      // CHOIX: persistance dans onDestroyed uniquement.
      // RAISON: driver.js le déclenche aussi bien après « Terminer » qu'après un abandon
      // (croix, overlay, Échap) — un seul point de persistance, et markTourSeen est idempotent.
      onDestroyed: () => {
        onboardingStore.markTourSeen()
      }
    })

    tour.drive()
    return true
  }

  return { startTour }
}
