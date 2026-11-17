<script setup>
import { dialogDirective as vDialog } from '@/directives/dialog'
import { ref, computed, onMounted } from 'vue'
import { mindmapApi } from '@/helpers/mindmap/mindmapApi'
import { useToast } from 'vue-toastification'
import MenuItem from '@/components/MenuItemComponent.vue'
import ItemListLayout from '@/components/ItemListLayout.vue'
import TagSelectorComponent from '@/components/TagSelectorComponent.vue'
import SubjectSelectorComponent from '@/components/SubjectSelectorComponent.vue'
import ConfirmActionModal from '@/components/ConfirmActionModal.vue'
import { provideConfirmAction } from '@/composables/useConfirmAction'
import { useTagStore } from '@/stores/tags'
import { readMindMapFile } from '@/helpers/mindmap/mindmapJsonImport'

const props = defineProps({
  subjects: { type: Array, default: () => [] },
})
const emit = defineEmits(['open', 'create'])
const toast = useToast()
const { confirmModal, askConfirm, closeConfirmModal, runConfirmedAction } = provideConfirmAction()
const tagStore = useTagStore()

// ── Liste ─────────────────────────────────────────────────────────────────────
const diagrams = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedSubjectId = ref(null)

const subjectName = (id) => props.subjects.find((s) => s.subjectId === id)?.name || ''

const filteredDiagrams = computed(() =>
  diagrams.value.filter((d) => {
    const matchSubject = selectedSubjectId.value ? d.subjectId === selectedSubjectId.value : true
    const matchSearch = d.mmName?.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchSubject && matchSearch
  })
)

// ── Fetch ─────────────────────────────────────────────────────────────────────
const fetchDiagrams = async () => {
  try {
    const response = await mindmapApi.listDiagrams()
    diagrams.value = response?.data || []
  } catch {
    toast.error('Erreur lors du chargement des cartes mentales.')
  } finally {
    loading.value = false
  }
}

// ── Modal créer ────────────────────────────────────────────────────────────────
const showCreateModal = ref(false)
const createName = ref('')
const createSubjectId = ref(null)

const openCreateModal = () => {
  createName.value = ''
  createSubjectId.value = props.subjects[0]?.subjectId || null
  showCreateModal.value = true
}

const confirmCreate = () => {
  showCreateModal.value = false
  emit('create', {
    name: createName.value.trim() || 'Nouvelle carte mentale',
    subjectId: createSubjectId.value || null,
  })
}

// ── Modal renommer ─────────────────────────────────────────────────────────────
const showRenameModal = ref(false)
const editedName = ref('')
const editedSubjectId = ref(null)
const editedTagIds = ref([])
const currentEditId = ref(null)

const openRenameModal = (diagram) => {
  currentEditId.value = diagram.idMindMap
  editedName.value = diagram.mmName
  editedSubjectId.value = diagram.subjectId
  editedTagIds.value = (diagram.tags || []).map((t) => t.tagId)
  showRenameModal.value = true
}

const confirmRename = async () => {
  const diagram = diagrams.value.find((d) => d.idMindMap === currentEditId.value)
  if (!diagram) return
  const newSubjectId = editedSubjectId.value || diagram.subjectId
  try {
    const response = await mindmapApi.updateDiagram(currentEditId.value, {
      mmName: editedName.value,
      mindMapJson: diagram.mindMapJson,
      subjectId: newSubjectId,
    })
    if (response) {
      await tagStore.setEntityTags('mindmap', currentEditId.value, editedTagIds.value)
      toast.success('Carte modifiée.')
      diagram.mmName = editedName.value
      diagram.subjectId = newSubjectId
      diagram.tags = tagStore.tags.filter((t) => editedTagIds.value.includes(t.tagId))
      showRenameModal.value = false
    }
  } catch {
    toast.error('Erreur lors de la modification.')
  }
}

// ── Supprimer ──────────────────────────────────────────────────────────────────
const confirmDelete = (diagram) =>
  askConfirm('Supprimer la carte', `Supprimer la carte « ${diagram.mmName} » ? Cette action est irréversible.`, () => deleteDiagram(diagram))

const deleteDiagram = async (diagram) => {
  try {
    const response = await mindmapApi.deleteDiagram(diagram.idMindMap)
    // CHOIX: `api.del` retourne `undefined` quand le serveur répond 204 (no content) —
    // Diagramme.controller.delete ne renvoie jamais de corps sur succès (voir stores/diagrammes.js).
    // RAISON: sans ce cas, une suppression réussie était traitée comme un échec.
    if (response === undefined || [200, 204].includes(response.status)) {
      toast.success('Carte supprimée.')
      diagrams.value = diagrams.value.filter((d) => d.idMindMap !== diagram.idMindMap)
    } else {
      toast.warning('Suppression impossible.')
    }
  } catch {
    toast.error('Erreur lors de la suppression.')
  }
}

// ── Importer (fichier JSON exporté depuis l'éditeur) ────────────────────────────
const fileInput = ref(null)
const importing = ref(false)

const openImportPicker = () => fileInput.value?.click()

const onImportFile = async (event) => {
  const input = event.target
  const file = input.files?.[0]
  input.value = '' // permet de réimporter le même fichier
  if (!file) return
  importing.value = true
  try {
    const { name, payload } = await readMindMapFile(file)
    const response = await mindmapApi.createDiagram({
      mmName: name,
      mindMapJson: payload,
      subjectId: selectedSubjectId.value || props.subjects[0]?.subjectId || null,
    })
    if (response?.data?.idMindMap) {
      diagrams.value = [...diagrams.value, response.data]
      toast.success(`Carte « ${name} » importée.`)
    } else {
      toast.error("Erreur lors de l'import de la carte.")
    }
  } catch (error) {
    toast.error(error?.message || "Erreur lors de l'import de la carte.")
  } finally {
    importing.value = false
  }
}

// ── Partager (lien public en lecture seule) ─────────────────────────────────────
const showShareModal = ref(false)
const shareDiagram = ref(null)
const shareBusy = ref(false)

const shareUrl = computed(() =>
  shareDiagram.value?.shareToken
    ? `${window.location.origin}/partage/carte/${shareDiagram.value.shareToken}`
    : ''
)

const openShareModal = (diagram) => {
  shareDiagram.value = diagram
  showShareModal.value = true
}

const enableShare = async () => {
  shareBusy.value = true
  try {
    const response = await mindmapApi.enableShare(shareDiagram.value.idMindMap)
    if (response?.data?.shareToken) {
      shareDiagram.value.shareToken = response.data.shareToken
    } else {
      toast.error('Impossible de créer le lien de partage.')
    }
  } catch {
    toast.error('Impossible de créer le lien de partage.')
  } finally {
    shareBusy.value = false
  }
}

const disableShare = async () => {
  shareBusy.value = true
  try {
    const response = await mindmapApi.disableShare(shareDiagram.value.idMindMap)
    // `api.del` renvoie `undefined` sur un 204 (voir deleteDiagram)
    if (response === undefined || [200, 204].includes(response.status)) {
      shareDiagram.value.shareToken = null
      toast.success('Le lien de partage est désactivé.')
    } else {
      toast.error('Impossible de désactiver le lien de partage.')
    }
  } catch {
    toast.error('Impossible de désactiver le lien de partage.')
  } finally {
    shareBusy.value = false
  }
}

const copyShareUrl = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    toast.success('Lien copié.')
  } catch {
    toast.warning('Copie impossible : sélectionnez le lien et copiez-le manuellement.')
  }
}

onMounted(fetchDiagrams)
</script>

<template>
  <ItemListLayout
    v-model:search="searchQuery"
    v-model:selectedSubjectId="selectedSubjectId"
    :subjects="subjects"
    :loading="loading"
    :filtered-count="filteredDiagrams.length"
    search-placeholder="Rechercher une carte mentale..."
    create-label="+ Nouvelle carte"
    item-label="carte mentale"
    item-label-plural="cartes mentales"
    feminine
    empty-message="Aucune carte mentale trouvée. Créez-en une !"
    @create="openCreateModal"
  >
    <template #actions>
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        class="hidden"
        data-testid="mindmap-import-input"
        aria-label="Fichier JSON de carte mentale à importer"
        @change="onImportFile"
      />
      <button
        type="button"
        class="py-3 px-6 rounded-lg border-2 border-gray-300 font-bold text-heading bg-white hover:bg-gray-50 transition duration-200 whitespace-nowrap w-full sm:w-auto disabled:opacity-50"
        data-testid="mindmap-import-button"
        :disabled="importing"
        @click="openImportPicker"
      >
        {{ importing ? 'Import en cours…' : 'Importer un JSON' }}
      </button>
    </template>

    <MenuItem
      v-for="diagram in filteredDiagrams"
      :key="diagram.idMindMap"
      :title="diagram.mmName"
      :description="subjectName(diagram.subjectId)"
      action-label="Ouvrir l'éditeur"
      :on-action="() => emit('open', diagram)"
      :on-edit="() => openRenameModal(diagram)"
      :on-delete="() => confirmDelete(diagram)"
    >
      <template #actions>
        <button
          type="button"
          class="hover:bg-gray-100 text-gray-600 font-bold py-1 px-2 rounded transition duration-200 border border-gray-300 hover:scale-110"
          :aria-label="`Partager ${diagram.mmName}`"
          :title="diagram.shareToken ? 'Carte partagée par lien' : 'Partager par lien'"
          data-testid="mindmap-share-button"
          @click="openShareModal(diagram)"
        >
          {{ diagram.shareToken ? '🔗' : '↗' }}
        </button>
      </template>
      <template #stats>
        <span v-if="subjectName(diagram.subjectId)" class="subject-badge">
          {{ subjectName(diagram.subjectId) }}
        </span>
        <div v-if="diagram.tags && diagram.tags.length" class="flex flex-wrap gap-1 mt-1">
          <span
            v-for="tag in diagram.tags"
            :key="tag.tagId"
            class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 border border-purple-200"
          >
            {{ tag.name }}
          </span>
        </div>
      </template>
    </MenuItem>

    <template #modals>
      <!-- Modal créer -->
      <div v-if="showCreateModal" class="modal-overlay" @mousedown.self="showCreateModal = false" v-dialog="() => { showCreateModal = false }" role="dialog" aria-modal="true" aria-labelledby="mindmap-create-modal-title">
        <div class="modal-panel">
          <button aria-label="Fermer" @click="showCreateModal = false" class="modal-close">&times;</button>
          <h2 id="mindmap-create-modal-title" class="modal-title">Nouvelle carte mentale</h2>
          <form @submit.prevent="confirmCreate">
            <div class="mb-4">
              <label class="form-label">Nom</label>
              <input
                aria-label="Nom de la carte mentale"
                v-model="createName"
                type="text"
                placeholder="Ex : Chapitre 3 - Les fractions"
                class="form-input"
                maxlength="50"
                required
                autofocus
              />
            </div>
            <div class="mb-4">
              <label class="form-label">Matière</label>
              <SubjectSelectorComponent v-model="createSubjectId" />
            </div>
            <div class="btn-row">
              <button type="submit" class="btn-modal-submit">Créer</button>
              <button type="button" @click="showCreateModal = false" class="btn-modal-cancel">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal partager -->
      <div v-if="showShareModal && shareDiagram" class="modal-overlay" @mousedown.self="showShareModal = false" v-dialog="() => { showShareModal = false }" role="dialog" aria-modal="true" aria-labelledby="mindmap-share-modal-title">
        <div class="modal-panel">
          <button aria-label="Fermer" @click="showShareModal = false" class="modal-close">&times;</button>
          <h2 id="mindmap-share-modal-title" class="modal-title">Partager « {{ shareDiagram.mmName }} »</h2>

          <template v-if="shareDiagram.shareToken">
            <p class="mb-3 text-sm text-gray-600">
              Toute personne qui possède ce lien peut voir la carte (lecture seule), sans compte.
              Elle ne peut pas la modifier.
            </p>
            <div class="mb-4 flex gap-2">
              <input
                aria-label="Lien de partage"
                data-testid="mindmap-share-url"
                class="form-input"
                type="text"
                readonly
                :value="shareUrl"
                @focus="$event.target.select()"
              />
              <button type="button" class="btn-modal-submit" @click="copyShareUrl">Copier</button>
            </div>
            <div class="btn-row">
              <button type="button" class="btn-modal-cancel" :disabled="shareBusy" data-testid="mindmap-share-disable" @click="disableShare">
                Désactiver le lien
              </button>
              <button type="button" class="btn-modal-cancel" @click="showShareModal = false">Fermer</button>
            </div>
          </template>

          <template v-else>
            <p class="mb-4 text-sm text-gray-600">
              Créez un lien public pour montrer cette carte à quelqu'un, en lecture seule et sans qu'il ait besoin de compte.
              Vous pourrez le désactiver à tout moment.
            </p>
            <div class="btn-row">
              <button type="button" class="btn-modal-submit" :disabled="shareBusy" data-testid="mindmap-share-enable" @click="enableShare">
                Créer le lien de partage
              </button>
              <button type="button" class="btn-modal-cancel" @click="showShareModal = false">Annuler</button>
            </div>
          </template>
        </div>
      </div>

      <!-- Modal renommer -->
      <div v-if="showRenameModal" class="modal-overlay" @mousedown.self="showRenameModal = false" v-dialog="() => { showRenameModal = false }" role="dialog" aria-modal="true" aria-labelledby="mindmap-rename-modal-title">
        <div class="modal-panel">
          <button aria-label="Fermer" @click="showRenameModal = false" class="modal-close">&times;</button>
          <h2 id="mindmap-rename-modal-title" class="modal-title">Modifier la carte</h2>
          <form @submit.prevent="confirmRename">
            <div class="mb-4">
              <label class="form-label">Nom</label>
              <input aria-label="Nouveau nom de la carte mentale" v-model="editedName" type="text" class="form-input" maxlength="50" required autofocus />
            </div>
            <div class="mb-4">
              <label class="form-label">Matière</label>
              <select aria-label="Sujet associé" v-model="editedSubjectId" class="form-input">
                <option :value="null">— Aucune matière —</option>
                <option v-for="s in subjects" :key="s.subjectId" :value="s.subjectId">
                  {{ s.name }}
                </option>
              </select>
            </div>
            <div class="mb-4">
              <label class="form-label">Tags <span class="text-gray-500 font-normal">(optionnel)</span></label>
              <TagSelectorComponent v-model="editedTagIds" />
            </div>
            <div class="btn-row">
              <button type="submit" class="btn-modal-submit">Valider</button>
              <button type="button" @click="showRenameModal = false" class="btn-modal-cancel">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </ItemListLayout>
  <ConfirmActionModal :modal="confirmModal" @cancel="closeConfirmModal" @confirm="runConfirmedAction" />
</template>

<style scoped>
.subject-badge {
  display: inline-block;
  background: var(--blue-50);
  color: var(--blue-600);
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  padding: 2px 8px;
  margin-top: 4px;
}
</style>
