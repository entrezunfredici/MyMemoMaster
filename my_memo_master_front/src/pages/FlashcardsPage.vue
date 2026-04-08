<template>
  <div class="w-full max-w-5xl mx-auto p-6">

    <h2 class="text-3xl font-bold text-primary mb-8">
      Démo – Sessions du jour
    </h2>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

      <div
        v-for="session in sessions"
        :key="session.id"
        class="bg-light rounded-xl p-6 shadow hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
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
        <button
          class="mt-6 w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary/90 transition"
        >
          Ouvrir la session
        </button>
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
  { id: 2, name: "Maths – Intégrales", cards: 12 },
  { id: 3, name: "Histoire – Révolution", cards: 8 }
])

const goToFlashcards = () => {
  router.push('/flashcardssession')
}
</script>