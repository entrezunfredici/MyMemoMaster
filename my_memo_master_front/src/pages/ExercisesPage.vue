<template>
  <ItemListLayout
    v-model:search="searchQuery"
    v-model:selectedSubjectId="selectedSubjectId"
    :subjects="subjects"
    :loading="loading"
    :filtered-count="filteredTests.length"
    search-placeholder="Rechercher un exercice..."
    create-label="+ Créer un exercice"
    item-label="exercice"
    empty-message="Aucun exercice trouvé. Créez-en un !"
    @create="formModal.openCreate()"
  >
    <!-- Cartes -->
    <MenuItem
      v-for="test in filteredTests"
      :key="test.testId"
      :title="test.name"
      :description="test.subject?.name || ''"
      action-label="Commencer l'exercice"
      :on-action="() => router.push({ name: 'exercise-detail', params: { id: test.testId } })"
      :on-edit="() => formModal.openEdit(test)"
      :on-delete="() => deleteTest(test)"
    >
      <template #stats>
        <div class="flex flex-wrap items-center gap-2 mt-1">
          <span class="subject-badge">{{ test.subject?.name || 'Sans sujet' }}</span>
          <!-- Statut privé / groupes assignés -->
          <span
            v-if="!test.classGroups?.length"
            class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200"
          >Privé</span>
          <span
            v-for="group in test.classGroups"
            :key="group.id"
            class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200"
          >{{ group.name }}</span>
          <!-- Tags -->
          <span
            v-for="tag in test.tags"
            :key="tag.tagId"
            class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 border border-purple-200"
          >
            {{ tag.name }}
          </span>
        </div>
        <!-- Bouton assigner visible uniquement pour le propriétaire enseignant -->
        <button
          v-if="isEnseignant && test.userId === authStore.user?.userId"
          type="button"
          @click.stop="assignModal.open(test)"
          class="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium underline"
        >Assigner à des groupes</button>
      </template>
    </MenuItem>

    <!-- Modals -->
    <template #modals>
      <ExerciseAssignModal ref="assignModal" />
      <ExerciseFormModal ref="formModal" />
      <ConfirmActionModal :modal="confirmModal" @cancel="closeConfirmModal" @confirm="runConfirmedAction" />
    </template>
  </ItemListLayout>
</template>

<script setup>
import ConfirmActionModal from '@/components/ConfirmActionModal.vue'
import { provideConfirmAction } from '@/composables/useConfirmAction'
// Page « Exercices » : liste filtrable des exercices. La création / modification (avec génération IA)
// est dans ExerciseFormModal, l'assignation aux groupes dans ExerciseAssignModal ; la page ne porte que la
// liste, les filtres et la suppression.
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MenuItem from '@/components/MenuItemComponent.vue'
import ItemListLayout from '@/components/ItemListLayout.vue'
import ExerciseFormModal from '@/components/exercises/ExerciseFormModal.vue'
import ExerciseAssignModal from '@/components/exercises/ExerciseAssignModal.vue'
import { useTestStore } from '@/stores/tests'
import { useSubjectStore } from '@/stores/subjects'
import { useClassGroupStore } from '@/stores/classGroups'
import { useAuthStore } from '@/stores/auth'
import { useGuidedTourStore } from '@/stores/guidedTour'
import { useDiagrammeStore } from '@/stores/diagrammes'
import { useRole } from '@/composables/useRole'

const router = useRouter()
const testStore = useTestStore()
const subjectStore = useSubjectStore()
const classGroupStore = useClassGroupStore()
const authStore = useAuthStore()
const guidedTourStore = useGuidedTourStore()
const diagrammeStore = useDiagrammeStore()
const { isEnseignant } = useRole()

const { confirmModal, askConfirm, closeConfirmModal, runConfirmedAction } = provideConfirmAction()

const formModal = ref(null)
const assignModal = ref(null)

const loading = ref(true)
const searchQuery = ref('')
const selectedSubjectId = ref(null)

const subjects = computed(() => subjectStore.subjects)
const tests = computed(() => testStore.tests)

const filteredTests = computed(() => {
  let list = tests.value
  if (selectedSubjectId.value) {
    list = list.filter((t) => t.subjectId === selectedSubjectId.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((t) => t.name.toLowerCase().includes(q))
  }
  return list
})

onMounted(async () => {
  await Promise.all([
    testStore.fetchTests(),
    subjectStore.fetchSubjects(),
    classGroupStore.fetchGroups(),
    guidedTourStore.active ? diagrammeStore.fetchDiagrammes() : null,
  ])
  loading.value = false
})

function deleteTest(test) {
  askConfirm(
    "Supprimer l'exercice",
    `Supprimer l'exercice « ${test.name} » ? Cette action est irréversible.`,
    () => testStore.deleteTest(test.testId),
  )
}
</script>
