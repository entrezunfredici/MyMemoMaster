<template>
  <AuthFormLayout
    title="Vérification email"
    description="Cliquez sur le lien reçu par email ou saisissez le code manuellement."
  >
    <div v-if="autoVerifying" class="text-center py-8">
      <p class="text-gray-600">Vérification en cours...</p>
    </div>

    <div v-else-if="verified" class="text-center py-8">
      <p class="text-green-600 font-semibold mb-4">Votre email a été vérifié avec succès !</p>
      <router-link to="/auth" class="text-[#1E3BA1] underline">Se connecter</router-link>
    </div>

    <form v-else @submit.prevent="submit" class="w-full max-w-md mt-4">
      <div class="mb-4">
        <label for="ve-email" class="block text-gray-700">Email</label>
        <input
          id="ve-email"
          type="email"
          v-model="emailField"
          required
          class="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div class="mb-4">
        <label for="ve-code" class="block text-gray-700">Code de vérification (6 chiffres)</label>
        <input
          id="ve-code"
          type="text"
          v-model="codeField"
          required
          maxlength="6"
          placeholder="123456"
          class="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <p v-if="errorMessage" class="text-red-600 text-sm mb-3">{{ errorMessage }}</p>

      <div class="flex flex-col items-center gap-3">
        <button
          type="submit"
          :disabled="submitting"
          class="w-full bg-[#1E3BA1] text-white hover:bg-[#162c7a] py-2 px-4 rounded disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ submitting ? 'Vérification...' : 'Vérifier mon email' }}
        </button>
        <router-link to="/auth" class="text-sm text-blue-600 underline">Retour à la connexion</router-link>
      </div>
    </form>
  </AuthFormLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthFormLayout from '@/components/AuthFormLayout.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const emailField = ref('')
const codeField = ref('')
const submitting = ref(false)
const autoVerifying = ref(false)
const verified = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  const email = route.query.email
  const code = route.query.code
  if (email && code) {
    emailField.value = email
    codeField.value = code
    autoVerifying.value = true
    const ok = await authStore.verifyEmail(email, code, false)
    autoVerifying.value = false
    if (ok) {
      verified.value = true
    } else {
      errorMessage.value = 'Le lien de vérification est invalide ou expiré. Saisissez le code manuellement.'
    }
  }
})

async function submit() {
  errorMessage.value = ''
  submitting.value = true
  try {
    const ok = await authStore.verifyEmail(emailField.value.trim(), codeField.value.trim())
    if (ok) {
      verified.value = true
      setTimeout(() => router.push('/auth'), 1500)
    }
  } finally {
    submitting.value = false
  }
}
</script>
