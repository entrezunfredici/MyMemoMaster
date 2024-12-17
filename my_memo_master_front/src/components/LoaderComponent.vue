<template>
  <div v-if="props.enabled" class="flex items-center justify-center h-96 min-h-screen">
    <span class="loader"></span>
  </div>
</template>

<script setup>

const props = defineProps({
  enabled: {
    type: Boolean,
    default: true,
    required: false,
  },
})
</script>

<style scoped>
.loader {
  width: 84px;
  height: 84px;
  border: 5px solid #FFF;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>