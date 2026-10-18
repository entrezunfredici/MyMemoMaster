<template>
  <!-- Grandeur (rôle principal ou supplémentaire) : valeur éditable directement,
       double-clic sur le symbole ou l'unité pour les modifier -->
  <div
    v-if="hasQuantityKind && editingField !== 'quantity'"
    class="mindmap-node__quantity"
    :class="{ 'mindmap-node__quantity--badge': node.type !== 'quantity' }"
  >
    <span class="mindmap-node__quantity-label" title="Double-clic pour modifier" @dblclick.stop="startEditQuantity">{{ quantitySymbol || 'symbole' }}</span>
    <span class="mindmap-node__quantity-sep">=</span>
    <span v-if="ownCalculation?.ok" class="mindmap-node__quantity-computed" :title="'Calculé : ' + ownCalculationText">{{ ownCalculation.value }}</span>
    <input v-else aria-label="Valeur de la grandeur"
      class="mindmap-node__inline-input mindmap-node__quantity-value"
      type="number"
      step="any"
      placeholder="valeur"
      :value="quantityValue"
      @change="commitQuantityValue"
      @keydown.enter.prevent="$event.target.blur()"
      @click.stop
      @pointerdown.stop
      @dblclick.stop
    />
    <span class="mindmap-node__quantity-label" title="Double-clic pour modifier" @dblclick.stop="startEditQuantity">{{ ownCalculation?.ok ? ownCalculation.unit : quantityUnit || 'unité' }}</span>
  </div>
  <!-- Édition du symbole et de l'unité -->
  <div
    v-if="editingField === 'quantity'"
    ref="quantityEditorRef"
    class="mindmap-node__quantity-editor"
    @focusout="onQuantityFocusOut"
    @click.stop
    @pointerdown.stop
  >
    <input aria-label="Symbole de la grandeur"
      ref="quantitySymbolRef"
      class="mindmap-node__inline-input mindmap-node__quantity-input"
      v-model="localQuantity.symbol"
      maxlength="12"
      placeholder="m"
      @keydown.enter.prevent="commitQuantity"
      @keydown.escape.prevent="cancelEdit"
    />
    <input aria-label="Unité de la grandeur"
      class="mindmap-node__inline-input mindmap-node__quantity-input"
      v-model="localQuantity.unit"
      maxlength="16"
      placeholder="kg"
      @keydown.enter.prevent="commitQuantity"
      @keydown.escape.prevent="cancelEdit"
    />
  </div>
  <!-- Résultat du calcul d'une formule reliée à des grandeurs -->
  <div
    v-if="calculation?.ok && !hasQuantityKind"
    class="mindmap-node__quantity mindmap-node__quantity--badge mindmap-node__quantity--result"
  >{{ calculationText }}</div>
  <div
    v-else-if="calculation && !calculation.ok"
    class="mindmap-node__calc-error"
    :title="calculation.error"
  >⚠ {{ calculation.error }}</div>
</template>

<script setup>
// Grandeur d'un item de carte (symbole, valeur, unité) et résultat du calcul de sa formule.
// Extrait de MindMapNode.vue.
import { computed, ref, nextTick } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { createQuantity, hasKind } from '@/helpers/mindmap/mindmapItems';
import { formatCalculation } from '@/helpers/mindmap/mindmapCalc';
import { useNodeEditing } from '@/composables/useMindMapNodeEditing';

const props = defineProps({
  node: { type: Object, required: true },
});

const store = useMindMapBuilderStore();
const editingField = useNodeEditing();

const hasQuantityKind = computed(() => hasKind(props.node, 'quantity'));
const quantity = computed(() => createQuantity(props.node.quantity));
const quantitySymbol = computed(() => quantity.value.symbol);
const quantityUnit = computed(() => quantity.value.unit);
const quantityValue = computed(() => quantity.value.value ?? '');
// Résultat de la formule portée par cet item (null si elle n'est reliée à aucune grandeur).
const calculation = computed(() => store.calculations?.[props.node.id] || null);
const calculationText = computed(() => formatCalculation(calculation.value));
// Formule qui est aussi une grandeur : sa valeur et son unité viennent du calcul.
const ownCalculation = computed(() => (hasQuantityKind.value && calculation.value?.ok ? calculation.value : null));
const ownCalculationText = computed(() => formatCalculation(ownCalculation.value));

const localQuantity = ref({ symbol: '', unit: '' });
const quantityEditorRef = ref(null);
const quantitySymbolRef = ref(null);

const startEditQuantity = () => {
  localQuantity.value = { symbol: quantity.value.symbol, unit: quantity.value.unit };
  editingField.value = 'quantity';
  nextTick(() => {
    quantitySymbolRef.value?.focus();
    quantitySymbolRef.value?.select();
  });
};

const commitQuantity = () => {
  if (editingField.value !== 'quantity') return;
  store.updateNodeQuantity(props.node.id, { symbol: localQuantity.value.symbol, unit: localQuantity.value.unit });
  editingField.value = null;
};

// La valeur s'édite directement sur l'item (sans double-clic).
const commitQuantityValue = (event) => {
  store.updateNodeQuantity(props.node.id, { value: event.target.value });
};

// Valide quand le focus quitte l'ensemble des trois champs (pas entre deux champs).
const onQuantityFocusOut = (event) => {
  if (quantityEditorRef.value?.contains(event.relatedTarget)) return;
  commitQuantity();
};

const cancelEdit = () => {
  editingField.value = null;
};
</script>
