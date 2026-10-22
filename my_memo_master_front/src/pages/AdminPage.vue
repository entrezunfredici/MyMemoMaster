<template>
  <div class="admin-page container mx-auto space-y-6 px-4 py-8">
    <div>
      <h1 class="text-3xl font-bold text-heading mb-1">Administration</h1>
      <p class="text-sm text-gray-500">Rôles, comptes, journal d’audit et sauvegardes de toute la plateforme. Les établissements se gèrent dans l’onglet « Plateforme » de la page Classe.</p>
    </div>

    <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Sections d’administration">
      <button v-for="s in sections" :key="s.key" type="button" :aria-pressed="activeSection === s.key"
        @click="activeSection = s.key"
        :class="[activeSection === s.key ? 'bg-primary text-light' : 'bg-light text-primary border-2 border-gray', 'rounded-lg px-3 py-2 text-sm font-medium transition']">
        {{ s.label }}
      </button>
    </div>

    <AdminRolesPanel v-if="activeSection === 'roles'" />
    <AdminAccountsPanel v-else-if="activeSection === 'accounts'" />
    <AdminBackupsPanel v-else-if="activeSection === 'backups'" />
    <AdminAuditPanel v-else />

    <ConfirmActionModal :modal="confirmModal" @cancel="closeConfirmModal" @confirm="runConfirmedAction" />
  </div>
</template>

<script setup>
// Administration plateforme (rôle 1 uniquement — garde du routeur) : rôles, comptes, journal d'audit global, sauvegardes.
import { ref } from 'vue'
import { provideConfirmAction } from '@/composables/useConfirmAction'
import ConfirmActionModal from '@/components/ConfirmActionModal.vue'
import AdminRolesPanel from '@/components/admin/AdminRolesPanel.vue'
import AdminAccountsPanel from '@/components/admin/AdminAccountsPanel.vue'
import AdminAuditPanel from '@/components/admin/AdminAuditPanel.vue'
import AdminBackupsPanel from '@/components/admin/AdminBackupsPanel.vue'

const sections = [
  { key: 'roles', label: 'Rôles' },
  { key: 'accounts', label: 'Comptes' },
  { key: 'audit', label: 'Journal d’audit' },
  { key: 'backups', label: 'Sauvegardes' },
]
const activeSection = ref('roles')

const { confirmModal, closeConfirmModal, runConfirmedAction } = provideConfirmAction()
</script>
