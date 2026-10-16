<template>
  <ModalComponent :visible="visible" title="Relecture des questions générées" size="lg" @close="emit('close')">
    <div v-if="warnings.length" class="mb-3">
      <p v-for="(w, wi) in warnings" :key="wi" class="text-xs text-amber-700">⚠️ {{ w }}</p>
    </div>

    <p class="text-sm text-gray-500 mb-4">
      ✅ {{ counts.included }} incluse{{ counts.included > 1 ? 's' : '' }} ·
      ✎ {{ counts.edited }} modifiée{{ counts.edited > 1 ? 's' : '' }} ·
      🗑 {{ counts.rejected }} rejetée{{ counts.rejected > 1 ? 's' : '' }}
      <button
        v-if="counts.rejected"
        type="button"
        class="ml-2 text-primary hover:underline font-medium"
        @click="acceptAll"
      >Tout accepter</button>
    </p>

    <div class="flex flex-col gap-3 mb-2 max-h-[55vh] overflow-y-auto pr-1">
      <div
        v-for="(item, idx) in items"
        :key="item._key"
        class="bg-gray-50 border border-gray-200 rounded-lg p-4"
        :class="{ 'opacity-50': !item.included }"
      >
        <div class="flex items-start gap-3">
          <input
            :aria-label="`Inclure la question ${idx + 1} à l'exercice`"
            type="checkbox"
            class="accent-primary mt-1 shrink-0"
            :checked="item.included"
            @change="toggleInclude(item)"
          />
          <div class="flex-1 min-w-0">
            <!-- Édition inline — mêmes blocs de formulaire par type que la liste "Questions"
                 d'ExercisesPage.vue (helpers/exerciseQuestionForm.js), voir CHOIX en tête de script. -->
            <div v-if="item.editing" class="space-y-3">
              <div>
                <label class="form-label--xs">Type</label>
                <select
                  :aria-label="`Type de la question générée ${idx + 1}`"
                  v-model="item.type"
                  class="form-input form-input--sm"
                  @change="onTypeChange(item)"
                >
                  <option value="open">Question ouverte</option>
                  <option value="mcq">QCM (choix multiple)</option>
                  <option value="fill_blank">Texte à trou</option>
                  <option value="reorder">Phrase à constituer</option>
                </select>
              </div>

              <div>
                <label class="form-label--xs">Énoncé</label>
                <textarea
                  :aria-label="`Énoncé de la question générée ${idx + 1}`"
                  v-model="item.statement"
                  class="form-input form-input--sm"
                  rows="2"
                />
              </div>

              <template v-if="item.type === 'open'">
                <div>
                  <label class="form-label--xs">Réponse attendue</label>
                  <textarea
                    :aria-label="`Réponse correcte de la question générée ${idx + 1}`"
                    v-model="item.openAnswer"
                    class="form-input form-input--sm"
                    rows="2"
                  />
                </div>
                <div>
                  <label class="form-label--xs">Autres formulations acceptées <span class="text-gray-400 font-normal">(optionnel)</span></label>
                  <div v-for="(alt, ai) in item.openAltAnswers" :key="ai" class="flex items-center gap-2 mb-2">
                    <input
                      :aria-label="`Formulation acceptée ${ai + 1}`"
                      v-model="item.openAltAnswers[ai]"
                      type="text"
                      class="form-input form-input--sm flex-1"
                    />
                    <button
                      type="button"
                      :aria-label="`Supprimer la formulation acceptée ${ai + 1}`"
                      @click="item.openAltAnswers.splice(ai, 1)"
                      class="text-gray-400 hover:text-red-500 text-lg leading-none"
                    >✕</button>
                  </div>
                  <button type="button" @click="item.openAltAnswers.push('')" class="text-sm text-primary hover:underline font-medium">
                    + Ajouter une formulation acceptée
                  </button>
                </div>
              </template>

              <template v-else-if="item.type === 'mcq'">
                <label :id="`ai-review-mcq-legend-${item._key}`" class="block text-xs font-semibold text-gray-500 mb-2">
                  Options (cocher la bonne réponse)
                </label>
                <div class="space-y-2" role="radiogroup" :aria-labelledby="`ai-review-mcq-legend-${item._key}`">
                  <div v-for="(opt, oi) in item.mcqOptions" :key="oi" class="flex items-center gap-2">
                    <input
                      :aria-label="`Marquer l'option ${oi + 1} comme correcte`"
                      type="radio"
                      :name="`ai-review-mcq-correct-${item._key}`"
                      :value="oi"
                      v-model="item.mcqCorrectIdx"
                      class="accent-primary"
                    />
                    <input
                      :aria-label="`Texte de l'option ${oi + 1}`"
                      :value="opt.text"
                      @input="setOptionText(item, oi, $event.target.value)"
                      type="text"
                      class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button v-if="item.mcqOptions.length > 2" type="button" @click="removeOption(item, oi)" class="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                  </div>
                </div>
                <button type="button" @click="addOption(item)" class="mt-2 text-sm text-primary hover:underline font-medium">+ Ajouter une option</button>
              </template>

              <template v-else-if="item.type === 'fill_blank'">
                <div class="mb-3">
                  <label class="form-label--xs">Texte avec trous — utilise <code v-pre class="bg-gray-200 px-1 rounded">{{0}}</code>, <code v-pre class="bg-gray-200 px-1 rounded">{{1}}</code>…</label>
                  <textarea
                    :aria-label="`Texte à trous de la question générée ${idx + 1}`"
                    v-model="item.fillTemplate"
                    class="form-input form-input--sm"
                    rows="2"
                    @input="syncFillBlanks(item)"
                  />
                </div>
                <div v-if="item.fillBlanks.length" class="space-y-2">
                  <label class="form-label--xs">Réponses attendues</label>
                  <div v-for="(blank, bi) in item.fillBlanks" :key="bi" class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 w-14 shrink-0">Trou {{ bi }}</span>
                    <input
                      :aria-label="`Réponse du trou ${bi}`"
                      v-model="item.fillBlanks[bi]"
                      type="text"
                      class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </template>

              <template v-else-if="item.type === 'reorder'">
                <label class="block text-xs font-semibold text-gray-500 mb-2">Fragments dans le bon ordre</label>
                <div class="space-y-2">
                  <div v-for="(frag, fi) in item.reorderFragments" :key="fi" class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 w-5 shrink-0">{{ fi + 1 }}.</span>
                    <input
                      :aria-label="`Fragment ${fi + 1}`"
                      v-model="item.reorderFragments[fi]"
                      type="text"
                      class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button v-if="item.reorderFragments.length > 2" type="button" @click="item.reorderFragments.splice(fi, 1)" class="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                  </div>
                </div>
                <button type="button" @click="item.reorderFragments.push('')" class="mt-2 text-sm text-primary hover:underline font-medium">+ Ajouter un fragment</button>
              </template>

              <button type="button" class="text-sm text-primary hover:underline font-medium" @click="finishEdit(item)">
                ✓ Terminer l'édition
              </button>
            </div>

            <!-- Aperçu (mode par défaut) -->
            <template v-else>
              <p class="font-semibold text-heading text-sm">
                {{ item.statement || '(énoncé vide)' }}
                <span v-if="item.edited" class="ml-2 text-xs font-normal text-primary">✎ modifiée</span>
              </p>
              <p class="text-sm text-gray-500 mt-1">
                {{ typeLabel(item.type) }}
                <template v-if="item.type === 'open'"> · {{ item.openAnswer || '—' }}</template>
                <template v-else-if="item.type === 'mcq'"> · {{ item.mcqOptions.length }} options · bonne réponse : {{ item.mcqOptions[item.mcqCorrectIdx]?.text || '—' }}</template>
                <template v-else-if="item.type === 'fill_blank'"> · {{ item.fillBlanks.length }} trou{{ item.fillBlanks.length > 1 ? 's' : '' }}</template>
                <template v-else-if="item.type === 'reorder'"> · {{ item.reorderFragments.length }} fragments</template>
              </p>

              <button type="button" class="text-xs text-gray-400 hover:text-gray-600 mt-2" @click="item.sourceOpen = !item.sourceOpen">
                {{ item.sourceOpen ? '▾' : '▸' }} Source
              </button>
              <p v-if="item.sourceOpen" class="text-xs text-gray-500 mt-1 italic border-l-2 border-gray-200 pl-2">
                « {{ item.sourceExcerpt || '—' }} »
              </p>
            </template>

            <!-- Revue de l'image proposée par l'IA (Ticket C) — visible en aperçu comme en édition,
                 indépendante du type de question. -->
            <div v-if="item.imageUrl" class="mt-3 flex items-center gap-3">
              <img
                :src="item.imageUrl"
                :alt="item.imageOriginalName || 'Schéma proposé par l\'IA'"
                class="h-14 w-14 object-cover rounded-lg border border-gray-200 shrink-0"
              />
              <span
                v-if="item.imageSource === 'ai'"
                class="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full shrink-0"
              >🖼️ Image IA</span>
              <button
                type="button"
                :aria-label="`Retirer l'image de la question générée ${idx + 1}`"
                class="text-xs text-gray-400 hover:text-red-500 underline"
                @click="removeImage(item)"
              >Retirer l'image</button>
            </div>
          </div>

          <div v-if="!item.editing" class="flex gap-2 flex-shrink-0">
            <button
              type="button"
              :aria-label="`Modifier la question générée ${idx + 1}`"
              @click="startEdit(item)"
              class="hover:bg-gray-100 text-gray-600 py-1 px-2 rounded border border-gray-300 transition"
              title="Modifier"
            >✎</button>
            <button
              type="button"
              :aria-label="`Rejeter la question générée ${idx + 1}`"
              @click="rejectItem(item)"
              class="hover:bg-red-50 text-gray-600 py-1 px-2 rounded border border-gray-300 transition"
              title="Rejeter"
            >🗑</button>
          </div>
        </div>
      </div>

      <p v-if="items.length === 0" class="text-center text-gray-light py-10">
        Aucune question n'a été générée.
      </p>
    </div>

    <template #footer>
      <button type="button" class="btn-modal-cancel" @click="emit('close')">Annuler</button>
      <button type="button" class="btn-modal-submit" :disabled="checkedCount === 0" @click="confirm">
        Ajouter {{ checkedCount }} question{{ checkedCount > 1 ? 's' : '' }} à l'exercice
      </button>
    </template>
  </ModalComponent>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { defaultQuestionFormFields, contentToFormState, defaultQuestionImageFields, questionImageFieldsFrom } from '@/helpers/exerciseQuestionForm'

// Écran de révision des questions générées par IA (C-02.07), feature "Génération d'exercices par IA"
// (C-02) — accept/edit/reject par question avant ajout à `form.questions` d'ExercisesPage.vue.
// Remplace la confirmation groupée minimale livrée en C-02.06 (liste en lecture seule + un seul bouton
// [Ajouter à l'exercice]), documentée à l'époque comme un palliatif explicite (voir CHANGELOG_AGENT.md/
// DECISIONS.md, entrées C-02.06) — ceci est la vraie Interface de révision pour cet élément du
// feature list.
//
// CHOIX : modale empilée au-dessus de la modale "Nouvel exercice" (comme les Vues 1/2 de C-02.06)
// plutôt qu'un écran plein remplaçant la page, à la différence de AiValidationScreenComponent.vue
// (C-01.09, cartes Leitner).
// RAISON : generation_ia_exercices_ui.md §4/§8 fixe déjà ce choix pour toute la chaîne C-02 — rien
// n'est persisté avant submitCreate()/submitEdit() côté ExercisesPage.vue (pas de table
// `AiGenerationBatch` équivalente pour les exercices), donc aucune navigation de page n'est nécessaire
// ni cohérente avec le reste du flux (Vue 1/Vue 2 déjà des modales empilées).
//
// CHOIX : édition inline (mêmes blocs de formulaire par type que la liste "Questions" d'ExercisesPage.vue,
// extraits dans helpers/exerciseQuestionForm.js) plutôt qu'une modale d'édition séparée
// (AiCardEditModalComponent.vue, C-01.09).
// RAISON : piste explicitement notée en generation_ia_exercices_ui.md §8 — la modale "Nouvel exercice"
// rend déjà un sous-formulaire éditable inline par type de question, contrairement à
// FlashcardsCardsPage.vue (C-01) qui n'affiche qu'une liste récapitulative en lecture seule. Voir
// DECISIONS.md pour la décision complète.
//
// CHOIX : aucune persistance/appel réseau ici (contrairement à aiCardGenerationStore#updateCard/
// promoteCard, C-01.09) — les questions générées ne sont jamais écrites en base à ce stade, cohérent
// avec l'architecture sans brouillon serveur actée pour C-02 (generation_ia_exercices_ui.md §8/§10).
// `confirm` renvoie directement au parent la liste des questions incluses, déjà dans la représentation
// `form.questions` (mêmes clés que `defaultQuestion()`/`contentToFormState`), pour un simple `push`.
//
// Ticket C (2026-09-12, « images sur les questions ») : une question générée peut porter un schéma
// rattaché par l'IA (imageUrl/imageKey/.../imageSource:'ai', Ticket B,
// AiExerciseGenerationPipeline.service.js#attachImagesToQuestions) — jusqu'ici jamais lu ni reporté par
// cet écran ni par `confirm()`, alors qu'il s'agit précisément de l'« Interface de révision » censée
// couvrir « revue utilisateur de l'image proposée par l'IA avant validation » (cadrage initial, voir
// CHANGELOG_AGENT.md entrée Ticket A). Ajout : aperçu miniature + badge de provenance + bouton
// [Retirer l'image] (retire uniquement l'image, jamais toute la question — `rejectItem` reste le seul
// moyen d'exclure la question entière), et report de ces champs jusqu'à `confirm()`.

const props = defineProps({
  visible: { type: Boolean, required: true },
  questions: { type: Array, default: () => [] }, // questions[] du contrat generation_ia_exercices_types.md §5
  // Tableau (pas une chaîne unique) depuis l'ajout du pipeline PDF/chunking côté store — un message
  // par passage concerné, voir stores/aiExerciseGeneration.js.
  warnings: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'confirm'])

let _keyCounter = 0
const nextKey = () => ++_keyCounter

const items = ref([])

// Reconstruit l'état local à chaque ouverture de l'écran plutôt qu'au montage : ce composant reste
// monté tout au long du flux IA, comme AiGenerateExercisesModalComponent.vue/
// AiGenerationProgressModalComponent.vue (v-if porté par le parent sur toute la durée du flux,
// ExercisesPage.vue#showAiFlow) — `props.questions` n'est rempli par le store qu'après la Vue 2
// (génération réussie), donc bien après le montage initial de ce composant.
watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) return
    items.value = props.questions.map((q) => ({
      _key: nextKey(),
      included: true,
      edited: false,
      editing: false,
      sourceOpen: false,
      statement: q.statement,
      type: q.type,
      sourceExcerpt: q.sourceExcerpt || '',
      ...contentToFormState(q),
      ...questionImageFieldsFrom(q),
    }))
  },
  { immediate: true },
)

const checkedCount = computed(() => items.value.filter((i) => i.included).length)
const counts = computed(() => ({
  included: checkedCount.value,
  edited: items.value.filter((i) => i.included && i.edited).length,
  rejected: items.value.filter((i) => !i.included).length,
}))

const TYPE_LABELS = { open: 'Question ouverte', mcq: 'QCM', fill_blank: 'Texte à trous', reorder: 'Remise en ordre' }
function typeLabel(type) { return TYPE_LABELS[type] || type }

function toggleInclude(item) { item.included = !item.included }
function rejectItem(item) { item.included = false }
function acceptAll() { for (const item of items.value) item.included = true }

// Retire uniquement l'image rattachée par l'IA (revue utilisateur, Ticket C) — la question elle-même
// reste incluse/éditable, seul `rejectItem` exclut la question entière.
function removeImage(item) { Object.assign(item, defaultQuestionImageFields()) }

function startEdit(item) { item.editing = true }
function finishEdit(item) {
  item.editing = false
  item.edited = true
}

// Repart des champs vierges au changement de type — même comportement que
// ExercisesPage.vue#onTypeChange, pour éviter qu'un `content` reconstruit ne mélange des champs de
// deux types différents (ex. `mcqOptions` non vidées après un passage à "reorder").
function onTypeChange(item) { Object.assign(item, defaultQuestionFormFields()) }

function setOptionText(item, idx, value) {
  item.mcqOptions = item.mcqOptions.map((o, i) => (i === idx ? { ...o, text: value } : o))
}
function addOption(item) { item.mcqOptions = [...item.mcqOptions, { text: '' }] }
function removeOption(item, idx) {
  item.mcqOptions = item.mcqOptions.filter((_, i) => i !== idx)
  if (item.mcqCorrectIdx >= item.mcqOptions.length) item.mcqCorrectIdx = item.mcqOptions.length - 1
  else if (idx < item.mcqCorrectIdx) item.mcqCorrectIdx--
}
function syncFillBlanks(item) {
  const matches = [...item.fillTemplate.matchAll(/\{\{(\d+)\}\}/g)]
  const count = matches.length ? Math.max(...matches.map((m) => parseInt(m[1]))) + 1 : 0
  while (item.fillBlanks.length < count) item.fillBlanks.push('')
  if (item.fillBlanks.length > count) item.fillBlanks.splice(count)
}

function confirm() {
  const accepted = items.value
    .filter((i) => i.included)
    .map(({
      statement, type, openAnswer, openAltAnswers, mcqOptions, mcqCorrectIdx, fillTemplate, fillBlanks, reorderFragments,
      imageUrl, imageKey, imageMimeType, imageOriginalName, imageSize, imageSource,
    }) => ({
      statement, type, openAnswer, openAltAnswers, mcqOptions, mcqCorrectIdx, fillTemplate, fillBlanks, reorderFragments,
      imageUrl, imageKey, imageMimeType, imageOriginalName, imageSize, imageSource,
    }))
  emit('confirm', accepted)
}
</script>
