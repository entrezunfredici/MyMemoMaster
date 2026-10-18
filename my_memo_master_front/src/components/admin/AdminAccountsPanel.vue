<template>
  <section aria-labelledby="admin-accounts-title" class="rounded-2xl border-2 border-gray bg-white p-4 shadow-sm space-y-4">
    <h2 id="admin-accounts-title" class="text-lg font-semibold text-dark">Comptes</h2>

    <form class="flex flex-wrap items-end gap-2" @submit.prevent="submitSearch">
      <div class="flex flex-col gap-1">
        <label for="admin-account-search" class="text-sm font-medium text-dark">Nom ou e-mail</label>
        <input id="admin-account-search" v-model="filters.search" type="text" maxlength="100"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="admin-account-role" class="text-sm font-medium text-dark">Rôle</label>
        <select id="admin-account-role" v-model="filters.roleId"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm bg-white">
          <option value="">Tous les rôles</option>
          <option v-for="role in roleStore.roles" :key="role.roleId" :value="role.roleId">{{ role.name }}</option>
        </select>
      </div>
      <button type="submit"
        class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-light hover:bg-primary/90 transition">
        Rechercher
      </button>
    </form>

    <p v-if="userStore.loading" class="text-sm text-dark/70" role="status">Chargement…</p>
    <p v-else-if="userStore.users.length === 0" class="text-sm text-dark/70" role="status">Aucun compte ne correspond.</p>
    <template v-else>
      <p class="text-sm text-dark/70" role="status">
        {{ userStore.total }} {{ plural(userStore.total, 'compte') }} · page {{ userStore.page }} sur {{ userStore.pageCount }}
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <caption class="sr-only">Comptes de la plateforme</caption>
          <thead>
            <tr class="border-b border-gray text-left text-xs text-dark/70 uppercase tracking-wide">
              <th scope="col" class="pb-2 pr-4">Nom</th>
              <th scope="col" class="pb-2 pr-4">E-mail</th>
              <th scope="col" class="pb-2 pr-4">Rôle</th>
              <th scope="col" class="pb-2 pr-4">Statut</th>
              <th scope="col" class="pb-2 pr-4">Dernière connexion</th>
              <th scope="col" class="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in userStore.users" :key="user.userId" class="border-b border-gray/50">
              <td class="py-2 pr-4 font-medium text-dark">{{ user.name }}</td>
              <td class="py-2 pr-4 text-dark/70">{{ user.email }}</td>
              <td class="py-2 pr-4 text-dark/70">{{ roleName(user.roleId) }}</td>
              <td class="py-2 pr-4 text-dark/70">{{ user.isActive ? 'Actif' : 'Désactivé' }}</td>
              <td class="py-2 pr-4 text-dark/70">{{ formatDateTime(user.lastLogin) }}</td>
              <td class="py-2">
                <span v-if="isSelf(user)" class="text-xs text-dark/70">Votre compte</span>
                <div v-else class="flex items-center gap-2">
                  <button type="button" :aria-label="`Changer le rôle de ${user.name}`" @click="openRoleModal(user)"
                    class="rounded-lg bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 transition">
                    Changer le rôle
                  </button>
                  <button v-if="user.roleId !== null" type="button" :aria-label="`Retirer le rôle de ${user.name}`" @click="askRemoveRole(user)"
                    class="rounded-lg bg-secondary/10 px-2 py-1 text-xs text-secondary hover:bg-secondary/20 transition">
                    Retirer le rôle
                  </button>
                  <!-- L'API refuse d'agir sur un autre administrateur plateforme : pas de bouton qui échouerait -->
                  <button v-if="user.roleId !== 1 && user.isActive" type="button" :aria-label="`Désactiver le compte de ${user.name}`" @click="askDeactivate(user)"
                    class="rounded-lg bg-secondary/10 px-2 py-1 text-xs text-secondary hover:bg-secondary/20 transition">
                    Désactiver
                  </button>
                  <button v-else-if="user.roleId !== 1" type="button" :aria-label="`Réactiver le compte de ${user.name}`" @click="userStore.activate(user.userId)"
                    class="rounded-lg bg-success/10 px-2 py-1 text-xs text-success hover:bg-success/20 transition">
                    Réactiver
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" :disabled="userStore.page <= 1" @click="goToPage(userStore.page - 1)"
          class="rounded-lg border border-gray px-3 py-1.5 text-sm hover:bg-light transition disabled:opacity-50">
          Page précédente
        </button>
        <button type="button" :disabled="userStore.page >= userStore.pageCount" @click="goToPage(userStore.page + 1)"
          class="rounded-lg border border-gray px-3 py-1.5 text-sm hover:bg-light transition disabled:opacity-50">
          Page suivante
        </button>
      </div>
    </template>

    <ModalComponent :visible="roleModal.visible" :title="roleModal.title" size="sm" @close="closeRoleModal">
      <form class="flex flex-col gap-1" @submit.prevent="submitRole">
        <label for="admin-account-new-role" class="text-sm font-medium text-dark">Nouveau rôle</label>
        <select id="admin-account-new-role" v-model="roleModal.roleId"
          class="rounded-lg border-2 border-gray-500 px-3 py-2 text-sm bg-white">
          <option v-for="role in roleStore.roles" :key="role.roleId" :value="role.roleId">{{ role.name }}</option>
        </select>
      </form>
      <template #footer>
        <button class="btn-modal-cancel" @click="closeRoleModal">Annuler</button>
        <button class="btn-modal-submit" @click="submitRole">Enregistrer</button>
      </template>
    </ModalComponent>
  </section>
</template>

<script setup>
// Comptes de la plateforme : recherche paginée, changement et retrait du rôle, désactivation / réactivation. L'administrateur ne peut pas
// modifier son propre compte ici (l'API le refuse aussi : sinon plus personne ne pourrait administrer).
// La page fournit la modale de confirmation (provideConfirmAction).
import { computed, onMounted, reactive } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useAdminUserStore } from '@/stores/adminUsers'
import { useRoleStore } from '@/stores/roles'
import { useAuthStore } from '@/stores/auth'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { formatDateTime } from '@/helpers/classroomFormat'
import { plural } from '@/helpers/plural'

const userStore = useAdminUserStore()
const roleStore = useRoleStore()
const authStore = useAuthStore()
const askConfirm = useConfirmAction()

const filters = reactive({ search: '', roleId: '' })
const roleModal = reactive({ visible: false, userId: null, title: '', roleId: null })

const myId = computed(() => authStore.user?.userId ?? authStore.user?.id ?? null)
const isSelf = (user) => myId.value !== null && user.userId === myId.value

function roleName(roleId) {
  if (roleId === null || roleId === undefined) return 'Aucun rôle'
  return roleStore.roles.find((role) => role.roleId === roleId)?.name ?? `Rôle ${roleId}`
}

function load(page = 1) {
  return userStore.search({ search: filters.search, roleId: filters.roleId, page })
}

const submitSearch = () => load(1)
const goToPage = (page) => load(page)

function openRoleModal(user) {
  Object.assign(roleModal, {
    visible: true,
    userId: user.userId,
    title: `Rôle de ${user.name}`,
    roleId: user.roleId ?? roleStore.roles[0]?.roleId ?? null,
  })
}

function closeRoleModal() {
  roleModal.visible = false
}

async function submitRole() {
  if (roleModal.roleId === null) return
  if (await userStore.setRole(roleModal.userId, roleModal.roleId)) closeRoleModal()
}

function askRemoveRole(user) {
  askConfirm(
    'Retirer le rôle de ce compte ?',
    `Le compte de ${user.name} n’aura plus aucun rôle et perdra l’accès aux fonctions réservées.`,
    () => userStore.removeRole(user.userId),
  )
}

function askDeactivate(user) {
  askConfirm(
    'Désactiver ce compte ?',
    `Le compte de ${user.name} sera déconnecté immédiatement et ne pourra plus se connecter. Vous pourrez le réactiver.`,
    () => userStore.deactivate(user.userId),
  )
}

onMounted(async () => {
  await roleStore.fetchRoles()
  await load(1)
})
</script>
