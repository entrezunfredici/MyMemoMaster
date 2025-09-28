<template>
  <div class="home">
    <section class="home__interpreter">
      <Interpreter />
    </section>
  </div>
</template>

<script setup>
import Interpreter from '@/components/Interpreter.vue';
</script>

<style scoped>
.home {
  padding: 24px;
}

.home__interpreter {
  max-width: 960px;
  margin: 0 auto;
}
</style>
