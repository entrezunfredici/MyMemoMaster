<template>
  <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h3 class="text-base font-semibold text-dark">Partager un document</h3>
    <input aria-label="Titre" v-model="resourceForm.title" type="text" placeholder="Titre *"
      class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
    <select aria-label="Type de ressource" v-model="resourceForm.type" class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm bg-white">
      <option value="cours">Cours</option>
      <option value="carte_mentale">Carte mentale</option>
      <option value="sujet">Sujet / DS</option>
      <option value="autre">Autre</option>
    </select>

    <fieldset v-if="otherGroups.length" class="space-y-1">
      <legend class="text-xs font-semibold text-dark">Partager aussi dans</legend>
      <label v-for="g in otherGroups" :key="g.id" class="flex items-center gap-2 text-sm text-dark">
        <input type="checkbox" :value="g.id" v-model="resourceForm.otherGroupIds" />
        {{ g.name }}
      </label>
    </fieldset>

    <!-- Zone drag & drop. RGAA 7.1 : la zone ne répond au glisser-déposer qu'à la souris ; « choisir un fichier »
         et « Retirer » sont de vrais boutons frères (plus de bouton imbriqué dans un role="button"). -->
    <div
      @dragover.prevent="resourceForm.dragOver = true"
      @dragleave.prevent="resourceForm.dragOver = false"
      @drop.prevent="onFileDrop"
      :class="[
        'rounded-xl border-2 border-dashed px-4 py-6 text-center transition',
        resourceForm.dragOver ? 'border-primary bg-primary/5' : 'border-gray hover:border-primary/50'
      ]">
      <div v-if="resourceForm.file">
        <p class="text-sm font-semibold text-dark">{{ resourceForm.file.name }}</p>
        <p class="text-xs text-dark/70 mt-0.5">{{ formatFileSize(resourceForm.file.size) }}</p>
        <button type="button" :aria-label="`Retirer le fichier ${resourceForm.file.name}`" @click="removeFile" class="mt-1 text-xs text-red-700 hover:underline">Retirer</button>
      </div>
      <button v-else ref="browseButton" type="button" class="w-full cursor-pointer" @click="fileInput?.click()">
        <span class="block text-sm text-dark/70">Glissez un fichier ici ou <span class="text-primary underline">parcourez</span></span>
        <span class="block text-xs text-dark/70 mt-1">PDF, Word, PowerPoint, Excel — max 10 Mo</span>
      </button>
    </div>
    <input aria-label="Choisir un fichier à partager" ref="fileInput" type="file"
      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
      class="hidden"
      @change="onFileChange" />

    <button @click="submitResource" :disabled="resourceStore.uploading"
      :class="[resourceStore.uploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-primary/90', 'w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light transition']">
      {{ resourceStore.uploading ? 'Upload en cours...' : 'Partager' }}
    </button>
    <p v-if="resourceForm.error" class="text-xs text-red-700">{{ resourceForm.error }}</p>
  </div>
</template>

<script setup>
// Formulaire de partage d'un document (glisser-déposer ou sélection). Extrait de pages/ClassroomEnseignantView.vue.
import { computed, nextTick, reactive, ref } from 'vue'
import { useClassGroupResourceStore } from '@/stores/classGroupResources'
import { useAssignableGroups } from '@/composables/useAssignableGroups'
import { formatFileSize } from '@/helpers/classroomFormat'

const props = defineProps({ groupId: { type: Number, required: true } })

const resourceStore = useClassGroupResourceStore()
const fileInput = ref(null)
const browseButton = ref(null)
const { assignableGroups } = useAssignableGroups()
// Autres groupes où l'utilisateur est enseignant : le document peut y être partagé en un seul envoi.
const otherGroups = computed(() => assignableGroups.value.filter((g) => g.id !== props.groupId))
const resourceForm = reactive({ title: '', type: 'cours', file: null, dragOver: false, error: '', otherGroupIds: [] })

async function submitResource() {
  resourceForm.error = ''
  if (!resourceForm.title.trim()) { resourceForm.error = 'Le titre est requis.'; return }
  if (!resourceForm.file) { resourceForm.error = 'Sélectionnez un fichier à partager.'; return }
  const ok = await resourceStore.uploadAndCreate(props.groupId, resourceForm.file, {
    title: resourceForm.title.trim(),
    type: resourceForm.type,
  }, [...resourceForm.otherGroupIds])
  if (ok) Object.assign(resourceForm, { title: '', file: null, dragOver: false, error: '', otherGroupIds: [] })
}

// Retirer le fichier supprime le bouton qui avait le focus : on le rend à « Parcourez » (sinon le focus
// retombe en haut de la page pour un utilisateur du clavier).
function removeFile() {
  resourceForm.file = null
  nextTick(() => browseButton.value?.focus())
}

function onFileDrop(event) {
  resourceForm.dragOver = false
  const file = event.dataTransfer?.files?.[0]
  if (file) resourceForm.file = file
}

function onFileChange(event) {
  const file = event.target?.files?.[0]
  if (file) resourceForm.file = file
}
</script>
