<template>
  <div class="flex h-screen w-full bg-primary rounded-[50px]">
    <div class="hidden md:block w-[70%] h-full bg-primary border-[5px] border-primary rounded-[18px]">
      <img src="/connexion.jpg" alt="Connexion" class="w-full h-full object-cover imageConnexion">
    </div>

    <div class="w-full md:w-[30%] flex flex-col justify-center items-center bg-white px-8 md:px-16 border border-[#1E3BA1]  custom-border formulaire">
      <img src="/logo/logo-full.svg" alt="logo" class="w-auto h-auto object-cover">
      <h2 class="text-primary text-[2rem] md:text-[2.5rem] font-bold text-center">Mot de passe oublié</h2>
      <p class="text-gray-500 text-sm text-center mt-2 mb-6">Saisissez votre email, vous recevrez un token de réinitialisation.</p>

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
    </div>
  </div>
</template>

<script setup>
import '@/assets/auth-form.css'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'

const router = useRouter()
const email = ref('')
const submitting = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  submitting.value = true
  try {
    const resp = await api.post('users/forgot-password', { email: email.value.trim() })
    if (!resp || resp.status !== 201) {
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
