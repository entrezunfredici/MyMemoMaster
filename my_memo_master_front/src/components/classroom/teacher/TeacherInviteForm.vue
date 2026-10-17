<template>
  <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h3 class="text-base font-semibold text-dark">Inviter un étudiant</h3>
    <input aria-label="Email" v-model="inviteForm.targetEmail" type="email" placeholder="Email *"
      class="w-full rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
    <button @click="submitInvite"
      class="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
      Envoyer l'invitation
    </button>
    <p v-if="inviteForm.message" :class="inviteForm.error ? 'text-secondary' : 'text-success'" class="text-xs">
      {{ inviteForm.message }}
    </p>
  </div>
</template>

<script setup>
// Invitation d'un étudiant par email. Extrait de pages/ClassroomEnseignantView.vue.
import { reactive } from 'vue'
import { useInvitationStore } from '@/stores/invitations'

const props = defineProps({ groupId: { type: Number, required: true } })

const invitationStore = useInvitationStore()
const inviteForm = reactive({ targetEmail: '', role: 'student', message: '', error: false })

async function submitInvite() {
  inviteForm.error = false
  inviteForm.message = ''
  if (!inviteForm.targetEmail) { inviteForm.error = true; inviteForm.message = "L'email est requis."; return }
  const ok = await invitationStore.invite(props.groupId, { targetEmail: inviteForm.targetEmail, role: inviteForm.role })
  inviteForm.error = !ok
  inviteForm.message = ok ? 'Invitation envoyée.' : "Erreur lors de l'envoi."
  if (ok) {
    inviteForm.targetEmail = ''
    await invitationStore.fetchByGroup(props.groupId)
  }
}
</script>
