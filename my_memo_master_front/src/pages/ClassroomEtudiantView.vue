<template>
  <div class="space-y-6">

    <!-- Sélection du groupe -->
    <div class="flex gap-3 overflow-x-auto pb-1">
      <div
        v-for="g in groups" :key="g.id"
        @click="selectGroup(g.id)"
        :class="[selectedId === g.id ? 'border-primary bg-light/70' : 'border-gray', 'min-w-[200px] cursor-pointer rounded-xl border-2 p-3 shadow-sm transition hover:-translate-y-0.5']">
        <p class="text-xs text-dark/60 uppercase tracking-wide">{{ g.level }}</p>
        <p class="text-lg font-semibold text-primary">{{ g.name }}</p>
        <p class="text-xs text-dark/60">{{ g.code }}</p>
      </div>
      <p v-if="groups.length === 0" class="text-sm text-dark/60">Aucun groupe.</p>
    </div>

    <template v-if="currentGroup">

      <!-- Barre de recherche -->
      <div class="relative">
        <input
          v-model="search"
          type="text"
          placeholder="Rechercher une section, un rendu, une ressource..."
          class="w-full rounded-xl border-2 border-gray px-4 py-3 pr-10 text-sm focus:border-primary focus:outline-none transition" />
        <button v-if="search" @click="search = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-dark/40 hover:text-dark">✕</button>
      </div>

      <!-- Prochaines séances (pas filtrables par search) -->
      <section v-if="!search" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
        <h2 class="text-lg font-semibold text-dark">Prochaines séances</h2>
        <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
        <div v-else-if="upcomingOccurrences.length === 0" class="text-sm text-dark/60">Aucune séance prévue.</div>
        <div v-else class="space-y-2">
          <div v-for="occ in upcomingOccurrences" :key="occ.id"
            class="rounded-xl border border-gray px-4 py-3 flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-dark">{{ occ.calendarEvent?.name }}</p>
              <p class="text-xs text-dark/60">{{ formatDate(occ.date) }} · {{ occ.startTime?.slice(0,5) }} – {{ occ.endTime?.slice(0,5) }}</p>
            </div>
            <span :class="badgeType(occ.calendarEvent?.type)">{{ labelType(occ.calendarEvent?.type) }}</span>
          </div>
        </div>
      </section>

      <!-- Sections du cours -->
      <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
        <h2 class="text-lg font-semibold text-dark">Sections du cours</h2>
        <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
        <div v-else-if="filteredSections.length === 0" class="text-sm text-dark/60">
          {{ search ? 'Aucune section correspondante.' : 'Aucune section partagée.' }}
        </div>
        <div v-else class="space-y-2">
          <div v-for="s in filteredSections" :key="s.id"
            class="rounded-xl border border-gray px-4 py-3">
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary uppercase">Section</span>
              <p class="text-sm font-semibold text-dark">{{ s.title }}</p>
            </div>
            <p v-if="s.description" class="mt-1 text-xs text-dark/60">{{ s.description }}</p>
            <p v-if="s.dueDate" class="text-xs text-dark/40 mt-0.5">Cible : {{ formatDate(s.dueDate) }}</p>
          </div>
        </div>
      </section>

      <!-- Rendus à remettre -->
      <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
        <h2 class="text-lg font-semibold text-dark">Rendus à remettre</h2>
        <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
        <div v-else-if="filteredRendus.length === 0" class="text-sm text-dark/60">
          {{ search ? 'Aucun rendu correspondant.' : 'Aucun rendu à remettre.' }}
        </div>
        <div v-else class="space-y-3">
          <div v-for="r in filteredRendus" :key="r.id"
            :class="['rounded-xl border-2 px-4 py-4', isUrgent(r.dueDate) ? 'border-secondary/50 bg-secondary/5' : 'border-gray']">
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="flex items-center gap-2">
                  <span class="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary uppercase">Rendu</span>
                  <p class="text-sm font-semibold text-dark">{{ r.title }}</p>
                </div>
                <p v-if="r.description" class="mt-1 text-xs text-dark/60">{{ r.description }}</p>
                <p v-if="r.dueDate" :class="['text-xs mt-0.5', isUrgent(r.dueDate) ? 'text-secondary font-semibold' : 'text-dark/60']">
                  Date limite : {{ formatDate(r.dueDate) }}
                </p>
              </div>

              <!-- Statut soumission -->
              <div class="shrink-0 text-right">
                <div v-if="submissionStore.mySubmissions[r.id]">
                  <p class="text-xs text-success font-semibold">✓ Soumis</p>
                  <p class="text-xs text-dark/60">{{ submissionStore.mySubmissions[r.id].originalName }}</p>
                  <div class="flex gap-2 mt-1 justify-end">
                    <button @click="openFile(submissionStore.mySubmissions[r.id].fileKey)" class="text-xs text-primary underline">Voir</button>
                    <button @click="downloadFile(submissionStore.mySubmissions[r.id].fileKey, submissionStore.mySubmissions[r.id].originalName)" class="text-xs text-primary underline">Télécharger</button>
                    <button @click="retireRendu(r)" class="text-xs text-secondary underline">Retirer</button>
                  </div>
                </div>
                <span v-else class="text-xs text-dark/40">Non soumis</span>
              </div>
            </div>

            <!-- Zone upload si pas encore soumis -->
            <div v-if="!submissionStore.mySubmissions[r.id]" class="mt-3">
              <div
                @dragover.prevent="dragOverId = r.id"
                @dragleave.prevent="dragOverId = null"
                @drop.prevent="(e) => onDropRendu(e, r)"
                @click="() => triggerFileInput(r.id)"
                :class="[
                  'cursor-pointer rounded-xl border-2 border-dashed px-4 py-4 text-center transition',
                  dragOverId === r.id ? 'border-secondary bg-secondary/5' : 'border-gray hover:border-secondary/50'
                ]">
                <div v-if="pendingFiles[r.id]">
                  <p class="text-sm font-semibold text-dark">{{ pendingFiles[r.id].name }}</p>
                  <p class="text-xs text-dark/60 mt-0.5">{{ formatFileSize(pendingFiles[r.id].size) }}</p>
                  <button @click.stop="delete pendingFiles[r.id]" class="mt-1 text-xs text-secondary hover:underline">Retirer</button>
                </div>
                <div v-else>
                  <p class="text-sm text-dark/60">Glissez votre rendu ici ou <span class="text-secondary underline">parcourez</span></p>
                  <p class="text-xs text-dark/40 mt-1">PDF, Word, Image — max 10 Mo</p>
                </div>
              </div>
              <input :ref="el => fileInputs[r.id] = el" type="file"
                accept=".pdf,.doc,.docx,image/*"
                class="hidden"
                @change="(e) => onFileChangeRendu(e, r.id)" />

              <button v-if="pendingFiles[r.id]"
                @click="submitRendu(r)"
                :disabled="submissionStore.uploading"
                :class="[submissionStore.uploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-secondary/90', 'mt-2 w-full rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-light transition']">
                {{ submissionStore.uploading ? 'Envoi en cours...' : 'Remettre le rendu' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Échéances à venir -->
      <section v-if="!search" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
        <h2 class="text-lg font-semibold text-dark">Échéances à venir</h2>
        <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
        <div v-else-if="upcomingDeadlines.length === 0" class="text-sm text-dark/60">Aucune échéance prévue.</div>
        <div v-else class="space-y-2">
          <div v-for="dl in upcomingDeadlines" :key="dl.id"
            :class="['rounded-xl border px-4 py-3', isUrgent(dl.dueDate) ? 'border-secondary/50 bg-secondary/5' : 'border-gray']">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-dark">{{ dl.name }}</p>
                <p class="text-xs text-dark/60">
                  Séance : {{ dl.occurrence?.calendarEvent?.name }} ·
                  <span :class="isUrgent(dl.dueDate) ? 'text-secondary font-semibold' : ''">
                    {{ formatDate(dl.dueDate) }}{{ dl.dueTime ? ' à ' + dl.dueTime.slice(0,5) : '' }}
                  </span>
                </p>
              </div>
              <span class="rounded-full bg-gray px-2 py-1 text-xs text-dark/70">{{ deadlineTypeLabel(dl.type) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Ressources partagées -->
      <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
        <h2 class="text-lg font-semibold text-dark">Documents partagés</h2>
        <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
        <div v-else-if="filteredResources.length === 0" class="text-sm text-dark/60">
          {{ search ? 'Aucune ressource correspondante.' : 'Aucun document partagé.' }}
        </div>
        <div v-else class="space-y-2">
          <div v-for="r in filteredResources" :key="r.id"
            class="rounded-xl border border-gray px-4 py-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-xl">{{ fileIcon(r.mimeType) }}</span>
              <div>
                <p class="text-sm font-semibold text-dark">{{ r.title }}</p>
                <p class="text-xs text-dark/60">
                  {{ resourceTypeLabel(r.type) }} · {{ r.creator?.name }}
                  <span v-if="r.fileSize"> · {{ formatFileSize(r.fileSize) }}</span>
                </p>
              </div>
            </div>
            <button v-if="r.fileKey" @click="downloadFile(r.fileKey, null)"
              class="rounded-lg border border-primary px-3 py-1 text-xs text-primary hover:bg-primary hover:text-light transition">
              Télécharger
            </button>
          </div>
        </div>
      </section>

      <!-- [F] Partage de mes KPI -->
      <section v-if="!search" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
        <h2 class="text-lg font-semibold text-dark">Partage de mes KPI</h2>

        <div v-if="kpiConsentStore.loading" class="text-sm text-dark/60">Chargement des partages…</div>

        <template v-else>
          <!-- Consentements actifs pour ce groupe -->
          <div v-if="consentsForGroup.length > 0" class="space-y-2">
            <p class="text-sm font-medium text-dark/80">Accès accordés ({{ consentsForGroup.length }})</p>
            <div v-for="c in consentsForGroup" :key="c.id"
              class="rounded-xl border border-gray px-4 py-3 flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-dark">{{ c.teacher?.name }}</p>
                <p class="text-xs text-dark/60">
                  {{ c.classGroup?.name }} ·
                  {{ c.subject ? c.subject.name : 'Toutes matières' }} ·
                  {{ formatDate(c.grantedAt) }}
                </p>
              </div>
              <button @click="openRevokeModal(c)"
                class="rounded-lg border border-secondary px-3 py-1 text-xs text-secondary hover:bg-secondary hover:text-light transition">
                Révoquer
              </button>
            </div>
          </div>
          <p v-else class="text-sm text-dark/60">
            Vous n'avez autorisé aucun enseignant à consulter vos KPI personnels.
          </p>

          <!-- Formulaire d'ajout d'accès -->
          <div class="rounded-xl border-2 border-gray bg-light/40 p-4 space-y-3">
            <p class="text-sm font-semibold text-dark">
              {{ consentsForGroup.length ? 'Ajouter un accès' : 'Autoriser un enseignant' }}
            </p>

            <p v-if="teachersInGroup.length === 0" class="text-sm text-dark/60">
              Aucun enseignant disponible dans ce groupe.
            </p>
            <p v-else-if="availableTeachers.length === 0" class="text-sm text-dark/60">
              Tous les enseignants de ce groupe ont déjà accès à vos KPI.
            </p>
            <template v-else>
              <div class="flex flex-col gap-2 sm:flex-row">
                <select v-model="grantForm.teacherId" @change="grantForm.subjectId = null"
                  class="flex-1 rounded-lg border-2 border-gray bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option :value="null">Choisir un enseignant du groupe</option>
                  <option v-for="t in availableTeachers" :key="t.userId" :value="t.userId">{{ t.user?.name }}</option>
                </select>
                <select v-model="grantForm.subjectId"
                  class="flex-1 rounded-lg border-2 border-gray bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option :value="null">Toutes mes matières (accès global)</option>
                  <option v-for="s in availableSubjects" :key="s.subjectId" :value="s.subjectId">{{ s.name }}</option>
                </select>
              </div>
              <div class="flex justify-end">
                <button @click="grantAccess" :disabled="!grantForm.teacherId || kpiConsentStore.granting"
                  :class="[
                    'rounded-lg px-4 py-2 text-sm font-semibold transition',
                    (!grantForm.teacherId || kpiConsentStore.granting)
                      ? 'bg-gray text-dark/40 cursor-not-allowed'
                      : 'bg-primary text-light hover:bg-primary/90'
                  ]">
                  {{ kpiConsentStore.granting ? 'Envoi…' : "Accorder l'accès" }}
                </button>
              </div>
            </template>
          </div>
        </template>
      </section>

    </template>

  </div>

  <!-- Modal confirmation révocation -->
  <div v-if="revokeModal.visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-dark/40"
    role="dialog" aria-modal="true">
    <div class="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4 space-y-4">
      <p class="text-base font-semibold text-dark">
        Révoquer l'accès à {{ revokeModal.consent?.teacher?.name }}
        ({{ revokeModal.consent?.subject ? revokeModal.consent.subject.name : 'Toutes matières' }}) ?
      </p>
      <p class="text-sm text-dark/70">
        <template v-if="revokeModal.consent?.subjectId">
          {{ revokeModal.consent.teacher?.name }} ne pourra plus consulter vos KPI de {{ revokeModal.consent.subject?.name }} dans ce groupe.
        </template>
        <template v-else>
          {{ revokeModal.consent?.teacher?.name }} ne pourra plus consulter l'ensemble de vos KPI personnels dans ce groupe.
        </template>
      </p>
      <div class="flex justify-end gap-3">
        <button @click="closeRevokeModal"
          class="rounded-lg border-2 border-gray px-4 py-2 text-sm text-dark hover:bg-light transition">
          Annuler
        </button>
        <button @click="confirmRevoke"
          class="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-light hover:bg-secondary/90 transition">
          Révoquer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useClassGroupStore } from '@/stores/classGroups'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useDeadlineStore } from '@/stores/deadlines'
import { useClassGroupResourceStore } from '@/stores/classGroupResources'
import { useClassGroupSectionStore } from '@/stores/classGroupSections'
import { useClassGroupSubmissionStore } from '@/stores/classGroupSubmissions'
import { useKpiConsentStore } from '@/stores/kpiConsent'
import { useSubjectStore } from '@/stores/subjects'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

const classGroupStore = useClassGroupStore()
const calendarStore = useCalendarEventStore()
const deadlineStore = useDeadlineStore()
const resourceStore = useClassGroupResourceStore()
const sectionStore = useClassGroupSectionStore()
const submissionStore = useClassGroupSubmissionStore()
const kpiConsentStore = useKpiConsentStore()
const subjectStore = useSubjectStore()

const selectedId = ref(null)
const loading = ref(false)
const search = ref('')
const dragOverId = ref(null)
const pendingFiles = reactive({})
const fileInputs = reactive({})

const grantForm = reactive({ teacherId: null, subjectId: null })
const revokeModal = reactive({ visible: false, consent: null })

const groups = computed(() => classGroupStore.groups)
const currentGroup = computed(() => groups.value.find((g) => g.id === selectedId.value))

async function selectGroup(id) {
  selectedId.value = id
  loading.value = true
  search.value = ''
  await Promise.all([
    calendarStore.fetchByGroup(id),
    deadlineStore.fetchByGroup(id),
    resourceStore.fetchByGroup(id),
    sectionStore.fetchByGroup(id),
    kpiConsentStore.fetchMyConsents(),
  ])
  loading.value = false
  // Charge les soumissions propres à chaque rendu
  for (const s of sectionStore.sections.filter((s) => s.type === 'rendu')) {
    submissionStore.fetchMine(id, s.id)
  }
  // Charge la liste des matières si ce n'est pas encore fait
  if (!subjectStore.subjects.length) subjectStore.fetchSubjects()
}

onMounted(async () => {
  if (!classGroupStore.groups.length) await classGroupStore.fetchGroups()
  if (groups.value.length) selectGroup(groups.value[0].id)
})

watch(groups, (list) => {
  if (!selectedId.value && list.length) selectGroup(list[0].id)
})

// Sections filtrées
const filteredSections = computed(() => {
  const q = search.value.toLowerCase()
  return sectionStore.sections
    .filter((s) => s.type === 'section')
    .filter((s) => !q || s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))
})

// Rendus filtrés
const filteredRendus = computed(() => {
  const q = search.value.toLowerCase()
  return sectionStore.sections
    .filter((s) => s.type === 'rendu')
    .filter((s) => !q || s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))
})

// Ressources filtrées
const filteredResources = computed(() => {
  const q = search.value.toLowerCase()
  return resourceStore.resources.filter(
    (r) => !q || r.title.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q)
  )
})

// ── KPI consent ──────────────────────────────────────────────────────────────

const consentsForGroup = computed(() =>
  kpiConsentStore.consents.filter((c) => c.classGroupId === selectedId.value)
)

const teachersInGroup = computed(() =>
  currentGroup.value?.members?.filter((m) => m.role === 'teacher') ?? []
)

// Enseignants disponibles pour un nouveau partage : ceux sans consentement global dans ce groupe
const availableTeachers = computed(() =>
  teachersInGroup.value.filter((m) =>
    !consentsForGroup.value.find((c) => c.teacherId === m.userId && c.subjectId === null)
  )
)

// Matières disponibles pour l'enseignant sélectionné (exclut celles déjà accordées)
const availableSubjects = computed(() => {
  if (!grantForm.teacherId) return subjectStore.subjects
  const grantedIds = consentsForGroup.value
    .filter((c) => c.teacherId === grantForm.teacherId && c.subjectId !== null)
    .map((c) => c.subjectId)
  return subjectStore.subjects.filter((s) => !grantedIds.includes(s.subjectId))
})

async function grantAccess() {
  if (!grantForm.teacherId) return
  const ok = await kpiConsentStore.grantConsent(
    grantForm.teacherId,
    selectedId.value,
    grantForm.subjectId
  )
  if (ok) Object.assign(grantForm, { teacherId: null, subjectId: null })
}

function openRevokeModal(consent) {
  revokeModal.consent = consent
  revokeModal.visible = true
}

function closeRevokeModal() {
  revokeModal.visible = false
  revokeModal.consent = null
}

async function confirmRevoke() {
  const c = revokeModal.consent
  if (!c) return
  await kpiConsentStore.revokeConsent(c.teacherId, c.classGroupId, c.subjectId)
  closeRevokeModal()
}

// ── Séances & échéances ───────────────────────────────────────────────────────

const now = new Date()

const upcomingOccurrences = computed(() => {
  const all = calendarStore.groupEvents.flatMap((ev) =>
    (ev.occurrences ?? []).map((o) => ({ ...o, calendarEvent: ev }))
  )
  return all
    .filter((o) => new Date(`${o.date}T${o.startTime}`) > now)
    .sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`))
    .slice(0, 10)
})

const upcomingDeadlines = computed(() =>
  deadlineStore.groupDeadlines
    .filter((d) => new Date(d.dueDate) >= now)
    .slice(0, 10)
)

function isUrgent(dueDate) {
  if (!dueDate) return false
  return (new Date(dueDate) - now) / (1000 * 60 * 60 * 24) <= 3
}

// Gestion upload rendus
function triggerFileInput(sectionId) {
  fileInputs[sectionId]?.click()
}

function onDropRendu(event, rendu) {
  dragOverId.value = null
  const file = event.dataTransfer?.files?.[0]
  if (file) pendingFiles[rendu.id] = file
}

function onFileChangeRendu(event, sectionId) {
  const file = event.target?.files?.[0]
  if (file) pendingFiles[sectionId] = file
}

async function submitRendu(rendu) {
  const file = pendingFiles[rendu.id]
  if (!file) return
  const ok = await submissionStore.uploadAndSubmit(selectedId.value, rendu.id, file)
  if (ok) delete pendingFiles[rendu.id]
}

async function retireRendu(rendu) {
  const sub = submissionStore.mySubmissions[rendu.id]
  if (!sub) return
  await submissionStore.deleteSubmission(selectedId.value, rendu.id, sub.id)
}

async function downloadFile(fileKey, originalName) {
  if (!fileKey) { notif.notify('Aucun fichier associé.', 'error'); return }
  try {
    const resp = await api.get('storage/presign', { key: fileKey, disposition: 'attachment' })
    if (resp?.status === 200 && resp.data?.url) {
      window.location.href = resp.data.url
    } else {
      notif.notify('Impossible de télécharger le fichier.', 'error')
    }
  } catch {
    notif.notify('Impossible de télécharger le fichier.', 'error')
  }
}

async function openFile(fileKey) {
  if (!fileKey) { notif.notify('Aucun fichier associé.', 'error'); return }
  const newWindow = window.open('', '_blank')
  if (!newWindow) { notif.notify('Popup bloqué — autorisez les popups pour ce site.', 'error'); return }
  try {
    const resp = await api.get('storage/presign', { key: fileKey })
    if (resp?.status === 200 && resp.data?.url) {
      newWindow.location.href = resp.data.url
    } else {
      newWindow.close()
      notif.notify("Impossible d'ouvrir le fichier.", 'error')
    }
  } catch {
    newWindow.close()
    notif.notify("Impossible d'ouvrir le fichier.", 'error')
  }
}

// Helpers
function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function badgeType(type) {
  if (type === 'examen') return 'rounded-full bg-secondary/10 px-2 py-1 text-xs text-secondary'
  return 'rounded-full bg-primary/10 px-2 py-1 text-xs text-primary'
}

function labelType(type) {
  if (type === 'examen') return 'Examen'
  if (type === 'autre') return 'Autre'
  return 'Cours'
}

function deadlineTypeLabel(type) {
  const map = { ds: 'DS', devoir: 'Devoir', exposé: 'Exposé', autre: 'Autre' }
  return map[type] ?? type
}

function resourceTypeLabel(type) {
  const map = { cours: 'Cours', carte_mentale: 'Carte mentale', sujet: 'Sujet', autre: 'Autre' }
  return map[type] ?? type
}

function fileIcon(mimeType) {
  if (!mimeType) return '📄'
  if (mimeType === 'application/pdf') return '📕'
  if (mimeType.startsWith('image/')) return '🖼'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📈'
  return '📄'
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
</script>
