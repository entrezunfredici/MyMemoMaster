<template>
  <div class="bg-gray-50 border border-gray-200 p-4 rounded-lg">
    <div class="flex justify-between items-center mb-3">
      <span :id="`exercise-question-${index}`" class="font-semibold text-sm text-heading">Question {{ index + 1 }}</span>
      <button v-if="removable" type="button" @click="emit('remove')" class="text-red-600 hover:text-red-700 text-sm font-medium">
        Supprimer
      </button>
    </div>

    <!-- Type -->
    <div class="mb-3">
      <label class="form-label--xs">Type</label>
      <select aria-label="Type de question" v-model="q.type" class="form-input form-input--sm" @change="resetQuestionFields(q)">
        <option value="open">Question ouverte</option>
        <option value="mcq">QCM (choix multiple)</option>
        <option value="fill_blank">Texte à trou</option>
        <option value="reorder">Phrase à constituer</option>
      </select>
    </div>

    <!-- Énoncé -->
    <div class="mb-3">
      <label class="form-label--xs">Énoncé</label>
      <FormulaHelper v-model="q.statement">
        <textarea aria-label="Entrez l'énoncé de la question" v-model="q.statement" placeholder="Entrez l'énoncé de la question (formules entre $…$)" class="form-input form-input--sm" rows="2" required />
      </FormulaHelper>
    </div>

    <!-- open -->
    <template v-if="q.type === 'open'">
      <div>
        <label class="form-label--xs">Réponse attendue</label>
        <FormulaHelper v-model="q.openAnswer">
          <textarea aria-label="Réponse correcte (utilisée pour la correction)" v-model="q.openAnswer" placeholder="Réponse correcte (utilisée pour la correction)" class="form-input form-input--sm" rows="2" required />
        </FormulaHelper>
      </div>
      <div>
        <label class="form-label--xs">Autres formulations acceptées <span class="text-gray-500 font-normal">(optionnel)</span></label>
        <div v-for="(alt, ai) in q.openAltAnswers" :key="ai" class="flex items-center gap-2 mb-2">
          <input
            :aria-label="`Formulation acceptée ${ai + 1}`"
            v-model="q.openAltAnswers[ai]"
            type="text"
            placeholder="Ex : la formule si la réponse principale est en toutes lettres"
            class="form-input form-input--sm flex-1"
          />
          <button
            type="button"
            :aria-label="`Supprimer la formulation acceptée ${ai + 1}`"
            @click="q.openAltAnswers.splice(ai, 1)"
            class="text-gray-500 hover:text-red-600 text-lg leading-none"
          >✕</button>
        </div>
        <button
          type="button"
          @click="q.openAltAnswers.push('')"
          class="text-sm text-primary hover:underline font-medium"
        >
          + Ajouter une formulation acceptée
        </button>
      </div>
    </template>

    <!-- mcq -->
    <template v-else-if="q.type === 'mcq'">
      <label :id="`exercise-mcq-legend-${index}`" class="block text-xs font-semibold text-gray-500 mb-2">Options (cocher la bonne réponse)</label>
      <!-- CHOIX: role="radiogroup" + aria-labelledby (2 ids : question + légende) plutôt que <fieldset>/<legend>
           RAISON: équivalent ARIA valide au RGAA 11.6/11.7, sans le style par défaut du navigateur pour <fieldset> -->
      <div class="space-y-2" role="radiogroup" :aria-labelledby="`exercise-question-${index} exercise-mcq-legend-${index}`">
        <div v-for="(opt, oi) in q.mcqOptions" :key="oi" class="flex items-center gap-2">
          <input :aria-label="`Marquer l'option ${oi + 1} comme correcte`" type="radio" :name="`mcq-correct-${index}`" :value="oi" v-model="q.mcqCorrectIdx" class="accent-primary" />
          <input :aria-label="`Texte de l'option ${oi + 1}`" :value="opt.text" @input="setOptionText(q, oi, $event.target.value)" type="text" placeholder="Option..." class="flex-1 px-3 py-1.5 border border-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
          <button v-if="q.mcqOptions.length > 2" type="button" @click="removeOption(q, oi)" class="text-red-600 hover:text-red-600 text-lg leading-none">✕</button>
        </div>
      </div>
      <button type="button" @click="addOption(q)" class="mt-2 text-sm text-primary hover:underline font-medium">+ Ajouter une option</button>
    </template>

    <!-- fill_blank -->
    <template v-else-if="q.type === 'fill_blank'">
      <div class="mb-3">
        <label class="form-label--xs">Texte avec trous — utilise <code v-pre class="bg-gray-200 px-1 rounded">{{0}}</code>, <code v-pre class="bg-gray-200 px-1 rounded">{{1}}</code>…</label>
        <textarea aria-label="Texte à trous avec emplacements" v-model="q.fillTemplate" placeholder="La photosynthèse produit du {{0}} grâce à la lumière {{1}}." class="form-input form-input--sm" rows="2" required @input="syncFillBlanks(q)" />
      </div>
      <div v-if="q.fillBlanks.length" class="space-y-2">
        <label class="form-label--xs">Réponses attendues</label>
        <div v-for="(blank, bi) in q.fillBlanks" :key="bi" class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-14 shrink-0">Trou {{ bi }}</span>
          <input :aria-label="`Réponse du trou ${bi}`" v-model="q.fillBlanks[bi]" type="text" :placeholder="`Réponse du trou ${bi}`" class="flex-1 px-3 py-1.5 border border-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
        </div>
      </div>
      <p v-else class="text-xs text-gray-500 italic">Utilisez <code v-pre class="bg-gray-200 px-1 rounded">{{0}}</code>, <code v-pre class="bg-gray-200 px-1 rounded">{{1}}</code>… dans le texte pour créer des trous.</p>
    </template>

    <!-- reorder -->
    <template v-else-if="q.type === 'reorder'">
      <label class="block text-xs font-semibold text-gray-500 mb-2">Fragments dans le bon ordre (l'étudiant devra les reconstituer)</label>
      <div class="space-y-2">
        <div v-for="(frag, fi) in q.reorderFragments" :key="fi" class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-5 shrink-0">{{ fi + 1 }}.</span>
          <input :aria-label="`Fragment ${fi + 1}`" v-model="q.reorderFragments[fi]" type="text" placeholder="Fragment..." class="flex-1 px-3 py-1.5 border border-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
          <button v-if="q.reorderFragments.length > 2" type="button" @click="q.reorderFragments.splice(fi, 1)" class="text-red-600 hover:text-red-600 text-lg leading-none">✕</button>
        </div>
      </div>
      <button type="button" @click="q.reorderFragments.push('')" class="mt-2 text-sm text-primary hover:underline font-medium">+ Ajouter un fragment</button>
    </template>
  </div>
</template>

<script setup>
// Une question du formulaire d'exercice : type, énoncé, puis les champs propres au type (ouverte, QCM,
// texte à trous, phrase à reconstituer). Extrait de pages/ExercisesPage.vue sans changement de rendu.
//
// CHOIX: l'objet `question` appartient au formulaire parent (useExerciseForm) et est édité EN PLACE,
// comme dans la page d'origine (v-model direct sur ses champs) ; `q` n'en est qu'un alias réactif.
// RAISON: une copie locale renvoyée par événement obligerait à synchroniser tableaux imbriqués (options,
// formulations, fragments) à chaque frappe ; `computed` plutôt que la prop nue car la règle
// vue/no-mutating-props ne peut pas distinguer cette édition voulue d'une mutation accidentelle.
import { computed } from 'vue'
import FormulaHelper from '@/components/FormulaHelperComponent.vue'
import {
  resetQuestionFields,
  setOptionText,
  addOption,
  removeOption,
  syncFillBlanks,
} from '@/helpers/exerciseQuestionEdit'

const props = defineProps({
  question: { type: Object, required: true },
  // Position (0-based) dans le formulaire : sert au libellé « Question N » et aux ids d'accessibilité
  index: { type: Number, required: true },
  // Faux quand c'est la seule question (on ne peut pas vider un exercice)
  removable: { type: Boolean, default: true },
})

const emit = defineEmits(['remove'])

const q = computed(() => props.question)
</script>
