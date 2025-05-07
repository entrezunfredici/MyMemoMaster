<template>
  <div>
    <section class="flex items-center justify-between">
      <SubjectFilterComponent />
      <div class="flex gap-5 mr-10">
        <button class="flex items-center gap-2 bg-primary rounded-lg py-0 px-5 text-greyCustom">
          <img class="w-[16px] h-[16px]" :src="editIcon" alt="editIcon" />
          Create test
        </button>
        <img :src="helpIcon" alt="helpIcon" />
      </div>
    </section>

    <section class="mt-8">
      <Grid :items="testStore.tests">
        <template #item="{ item }">
          <Tutorial :tutorial="item" />
        </template>
      </Grid>
    </section>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTestStore } from '@/stores/test' // ✅ Chemin selon ton arborescence
import SubjectFilterComponent from '@/components/SubjectFilterComponent.vue'
import Grid from '@/components/GridComponent.vue'
import Tutorial from '@/components/TutorialItem.vue'
import helpIcon from '@/assets/test/Help_circle.png'
import editIcon from '@/assets/test/Edit.png'

const testStore = useTestStore()

onMounted(() => {
  testStore.fetchTests()
})
</script>
