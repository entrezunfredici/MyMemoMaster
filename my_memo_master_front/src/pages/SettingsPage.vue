<template>
  <div>
    Salut salut, ici c'est les paramètres
  </div>
  <p v-if="roleStore.role.name">Rôle : {{ roleStore.role.name }}</p>
  <p v-else>Chargement du rôle...</p>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoleStore } from '@/stores/role'

const roleStore = useRoleStore()

onMounted(async () => {
  const userId = 1 
  await roleStore.fetchRoleById(userId)
})

</script>
