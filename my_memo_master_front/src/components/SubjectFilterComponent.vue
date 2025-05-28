<template>
  <div class="flex items-center justify-start max-w-2xl overflow-x-auto">
    <!-- Bouton "Tous" -->
    <div
      :class="[
        'p-1 px-4 border-b-2 border-b-gray hover:border-b-primary text-gray hover:text-primary cursor-pointer',
        !route.query.subject ? 'border-b-primary text-primary' : ''
      ]"
      @click="resetSubject"
    >
      Tous
    </div>

    <!-- Sujets dynamiques depuis le store -->
    <div
      v-for="subject in subjectStore.subjects"
      :key="subject.subjectId"
      :class="[
        'p-1 px-4 border-b-2 border-b-gray hover:border-b-primary text-gray hover:text-primary cursor-pointer',
        route.query.subject === subject.subjectId.toString() ? 'border-b-primary text-primary' : ''
      ]"
      @click="toggleSubject(subject.subjectId)"
    >
      {{ subject.name }}
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSubjectStore } from '@/stores/subjects'

const route = useRoute()
const router = useRouter()
const subjectStore = useSubjectStore()

// Remplit les sujets au montage
onMounted(() => {
  if (subjectStore.subjects.length === 0) {
    subjectStore.fetchSubjects()
  }
})

function resetSubject() {
  const query = { ...route.query }
  delete query.subject
  router.push({ path: route.path, query })
}

function toggleSubject(value) {
  const query = { ...route.query }
  query.subject = value
  router.push({ path: route.path, query })
}
</script>
