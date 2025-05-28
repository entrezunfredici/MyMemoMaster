<template>
  <div class="grid grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1 gap-1.5 bg-primary rounded-[10px] p-1.5">
    <section class="order-2 lg:order-1 p-5 bg-light rounded-[7px]">
      <div class="w-full">
        <h4 class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4">
          Quizz Name
        </h4>

        <Dropdown title="Sort">
          <div v-for="item in ['One', 'Two', 'Three']" :key="item">
            <button class="w-full p-2 rounded-lg text-left text-dark hover:bg-primary hover:text-light">
              {{ item }}
            </button>
          </div>
        </Dropdown>

        <div class="py-4">
          <span class="text-lg font-medium text-gray-light">Question</span>
          <input v-model="question.statement" type="text" placeholder="Quelle est la loi de bernouilli ?" class="w-full p-2 rounded-lg text-dark" />
        </div>

        <div class="py-4">
          <span class="text-lg font-medium text-gray-light">Réponse</span>
          <textarea v-model="response.content" placeholder="Quelle est la réponse ?" class="w-full p-2 rounded-lg text-dark" />
        </div>

        <div class="py-4 flex justify-end">
          <button class="flex items-center py-3 gap-2 bg-primary rounded-lg px-5 text-greyCustom">
            Insert image
          </button>
        </div>

        <div class="pt-4 w-full flex justify-center">
          <Button :callback="handleAddQuestion">Ajouter Question</Button>
        </div>

        <div class="border-4 border-primary rounded-lg px-8 py-4 mt-6">
          <h4 class="text-primary text-xl neue-haas-grotesk-r font-semibold pb-4">
            Questions récap
          </h4>
          <div class="flex flex-col gap-4">
            <div v-for="(q, index) in questions" :key="q.idQuestion"
              class="flex justify-between border-2 bg-[#FFF] border-gray rounded-lg px-4 py-2">
              <span class="text-lg text-dark">{{ q.statement }}</span>
              <XMarkIcon class="size-6 text-dark cursor-pointer hover:brightness-50" @click="deleteQuestion(q.idQuestion)" />
            </div>
          </div>
        </div>

      </div>
    </section>
    <section class="order-1 lg:order-2 p-5 bg-light rounded-[7px]">
      <div class="w-full">
        <h4 class="text-primary text-2xl neue-haas-grotesk-r font-semibold pb-4">
          Preview
        </h4>
      </div>
      <Mindmap />
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/solid'
import Mindmap from '@/components/MindmapComponent.vue'
import Dropdown from '@/components/DropdownComponent.vue'
import Button from '@/components/ButtonComponent.vue'
import { useQuestionStore } from '@/stores/questions'
import { useResponseStore } from '@/stores/responses'
import { useTestStore } from '@/stores/tests'

const testStore = useTestStore()
const questionStore = useQuestionStore()
const responseStore = useResponseStore()

const questions = ref([])
const testCreated = ref(false)

const test = ref({
  name: 'Mon nouveau test', // <- tu peux remplacer par un input si tu veux
  subjectId: 1
})

const question = ref({ statement: '', questionPosition: 0, type: 'text', idTest: null })
const response = ref({ content: '', correction: true, questionId: null })

const handleAddQuestion = async () => {
  // Étape 1 - Créer le test une seule fois
  if (!testCreated.value) {
    testStore.test = test.value
    const created = await testStore.createTest()
    if (!created) return
    testCreated.value = true
    question.value.idTest = testStore.test.id // Utilise l’ID renvoyé par l’API
  }

  // Étape 2 - Ajouter la question
  question.value.questionPosition = questions.value.length + 1
  questionStore.question = question.value
  const questionCreated = await questionStore.createQuestion()

  if (questionCreated && questionStore.question.idQuestion) {
    response.value.questionId = questionStore.question.idQuestion
    responseStore.response = response.value
    const responseCreated = await responseStore.createResponse()

    if (responseCreated) {
      questions.value.push({ ...questionStore.question })

      // Réinitialise les champs
      question.value = { statement: '', questionPosition: 0, type: 'text', idTest: testStore.test.id }
      response.value = { content: '', correction: true, questionId: null }
    }
  }
}

const deleteQuestion = async (id) => {
  await questionStore.deleteQuestion(id)
  questions.value = questions.value.filter(q => q.idQuestion !== id)
}
</script>

