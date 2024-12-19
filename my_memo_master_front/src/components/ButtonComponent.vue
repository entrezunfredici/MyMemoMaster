<template>
  <button
    :class="['button', 'py-2.5 px-3 rounded-lg inline-flex items-center justify-center text-md font-medium', types[props.type]]"
    :disabled="disabled || false" @click="callback">
    <slot></slot>
  </button>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  callback: {
    type: Function,
    required: false,
    default: () => { },
  },
  disabled: {
    type: Boolean,
    required: false,
    default: false,
  },
  type: {
    type: String,
    required: false,
    default: 'normal',
    validator: (value) => {
      return ['normal', 'outline'].includes(value)
    },
  },
})

const types = ref({
  normal: 'bg-primary text-light',
  outline: 'bg-light text-primary border-2 border-primary',
})

</script>

<style scoped>
button.button {
  transition: all 0.3s;
}

button.button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

button.button:focus {
  outline: none;
}

button.button:hover {
  filter: brightness(1.15);
}
</style>