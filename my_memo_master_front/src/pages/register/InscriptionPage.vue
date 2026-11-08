<template>
  <AuthFormLayout
    title="Inscription"
    image-src="/inscription.png"
    image-alt="Inscription"
    title-class="md:text-[3rem] neue-haas-grotesk-font"
  >
    <form @submit.prevent="submitForm" class="w-full max-w-md mt-6">
      <div class="mb-4">
        <label for="register-name" class="block text-gray-700">Nom</label>
        <input
          id="register-name"
          name="name"
          v-model="name"
          required
          :class="['w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:outline-none', fieldErrors.name ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500']"
        >
        <p v-if="fieldErrors.name" class="text-red-600 text-xs mt-1">{{ fieldErrors.name }}</p>
      </div>

      <div class="mb-4">
        <label for="register-email" class="block text-gray-700">Email</label>
        <input
          id="register-email"
          name="email"
          type="email"
          autocomplete="email"
          v-model.trim="email"
          required
          :class="['w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:outline-none', fieldErrors.email ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500']"
        >
        <p v-if="fieldErrors.email" class="text-red-600 text-xs mt-1">{{ fieldErrors.email }}</p>
      </div>

      <div class="mb-4">
        <label for="register-password" class="block text-gray-700">Mot de passe</label>
        <input
          id="register-password"
          name="password"
          type="password"
          autocomplete="new-password"
          v-model="password"
          minlength="10"
          required
          :class="['w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:outline-none', fieldErrors.password ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500']"
        >
        <p v-if="fieldErrors.password" class="text-red-600 text-xs mt-1">{{ fieldErrors.password }}</p>
      </div>

      <div class="mb-4">
        <label for="register-confirm-password" class="block text-gray-700">Confirmer le mot de passe</label>
        <input
          id="register-confirm-password"
          name="confirmPassword"
          type="password"
          autocomplete="new-password"
          v-model="confirmPassword"
          minlength="10"
          required
          :class="['w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:outline-none', fieldErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500']"
        >
        <p v-if="fieldErrors.confirmPassword" class="text-red-600 text-xs mt-1">{{ fieldErrors.confirmPassword }}</p>
      </div>

      <div class="mb-4">
        <div class="flex items-start gap-3">
          <input
            id="register-accept-rules"
            name="acceptRules"
            type="checkbox"
            v-model="acceptedRules"
            required
            :aria-invalid="fieldErrors.acceptedRules ? 'true' : 'false'"
            class="mt-1 shrink-0"
          >
          <label for="register-accept-rules" class="text-gray-700 text-sm">
            J'accepte les
            <a
              :href="VITE_USAGE_RULES_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="underline text-primary"
            >conditions d'usage de l'application<span class="sr-only"> (s'ouvre dans un nouvel onglet)</span></a>
          </label>
        </div>
        <p v-if="fieldErrors.acceptedRules" class="text-red-700 text-xs mt-1">{{ fieldErrors.acceptedRules }}</p>
      </div>

      <div class="flex flex-col items-center m-2">
        <button
          type="submit"
          :disabled="submitting || !canSubmit"
          class="w-[116px] bg-primary text-white hover:bg-primary-dark focus:outline-none py-2 px-4 rounded valider disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ submitting ? 'Création...' : 'Valider' }}
        </button>

        <router-link to="/auth" class="underline m-3">
          Vous avez déjà un compte ? Connectez-vous !
        </router-link>

        <p v-if="errorMessage" class="text-red-600 text-sm text-center mt-2">
          {{ errorMessage }}
        </p>
      </div>
    </form>

    <OAuthButtonsComponent intro="Ou inscrivez-vous avec :">
      <p class="text-gray-700 text-xs text-center mt-2">
        En continuant, vous acceptez les
        <a
          :href="VITE_USAGE_RULES_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="underline text-primary"
        >conditions d'usage de l'application<span class="sr-only"> (s'ouvre dans un nouvel onglet)</span></a>.
      </p>
    </OAuthButtonsComponent>
  </AuthFormLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { notif } from '@/helpers/notif.js'
import AuthFormLayout from '@/components/AuthFormLayout.vue'
import OAuthButtonsComponent from '@/components/OAuthButtonsComponent.vue'
import { VITE_USAGE_RULES_URL } from '@/config.js'

const authStore = useAuthStore()
const EMAIL_REGEX = /\S+@\S+\.\S+/

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const acceptedRules = ref(false)
const errorMessage = ref('')
const submitting = ref(false)
const fieldErrors = ref({})

const passwordStrengthError = computed(() => {
  const p = password.value || ''
  if (p.length < 10) return 'Le mot de passe doit contenir au moins 10 caractères.'
  if (!/[A-Z]/.test(p)) return 'Le mot de passe doit contenir au moins une majuscule.'
  if (!/[0-9]/.test(p)) return 'Le mot de passe doit contenir au moins un chiffre.'
  return null
})

const canSubmit = computed(() => {
  const trimmedName = (name.value || '').trim()
  const trimmedEmail = (email.value || '').trim()
  return (
    trimmedName.length >= 2 &&
    EMAIL_REGEX.test(trimmedEmail) &&
    !passwordStrengthError.value &&
    password.value === confirmPassword.value &&
    acceptedRules.value
  )
})

function collectValidationErrors() {
  const errors = []
  const fe = {}
  const trimmedName = (name.value || '').trim()
  const trimmedEmail = (email.value || '').trim()
  const p = password.value || ''
  const cp = confirmPassword.value || ''

  if (trimmedName.length < 2) {
    const message = 'Le nom doit contenir au moins 2 caractères.'
    fe.name = message
    errors.push(message)
  }
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    fe.email = 'Format de courriel invalide.'
    errors.push("Le format de l'email est invalide.")
  }
  if (passwordStrengthError.value) {
    fe.password = passwordStrengthError.value
    errors.push(passwordStrengthError.value)
  }
  if (p !== cp) {
    const message = 'Les mots de passe ne correspondent pas.'
    fe.confirmPassword = message
    errors.push(message)
  }
  if (!acceptedRules.value) {
    const message = "Vous devez accepter les conditions d'usage de l'application."
    fe.acceptedRules = message
    errors.push(message)
  }

  return { errors, fieldErrors: fe }
}

async function submitForm() {
  errorMessage.value = ''
  const { errors, fieldErrors: fe } = collectValidationErrors()
  fieldErrors.value = fe

  if (errors.length) {
    errorMessage.value = errors.join(' ')
    notif.notify(errorMessage.value, 'error')
    return
  }

  submitting.value = true
  fieldErrors.value = {}
  try {
    await authStore.register({ name: name.value.trim(), email: email.value.trim(), password: password.value })
  } catch (e) {
    const message = e?.response?.data?.message || e?.message || "Erreur lors de l'inscription."
    errorMessage.value = message
    notif.notify(message, 'error')
  } finally {
    submitting.value = false
  }
}
</script>
