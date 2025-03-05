<template>
    <div class="border-2 border-primary p-4 flex flex-row items-center gap-4">
        <iframe class="w-1/3" :src="props.tutorial.url" title="YouTube video player"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin" allowfullscreen>
        </iframe>
        <div class="w-2/3">
            <h4 class="text-xl font-bold">{{ props.tutorial.title }}</h4>
            <p class="text-md">{{ props.tutorial.description }}</p>
        </div>
    </div>
</template>

<script setup>

const props = defineProps({
    tutorial: {
        type: Object,
        required: true,
    },
})

</script>
