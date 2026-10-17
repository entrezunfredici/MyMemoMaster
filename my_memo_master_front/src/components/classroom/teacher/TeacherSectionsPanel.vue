<template>
  <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h2 class="text-lg font-semibold text-dark">Sections & Rendus</h2>
    <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
    <div v-else-if="sectionStore.sections.length === 0" class="text-sm text-dark/60">Aucune section créée.</div>
    <div v-else class="space-y-2">
      <div v-for="s in sectionStore.sections" :key="s.id"
        class="rounded-xl border border-gray overflow-hidden">
        <!-- En-tête de la section -->
        <div
          :role="s.type === 'rendu' ? 'button' : undefined"
          :tabindex="s.type === 'rendu' ? 0 : undefined"
          :class="['px-4 py-3 flex items-center justify-between', s.type === 'rendu' ? 'cursor-pointer hover:bg-light/60 transition' : '']"
          @click="s.type === 'rendu' && toggleRenduSection(s.id)"
          @keydown.enter.prevent="s.type === 'rendu' && toggleRenduSection(s.id)"
          @keydown.space.prevent="s.type === 'rendu' && toggleRenduSection(s.id)">
          <div>
            <div class="flex items-center gap-2">
              <span :class="s.type === 'rendu' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'"
                class="rounded-full px-2 py-0.5 text-xs font-semibold uppercase">
                {{ s.type === 'rendu' ? 'Rendu' : 'Section' }}
              </span>
              <p class="text-sm font-semibold text-dark">{{ s.title }}</p>
            </div>
            <p class="text-xs text-dark/60 mt-0.5">{{ s.description }}</p>
            <p v-if="s.dueDate" class="text-xs text-dark/60">Date cible : {{ formatDate(s.dueDate) }}</p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span v-if="s.type === 'rendu'" class="text-xs text-primary select-none">
              {{ expandedRenduSections[s.id] ? '▲' : '▼ Voir rendus' }}
            </span>
            <button @click.stop="confirmDeleteSection(s)" class="text-xs text-secondary hover:underline">Supprimer</button>
          </div>
        </div>
        <!-- Rendus étudiants (uniquement pour type=rendu) -->
        <div v-if="s.type === 'rendu' && expandedRenduSections[s.id]"
          class="border-t border-gray bg-light/30 px-4 py-3 space-y-3">
          <p v-if="!submissionStore.submissionStatus[s.id]" class="text-xs text-dark/60 italic">Chargement des rendus...</p>
          <template v-else>
            <!-- Compteurs -->
            <div class="flex gap-3">
              <span class="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                {{ submissionStore.submissionStatus[s.id].submitted.length }} rendu(s)
              </span>
              <span class="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
                {{ submissionStore.submissionStatus[s.id].notSubmitted.length }} en attente
              </span>
            </div>

            <!-- Rendus reçus -->
            <div v-if="submissionStore.submissionStatus[s.id].submitted.length" class="space-y-1">
              <p class="text-xs font-semibold text-success uppercase tracking-wide">Rendus reçus</p>
              <div v-for="sub in submissionStore.submissionStatus[s.id].submitted" :key="sub.submissionId"
                class="flex items-center justify-between rounded-lg border border-success/20 bg-white px-3 py-2">
                <div>
                  <p class="text-sm font-semibold text-dark">{{ sub.name }}</p>
                  <p class="text-xs text-dark/60">{{ sub.originalName }} · {{ formatFileSize(sub.fileSize) }} · {{ formatDate(sub.submittedAt) }}</p>
                </div>
                <button v-if="sub.fileKey" @click.stop="downloadFile(sub.fileKey, { newTab: true })"
                  class="text-xs text-primary underline shrink-0 ml-3">
                  Télécharger
                </button>
              </div>
            </div>

            <!-- Étudiants sans rendu -->
            <div v-if="submissionStore.submissionStatus[s.id].notSubmitted.length" class="space-y-1">
              <p class="text-xs font-semibold text-secondary uppercase tracking-wide">Pas encore rendu</p>
              <div v-for="stu in submissionStore.submissionStatus[s.id].notSubmitted" :key="stu.studentId"
                class="rounded-lg border border-secondary/20 bg-white px-3 py-2">
                <p class="text-sm text-dark/80">{{ stu.name }}</p>
                <p class="text-xs text-dark/50">{{ stu.email }}</p>
              </div>
            </div>

            <p v-if="!submissionStore.submissionStatus[s.id].submitted.length && !submissionStore.submissionStatus[s.id].notSubmitted.length"
              class="text-xs text-dark/60 italic">Aucun étudiant dans ce groupe.</p>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
// Sections du groupe et rendus d'étudiants (dépliables pour les sections de type « rendu »).
// Extrait de pages/ClassroomEnseignantView.vue.
import { reactive, watch } from 'vue'
import { useClassGroupSectionStore } from '@/stores/classGroupSections'
import { useClassGroupSubmissionStore } from '@/stores/classGroupSubmissions'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { useStoredFile } from '@/composables/useStoredFile'
import { formatDate, formatFileSize } from '@/helpers/classroomFormat'

const props = defineProps({
  groupId: { type: Number, required: true },
  loading: { type: Boolean, default: false },
  // Incrémenté à chaque (re)sélection de groupe : referme les rendus dépliés
  refreshToken: { type: Number, default: 0 },
})

const sectionStore = useClassGroupSectionStore()
const submissionStore = useClassGroupSubmissionStore()
const askConfirm = useConfirmAction()
const { downloadFile } = useStoredFile()

const expandedRenduSections = reactive({})

watch(
  () => [props.groupId, props.refreshToken],
  () => Object.keys(expandedRenduSections).forEach((k) => delete expandedRenduSections[k]),
)

function confirmDeleteSection(s) {
  askConfirm(
    s.type === 'rendu' ? 'Supprimer le rendu' : 'Supprimer la section',
    `Supprimer « ${s.title} » ? Cette action est irréversible${s.type === 'rendu' ? ' et supprime aussi les soumissions déjà reçues' : ''}.`,
    () => sectionStore.delete(props.groupId, s.id),
  )
}

async function toggleRenduSection(sectionId) {
  if (expandedRenduSections[sectionId]) {
    expandedRenduSections[sectionId] = false
    return
  }
  expandedRenduSections[sectionId] = true
  await submissionStore.fetchStatus(props.groupId, sectionId)
}
</script>
