// Formulaire d'exercice (création / modification) : état, ouverture, enregistrement. Extrait de
// pages/ExercisesPage.vue sans changement de comportement ; la fenêtre qui l'affiche est
// components/exercises/ExerciseFormModal.vue.
//
// CHOIX: appels API directs (helpers/exercisesApi.js) plutôt que testStore.createTest() / les actions du
// store `questions`. BUG TROUVÉ EN CONDITIONS RÉELLES : createTest() ne renvoie qu'un booléen, la vraie
// raison d'un échec (message serveur ou de validation) n'était accessible que par un toast interne au
// store, jamais remontée ici ; le formulaire affichait donc toujours le message générique, quelle que
// soit la cause. Même choix pour la mise à jour du test.

import { reactive, ref } from 'vue'
import { exercisesApi } from '@/helpers/exercisesApi'
import { notif } from '@/helpers/notif'
import { contentToFormState, buildQuestionContent, questionImagePayload } from '@/helpers/exerciseQuestionForm'
import { defaultQuestion, extractErrorMessage, nextQuestionKey } from '@/helpers/exerciseQuestionEdit'
import { useTestStore } from '@/stores/tests'
import { useTagStore } from '@/stores/tags'
import { useAuthStore } from '@/stores/auth'
import { useGuidedTourStore } from '@/stores/guidedTour'
import { useDiagrammeStore } from '@/stores/diagrammes'

export function useExerciseForm() {
  const testStore = useTestStore()
  const tagStore = useTagStore()
  const authStore = useAuthStore()
  const guidedTourStore = useGuidedTourStore()
  const diagrammeStore = useDiagrammeStore()

  const showModal = ref(false)
  const isEditMode = ref(false)
  const editTestId = ref(null)
  const submitting = ref(false)
  const formError = ref('')
  // Identifiants des questions retirées d'un exercice existant, supprimées côté serveur à l'enregistrement
  const questionsToDelete = ref([])
  // Propriétaire de l'exercice édité : seul lui peut le partager dans des groupes
  const editingTestUserId = ref(null)

  const form = reactive({ name: '', subjectId: '', tagIds: [], groupIds: [], questions: [defaultQuestion()] })

  function addQuestion() {
    form.questions.push(defaultQuestion())
  }

  function removeQuestion(idx) {
    const q = form.questions[idx]
    if (q.idQuestion) questionsToDelete.value.push(q.idQuestion)
    form.questions.splice(idx, 1)
  }

  function openCreate() {
    isEditMode.value = false
    editTestId.value = null
    editingTestUserId.value = authStore.user?.userId ?? null
    questionsToDelete.value = []
    // Parcours guidé : pré-sélectionne la matière liée aux étapes précédentes et reprend le nom
    // de la carte mentale pour le titre (comme pour le système de Leitner à l'étape 2)
    form.subjectId = guidedTourStore.active ? guidedTourStore.links.subjectId : null
    const guidedMindMapId = guidedTourStore.active ? guidedTourStore.links.mindMapId : null
    form.name =
      (guidedMindMapId && (diagrammeStore.diagrammes || []).find((mm) => mm.idMindMap === guidedMindMapId)?.mmName) || ''
    form.tagIds = []
    form.groupIds = []
    form.questions = [defaultQuestion()]
    formError.value = ''
    showModal.value = true
  }

  async function openEdit(test) {
    isEditMode.value = true
    editTestId.value = test.testId
    editingTestUserId.value = test.userId ?? null
    questionsToDelete.value = []
    formError.value = ''

    const resp = await exercisesApi.getTest(test.testId)
    if (!resp || resp.status !== 200) {
      notif.notify("Impossible de charger l'exercice.", 'error')
      return
    }

    const fullTest = resp.data
    form.name = fullTest.name
    form.subjectId = fullTest.subjectId
    form.tagIds = (fullTest.tags || []).map((t) => t.tagId)
    form.groupIds = (fullTest.classGroups ?? []).map((g) => g.id)
    form.questions = (fullTest.question ?? []).map((q) => ({
      _key: nextQuestionKey(),
      idQuestion: q.idQuestion,
      statement: q.statement,
      type: q.type,
      ...contentToFormState(q),
    }))

    if (!form.questions.length) form.questions = [defaultQuestion()]
    showModal.value = true
  }

  function close() {
    showModal.value = false
  }

  async function submit() {
    if (isEditMode.value) await submitEdit()
    else await submitCreate()
  }

  async function submitCreate() {
    submitting.value = true
    formError.value = ''
    try {
      const testResp = await exercisesApi.createTest({ name: form.name, subjectId: Number(form.subjectId) })
      if (!testResp || testResp.status !== 201) {
        formError.value = extractErrorMessage(testResp, "Erreur lors de la création de l'exercice.")
        return
      }
      testStore.test = testResp.data
      const testId = testResp.data.testId
      guidedTourStore.recordLinks({ testId })

      for (let i = 0; i < form.questions.length; i++) {
        const q = form.questions[i]
        const resp = await exercisesApi.createQuestion({
          statement: q.statement,
          questionPosition: i,
          type: q.type,
          content: buildQuestionContent(q),
          idTest: testId,
          ...questionImagePayload(q),
        })
        if (!resp || resp.status !== 201) {
          formError.value = extractErrorMessage(resp, `Erreur question ${i + 1}.`)
          return
        }
      }

      await tagStore.setEntityTags('test', testId, form.tagIds)
      if (form.groupIds.length > 0) await testStore.assignGroups(testId, form.groupIds)
      notif.notify('Exercice créé avec succès !', 'success')
      close()
      await testStore.fetchTests()
    } finally {
      submitting.value = false
    }
  }

  async function submitEdit() {
    submitting.value = true
    formError.value = ''
    try {
      const testResp = await exercisesApi.updateTest(editTestId.value, {
        name: form.name,
        subjectId: Number(form.subjectId),
      })
      if (!testResp || testResp.status !== 200) {
        formError.value = extractErrorMessage(testResp, 'Erreur mise à jour exercice.')
        return
      }

      for (const qId of questionsToDelete.value) {
        const resp = await exercisesApi.deleteQuestion(qId)
        if (resp !== undefined) {
          formError.value = "Erreur lors de la suppression d'une question."
          return
        }
      }

      for (let i = 0; i < form.questions.length; i++) {
        const q = form.questions[i]
        const payload = {
          statement: q.statement,
          questionPosition: i,
          type: q.type,
          content: buildQuestionContent(q),
          ...questionImagePayload(q),
        }
        if (q.idQuestion) {
          const resp = await exercisesApi.updateQuestion(q.idQuestion, payload)
          if (!resp || resp.status !== 200) {
            formError.value = extractErrorMessage(resp, `Erreur mise à jour question ${i + 1}.`)
            return
          }
        } else {
          const resp = await exercisesApi.createQuestion({ ...payload, idTest: editTestId.value })
          if (!resp || resp.status !== 201) {
            formError.value = extractErrorMessage(resp, `Erreur création question ${i + 1}.`)
            return
          }
        }
      }

      await tagStore.setEntityTags('test', editTestId.value, form.tagIds)
      await testStore.assignGroups(editTestId.value, form.groupIds)
      notif.notify('Exercice modifié avec succès !', 'success')
      close()
      await testStore.fetchTests()
    } finally {
      submitting.value = false
    }
  }

  return {
    showModal,
    isEditMode,
    submitting,
    formError,
    editingTestUserId,
    form,
    addQuestion,
    removeQuestion,
    openCreate,
    openEdit,
    close,
    submit,
  }
}
