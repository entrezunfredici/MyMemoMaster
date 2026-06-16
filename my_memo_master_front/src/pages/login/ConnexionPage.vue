<template>
  <div class="flex h-screen w-full bg-primary rounded-[50px]">
    <div class="hidden md:block w-[70%] h-full bg-primary border-[5px] border-primary rounded-[18px]">
      <img src="/connexion.jpg" alt="Connexion" class="w-full h-full object-cover imageConnexion">
    </div>

    <div class="w-full md:w-[30%] flex flex-col justify-center items-center bg-white px-8 md:px-16 border border-[#1E3BA1] custom-border formulaire">
      <img src="/logo/logo-full.svg" alt="logo" class="w-auto h-auto object-cover">
      <h2 class="text-primary text-[2rem] md:text-[3rem] neue-haas-grotesk-font font-bold">Connexion</h2>

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
    </div>
  </div>
</template>

<script setup>
import '@/assets/auth-form.css'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

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
    if (!success) {
      errorMessage.value = 'Email ou mot de passe incorrect.'
    }
  } catch (e) {
    errorMessage.value = e?.message || 'Erreur lors de la connexion.'
  } finally {
    submitting.value = false
  }
}
</script>

