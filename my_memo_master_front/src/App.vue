<template>
  <!-- NO LAYOUT -->
  <div v-if="route.name.includes('auth')" >
    <main>
      <RouterView />
    </main>
  </div>
  <!-- DESKTOP LAYOUT -->
  <div v-else-if="!isMobile()" class="flex flex-1 min-h-screen">
    <aside class="flex flex-col items-center justify-center sticky top-0 h-screen mx-2 sm:mx-4 md:mx-6 lg:mx-8">
      <router-link to="/" class="my-6">
        <img src="/logo/logo-full.svg" :alt="VITE_APP_NAME">
      </router-link>
      <nav class="flex flex-col items-center justify-between rounded-xl border-2 border-gray mb-4 p-2 w-20"
        style="height: calc(100% - 9rem);">
        <div class="flex flex-col items-center gap-3 justify-center">
          <router-link to="/"
            :class="[route?.name && route.name === 'home' ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
            <HomeIcon class="size-8" />
          </router-link>
          <router-link to="/tutorials"
            :class="[route?.name && route.name.includes('tutorials') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
            <TutorialIcon class="size-8" />
          </router-link>
          <router-link to="/mindmaps"
            :class="[route?.name && route.name.includes('mindmaps') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
            <MindmapIcon class="size-8" />
          </router-link>
          <router-link to="/flashcards"
            :class="[route?.name && route.name.includes('flashcards') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
            <FlashardIcon class="size-8" />
          </router-link>
          <router-link to="/exercises"
            :class="[route?.name && route.name.includes('exercises') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
            <ExercisesIcon class="size-8" />
          </router-link>
          <router-link to="/classroom"
            :class="[route?.name && route.name.includes('classroom') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
            <ClassroomIcon class="size-8" />
          </router-link>
          <!-- <router-link to="/credits"
            :class="[route?.name && route.name.includes('credits') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
            <CreditsIcon class="size-8" />
          </router-link> -->
        </div>
        <div class="flex flex-col items-center gap-3 justify-center">
          <router-link to="/profile"
            :class="[route?.name && route.name.includes('profile') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
            <ProfileIcon class="size-8" />
          </router-link>
          <router-link to="/settings"
            :class="[route?.name && route.name.includes('settings') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
            <SettingsIcon class="size-8" />
          </router-link>
        </div>
      </nav>
    </aside>

    <div class="flex-1">
      <header class="mt-20 lg:mt-16 xl:mt-12 mb-3">
        <h1 class="text-primary text-[3rem] lg:text-[4rem] xl:text-[4rem] neue-haas-grotesk-b font-bold">{{
          route.meta.title }}</h1>
      </header>
      <main class="mb-8 mr-4">
        <RouterView />
      </main>
    </div>
  </div>
  <!-- MOBIL LAYOUT -->
  <div v-else-if="isMobile()" class="min-h-screen">
    <header class="m-4">
      <h1 class="text-primary text-[3rem] lg:text-[4rem] xl:text-[4rem] neue-haas-grotesk-b font-bold">{{
        route.meta.title }}</h1>
    </header>
    <main class="m-4 pb-[75px]">
      <RouterView />
    </main>
    <nav
      class="flex flex-wrap items-center justify-evenly rounded-xl border-2 border-gray p-2 m-2 fixed inset-x-0 bottom-0 w-[98%] bg-light">
      <router-link to="/"
        :class="[route?.name && route.name === 'home' ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
        <HomeIcon class="size-8" />
      </router-link>
      <router-link to="/tutorials"
        :class="[route?.name && route.name.includes('tutorials') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
        <TutorialIcon class="size-8" />
      </router-link>
      <router-link to="/mindmaps"
        :class="[route?.name && route.name.includes('mindmaps') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
        <MindmapIcon class="size-8" />
      </router-link>
      <router-link to="/flashcards"
        :class="[route?.name && route.name.includes('flashcards') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
        <FlashardIcon class="size-8" />
      </router-link>
      <router-link to="/exercises"
        :class="[route?.name && route.name.includes('exercises') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
        <ExercisesIcon class="size-8" />
      </router-link>
      <router-link to="/classroom"
        :class="[route?.name && route.name.includes('classroom') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
        <ExercisesIcon class="size-8" />
      </router-link>
      <!-- <router-link to="/credits"
        :class="[route?.name && route.name.includes('credits') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
        <ExercisesIcon class="size-8" />
      </router-link> -->
      <router-link to="/profile"
        :class="[route?.name && route.name.includes('profile') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
        <ProfileIcon class="size-8" />
      </router-link>
      <router-link to="/settings"
        :class="[route?.name && route.name.includes('settings') ? 'text-light bg-primary' : 'text-primary bg-light', 'p-3 rounded-lg']">
        <SettingsIcon class="size-8" />
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import ExercisesIcon from '@/icons/ExercisesIcon.vue'
import FlashardIcon from '@/icons/FlashardIcon.vue'
import MindmapIcon from '@/icons/MindmapIcon.vue'
import TutorialIcon from '@/icons/TutorialIcon.vue'
import ProfileIcon from '@/icons/ProfileIcon.vue'
import SettingsIcon from '@/icons/SettingsIcon.vue'
// import CreditsIcon from '@/icons/CommunityIcon.vue'
import ClassroomIcon from '@/icons/ClassroomIcon.vue'
import { HomeIcon } from '@heroicons/vue/24/outline'
import { useRoute } from 'vue-router'
import { VITE_APP_NAME } from '@/config';
import { isMobile } from '@/helpers/functions';

const route = useRoute()

</script>

<script setup>
</script>
