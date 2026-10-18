<template>
  <section aria-labelledby="admin-roles-title" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
    <h2 id="admin-roles-title" class="text-lg font-semibold text-dark">Rôles</h2>
    <p class="text-sm text-dark/70">
      Les rôles système (identifiants 1 à 5) pilotent les droits de la plateforme : ils ne peuvent ni être renommés ni supprimés.
    </p>

    <form class="flex flex-wrap items-end gap-2" @submit.prevent="createRole">
      <div class="flex flex-col gap-1">
        <label for="admin-new-role" class="text-sm font-medium text-dark">Nom du nouveau rôle</label>
        <input id="admin-new-role" v-model="newName" type="text" maxlength="50"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
      </div>
      <button type="submit"
        class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
        Créer le rôle
      </button>
    </form>
    <p v-if="createError" role="alert" class="text-xs text-secondary">{{ createError }}</p>

    <p v-if="roleStore.roles.length === 0" class="text-sm text-dark/70">Aucun rôle.</p>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <caption class="sr-only">Rôles de la plateforme</caption>
        <thead>
          <tr class="border-b border-gray text-left text-xs text-dark/70 uppercase tracking-wide">
            <th scope="col" class="pb-2 pr-4">Identifiant</th>
            <th scope="col" class="pb-2 pr-4">Nom</th>
            <th scope="col" class="pb-2 pr-4">Type</th>
            <th scope="col" class="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="role in roleStore.roles" :key="role.roleId" class="border-b border-gray/50">
            <td class="py-2 pr-4 font-mono text-xs text-dark/70">{{ role.roleId }}</td>
            <td class="py-2 pr-4 font-medium text-dark">{{ role.name }}</td>
            <td class="py-2 pr-4 text-dark/70">{{ isSystemRole(role.roleId) ? 'Système' : 'Personnalisé' }}</td>
            <td class="py-2">
              <span v-if="isSystemRole(role.roleId)" class="text-xs text-dark/70">Non modifiable</span>
              <div v-else class="flex items-center gap-2">
                <button type="button" :aria-label="`Renommer le rôle ${role.name}`" @click="openRename(role)"
                  class="rounded-lg bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 transition">
                  Renommer
                </button>
                <button type="button" :aria-label="`Supprimer le rôle ${role.name}`" @click="askDelete(role)"
                  class="rounded-lg bg-secondary/10 px-2 py-1 text-xs text-secondary hover:bg-secondary/20 transition">
                  Supprimer
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModalComponent :visible="rename.visible" title="Renommer le rôle" size="sm" @close="closeRename">
      <form class="flex flex-col gap-1" @submit.prevent="submitRename">
        <label for="admin-rename-role" class="text-sm font-medium text-dark">Nouveau nom</label>
        <input id="admin-rename-role" v-model="rename.name" type="text" maxlength="50"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
        <p v-if="rename.error" role="alert" class="text-xs text-secondary">{{ rename.error }}</p>
      </form>
      <template #footer>
        <button class="btn-modal-cancel" @click="closeRename">Annuler</button>
        <button class="btn-modal-submit" @click="submitRename">Enregistrer</button>
      </template>
    </ModalComponent>
  </section>
</template>

<script setup>
// Rôles de la plateforme : liste, création, renommage, suppression (rôles système protégés).
// La page fournit la modale de confirmation (provideConfirmAction).
import { onMounted, reactive, ref } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useRoleStore } from '@/stores/roles'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { isSystemRole } from '@/helpers/adminLabels'

const roleStore = useRoleStore()
const askConfirm = useConfirmAction()

const newName = ref('')
const createError = ref('')
const rename = reactive({ visible: false, id: null, name: '', error: '' })

// Mêmes bornes que l'API (validators/Role.validators.js).
function validateName(value) {
  const name = value.trim()
  if (name.length < 2 || name.length > 50) return { error: 'Le nom doit contenir entre 2 et 50 caractères.' }
  return { name }
}

async function createRole() {
  const { name, error } = validateName(newName.value)
  createError.value = error ?? ''
  if (error) return
  roleStore.role = { name }
  if (await roleStore.addRole()) {
    newName.value = ''
    await roleStore.fetchRoles()
  }
}

function openRename(role) {
  Object.assign(rename, { visible: true, id: role.roleId, name: role.name, error: '' })
}

function closeRename() {
  rename.visible = false
}

async function submitRename() {
  const { name, error } = validateName(rename.name)
  rename.error = error ?? ''
  if (error) return
  roleStore.role = { name }
  if (await roleStore.updateRole(rename.id)) {
    closeRename()
    await roleStore.fetchRoles()
  }
}

function askDelete(role) {
  askConfirm(
    'Supprimer ce rôle ?',
    `Le rôle « ${role.name} » sera supprimé définitivement. Un rôle encore attribué à des comptes ne peut pas être supprimé.`,
    async () => {
      if (await roleStore.deleteRole(role.roleId)) await roleStore.fetchRoles()
    },
  )
}

onMounted(() => roleStore.fetchRoles())
</script>
