<template>
  <div class="space-y-6">

    <!-- Navigation onglets -->
    <div class="flex gap-1 border-b border-gray">
      <button v-for="tab in tabs" :key="tab.key"
        @click="switchTab(tab.key)"
        :class="[activeTab === tab.key
          ? 'border-b-2 border-primary text-primary font-semibold'
          : 'text-dark/60 hover:text-dark', 'pb-2 px-3 text-sm transition']">
        {{ tab.label }}
      </button>
    </div>

    <!-- Onglet Stats -->
    <EtablissementStatsTab v-if="activeTab === 'stats'" :loading="loadingStats" />

    <!-- Onglet Journal -->
    <EtablissementAuditTab v-if="activeTab === 'audit'" :etab-id="etabId" />

    <!-- Onglet Contenu -->
    <EtablissementContentTab v-if="activeTab === 'content'" :etab-id="etabId" />

    <!-- Onglet Comptes -->
    <EtablissementAccountsTab v-if="activeTab === 'comptes'" :group="currentGroup" />

    <!-- Onglet Groupes -->
    <template v-if="activeTab === 'groupes'">

      <EtablissementGroupPicker
        :groups="classGroupStore.groups"
        :selected-id="selectedId"
        @select="selectGroup"
        @deleted="onGroupDeleted"
      />

      <template v-if="currentGroup">
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">

          <!-- Emploi du temps -->
          <div class="space-y-4 lg:col-span-2">
            <section class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
              <h2 class="text-lg font-semibold text-dark">Emploi du temps — {{ currentGroup.name }}</h2>
              <EtablissementEventForm :group-id="currentGroup.id" />
              <EtablissementEventList :group-id="currentGroup.id" :loading="loadingEvents" />
            </section>
          </div>

          <!-- Gestion membres + invitations -->
          <div class="space-y-4">
            <EtablissementInviteForm :group-id="currentGroup.id" />
            <EtablissementMembersList :group="currentGroup" />
          </div>
        </div>
      </template>

      <div v-else class="rounded-2xl border-2 border-gray bg-white p-6 text-center text-dark/70">
        Sélectionnez un groupe pour gérer son emploi du temps et ses membres.
      </div>

    </template>

  </div>
</template>

<script setup>
// Vue « Établissement » de la page Classe : onglets Groupes (planning, invitations, membres), puis — pour le
// gérant d'établissement seulement — Statistiques, Journal, Contenu et Comptes. Chaque onglet est un composant
// de components/classroom/etablissement/ ; la page ne porte que la navigation, la sélection du groupe et la
// résolution de l'établissement.
import { ref, computed, onMounted, watch } from 'vue'
import EtablissementStatsTab from '@/components/classroom/etablissement/EtablissementStatsTab.vue'
import EtablissementAuditTab from '@/components/classroom/etablissement/EtablissementAuditTab.vue'
import EtablissementContentTab from '@/components/classroom/etablissement/EtablissementContentTab.vue'
import EtablissementAccountsTab from '@/components/classroom/etablissement/EtablissementAccountsTab.vue'
import EtablissementGroupPicker from '@/components/classroom/etablissement/EtablissementGroupPicker.vue'
import EtablissementEventForm from '@/components/classroom/etablissement/EtablissementEventForm.vue'
import EtablissementEventList from '@/components/classroom/etablissement/EtablissementEventList.vue'
import EtablissementInviteForm from '@/components/classroom/etablissement/EtablissementInviteForm.vue'
import EtablissementMembersList from '@/components/classroom/etablissement/EtablissementMembersList.vue'
import { useClassGroupStore } from '@/stores/classGroups'
import { useCalendarEventStore } from '@/stores/calendarEvents'
import { useInvitationStore } from '@/stores/invitations'
import { useEtablissementStore } from '@/stores/etablissement'
import { useRole } from '@/composables/useRole'

const classGroupStore = useClassGroupStore()
const calendarStore = useCalendarEventStore()
const invitationStore = useInvitationStore()
const etabStore = useEtablissementStore()
const { isAdminEtablissement } = useRole()

// ── Onglets ────────────────────────────────────────────────────────────────

// Seul roleId=4 a accès aux onglets d'administration de l'établissement
const tabs = computed(() => {
  if (isAdminEtablissement.value) {
    return [
      { key: 'groupes', label: 'Groupes' },
      { key: 'stats', label: 'Statistiques' },
      { key: 'audit', label: 'Journal' },
      { key: 'content', label: 'Contenu' },
      { key: 'comptes', label: 'Comptes' },
    ]
  }
  return [{ key: 'groupes', label: 'Groupes' }]
})
const activeTab = ref('groupes')
const loadingStats = ref(false)

// Identifiant de l'établissement du gérant, résolu au montage (null tant qu'il ne l'est pas)
const etabId = ref(null)

async function switchTab(key) {
  activeTab.value = key
  if (!etabId.value) return
  if (key === 'stats' && !etabStore.stats) {
    loadingStats.value = true
    await etabStore.fetchStats(etabId.value)
    loadingStats.value = false
  }
  if (key === 'audit' && !etabStore.audit.length) await etabStore.fetchAudit(etabId.value)
  if (key === 'content' && !etabStore.content) await etabStore.fetchContent(etabId.value)
}

// ── Groupe sélectionné ─────────────────────────────────────────────────────

const selectedId = ref(null)
const loadingEvents = ref(false)

const currentGroup = computed(() => classGroupStore.groups.find((g) => g.id === selectedId.value))

async function selectGroup(id) {
  selectedId.value = id
  loadingEvents.value = true
  await Promise.all([
    calendarStore.fetchByGroup(id),
    invitationStore.fetchByGroup(id),
    classGroupStore.fetchGroupById(id),
  ])
  loadingEvents.value = false
}

// Après la suppression d'un groupe : si c'était le groupe affiché, on retombe sur le premier restant
function onGroupDeleted(id) {
  if (selectedId.value === id) selectedId.value = classGroupStore.groups[0]?.id ?? null
}

onMounted(async () => {
  if (!classGroupStore.groups.length) await classGroupStore.fetchGroups()
  if (classGroupStore.groups.length) selectGroup(classGroupStore.groups[0].id)

  // Résoudre l'ID de l'établissement pour les onglets Stats/Journal/Contenu (roleId=4 uniquement)
  if (isAdminEtablissement.value) {
    const etab = await etabStore.fetchMine()
    if (etab?.id) etabId.value = etab.id
  }
})

watch(() => classGroupStore.groups, (list) => {
  if (!selectedId.value && list.length) selectGroup(list[0].id)
})
</script>
