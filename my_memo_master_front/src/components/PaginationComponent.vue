<template>
  <div v-if="props.total > 1" class="flex justify-center items-center gap-4 m-8">
    <ChevronLeftIcon v-if="props.page > 1" class="size-6 arrow left"
      @click="$emit('updatePage', (props.page > 1 ? props.page - 1 : 1) || 1)" />
    <span v-else>&nbsp;</span>

    <!-- First page -->
    <div v-if="props.page > 2" class="number" @click="$emit('updatePage', 1)"> 1 </div>
    <div v-if="props.page > 3"> ... </div>

    <!-- Previous page -->
    <div v-if="props.page > 1" class="number" @click="$emit('updatePage', props.page - 1)">
      {{ props.page - 1 }}
    </div>

    <!-- Current page -->
    <div class="number active">{{ props.page }}</div>

    <!-- Next page -->
    <div v-if="props.page < props.total" class="number" @click="$emit('updatePage', props.page + 1)">
      {{ props.page + 1 }}
    </div>

    <!-- Last page -->
    <div v-if="props.page < props.total - 2"> ... </div>
    <div v-if="props.page < props.total - 1" class="number" @click="$emit('updatePage', props.total)">
      {{ props.total }}
    </div>

    <ChevronRightIcon v-if="props.page < props.total" class="size-6 arrow right"
      @click="$emit('updatePage', (props.page < props.total ? props.page + 1 : props.total) || 1)" />
    <span v-else>&nbsp;</span>
  </div>
</template>

<script setup>
import { ChevronLeftIcon } from '@heroicons/vue/24/solid'
import { ChevronRightIcon } from '@heroicons/vue/24/solid'

const props = defineProps({
  total: {
    type: Number,
    required: true,
  },
  page: {
    type: Number,
    required: true,
  },
  perPage: {
    type: Number,
    required: true,
  },

})

</script>

<style scoped>
.arrow {
  cursor: pointer;
  transition: transform 0.3s;
}

.arrow.left:hover {
  transform: translateX(-4px);
}

.arrow.right:hover {
  transform: translateX(4px);
}

.number {
  cursor: pointer;
  transition: color 0.3s;
  color: var(--gray-light);
}

.number.active {
  color: var(--light);
}

</style>