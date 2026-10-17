<template>
        <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
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
                  <select aria-label="Enseignant" v-model="grantForm.teacherId" @change="grantForm.subjectId = null"
                    class="flex-1 rounded-lg border-2 border-gray-500 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
                    <option :value="null">Choisir un enseignant du groupe</option>
                    <option v-for="t in availableTeachers" :key="t.userId" :value="t.userId">{{ t.user?.name }}</option>
                  </select>
                  <select aria-label="Sujet" v-model="grantForm.subjectId"
                    class="flex-1 rounded-lg border-2 border-gray-500 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
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

  <!-- Modal confirmation révocation -->
    <ModalComponent
      :visible="revokeModal.visible"
      :title="`Révoquer l'accès à ${revokeModal.consent?.teacher?.name} (${revokeModal.consent?.subject ? revokeModal.consent.subject.name : 'Toutes matières'}) ?`"
      size="sm"
      @close="closeRevokeModal"
    >
      <p class="text-sm text-dark/70">
        <template v-if="revokeModal.consent?.subjectId">
          {{ revokeModal.consent.teacher?.name }} ne pourra plus consulter vos KPI de {{ revokeModal.consent.subject?.name }} dans ce groupe.
        </template>
        <template v-else>
          {{ revokeModal.consent?.teacher?.name }} ne pourra plus consulter l'ensemble de vos KPI personnels dans ce groupe.
        </template>
      </p>
      <template #footer>
        <button class="btn-modal-cancel" @click="closeRevokeModal">Annuler</button>
        <button class="btn-modal-danger" @click="confirmRevoke">Révoquer</button>
      </template>
    </ModalComponent>
</template>

<script setup>
// Partage des KPI personnels de l'étudiant avec les enseignants du groupe : accès accordés, ajout, révocation
// (avec modale de confirmation). Extrait de pages/ClassroomEtudiantView.vue.
import { computed, reactive } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useKpiConsentStore } from '@/stores/kpiConsent'
import { useSubjectStore } from '@/stores/subjects'
import { formatDate } from '@/helpers/classroomFormat'

const props = defineProps({
  // Le groupe affiché (avec ses membres) ; les consentements sont ceux de CE groupe
  group: { type: Object, required: true },
})

const kpiConsentStore = useKpiConsentStore()
const subjectStore = useSubjectStore()

const grantForm = reactive({ teacherId: null, subjectId: null })
const revokeModal = reactive({ visible: false, consent: null })

const consentsForGroup = computed(() =>
  kpiConsentStore.consents.filter((c) => c.classGroupId === props.group.id)
)

const teachersInGroup = computed(() =>
  props.group.members?.filter((m) => m.role === 'teacher') ?? []
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
  const ok = await kpiConsentStore.grantConsent(grantForm.teacherId, props.group.id, grantForm.subjectId)
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
</script>
