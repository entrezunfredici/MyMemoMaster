<template>
  <div>
    Salut salut

    <Dropdown name="Trier" side="right">
      Salut salut
    </Dropdown>

    <Button>Tesst</Button>
  </div>
</template>

<script setup>
import Button from '@/components/ButtonComponent.vue'
import Dropdown from '@/components/DropdownComponent.vue'

import { notif } from '@/helpers/notif.js'

notif.notify("salut", 'error')

</script>
