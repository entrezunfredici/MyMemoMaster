<template>
  <!-- Modal assignation groupes -->
  <div v-if="show" class="modal-overlay" @mousedown.self="close" v-dialog="close" role="dialog" aria-modal="true" aria-labelledby="exercise-assign-modal-title">
    <div class="modal-panel">
      <h2 id="exercise-assign-modal-title" class="modal-title">Assigner aux groupes classes</h2>
      <p class="text-sm text-gray-500 mb-4">
        Sélectionnez les groupes qui auront accès à cet exercice.<br>
        Les scores de ces étudiants apparaîtront dans vos KPI pédagogiques.
      </p>
      <div v-if="assignableGroups.length === 0" class="text-sm text-gray-500 italic mb-4">
        Vous n'avez aucun groupe classe. Créez-en un depuis la page Classe.
      </div>
      <div v-else class="space-y-2 mb-6">
        <label
          v-for="group in assignableGroups"
          :key="group.id"
          class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
        >
          <input type="checkbox" :value="group.id" v-model="selectedGroupIds" class="accent-primary w-4 h-4" />
          <span class="font-medium text-sm text-heading">{{ group.name }}</span>
          <span v-if="group.level" class="text-xs text-gray-500">{{ group.level }}</span>
        </label>
      </div>
      <p class="text-xs text-gray-500 mb-4">Aucune sélection = l'exercice reste privé.</p>
      <div class="btn-row">
        <button type="button" @click="submit" :disabled="submitting" class="btn-modal-submit">
          {{ submitting ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
        <button type="button" @click="close" class="btn-modal-cancel">Annuler</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Fenêtre d'assignation d'un exercice à des groupes classes. Se pilote depuis la page avec `open(test)`
// (via une référence de composant). Extrait de pages/ExercisesPage.vue sans changement de comportement.
import { ref } from 'vue'
import { dialogDirective as vDialog } from '@/directives/dialog'
import { useTestStore } from '@/stores/tests'
import { useAssignableGroups } from '@/composables/useAssignableGroups'

const testStore = useTestStore()
const { assignableGroups } = useAssignableGroups()

const show = ref(false)
const targetTest = ref(null)
const selectedGroupIds = ref([])
const submitting = ref(false)

function open(test) {
  targetTest.value = test
  selectedGroupIds.value = (test.classGroups ?? []).map((g) => g.id)
  show.value = true
}

function close() {
  show.value = false
  targetTest.value = null
  selectedGroupIds.value = []
}

async function submit() {
  if (!targetTest.value) return
  submitting.value = true
  const ok = await testStore.assignGroups(targetTest.value.testId, selectedGroupIds.value)
  submitting.value = false
  if (ok) close()
}

defineExpose({ open })
</script>
