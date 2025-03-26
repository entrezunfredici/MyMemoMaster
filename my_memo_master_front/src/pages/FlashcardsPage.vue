<template>
  <div>
    Salut salut
  </div>
  <div class="flex h-screen">
  <!-- Colonne gauche avec scroll -->
  <div class="w-1/3 h-screen rounded-lg overflow-auto bg-blue-500 p-4 m-4 border border-white">
    <p class="h-[200vh]">Contenu long qui permet de scroller...</p>
  </div>

  <!-- Colonne droite fixe -->
  <div class="w-2/3 h-screen rounded-lg bg-green-500 p-4 m-4 border border-white sticky top-0">
    <DiagramTest />
    </div>
</div>


</template>

<script setup>
import DiagramTest from '@/components/DiagramTestComponent.vue'

</script>
