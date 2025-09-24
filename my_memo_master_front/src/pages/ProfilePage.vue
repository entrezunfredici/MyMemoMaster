<template>
  <section>
    <h4 v-if="roleStore.role.name == 'Admin'" class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4"> Informations Administrateur</h4>
    <h4 v-else class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4"> Informations utilisateur</h4>
    <p>Nom utilisateur : Jeannine</p>
    <p v-if="roleStore.role.name">Role : {{ roleStore.role.name }}</p>
    <p v-else>Chargement du role...</p>
    <button
      @click="logout"
      class="mt-4 rounded bg-[#1E3BA1] px-4 py-2 text-white hover:bg-[#162c7a] focus:outline-none"
    >
      Se deconnecter
    </button>
  </section>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoleStore } from '@/stores/roles'
import { useAuthStore } from '@/stores/auth'

const roleStore = useRoleStore()
const authStore = useAuthStore()

const logout = () => {
  authStore.logout()
}

onMounted(async () => {
  const userRoleId = 1 //recuperer l'id dans user
  await roleStore.fetchRoleById(userRoleId)
})
</script>