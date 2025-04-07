<template>
  <div class="grid place-items-center h-screen bg-light">
    <section>
      <img src="/personne-heureuse-et-faussement-epanoui.webp" alt="Image d'illustration" class="mx-auto mb-4" />
    </section>  
    <section>
      <h2 class="text-center text-light text-2xl font-semibold mt-4 mb-8">{{ tabs[authStore.authentication.tab].title }}
      </h2>
      <component :is="tabs[authStore.authentication.tab].component" />
    </section>  
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