<template>
  <div class="palette">

    <!-- ── Créer ──────────────────────────────────────────────────────────── -->
    <section class="palette__section">
      <h4 class="palette__section-title">Créer</h4>
      <div class="palette__field palette__field--row">
        <label class="palette__label">Type par défaut</label>
        <select class="palette__select palette__select--inline" :value="store.nodeType" @change="store.setNodeType($event.target.value)">
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
        <select class="palette__select palette__select--inline" :value="selectedNode.type" @change="updateNodeType($event.target.value)">
          <option v-for="nt in nodeTypes" :key="nt.id" :value="nt.id">{{ nt.label }}</option>
        </select>
      </div>

      <!-- Maîtrise -->
      <div class="palette__field">
        <label class="palette__label">Maîtrise</label>
        <select class="palette__select" :value="selectedNode.mastery" @change="updateMastery($event.target.value)">
          <option v-for="level in masteryLevels" :key="level.id" :value="level.id">{{ level.label }}</option>
        </select>
      </div>

      <!-- Couleur de fond + forme -->
      <div class="palette__field palette__field--row">
        <label class="palette__label">Fond</label>
        <input type="color" class="palette__color" :value="selectedNode.style?.primaryColor || '#1E3A8A'" @input="updateColor($event.target.value)" />
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
          <input type="color" class="palette__color" :value="textColor" @input="updateTextColor($event.target.value)" />
        </div>
        <div class="palette__field palette__field--row">
          <label class="palette__label">Taille (px)</label>
          <input
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
      <template v-if="isFormulaNodeSelected">
        <div class="palette__field palette__field--row">
          <label class="palette__label">Couleur texte</label>
          <input type="color" class="palette__color" :value="textColor" @input="updateTextColor($event.target.value)" />
        </div>
        <div class="palette__field">
          <label class="palette__label">Formule</label>
          <div v-if="editableContent" class="palette__formula-preview" v-html="formulaPreviewHtml" />
          <p v-else class="palette__hint">Aucune formule — ouvrez l'interpréteur pour en saisir une.</p>
          <div class="palette__actions-row">
            <button class="palette__btn" type="button" @click="openInterpreter">Saisir avec l'interpréteur</button>
            <button v-if="editableContent" class="palette__btn palette__btn--ghost" type="button" @click="clearFormulaContent">Effacer</button>
          </div>
        </div>
      </template>

      <!-- Image -->
      <template v-if="isImageNodeSelected">
        <div class="palette__field">
          <label class="palette__label">Image</label>
          <input ref="imageInputRef" type="file" accept="image/*" class="palette__file-hidden" @change="handleImageSelection" />
          <div class="palette__actions-row">
            <button class="palette__btn" type="button" @click="triggerImageSelection" :disabled="isUploadingImage">
              {{ isUploadingImage ? 'Envoi…' : 'Choisir une image' }}
            </button>
            <button v-if="selectedNode.content" class="palette__btn palette__btn--ghost" type="button" @click="removeImageFromNode" :disabled="isUploadingImage">
              Retirer
            </button>
          </div>
          <p v-if="imageUploadError" class="palette__error">{{ imageUploadError }}</p>
          <div v-if="selectedNode.content" class="palette__image-preview">
            <img :src="selectedNode.content" :alt="selectedNode.label" />
          </div>
        </div>
      </template>

      <!-- Flashcard liée -->
      <div class="palette__field">
        <label class="palette__label">Flashcard liée</label>

        <!-- Carte actuellement liée -->
        <div v-if="selectedNode.idCard" class="palette__card-linked">
          <span
            class="palette__card-dot"
            :style="{ background: linkedCardColor || '#C0C5D2' }"
          />
          <span class="palette__card-statement">{{ linkedCardStatement }}</span>
          <button class="palette__card-unlink" title="Délier" @click="unlinkCard">✕</button>
        </div>

        <!-- Bouton ouvrir le picker -->
        <button class="palette__btn palette__btn--ghost palette__btn--sm" @click="openCardPicker">
          {{ selectedNode.idCard ? 'Changer' : 'Lier une flashcard' }}
        </button>

        <!-- Picker inline -->
        <div v-if="showCardPicker" class="palette__card-picker">
          <select
            class="palette__select"
            :value="pickerSystemId"
            @change="onPickerSystemChange($event.target.value)"
          >
            <option value="">— Choisir un système —</option>
            <option v-for="sys in pickerSystems" :key="sys.idSystem" :value="sys.idSystem">
              {{ sys.name }}
            </option>
          </select>

          <div v-if="pickerLoading" class="palette__hint">Chargement…</div>

          <select
            v-else-if="pickerCards.length"
            class="palette__select"
            v-model="pickerCardId"
          >
            <option value="">— Choisir une carte —</option>
            <option v-for="card in pickerCards" :key="card.idCard" :value="card.idCard">
              {{ card.question?.statement || `Carte #${card.idCard}` }}
            </option>
          </select>
          <div v-else-if="pickerSystemId" class="palette__hint">Aucune carte dans ce système.</div>

          <div class="palette__actions-row">
            <button
              class="palette__btn"
              :disabled="!pickerCardId"
              @click="confirmLinkCard"
            >Lier</button>
            <button
              class="palette__btn palette__btn--ghost"
              @click="showCardPicker = false"
            >Annuler</button>
          </div>
        </div>
      </div>

      <!-- Actions nœud -->
      <div class="palette__node-actions">
        <button class="palette__btn palette__btn--ghost" @click="toggleCollapse">
          {{ selectedNode.collapsed ? 'Réafficher' : 'Masquer' }}
        </button>
        <button class="palette__btn palette__btn--danger" @click="removeNode">Supprimer</button>
      </div>
    </section>

    <section class="palette__section palette__section--empty" v-else>
      <p class="palette__hint">Sélectionnez un item pour modifier ses options.</p>
    </section>

    <!-- ── Zones ──────────────────────────────────────────────────────────── -->
    <section class="palette__section">
      <h4 class="palette__section-title">Zones</h4>
      <div class="palette__field">
        <input class="palette__input" v-model="zoneName" placeholder="Nom de la zone" />
      </div>
      <div class="palette__field palette__field--row">
        <label class="palette__label">Couleur</label>
        <input type="color" class="palette__color" v-model="zoneColor" />
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
          <button type="button" class="interp-modal__close" @click="closeInterpreter">&times;</button>
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
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { masteryList, boxColorToHex, boxLevelToMastery } from '@/helpers/mindmap';
import { api } from '@/helpers/api';
import { VITE_API_URL } from '@/config';
import { notif } from '@/helpers/notif';
import Interpreter from '@/components/interpreter/Interpreter.vue';
import { renderMathMultiline } from '@/components/interpreter/interpreter.js';

const store = useMindMapBuilderStore();

const nodeTypes = [
  { id: 'text', label: 'Texte', icon: 'T' },
  { id: 'formula', label: 'Formule', icon: 'Fx' },
  { id: 'image', label: 'Image', icon: '🖼' },
];

const shapes = [
  { id: 'bubble', label: 'Bulle' },
  { id: 'rect', label: 'Rect' },
  { id: 'pill', label: 'Pilule' },
];

const masteryLevels = masteryList;

const selectedNode = computed(() => store.selectedNode);
const selectedNodeZone = computed(() => selectedNode.value?.zoneId || null);
const zones = computed(() => store.map.zones || []);

const isImageNodeSelected = computed(() => selectedNode.value?.type === 'image');
const isFormulaNodeSelected = computed(() => selectedNode.value?.type === 'formula');
const isTextNodeSelected = computed(() => selectedNode.value?.type === 'text');

const editableContent = ref('');
const zoneName = ref('Zone');
const zoneColor = ref('#BFDBFE');
const imageInputRef = ref(null);
const isUploadingImage = ref(false);
const imageUploadError = ref('');
const interpreterValue = ref('');
const textColor = ref('#eef2ff');
const fontSize = ref(13);
const isBold = ref(false);
const isItalic = ref(false);
const isUnderline = ref(false);

// ── Flashcard liée ────────────────────────────────────────────────────────────
const showCardPicker = ref(false);
const pickerSystems = ref([]);
const pickerSystemId = ref(null);
const pickerCards = ref([]);
const pickerCardId = ref(null);
const pickerLoading = ref(false);

const linkedCardStatement = computed(() => {
  if (!selectedNode.value?.idCard) return null;
  const card = pickerCards.value.find((c) => c.idCard === selectedNode.value.idCard);
  return card?.question?.statement || `Carte #${selectedNode.value.idCard}`;
});

const linkedCardColor = computed(() => {
  if (!selectedNode.value?.idCard) return null;
  const card = pickerCards.value.find((c) => c.idCard === selectedNode.value.idCard);
  return card?.leitnerBox ? boxColorToHex(card.leitnerBox.color) : null;
});

const openCardPicker = async () => {
  showCardPicker.value = true;
  pickerLoading.value = true;
  pickerSystems.value = [];
  pickerCards.value = [];
  pickerSystemId.value = null;
  pickerCardId.value = null;
  try {
    const res = await api.get('leitnersystems/');
    pickerSystems.value = res?.data || [];
  } catch {
    notif.notify('Impossible de charger les systèmes Leitner.', 'error');
    showCardPicker.value = false;
  } finally {
    pickerLoading.value = false;
  }
};

const onPickerSystemChange = async (systemId) => {
  pickerSystemId.value = systemId;
  pickerCards.value = [];
  pickerCardId.value = null;
  if (!systemId) return;
  pickerLoading.value = true;
  try {
    const res = await api.get(`leitnercards/system/${systemId}`);
    pickerCards.value = res?.data || [];
  } catch {
    notif.notify('Impossible de charger les cartes de ce système.', 'error');
  } finally {
    pickerLoading.value = false;
  }
};

const confirmLinkCard = () => {
  if (!selectedNode.value || !pickerCardId.value || !pickerSystemId.value) return;
  store.linkCard(selectedNode.value.id, Number(pickerCardId.value), Number(pickerSystemId.value));
  const card = pickerCards.value.find((c) => c.idCard === Number(pickerCardId.value));
  if (card?.leitnerBox) {
    store.updateNode(selectedNode.value.id, {
      mastery: boxLevelToMastery(card.leitnerBox.level),
    });
    store.updateNodeStyle(selectedNode.value.id, {
      secondaryColor: boxColorToHex(card.leitnerBox.color),
    });
  }
  showCardPicker.value = false;
};

const unlinkCard = () => {
  if (!selectedNode.value) return;
  store.unlinkCard(selectedNode.value.id);
  showCardPicker.value = false;
};

watch(() => store.interpreterOpen, (open) => {
  if (open && isFormulaNodeSelected.value) {
    interpreterValue.value = editableContent.value || selectedNode.value?.content || '';
  }
});

watch(selectedNode, () => {
  showCardPicker.value = false;
  if (selectedNode.value?.idSystem && selectedNode.value?.idCard) {
    api.get(`leitnercards/system/${selectedNode.value.idSystem}`).then((res) => {
      if (res?.data) pickerCards.value = res.data;
    });
  } else {
    pickerCards.value = [];
  }
});

const formulaPreviewHtml = computed(() =>
  isFormulaNodeSelected.value && editableContent.value
    ? renderMathMultiline(editableContent.value)
    : ''
);

watch(
  selectedNode,
  (node) => {
    editableContent.value = node?.content || '';
    imageUploadError.value = '';
    if (imageInputRef.value) imageInputRef.value.value = '';
    textColor.value = node?.style?.textColor || '#eef2ff';
    fontSize.value = Number.parseInt(node?.style?.fontSize, 10) || 13;
    isBold.value = (node?.style?.fontWeight || 'normal') !== 'normal';
    isItalic.value = (node?.style?.fontStyle || 'normal') !== 'normal';
    isUnderline.value = (node?.style?.textDecoration || 'none').includes('underline');
    if (isFormulaNodeSelected.value) interpreterValue.value = node?.content || '';
    else interpreterValue.value = '';
    store.closeInterpreter();
  },
  { immediate: true }
);

const updateContent = () => {
  if (!selectedNode.value) return;
  store.updateNode(selectedNode.value.id, { content: editableContent.value });
};

const updateNodeType = (type) => {
  if (!selectedNode.value) return;
  store.updateNode(selectedNode.value.id, {
    type,
    content: type === 'text' ? (selectedNode.value.content || '') : '',
  });
};

const updateMastery = (value) => {
  if (!selectedNode.value) return;
  store.updateNode(selectedNode.value.id, { mastery: value });
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
};

const clearFormulaContent = () => {
  if (!selectedNode.value) return;
  editableContent.value = '';
  store.updateNode(selectedNode.value.id, { content: '' });
};

const resolveImageUrl = (payload = {}) => {
  if (!payload) return '';
  if (payload.url) return payload.url;
  if (payload.path) {
    try { return new URL(payload.path, VITE_API_URL).toString(); }
    catch { return payload.path; }
  }
  return '';
};

const triggerImageSelection = () => {
  if (!selectedNode.value) return;
  imageUploadError.value = '';
  imageInputRef.value?.click();
};

const handleImageSelection = async (event) => {
  if (!selectedNode.value) return;
  const file = event?.target?.files?.[0];
  if (!file) return;
  imageUploadError.value = '';
  if (file.size > 5 * 1024 * 1024) {
    imageUploadError.value = "L'image dépasse 5 Mo.";
    if (event.target) event.target.value = '';
    return;
  }
  const formData = new FormData();
  formData.append('image', file);
  isUploadingImage.value = true;
  try {
    const response = await api.post('diagrammes/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!response?.data) throw new Error('UPLOAD_FAILED');
    const imageUrl = resolveImageUrl(response.data);
    if (!imageUrl) throw new Error('INVALID_IMAGE_URL');
    store.updateNode(selectedNode.value.id, { content: imageUrl });
    editableContent.value = imageUrl;
  } catch {
    imageUploadError.value = "L'image n'a pas pu être téléchargée.";
  } finally {
    isUploadingImage.value = false;
    if (event?.target) event.target.value = '';
  }
};

const removeImageFromNode = () => {
  if (!selectedNode.value) return;
  store.updateNode(selectedNode.value.id, { content: '' });
  editableContent.value = '';
  imageUploadError.value = '';
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
  zoneColor.value = '#BFDBFE';
};

const assignZone = (zoneId) => {
  if (!selectedNode.value) return;
  store.assignNodeToZone(selectedNode.value.id, zoneId);
};
</script>

<style scoped>
.palette {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #ffffff;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.07);
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
}

.palette__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.palette__section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.palette__section--selected {
  background: #f8fafc;
  border-radius: 12px;
  padding: 10px;
  border: 1px solid #e2e8f0;
}

.palette__section--empty {
  border-bottom: none;
}

.palette__section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.palette__node-label {
  font-size: 11px;
  font-weight: 600;
  color: #1e3a8a;
  background: #dbeafe;
  padding: 2px 8px;
  border-radius: 9999px;
  text-transform: none;
  letter-spacing: 0;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette__label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #94a3b8;
}

.palette__hint {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

.palette__hint kbd {
  font-family: monospace;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 1px 4px;
  font-size: 11px;
  color: #0f172a;
}

.palette__hint--info {
  color: #2563eb;
  background: #eff6ff;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #bfdbfe;
}

/* Mode buttons */
.palette__mode-row {
  display: flex;
  gap: 8px;
}

.palette__mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 8px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  transition: all 0.15s ease;
}

.palette__mode-btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}

.palette__mode-btn--active {
  background: #0f172a;
  border-color: #0f172a;
  color: #f1f5f9;
}

/* Fields */
.palette__field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.palette__field--row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.palette__select--inline {
  width: auto;
  min-width: 100px;
}

.palette__input,
.palette__select {
  padding: 6px 9px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  color: #0f172a;
  background: #ffffff;
  width: 100%;
  box-sizing: border-box;
}

.palette__textarea {
  padding: 6px 9px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  color: #0f172a;
  background: #ffffff;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  font-family: 'Fira Code', monospace;
}

.palette__input:focus,
.palette__select:focus,
.palette__textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.palette__number {
  width: 68px;
  padding: 5px 6px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  text-align: center;
  background: #ffffff;
}

.palette__color {
  width: 34px;
  height: 26px;
  border: 1.5px solid #e2e8f0;
  border-radius: 7px;
  cursor: pointer;
  padding: 2px;
  background: transparent;
}

/* Shape */
.palette__shape-row {
  display: flex;
  gap: 6px;
}

.palette__shape-btn {
  flex: 1;
  padding: 6px 4px;
  border-radius: 8px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  transition: all 0.15s ease;
}

.palette__shape-btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}

.palette__shape-btn--active {
  background: #1e3a8a;
  border-color: #1e3a8a;
  color: #ffffff;
}

/* Toolbar text style */
.palette__toolbar {
  display: flex;
  gap: 6px;
}

.palette__toolbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #475569;
  transition: all 0.15s ease;
}

.palette__toolbar-btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}

.palette__toolbar-btn.active {
  background: #1d4ed8;
  border-color: #1d4ed8;
  color: #ffffff;
}

/* Buttons */
.palette__actions-row {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}

.palette__btn {
  flex: 1;
  padding: 7px 8px;
  border-radius: 9px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  background: #1d4ed8;
  color: #ffffff;
  transition: background 0.15s ease;
}

.palette__btn:hover { background: #1e40af; }

.palette__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.palette__btn--ghost {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.palette__btn--ghost:hover { background: #e2e8f0; }

.palette__btn--danger {
  background: #ef4444;
  color: #ffffff;
}

.palette__btn--danger:hover { background: #dc2626; }

.palette__node-actions {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}

/* Formula */
.palette__formula-preview {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  max-height: 140px;
  overflow-y: auto;
  margin-top: 4px;
}

/* Image */
.palette__error {
  font-size: 11px;
  color: #b91c1c;
  margin: 4px 0 0;
}

.palette__file-hidden { display: none; }

.palette__image-preview {
  margin-top: 6px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.palette__image-preview img {
  width: 100%;
  display: block;
  border-radius: 8px;
}

/* Zones */
.palette__zone-assign {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.palette__zone-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.palette__zone-chip {
  padding: 4px 10px;
  border-radius: 9999px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.15s ease;
}

.palette__zone-chip:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}

.palette__zone-chip.active {
  background: #1e3a8a;
  border-color: #1e3a8a;
  color: #ffffff;
}

/* Flashcard liée */
.palette__card-linked {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  background: #f0fdf4;
  border: 1px solid #86efac;
}

.palette__card-dot {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid rgba(0,0,0,0.12);
}

.palette__card-statement {
  flex: 1;
  font-size: 12px;
  color: #166534;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette__card-unlink {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: #166534;
  font-size: 12px;
  padding: 0 2px;
  line-height: 1;
  opacity: 0.6;
}
.palette__card-unlink:hover { opacity: 1; }

.palette__btn--sm {
  padding: 5px 8px;
  font-size: 11px;
}

.palette__card-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

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
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
}

.interp-modal__dialog {
  position: relative;
  width: min(960px, 100%);
  max-height: 80vh;
  overflow-y: auto;
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
  z-index: 1;
}

.interp-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: #0f172a;
}

.interp-modal__close {
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  color: #0f172a;
  line-height: 1;
  transition: color 0.15s ease;
}

.interp-modal__close:hover { color: #2563eb; }
</style>
