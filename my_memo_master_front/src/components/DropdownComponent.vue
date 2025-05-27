<template>
  <Menu as="div" class="relative inline-block text-left py-2 w-full">
    <div>
      <button
        class="flex justify-between w-full items-center justify-center bg-[#FFF] border-2 border-gray rounded-lg px-2 py-1 text-lg font-medium text-dark"
        @click.stop="show = !show">
        {{ props.title }}
        <ChevronDownIcon
          :class="['ml-2 size-6 text-dark transform transition-transform duration-200', show ? 'rotate-180' : '']"
          :aria-hidden="show" />
      </button>
    </div>
    <TransitionRoot :show="show">
      <TransitionChild v-click-outside="() => show = false" as="div" enter="transition ease-out duration-100 transform"
        enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
        leave="transition ease-in duration-75 transform" leave-from="opacity-100 scale-100"
        leave-to="opacity-0 scale-95"
        class="bg-[#FFF] origin-top-right absolute mt-2 w-full shadow-xl rounded-lg bg-light p-4 z-10">
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
  title: {
    type: String,
    required: true,
  },
})

const show = ref(false)
</script>