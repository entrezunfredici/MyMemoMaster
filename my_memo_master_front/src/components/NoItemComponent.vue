<template>
  <!-- RGAA 9.1 : un <p>, pas un <h1> — la page qui affiche ce message a déjà son propre titre de niveau 1 -->
  <div class="flex items-center justify-center h-80">
    <p class="text-2xl font-bold text-center">{{ message }}</p>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, default: 'Aucun élément trouvé.' },
})
</script>
