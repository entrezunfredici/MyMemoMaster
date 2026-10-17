<template>
  <div v-if="loading" class="text-sm text-dark/60">Chargement...</div>
  <div v-else-if="!etabStore.stats" class="text-sm text-dark/60">Aucune donnée disponible.</div>
  <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <div class="rounded-xl border border-gray bg-white p-3 text-center">
      <p class="text-2xl font-bold text-primary">{{ etabStore.stats.groupCount }}</p>
      <p class="text-xs text-dark/60 mt-1">Groupes</p>
    </div>
    <div class="rounded-xl border border-gray bg-white p-3 text-center">
      <p class="text-2xl font-bold text-primary">{{ etabStore.stats.totalMembers }}</p>
      <p class="text-xs text-dark/60 mt-1">Membres</p>
    </div>
    <div class="rounded-xl border border-gray bg-white p-3 text-center">
      <p class="text-2xl font-bold text-success">{{ etabStore.stats.activeMembers }}</p>
      <p class="text-xs text-dark/60 mt-1">Actifs</p>
    </div>
    <div class="rounded-xl border border-gray bg-white p-3 text-center">
      <p class="text-2xl font-bold text-secondary">{{ etabStore.stats.pendingInvitations }}</p>
      <p class="text-xs text-dark/60 mt-1">Invitations en attente</p>
    </div>
    <div class="rounded-xl border border-gray bg-white p-3 text-center">
      <p class="text-2xl font-bold text-dark">{{ etabStore.stats.validatedAccounts }}</p>
      <p class="text-xs text-dark/60 mt-1">Emails vérifiés</p>
    </div>
    <div class="rounded-xl border border-gray bg-white p-3 text-center">
      <p class="text-2xl font-bold text-dark">{{ etabStore.stats.roleBreakdown?.students ?? 0 }}</p>
      <p class="text-xs text-dark/60 mt-1">Étudiants</p>
    </div>
    <div class="rounded-xl border border-gray bg-white p-3 text-center">
      <p class="text-2xl font-bold text-dark">{{ etabStore.stats.roleBreakdown?.teachers ?? 0 }}</p>
      <p class="text-xs text-dark/60 mt-1">Enseignants</p>
    </div>
    <div class="rounded-xl border border-gray bg-white p-3 text-center">
      <p class="text-2xl font-bold text-dark">{{ etabStore.stats.inactiveMembers }}</p>
      <p class="text-xs text-dark/60 mt-1">Inactifs</p>
    </div>
  </div>
</template>

<script setup>
// Onglet « Statistiques » de l'établissement : 8 compteurs. Extrait de pages/ClassroomEtablissementView.vue.
import { useEtablissementStore } from '@/stores/etablissement'

defineProps({
  loading: { type: Boolean, default: false },
})

const etabStore = useEtablissementStore()
</script>
