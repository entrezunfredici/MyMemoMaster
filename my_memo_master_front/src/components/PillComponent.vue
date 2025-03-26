<template>
    <div :class="['flex items-center gap-2 rounded-full px-2.5  bg-primary', props.clickable ? 'cursor-pointer' : '']">
        <span class="text-sm text-light">{{ props.text }}</span>
    </div>
</template>

<script setup>

const props = defineProps({
    text: {
        type: String,
        required: true,
    },
    clickable: {
        type: Boolean,
        default: false,
        required: false,
    },
})

</script>