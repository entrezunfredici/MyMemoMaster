<template>
  <div class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-3">
    <h2 class="text-lg font-semibold text-dark">Gestion des comptes</h2>
    <p class="text-xs text-dark/60">Membres du groupe sélectionné. Sélectionnez un groupe dans l'onglet Groupes.</p>
    <div v-if="!group" class="text-sm text-dark/60">Aucun groupe sélectionné.</div>
    <div v-else class="space-y-2">
      <div v-for="m in group.members" :key="m.userId"
        class="rounded-xl border border-gray px-3 py-2 flex items-center justify-between text-sm">
        <div>
          <p class="font-semibold text-dark">{{ m.user?.name ?? `#${m.userId}` }}</p>
          <p class="text-xs text-dark/60">{{ m.user?.email }}</p>
        </div>
        <div class="flex items-center gap-2">
          <span :class="m.user?.isActive === false ? 'bg-secondary/10 text-secondary' : 'bg-success/10 text-success'"
            class="rounded-full px-2 py-0.5 text-xs font-medium">
            {{ m.user?.isActive === false ? 'Inactif' : 'Actif' }}
          </span>
          <button v-if="m.user?.isActive !== false" @click="deactivate(m.userId)"
            class="rounded-lg border border-secondary/40 px-2 py-1 text-xs text-secondary hover:bg-secondary/10 transition">
            Désactiver
          </button>
          <button v-else @click="activate(m.userId)"
            class="rounded-lg border border-success/40 px-2 py-1 text-xs text-success hover:bg-success/10 transition">
            Activer
          </button>
        </div>
      </div>
      <p v-if="!group.members?.length" class="text-xs text-dark/60">Aucun membre.</p>
    </div>
  </div>
</template>

<script setup>
// Onglet « Comptes » : activer / désactiver les comptes des membres du groupe sélectionné.
// Extrait de pages/ClassroomEtablissementView.vue.
import { useEtablissementStore } from '@/stores/etablissement'

const props = defineProps({
  // Groupe sélectionné dans l'onglet Groupes (undefined = aucun)
  group: { type: Object, default: undefined },
})

const etabStore = useEtablissementStore()

// L'état d'activité est mis à jour localement après succès (le groupe vient du store des groupes)
async function setActive(userId, active) {
  const ok = active ? await etabStore.activateUser(userId) : await etabStore.deactivateUser(userId)
  if (ok) {
    const member = props.group?.members?.find((m) => m.userId === userId)
    if (member?.user) member.user.isActive = active
  }
}

const activate = (userId) => setActive(userId, true)
const deactivate = (userId) => setActive(userId, false)
</script>
