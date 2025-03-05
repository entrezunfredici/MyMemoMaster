<template>
  <div>
    <!-- ACTIONS -->
    <section>
      <SubjectFilter />
    </section>
    
    <!-- LIST -->
    <section class="mt-8">
      <Grid :items="tutorials">
        <template #item="{ item }">
          <Tutorial :tutorial="item" />
        </template>
      </Grid>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SubjectFilter from '@/components/SubjectFilterComponent.vue'
import Grid from '@/components/GridComponent.vue'
import Tutorial from '@/components/TutorialItem.vue'

const tutorials = ref([
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    subject: 1,
  },
])

</script>
