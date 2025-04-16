<template>
  <div>
    <section class="flex items-center justify-between">
      <SubjectFilterComponent />
      <div class="flex gap-5 mr-10">
        <button class="flex items-center gap-2 bg-primary rounded-lg py-0 px-5 text-greyCustom">
          <img class="w-[16px] h-[16px]" :src="editIcon" alt="editIcon">
          Create test
        </button>
        <img :src=helpIcon alt="helpIcon">
      </div>
    </section>

    <section class="mt-8">
      <Grid :items="tests">
        <template #item="{ item }">
          <Tutorial :tutorial="item" />
        </template>
      </Grid>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SubjectFilterComponent from '@/components/SubjectFilterComponent.vue';
import Grid from '@/components/GridComponent.vue'
import Tutorial from '@/components/TutorialItem.vue'
import helpIcon from'@/assets/test/Help_circle.png';
import editIcon from '@/assets/test/Edit.png';

const tests = ref([
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    tips: false,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    tips: true,
    subject: {
      name: 'Sujet 1',
    }
  },
])
  
</script>
