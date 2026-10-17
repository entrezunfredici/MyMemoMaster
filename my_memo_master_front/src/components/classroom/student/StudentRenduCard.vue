<template>
  <div
    :class="['rounded-xl border-2 px-4 py-4', isUrgent(rendu.dueDate) ? 'border-secondary/50 bg-secondary/5' : 'border-gray']">
    <div class="flex items-start justify-between gap-2">
      <div>
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary uppercase">Rendu</span>
          <p class="text-sm font-semibold text-dark">{{ rendu.title }}</p>
        </div>
        <p v-if="rendu.description" class="mt-1 text-xs text-dark/60">{{ rendu.description }}</p>
        <p v-if="rendu.dueDate" :class="['text-xs mt-0.5', isUrgent(rendu.dueDate) ? 'text-secondary font-semibold' : 'text-dark/60']">
          Date limite : {{ formatDate(rendu.dueDate) }}
        </p>
      </div>

      <!-- Statut soumission -->
      <div class="shrink-0 text-right">
        <div v-if="mySubmission">
          <p class="text-xs text-success font-semibold">✓ Soumis</p>
          <p class="text-xs text-dark/60">{{ mySubmission.originalName }}</p>
          <div class="flex gap-2 mt-1 justify-end">
            <button @click="openFile(mySubmission.fileKey)" class="text-xs text-primary underline">Voir</button>
            <button @click="downloadFile(mySubmission.fileKey)" class="text-xs text-primary underline">Télécharger</button>
            <button @click="retireRendu" class="text-xs text-secondary underline">Retirer</button>
          </div>
        </div>
        <span v-else class="text-xs text-dark/40">Non soumis</span>
      </div>
    </div>

    <!-- Zone upload si pas encore soumis -->
    <div v-if="!mySubmission" class="mt-3">
      <div
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'rounded-xl border-2 border-dashed px-4 py-4 text-center transition',
          dragOver ? 'border-secondary bg-secondary/5' : 'border-gray hover:border-secondary/50'
        ]">
        <div v-if="pendingFile">
          <p class="text-sm font-semibold text-dark">{{ pendingFile.name }}</p>
          <p class="text-xs text-dark/60 mt-0.5">{{ formatFileSize(pendingFile.size) }}</p>
          <button @click.stop="pendingFile = null" class="mt-1 text-xs text-secondary hover:underline">Retirer</button>
        </div>
        <!-- RGAA 7.1 : la zone ne répond au glisser-déposer qu'à la souris ; l'action « choisir un fichier »
             est portée par un vrai bouton, atteignable et activable au clavier. -->
        <button v-else type="button" class="w-full cursor-pointer" @click="fileInput?.click()">
          <span class="block text-sm text-dark/60">Glissez votre rendu ici ou <span class="text-secondary underline">parcourez</span></span>
          <span class="block text-xs text-dark/40 mt-1">PDF, Word, Image — max 10 Mo</span>
        </button>
      </div>
      <input aria-label="Choisir un fichier à rendre" ref="fileInput" type="file"
        accept=".pdf,.doc,.docx,image/*"
        class="hidden"
        @change="onFileChange" />

      <button v-if="pendingFile"
        @click="submitRendu"
        :disabled="submissionStore.uploading"
        :class="[submissionStore.uploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-secondary/90', 'mt-2 w-full rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-light transition']">
        {{ submissionStore.uploading ? 'Envoi en cours...' : 'Remettre le rendu' }}
      </button>
    </div>
  </div>
</template>

<script setup>
// Un rendu à remettre : statut de la soumission, dépôt d'un fichier (glisser-déposer ou bouton), remise, retrait.
// Extrait de pages/ClassroomEtudiantView.vue ; le fichier en attente est relié à la page parente par v-model.
import { computed, ref } from 'vue'
import { useClassGroupSubmissionStore } from '@/stores/classGroupSubmissions'
import { useStoredFile } from '@/composables/useStoredFile'
import { formatDate, formatFileSize, isUrgent } from '@/helpers/classroomFormat'

const props = defineProps({
  rendu: { type: Object, required: true },
  groupId: { type: Number, required: true },
})

const submissionStore = useClassGroupSubmissionStore()
const { openFile, downloadFile } = useStoredFile()

// Soumission déjà remise par l'étudiant pour ce rendu (undefined sinon)
const mySubmission = computed(() => submissionStore.mySubmissions[props.rendu.id])

// Fichier choisi mais pas encore remis : état détenu par StudentRendus (v-model:pending-file) pour survivre à un
// filtrage par la recherche, qui démonte la carte. Survol du glisser-déposer : état local.
const pendingFile = defineModel('pendingFile', { default: null })
const dragOver = ref(false)
const fileInput = ref(null)

function onDrop(event) {
  dragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) pendingFile.value = file
}

function onFileChange(event) {
  const file = event.target?.files?.[0]
  if (file) pendingFile.value = file
}

async function submitRendu() {
  const file = pendingFile.value
  if (!file) return
  const ok = await submissionStore.uploadAndSubmit(props.groupId, props.rendu.id, file)
  if (ok) pendingFile.value = null
}

async function retireRendu() {
  const sub = mySubmission.value
  if (!sub) return
  await submissionStore.deleteSubmission(props.groupId, props.rendu.id, sub.id)
}
</script>
