<template>
  <div>
    WIP
    {{ props?.mindmap }}
  </div>
</template>

<script setup>

const props = defineProps({
  mindmap: {
    type: Object,
    required: false,
  },
})
</script>
