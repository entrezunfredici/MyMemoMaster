<template>
  <div class="flex min-h-screen">
    <aside class="sticky top-0 h-screen m-1 sm:m-2 md:m-4 lg:m-6">
      <div class="my-6">
        <!-- TODO: logo here -->
        LOGO HERE
      </div>
      <nav class="flex flex-col items-center justify-between rounded-lg border-2 border-light-blue p-2 w-16"
        style=" height: calc(100% - 4rem);">
        <div class="flex flex-col items-center gap-2 justify-center">
          <router-link to="/mindmaps"
            :class="[route?.name && route.name.includes('mindmaps') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <MindmapIcon class="size-7" />
          </router-link>
          <router-link to="/flashcards"
            :class="[route?.name && route.name.includes('flashcards') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <FlashardIcon class="size-7" />
          </router-link>
          <router-link to="/exercises"
            :class="[route?.name && route.name.includes('exercises') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <ExercisesIcon class="size-7" />
          </router-link>
          <router-link to="/classroom"
            :class="[route?.name && route.name.includes('classroom') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <ClassroomIcon class="size-7" />
          </router-link>
          <router-link to="/community"
            :class="[route?.name && route.name.includes('community') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <CommunityIcon class="size-7" />
          </router-link>
        </div>
        <div class="flex flex-col items-center gap-2 justify-center">
          <router-link to="/profile"
            :class="[route?.name && route.name.includes('profile') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <ProfileIcon class="size-7" />
          </router-link>
          <router-link to="/settings"
            :class="[route?.name && route.name.includes('settings') ? 'bg-light-blue' : '', 'text-orange p-2 rounded-lg']">
            <SettingsIcon class="size-7" />
          </router-link>
        </div>
      </nav>
    </aside>

    <main class="flex-1 p-6">
      <header class="mb-6">
        <h1 class="text-blue text-[2rem] font-bold">{{ route.meta.title }}</h1>
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
