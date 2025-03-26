<template>
  <TransitionRoot :show="percentage > 0" class="w-full">
    <TransitionChild enter="transition ease-in-out duration-300 transform" enter-from="opacity-0 scale-95"
      enter-to="opacity-100 scale-100" leave="transition ease-in-out duration-300 transform"
      leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
      <span class="text-light text-sm">Password strength</span>
      <div class="overflow-hidden h-4 my-2 flex rounded-full bg-gray-dark">
        <div :style="`width: ${percentage}%`" :class="color"></div>
      </div>
    </TransitionChild>
  </TransitionRoot>
</template>

<script setup>
import { computed } from 'vue'
import { missingsElementsPassword } from '@/helpers/functions.js'
import { TransitionRoot, TransitionChild } from '@headlessui/vue'

const props = defineProps({
  password: {
    type: String,
    required: false
  }
})

const percentage = computed(() => {
  const p = Math.abs(missingsElementsPassword(props.password).length - 5) * 20
  return props.password ? p : 0
})

const color = computed(() => {
  switch (true) {
    case percentage.value < 20:
      return 'bg-password-step-1'
    case percentage.value < 40:
      return 'bg-password-step-1'
    case percentage.value < 60:
      return 'bg-password-step-2'
    case percentage.value < 80:
      return 'bg-password-step-3'
    case percentage.value < 100:
      return 'bg-password-step-4'
    default:
      return 'bg-password-step-5'
  }
})
</script>