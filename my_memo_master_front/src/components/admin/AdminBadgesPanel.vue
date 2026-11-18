<template>
  <section aria-labelledby="admin-badges-title" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
    <h2 id="admin-badges-title" class="text-lg font-semibold text-dark">Badges et matières</h2>
    <p class="text-sm text-dark/70">
      Un badge lié à des matières ne compte que l'activité de ces matières. Sans matière cochée, il reste global.
      Les badges déjà obtenus restent acquis.
    </p>

    <p v-if="loading" role="status" class="text-sm text-dark/70">Chargement…</p>
    <div v-else-if="error" role="alert" class="space-y-2">
      <p class="text-sm text-red-700">Impossible de charger les badges ou les matières.</p>
      <button type="button" class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light" @click="load">Réessayer</button>
    </div>
    <p v-else-if="rows.length === 0" class="text-sm text-dark/70">Aucun badge ne peut être lié à des matières.</p>
    <p v-else-if="subjects.length === 0" class="text-sm text-dark/70">Aucune matière n'existe encore : créez-en une pour pouvoir la lier.</p>

    <ul v-else class="space-y-4" data-testid="admin-badge-list">
      <li v-for="row in rows" :key="row.code" class="rounded-xl border-2 border-gray-100 p-3">
        <fieldset class="space-y-2" :disabled="row.saving">
          <legend class="flex items-center gap-2 text-sm font-semibold text-dark">
            <span aria-hidden="true">{{ row.icon }}</span>
            {{ row.label }}
          </legend>
          <p class="text-sm text-dark/70">{{ row.description }}</p>
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            <label v-for="subject in subjects" :key="subject.subjectId" class="flex items-center gap-2 text-sm text-dark">
              <input
                type="checkbox"
                class="accent-primary"
                :checked="row.draft.includes(subject.subjectId)"
                :data-testid="`subject-${row.code}-${subject.subjectId}`"
                @change="toggle(row, subject.subjectId)"
              />
              {{ subject.name }}
            </label>
          </div>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light disabled:opacity-50"
              :disabled="!isDirty(row) || row.saving"
              :aria-label="`Enregistrer les matières du badge ${row.label}`"
              @click="save(row)"
            >
              {{ row.saving ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
            <span v-if="row.draft.length === 0" class="text-xs text-dark/70">Badge global</span>
          </div>
        </fieldset>
      </li>
    </ul>
  </section>
</template>

<script setup>
// Administration des liens badge ↔ matières (PUT /badges/:code/subjects, rôle 1). Seuls les badges
// restreignables (`scopable`) sont listés ; chaque badge s'enregistre à part.
import { onMounted, reactive, ref } from 'vue'
import { badgesApi } from '@/helpers/badgesApi'
import { notif } from '@/helpers/notif'
import { useSubjectStore } from '@/stores/subjects'

const subjectStore = useSubjectStore()
const rows = ref([])
const subjects = ref([])
const loading = ref(true)
const error = ref(false)

const sameIds = (a, b) => a.length === b.length && [...a].sort().every((id, i) => id === [...b].sort()[i])
const isDirty = (row) => !sameIds(row.draft, row.saved)

function toggle(row, subjectId) {
  row.draft = row.draft.includes(subjectId) ? row.draft.filter((id) => id !== subjectId) : [...row.draft, subjectId]
}

async function load() {
  loading.value = true
  error.value = false
  try {
    const [badgesResp, subjectsOk] = await Promise.all([badgesApi.list(), subjectStore.fetchSubjects()])
    if (badgesResp?.status !== 200 || !subjectsOk) {
      error.value = true
      return
    }
    subjects.value = subjectStore.subjects
    rows.value = badgesResp.data
      .filter((badge) => badge.scopable)
      .map((badge) => reactive({ ...badge, saved: [...badge.linkedSubjectIds], draft: [...badge.linkedSubjectIds], saving: false }))
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function save(row) {
  row.saving = true
  try {
    const resp = await badgesApi.setSubjects(row.code, row.draft)
    if (resp?.status !== 200) {
      notif.notify(resp?.data?.message || "Erreur lors de l'enregistrement des matières du badge.", 'error')
      return
    }
    row.saved = [...resp.data.subjectIds]
    row.draft = [...resp.data.subjectIds]
    notif.notify('Matières du badge enregistrées.', 'success')
  } catch {
    notif.notify("Erreur lors de l'enregistrement des matières du badge.", 'error')
  } finally {
    row.saving = false
  }
}

onMounted(load)
</script>
