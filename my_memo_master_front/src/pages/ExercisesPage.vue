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
        <div class="flex items-center gap-2 mt-1">
          <span class="subject-badge">{{ test.subject?.name || 'Sans sujet' }}</span>
        </div>
      </template>
    </MenuItem>

    <!-- Modals -->
    <template #modals>
      <div v-if="showModal" class="modal-overlay" @click="closeModal">
        <div class="modal-panel modal-panel--lg" @click.stop>
          <h2 class="modal-title">{{ isEditMode ? 'Modifier l\'exercice' : 'Nouvel exercice' }}</h2>

          <form @submit.prevent="submitExercise">
            <!-- Nom -->
            <div class="form-group">
              <label class="form-label">Titre de l'exercice</label>
              <input v-model="form.name" type="text" placeholder="Ex : Équations du second degré" class="form-input" required />
            </div>

            <!-- Sujet -->
            <div class="form-group--lg">
              <label class="form-label">Sujet</label>
              <select v-model="form.subjectId" class="form-input" required>
                <option value="">Sélectionner un sujet</option>
                <option v-for="s in subjects" :key="s.subjectId" :value="s.subjectId">{{ s.name }}</option>
              </select>
              <div v-if="!showNewSubjectForm" class="mt-2">
                <button type="button" @click="showNewSubjectForm = true" class="subject-create-link">
                  + Créer un nouveau sujet
                </button>
              </div>
              <div v-else class="subject-inline-form">
                <input
                  v-model="newSubjectName"
                  type="text"
                  placeholder="Nom du sujet (ex : Physique)"
                  class="subject-inline-input"
                  @keydown.enter.prevent="createSubjectInline"
                  autofocus
                />
                <button type="button" :disabled="creatingSubject || !newSubjectName.trim()" @click="createSubjectInline" class="subject-inline-btn">
                  {{ creatingSubject ? '...' : 'Créer' }}
                </button>
                <button type="button" @click="showNewSubjectForm = false; newSubjectName = ''" class="subject-inline-cancel">Annuler</button>
              </div>
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
                    <select v-model="q.type" class="form-input form-input--sm" @change="onTypeChange(q)">
                      <option value="open">Question ouverte</option>
                      <option value="mcq">QCM (choix multiple)</option>
                      <option value="fill_blank">Texte à trou</option>
                      <option value="reorder">Phrase à constituer</option>
                    </select>
                  </div>

                  <!-- Énoncé -->
                  <div class="mb-3">
                    <label class="form-label--xs">Énoncé</label>
                    <textarea v-model="q.statement" placeholder="Entrez l'énoncé de la question" class="form-input form-input--sm" rows="2" required />
                  </div>

                  <!-- open -->
                  <template v-if="q.type === 'open'">
                    <div>
                      <label class="form-label--xs">Réponse attendue</label>
                      <textarea v-model="q.openAnswer" placeholder="Réponse correcte (utilisée pour la correction)" class="form-input form-input--sm" rows="2" required />
                    </div>
                  </template>

                  <!-- mcq -->
                  <template v-else-if="q.type === 'mcq'">
                    <label class="block text-xs font-semibold text-gray-500 mb-2">Options (cocher la bonne réponse)</label>
                    <div class="space-y-2">
                      <div v-for="(opt, oi) in q.mcqOptions" :key="oi" class="flex items-center gap-2">
                        <input type="radio" :name="`mcq-correct-${idx}`" :value="oi" v-model="q.mcqCorrectIdx" class="accent-primary" />
                        <input :value="opt.text" @input="setExerciseOptionText(q, oi, $event.target.value)" type="text" placeholder="Option..." class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
                        <button v-if="q.mcqOptions.length > 2" type="button" @click="removeExerciseOption(q, oi)" class="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                      </div>
                    </div>
                    <button type="button" @click="addExerciseOption(q)" class="mt-2 text-sm text-primary hover:underline font-medium">+ Ajouter une option</button>
                  </template>

                  <!-- fill_blank -->
                  <template v-else-if="q.type === 'fill_blank'">
                    <div class="mb-3">
                      <label class="form-label--xs">Texte avec trous — utilise <code v-pre class="bg-gray-200 px-1 rounded">{{0}}</code>, <code v-pre class="bg-gray-200 px-1 rounded">{{1}}</code>…</label>
                      <textarea v-model="q.fillTemplate" placeholder="La photosynthèse produit du {{0}} grâce à la lumière {{1}}." class="form-input form-input--sm" rows="2" required @input="syncFillBlanks(q)" />
                    </div>
                    <div v-if="q.fillBlanks.length" class="space-y-2">
                      <label class="form-label--xs">Réponses attendues</label>
                      <div v-for="(blank, bi) in q.fillBlanks" :key="bi" class="flex items-center gap-2">
                        <span class="text-xs text-gray-400 w-14 shrink-0">Trou {{ bi }}</span>
                        <input v-model="q.fillBlanks[bi]" type="text" :placeholder="`Réponse du trou ${bi}`" class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
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
                        <input v-model="q.reorderFragments[fi]" type="text" placeholder="Fragment..." class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
                        <button v-if="q.reorderFragments.length > 2" type="button" @click="q.reorderFragments.splice(fi, 1)" class="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                      </div>
                    </div>
                    <button type="button" @click="q.reorderFragments.push('')" class="mt-2 text-sm text-primary hover:underline font-medium">+ Ajouter un fragment</button>
                  </template>
                </div>
              </div>
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
import MenuItem from '@/components/MenuItemComponent.vue'
import ItemListLayout from '@/components/ItemListLayout.vue'

const router = useRouter()
const testStore = useTestStore()
const subjectStore = useSubjectStore()

const loading = ref(true)
const searchQuery = ref('')
const selectedSubjectId = ref(null)
const showModal = ref(false)
const isEditMode = ref(false)
const editTestId = ref(null)
const submitting = ref(false)
const formError = ref('')
const showNewSubjectForm = ref(false)
const newSubjectName = ref('')
const creatingSubject = ref(false)
const questionsToDelete = ref([])

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

const form = reactive({ name: '', subjectId: '', questions: [defaultQuestion()] })

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
  await Promise.all([testStore.fetchTests(), subjectStore.fetchSubjects()])
  loading.value = false
})

// ── modals ────────────────────────────────────────────────────────────────────
function openCreateModal() {
  isEditMode.value = false
  editTestId.value = null
  questionsToDelete.value = []
  form.name = ''
  form.subjectId = ''
  form.questions = [defaultQuestion()]
  formError.value = ''
  showNewSubjectForm.value = false
  newSubjectName.value = ''
  showModal.value = true
}

async function openEditModal(test) {
  isEditMode.value = true
  editTestId.value = test.testId
  questionsToDelete.value = []
  formError.value = ''
  showNewSubjectForm.value = false
  newSubjectName.value = ''

  const resp = await api.get(`tests/${test.testId}`)
  if (!resp || resp.status !== 200) {
    notif.notify('Impossible de charger l\'exercice.', 'error')
    return
  }

  const fullTest = resp.data
  form.name = fullTest.name
  form.subjectId = fullTest.subjectId
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

async function createSubjectInline() {
  const name = newSubjectName.value.trim()
  if (!name || creatingSubject.value) return
  creatingSubject.value = true
  try {
    const resp = await api.post('subjects', { name })
    if (!resp || resp.status !== 201) {
      formError.value = resp?.data?.message || 'Erreur lors de la création du sujet.'
      return
    }
    await subjectStore.fetchSubjects()
    form.subjectId = resp.data.subjectId
    showNewSubjectForm.value = false
    newSubjectName.value = ''
  } finally {
    creatingSubject.value = false
  }
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

    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i]
      const resp = await api.post('questions', { statement: q.statement, questionPosition: i, type: q.type, content: buildContent(q), idTest: testId })
      if (!resp || resp.status !== 201) { formError.value = resp?.data?.message || `Erreur question ${i + 1}.`; return }
    }

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

    notif.notify('Exercice modifié avec succès !', 'success')
    closeModal()
    await testStore.fetchTests()
  } finally {
    submitting.value = false
  }
}

async function deleteTest(test) {
  if (!confirm(`Supprimer l'exercice "${test.name}" ?`)) return
  await testStore.deleteTest(test.testId)
}
</script>
