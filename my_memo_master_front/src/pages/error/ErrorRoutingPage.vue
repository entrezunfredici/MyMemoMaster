<template>
  <div class="flex flex-col items-center justify-center gap-4">
    <h1 class="text-[8rem] font-bold text-primary">404</h1>
    <p class="text-lg text-dark">Frérot tu va où la ??</p>
    <Button @click="goHome()">Rentrer à la maison</Button>
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