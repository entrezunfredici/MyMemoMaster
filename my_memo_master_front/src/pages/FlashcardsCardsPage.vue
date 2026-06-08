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
                <p class="font-semibold text-heading">{{ card.question?.statement }}</p>
                <p class="text-sm text-gray-500 mt-1 italic">{{ card.correctAnswer || '…' }}</p>
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
      class="fixed inset-0 flex items-center justify-center z-50"
      style="background-color: rgba(0,0,0,0.5)"
      @click="closeModal"
    >
      <div class="rounded-lg shadow-xl p-8 w-full max-w-md relative" style="background-color: white" @click.stop>
        <button
          @click="closeModal"
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl leading-none font-bold"
          title="Fermer"
        >&times;</button>
        <h2 class="text-xl font-bold mb-6 text-heading">
          {{ editingCard ? 'Modifier la carte' : 'Nouvelle carte' }}
        </h2>

        <form @submit.prevent="submitForm">
          <div class="mb-4">
            <label class="block text-sm font-semibold text-heading mb-2">Question</label>
            <textarea
              v-model="form.statement"
              placeholder="Quelle est la loi d'Ohm ?"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows="3"
              required
            />
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-heading mb-2">Réponse correcte</label>
            <textarea
              v-model="form.answer"
              placeholder="U = R × I"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows="2"
              required
            />
          </div>

          <p v-if="formError" class="text-red-600 text-sm mb-4">{{ formError }}</p>

          <div class="flex gap-4">
            <button
              type="submit"
              :disabled="submitting"
              class="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50"
            >
              {{ submitting ? 'Enregistrement...' : editingCard ? 'Modifier' : 'Ajouter' }}
            </button>
            <button
              type="button"
              @click="closeModal"
              class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg transition"
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
      class="fixed inset-0 flex items-center justify-center z-50"
      style="background-color: rgba(0,0,0,0.5)"
      @click="closeBoxModal"
    >
      <div class="rounded-lg shadow-xl p-8 w-full max-w-sm relative" style="background-color: white" @click.stop>
        <button @click="closeBoxModal" class="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl leading-none font-bold">&times;</button>
        <h2 class="text-xl font-bold mb-6 text-heading">
          {{ editingBox ? 'Modifier la boîte' : 'Nouvelle boîte' }}
        </h2>
        <form @submit.prevent="submitBoxForm">
          <div class="mb-4">
            <label class="block text-sm font-semibold text-heading mb-2">Niveau</label>
            <input
              v-model="boxForm.level"
              type="number"
              min="1"
              placeholder="Ex : 2"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div class="mb-6">
            <label class="block text-sm font-semibold text-heading mb-2">Intervalle (secondes)</label>
            <input
              v-model="boxForm.intervall"
              type="number"
              min="1"
              placeholder="Ex : 10"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <p v-if="boxFormError" class="text-red-600 text-sm mb-4">{{ boxFormError }}</p>
          <div class="flex gap-4">
            <button
              type="submit"
              :disabled="submittingBox"
              class="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50"
            >
              {{ submittingBox ? 'Enregistrement...' : editingBox ? 'Modifier' : 'Ajouter' }}
            </button>
            <button type="button" @click="closeBoxModal" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg transition">
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
const form = reactive({ statement: '', answer: '' })

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

const openAddModal = () => {
  editingCard.value = null
  form.statement = ''
  form.answer = ''
  formError.value = ''
  showModal.value = true
}

const openEditModal = async (card) => {
  editingCard.value = card
  form.statement = card.question?.statement || ''
  form.answer = card.correctAnswer || ''
  formError.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingCard.value = null
  form.statement = ''
  form.answer = ''
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
  // 1. Créer la question
  const qResp = await api.post('questions', {
    statement: form.statement,
    questionPosition: 0,
    type: 'open',
  })
  if (!qResp || qResp.status !== 201) {
    formError.value = qResp?.data?.message || 'Erreur lors de la création de la question.'
    return
  }
  const idQuestion = qResp.data.idQuestion

  // 2. Créer la réponse correcte
  const rResp = await api.post('responses', {
    content: form.answer,
    correction: true,
    idQuestion,
  })
  if (!rResp || rResp.status !== 201) {
    formError.value = rResp?.data?.message || 'Erreur lors de la création de la réponse.'
    return
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

  // Mettre à jour la question
  const qResp = await api.put(`questions/${card.idQuestion}`, { statement: form.statement })
  if (!qResp || qResp.status !== 200) {
    formError.value = qResp?.data?.message || 'Erreur lors de la mise à jour de la question.'
    return
  }

  // Mettre à jour la réponse si elle existe, sinon la créer (carte orpheline)
  if (card.idResponse) {
    const rResp = await api.put(`responses/${card.idResponse}`, { content: form.answer })
    if (!rResp || rResp.status !== 200) {
      formError.value = rResp?.data?.message || 'Erreur lors de la mise à jour de la réponse.'
      return
    }
  } else if (form.answer.trim()) {
    const rResp = await api.post('responses', {
      content: form.answer,
      correction: true,
      idQuestion: card.idQuestion,
    })
    if (!rResp || rResp.status !== 201) {
      formError.value = rResp?.data?.message || 'Erreur lors de la création de la réponse.'
      return
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
