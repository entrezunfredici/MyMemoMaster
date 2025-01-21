<template>
  <Menu as="div" class="relative inline-block text-left">
    <div>
      <button
        class="py-2.5 px-3 rounded-lg inline-flex items-center justify-center text-md font-medium"
        @click.stop="showDropdown = !showDropdown">
        {{ props.name }}
        <ChevronDownIcon
          :class="['ml-2 h-5 w-5 text-light transform transition-transform duration-200', showDropdown ? 'rotate-180' : '']" />
      </button>
    </div>
    <TransitionRoot :show="showDropdown">
      <TransitionChild v-click-outside="() => showDropdown = false" as="div"
        enter="transition ease-out duration-100 transform" enter-from="opacity-0 scale-95"
        enter-to="opacity-100 scale-100" leave="transition ease-in duration-75 transform"
        leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
        :class="['origin-top-right absolute', props.side === 'right' ? 'right-0' : 'left-0', 'mt-2 w-56 rounded-lg bg-light p-4 z-10']">
        <slot></slot>
      </TransitionChild>
    </TransitionRoot>
  </Menu>
</template>

<script setup>
import { ref } from 'vue'
import { Menu, TransitionRoot, TransitionChild } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/24/solid'
import vClickOutside from '@/directives/clickOutside.js'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  side: {
    type: String,
    required: false,
    default: 'left',
    validator: (value) => ['left', 'right'].includes(value),
  },
})

const showDropdown = ref(false)
</script>