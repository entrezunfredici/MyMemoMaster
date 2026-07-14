<template>
  <div class="w-full max-w-4xl mx-auto p-6">

    <div class="flex items-center justify-between mb-6">
      <button @click="router.push('/flashcards')" class="text-primary font-semibold hover:underline">
        ← Retour
      </button>
      <h2 class="text-2xl font-bold text-heading">{{ systemName }}</h2>
      <button
        @click="openAddModal"
        class="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-5 rounded-lg transition"
      >
        + Ajouter une carte
      </button>
    </div>

    <div v-if="loading" class="text-center text-gray-light py-10">Chargement des cartes...</div>

    <div v-else>

      <!-- Boîtes du système -->
      <div class="mb-8 p-4 bg-white border border-gray-200 rounded-lg">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold uppercase text-gray-400">Boîtes du système</h3>
          <button @click="openAddBoxModal" class="text-sm text-primary hover:underline font-medium">+ Ajouter une boîte</button>
        </div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="box in systemBoxes"
            :key="box.idBox"
            class="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-sm"
          >
            <span class="font-semibold text-primary">B{{ box.level }}</span>
            <span class="text-gray-500">{{ box.intervall }}s</span>
            <button @click="openEditBoxModal(box)" class="text-gray-400 hover:text-primary" title="Modifier">✎</button>
            <button @click="handleDeleteBox(box)" class="text-gray-400 hover:text-red-500" title="Supprimer">✕</button>
          </div>
          <p v-if="systemBoxes.length === 0" class="text-gray-400 text-sm italic">Aucune boîte — ajoutez-en une pour commencer.</p>
        </div>
      </div>
      <div v-if="allCards.length === 0" class="text-center text-gray-light py-10">
        Aucune carte dans ce système. Ajoutez-en une !
      </div>

      <div v-for="level in [1, 2, 3, 4, 5]" :key="level" class="mb-6">
        <div v-if="cardsByLevel[level]?.length">
          <h3 class="text-sm font-bold uppercase text-gray-400 mb-2">Boîte {{ level }}</h3>
          <div class="flex flex-col gap-2">
            <div
              v-for="card in cardsByLevel[level]"
              :key="card.idCard"
              class="flex items-start justify-between bg-white border border-gray-200 rounded-lg p-4 shadow-xs"
            >
              <div class="flex-1 min-w-0 pr-4">
                <p class="font-semibold text-heading"><FormulaText :text="card.question?.statement || ''" /></p>
                <p class="text-sm text-gray-500 mt-1 italic"><FormulaText :text="card.correctAnswer || '…'" /></p>
              </div>
              <div class="flex gap-2 flex-shrink-0">
                <button
                  @click="openEditModal(card)"
                  class="hover:bg-gray-100 text-gray-600 py-1 px-2 rounded border border-gray-300 transition"
                  title="Modifier"
                >✎</button>
                <button
                  @click="handleDelete(card)"
                  class="hover:bg-red-50 text-gray-600 py-1 px-2 rounded border border-gray-300 transition"
                  title="Supprimer"
                >✕</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal ajouter / modifier -->
    <div
      v-if="showModal"
      class="modal-overlay"
      @click="closeModal"
    >
      <div class="modal-panel" @click.stop>
        <button
          @click="closeModal"
          class="modal-close"
          title="Fermer"
        >&times;</button>
        <h2 class="modal-title">
          {{ editingCard ? 'Modifier la carte' : 'Nouvelle carte' }}
        </h2>

        <form @submit.prevent="submitForm">
          <!-- Type de question (uniquement en création) -->
          <div v-if="!editingCard" class="form-group">
            <label class="form-label">Type de question</label>
            <div class="flex gap-3">
              <button
                type="button"
                class="flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition font-semibold text-sm"
                :class="form.type === 'open' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-400'"
                @click="selectType('open')"
              >
                Ouverte
              </button>
              <button
                type="button"
                class="flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition font-semibold text-sm"
                :class="form.type === 'mcq' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-400'"
                @click="selectType('mcq')"
              >
                QCM
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Question</label>
            <FormulaHelper v-model="form.statement">
              <textarea aria-label="Énoncé de la carte"
                v-model="form.statement"
                placeholder="Quelle est la loi d'Ohm ? (formules entre $…$)"
                class="form-input"
                rows="3"
                required
              />
            </FormulaHelper>
          </div>

          <!-- Champ réponse : open uniquement -->
          <div v-if="form.type === 'open'" class="form-group--lg">
            <label class="form-label">Réponse correcte</label>
            <FormulaHelper v-model="form.answer">
              <textarea aria-label="Réponse de la carte"
                v-model="form.answer"
                placeholder="U = R × I"
                class="form-input"
                rows="2"
                required
              />
            </FormulaHelper>
          </div>

          <!-- Options MCQ -->
          <div v-else class="form-group--lg">
            <label class="form-label">Options (sélectionne la bonne réponse)</label>
            <div class="space-y-2">
              <div v-for="(opt, oi) in form.mcqOptions" :key="oi" class="flex items-center gap-2">
                <input :aria-label="`Marquer l'option ${oi + 1} comme correcte`"
                  type="radio"
                  :name="`mcq-correct-card`"
                  :checked="opt.correct"
                  @change="setMcqCorrect(oi)"
                  class="accent-primary shrink-0"
                />
                <input :aria-label="`Texte de l'option ${oi + 1}`"
                  :value="opt.text"
                  @input="setOptionText(oi, $event.target.value)"
                  type="text"
                  :placeholder="`Option ${oi + 1}...`"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <button
                  v-if="form.mcqOptions.length > 2"
                  type="button"
                  @click="removeMcqOption(oi)"
                  class="text-gray-400 hover:text-red-500 text-lg leading-none"
                >✕</button>
              </div>
            </div>
            <button
              type="button"
              @click="addMcqOption()"
              class="mt-2 text-sm text-primary hover:underline font-medium"
            >
              + Ajouter une option
            </button>
          </div>

          <p v-if="formError" class="text-red-600 text-sm mb-4">{{ formError }}</p>

          <div class="btn-row">
            <button
              type="submit"
              :disabled="submitting"
              class="btn-modal-submit"
            >
              {{ submitting ? 'Enregistrement...' : editingCard ? 'Modifier' : 'Ajouter' }}
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

    <!-- Modal boîte -->
    <div
      v-if="showBoxModal"
      class="modal-overlay"
      @click="closeBoxModal"
    >
      <div class="modal-panel modal-panel--sm" @click.stop>
        <button aria-label="Fermer" @click="closeBoxModal" class="modal-close">&times;</button>
        <h2 class="modal-title">
          {{ editingBox ? 'Modifier la boîte' : 'Nouvelle boîte' }}
        </h2>
        <form @submit.prevent="submitBoxForm">
          <div class="form-group">
            <label class="form-label">Niveau</label>
            <input aria-label="Niveau de la boîte"
              v-model="boxForm.level"
              type="number"
              min="1"
              placeholder="Ex : 2"
              class="form-input"
              required
            />
          </div>
          <div class="form-group--lg">
            <label class="form-label">Intervalle (secondes)</label>
            <input aria-label="Intervalle en secondes"
              v-model="boxForm.intervall"
              type="number"
              min="1"
              placeholder="Ex : 10"
              class="form-input"
              required
            />
          </div>
          <p v-if="boxFormError" class="text-red-600 text-sm mb-4">{{ boxFormError }}</p>
          <div class="btn-row">
            <button
              type="submit"
              :disabled="submittingBox"
              class="btn-modal-submit"
            >
              {{ submittingBox ? 'Enregistrement...' : editingBox ? 'Modifier' : 'Ajouter' }}
            </button>
            <button type="button" @click="closeBoxModal" class="btn-modal-cancel">
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
import { useRouter, useRoute } from 'vue-router'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'
import FormulaText from '@/components/FormulaTextComponent.vue'
import FormulaHelper from '@/components/FormulaHelperComponent.vue'
import { normalizeFormulaSyntax } from '@/components/interpreter/interpreter.js'

const router = useRouter()
const route = useRoute()
const systemId = Number(route.params.systemId)

const loading = ref(true)
const systemName = ref('')
const allCards = ref([])
const systemBoxes = ref([])

// --- cartes ---
const showModal = ref(false)
const submitting = ref(false)
const formError = ref('')
const editingCard = ref(null)
const form = reactive({
  statement: '',
  answer: '',
  type: 'open',
  mcqOptions: [{ text: '', correct: true }, { text: '', correct: false }],
})

// --- boîtes ---
const showBoxModal = ref(false)
const submittingBox = ref(false)
const boxFormError = ref('')
const editingBox = ref(null)
const boxForm = reactive({ level: '', intervall: '' })

const cardsByLevel = computed(() => {
  const map = {}
  allCards.value.forEach(card => {
    const level = card.leitnerBox?.level ?? 1
    if (!map[level]) map[level] = []
    map[level].push(card)
  })
  return map
})

const loadCards = async () => {
  const [sysResp, boxResp] = await Promise.all([
    api.get(`leitnersystems/${systemId}`),
    api.get('leitnerboxes'),
  ])

  if (sysResp?.status === 200) systemName.value = sysResp.data.name
  if (!boxResp || boxResp.status !== 200) return

  const boxes = boxResp.data.filter(b => b.idSystem === systemId).sort((a, b) => a.level - b.level)
  systemBoxes.value = boxes

  const cardArrays = await Promise.all(
    boxes.map(box => api.get(`leitnercards/leitnerboxes/${box.idBox}`))
  )

  const cards = cardArrays
    .filter(r => r?.status === 200)
    .flatMap(r => r.data)

  // Charger la réponse correcte pour chaque carte
  await Promise.all(cards.map(async (card) => {
    const resp = await api.get(`responses/question/${card.idQuestion}`)
    if (resp?.status === 200) {
      const correct = resp.data.find(r => r.correction === true)
      card.correctAnswer = correct?.content || ''
      card.idResponse = correct?.idResponse || null
    }
  }))

  allCards.value = cards
}

onMounted(async () => {
  await loadCards()
  loading.value = false
})

const selectType = (newType) => {
  if (form.type === newType) return
  form.type = newType
  form.answer = ''
  form.mcqOptions = [{ text: '', correct: true }, { text: '', correct: false }]
}

const setOptionText = (idx, value) => {
  form.mcqOptions = form.mcqOptions.map((o, i) => i === idx ? { ...o, text: value } : o)
}

const setMcqCorrect = (correctIdx) => {
  form.mcqOptions = form.mcqOptions.map((o, i) => ({ ...o, correct: i === correctIdx }))
}

const addMcqOption = () => {
  form.mcqOptions = [...form.mcqOptions, { text: '', correct: false }]
}

const removeMcqOption = (idx) => {
  form.mcqOptions = form.mcqOptions.filter((_, i) => i !== idx)
}

const openAddModal = () => {
  editingCard.value = null
  form.statement = ''
  form.answer = ''
  form.type = 'open'
  form.mcqOptions = [{ text: '', correct: true }, { text: '', correct: false }]
  formError.value = ''
  showModal.value = true
}

const openEditModal = async (card) => {
  editingCard.value = card
  form.statement = card.question?.statement || ''
  form.answer = card.correctAnswer || ''
  form.type = card.question?.type || 'open'
  if (form.type === 'mcq' && Array.isArray(card.question?.content?.options)) {
    form.mcqOptions = card.question.content.options.map(o => ({ text: o.text, correct: !!o.correct }))
  } else {
    form.mcqOptions = [{ text: '', correct: true }, { text: '', correct: false }]
  }
  formError.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingCard.value = null
  form.statement = ''
  form.answer = ''
  form.type = 'open'
  form.mcqOptions = [{ text: '', correct: true }, { text: '', correct: false }]
  formError.value = ''
}

const submitForm = async () => {
  submitting.value = true
  formError.value = ''

  try {
    if (editingCard.value) {
      await handleUpdate()
    } else {
      await handleCreate()
    }
  } finally {
    submitting.value = false
  }
}

const handleCreate = async () => {
  if (form.type === 'mcq') {
    if (form.mcqOptions.some(o => !o.text.trim())) {
      formError.value = 'Toutes les options doivent avoir un texte.'
      return
    }
    if (!form.mcqOptions.some(o => o.correct)) {
      formError.value = 'Sélectionne la bonne réponse (radio).'
      return
    }
  }

  // 1. Créer la question (contenu selon le type) — syntaxe de formule normalisée
  const questionPayload = {
    statement: normalizeFormulaSyntax(form.statement),
    questionPosition: 0,
    type: form.type,
    content: form.type === 'mcq'
      ? { options: form.mcqOptions.map(o => ({ text: normalizeFormulaSyntax(o.text), correct: o.correct })) }
      : null,
  }

  const qResp = await api.post('questions', questionPayload)
  if (!qResp || qResp.status !== 201) {
    formError.value = qResp?.data?.message || 'Erreur lors de la création de la question.'
    return
  }
  const idQuestion = qResp.data.idQuestion

  // 2. Créer la réponse correcte (open uniquement — la correction MCQ est dans content)
  if (form.type === 'open') {
    const rResp = await api.post('responses', {
      content: normalizeFormulaSyntax(form.answer),
      correction: true,
      idQuestion,
    })
    if (!rResp || rResp.status !== 201) {
      formError.value = rResp?.data?.message || 'Erreur lors de la création de la réponse.'
      return
    }
  }

  // 3. Créer la carte
  const cResp = await api.post('leitnercards', { idQuestion, idSystem: systemId })
  if (!cResp || cResp.status !== 201) {
    formError.value = cResp?.data?.message || 'Erreur lors de la création de la carte.'
    return
  }

  notif.notify('Carte ajoutée avec succès.', 'success')
  closeModal()
  loading.value = true
  await loadCards()
  loading.value = false
}

const handleUpdate = async () => {
  const card = editingCard.value
  const isMcq = card.question?.type === 'mcq'

  if (isMcq && form.mcqOptions.some(o => !o.text.trim())) {
    formError.value = 'Toutes les options doivent avoir un texte.'
    return
  }

  const qPayload = { statement: normalizeFormulaSyntax(form.statement) }
  if (isMcq) {
    qPayload.content = { options: form.mcqOptions.map(o => ({ text: normalizeFormulaSyntax(o.text), correct: o.correct })) }
  }

  const qResp = await api.put(`questions/edit/${card.idQuestion}`, qPayload)
  if (!qResp || qResp.status !== 200) {
    formError.value = qResp?.data?.message || 'Erreur lors de la mise à jour de la question.'
    return
  }

  // Réponse uniquement pour les cartes ouvertes
  if (!isMcq) {
    if (card.idResponse) {
      const rResp = await api.put(`responses/edit/${card.idResponse}`, { content: normalizeFormulaSyntax(form.answer) })
      if (!rResp || rResp.status !== 200) {
        formError.value = rResp?.data?.message || 'Erreur lors de la mise à jour de la réponse.'
        return
      }
    } else if (form.answer.trim()) {
      const rResp = await api.post('responses', {
        content: normalizeFormulaSyntax(form.answer),
        correction: true,
        idQuestion: card.idQuestion,
      })
      if (!rResp || rResp.status !== 201) {
        formError.value = rResp?.data?.message || 'Erreur lors de la création de la réponse.'
        return
      }
    }
  }

  notif.notify('Carte mise à jour avec succès.', 'success')
  closeModal()
  loading.value = true
  await loadCards()
  loading.value = false
}

const handleDelete = async (card) => {
  if (!confirm(`Supprimer cette carte ?\n"${card.question?.statement}"`)) return

  const resp = await api.del(`leitnercards/${card.idCard}`)
  if (!resp || resp.status !== 200) {
    notif.notify(resp?.data?.message || 'Erreur lors de la suppression.', 'error')
    return
  }

  notif.notify('Carte supprimée.', 'success')
  allCards.value = allCards.value.filter(c => c.idCard !== card.idCard)
}

const openAddBoxModal = () => {
  editingBox.value = null
  boxForm.level = ''
  boxForm.intervall = ''
  boxFormError.value = ''
  showBoxModal.value = true
}

const openEditBoxModal = (box) => {
  editingBox.value = box
  boxForm.level = box.level
  boxForm.intervall = box.intervall
  boxFormError.value = ''
  showBoxModal.value = true
}

const closeBoxModal = () => {
  showBoxModal.value = false
  editingBox.value = null
  boxForm.level = ''
  boxForm.intervall = ''
  boxFormError.value = ''
}

const submitBoxForm = async () => {
  submittingBox.value = true
  boxFormError.value = ''
  const data = { level: Number(boxForm.level), intervall: Number(boxForm.intervall), color: 123456, idSystem: systemId }
  const resp = editingBox.value
    ? await api.put(`leitnerboxes/${editingBox.value.idBox}`, data)
    : await api.post('leitnerboxes', data)
  const expectedStatus = editingBox.value ? 200 : 201
  if (!resp || resp.status !== expectedStatus) {
    boxFormError.value = resp?.data?.message || 'Erreur lors de l\'enregistrement.'
    submittingBox.value = false
    return
  }
  notif.notify(editingBox.value ? 'Boîte mise à jour.' : 'Boîte ajoutée.', 'success')
  closeBoxModal()
  loading.value = true
  await loadCards()
  loading.value = false
  submittingBox.value = false
}

const handleDeleteBox = async (box) => {
  if (!confirm(`Supprimer la boîte niveau ${box.level} ? Les cartes qu'elle contient resteront mais n'auront plus de boîte.`)) return
  const resp = await api.del(`leitnerboxes/${box.idBox}`)
  if (!resp || resp.status !== 200) {
    notif.notify(resp?.data?.message || 'Erreur lors de la suppression.', 'error')
    return
  }
  notif.notify('Boîte supprimée.', 'success')
  systemBoxes.value = systemBoxes.value.filter(b => b.idBox !== box.idBox)
}
</script>
