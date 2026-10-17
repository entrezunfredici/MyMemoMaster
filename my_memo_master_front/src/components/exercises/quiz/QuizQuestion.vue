<template>
  <div
    class="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200"
  >
    <h3 class="text-lg font-semibold text-heading mb-4">Question {{ index + 1 }}</h3>
    <p :id="`question-statement-${index}`" class="text-base text-body mb-5"><FormulaText :text="question.statement || ''" /></p>
    <img
      v-if="question.imageUrl"
      :src="question.imageUrl"
      :alt="question.imageOriginalName || `Illustration de la question ${index + 1}`"
      class="max-w-full rounded-lg border border-gray-200 mb-5"
    />

    <!-- open -->
    <template v-if="question.type === 'open'">
      <FormulaHelper v-model="s.answer">
        <textarea aria-label="Entrez votre réponse ici"
          v-model="s.answer"
          placeholder="Entrez votre réponse ici... (formules entre $…$)"
          class="w-full px-4 py-2 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          rows="3"
        />
      </FormulaHelper>
    </template>

    <!-- mcq -->
    <template v-else-if="question.type === 'mcq'">
      <!-- CHOIX: role="radiogroup" + aria-labelledby plutôt que <fieldset>/<legend>
           RAISON: équivalent ARIA valide au RGAA 11.6/11.7, sans reprendre le style
           par défaut du navigateur pour <fieldset> (bordure/marge) — l'énoncé de la
           question (id="question-statement-N" ci-dessus) sert de légende programmatique. -->
      <div class="space-y-2" role="radiogroup" :aria-labelledby="`question-statement-${index}`">
        <label
          v-for="oi in s.order"
          :key="oi"
          class="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition"
          :class="s.answer === oi ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'"
        >
          <input
            type="radio"
            :name="`q-${index}`"
            :checked="s.answer === oi"
            @change="s.answer = oi"
            class="accent-blue-600"
          />
          <span><FormulaText :text="question.content.options[oi]?.text || ''" /></span>
        </label>
      </div>
    </template>

    <!-- fill_blank -->
    <template v-else-if="question.type === 'fill_blank'">
      <div class="prose text-base mb-4 leading-relaxed">
        <span
          v-for="(part, pi) in parseFillTemplate(question)"
          :key="pi"
        >
          <FormulaText v-if="part.type === 'text'" :text="part.value" />
          <input :aria-label="`Réponse du trou ${part.index}`"
            v-else
            v-model="s.answer[part.index]"
            type="text"
            :placeholder="`trou ${part.index}`"
            class="inline-block border-b-2 border-blue-400 bg-transparent text-center w-28 mx-1 focus:outline-none focus:border-blue-600"
          />
        </span>
      </div>
    </template>

    <!-- reorder -->
    <template v-else-if="question.type === 'reorder'">
      <p class="text-sm text-gray-500 mb-3">Clique sur les fragments dans le bon ordre :</p>
      <div class="flex flex-wrap gap-2 mb-4">
        <button
          v-for="(frag, fi) in s.shuffled"
          :key="fi"
          type="button"
          :disabled="s.selected.includes(fi)"
          @click="pick(fi)"
          class="px-3 py-1.5 border-2 rounded-lg text-sm font-medium transition"
          :class="s.selected.includes(fi) ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed' : 'border-blue-400 text-blue-700 hover:bg-blue-50'"
        >
          <FormulaText :text="frag" />
        </button>
      </div>
      <div class="min-h-10 flex flex-wrap gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg">
        <span class="text-gray-500 text-sm italic" v-if="!s.selected.length">Sélectionne les fragments ci-dessus...</span>
        <button
          v-for="(fi, pos) in s.selected"
          :key="pos"
          type="button"
          @click="unpick(pos)"
          class="px-3 py-1.5 border-2 border-green-400 text-green-700 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-400 hover:text-red-700 transition"
          title="Cliquer pour retirer"
        >
          <FormulaText :text="s.shuffled[fi]" />
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
// Une question en mode quiz : énoncé, image éventuelle, puis la saisie propre au type (réponse ouverte, QCM,
// texte à trous, phrase à constituer). Extrait de pages/ExerciseDetailPage.vue.
import { computed } from 'vue'
import FormulaText from '@/components/FormulaTextComponent.vue'
import FormulaHelper from '@/components/FormulaHelperComponent.vue'
import { parseFillTemplate, selectFragment, unselectFragment } from '@/helpers/exerciseQuiz'

const props = defineProps({
  question: { type: Object, required: true },
  // Position (0-based) : libellé « Question N » et identifiants d'accessibilité
  index: { type: Number, required: true },
  // État de réponse de cette question (voir createQuestionState dans helpers/exerciseQuiz.js)
  state: { type: Object, required: true },
})

// CHOIX: l'objet d'état appartient au quiz parent (useExerciseQuiz) et est édité EN PLACE (v-model direct sur
// `answer`), comme dans la page d'origine ; `s` n'en est qu'un alias réactif (la règle vue/no-mutating-props ne
// distingue pas cette édition voulue d'une mutation accidentelle).
const s = computed(() => props.state)

const pick = (fragIdx) => selectFragment(props.state, fragIdx)
const unpick = (pos) => unselectFragment(props.state, pos)
</script>
