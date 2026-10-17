<template>
  <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h3 class="text-base font-semibold text-dark">Membres ({{ group.members?.length ?? 0 }})</h3>
    <div class="space-y-2">
      <div v-for="m in group.members" :key="m.userId"
        class="rounded-xl border border-gray px-3 py-2 flex items-center justify-between text-sm">
        <div>
          <p class="font-semibold text-dark">{{ m.user?.name ?? `#${m.userId}` }}</p>
          <p class="text-xs text-dark/60">{{ m.user?.email }}</p>
        </div>
        <div class="flex items-center gap-2">
          <select aria-label="Rôle du membre" :value="m.role" @change="changeRole(m.userId, $event.target.value)"
            class="rounded-lg border border-gray-500 px-2 py-1 text-xs bg-white">
            <option value="student">Étudiant</option>
            <option value="teacher">Enseignant</option>
          </select>
          <button aria-label="Retirer le membre" @click="classGroupStore.removeMember(group.id, m.userId)" class="text-secondary text-xs hover:underline">×</button>
        </div>
      </div>
    </div>

    <!-- Invitations en attente -->
    <div v-if="invitationStore.groupInvitations.length > 0" class="pt-2 border-t border-gray space-y-1">
      <p class="text-xs font-semibold text-dark/60 uppercase tracking-wide">En attente</p>
      <div v-for="inv in invitationStore.groupInvitations" :key="inv.id"
        class="rounded-xl border border-gray/50 px-3 py-2 flex items-center justify-between text-xs text-dark/70">
        <span>{{ inv.targetEmail }}</span>
        <span class="rounded-full bg-gray px-2 py-0.5">{{ inv.role === 'teacher' ? 'Enseignant' : 'Étudiant' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// Membres du groupe (changement de rôle, retrait) et invitations en attente.
// Extrait de pages/ClassroomEtablissementView.vue.
import { useClassGroupStore } from '@/stores/classGroups'
import { useInvitationStore } from '@/stores/invitations'

const props = defineProps({
  group: { type: Object, required: true },
})

const classGroupStore = useClassGroupStore()
const invitationStore = useInvitationStore()

async function changeRole(userId, role) {
  await classGroupStore.updateMemberRole(props.group.id, userId, role)
}
</script>
