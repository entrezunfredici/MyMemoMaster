<template>
  <div v-if="authStore.oauthProviders.length" class="w-full max-w-md mt-6">
    <p class="text-center text-sm text-gray-700 mb-3">{{ intro }}</p>
    <ul class="flex flex-col gap-2">
      <li v-for="provider in authStore.oauthProviders" :key="provider.id">
        <button
          type="button"
          :disabled="pending !== null"
          class="w-full bg-white text-dark border border-gray-500 rounded-lg py-2 px-4 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
          @click="start(provider.id)"
        >
          {{ pending === provider.id ? 'Redirection...' : `Continuer avec ${provider.label}` }}
        </button>
      </li>
    </ul>
    <slot />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

defineProps({
  // Texte au-dessus des boutons (« ou » entre le formulaire et les fournisseurs)
  intro: { type: String, default: 'Ou continuez avec :' },
})

const authStore = useAuthStore()
const pending = ref(null)

onMounted(() => authStore.loadOAuthProviders())

async function start(providerId) {
  pending.value = providerId
  const started = await authStore.startOAuth(providerId)
  // En cas de succès le navigateur quitte la page : on ne réactive les boutons qu'en cas d'échec
  if (!started) pending.value = null
}
</script>
