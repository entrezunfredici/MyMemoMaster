<template>
  <div class="palette">

    <!-- ── Créer ──────────────────────────────────────────────────────────── -->
    <section class="palette__section">
      <h4 class="palette__section-title">Créer</h4>
      <div class="palette__field palette__field--row">
        <label class="palette__label">Type par défaut</label>
        <select aria-label="Type par défaut" class="palette__select palette__select--inline" :value="store.nodeType" @change="store.setNodeType($event.target.value)">
          <option v-for="nt in nodeTypes" :key="nt.id" :value="nt.id">{{ nt.label }}</option>
        </select>
      </div>
      <p class="palette__hint">
        <kbd>⇧</kbd>&thinsp;+ clic sur le canvas ou un nœud pour créer. Bouton <strong>+</strong> sur un nœud pour ajouter un enfant.
      </p>
    </section>

    <!-- ── Modes ──────────────────────────────────────────────────────────── -->
    <section class="palette__section">
      <h4 class="palette__section-title">Mode</h4>
      <div class="palette__mode-row">
        <button
          :class="['palette__mode-btn', { 'palette__mode-btn--active': store.tool === 'link' }]"
          @click="store.setTool(store.tool === 'link' ? 'select' : 'link')"
        >
          <span>→</span> Lien
        </button>
        <button
          :class="['palette__mode-btn', { 'palette__mode-btn--active': store.tool === 'zone' }]"
          @click="store.setTool(store.tool === 'zone' ? 'select' : 'zone')"
        >
          <span>□</span> Zone
        </button>
      </div>
      <p v-if="store.tool === 'link'" class="palette__hint palette__hint--info">
        Mode lien actif — cliquez sur un nœud source, puis sur la cible.
      </p>
      <div v-if="store.tool === 'link'" class="palette__field palette__field--row">
        <label class="palette__label">Type</label>
        <select aria-label="Type des nouvelles branches" class="palette__select palette__select--inline" :value="store.linkType" @change="store.setLinkType($event.target.value)">
          <option v-for="bt in branchTypes" :key="bt.id" :value="bt.id">{{ bt.label }}</option>
        </select>
      </div>
    </section>

    <!-- ── Item sélectionné ───────────────────────────────────────────────── -->
    <section class="palette__section palette__section--selected" v-if="selectedNode">
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

      <!-- Options texte -->
      <template v-if="isTextNodeSelected">
        <div class="palette__field palette__field--row">
          <label class="palette__label">Couleur texte</label>
          <input aria-label="Couleur du texte" type="color" class="palette__color" :value="textColor" @input="updateTextColor($event.target.value)" />
        </div>
        <div class="palette__field palette__field--row">
          <label class="palette__label">Taille (px)</label>
          <input aria-label="Taille du texte en pixels"
            type="number"
            class="palette__number"
            min="10" max="48"
            :value="fontSize"
            @change="updateFontSize($event.target.value)"
          />
        </div>
        <div class="palette__toolbar">
          <button type="button" :class="['palette__toolbar-btn', { active: isBold }]" @click="toggleBold">
            <strong>G</strong>
          </button>
          <button type="button" :class="['palette__toolbar-btn', { active: isItalic }]" @click="toggleItalic">
            <em>I</em>
          </button>
          <button type="button" :class="['palette__toolbar-btn', { active: isUnderline }]" @click="toggleUnderline">
            <u>S</u>
          </button>
        </div>
      </template>

      <!-- Formule -->
      <template v-if="isFormulaNodeSelected || isGraphNodeSelected">
        <div class="palette__field palette__field--row">
          <label class="palette__label">Couleur texte</label>
          <input aria-label="Couleur du texte" type="color" class="palette__color" :value="textColor" @input="updateTextColor($event.target.value)" />
        </div>
        <div class="palette__field">
          <label class="palette__label">{{ isGraphNodeSelected ? 'Fonction à tracer (y = f(x))' : 'Formule' }}</label>
          <div v-if="editableContent" class="palette__formula-preview" v-html="formulaPreviewHtml" />
          <p v-else class="palette__hint">Aucune formule — ouvrez l'interpréteur pour en saisir une.</p>
          <div class="palette__actions-row">
            <button class="palette__btn" type="button" @click="openInterpreter">Saisir avec l'interpréteur</button>
            <button v-if="editableContent" class="palette__btn palette__btn--ghost" type="button" @click="clearFormulaContent">Effacer</button>
          </div>
        </div>
      </template>

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

    <!-- ── Branche sélectionnée ───────────────────────────────────────────── -->
    <section class="palette__section palette__section--selected" v-else-if="selectedLink">
      <h4 class="palette__section-title">Branche</h4>

      <div class="palette__field palette__field--row">
        <label class="palette__label">Type</label>
        <select aria-label="Type de la branche" class="palette__select palette__select--inline" :value="selectedLink.type" @change="store.updateLink(selectedLink.id, { type: $event.target.value })">
          <option v-for="bt in branchTypes" :key="bt.id" :value="bt.id">{{ bt.label }}</option>
        </select>
      </div>
      <div class="palette__field palette__field--row">
        <input aria-label="Nom du nouveau type de branche" v-model="newBranchType" type="text" class="palette__number" maxlength="30" placeholder="Nouveau type…" @keydown.enter.prevent="createBranchType" />
        <button class="palette__btn" type="button" @click="createBranchType">Créer</button>
      </div>

      <div class="palette__field">
        <label class="palette__label">Sens</label>
        <div class="palette__shape-row">
          <button
            v-for="d in LINK_DIRECTIONS"
            :key="d.id"
            type="button"
            :aria-pressed="selectedLink.direction === d.id"
            :class="['palette__kind-btn', { 'palette__kind-btn--active': selectedLink.direction === d.id }]"
            @click="store.updateLink(selectedLink.id, { direction: d.id })"
          >{{ d.label }}</button>
        </div>
      </div>

      <div class="palette__field">
        <label class="palette__label">Forme</label>
        <div class="palette__shape-row">
          <button
            v-for="s in LINK_SHAPES"
            :key="s.id"
            type="button"
            :aria-pressed="selectedLink.style?.shape === s.id"
            :class="['palette__kind-btn', { 'palette__kind-btn--active': selectedLink.style?.shape === s.id }]"
            @click="store.updateLink(selectedLink.id, { style: { shape: s.id } })"
          >{{ s.label }}</button>
        </div>
      </div>

      <div class="palette__field palette__field--row">
        <label class="palette__label">Couleur</label>
        <input aria-label="Couleur principale de la branche" type="color" class="palette__color" :value="selectedLink.style?.primaryColor" @input="store.updateLink(selectedLink.id, { style: { primaryColor: $event.target.value } })" />
      </div>
      <div class="palette__field palette__field--row">
        <label class="palette__label">Milieu</label>
        <input aria-label="Couleur secondaire de la branche" type="color" class="palette__color" :value="selectedLink.style?.secondaryColor" @input="store.updateLink(selectedLink.id, { style: { secondaryColor: $event.target.value } })" />
      </div>

      <div v-if="outgoingCount > 1" class="palette__field palette__field--row">
        <label class="palette__label">Lecture {{ readingRank }}/{{ outgoingCount }}</label>
        <button class="palette__btn" type="button" :disabled="readingRank <= 1" aria-label="Lire plus tôt" @click="store.moveLink(selectedLink.id, -1)">↑</button>
        <button class="palette__btn" type="button" :disabled="readingRank >= outgoingCount" aria-label="Lire plus tard" @click="store.moveLink(selectedLink.id, 1)">↓</button>
      </div>

      <div class="palette__actions-row">
        <button class="palette__btn palette__btn--danger" type="button" @click="store.removeLink(selectedLink.id)">Supprimer</button>
      </div>
    </section>

    <section class="palette__section palette__section--empty" v-else>
      <p class="palette__hint">Sélectionnez un item ou une branche pour modifier ses options.</p>
    </section>

    <!-- ── Zones ──────────────────────────────────────────────────────────── -->
    <section class="palette__section">
      <h4 class="palette__section-title">Zones</h4>
      <div class="palette__field">
        <input aria-label="Nom de la zone" class="palette__input" v-model="zoneName" placeholder="Nom de la zone" />
      </div>
      <div class="palette__field palette__field--row">
        <label class="palette__label">Couleur</label>
        <input aria-label="Couleur de la zone" type="color" class="palette__color" v-model="zoneColor" />
      </div>
      <button class="palette__btn" @click="createZone">Créer une zone</button>
      <div v-if="zones.length && selectedNode" class="palette__zone-assign">
        <label class="palette__label">Assigner à</label>
        <div class="palette__zone-chips">
          <button
            v-for="zone in zones"
            :key="zone.id"
            :class="['palette__zone-chip', { active: selectedNodeZone === zone.id }]"
            @click="assignZone(zone.id)"
          >{{ zone.name }}</button>
          <button class="palette__zone-chip" @click="assignZone(null)">Aucune</button>
        </div>
      </div>
    </section>
  </div>

  <!-- ── Modale interpréteur ────────────────────────────────────────────── -->
  <teleport to="body">
    <div v-if="store.interpreterOpen" class="interp-modal">
      <div class="interp-modal__backdrop" @click="closeInterpreter" />
      <div class="interp-modal__dialog">
        <div class="interp-modal__header">
          <h3>Interpréteur de formules</h3>
          <button aria-label="Fermer l'interpréteur" type="button" class="interp-modal__close" @click="closeInterpreter">&times;</button>
        </div>
        <Interpreter
          v-model="interpreterValue"
          :show-apply="true"
          apply-label="Insérer dans l'item"
          :bg-color="selectedNode?.style?.primaryColor || ''"
          :text-color="selectedNode?.style?.textColor || ''"
          @apply="applyInterpreter"
        />
      </div>
    </div>
  </teleport>

  <!-- ── Proposition : créer les grandeurs des variables de la formule ───── -->
  <teleport to="body">
    <div v-if="variablePrompt" class="interp-modal" role="dialog" aria-modal="true" aria-labelledby="variable-prompt-title">
      <div class="interp-modal__backdrop" @click="dismissVariablePrompt" />
      <div class="interp-modal__dialog interp-modal__dialog--narrow">
        <div class="interp-modal__header">
          <h3 id="variable-prompt-title">Créer les grandeurs de la formule ?</h3>
          <button aria-label="Ignorer" type="button" class="interp-modal__close" @click="dismissVariablePrompt">&times;</button>
        </div>
        <p class="palette__hint">Ces variables n'ont pas encore de grandeur reliée. Cochez celles à créer : chacune sera reliée à la formule par une branche « Calcul ».</p>
        <ul class="variable-prompt__list">
          <li v-for="item in variablePrompt.items" :key="item.symbol">
            <label class="variable-prompt__item">
              <input type="checkbox" v-model="item.checked" :aria-label="'Créer la grandeur ' + item.symbol" />
              <span>{{ item.symbol }}</span>
            </label>
          </li>
        </ul>
        <div class="variable-prompt__actions">
          <button type="button" class="palette__btn" @click="confirmVariablePrompt">Créer les grandeurs</button>
          <button type="button" class="palette__btn palette__btn--ghost" @click="dismissVariablePrompt">Ignorer</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import './palette/palette.css';
import { mindmapColors } from '@/helpers/themeColors';
import { computed, ref, watch } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { ITEM_KINDS, MATH_KINDS, PRIMARY_ONLY_KINDS, hasKind, hasFormulaContent, isGraphNode } from '@/helpers/mindmap/mindmapItems';
import { LINK_DIRECTIONS, LINK_SHAPES, getOutgoingLinks } from '@/helpers/mindmap/mindmapLinks';
import Interpreter from '@/components/interpreter/Interpreter.vue';
import PaletteImageField from './palette/PaletteImageField.vue';
import PaletteCardLink from './palette/PaletteCardLink.vue';
import { renderMathMultiline } from '@/components/interpreter/interpreter.js';
import { missingVariables } from '@/helpers/mindmap/mindmapCalc';

const store = useMindMapBuilderStore();

const nodeTypes = ITEM_KINDS;

const shapes = [
  { id: 'bubble', label: 'Bulle' },
  { id: 'rect', label: 'Rect' },
  { id: 'pill', label: 'Pilule' },
];

const selectedNode = computed(() => store.selectedNode);
const selectedLink = computed(() => store.selectedLink || null);
const branchTypes = computed(() => store.map.branchTypes || []);
const newBranchType = ref('');
const outgoingLinks = computed(() =>
  selectedLink.value ? getOutgoingLinks(store.map.links, selectedLink.value.from) : []
);
const outgoingCount = computed(() => outgoingLinks.value.length);
const readingRank = computed(
  () => outgoingLinks.value.findIndex((link) => link.id === selectedLink.value?.id) + 1
);

const createBranchType = () => {
  const id = store.addBranchType(newBranchType.value);
  if (!id || !selectedLink.value) return;
  store.updateLink(selectedLink.value.id, { type: id });
  newBranchType.value = '';
};

const selectedNodeZone = computed(() => selectedNode.value?.zoneId || null);
const zones = computed(() => store.map.zones || []);

const isImageNodeSelected = computed(() => selectedNode.value?.type === 'image');
const isFormulaNodeSelected = computed(() => hasFormulaContent(selectedNode.value));
const isGraphNodeSelected = computed(() => isGraphNode(selectedNode.value));
const isQuantityNodeSelected = computed(() => hasKind(selectedNode.value, 'quantity'));
const extraKindOptions = computed(() =>
  ITEM_KINDS.filter((kind) => kind.id !== selectedNode.value?.type && !PRIMARY_ONLY_KINDS.includes(kind.id))
);
// Une grandeur (principale ou ajoutée à un texte) est soit numérique, soit calculée par une formule.
const canChooseQuantityMode = computed(() => ['quantity', 'text'].includes(selectedNode.value?.type));
const quantityIsFormula = computed(() => MATH_KINDS.some((kind) => hasKind(selectedNode.value, kind)));
const isTextNodeSelected = computed(() => selectedNode.value?.type === 'text');

const editableContent = ref('');
const zoneName = ref('Zone');
const zoneColor = ref(mindmapColors.zone);
const interpreterValue = ref('');
const textColor = ref(mindmapColors.nodeText);
const fontSize = ref(13);
const isBold = ref(false);
const isItalic = ref(false);
const isUnderline = ref(false);

watch(() => store.interpreterOpen, (open) => {
  if (open && (isFormulaNodeSelected.value || isGraphNodeSelected.value)) {
    interpreterValue.value = editableContent.value || selectedNode.value?.content || '';
  }
});

const formulaPreviewHtml = computed(() =>
  (isFormulaNodeSelected.value || isGraphNodeSelected.value) && editableContent.value
    ? renderMathMultiline(editableContent.value)
    : ''
);

watch(
  selectedNode,
  (node) => {
    editableContent.value = node?.content || '';
    textColor.value = node?.style?.textColor || mindmapColors.nodeText;
    fontSize.value = Number.parseInt(node?.style?.fontSize, 10) || 13;
    isBold.value = (node?.style?.fontWeight || 'normal') !== 'normal';
    isItalic.value = (node?.style?.fontStyle || 'normal') !== 'normal';
    isUnderline.value = (node?.style?.textDecoration || 'none').includes('underline');
    if (isFormulaNodeSelected.value || isGraphNodeSelected.value) interpreterValue.value = node?.content || '';
    else interpreterValue.value = '';
    store.closeInterpreter();
  },
  { immediate: true }
);

// Le contenu n'est conservé que si le nouveau rôle principal l'affiche de la même façon.
const contentFamily = (type) => (MATH_KINDS.includes(type) || type === 'graph' ? 'math' : type);

const updateNodeType = (type) => {
  if (!selectedNode.value) return;
  const payload = { type };
  if (contentFamily(selectedNode.value.type) !== contentFamily(type)) {
    payload.content = type === 'text' ? (selectedNode.value.content || '') : '';
  }
  store.updateNode(selectedNode.value.id, payload);
};

const toggleExtraKind = (kind) => {
  if (!selectedNode.value) return;
  const node = selectedNode.value;
  const enabling = !hasKind(node, kind);
  store.toggleNodeKind(node.id, kind);
  // Activer « Formule » / « Fonction » sur un texte ou une grandeur propose directement l'éditeur de formule.
  if (enabling && MATH_KINDS.includes(kind) && ['text', 'quantity'].includes(node.type)) {
    // Le texte par défaut (titre recopié) n'a pas de sens comme formule : on part d'une saisie vide.
    if (node.content === node.label) {
      editableContent.value = '';
      store.updateNode(node.id, { content: '' });
    }
    interpreterValue.value = editableContent.value || node.content || '';
    store.openInterpreter();
  }
};

// Passe d'une grandeur numérique à une grandeur formule et inversement. Repasser en numérique garde
// la formule en mémoire (elle est simplement ignorée) : la rebasculer la retrouve.
const setQuantityMode = (mode) => {
  if (!selectedNode.value) return;
  const node = selectedNode.value;
  if (mode === 'formula') {
    if (!quantityIsFormula.value) toggleExtraKind('formula');
    return;
  }
  MATH_KINDS.filter((kind) => hasKind(node, kind)).forEach((kind) => store.toggleNodeKind(node.id, kind));
};

const updateQuantity = (field, value) => {
  if (!selectedNode.value) return;
  store.updateNodeQuantity(selectedNode.value.id, { [field]: value });
};

const updateColor = (value) => {
  if (!selectedNode.value) return;
  store.updateNodeStyle(selectedNode.value.id, { primaryColor: value });
};

const updateShape = (value) => {
  if (!selectedNode.value) return;
  store.updateNodeStyle(selectedNode.value.id, { shape: value });
};

const updateTextColor = (value) => {
  if (!selectedNode.value) return;
  textColor.value = value;
  store.updateNodeStyle(selectedNode.value.id, { textColor: value });
};

const updateFontSize = (value) => {
  if (!selectedNode.value) return;
  const numeric = Number.parseInt(value, 10);
  const safeValue = Number.isFinite(numeric) ? Math.min(48, Math.max(10, numeric)) : 13;
  fontSize.value = safeValue;
  store.updateNodeStyle(selectedNode.value.id, { fontSize: safeValue });
};

const toggleBold = () => {
  if (!selectedNode.value) return;
  isBold.value = !isBold.value;
  store.updateNodeStyle(selectedNode.value.id, { fontWeight: isBold.value ? 'bold' : 'normal' });
};

const toggleItalic = () => {
  if (!selectedNode.value) return;
  isItalic.value = !isItalic.value;
  store.updateNodeStyle(selectedNode.value.id, { fontStyle: isItalic.value ? 'italic' : 'normal' });
};

const toggleUnderline = () => {
  if (!selectedNode.value) return;
  isUnderline.value = !isUnderline.value;
  store.updateNodeStyle(selectedNode.value.id, { textDecoration: isUnderline.value ? 'underline' : 'none' });
};

const openInterpreter = () => {
  if (!selectedNode.value) return;
  interpreterValue.value = editableContent.value || '';
  store.openInterpreter();
};

const closeInterpreter = () => { store.closeInterpreter(); };

const applyInterpreter = (value) => {
  if (!selectedNode.value) return;
  const nextValue = typeof value === 'string' ? value : interpreterValue.value ?? editableContent.value ?? '';
  interpreterValue.value = nextValue;
  editableContent.value = nextValue;
  store.updateNode(selectedNode.value.id, { content: nextValue });
  store.closeInterpreter();
  if (!isGraphNodeSelected.value) proposeVariables(selectedNode.value.id);
};

// Après saisie d'une formule : propose de créer les grandeurs des variables qui n'en ont pas encore.
const variablePrompt = ref(null);

const proposeVariables = (nodeId) => {
  const missing = missingVariables(store.map, nodeId);
  variablePrompt.value = missing.length
    ? { nodeId, items: missing.map((symbol) => ({ symbol, checked: true })) }
    : null;
};

const confirmVariablePrompt = () => {
  const prompt = variablePrompt.value;
  variablePrompt.value = null;
  if (!prompt) return;
  const symbols = prompt.items.filter((item) => item.checked).map((item) => item.symbol);
  if (symbols.length) store.createQuantitiesForFormula(prompt.nodeId, symbols);
};

const dismissVariablePrompt = () => { variablePrompt.value = null; };

const clearFormulaContent = () => {
  if (!selectedNode.value) return;
  editableContent.value = '';
  store.updateNode(selectedNode.value.id, { content: '' });
};

const toggleCollapse = () => {
  if (!selectedNode.value) return;
  store.toggleCollapse(selectedNode.value.id);
};

const removeNode = () => {
  if (!selectedNode.value) return;
  store.removeNode(selectedNode.value.id);
};

const createZone = () => {
  store.addZone({ name: zoneName.value.trim() || 'Zone', color: zoneColor.value });
  zoneName.value = 'Zone';
  zoneColor.value = mindmapColors.zone;
};

const assignZone = (zoneId) => {
  if (!selectedNode.value) return;
  store.assignNodeToZone(selectedNode.value.id, zoneId);
};
</script>

<style scoped>
/* Modale interpréteur */
.interp-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 60px 20px;
  z-index: 2000;
}

.interp-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgb(var(--slate-900-rgb) / 0.45);
  backdrop-filter: blur(2px);
}

.interp-modal__dialog {
  position: relative;
  width: min(960px, 100%);
  max-height: 80vh;
  overflow-y: auto;
  background: rgb(var(--white));
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 24px 60px rgb(var(--slate-900-rgb) / 0.35);
  z-index: 1;
}

.interp-modal__dialog--narrow { width: min(440px, 100%); }
.variable-prompt__list { list-style: none; margin: 12px 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.variable-prompt__item {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; border: 1px solid var(--slate-200); border-radius: 8px;
  background: var(--slate-50); color: var(--slate-900); font-weight: 600; cursor: pointer;
}
.variable-prompt__actions { display: flex; gap: 8px; }
.interp-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: var(--slate-900);
}

.interp-modal__close {
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  color: var(--slate-900);
  line-height: 1;
  transition: color 0.15s ease;
}

.interp-modal__close:hover { color: var(--blue-600); }
</style>
