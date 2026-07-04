<template>
  <AuthFormLayout
    title="Connexion"
    title-class="md:text-[3rem] neue-haas-grotesk-font"
  >
    <form @submit.prevent="submitForm" class="w-full max-w-md mt-6">
      <div class="mb-4">
        <label for="login-email" class="block text-gray-700">Email</label>
        <input id="login-email" name="email" type="email" v-model="email" required
          class="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
      </div>

      <div class="mb-4">
        <label for="login-password" class="block text-gray-700">Mot de passe</label>
        <input id="login-password" name="password" type="password" v-model="password" required
          class="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
        <router-link to="/forgot-password" class="text-sm text-blue-600">Mot de passe oublié ?</router-link>
      </div>

      <div class="flex flex-col items-center">
        <button
          type="submit"
          :disabled="submitting"
          class="w-[116px] bg-[#1E3BA1] text-white !text-white hover:bg-[#162c7a] focus:outline-none py-2 px-4 rounded valider disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ submitting ? 'Connexion...' : 'Valider' }}
        </button>
        <a href="/register" class="underline m-3">Vous n'avez pas un compte ? Créez en un !</a>
        <p v-if="errorMessage" class="text-red-600 text-sm text-center mt-2 font-medium">
          {{ errorMessage }}
        </p>
      </div>
    </form>
  </AuthFormLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AuthFormLayout from '@/components/AuthFormLayout.vue'

const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const submitting = ref(false)

async function submitForm() {
  errorMessage.value = ''
  submitting.value = true
  try {
    const success = await authStore.login(email.value, password.value, '/')
    if (success === false) {
      errorMessage.value = 'Email ou mot de passe incorrect.'
    }
  } catch (e) {
    errorMessage.value = e?.message || 'Erreur lors de la connexion.'
  } finally {
    submitting.value = false
  }
}
</script>
