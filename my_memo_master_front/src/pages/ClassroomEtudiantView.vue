<template>
  <div class="space-y-6">

    <!-- Sélection du groupe -->
    <StudentGroupPicker :groups="groups" :selected-id="selectedId" @select="selectGroup" />

    <template v-if="currentGroup">

      <!-- Barre de recherche -->
      <StudentSearchBar v-model="search" />

      <!-- Prochaines séances (pas filtrables par search) -->
      <StudentUpcomingSessions v-if="!search" :loading="loading" />

      <!-- Sections du cours -->
      <StudentSections :loading="loading" :search="search" />

      <!-- Rendus à remettre -->
      <StudentRendus :group-id="currentGroup.id" :loading="loading" :search="search" />

      <!-- Échéances à venir -->
      <StudentDeadlines v-if="!search" :loading="loading" />

      <!-- Ressources partagées -->
      <StudentResources :loading="loading" :search="search" />

      <!-- Partage de mes KPI -->
      <StudentKpiSharing v-if="!search" :group="currentGroup" />

    </template>

  </div>
</template>

<script setup>
// Vue « Étudiant » de la page Classe : choix du groupe et recherche, puis une section par fonction (séances,
// sections, rendus, échéances, documents, partage de KPI) dans components/classroom/student/. La page ne porte
// que la sélection du groupe, le chargement de ses données et le texte de recherche partagé.
import { ref, computed, onMounted, watch } from 'vue'
import StudentGroupPicker from '@/components/classroom/student/StudentGroupPicker.vue'
import StudentSearchBar from '@/components/classroom/student/StudentSearchBar.vue'
import StudentUpcomingSessions from '@/components/classroom/student/StudentUpcomingSessions.vue'
import StudentSections from '@/components/classroom/student/StudentSections.vue'
import StudentRendus from '@/components/classroom/student/StudentRendus.vue'
import StudentDeadlines from '@/components/classroom/student/StudentDeadlines.vue'
import StudentResources from '@/components/classroom/student/StudentResources.vue'
import StudentKpiSharing from '@/components/classroom/student/StudentKpiSharing.vue'
import { useClassGroupStore } from '@/stores/classGroups'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useDeadlineStore } from '@/stores/deadlines'
import { useClassGroupResourceStore } from '@/stores/classGroupResources'
import { useClassGroupSectionStore } from '@/stores/classGroupSections'
import { useClassGroupSubmissionStore } from '@/stores/classGroupSubmissions'
import { useKpiConsentStore } from '@/stores/kpiConsent'
import { useSubjectStore } from '@/stores/subjects'

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
  await Promise.all(
    sectionStore.sections.filter((s) => s.type === 'rendu').map((s) => submissionStore.fetchMine(id, s.id))
  )
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
</script>
