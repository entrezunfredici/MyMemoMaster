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
          <span :class="m.role === 'teacher' ? 'bg-primary/10 text-primary' : 'bg-gray text-dark/60'"
            class="rounded-full px-2 py-0.5 text-xs font-semibold">
            {{ m.role === 'teacher' ? 'Enseignant' : 'Étudiant' }}
          </span>
          <button aria-label="Retirer le membre" v-if="m.role === 'student'"
            @click="confirmRemoveMember(m)"
            class="text-secondary text-xs hover:underline">×</button>
        </div>
      </div>
      <p v-if="!group.members?.length" class="text-sm text-dark/60">Aucun membre.</p>
    </div>

    <!-- Invitations en attente -->
    <div v-if="invitationStore.groupInvitations.length > 0" class="pt-2 border-t border-gray space-y-1">
      <p class="text-xs font-semibold text-dark/60 uppercase tracking-wide">En attente</p>
      <div v-for="inv in invitationStore.groupInvitations" :key="inv.id"
        class="rounded-xl border border-gray/50 px-3 py-2 flex items-center justify-between text-xs text-dark/70">
        <span>{{ inv.targetEmail }}</span>
        <span class="rounded-full bg-gray px-2 py-0.5">
          {{ inv.role === 'teacher' ? 'Enseignant' : 'Étudiant' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
// Membres du groupe (retrait d'un étudiant) et invitations en attente. Extrait de pages/ClassroomEnseignantView.vue.
import { useClassGroupStore } from '@/stores/classGroups'
import { useInvitationStore } from '@/stores/invitations'
import { useConfirmAction } from '@/composables/useConfirmAction'

const props = defineProps({
  // Le groupe affiché (avec ses membres)
  group: { type: Object, required: true },
})

const classGroupStore = useClassGroupStore()
const invitationStore = useInvitationStore()
const askConfirm = useConfirmAction()

function confirmRemoveMember(m) {
  askConfirm(
    'Retirer le membre',
    `Retirer ${m.user?.name ?? 'cet étudiant'} du groupe ? Il perdra l'accès à ce groupe.`,
    () => classGroupStore.removeMember(props.group.id, m.userId),
  )
}
</script>
