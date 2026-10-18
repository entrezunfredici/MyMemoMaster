<template>
  <section class="palette__section palette__section--selected">
    <h4 class="palette__section-title">
      Options
      <span class="palette__node-label">{{ selectedNode.label }}</span>
    </h4>

    <!-- Type du nœud -->
    <div class="palette__field palette__field--row">
      <label class="palette__label">Type</label>
      <select aria-label="Type du nœud" class="palette__select palette__select--inline" :value="selectedNode.type" @change="updateNodeType($event.target.value)">
        <option v-for="nt in nodeTypes" :key="nt.id" :value="nt.id">{{ nt.label }}</option>
      </select>
    </div>

    <!-- Rôles supplémentaires -->
    <div class="palette__field">
      <label class="palette__label">Aussi</label>
      <div class="palette__shape-row">
        <button
          v-for="kind in extraKindOptions"
          :key="kind.id"
          type="button"
          :aria-pressed="hasKind(selectedNode, kind.id)"
          :class="['palette__kind-btn', { 'palette__kind-btn--active': hasKind(selectedNode, kind.id) }]"
          @click="toggleExtraKind(kind.id)"
        >{{ kind.label }}</button>
      </div>
    </div>

    <!-- Grandeur -->
    <template v-if="isQuantityNodeSelected">
      <div class="palette__field palette__field--row">
        <label class="palette__label">Symbole</label>
        <input aria-label="Symbole de la grandeur" type="text" class="palette__number" maxlength="12"
          :value="selectedNode.quantity?.symbol || ''" @input="updateQuantity('symbol', $event.target.value)" />
      </div>
      <!-- Grandeur numérique (valeur saisie) ou grandeur formule (valeur calculée) -->
      <div v-if="canChooseQuantityMode" class="palette__field">
        <label class="palette__label">Type de grandeur</label>
        <div class="palette__shape-row" role="group" aria-label="Type de grandeur">
          <button type="button" :aria-pressed="!quantityIsFormula"
            :class="['palette__kind-btn', { 'palette__kind-btn--active': !quantityIsFormula }]"
            @click="setQuantityMode('number')">Numérique</button>
          <button type="button" :aria-pressed="quantityIsFormula"
            :class="['palette__kind-btn', { 'palette__kind-btn--active': quantityIsFormula }]"
            @click="setQuantityMode('formula')">Formule</button>
        </div>
      </div>
      <p v-if="quantityIsFormula" class="palette__hint">Valeur calculée par la formule à partir des grandeurs reliées.</p>
      <div v-else class="palette__field palette__field--row">
        <label class="palette__label">Valeur</label>
        <input aria-label="Valeur de la grandeur" type="number" step="any" class="palette__number"
          :value="selectedNode.quantity?.value ?? ''" @change="updateQuantity('value', $event.target.value)" />
      </div>
      <div class="palette__field palette__field--row">
        <label class="palette__label">Unité</label>
        <input aria-label="Unité de la grandeur" type="text" class="palette__number" maxlength="16"
          :value="selectedNode.quantity?.unit || ''" @input="updateQuantity('unit', $event.target.value)" />
      </div>
    </template>

    <!-- Couleur de fond + forme -->
    <div class="palette__field palette__field--row">
      <label class="palette__label">Fond</label>
      <input aria-label="Couleur de fond" type="color" class="palette__color" :value="selectedNode.style?.primaryColor || mindmapColors.nodeBg" @input="updateColor($event.target.value)" />
    </div>

    <div class="palette__field">
      <label class="palette__label">Forme</label>
      <div class="palette__shape-row">
        <button
          v-for="s in shapes"
          :key="s.id"
          :class="['palette__shape-btn', { 'palette__shape-btn--active': (selectedNode.style?.shape || 'bubble') === s.id }]"
          @click="updateShape(s.id)"
        >{{ s.label }}</button>
      </div>
    </div>

    <!-- Style du texte (taille, gras… réservés aux nœuds texte ; couleur seule pour formules et graphiques) -->
    <PaletteTextStyle v-if="isTextNodeSelected || isFormulaNodeSelected || isGraphNodeSelected" :node="selectedNode" :with-font="isTextNodeSelected" />

    <!-- Formule -->
    <div v-if="isFormulaNodeSelected || isGraphNodeSelected" class="palette__field">
      <label class="palette__label">{{ isGraphNodeSelected ? 'Fonction à tracer (y = f(x))' : 'Formule' }}</label>
      <div v-if="editableContent" class="palette__formula-preview" v-html="formulaPreviewHtml" />
      <p v-else class="palette__hint">Aucune formule — ouvrez l'interpréteur pour en saisir une.</p>
      <div class="palette__actions-row">
        <button class="palette__btn" type="button" @click="openInterpreter">Saisir avec l'interpréteur</button>
        <button v-if="editableContent" class="palette__btn palette__btn--ghost" type="button" @click="clearFormulaContent">Effacer</button>
      </div>
    </div>

    <!-- Image -->
    <PaletteImageField v-if="isImageNodeSelected" :node="selectedNode" />

    <!-- Flashcard liée -->
    <PaletteCardLink :node="selectedNode" />

    <!-- Actions nœud -->
    <div class="palette__node-actions">
      <button class="palette__btn palette__btn--ghost" @click="toggleCollapse">
        {{ selectedNode.collapsed ? 'Réafficher' : 'Masquer' }}
      </button>
      <button class="palette__btn palette__btn--danger" @click="removeNode">Supprimer</button>
    </div>
  </section>

  <!-- ── Modale interpréteur ────────────────────────────────────────────── -->
  <PaletteModal v-if="store.interpreterOpen" title="Interpréteur de formules" close-label="Fermer l'interpréteur" @close="closeInterpreter">
    <Interpreter
      v-model="interpreterValue"
      :show-apply="true"
      apply-label="Insérer dans l'item"
      :bg-color="selectedNode.style?.primaryColor || ''"
      :text-color="selectedNode.style?.textColor || ''"
      @apply="applyInterpreter"
    />
  </PaletteModal>

  <!-- ── Proposition : créer les grandeurs des variables de la formule ───── -->
  <PaletteVariablePrompt
    v-if="variablePrompt"
    :symbols="variablePrompt.symbols"
    @confirm="confirmVariablePrompt"
    @dismiss="dismissVariablePrompt"
  />
</template>

<script setup>
// Options du nœud sélectionné : type, rôles, grandeur, fond, forme, formule, image, flashcard, actions.
// Extrait de MindMapPalette.vue (la saisie de formule vit dans usePaletteFormula, le style du texte
// dans PaletteTextStyle).
import { computed } from 'vue';
import { mindmapColors } from '@/helpers/themeColors';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { usePaletteFormula } from '@/composables/usePaletteFormula';
import { ITEM_KINDS, MATH_KINDS, PRIMARY_ONLY_KINDS, hasKind } from '@/helpers/mindmap/mindmapItems';
import Interpreter from '@/components/interpreter/Interpreter.vue';
import PaletteImageField from './PaletteImageField.vue';
import PaletteCardLink from './PaletteCardLink.vue';
import PaletteTextStyle from './PaletteTextStyle.vue';
import PaletteModal from './PaletteModal.vue';
import PaletteVariablePrompt from './PaletteVariablePrompt.vue';

const props = defineProps({
  node: { type: Object, required: true },
});

const store = useMindMapBuilderStore();

const nodeTypes = ITEM_KINDS;

const shapes = [
  { id: 'bubble', label: 'Bulle' },
  { id: 'rect', label: 'Rect' },
  { id: 'pill', label: 'Pilule' },
];

const selectedNode = computed(() => props.node);

const {
  editableContent,
  interpreterValue,
  variablePrompt,
  isFormulaNodeSelected,
  isGraphNodeSelected,
  formulaPreviewHtml,
  openInterpreter,
  closeInterpreter,
  startFormulaEdit,
  applyInterpreter,
  confirmVariablePrompt,
  dismissVariablePrompt,
  clearFormulaContent,
} = usePaletteFormula(selectedNode);

const isImageNodeSelected = computed(() => selectedNode.value.type === 'image');
const isQuantityNodeSelected = computed(() => hasKind(selectedNode.value, 'quantity'));
const extraKindOptions = computed(() =>
  ITEM_KINDS.filter((kind) => kind.id !== selectedNode.value.type && !PRIMARY_ONLY_KINDS.includes(kind.id))
);
// Une grandeur (principale ou ajoutée à un texte) est soit numérique, soit calculée par une formule.
const canChooseQuantityMode = computed(() => ['quantity', 'text'].includes(selectedNode.value.type));
const quantityIsFormula = computed(() => MATH_KINDS.some((kind) => hasKind(selectedNode.value, kind)));
const isTextNodeSelected = computed(() => selectedNode.value.type === 'text');

// Le contenu n'est conservé que si le nouveau rôle principal l'affiche de la même façon.
const contentFamily = (type) => (MATH_KINDS.includes(type) || type === 'graph' ? 'math' : type);

const updateNodeType = (type) => {
  const payload = { type };
  if (contentFamily(selectedNode.value.type) !== contentFamily(type)) {
    payload.content = type === 'text' ? (selectedNode.value.content || '') : '';
  }
  store.updateNode(selectedNode.value.id, payload);
};

const toggleExtraKind = (kind) => {
  const node = selectedNode.value;
  const enabling = !hasKind(node, kind);
  store.toggleNodeKind(node.id, kind);
  if (enabling && MATH_KINDS.includes(kind) && ['text', 'quantity'].includes(node.type)) startFormulaEdit();
};

// Passe d'une grandeur numérique à une grandeur formule et inversement. Repasser en numérique garde
// la formule en mémoire (elle est simplement ignorée) : la rebasculer la retrouve.
const setQuantityMode = (mode) => {
  const node = selectedNode.value;
  if (mode === 'formula') {
    if (!quantityIsFormula.value) toggleExtraKind('formula');
    return;
  }
  MATH_KINDS.filter((kind) => hasKind(node, kind)).forEach((kind) => store.toggleNodeKind(node.id, kind));
};

const updateQuantity = (field, value) => {
  store.updateNodeQuantity(selectedNode.value.id, { [field]: value });
};

const updateColor = (value) => {
  store.updateNodeStyle(selectedNode.value.id, { primaryColor: value });
};

const updateShape = (value) => {
  store.updateNodeStyle(selectedNode.value.id, { shape: value });
};

const toggleCollapse = () => {
  store.toggleCollapse(selectedNode.value.id);
};

const removeNode = () => {
  store.removeNode(selectedNode.value.id);
};
</script>
