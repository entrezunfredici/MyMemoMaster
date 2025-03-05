<template>
  <div class="flex items-center justify-start max-w-2xl overflow-x-auto">
    <div :class="['p-1 px-4 border-b-2 border-b-gray hover:border-b-primary text-gray hover:text-primary cursor-pointer',
      !route.query.subject ? 'border-b-primary text-primary' : '',
    ]" @click="resetsubject">
      Tous
    </div>
    <div v-for="n in 5" :key="n" :class="['p-1 px-4 border-b-2 border-b-gray hover:border-b-primary text-gray hover:text-primary cursor-pointer',
      route.query.subject === n.toString() ? 'border-b-primary text-primary' : '',
    ]" @click="toggleSubject(n)">
      Sujet {{ n }}
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

function resetsubject() {
  const query = { ...route.query }
  delete query.subject
  router.push({ path: route.path, query })
}

function toggleSubject(value) {
  const query = { ...route.query }
  if (value === 'default') {
    delete query.subject
  } else {
    query.subject = value
  }
  router.push({ path: route.path, query })
}
</script>