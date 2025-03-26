<template>
  <div class="grid grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1 gap-1.5 bg-primary rounded-[10px] p-1.5">
    <section class="p-4 bg-light rounded-[7px]">
      <div class="w-full">
        <h4 class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4">
          LS Name
        </h4>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolor tenetur ex nulla cum, nisi dolorem, esse quam
        fuga atque facilis dicta maiores. Corrupti repudiandae ipsam debitis autem tempore quisquam veniam.
        <Dropdown title="Sort">
          test
        </Dropdown>
        <!-- <Select /> -->
      </div>
    </section>
    <section class="p-4 bg-light rounded-[7px]">
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
// import Select from '@/components/SelectComponent.vue'

</script>
