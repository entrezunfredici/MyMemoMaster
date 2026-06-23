<template>
  <AuthFormLayout
    title="Mot de passe oublié"
    description="Saisissez votre email, vous recevrez un token de réinitialisation."
  >
    <form @submit.prevent="submit" class="w-full max-w-md">
      <div class="mb-4">
        <label for="fp-email" class="block text-gray-700">Email</label>
        <input
          id="fp-email"
          type="email"
          v-model="email"
          required
          class="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
      </div>

      <p v-if="errorMessage" class="text-red-600 text-sm mb-3">{{ errorMessage }}</p>

      <div class="flex flex-col items-center gap-3">
        <button
          type="submit"
          :disabled="submitting"
          class="w-full bg-[#1E3BA1] text-white hover:bg-[#162c7a] py-2 px-4 rounded disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ submitting ? 'Envoi...' : 'Envoyer le token' }}
        </button>
        <router-link to="/auth" class="text-sm text-blue-600 underline">Retour à la connexion</router-link>
      </div>
    </form>
  </AuthFormLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'
import AuthFormLayout from '@/components/AuthFormLayout.vue'

const router = useRouter()
const email = ref('')
const submitting = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  submitting.value = true
  try {
    const resp = await api.post('users/forgot-password', { email: email.value.trim() })
    if (!resp || resp.status !== 200) {
      errorMessage.value = resp?.data?.message || 'Erreur lors de l\'envoi.'
      return
    }
    notif.notify('Token envoyé ! Vérifiez votre email.', 'success')
    router.push({ path: '/reset-password', query: { email: email.value.trim() } })
  } finally {
    submitting.value = false
  }
}
</script>
