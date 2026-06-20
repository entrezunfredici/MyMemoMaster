<template>
  <div class="container mx-auto px-4 py-8">

    <!-- Barre de recherche + bouton -->
    <div class="mb-8 flex gap-4 items-center">
      <div class="relative flex-1 max-w-2xl">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher un exercice..."
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <span class="absolute right-4 top-3.5 text-gray-400">🔍</span>
      </div>
      <button
        @click="openCreateModal"
        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200 whitespace-nowrap ml-auto shadow-lg hover:shadow-xl hover:scale-105 border-2 border-blue-800"
      >
        + Créer un exercice
      </button>
    </div>

    <!-- Filtre sujet -->
    <div class="mb-8">
      <div class="flex gap-3 flex-wrap items-center mb-3">
        <label class="text-sm font-semibold text-heading">Filtrer par sujet :</label>
        <button
          v-for="subject in subjects"
          :key="subject.subjectId"
          @click="selectedSubjectId = selectedSubjectId === subject.subjectId ? null : subject.subjectId"
          :class="['px-3 py-1.5 rounded-lg font-semibold transition duration-200 border-2 text-sm', selectedSubjectId === subject.subjectId ? 'bg-blue-700 text-white border-blue-900' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200']"
        >
          {{ subject.name }}
        </button>
        <button
          v-if="selectedSubjectId"
          @click="selectedSubjectId = null"
          class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-100 text-red-700 border-2 border-red-300 hover:bg-red-200"
        >
          Réinitialiser
        </button>
      </div>
      <p class="text-sm text-gray-600">
        <strong>{{ filteredTests.length }}</strong> exercice<span v-if="filteredTests.length !== 1">s</span> trouvé<span v-if="filteredTests.length !== 1">s</span>
      </p>
    </div>

    <!-- État chargement -->
    <div v-if="loading" class="text-center text-gray-400 py-12">Chargement des exercices...</div>

    <!-- Liste des exercices -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <MenuItem
        v-for="test in filteredTests"
        :key="test.testId"
        :title="test.name"
        :description="test.subject?.name || ''"
        action-label="Commencer l'exercice"
        :on-action="() => router.push({ name: 'exercise-detail', params: { id: test.testId } })"
        :on-delete="() => deleteTest(test)"
      >
        <template #stats>
          <div class="flex items-center gap-2 mt-1">
            <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
              {{ test.subject?.name || 'Sans sujet' }}
            </span>
          </div>
        </template>
      </MenuItem>
    </div>

    <p v-if="!loading && filteredTests.length === 0" class="text-center text-gray-400 py-12">
      Aucun exercice trouvé. Créez-en un !
    </p>

    <!-- Modal création exercice -->
    <div
      v-if="showModal"
      class="modal-overlay"
      @click="closeModal"
    >
      <div
        class="modal-panel modal-panel--lg"
        @click.stop
      >
        <h2 class="modal-title">Nouvel exercice</h2>

        <form @submit.prevent="submitExercise">
          <!-- Nom de l'exercice -->
          <div class="form-group">
            <label class="form-label">Titre de l'exercice</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Ex : Équations du second degré"
              class="form-input"
              required
            />
          </div>

          <!-- Sujet -->
          <div class="form-group--lg">
            <label class="form-label">Sujet</label>
            <select
              v-model="form.subjectId"
              class="form-input"
              required
            >
              <option value="">Sélectionner un sujet</option>
              <option v-for="s in subjects" :key="s.subjectId" :value="s.subjectId">{{ s.name }}</option>
            </select>

            <!-- Création inline d'un sujet -->
            <div v-if="!showNewSubjectForm" class="mt-2">
              <button
                type="button"
                @click="showNewSubjectForm = true"
                class="text-sm text-blue-600 hover:underline font-medium"
              >+ Créer un nouveau sujet</button>
            </div>
            <div v-else class="mt-2 flex gap-2 items-center">
              <input
                v-model="newSubjectName"
                type="text"
                placeholder="Nom du sujet (ex : Physique)"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                @keydown.enter.prevent="createSubjectInline"
                autofocus
              />
              <button
                type="button"
                :disabled="creatingSubject || !newSubjectName.trim()"
                @click="createSubjectInline"
                class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
              >{{ creatingSubject ? '...' : 'Créer' }}</button>
              <button
                type="button"
                @click="showNewSubjectForm = false; newSubjectName = ''"
                class="text-gray-500 hover:text-gray-700 text-sm px-2"
              >Annuler</button>
            </div>
          </div>

          <!-- Questions -->
          <div class="mb-6">
            <div class="flex justify-between items-center mb-4">
              <label class="form-label">Questions</label>
              <button
                type="button"
                @click="addQuestion"
                class="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm transition border-2 border-green-800"
              >
                + Ajouter une question
              </button>
            </div>

            <div class="space-y-6">
              <div
                v-for="(q, idx) in form.questions"
                :key="idx"
                class="bg-gray-50 border border-gray-200 p-4 rounded-lg"
              >
                <div class="flex justify-between items-center mb-3">
                  <span class="font-semibold text-sm text-heading">Question {{ idx + 1 }}</span>
                  <button
                    v-if="form.questions.length > 1"
                    type="button"
                    @click="removeQuestion(idx)"
                    class="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Supprimer
                  </button>
                </div>

                <!-- Type de question -->
                <div class="mb-3">
                  <label class="form-label--xs">Type</label>
                  <select
                    v-model="q.type"
                    class="form-input form-input--sm"
                    @change="onTypeChange(q)"
                  >
                    <option value="open">Question ouverte</option>
                    <option value="mcq">QCM (choix multiple)</option>
                    <option value="fill_blank">Texte à trou</option>
                    <option value="reorder">Phrase à constituer</option>
                  </select>
                </div>

                <!-- Énoncé -->
                <div class="mb-3">
                  <label class="form-label--xs">Énoncé</label>
                  <textarea
                    v-model="q.statement"
                    placeholder="Entrez l'énoncé de la question"
                    class="form-input form-input--sm"
                    rows="2"
                    required
                  />
                </div>

                <!-- Champs spécifiques au type -->

                <!-- open -->
                <template v-if="q.type === 'open'">
                  <div>
                    <label class="form-label--xs">Réponse attendue</label>
                    <textarea
                      v-model="q.openAnswer"
                      placeholder="Réponse correcte (utilisée pour la correction)"
                      class="form-input form-input--sm"
                      rows="2"
                      required
                    />
                  </div>
                </template>

                <!-- mcq -->
                <template v-else-if="q.type === 'mcq'">
                  <label class="block text-xs font-semibold text-gray-500 mb-2">Options (cocher la bonne réponse)</label>
                  <div class="space-y-2">
                    <div
                      v-for="(opt, oi) in q.mcqOptions"
                      :key="oi"
                      class="flex items-center gap-2"
                    >
                      <input
                        type="radio"
                        :name="`mcq-correct-${idx}`"
                        :value="oi"
                        v-model="q.mcqCorrectIdx"
                        class="accent-blue-600"
                      />
                      <input
                        :value="opt.text"
                        @input="setExerciseOptionText(q, oi, $event.target.value)"
                        type="text"
                        placeholder="Option..."
                        class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        required
                      />
                      <button
                        v-if="q.mcqOptions.length > 2"
                        type="button"
                        @click="removeExerciseOption(q, oi)"
                        class="text-red-400 hover:text-red-600 text-lg leading-none"
                      >✕</button>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="addExerciseOption(q)"
                    class="mt-2 text-sm text-blue-600 hover:underline font-medium"
                  >
                    + Ajouter une option
                  </button>
                </template>

                <!-- fill_blank -->
                <template v-else-if="q.type === 'fill_blank'">
                  <div class="mb-3">
                    <label class="form-label--xs">
                      Texte avec trous — utilise <code v-pre class="bg-gray-200 px-1 rounded">{{0}}</code>, <code v-pre class="bg-gray-200 px-1 rounded">{{1}}</code>…
                    </label>
                    <textarea
                      v-model="q.fillTemplate"
                      placeholder="La photosynthèse produit du {{0}} grâce à la lumière {{1}}."
                      class="form-input form-input--sm"
                      rows="2"
                      required
                      @input="syncFillBlanks(q)"
                    />
                  </div>
                  <div v-if="q.fillBlanks.length" class="space-y-2">
                    <label class="form-label--xs">Réponses attendues</label>
                    <div v-for="(blank, bi) in q.fillBlanks" :key="bi" class="flex items-center gap-2">
                      <span class="text-xs text-gray-400 w-14 shrink-0">Trou {{ bi }}</span>
                      <input
                        v-model="q.fillBlanks[bi]"
                        type="text"
                        :placeholder="`Réponse du trou ${bi}`"
                        class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        required
                      />
                    </div>
                  </div>
                  <p v-else class="text-xs text-gray-400 italic">Utilisez <code v-pre class="bg-gray-200 px-1 rounded">{{0}}</code>, <code v-pre class="bg-gray-200 px-1 rounded">{{1}}</code>… dans le texte pour créer des trous.</p>
                </template>

                <!-- reorder -->
                <template v-else-if="q.type === 'reorder'">
                  <label class="block text-xs font-semibold text-gray-500 mb-2">
                    Fragments dans le bon ordre (l'étudiant devra les reconstituer)
                  </label>
                  <div class="space-y-2">
                    <div v-for="(frag, fi) in q.reorderFragments" :key="fi" class="flex items-center gap-2">
                      <span class="text-xs text-gray-400 w-5 shrink-0">{{ fi + 1 }}.</span>
                      <input
                        v-model="q.reorderFragments[fi]"
                        type="text"
                        placeholder="Fragment..."
                        class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        required
                      />
                      <button
                        v-if="q.reorderFragments.length > 2"
                        type="button"
                        @click="q.reorderFragments.splice(fi, 1)"
                        class="text-red-400 hover:text-red-600 text-lg leading-none"
                      >✕</button>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="q.reorderFragments.push('')"
                    class="mt-2 text-sm text-blue-600 hover:underline font-medium"
                  >
                    + Ajouter un fragment
                  </button>
                </template>
              </div>
            </div>
          </div>

          <p v-if="formError" class="text-red-600 text-sm mb-4">{{ formError }}</p>

          <div class="btn-row">
            <button
              type="submit"
              :disabled="submitting"
              class="btn-modal-submit"
            >
              {{ submitting ? 'Création en cours...' : 'Créer l\'exercice' }}
            </button>
            <button
              type="button"
              @click="closeModal"
              class="btn-modal-cancel"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'
import { useTestStore } from '@/stores/tests'
import { useSubjectStore } from '@/stores/subjects'
import MenuItem from '@/components/MenuItemComponent.vue'

const router = useRouter()
const testStore = useTestStore()
const subjectStore = useSubjectStore()

const loading = ref(true)
const searchQuery = ref('')
const selectedSubjectId = ref(null)
const showModal = ref(false)
const submitting = ref(false)
const formError = ref('')
const showNewSubjectForm = ref(false)
const newSubjectName = ref('')
const creatingSubject = ref(false)

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

// ── form state ───────────────────────────────────────────────────────────────
const defaultQuestion = () => ({
  statement: '',
  type: 'open',
  openAnswer: '',
  mcqOptions: [{ text: '' }, { text: '' }],
  mcqCorrectIdx: 0,
  fillTemplate: '',
  fillBlanks: [],
  reorderFragments: ['', ''],
})

const form = reactive({
  name: '',
  subjectId: '',
  questions: [defaultQuestion()],
})

// ── helpers formulaire questions ─────────────────────────────────────────────

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
  if (q.mcqCorrectIdx >= q.mcqOptions.length) {
    q.mcqCorrectIdx = q.mcqOptions.length - 1
  } else if (oi < q.mcqCorrectIdx) {
    q.mcqCorrectIdx--
  }
}

function syncFillBlanks(q) {
  const matches = [...q.fillTemplate.matchAll(/\{\{(\d+)\}\}/g)]
  const count = matches.length ? Math.max(...matches.map(m => parseInt(m[1]))) + 1 : 0
  while (q.fillBlanks.length < count) q.fillBlanks.push('')
  if (q.fillBlanks.length > count) q.fillBlanks.splice(count)
}

function buildContent(q) {
  switch (q.type) {
    case 'open':
      return { correct_answer: q.openAnswer }
    case 'mcq':
      return { options: q.mcqOptions.map((o, i) => ({ text: o.text, correct: i === q.mcqCorrectIdx })) }
    case 'fill_blank':
      return { template: q.fillTemplate, blanks: q.fillBlanks }
    case 'reorder':
      return {
        fragments: q.reorderFragments,
        solution: q.reorderFragments.map((_, i) => i),
      }
    default:
      return null
  }
}

function addQuestion() {
  form.questions.push(defaultQuestion())
}

function removeQuestion(idx) {
  form.questions.splice(idx, 1)
}

// ── cycle de vie ─────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([testStore.fetchTests(), subjectStore.fetchSubjects()])
  loading.value = false
})

// ── modal ────────────────────────────────────────────────────────────────────

function openCreateModal() {
  form.name = ''
  form.subjectId = ''
  form.questions = [defaultQuestion()]
  formError.value = ''
  showNewSubjectForm.value = false
  newSubjectName.value = ''
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

function closeModal() {
  showModal.value = false
}

// ── soumission ───────────────────────────────────────────────────────────────

async function submitExercise() {
  submitting.value = true
  formError.value = ''

  try {
    // 1. Créer le test
    testStore.test = { name: form.name, subjectId: Number(form.subjectId) }
    const created = await testStore.createTest()
    if (!created) {
      formError.value = 'Erreur lors de la création de l\'exercice.'
      return
    }
    const testId = testStore.test.testId

    // 2. Créer les questions
    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i]
      const resp = await api.post('questions', {
        statement: q.statement,
        questionPosition: i,
        type: q.type,
        content: buildContent(q),
        idTest: testId,
      })
      if (!resp || resp.status !== 201) {
        formError.value = resp?.data?.message || `Erreur lors de la création de la question ${i + 1}.`
        return
      }
    }

    notif.notify('Exercice créé avec succès !', 'success')
    closeModal()
    await testStore.fetchTests()
  } finally {
    submitting.value = false
  }
}

// ── suppression ───────────────────────────────────────────────────────────────

async function deleteTest(test) {
  if (!confirm(`Supprimer l'exercice "${test.name}" ?`)) return
  const resp = await api.del(`tests/${test.testId}`)
  if (!resp || resp.status !== 204) {
    notif.notify(resp?.data?.message || 'Erreur lors de la suppression.', 'error')
    return
  }
  notif.notify('Exercice supprimé.', 'success')
  await testStore.fetchTests()
}
</script>
