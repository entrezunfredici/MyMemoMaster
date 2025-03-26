<template>
  <div class="grid grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1 gap-1.5 bg-primary rounded-[10px] p-1.5">
    <section class="order-2 lg:order-1 p-5 bg-light rounded-[7px]">
      <div class="w-full">
        <h4 class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4">
          LS Name
        </h4>

        <Dropdown title="Sort">
          <div v-for="item in ['One', 'Two', 'Three']" :key="item">
            <button class="w-full p-2  rounded-lg text-left text-dark hover:bg-primary hover:text-light">
              {{ item }}
            </button>
          </div>
        </Dropdown>

        <div class="py-4">
          <span class="text-lg font-medium text-gray-light">Question</span>
          <input type="text" placeholder="Quelle est la loi de bernouilli ?" class="w-full p-2 rounded-lg text-dark" />
        </div>

        <div class="py-4">
          <span class="text-lg font-medium text-gray-light">Réponse</span>
          <textarea placeholder="Quelle est la loi de bernouilli ?" class="w-full p-2 rounded-lg text-dark" />
        </div>

        <div class="border-4 border-primary rounded-lg px-8 py-4">
          <h4 class="text-primary text-xl neue-haas-grotesk-r font-semibold pb-4">
            Questions récap
          </h4>
          <div class="flex flex-col gap-4">
            <div v-for="index in [1, 2, 3, 4]" :key="index"
              class="flex justify-between border-2 bg-[#FFF] border-gray rounded-lg px-4 py-2">
              <span class="text-lg text-dark">Question {{ index }}</span>
              <XMarkIcon class="size-6 text-dark cursor-pointer hover:brightness-50" />
            </div>
          </div>
          <div class="pt-4 w-full flex justify-center">
            <Button :callback="() => { console.log('Valider') }">Valider</Button>
          </div>
        </div>

      </div>
    </section>
    <section class="order-1 lg:order-2 p-5 bg-light rounded-[7px]">
      <div class="w-full">
        <h4 class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4">
          Mindmap Name
        </h4>
      </div>
      <Mindmap />
    </section>
  </div>
</template>

<script setup>
import Mindmap from '@/components/MindmapComponent.vue'
import Dropdown from '@/components/DropdownComponent.vue'
import Button from '@/components/ButtonComponent.vue'
import { XMarkIcon } from '@heroicons/vue/24/solid'

</script>
