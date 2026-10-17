<template>
  <div class="space-y-6">

    <!-- Sélection du groupe -->
    <TeacherGroupPicker :groups="groups" :selected-id="selectedId" @select="selectGroup" />

    <template v-if="currentGroup">
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">

        <!-- Colonne principale -->
        <div class="space-y-4 lg:col-span-2">
          <TeacherAnalyticsPanel :group-id="currentGroup.id" :refresh-token="refreshToken" />
          <TeacherSectionsPanel :group-id="currentGroup.id" :loading="loadingData" :refresh-token="refreshToken" />
          <TeacherDeadlinesPanel :group-id="currentGroup.id" :loading="loadingData" />
        </div>

        <!-- Colonne droite -->
        <div class="space-y-4">
          <TeacherSectionForm :group-id="currentGroup.id" />
          <TeacherResourceForm :group-id="currentGroup.id" />
          <TeacherResourceList :group-id="currentGroup.id" />
          <TeacherDeadlineForm :group-id="currentGroup.id" />
          <TeacherInviteForm :group-id="currentGroup.id" />
          <TeacherMembersPanel :group="currentGroup" />
        </div>
      </div>
    </template>

    <div v-else class="rounded-2xl border-2 border-gray bg-white p-6 text-center text-dark/70">
      Sélectionnez un groupe pour accéder à votre espace enseignant.
    </div>
  </div>

  <!-- Modal confirmation suppression/retrait -->
  <ModalComponent
    :visible="confirmModal.visible"
    :title="confirmModal.title"
    size="sm"
    @close="closeConfirmModal"
  >
    <p class="text-sm text-dark/70">{{ confirmModal.message }}</p>
    <template #footer>
      <button class="btn-modal-cancel" @click="closeConfirmModal">Annuler</button>
      <button class="btn-modal-danger" @click="runConfirmedAction">Confirmer</button>
    </template>
  </ModalComponent>
</template>

<script setup>
// Vue « Enseignant » de la page Classe : choix du groupe, puis un panneau par fonction (analyse, sections
// et rendus, échéances, ressources, invitations, membres) dans components/classroom/teacher/. La page ne
// porte que la sélection du groupe, le chargement de ses données et la modale de confirmation commune
// (fournie aux panneaux par provideConfirmAction).
import { ref, computed, onMounted, watch } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TeacherGroupPicker from '@/components/classroom/teacher/TeacherGroupPicker.vue'
import TeacherAnalyticsPanel from '@/components/classroom/teacher/TeacherAnalyticsPanel.vue'
import TeacherSectionsPanel from '@/components/classroom/teacher/TeacherSectionsPanel.vue'
import TeacherDeadlinesPanel from '@/components/classroom/teacher/TeacherDeadlinesPanel.vue'
import TeacherSectionForm from '@/components/classroom/teacher/TeacherSectionForm.vue'
import TeacherResourceForm from '@/components/classroom/teacher/TeacherResourceForm.vue'
import TeacherResourceList from '@/components/classroom/teacher/TeacherResourceList.vue'
import TeacherDeadlineForm from '@/components/classroom/teacher/TeacherDeadlineForm.vue'
import TeacherInviteForm from '@/components/classroom/teacher/TeacherInviteForm.vue'
import TeacherMembersPanel from '@/components/classroom/teacher/TeacherMembersPanel.vue'
import { useClassGroupStore } from '@/stores/classGroups'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useDeadlineStore } from '@/stores/deadlines'
import { useTestStore } from '@/stores/tests'
import { useClassGroupSectionStore } from '@/stores/classGroupSections'
import { useClassGroupResourceStore } from '@/stores/classGroupResources'
import { useAuthStore } from '@/stores/auth'
import { useKpiConsentStore } from '@/stores/kpiConsent'
import { useClassGroupSubmissionStore } from '@/stores/classGroupSubmissions'
import { useInvitationStore } from '@/stores/invitations'
import { useRole } from '@/composables/useRole'
import { provideConfirmAction } from '@/composables/useConfirmAction'

const { isAdminEtablissement } = useRole()
const classGroupStore = useClassGroupStore()
const calendarStore = useCalendarEventStore()
const deadlineStore = useDeadlineStore()
const testStore = useTestStore()
const sectionStore = useClassGroupSectionStore()
const resourceStore = useClassGroupResourceStore()
const authStore = useAuthStore()
const kpiConsentStore = useKpiConsentStore()
const submissionStore = useClassGroupSubmissionStore()
const invitationStore = useInvitationStore()

const { confirmModal, closeConfirmModal, runConfirmedAction } = provideConfirmAction()

const selectedId = ref(null)
const loadingData = ref(false)
// Incrémenté à chaque sélection (y compris du groupe déjà affiché) : les panneaux se rechargent / se replient
const refreshToken = ref(0)

// Le gérant d'établissement voit tous les groupes ; un enseignant ne voit que les siens
const groups = computed(() => {
  if (isAdminEtablissement.value) return classGroupStore.groups
  const userId = authStore.user?.userId
  return classGroupStore.groups.filter((g) =>
    g.members?.some((m) => m.userId === userId && m.role === 'teacher'),
  )
})

const currentGroup = computed(() => classGroupStore.groups.find((g) => g.id === selectedId.value))

async function selectGroup(id) {
  selectedId.value = id
  refreshToken.value++
  loadingData.value = true
  kpiConsentStore.clearStudentKpis()
  submissionStore.clearSectionSubmissions()
  submissionStore.clearSubmissionStatus()
  await Promise.all([
    calendarStore.fetchByGroup(id, true),
    deadlineStore.fetchByGroup(id),
    sectionStore.fetchByGroup(id),
    resourceStore.fetchByGroup(id),
    invitationStore.fetchByGroup(id),
  ])
  loadingData.value = false
}

onMounted(async () => {
  if (!classGroupStore.groups.length) await classGroupStore.fetchGroups()
  if (!testStore.tests.length) testStore.fetchTests()
  if (groups.value.length) selectGroup(groups.value[0].id)
})

watch(groups, (list) => {
  if (!selectedId.value && list.length) selectGroup(list[0].id)
})
</script>
