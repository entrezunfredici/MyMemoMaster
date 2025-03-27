<template>
  <div class="rounded-lg border border-gray p-4 max-w-md mx-auto mt-8">
    <h2 class="text-center text-light text-2xl font-semibold mt-4 mb-8">{{ tabs[authStore.authentication.tab].title }}
    </h2>
    <component :is="tabs[authStore.authentication.tab].component" />
  </div>
</template>

<script setup>
import AuthLogin from '@/components/auth/AuthLogin.vue'
import AuthRegister from '@/components/auth/AuthRegister.vue'
import AuthForgotPassword from '@/components/auth/AuthForgotPassword.vue'
import AuthResetPassword from '@/components/auth/AuthResetPassword.vue'
import { ref, shallowRef } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const tabs = ref({
  login: {
    title: 'Se connecter',
    component: shallowRef(AuthLogin),
  },
  register: {
    title: 'S\'inscrire',
    component: shallowRef(AuthRegister),
  },
  forgotPassword: {
    title: 'Mot de passe oublié ?',
    component: shallowRef(AuthForgotPassword),
  },
  resetPassword: {
    title: 'Réinitialiser votre mot de passe',
    component: shallowRef(AuthResetPassword),
  }
})

</script>