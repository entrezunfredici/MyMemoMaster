<template>
  <div>
    <div class="position-fixed top-0 left-0 w-1/6 h-full flex flex-col items-center justify-between">
      <div>
        LOGO HERE
      </div>
      <nav class="flex flex-col items-center justify-between rounded-lg border-2 border-light-blue p-2">
        <div class="flex flex-col items-center gap-2 justify-center">
          <router-link to="/mindmaps"
            :class="[route?.name && route.name.includes('mindmaps') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <MindmapIcon />
          </router-link>
          <router-link to="/flashcards"
            :class="[route?.name && route.name.includes('flashcards') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <FlashardIcon />
          </router-link>
          <router-link to="/exercises"
            :class="[route?.name && route.name.includes('exercises') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <ExercisesIcon />
          </router-link>
          <router-link to="/classroom"
            :class="[route?.name && route.name.includes('classroom') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <ClassroomIcon />
          </router-link>
          <router-link to="/community"
            :class="[route?.name && route.name.includes('community') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <CommunityIcon />
          </router-link>
        </div>
        <div class="flex flex-col items-center gap-2 justify-center">
          <router-link to="/profile"
            :class="[route?.name && route.name.includes('profile') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <ProfileIcon />
          </router-link>
          <router-link to="/settings"
            :class="[route?.name && route.name.includes('settings') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <SettingsIcon />
          </router-link>
        </div>
      </nav>
    </div>

    <main>
      <header class="mb-6">
        <h1 class="text-blue">{{ route.meta.title }}</h1>
      </header>
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import ClassroomIcon from '@/icons/ClassroomIcon.vue'
import CommunityIcon from '@/icons/CommunityIcon.vue'
import ExercisesIcon from '@/icons/ExercisesIcon.vue'
import FlashardIcon from '@/icons/FlashardIcon.vue'
import MindmapIcon from '@/icons/MindmapIcon.vue'
import ProfileIcon from '@/icons/ProfileIcon.vue'
import SettingsIcon from '@/icons/SettingsIcon.vue'
import { useRoute } from 'vue-router'

const route = useRoute()

</script>

<script setup>
</script>
