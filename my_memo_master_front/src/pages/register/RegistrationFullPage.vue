<template>
  <div class="flex flex-col items-center justify-center gap-4 text-center px-4">
    <h1 class="text-[3rem] font-bold text-primary">Inscriptions complètes</h1>
    <p class="text-lg text-dark max-w-md">
      MyMemoMaster a atteint son nombre maximal d'utilisateurs. Les inscriptions sont temporairement fermées, merci de réessayer plus tard.
    </p>
    <div class="flex gap-3">
      <Button type="outline" @click="goHome()">Retour à l'accueil</Button>
      <Button @click="goToLogin()">J'ai déjà un compte</Button>
    </div>
  </div>
</template>

<script setup>
import Button from '@/components/ButtonComponent.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/')
}

function goToLogin() {
  router.push('/auth')
}
</script>
