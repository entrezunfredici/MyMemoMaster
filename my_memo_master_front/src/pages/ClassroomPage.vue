<template>
  <div class="classroom-page space-y-6 px-2 sm:px-4 lg:px-6">

    <!-- Invitations en attente (toujours visibles) -->
    <section v-if="pendingInvitations.length > 0" class="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 shadow-sm space-y-3">
      <h2 class="text-lg font-semibold text-primary">Invitations en attente ({{ pendingInvitations.length }})</h2>
      <div v-for="inv in pendingInvitations" :key="inv.id" class="flex items-center justify-between rounded-xl border border-gray bg-white px-4 py-3">
        <div>
          <p class="font-semibold text-dark">{{ inv.classGroup?.name ?? `Groupe #${inv.classGroupId}` }}</p>
          <p class="text-xs text-dark/60">
            Rôle : {{ inv.role === 'teacher' ? 'Enseignant' : 'Étudiant' }} ·
            Invité par {{ inv.invitedBy?.name ?? '—' }}
          </p>
        </div>
        <div class="flex gap-2">
          <button @click="respond(inv.id, 'accepted')"
            class="rounded-lg bg-success/10 px-3 py-1 text-sm font-semibold text-success hover:bg-success/20 transition">
            Accepter
          </button>
          <button @click="respond(inv.id, 'declined')"
            class="rounded-lg bg-secondary/10 px-3 py-1 text-sm font-semibold text-secondary hover:bg-secondary/20 transition">
            Décliner
          </button>
        </div>
      </div>
    </section>

    <!-- Sélection de vue -->
    <div v-if="availableViews.length > 1" class="flex items-center gap-2">
      <span class="text-sm text-dark/70">Vue :</span>
      <button v-for="v in availableViews" :key="v.key"
        @click="activeView = v.key"
        :class="[activeView === v.key ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm font-medium transition']">
        {{ v.label }}
      </button>
    </div>

    <!-- Vue active -->
    <ClassroomPlateformeView v-if="activeView === 'plateforme'" />
    <ClassroomEtablissementView v-else-if="activeView === 'etablissement'" />
    <ClassroomEnseignantView v-else-if="activeView === 'enseignant'" />
    <ClassroomEtudiantView v-else />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRole } from '@/composables/useRole'
import { useAuthStore } from '@/stores/auth'
import { useInvitationStore } from '@/stores/invitations'
import { useClassGroupStore } from '@/stores/classGroups'
import ClassroomPlateformeView from './ClassroomPlateformeView.vue'
import ClassroomEtablissementView from './ClassroomEtablissementView.vue'
import ClassroomEnseignantView from './ClassroomEnseignantView.vue'
import ClassroomEtudiantView from './ClassroomEtudiantView.vue'

const { isAdmin, isAdminPlateforme, isEnseignant } = useRole()
const authStore = useAuthStore()
const invitationStore = useInvitationStore()
const classGroupStore = useClassGroupStore()

// Un étudiant plateforme peut être enseignant dans un groupe → vérifier les deux
function isTeacherInAnyGroup() {
  const userId = authStore.user?.userId
  return classGroupStore.groups.some((g) =>
    g.members?.some((m) => m.userId === userId && m.role === 'teacher')
  )
}

function defaultView() {
  if (isAdminPlateforme.value) return 'plateforme'
  if (isAdmin.value) return 'etablissement'
  if (isEnseignant.value || isTeacherInAnyGroup()) return 'enseignant'
  return 'etudiant'
}

const activeView = ref(defaultView())

// Recalcule après chargement du profil ET après chargement des groupes
watch(
  [isAdminPlateforme, isAdmin, isEnseignant, () => classGroupStore.groups],
  () => { activeView.value = defaultView() },
  { immediate: true }
)

const availableViews = computed(() => {
  if (isAdminPlateforme.value) return [{ key: 'plateforme', label: 'Plateforme' }]
  const views = []
  if (isAdmin.value) views.push({ key: 'etablissement', label: 'Établissement' })
  views.push({ key: 'enseignant', label: 'Enseignant' })
  views.push({ key: 'etudiant', label: 'Étudiant' })
  return views
})

const pendingInvitations = computed(() => invitationStore.mine)

async function respond(id, status) {
  const ok = await invitationStore.respond(id, status)
  if (ok && status === 'accepted') {
    // Recharge les groupes pour inclure le nouveau
    await classGroupStore.fetchGroups()
  }
}

onMounted(async () => {
  await Promise.all([
    classGroupStore.fetchGroups(),
    invitationStore.fetchMine(),
  ])
})
</script>
