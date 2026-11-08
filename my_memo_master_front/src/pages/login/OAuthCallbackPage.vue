<template>
  <AuthFormLayout title="Connexion" title-class="md:text-[3rem] neue-haas-grotesk-font">
    <div class="w-full max-w-md mt-6 text-center" role="status" aria-live="polite">
      <p v-if="!failed" class="text-gray-700">Connexion en cours...</p>
      <template v-else>
        <p role="alert" class="text-red-700 font-medium">{{ errorMessage }}</p>
        <router-link to="/auth" class="underline block mt-4">Retour à la connexion</router-link>
      </template>
    </div>
  </AuthFormLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthFormLayout from '@/components/AuthFormLayout.vue'

const route = useRoute()
const authStore = useAuthStore()
const failed = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  const { code, state, error } = route.query

  // Le fournisseur renvoie `error` quand la personne refuse l'accès
  if (error) {
    errorMessage.value = 'La connexion a été annulée ou refusée par le fournisseur.'
    failed.value = true
    return
  }

  // Le code d'autorisation est à usage unique : un seul échange par arrivée sur la page
  const result = await authStore.completeOAuth(route.params.provider, code, state, '/')
  if (result === false) {
    errorMessage.value = 'La connexion a échoué. Veuillez réessayer.'
    failed.value = true
  }
})
</script>
