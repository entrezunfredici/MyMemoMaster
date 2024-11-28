<template>
  <div>
    <AppLayout/>
    <main>
      <RouterView />
    </main>
    <Footer />
  </div>
</template>

<script setup>
import AppLayout from '@/components/AppLayoutComponent.vue'
import Footer from '@/components/FooterComponent.vue'
import { RouterView } from 'vue-router'
</script>
