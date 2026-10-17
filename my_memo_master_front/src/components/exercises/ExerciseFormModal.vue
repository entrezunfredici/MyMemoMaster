<template>
  <!-- Modal création / édition exercice -->
  <div v-if="showModal" class="modal-overlay" @mousedown.self="close" v-dialog="close" role="dialog" aria-modal="true" aria-labelledby="exercise-modal-title">
    <div class="modal-panel modal-panel--lg">
      <h2 id="exercise-modal-title" class="modal-title">{{ isEditMode ? 'Modifier l\'exercice' : 'Nouvel exercice' }}</h2>

      <form @submit.prevent="submit">
        <!-- Nom -->
        <div class="form-group">
          <label class="form-label">Titre de l'exercice</label>
          <input aria-label="Nom de l'exercice" v-model="form.name" type="text" placeholder="Ex : Équations du second degré" class="form-input" required />
        </div>

        <!-- Sujet -->
        <div class="form-group--lg">
          <label class="form-label">Sujet</label>
          <SubjectSelectorComponent v-model="form.subjectId" required />
        </div>

        <!-- Tags -->
        <div class="form-group--lg">
          <label class="form-label">Tags <span class="text-gray-500 font-normal">(optionnel)</span></label>
          <TagSelectorComponent v-model="form.tagIds" />
        </div>

        <!-- Questions -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-4">
            <label class="form-label">Questions</label>
            <div class="flex gap-2">
              <button type="button" @click="openAiFlow" class="bg-primary hover:bg-primary/90 text-on-primary font-bold py-1 px-3 rounded text-sm transition">
                ✨ Générer par IA
              </button>
              <button type="button" @click="addQuestion" class="bg-green-700 hover:bg-green-800 text-white font-bold py-1 px-3 rounded text-sm transition border-2 border-green-800">
                + Ajouter une question
              </button>
            </div>
          </div>

          <div class="space-y-6">
            <ExerciseQuestionEditor
              v-for="(q, idx) in form.questions"
              :key="q._key"
              :question="q"
              :index="idx"
              :removable="form.questions.length > 1"
              @remove="removeQuestion(idx)"
            />
          </div>
        </div>

        <!-- Partage groupes classes (visible uniquement si l'utilisateur est teacher dans au moins un groupe) -->
        <div
          v-if="canAssignToGroups && editingTestUserId === authStore.user?.userId"
          class="mb-6 border border-blue-200 rounded-lg p-4 bg-blue-50"
        >
          <p class="text-sm font-semibold text-blue-800 mb-1">Partager dans des groupes classes</p>
          <p class="text-xs text-blue-600 mb-3">Les scores des étudiants de ces groupes seront comptabilisés dans vos KPI pédagogiques.</p>
          <div class="space-y-2">
            <label
              v-for="group in assignableGroups"
              :key="group.id"
              class="flex items-center gap-3 p-2 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 bg-white"
            >
              <input type="checkbox" :value="group.id" v-model="form.groupIds" class="accent-primary w-4 h-4" />
              <span class="text-sm font-medium text-heading">{{ group.name }}</span>
              <span v-if="group.level" class="text-xs text-gray-500">{{ group.level }}</span>
            </label>
          </div>
          <p class="text-xs text-gray-500 mt-2">Aucune sélection = l'exercice reste privé.</p>
        </div>

        <p v-if="formError" class="text-red-600 text-sm mb-4">{{ formError }}</p>

        <div class="btn-row">
          <button type="submit" :disabled="submitting" class="btn-modal-submit">
            {{ submitting ? 'Enregistrement...' : (isEditMode ? 'Enregistrer les modifications' : 'Créer l\'exercice') }}
          </button>
          <button type="button" @click="close" class="btn-modal-cancel">Annuler</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Génération de questions par IA (C-02.06/C-02.07) — Vue 1 (configuration) → Vue 2
       (attente/erreur) → Écran de révision (accept/edit/reject par question, C-02.07). Montées via
       v-if pour toute la durée du flux : l'état saisi en Vue 1 survit à un aller-retour par
       [Réessayer] (voir AiGenerateExercisesModalComponent.vue). Empilées au-dessus de la modal
       "Nouvel exercice"/"Modifier l'exercice", qui reste montée (generation_ia_exercices_ui.md §5.1). -->
  <template v-if="showAiFlow">
    <AiGenerateExercisesModal
      :visible="aiStep === 'config'"
      :default-subject-context="formSubjectName"
      @close="closeAiFlow"
      @submit="handleAiGenerate"
    />
    <AiGenerationProgressModal
      :visible="aiStep === 'progress'"
      :status="aiExerciseGenerationStore.status === 'error' ? 'error' : 'generating'"
      :error-message="aiExerciseGenerationStore.errorMessage"
      @cancel="closeAiFlow"
      @close="closeAiFlow"
      @retry="aiStep = 'config'"
    />
    <AiExerciseReviewModal
      :visible="aiStep === 'review'"
      :questions="aiExerciseGenerationStore.questions"
      :warnings="aiExerciseGenerationStore.warnings"
      @close="closeAiFlow"
      @confirm="handleReviewConfirm"
    />
  </template>
</template>

<script setup>
// Fenêtre de création / modification d'un exercice, avec le flux de génération de questions par IA.
// Se pilote depuis la page avec `openCreate()` / `openEdit(test)` (via une référence de composant) ;
// la logique est dans useExerciseForm et useExerciseAiFlow. Extrait de pages/ExercisesPage.vue.
import { dialogDirective as vDialog } from '@/directives/dialog'
import SubjectSelectorComponent from '@/components/SubjectSelectorComponent.vue'
import TagSelectorComponent from '@/components/TagSelectorComponent.vue'
import AiGenerateExercisesModal from '@/components/AiGenerateExercisesModalComponent.vue'
import AiGenerationProgressModal from '@/components/AiGenerationProgressModalComponent.vue'
import AiExerciseReviewModal from '@/components/AiExerciseReviewModalComponent.vue'
import ExerciseQuestionEditor from '@/components/exercises/ExerciseQuestionEditor.vue'
import { useAuthStore } from '@/stores/auth'
import { useAiExerciseGenerationStore } from '@/stores/aiExerciseGeneration'
import { useAssignableGroups } from '@/composables/useAssignableGroups'
import { useExerciseForm } from '@/composables/useExerciseForm'
import { useExerciseAiFlow } from '@/composables/useExerciseAiFlow'

const authStore = useAuthStore()
const aiExerciseGenerationStore = useAiExerciseGenerationStore()
const { assignableGroups, canAssignToGroups } = useAssignableGroups()

const {
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
} = useExerciseForm()

const { showAiFlow, aiStep, formSubjectName, openAiFlow, closeAiFlow, handleAiGenerate, handleReviewConfirm } =
  useExerciseAiFlow({ form })

defineExpose({ openCreate, openEdit })
</script>
