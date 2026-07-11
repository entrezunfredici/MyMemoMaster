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
    @create="openCreateModal"
  >
    <!-- Cartes -->
    <MenuItem
      v-for="test in filteredTests"
      :key="test.testId"
      :title="test.name"
      :description="test.subject?.name || ''"
      action-label="Commencer l'exercice"
      :on-action="() => router.push({ name: 'exercise-detail', params: { id: test.testId } })"
      :on-edit="() => openEditModal(test)"
      :on-delete="() => deleteTest(test)"
    >
      <template #stats>
        <div class="flex flex-wrap items-center gap-2 mt-1">
          <span class="subject-badge">{{ test.subject?.name || 'Sans sujet' }}</span>
          <!-- Statut privé / groupes assignés -->
          <span
            v-if="!test.classGroups?.length"
            class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200"
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
          @click.stop="openAssignModal(test)"
          class="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium underline"
        >Assigner à des groupes</button>
      </template>
    </MenuItem>

    <!-- Modals -->
    <template #modals>
      <!-- Modal assignation groupes -->
      <div v-if="showAssignModal" class="modal-overlay" @click="closeAssignModal">
        <div class="modal-panel" @click.stop>
          <h2 class="modal-title">Assigner aux groupes classes</h2>
          <p class="text-sm text-gray-500 mb-4">
            Sélectionnez les groupes qui auront accès à cet exercice.<br>
            Les scores de ces étudiants apparaîtront dans vos KPI pédagogiques.
          </p>
          <div v-if="assignableGroups.length === 0" class="text-sm text-gray-400 italic mb-4">
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
              <span v-if="group.level" class="text-xs text-gray-400">{{ group.level }}</span>
            </label>
          </div>
          <p class="text-xs text-gray-400 mb-4">Aucune sélection = l'exercice reste privé.</p>
          <div class="btn-row">
            <button type="button" @click="submitAssign" :disabled="assignSubmitting" class="btn-modal-submit">
              {{ assignSubmitting ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
            <button type="button" @click="closeAssignModal" class="btn-modal-cancel">Annuler</button>
          </div>
        </div>
      </div>

      <!-- Modal création / édition exercice -->
      <div v-if="showModal" class="modal-overlay" @click="closeModal">
        <div class="modal-panel modal-panel--lg" @click.stop>
          <h2 class="modal-title">{{ isEditMode ? 'Modifier l\'exercice' : 'Nouvel exercice' }}</h2>

          <form @submit.prevent="submitExercise">
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
              <label class="form-label">Tags <span class="text-gray-400 font-normal">(optionnel)</span></label>
              <TagSelectorComponent v-model="form.tagIds" />
            </div>

            <!-- Questions -->
            <div class="mb-6">
              <div class="flex justify-between items-center mb-4">
                <label class="form-label">Questions</label>
                <button type="button" @click="addQuestion" class="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm transition border-2 border-green-800">
                  + Ajouter une question
                </button>
              </div>

              <div class="space-y-6">
                <div v-for="(q, idx) in form.questions" :key="q._key" class="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div class="flex justify-between items-center mb-3">
                    <span class="font-semibold text-sm text-heading">Question {{ idx + 1 }}</span>
                    <button v-if="form.questions.length > 1" type="button" @click="removeQuestion(idx)" class="text-red-500 hover:text-red-700 text-sm font-medium">
                      Supprimer
                    </button>
                  </div>

                  <!-- Type -->
                  <div class="mb-3">
                    <label class="form-label--xs">Type</label>
                    <select aria-label="Type de question" v-model="q.type" class="form-input form-input--sm" @change="onTypeChange(q)">
                      <option value="open">Question ouverte</option>
                      <option value="mcq">QCM (choix multiple)</option>
                      <option value="fill_blank">Texte à trou</option>
                      <option value="reorder">Phrase à constituer</option>
                    </select>
                  </div>

                  <!-- Énoncé -->
                  <div class="mb-3">
                    <label class="form-label--xs">Énoncé</label>
                    <textarea aria-label="Entrez l'énoncé de la question" v-model="q.statement" placeholder="Entrez l'énoncé de la question" class="form-input form-input--sm" rows="2" required />
                  </div>

                  <!-- open -->
                  <template v-if="q.type === 'open'">
                    <div>
                      <label class="form-label--xs">Réponse attendue</label>
                      <textarea aria-label="Réponse correcte (utilisée pour la correction)" v-model="q.openAnswer" placeholder="Réponse correcte (utilisée pour la correction)" class="form-input form-input--sm" rows="2" required />
                    </div>
                  </template>

                  <!-- mcq -->
                  <template v-else-if="q.type === 'mcq'">
                    <label class="block text-xs font-semibold text-gray-500 mb-2">Options (cocher la bonne réponse)</label>
                    <div class="space-y-2">
                      <div v-for="(opt, oi) in q.mcqOptions" :key="oi" class="flex items-center gap-2">
                        <input :aria-label="`Marquer l'option ${oi + 1} comme correcte`" type="radio" :name="`mcq-correct-${idx}`" :value="oi" v-model="q.mcqCorrectIdx" class="accent-primary" />
                        <input :aria-label="`Texte de l'option ${oi + 1}`" :value="opt.text" @input="setExerciseOptionText(q, oi, $event.target.value)" type="text" placeholder="Option..." class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
                        <button v-if="q.mcqOptions.length > 2" type="button" @click="removeExerciseOption(q, oi)" class="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                      </div>
                    </div>
                    <button type="button" @click="addExerciseOption(q)" class="mt-2 text-sm text-primary hover:underline font-medium">+ Ajouter une option</button>
                  </template>

                  <!-- fill_blank -->
                  <template v-else-if="q.type === 'fill_blank'">
                    <div class="mb-3">
                      <label class="form-label--xs">Texte avec trous — utilise <code v-pre class="bg-gray-200 px-1 rounded">{{0}}</code>, <code v-pre class="bg-gray-200 px-1 rounded">{{1}}</code>…</label>
                      <textarea aria-label="Texte à trous avec emplacements" v-model="q.fillTemplate" placeholder="La photosynthèse produit du {{0}} grâce à la lumière {{1}}." class="form-input form-input--sm" rows="2" required @input="syncFillBlanks(q)" />
                    </div>
                    <div v-if="q.fillBlanks.length" class="space-y-2">
                      <label class="form-label--xs">Réponses attendues</label>
                      <div v-for="(blank, bi) in q.fillBlanks" :key="bi" class="flex items-center gap-2">
                        <span class="text-xs text-gray-400 w-14 shrink-0">Trou {{ bi }}</span>
                        <input :aria-label="`Réponse du trou ${bi}`" v-model="q.fillBlanks[bi]" type="text" :placeholder="`Réponse du trou ${bi}`" class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
                      </div>
                    </div>
                    <p v-else class="text-xs text-gray-400 italic">Utilisez <code v-pre class="bg-gray-200 px-1 rounded">{{0}}</code>, <code v-pre class="bg-gray-200 px-1 rounded">{{1}}</code>… dans le texte pour créer des trous.</p>
                  </template>

                  <!-- reorder -->
                  <template v-else-if="q.type === 'reorder'">
                    <label class="block text-xs font-semibold text-gray-500 mb-2">Fragments dans le bon ordre (l'étudiant devra les reconstituer)</label>
                    <div class="space-y-2">
                      <div v-for="(frag, fi) in q.reorderFragments" :key="fi" class="flex items-center gap-2">
                        <span class="text-xs text-gray-400 w-5 shrink-0">{{ fi + 1 }}.</span>
                        <input :aria-label="`Fragment ${fi + 1}`" v-model="q.reorderFragments[fi]" type="text" placeholder="Fragment..." class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
                        <button v-if="q.reorderFragments.length > 2" type="button" @click="q.reorderFragments.splice(fi, 1)" class="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                      </div>
                    </div>
                    <button type="button" @click="q.reorderFragments.push('')" class="mt-2 text-sm text-primary hover:underline font-medium">+ Ajouter un fragment</button>
                  </template>
                </div>
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
                  <span v-if="group.level" class="text-xs text-gray-400">{{ group.level }}</span>
                </label>
              </div>
              <p class="text-xs text-gray-400 mt-2">Aucune sélection = l'exercice reste privé.</p>
            </div>

            <p v-if="formError" class="text-red-600 text-sm mb-4">{{ formError }}</p>

            <div class="btn-row">
              <button type="submit" :disabled="submitting" class="btn-modal-submit">
                {{ submitting ? 'Enregistrement...' : (isEditMode ? 'Enregistrer les modifications' : 'Créer l\'exercice') }}
              </button>
              <button type="button" @click="closeModal" class="btn-modal-cancel">Annuler</button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </ItemListLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'
import { useTestStore } from '@/stores/tests'
import { useSubjectStore } from '@/stores/subjects'
import { useTagStore } from '@/stores/tags'
import { useClassGroupStore } from '@/stores/classGroups'
import { useAuthStore } from '@/stores/auth'
import { useGuidedTourStore } from '@/stores/guidedTour'
import { useRole } from '@/composables/useRole'
import MenuItem from '@/components/MenuItemComponent.vue'
import ItemListLayout from '@/components/ItemListLayout.vue'
import TagSelectorComponent from '@/components/TagSelectorComponent.vue'
import SubjectSelectorComponent from '@/components/SubjectSelectorComponent.vue'

const router = useRouter()
const testStore = useTestStore()
const subjectStore = useSubjectStore()
const tagStore = useTagStore()
const classGroupStore = useClassGroupStore()
const authStore = useAuthStore()
const guidedTourStore = useGuidedTourStore()
const { isEnseignant } = useRole()

const loading = ref(true)
const searchQuery = ref('')
const selectedSubjectId = ref(null)
const showModal = ref(false)
const isEditMode = ref(false)
const editTestId = ref(null)
const submitting = ref(false)
const formError = ref('')
const questionsToDelete = ref([])

// — assignation groupes —
const showAssignModal = ref(false)
const assignTargetTest = ref(null)
const selectedGroupIds = ref([])
const assignSubmitting = ref(false)

// Groupes où l'utilisateur courant est teacher (pour l'assignation)
const assignableGroups = computed(() => {
  const userId = authStore.user?.userId
  return (classGroupStore.groups ?? []).filter((g) =>
    g.members?.some((m) => m.userId === userId && m.role === 'teacher')
  )
})

const canAssignToGroups = computed(() => assignableGroups.value.length > 0)

const subjects = computed(() => subjectStore.subjects)
const tests = computed(() => testStore.tests)

const filteredTests = computed(() => {
  let list = tests.value
  if (selectedSubjectId.value) {
    list = list.filter(t => t.subjectId === selectedSubjectId.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t => t.name.toLowerCase().includes(q))
  }
  return list
})

// ── form ──────────────────────────────────────────────────────────────────────
let _keyCounter = 0
const nextKey = () => ++_keyCounter

const defaultQuestion = () => ({
  _key: nextKey(),
  idQuestion: null,
  statement: '',
  type: 'open',
  openAnswer: '',
  mcqOptions: [{ text: '' }, { text: '' }],
  mcqCorrectIdx: 0,
  fillTemplate: '',
  fillBlanks: [],
  reorderFragments: ['', ''],
})

const form = reactive({ name: '', subjectId: '', tagIds: [], groupIds: [], questions: [defaultQuestion()] })
const editingTestUserId = ref(null)

// ── helpers questions ─────────────────────────────────────────────────────────

function onTypeChange(q) {
  q.openAnswer = ''
  q.mcqOptions = [{ text: '' }, { text: '' }]
  q.mcqCorrectIdx = 0
  q.fillTemplate = ''
  q.fillBlanks = []
  q.reorderFragments = ['', '']
}

function setExerciseOptionText(q, idx, value) {
  q.mcqOptions = q.mcqOptions.map((o, i) => i === idx ? { ...o, text: value } : o)
}

function addExerciseOption(q) {
  q.mcqOptions = [...q.mcqOptions, { text: '' }]
}

function removeExerciseOption(q, oi) {
  q.mcqOptions = q.mcqOptions.filter((_, i) => i !== oi)
  if (q.mcqCorrectIdx >= q.mcqOptions.length) q.mcqCorrectIdx = q.mcqOptions.length - 1
  else if (oi < q.mcqCorrectIdx) q.mcqCorrectIdx--
}

function syncFillBlanks(q) {
  const matches = [...q.fillTemplate.matchAll(/\{\{(\d+)\}\}/g)]
  const count = matches.length ? Math.max(...matches.map(m => parseInt(m[1]))) + 1 : 0
  while (q.fillBlanks.length < count) q.fillBlanks.push('')
  if (q.fillBlanks.length > count) q.fillBlanks.splice(count)
}

function buildContent(q) {
  switch (q.type) {
    case 'open':      return { correct_answer: q.openAnswer }
    case 'mcq':       return { options: q.mcqOptions.map((o, i) => ({ text: o.text, correct: i === q.mcqCorrectIdx })) }
    case 'fill_blank':return { template: q.fillTemplate, blanks: q.fillBlanks }
    case 'reorder':   return { fragments: q.reorderFragments, solution: q.reorderFragments.map((_, i) => i) }
    default:          return null
  }
}

function contentToFormState(q) {
  const c = q.content ?? {}
  switch (q.type) {
    case 'open':
      return { openAnswer: c.correct_answer ?? '', mcqOptions: [{ text: '' }, { text: '' }], mcqCorrectIdx: 0, fillTemplate: '', fillBlanks: [], reorderFragments: ['', ''] }
    case 'mcq': {
      const opts = c.options ?? [{ text: '', correct: true }, { text: '', correct: false }]
      const correctIdx = opts.findIndex(o => o.correct)
      return { openAnswer: '', mcqOptions: opts.map(o => ({ text: o.text })), mcqCorrectIdx: correctIdx >= 0 ? correctIdx : 0, fillTemplate: '', fillBlanks: [], reorderFragments: ['', ''] }
    }
    case 'fill_blank':
      return { openAnswer: '', mcqOptions: [{ text: '' }, { text: '' }], mcqCorrectIdx: 0, fillTemplate: c.template ?? '', fillBlanks: [...(c.blanks ?? [])], reorderFragments: ['', ''] }
    case 'reorder':
      return { openAnswer: '', mcqOptions: [{ text: '' }, { text: '' }], mcqCorrectIdx: 0, fillTemplate: '', fillBlanks: [], reorderFragments: [...(c.fragments ?? ['', ''])] }
    default:
      return { openAnswer: '', mcqOptions: [{ text: '' }, { text: '' }], mcqCorrectIdx: 0, fillTemplate: '', fillBlanks: [], reorderFragments: ['', ''] }
  }
}

function addQuestion() { form.questions.push(defaultQuestion()) }

function removeQuestion(idx) {
  const q = form.questions[idx]
  if (q.idQuestion) questionsToDelete.value.push(q.idQuestion)
  form.questions.splice(idx, 1)
}

// ── lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([testStore.fetchTests(), subjectStore.fetchSubjects(), classGroupStore.fetchGroups()])
  loading.value = false
})

// ── modals ────────────────────────────────────────────────────────────────────
function openCreateModal() {
  isEditMode.value = false
  editTestId.value = null
  editingTestUserId.value = authStore.user?.userId ?? null
  questionsToDelete.value = []
  form.name = ''
  // Parcours guidé : pré-sélectionne la matière liée aux étapes précédentes
  form.subjectId = guidedTourStore.active ? guidedTourStore.links.subjectId : null
  form.tagIds = []
  form.groupIds = []
  form.questions = [defaultQuestion()]
  formError.value = ''
  showModal.value = true
}

async function openEditModal(test) {
  isEditMode.value = true
  editTestId.value = test.testId
  editingTestUserId.value = test.userId ?? null
  questionsToDelete.value = []
  formError.value = ''

  const resp = await api.get(`tests/${test.testId}`)
  if (!resp || resp.status !== 200) {
    notif.notify('Impossible de charger l\'exercice.', 'error')
    return
  }

  const fullTest = resp.data
  form.name = fullTest.name
  form.subjectId = fullTest.subjectId
  form.tagIds = (fullTest.tags || []).map((t) => t.tagId)
  form.groupIds = (fullTest.classGroups ?? []).map((g) => g.id)
  form.questions = (fullTest.question ?? []).map(q => ({
    _key: nextKey(),
    idQuestion: q.idQuestion,
    statement: q.statement,
    type: q.type,
    ...contentToFormState(q)
  }))

  if (!form.questions.length) form.questions = [defaultQuestion()]
  showModal.value = true
}

function closeModal() { showModal.value = false }

// ── soumission ────────────────────────────────────────────────────────────────
async function submitExercise() {
  if (isEditMode.value) await submitEdit()
  else await submitCreate()
}

async function submitCreate() {
  submitting.value = true
  formError.value = ''
  try {
    testStore.test = { name: form.name, subjectId: Number(form.subjectId) }
    const created = await testStore.createTest()
    if (!created) { formError.value = 'Erreur lors de la création de l\'exercice.'; return }
    const testId = testStore.test.testId
    guidedTourStore.recordLinks({ testId })

    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i]
      const resp = await api.post('questions', { statement: q.statement, questionPosition: i, type: q.type, content: buildContent(q), idTest: testId })
      if (!resp || resp.status !== 201) { formError.value = resp?.data?.message || `Erreur question ${i + 1}.`; return }
    }

    await tagStore.setEntityTags('test', testId, form.tagIds)
    if (form.groupIds.length > 0) await testStore.assignGroups(testId, form.groupIds)
    notif.notify('Exercice créé avec succès !', 'success')
    closeModal()
    await testStore.fetchTests()
  } finally {
    submitting.value = false
  }
}

async function submitEdit() {
  submitting.value = true
  formError.value = ''
  try {
    const testResp = await api.put(`tests/${editTestId.value}`, { name: form.name, subjectId: Number(form.subjectId) })
    if (!testResp || testResp.status !== 200) { formError.value = testResp?.data?.message || 'Erreur mise à jour exercice.'; return }

    for (const qId of questionsToDelete.value) {
      const resp = await api.del(`questions/${qId}`)
      if (resp !== undefined) { formError.value = 'Erreur lors de la suppression d\'une question.'; return }
    }

    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i]
      const payload = { statement: q.statement, questionPosition: i, type: q.type, content: buildContent(q) }
      if (q.idQuestion) {
        const resp = await api.put(`questions/edit/${q.idQuestion}`, payload)
        if (!resp || resp.status !== 200) { formError.value = resp?.data?.message || `Erreur mise à jour question ${i + 1}.`; return }
      } else {
        const resp = await api.post('questions', { ...payload, idTest: editTestId.value })
        if (!resp || resp.status !== 201) { formError.value = resp?.data?.message || `Erreur création question ${i + 1}.`; return }
      }
    }

    await tagStore.setEntityTags('test', editTestId.value, form.tagIds)
    await testStore.assignGroups(editTestId.value, form.groupIds)
    notif.notify('Exercice modifié avec succès !', 'success')
    closeModal()
    await testStore.fetchTests()
  } finally {
    submitting.value = false
  }
}

// ── assignation groupes ───────────────────────────────────────────────────────
function openAssignModal(test) {
  assignTargetTest.value = test
  selectedGroupIds.value = (test.classGroups ?? []).map((g) => g.id)
  showAssignModal.value = true
}

function closeAssignModal() {
  showAssignModal.value = false
  assignTargetTest.value = null
  selectedGroupIds.value = []
}

async function submitAssign() {
  if (!assignTargetTest.value) return
  assignSubmitting.value = true
  const ok = await testStore.assignGroups(assignTargetTest.value.testId, selectedGroupIds.value)
  assignSubmitting.value = false
  if (ok) closeAssignModal()
}

async function deleteTest(test) {
  if (!confirm(`Supprimer l'exercice "${test.name}" ?`)) return
  await testStore.deleteTest(test.testId)
}
</script>
