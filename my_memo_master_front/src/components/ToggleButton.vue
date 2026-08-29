<template>
  <label class="switch">
    <input type="checkbox" :checked="localValue" :aria-label="ariaLabel" @change="toggle" />
    <span class="slider round"></span>
  </label>
</template>

<script setup>
import { computed } from 'vue'

// RGAA 11.1 : le <label> n'entoure que le curseur visuel (span.slider), sans
// texte — l'input n'a donc aucun nom accessible sans aria-label explicite.
const props = defineProps({
  modelValue: Boolean,
  ariaLabel: {
    type: String,
    required: true,
  }
})
const emit = defineEmits(['update:modelValue'])

const localValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

function toggle(event) {
  localValue.value = event.target.checked
}
</script>


<style scoped>
.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color:var(--primary);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--primary);
}

input:checked + .slider:before {
  transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>
