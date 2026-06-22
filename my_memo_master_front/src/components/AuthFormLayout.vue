<template>
  <div class="flex h-screen w-full bg-primary rounded-[50px]">
    <div class="hidden md:block w-[70%] h-full bg-primary border-[5px] border-primary rounded-[18px]">
      <img :src="imageSrc" :alt="imageAlt" class="w-full h-full object-cover imageConnexion">
    </div>

    <div class="w-full md:w-[30%] flex flex-col justify-center items-center bg-white px-8 md:px-16 border border-[#1E3BA1] custom-border formulaire">
      <img src="/logo/logo-full.svg" alt="logo" class="w-auto h-auto object-cover">
      <h2 class="text-primary text-[2rem] font-bold text-center" :class="titleClass">{{ title }}</h2>
      <p v-if="description" class="text-gray-500 text-sm text-center mt-2 mb-6">{{ description }}</p>
      <slot />
    </div>
  </div>
</template>

<script setup>
import '@/assets/auth-form.css'

defineProps({
  title: { type: String, required: true },
  imageSrc: { type: String, default: '/connexion.jpg' },
  imageAlt: { type: String, default: 'Illustration' },
  description: { type: String, default: null },
  titleClass: { type: String, default: 'md:text-[2.5rem]' },
})
</script>
