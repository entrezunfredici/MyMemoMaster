<template>
  <p v-if="roleStore.role.name">Rôle : {{ roleStore.role.name }}</p>
  <p v-else>Chargement du rôle...</p>
  <div class="grid grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1 gap-1.5 bg-primary rounded-[10px] p-1.5">
    <section class="order-2 lg:order-1 p-5 bg-light rounded-[7px]">
      <div class="w-full">
        <h4 v-if="roleStore.role.name == 'Admin'" class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4"> Catégorie Administrateur</h4>
        <h4 v-else class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4"> Catégorie utilisateur</h4>
      </div>
      <div class="flex flex-col">
          <h4 class="text-primary text-xl neue-haas-grotesk-r font-semibold pb-4">
            Paramètres utilisateur
          </h4>
          <div class="flex flex-col">
            <Button class="align-left-button w-full">Mon compte</Button><br>
            <Button class="align-left-button w-full">Profil</Button><br>
            <Button class="align-left-button w-full">Données et confidentialité</Button><br>
          </div>
      </div>
      <div class="flex flex-col">
          <h4 class="text-primary text-xl neue-haas-grotesk-r font-semibold pb-4">
            Paramètres de l'application
          </h4>
          <div class="flex flex-col">
            <Button class="align-left-button w-full">Apparence</Button>
            <Button class="align-left-button w-full">Accessibilité</Button>
            <Button class="align-left-button w-full">Notifications</Button>
            <Button class="align-left-button w-full">Raccourcis clavier</Button>
          </div>
      </div>
    </section>
    <section class="order-1 lg:order-2 p-5 bg-light rounded-[7px]">
      <div class="w-full">
        <h4 class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4">
          Apparence
        </h4>
        <p>Densité de l'interface : Par défaut</p>
        <p>Taille de la police : 12 (Par défaut)</p>
          <div class="flex justify-between">
            <p>Dark mode</p> <br>
            <div>
            <ToggleButton v-model="isToggled" />
            <p>({{ isToggled ? 'Activé' : 'Désactivé' }})</p>
            </div>
          </div>
          <p>Lorem ipsum</p>
          <p>Lorem ipsum</p>
          <p>Lorem ipsum</p>
          <p>Lorem ipsum</p><br>
          <p>Lorem ipsum</p>
          <p>Lorem ipsum</p>
          <div class="flex justify-between">
            <p>Lorem ipsum</p>
            <ToggleButton/>
          </div>
          <p>Lorem ipsum</p>
          <p>Lorem ipsum</p><br>
          <p>Lorem ipsum</p>
          <div class="flex justify-between">
            <p>Lorem ipsum</p>
            <ToggleButton/>
          </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoleStore } from '@/stores/role'
import Button from '@/components/ButtonComponent.vue'
import { ref } from 'vue'
import ToggleButton from '@/components/ToggleButton.vue'

const isToggled = ref(false)

const roleStore = useRoleStore()

onMounted(async () => {
  const userRoleId = 1 //recuperer l'id dans user
  await roleStore.fetchRoleById(userRoleId)
})

</script>

<style scoped>
.align-left-button {
  justify-content: flex-start !important;
  text-align: left !important;
}
</style>