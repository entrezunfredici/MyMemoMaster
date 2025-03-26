<template>
  <Dropdown title="Sort" side="right">
    <div class="space-y-2">
      <button @click="resetSort"
        class="w-full text-left text-light transition-colors duration-200 hover:bg-gray px-4 py-2 rounded-md">Default</button>
      <button v-for="item in props.items" :key="item.value" @click="toggleSort(item.value)"
        class="w-full text-left text-light transition-colors duration-200 hover:bg-gray px-4 py-2 rounded-md">{{
          item.label }}</button>
    </div>
  </Dropdown>
</template>

<script setup>
import Dropdown from '@/components/DropdownComponent.vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  options: {
    type: Array,
    required: true,
    
  },
})

const route = useRoute()
const router = useRouter()

function resetSort() {
  const query = { ...route.query }
  delete query.sort
  router.push({ path: route.path, query })
}

function toggleSort(value) {
  const query = { ...route.query }
  if (value === 'default') {
    delete query.sort
  } else {
    query.sort = value
  }
  router.push({ path: route.path, query })
}
</script>