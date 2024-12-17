<template>
  <footer>
    <p class="text-center text-gray-light text-sm p-4">Made by {{ VITE_APP_AUTHOR_NAME }} with {{ `
      <3`}} </p>
  </footer>
</template>

<script setup>
import { VITE_APP_AUTHOR_NAME } from '@/config';
</script>