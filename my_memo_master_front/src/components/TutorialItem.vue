<template>
    <div class="flex flex-row items-center gap-2" @click="openLink()">
        <div class="border-2 border-light-primary rounded-lg bg-gray flex items-center justify-center cursor-pointer aspect-video h-28 w-28">
            <PlayIcon class="h-5 w-5 text-light-primary" />
        </div>
        <div class="p-4">
            <h4 class="text-xl font-bold">{{ props.tutorial.title }}</h4>
            <p class="text-md">{{ props.tutorial.description }}</p>
            <div class="flex flex-row gap-2 mt-2">
                <Pill v-if="props?.tutorial?.subject?.name" :text="props.tutorial.subject.name" />
                <Pill v-if="props?.tutorial.revision_tips" text="Tips de révision" />
            </div>
        </div>
    </div>
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

function openLink() {
    window.open(props.tutorial.url, '_blank')
}

</script>
