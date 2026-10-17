<template>
  <!-- Modal ajouter / modifier -->
  <div
    v-if="showModal"
    class="modal-overlay"
    @mousedown.self="close"
  >
    <div class="modal-panel">
      <button
        @click="close"
        class="modal-close"
        title="Fermer"
      >&times;</button>
      <h2 class="modal-title">
        {{ editingCard ? 'Modifier la carte' : 'Nouvelle carte' }}
      </h2>

      <form @submit.prevent="submit">
        <!-- Type de question (uniquement en création) -->
        <div v-if="!editingCard" class="form-group">
          <label class="form-label">Type de question</label>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition font-semibold text-sm"
              :class="form.type === 'open' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-400'"
              @click="selectType('open')"
            >
              Ouverte
            </button>
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition font-semibold text-sm"
              :class="form.type === 'mcq' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-400'"
              @click="selectType('mcq')"
            >
              QCM
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Question</label>
          <FormulaHelper v-model="form.statement">
            <textarea aria-label="Énoncé de la carte"
              v-model="form.statement"
              placeholder="Quelle est la loi d'Ohm ? (formules entre $…$)"
              class="form-input"
              rows="3"
              required
            />
          </FormulaHelper>
        </div>

        <!-- Champ réponse : open uniquement -->
        <div v-if="form.type === 'open'" class="form-group--lg">
          <label class="form-label">Réponse correcte</label>
          <FormulaHelper v-model="form.answer">
            <textarea aria-label="Réponse de la carte"
              v-model="form.answer"
              placeholder="U = R × I"
              class="form-input"
              rows="2"
              required
            />
          </FormulaHelper>
        </div>

        <!-- Réponses acceptées supplémentaires : open, création uniquement -->
        <div v-if="form.type === 'open' && !editingCard" class="form-group--lg">
          <label class="form-label">
            Autres formulations acceptées <span class="text-gray-500 font-normal">(optionnel)</span>
          </label>
          <div v-for="(alt, ai) in form.altAnswers" :key="ai" class="flex items-center gap-2 mb-2">
            <input
              :aria-label="`Formulation acceptée ${ai + 1}`"
              v-model="form.altAnswers[ai]"
              type="text"
              placeholder="Ex : la formule si la réponse principale est en toutes lettres"
              class="form-input flex-1"
            />
            <button
              type="button"
              :aria-label="`Supprimer la formulation acceptée ${ai + 1}`"
              @click="form.altAnswers.splice(ai, 1)"
              class="text-gray-500 hover:text-red-600 text-lg leading-none"
            >✕</button>
          </div>
          <button
            type="button"
            @click="form.altAnswers.push('')"
            class="text-sm text-primary hover:underline font-medium"
          >
            + Ajouter une formulation acceptée
          </button>
        </div>

        <!-- Qualité de la réponse de référence (AnswerQuality.service.js) — aperçu EN DIRECT
             pendant la saisie (rien n'est encore enregistré), remplacé par le résultat réel une
             fois la sauvegarde effectuée ; la fenêtre reste alors ouverte tant qu'il y a un point
             à vérifier plutôt que de se refermer immédiatement (DECISIONS.md 2026-09-12). -->
        <!-- Zone à hauteur réservée (cartes ouvertes) : l'aperçu apparaît après un délai de saisie ;
             sans place réservée, il décalait le reste de la fenêtre et un clic pouvait tomber
             sur un autre élément (nœud de la mini-carte, bouton « Ajouter »). -->
        <div v-if="form.type === 'open'" class="form-group--lg min-h-[7rem]">
          <template v-if="lastQuality.level">
            <p class="text-sm mb-1" :class="qualitySaved ? 'text-green-700' : 'text-gray-500'">
              {{ qualitySaved ? `✓ Carte enregistrée — ${editingCard ? 'réponse mise à jour' : 'réponse créée'}.` : 'Aperçu (non enregistré) :' }}
            </p>
            <AnswerQualityBadge :level="lastQuality.level" :warnings="lastQuality.warnings" />
          </template>
        </div>
        <div v-else-if="lastQuality.level" class="form-group--lg">
          <AnswerQualityBadge :level="lastQuality.level" :warnings="lastQuality.warnings" />
        </div>
        <p v-if="justCreated && form.type !== 'open'" class="text-sm text-green-700 mb-4">✓ Carte enregistrée.</p>

        <!-- Nœud de la carte mentale liée (création et modification) -->
        <div v-if="mindMapJson" class="form-group--lg">
          <label class="form-label">
            Nœud de la carte mentale <span class="text-gray-500 font-normal">(optionnel)</span>
          </label>
          <MindMapNodePicker
            v-model="form.mindMapNodeId"
            :mind-map-json="mindMapJson"
            @node-selected="onNodeSelected"
          />
        </div>

        <!-- Options MCQ -->
        <div v-if="form.type !== 'open'" class="form-group--lg">
          <label id="mcq-card-legend" class="form-label">Options (sélectionne la bonne réponse)</label>
          <!-- CHOIX: role="radiogroup" + aria-labelledby plutôt que <fieldset>/<legend>
               RAISON: équivalent ARIA valide au RGAA 11.6/11.7, sans le style par défaut du navigateur pour <fieldset> -->
          <div class="space-y-2" role="radiogroup" aria-labelledby="mcq-card-legend">
            <div v-for="(opt, oi) in form.mcqOptions" :key="oi" class="flex items-center gap-2">
              <input :aria-label="`Marquer l'option ${oi + 1} comme correcte`"
                type="radio"
                :name="`mcq-correct-card`"
                :checked="opt.correct"
                @change="setMcqCorrect(oi)"
                class="accent-primary shrink-0"
              />
              <input :aria-label="`Texte de l'option ${oi + 1}`"
                :value="opt.text"
                @input="setOptionText(oi, $event.target.value)"
                type="text"
                :placeholder="`Option ${oi + 1}...`"
                class="flex-1 px-3 py-2 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <button
                v-if="form.mcqOptions.length > 2"
                type="button"
                @click="removeMcqOption(oi)"
                class="text-gray-500 hover:text-red-600 text-lg leading-none"
              >✕</button>
            </div>
          </div>
          <button
            type="button"
            @click="addMcqOption()"
            class="mt-2 text-sm text-primary hover:underline font-medium"
          >
            + Ajouter une option
          </button>
        </div>

        <p v-if="formError" class="text-red-600 text-sm mb-4">{{ formError }}</p>

        <div class="btn-row">
          <button
            v-if="!justCreated"
            type="submit"
            :disabled="submitting"
            class="btn-modal-submit"
          >
            {{ submitting ? 'Enregistrement...' : editingCard ? 'Modifier' : 'Ajouter' }}
          </button>
          <button
            v-else
            type="button"
            class="btn-modal-submit"
            @click="openAdd"
          >
            Ajouter une autre carte
          </button>
          <button
            type="button"
            @click="close"
            class="btn-modal-cancel"
          >
            {{ justCreated ? 'Fermer' : 'Annuler' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
// Fenêtre d'ajout / modification d'une carte (ouverte ou QCM). Se pilote depuis la page avec
// `openAdd()` / `openEdit(card)` (via une référence de composant) ; la logique est dans useCardForm.
import FormulaHelper from '@/components/FormulaHelperComponent.vue'
import MindMapNodePicker from '@/components/MindMapNodePickerComponent.vue'
import AnswerQualityBadge from '@/components/AnswerQualityBadgeComponent.vue'
import { useCardForm } from '@/composables/useCardForm'

const props = defineProps({
  systemId: { type: Number, required: true },
  // Carte mentale liée au système (null = pas de sélecteur de nœud ni de lien à mettre à jour)
  mindMapJson: { type: Object, default: null },
  // Recharge les cartes de la page après un enregistrement
  reload: { type: Function, required: true },
})

const {
  showModal,
  submitting,
  formError,
  editingCard,
  form,
  lastQuality,
  qualitySaved,
  justCreated,
  openAdd,
  openEdit,
  close,
  submit,
  selectType,
  setOptionText,
  setMcqCorrect,
  addMcqOption,
  removeMcqOption,
  onNodeSelected,
} = useCardForm({
  systemId: props.systemId,
  getMindMapJson: () => props.mindMapJson,
  reload: () => props.reload(),
})

defineExpose({ openAdd, openEdit })
</script>
