<template>
  <div class="flex flex-col items-center justify-center gap-4">
    <h1 class="text-[8rem] font-bold text-primary">500</h1>
    <p class="text-lg text-dark">Il semble qu'il y ait un problème avec le serveur. Veuillez réessayer plus tard.</p>
    <Button @click="goHome()">Réessayer</Button>
  </div>
</template>

<script setup>
import Button from '@/components/ButtonComponent.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/')
}

</script>