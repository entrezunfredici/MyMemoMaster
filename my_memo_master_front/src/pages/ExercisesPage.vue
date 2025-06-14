<template>
  <div>
    <section class="flex items-center justify-between">
      <SubjectFilterComponent />
      <router-link to="/create-test">
        <div class="flex gap-5 mr-10">
          <button class="flex items-center gap-2 bg-primary rounded-lg py-0 px-5 text-greyCustom">
            <img class="w-[16px] h-[16px]" :src="editIcon" alt="editIcon" />
            Create test
          </button>
          <img :src="helpIcon" alt="helpIcon" />
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
import helpIcon from '@/assets/test/Help_circle.png'
import editIcon from '@/assets/test/Edit.png'

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
