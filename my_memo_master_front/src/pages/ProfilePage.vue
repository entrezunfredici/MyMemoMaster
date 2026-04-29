<template>
  <section>
    <h4 v-if="roleStore.role.name == 'Admin'" class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4"> Informations Administrateur</h4>
    <h4 v-else class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4"> Informations utilisateur</h4>
    <p>Bienvennue dans votre page profil {{ userName }}</p>
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
import { computed, onMounted } from 'vue'
import { useRoleStore } from '@/stores/roles'
import { useAuthStore } from '@/stores/auth'

const roleStore = useRoleStore()
const authStore = useAuthStore()

const decodeJwtPayload = (token) => {
  if (!token) return null

  try {
    const [, payload] = token.split('.')
    if (!payload) return null

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=')
    const decodedPayload = atob(paddedPayload)
    const utf8Payload = decodeURIComponent(
      Array.from(decodedPayload, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
    )

    return JSON.parse(utf8Payload)
  } catch {
    return null
  }
}

const tokenPayload = computed(() => decodeJwtPayload(authStore.token || authStore.user?.connectionToken))
const userName = computed(() => authStore.user?.name || tokenPayload.value?.name || 'Non renseigne')

const logout = () => {
  authStore.logout()
}

onMounted(async () => {
  const userRoleId = 1
  await roleStore.fetchRoleById(userRoleId)
})
</script>
