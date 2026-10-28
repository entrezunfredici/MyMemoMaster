<template>
  <AuthFormLayout
    :title="authStore.twoFactorChallenge ? 'Vérification' : 'Connexion'"
    title-class="md:text-[3rem] neue-haas-grotesk-font"
  >
    <form v-if="!authStore.twoFactorChallenge" @submit.prevent="submitForm" class="w-full max-w-md mt-6">
      <div class="mb-4">
        <label for="login-email" class="block text-gray-700">Email</label>
        <input id="login-email" name="email" type="email" autocomplete="email" v-model="email" required
          class="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
      </div>

      <div class="mb-4">
        <label for="login-password" class="block text-gray-700">Mot de passe</label>
        <input id="login-password" name="password" type="password" autocomplete="current-password" v-model="password" required
          class="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
        <router-link to="/forgot-password" class="text-sm text-blue-600">Mot de passe oublié ?</router-link>
      </div>

      <div class="flex flex-col items-center">
        <button
          type="submit"
          :disabled="submitting"
          class="w-[116px] bg-primary text-white !text-white hover:bg-primary-dark focus:outline-none py-2 px-4 rounded valider disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ submitting ? 'Connexion...' : 'Valider' }}
        </button>
        <a href="/register" class="underline m-3">Vous n'avez pas un compte ? Créez en un !</a>
        <p v-if="errorMessage" class="text-red-600 text-sm text-center mt-2 font-medium">
          {{ errorMessage }}
        </p>
      </div>
    </form>

    <form v-else @submit.prevent="submitCode" class="w-full max-w-md mt-6">
      <p class="text-gray-700 mb-4">
        Un code à 6 chiffres vient de vous être envoyé par email. Il est valable 10 minutes.
      </p>

      <div class="mb-4">
        <label for="login-code" class="block text-gray-700">Code de vérification</label>
        <input id="login-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code"
          maxlength="6" pattern="[0-9]{6}" v-model="code" required
          class="w-full mt-1 p-3 border rounded-lg tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-none">
      </div>

      <div class="flex flex-col items-center">
        <button
          type="submit"
          :disabled="submitting"
          class="w-[116px] bg-primary text-white !text-white hover:bg-primary-dark focus:outline-none py-2 px-4 rounded valider disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ submitting ? 'Vérification...' : 'Valider' }}
        </button>
        <button type="button" class="underline m-3" :disabled="resending" @click="resendCode">
          Renvoyer le code
        </button>
        <button type="button" class="underline" @click="backToLogin">
          Retour à la connexion
        </button>
        <p v-if="errorMessage" role="alert" class="text-red-600 text-sm text-center mt-2 font-medium">
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
const code = ref('')
const errorMessage = ref('')
const submitting = ref(false)
const resending = ref(false)

async function submitForm() {
  errorMessage.value = ''
  submitting.value = true
  try {
    const success = await authStore.login(email.value, password.value, '/')
    if (success === false) {
      errorMessage.value = 'Email ou mot de passe incorrect.'
    } else if (success === 'twoFactor') {
      // Le mot de passe ne doit pas rester en mémoire de la page une fois l'étape franchie
      password.value = ''
      code.value = ''
    }
  } catch (e) {
    errorMessage.value = e?.message || 'Erreur lors de la connexion.'
  } finally {
    submitting.value = false
  }
}

async function submitCode() {
  errorMessage.value = ''
  submitting.value = true
  try {
    const result = await authStore.verifyTwoFactor(code.value.trim(), '/')
    if (result === 'expired') {
      errorMessage.value = 'La vérification a expiré. Reconnectez-vous.'
    } else if (result === false) {
      errorMessage.value = 'Code invalide ou expiré.'
      code.value = ''
    }
  } catch (e) {
    errorMessage.value = e?.message || 'Erreur lors de la vérification.'
  } finally {
    submitting.value = false
  }
}

async function resendCode() {
  errorMessage.value = ''
  resending.value = true
  try {
    await authStore.resendTwoFactorCode()
  } finally {
    resending.value = false
  }
}

function backToLogin() {
  errorMessage.value = ''
  code.value = ''
  authStore.cancelTwoFactor()
}
</script>
