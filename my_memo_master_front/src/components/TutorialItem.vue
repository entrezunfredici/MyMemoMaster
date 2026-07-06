<template>
    <!-- RGAA 7.x/12.x — lien natif plutôt que div @click : focusable et activable au clavier -->
    <a
        :href="props.tutorial.url"
        target="_blank"
        rel="noopener noreferrer"
        class="flex flex-row items-center gap-2 no-underline text-inherit"
        :aria-label="`Ouvrir le tutoriel ${props.tutorial.name} (nouvel onglet)`"
    >
        <div class="border-2 border-light-primary rounded-lg bg-gray flex items-center justify-center cursor-pointer aspect-video h-28 w-28">
            <PlayIcon class="h-5 w-5 text-light-primary" aria-hidden="true" />
        </div>
        <div class="p-4">
            <h4 class="text-xl font-bold">{{ props.tutorial.name }}</h4>
            <p class="text-md">{{ props.tutorial.description }}</p>
            <div class="flex flex-row gap-2 mt-2">
                <Pill v-if="props?.tutorial?.subject?.name" :text="props.tutorial.subject.name" />
                <Pill v-if="props?.tutorial.revision_tips" text="Tips de révision" />
            </div>
        </div>
    </a>
</template>

<script setup>
import { PlayIcon } from '@heroicons/vue/24/solid'
import Pill from '@/components/PillComponent.vue'

const props = defineProps({
    tutorial: {
        type: Object,
        required: true,
    },
})
</script>
