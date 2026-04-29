<template>
  <div class="w-full max-w-5xl mx-auto p-6">

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

      <div
        v-for="session in sessions"
        :key="session.id"
        class="bg-primary bg-opacity-15 rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
        @click="goToFlashcards"
      >
        <div>
          <h3 class="text-xl font-semibold text-primary mb-2">
            {{ session.name }}
          </h3>

          <p class="text-sm text-gray-light">
            {{ session.cards }} cartes
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const sessions = ref([
  { id: 1, name: "Physique Quantique", cards: 5 },
  { id: 2, name: "Maths Intégrales", cards: 12 },
  { id: 3, name: "Histoire Révolution", cards: 8 }
])

const goToFlashcards = () => {
  router.push('/flashcardssession')
}
</script>