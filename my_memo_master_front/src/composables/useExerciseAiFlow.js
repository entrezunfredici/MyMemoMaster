// Génération de questions par IA dans le formulaire d'exercice (C-02.06 / C-02.07).
// Vue 1 (configuration) → Vue 2 (attente / erreur) → Écran de révision (accepter / modifier / rejeter
// chaque question) → `form.questions`. Même orchestration que FlashcardsCardsPage (C-01.08), à une
// différence près : l'écran de révision est empilé en modale, il ne remplace pas la page.
// Les questions générées ne rejoignent `form.questions` qu'après confirmation explicite depuis l'écran de
// révision (périmètre OUT : « correction officielle sans relecture »).

import { computed, ref } from 'vue'
import { exercisesApi } from '@/helpers/exercisesApi'
import { notif } from '@/helpers/notif'
import { buildQuestionContent } from '@/helpers/exerciseQuestionForm'
import { defaultQuestion, isBlankUntouchedQuestion } from '@/helpers/exerciseQuestionEdit'
import { useSubjectStore } from '@/stores/subjects'
import { useAiExerciseGenerationStore } from '@/stores/aiExerciseGeneration'

/**
 * @param {{ form: { subjectId: *, questions: object[] } }} deps - le formulaire d'exercice (useExerciseForm)
 */
export function useExerciseAiFlow({ form }) {
  const subjectStore = useSubjectStore()
  const aiExerciseGenerationStore = useAiExerciseGenerationStore()

  const showAiFlow = ref(false)
  const aiStep = ref('config') // 'config' | 'progress' | 'review'

  // Nom du sujet déjà choisi dans le formulaire, pour pré-remplir le champ « Matière » de la génération :
  // un simple indice textuel pour l'IA, pas une clé étrangère.
  const formSubjectName = computed(
    () => subjectStore.subjects.find((s) => s.subjectId === form.subjectId)?.name || '',
  )

  function openAiFlow() {
    aiStep.value = 'config'
    showAiFlow.value = true
  }

  function closeAiFlow() {
    showAiFlow.value = false
    aiExerciseGenerationStore.reset()
  }

  async function handleAiGenerate(config) {
    aiStep.value = 'progress'
    const success = await aiExerciseGenerationStore.generate(config)
    if (success) {
      // Ne ferme PAS le flux ni ne réinitialise le store : l'écran de révision a besoin de
      // aiExerciseGenerationStore.questions / warnings pour s'afficher.
      aiStep.value = 'review'
    }
    // Échec : le statut du store passe à 'error', la fenêtre d'attente affiche l'erreur (et l'éventuelle
    // suggestion de création manuelle, mode dégradé C-02.05) ; [Réessayer] repasse à 'config' sans perdre
    // la saisie.
  }

  /**
   * Reçoit les questions acceptées (éventuellement éditées) par l'écran de révision, déjà dans la
   * représentation `form.questions`.
   *
   * Les revalide d'abord (`POST /ai-exercise-generations/validate-import`, C-02.09) : une édition en
   * révision peut casser le format d'une question (ex. QCM dont on retire la seule option correcte) sans
   * qu'aucun contrôle serveur ne l'arrête avant la persistance. Échec partiel toléré : une question
   * rejetée n'empêche pas l'ajout des autres, mais n'est jamais ajoutée silencieusement — l'utilisateur en
   * est notifié (pas de correction automatique).
   *
   * Retire ensuite la question vide par défaut si elle est intacte (voir `isBlankUntouchedQuestion`) —
   * sauf si rien n'est importable, pour ne pas vider le formulaire — puis ajoute les questions et referme
   * tout le flux.
   */
  async function handleReviewConfirm(acceptedQuestions) {
    let toAdd = acceptedQuestions

    if (acceptedQuestions.length) {
      const questions = acceptedQuestions.map((q) => ({
        statement: q.statement,
        type: q.type,
        content: buildQuestionContent(q),
      }))
      const resp = await exercisesApi.validateImport(questions)
      const rejected = resp?.status === 200 ? resp.data.rejected : []
      if (rejected.length) {
        const rejectedIndexes = new Set(rejected.map((r) => r.index))
        toAdd = acceptedQuestions.filter((_, i) => !rejectedIndexes.has(i))
        notif.notify(
          `${rejected.length} question(s) écartée(s) au format après relecture (à recréer manuellement) : ` +
            rejected.map((r) => r.errors.join(' ')).join(' '),
          'error',
        )
      }
    }

    if (toAdd.length) {
      form.questions = form.questions.filter((q) => !isBlankUntouchedQuestion(q))
    }
    for (const q of toAdd) {
      form.questions.push({ ...defaultQuestion(), ...q })
    }
    closeAiFlow()
  }

  return { showAiFlow, aiStep, formSubjectName, openAiFlow, closeAiFlow, handleAiGenerate, handleReviewConfirm }
}
