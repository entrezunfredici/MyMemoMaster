<template>
  <div>
    <!-- ACTIONS -->
    <section class="flex items-center justify-between">
      <SubjectFilter />
      <div class="flex items-center gap-4 mx-4">
        <label for="tips" class="text-lg">Tips de révision</label>
        <input type="checkbox" id="tips" name="tips" @click="toggleTips($event.target.checked)" />
      </div>
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
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tutorials = ref([
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
    tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    revision_tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    revision_tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    revision_tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    revision_tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    revision_tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    revision_tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    revision_tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    revision_tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    revision_tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    revision_tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    revision_tips: true,
    subject: 1,
  },
  {
    id: 1,
    title: 'Tutorial 1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Lorem ispsum Lorem isrem ispsumLorem ispsum',
    revision_tips: true,
    subject: 1,
  },
])

function toggleTips(value) {
  const query = { ...route.query }
  if (value) {
    query.tips = true
  } else {
    delete query.tips
  }
  router.push({ path: route.path, query })
}

</script>
