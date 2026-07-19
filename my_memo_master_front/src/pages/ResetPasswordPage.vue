<template>
  <AuthFormLayout
    title="Nouveau mot de passe"
    description="Saisissez le code à 6 chiffres reçu par email et choisissez un nouveau mot de passe."
  >
    <form @submit.prevent="submit" class="w-full max-w-md">
      <div class="mb-4">
        <label for="rp-code" class="block text-gray-700">Code reçu par email</label>
        <input
          id="rp-code"
          type="text"
          v-model="code"
          required
          inputmode="numeric"
          autocomplete="one-time-code"
          pattern="\d{6}"
          maxlength="6"
          placeholder="123456"
          class="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-lg tracking-[0.5em] text-center"
        >
        <p class="text-xs text-gray-400 mt-1">Code valable 15 minutes</p>
      </div>

      <div class="mb-4">
        <label for="rp-password" class="block text-gray-700">Nouveau mot de passe</label>
        <input
          id="rp-password"
          type="password"
          v-model="newPassword"
          required
          class="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
        <p class="text-xs text-gray-400 mt-1">Min. 10 caractères, 1 majuscule, 1 chiffre</p>
      </div>

      <p v-if="errorMessage" class="text-red-600 text-sm mb-3">{{ errorMessage }}</p>

      <div class="flex flex-col items-center gap-3">
        <button
          type="submit"
          :disabled="submitting"
          class="w-full bg-[#1E3BA1] text-white hover:bg-[#162c7a] py-2 px-4 rounded disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ submitting ? 'Réinitialisation...' : 'Réinitialiser' }}
        </button>
        <router-link to="/forgot-password" class="text-sm text-blue-600 underline">Renvoyer un code</router-link>
      </div>
    </form>
  </AuthFormLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'
import AuthFormLayout from '@/components/AuthFormLayout.vue'

const route = useRoute()
const router = useRouter()

const email = ref(route.query.email || '')
const code = ref('')
const newPassword = ref('')
const submitting = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  if (!email.value) {
    errorMessage.value = 'Email manquant. Recommencez depuis "Mot de passe oublié".'
    return
  }
  submitting.value = true
  try {
    const resp = await api.post('users/reset-password', {
      email: email.value.trim(),
      code: code.value.trim(),
      newPassword: newPassword.value
    })
    if (!resp || resp.status !== 201) {
      errorMessage.value = resp?.data?.message || 'Code invalide ou expiré.'
      return
    }
    notif.notify('Mot de passe réinitialisé avec succès !', 'success')
    router.push('/auth')
  } finally {
    submitting.value = false
  }
}
</script>
