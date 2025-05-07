<template>
  <section>
    <h4 v-if="roleStore.role.name == 'Admin'" class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4"> Informations Administrateur</h4>
    <h4 v-else class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4"> Informations utilisateur</h4>
    <p>Nom utilisateur : Jeannine</p>
    <p v-if="roleStore.role.name">Rôle : {{ roleStore.role.name }}</p>
    <p v-else>Chargement du rôle...</p>
  </section>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoleStore } from '@/stores/roles'

const roleStore = useRoleStore()

onMounted(async () => {
  const userRoleId = 1 //recuperer l'id dans user
  await roleStore.fetchRoleById(userRoleId)
})

</script>