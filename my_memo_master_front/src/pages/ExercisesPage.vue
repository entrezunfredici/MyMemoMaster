<template>
  <div>
    <section class="flex items-center justify-between">
      <SubjectFilterComponent />
      <router-link to="/create-test">
        <div class="flex gap-5 mr-10">
          <button class="flex items-center gap-2 bg-primary rounded-lg py-0 px-5 text-[#F5F5F5]">
            <PenIcon class="size-16" />
            <img class="w-[16px] h-[16px]" :src="editIcon" alt="editIcon" />
            Create test
          </button>
          <InformationCircleIcon class="text-primary size-8" />
        </div>
      </router-link>
    </section>

    <section class="mt-8">
      <Grid :items="filteredTests">
        <template #item="{ item }">
          <Tutorial :tutorial="item" />
        </template>
      </Grid>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTestStore } from '@/stores/test'
import SubjectFilterComponent from '@/components/SubjectFilterComponent.vue'
import Grid from '@/components/GridComponent.vue'
import Tutorial from '@/components/TutorialItem.vue'
import { PenIcon } from '@heroicons/vue/24/outline'
import { InformationCircleIcon } from '@heroicons/vue/24/outline'


const route = useRoute()
const testStore = useTestStore()

onMounted(() => {
  testStore.fetchTests()
})

// 🎯 Computed qui filtre les tests selon subjectId
const filteredTests = computed(() => {
  const subjectId = route.query.subject
  if (!subjectId) return testStore.tests
  return testStore.tests.filter(test => test.subjectId?.toString() === subjectId)
})
</script>
