<template>
  <div>
      <!-- Desktop header -->
    <header class="flex justify-between items-center bg-dark-light border-b border-gray p-4 gap-3">
      <Bars3Icon class="size-10 text-gray-light rounded-lg p-1 cursor-pointer"/>
      <router-link :to="route.path">
        <h1 class="text-2xl font-bold text-light">
          {{ route.meta.title }}
        </h1>
      </router-link>
      <MagnifyingGlassIcon class="size-10 text-gray-light rounded-full p-1.5 cursor-pointer"/>
    </header>
  </div>
</template>

<script setup>
import { MagnifyingGlassIcon } from '@heroicons/vue/24/solid'
import { Bars3Icon } from '@heroicons/vue/24/solid'
import { useRoute } from 'vue-router'

const route = useRoute()

</script>