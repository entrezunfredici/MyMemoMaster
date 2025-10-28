<template>
  <div class="mindmap-palette">
    <header class="mindmap-palette__header">
      <h3>Outils</h3>
      <span class="mindmap-palette__tool">Mode: {{ activeToolLabel }}</span>
    </header>

    <div class="mindmap-palette__section">
      <div class="mindmap-palette__buttons">
        <button
          v-for="tool in tools"
          :key="tool.id"
          :class="['mindmap-palette__button', { 'mindmap-palette__button--active': store.tool === tool.id }]"
          @click="store.setTool(tool.id)"
        >
          <span class="mindmap-palette__icon">{{ tool.icon }}</span>
          <span>{{ tool.label }}</span>
        </button>
      </div>
    </div>

    <div class="mindmap-palette__section">
      <h4>Creer des items</h4>
      <div class="mindmap-palette__actions">
        <button @click="createSubjectItem">{{ subjectCreationLabel }}</button>
        <button @click="addChild" :disabled="!selectedNode">{{ childCreationLabel }}</button>
      </div>
      <p class="mindmap-palette__hint">{{ creationHint }}</p>
    </div>

    <div class="mindmap-palette__section" v-if="selectedNode">
      <h4>Item selectionne</h4>
      <div class="mindmap-palette__field">
        <label>Titre</label>
        <input v-model="editableLabel" @change="updateLabel" />
      </div>
      <div v-if="isTextNodeSelected" class="mindmap-palette__text-style">
        <div class="mindmap-palette__text-toolbar">
          <button type="button" :class="{ active: isBold }" @click="toggleBold">
            <span class="mindmap-palette__text-icon mindmap-palette__text-icon--bold">G</span>
          </button>
          <button type="button" :class="{ active: isItalic }" @click="toggleItalic">
            <span class="mindmap-palette__text-icon mindmap-palette__text-icon--italic">I</span>
          </button>
          <button type="button" :class="{ active: isUnderline }" @click="toggleUnderline">
            <span class="mindmap-palette__text-icon mindmap-palette__text-icon--underline">U</span>
          </button>
        </div>
        <div class="mindmap-palette__field mindmap-palette__field--inline">
          <label>Couleur du texte</label>
          <input type="color" :value="textColor" @input="updateTextColor($event.target.value)" />
        </div>
        <div class="mindmap-palette__field mindmap-palette__field--inline">
          <label>Taille (px)</label>
          <input
            type="number"
            min="10"
            max="48"
            :value="fontSize"
            @change="updateFontSize($event.target.value)"
          />
        </div>
      </div>
      <div class="mindmap-palette__field">
        <label>Contenu</label>
        <template v-if="isImageNodeSelected">
          <input
            ref="imageInputRef"
            class="mindmap-palette__file-input"
            type="file"
            accept="image/*"
            @change="handleImageSelection"
          />
          <div class="mindmap-palette__image-actions">
            <button type="button" @click="triggerImageSelection" :disabled="isUploadingImage">
              {{ isUploadingImage ? 'Envoi en coursâ€¦' : 'Choisir une image' }}
            </button>
            <button
              v-if="selectedNode && selectedNode.content"
              type="button"
              class="secondary"
              @click="removeImageFromNode"
              :disabled="isUploadingImage"
            >
              Retirer l'image
            </button>
          </div>
          <p v-if="imageUploadError" class="mindmap-palette__error">{{ imageUploadError }}</p>
          <div v-if="selectedNode && selectedNode.content" class="mindmap-palette__preview">
            <img :src="selectedNode.content" :alt="selectedNode.label" />
            <span class="mindmap-palette__preview-url">{{ selectedNode.content }}</span>
          </div>
          <p class="mindmap-palette__hint">Formats acceptÃ©s: JPG, PNG, GIF, WEBP ou SVG (max. 5 Mo).</p>
        </template>
        <template v-else-if="isFormulaNodeSelected">
          <textarea
            v-model="editableContent"
            rows="5"
            placeholder="Utilise la syntaxe de l'interpréteur (ex: frac(a,b))"
            @change="updateContent"
          ></textarea>
          <div
            v-if="editableContent"
            class="mindmap-palette__formula-preview"
            v-html="formulaPreviewHtml"
          ></div>
          <div class="mindmap-palette__formula-actions">
            <button type="button" @click="openInterpreter">Ouvrir l'interpréteur</button>
            <button
              v-if="editableContent"
              type="button"
              class="secondary"
              @click="clearFormulaContent"
            >
              Effacer
            </button>
          </div>
          <p class="mindmap-palette__hint">
            Ouvre l'interpréteur pour Insérer des symboles (ex:
            <code>frac(a,b)</code>, <code>sqrt(x)</code>,
            <code>&lt;text bold color:red&gt;Important&lt;/text&gt;</code>).
          </p>
        </template>
        <template v-else>
          <textarea
            v-model="editableContent"
            rows="4"
            @change="updateContent"
          ></textarea>
        </template>
      </div>
      <div class="mindmap-palette__field">
        <label>Niveau de maÃ®trise</label>
        <select :value="selectedNode.mastery" @change="updateMastery($event.target.value)">
          <option v-for="level in masteryLevels" :key="level.id" :value="level.id">{{ level.label }}</option>
        </select>
      </div>
      <div class="mindmap-palette__colors">
        <label>Couleur principale</label>
        <input type="color" :value="selectedNode.style?.primaryColor || '#1E3A8A'" @input="updateColor($event.target.value)" />
      </div>
      <div class="mindmap-palette__actions">
        <button @click="toggleCollapse">{{ selectedNode.collapsed ? 'Reafficher' : 'Masquer' }}</button>
        <button class="danger" @click="removeNode">Supprimer</button>
      </div>
    </div>

    <div class="mindmap-palette__section">
      <h4>Zones</h4>
      <div class="mindmap-palette__field">
        <label>Nom</label>
        <input v-model="zoneName" placeholder="Nom de la zone" />
      </div>
      <div class="mindmap-palette__colors">
        <label>Couleur</label>
        <input type="color" v-model="zoneColor" />
      </div>
      <div class="mindmap-palette__actions">
        <button @click="createZone">Creer une zone</button>
      </div>
      <div v-if="zones.length" class="mindmap-palette__zones">
        <span>Assigner a une zone</span>
        <div class="mindmap-palette__zone-list">
          <button
            v-for="zone in zones"
            :key="zone.id"
            :class="['mindmap-palette__zone-chip', { active: selectedNodeZone === zone.id }]"
            @click="assignZone(zone.id)"
          >
            {{ zone.name }}
          </button>
          <button class="mindmap-palette__zone-chip" @click="assignZone(null)">Aucune</button>
        </div>
      </div>
    </div>

    <div class="mindmap-palette__section" v-if="!selectedNode">
      <p>Selectionne un item pour modifier son contenu.</p>
    </div>
  </div>
  <teleport to="body">
    <div v-if="showInterpreter" class="mindmap-interpreter-modal">
      <div class="mindmap-interpreter-modal__backdrop" @click="closeInterpreter"></div>
      <div class="mindmap-interpreter-modal__dialog">
        <div class="mindmap-interpreter-modal__header">
          <h3>interpréteur de formules</h3>
          <button type="button" class="mindmap-interpreter-modal__close" @click="closeInterpreter">
            &times;
          </button>
        </div>
        <Interpreter
          v-model="interpreterValue"
          :show-apply="true"
          apply-label="Insérer dans l'item"
          @apply="applyInterpreter"
        />
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { masteryList } from '@/helpers/mindmap';
import { api } from '@/helpers/api';
import { VITE_API_URL } from '@/config';
import Interpreter from '@/components/interpreter/Interpreter.vue';
import { renderMathMultiline } from '@/components/interpreter/interpreter.js';
import {
  normalizeCreationType,
  getNodeLabel,
  getSubjectActionLabel,
  getChildActionLabel,
} from '@/helpers/mindmapCreation';

const store = useMindMapBuilderStore();

const tools = [
  { id: 'select', label: 'Selection', icon: 'Sel' },
  { id: 'text', label: 'Texte', icon: 'Txt' },
  { id: 'formula', label: 'Formule', icon: 'Fx' },
  { id: 'image', label: 'Image', icon: 'Img' },
  { id: 'link', label: 'Lien', icon: '->' },
  { id: 'zone', label: 'Zone', icon: '[]' },
];

const masteryLevels = masteryList;

const selectedNode = computed(() => store.selectedNode);
const selectedNodeZone = computed(() => selectedNode.value?.zoneId || null);
const zones = computed(() => store.map.zones || []);
const creationType = computed(() => normalizeCreationType(store.tool));
const subjectCreationLabel = computed(() => getSubjectActionLabel(creationType.value));
const childCreationLabel = computed(() => getChildActionLabel(creationType.value));
const creationHint = computed(() => {
  if (selectedNode.value) {
    return `Le prochain element sera relie a \"${selectedNode.value.label}\".`;
  }
  return 'Selectionne un item pour lui ajouter un enfant, sinon un item sera relie au sujet principal.';
});

const editableLabel = ref('');
const editableContent = ref('');
const zoneName = ref('Zone');
const zoneColor = ref('#BFDBFE');
const imageInputRef = ref(null);
const isUploadingImage = ref(false);
const imageUploadError = ref('');
const isImageNodeSelected = computed(() => selectedNode.value?.type === 'image');
const isFormulaNodeSelected = computed(() => selectedNode.value?.type === 'formula');
const isTextNodeSelected = computed(() => selectedNode.value?.type === 'text');
const showInterpreter = ref(false);
const interpreterValue = ref('');
const textColor = ref('#eef2ff');
const fontSize = ref(14);
const isBold = ref(false);
const isItalic = ref(false);
const isUnderline = ref(false);
const formulaPreviewHtml = computed(() =>
  isFormulaNodeSelected.value && editableContent.value
    ? renderMathMultiline(editableContent.value)
    : ''
);

const resolveImageUrl = (payload = {}) => {
  if (!payload) return '';
  if (payload.url) return payload.url;
  if (payload.path) {
    try {
      return new URL(payload.path, VITE_API_URL).toString();
    } catch (error) {
      return payload.path;
    }
  }
  return '';
};

watch(
  selectedNode,
  (node) => {
    editableLabel.value = node?.label || '';
    editableContent.value = node?.content || '';
    imageUploadError.value = '';
    if (imageInputRef.value) {
      imageInputRef.value.value = '';
    }
    textColor.value = node?.style?.textColor || '#eef2ff';
    fontSize.value = Number.parseInt(node?.style?.fontSize, 10) || 14;
    isBold.value = (node?.style?.fontWeight || 'normal') !== 'normal';
    isItalic.value = (node?.style?.fontStyle || 'normal') !== 'normal';
    isUnderline.value = (node?.style?.textDecoration || 'none').includes('underline');
    if (isFormulaNodeSelected.value) {
      interpreterValue.value = node?.content || '';
    } else {
      interpreterValue.value = '';
    }
    showInterpreter.value = false;
  },
  { immediate: true }
);

const activeToolLabel = computed(() => {
  const match = tools.find((tool) => tool.id === store.tool);
  return match ? match.label : 'Selection';
});

const updateLabel = () => {
  if (!selectedNode.value) return;
  store.updateNode(selectedNode.value.id, { label: editableLabel.value });
};

const updateContent = () => {
  if (!selectedNode.value) return;
  store.updateNode(selectedNode.value.id, { content: editableContent.value });
};

const openInterpreter = () => {
  if (!selectedNode.value) return;
  interpreterValue.value = editableContent.value || '';
  showInterpreter.value = true;
};

const closeInterpreter = () => {
  showInterpreter.value = false;
};

const applyInterpreter = (value) => {
  if (!selectedNode.value) return;
  const nextValue =
    typeof value === 'string' ? value : interpreterValue.value ?? editableContent.value ?? '';
  interpreterValue.value = nextValue;
  editableContent.value = nextValue;
  store.updateNode(selectedNode.value.id, { content: nextValue });
  showInterpreter.value = false;
};

const clearFormulaContent = () => {
  if (!selectedNode.value) return;
  editableContent.value = '';
  store.updateNode(selectedNode.value.id, { content: '' });
};

const updateTextColor = (value) => {
  if (!selectedNode.value) return;
  textColor.value = value;
  store.updateNodeStyle(selectedNode.value.id, { textColor: value });
};

const updateFontSize = (value) => {
  if (!selectedNode.value) return;
  const numeric = Number.parseInt(value, 10);
  const safeValue = Number.isFinite(numeric) ? Math.min(48, Math.max(10, numeric)) : 14;
  fontSize.value = safeValue;
  store.updateNodeStyle(selectedNode.value.id, { fontSize: safeValue });
};

const toggleBold = () => {
  if (!selectedNode.value) return;
  const next = isBold.value ? 'normal' : 'bold';
  isBold.value = !isBold.value;
  store.updateNodeStyle(selectedNode.value.id, { fontWeight: next });
};

const toggleItalic = () => {
  if (!selectedNode.value) return;
  const next = isItalic.value ? 'normal' : 'italic';
  isItalic.value = !isItalic.value;
  store.updateNodeStyle(selectedNode.value.id, { fontStyle: next });
};

const toggleUnderline = () => {
  if (!selectedNode.value) return;
  const next = isUnderline.value ? 'none' : 'underline';
  isUnderline.value = !isUnderline.value;
  store.updateNodeStyle(selectedNode.value.id, { textDecoration: next });
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
    imageUploadError.value = "L'image dÃ©passe la taille maximale de 5 Mo.";
    if (event.target) {
      event.target.value = '';
    }
    return;
  }

  const formData = new FormData();
  formData.append('image', file);

  isUploadingImage.value = true;

  try {
    const response = await api.post('diagrammes/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (!response || !response.data) {
      throw new Error('UPLOAD_FAILED');
    }

    const imageUrl = resolveImageUrl(response.data);
    if (!imageUrl) {
      throw new Error('INVALID_IMAGE_URL');
    }

    store.updateNode(selectedNode.value.id, { content: imageUrl });
    editableContent.value = imageUrl;
  } catch (error) {
    console.error("Erreur lors de l'upload de l'image de carte mentale :", error);
    imageUploadError.value =
      "L'image n'a pas pu Ãªtre tÃ©lÃ©chargÃ©e. VÃ©rifie le format et rÃ©essaie.";
  } finally {
    isUploadingImage.value = false;
    if (event?.target) {
      event.target.value = '';
    }
  }
};

const removeImageFromNode = () => {
  if (!selectedNode.value) return;
  store.updateNode(selectedNode.value.id, { content: '' });
  editableContent.value = '';
  imageUploadError.value = '';
};

const updateMastery = (value) => {
  if (!selectedNode.value) return;
  store.updateNode(selectedNode.value.id, { mastery: value });
};

const updateColor = (value) => {
  if (!selectedNode.value) return;
  store.updateNodeStyle(selectedNode.value.id, { primaryColor: value });
};

const createSubjectItem = () => {
  if (!store.map.subjectNodeId) return;
  const type = creationType.value;
  const nodeLabel = getNodeLabel(type);
  const payload = {
    label: nodeLabel,
    type,
    parentId: store.map.subjectNodeId,
  };
  if (type !== 'text') {
    payload.content = '';
  }
  store.addNode(payload);
};

const addChild = () => {
  if (!selectedNode.value) return;
  const type = creationType.value;
  const nodeLabel = getNodeLabel(type);
  const payload = {
    label: nodeLabel,
    type,
    parentId: selectedNode.value.id,
  };
  if (type !== 'text') {
    payload.content = '';
  }
  store.addNode(payload);
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
  const id = store.addZone({ name: zoneName.value.trim() || 'Zone', color: zoneColor.value });
  zoneName.value = 'Zone';
  zoneColor.value = '#BFDBFE';
  return id;
};

const assignZone = (zoneId) => {
  if (!selectedNode.value) return;
  store.assignNodeToZone(selectedNode.value.id, zoneId);
};
</script>

<style scoped>
.mindmap-palette {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #ffffff;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  height: 100%;
}

.mindmap-palette__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #0f172a;
}

.mindmap-palette__tool {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: #dbeafe;
  color: #1d4ed8;
}

.mindmap-palette__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mindmap-palette__buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.mindmap-palette__button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f3f4f6;
  border: none;
  cursor: pointer;
  font-weight: 600;
  color: #1f2937;
  transition: background 0.2s ease, transform 0.2s ease;
}

.mindmap-palette__button:hover {
  background: #e0f2fe;
  transform: translateY(-1px);
}

.mindmap-palette__button--active {
  background: #1d4ed8;
  color: #ffffff;
}

.mindmap-palette__icon {
  font-size: 18px;
}

.mindmap-palette__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mindmap-palette__field label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #475569;
}

.mindmap-palette__field input,
.mindmap-palette__field textarea,
.mindmap-palette__field select {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid #cbd5f5;
  font-size: 14px;
  color: #0f172a;
  background: #f8fafc;
}

.mindmap-palette__file-input {
  display: none;
}

.mindmap-palette__image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
}

.mindmap-palette__image-actions button {
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  background: #38bdf8;
  color: #0f172a;
  transition: background 0.2s ease;
}

.mindmap-palette__image-actions button:hover {
  background: #0ea5e9;
}

.mindmap-palette__image-actions button.secondary {
  background: #e2e8f0;
  color: #0f172a;
}

.mindmap-palette__image-actions button.secondary:hover {
  background: #cbd5f5;
}

.mindmap-palette__image-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mindmap-palette__error {
  margin: 6px 0 0;
  color: #b91c1c;
  font-size: 12px;
}

.mindmap-palette__preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}

.mindmap-palette__preview img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.25);
}

.mindmap-palette__preview-url {
  font-size: 12px;
  word-break: break-all;
  color: #1f2937;
}

.mindmap-palette__formula-preview {
  margin-top: 10px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #cbd5f5;
  background: #ffffff;
  max-height: 180px;
  overflow-y: auto;
}

.mindmap-palette__formula-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.mindmap-palette__formula-actions button {
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  background: #2563eb;
  color: #ffffff;
  transition: background 0.2s ease, transform 0.2s ease;
}

.mindmap-palette__formula-actions button:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.mindmap-palette__formula-actions button.secondary {
  background: #e2e8f0;
  color: #0f172a;
}

.mindmap-palette__formula-actions button.secondary:hover {
  background: #cbd5f5;
}

.mindmap-palette__text-style {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.mindmap-palette__text-toolbar {
  display: flex;
  gap: 8px;
}

.mindmap-palette__text-toolbar button {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #cbd5f5;
  background: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, transform 0.2s ease;
}

.mindmap-palette__text-toolbar button:hover {
  background: #dbeafe;
  transform: translateY(-1px);
}

.mindmap-palette__text-toolbar button.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #1d4ed8;
}

.mindmap-palette__text-icon {
  font-weight: 700;
}

.mindmap-palette__text-icon--italic {
  font-style: italic;
}

.mindmap-palette__text-icon--underline {
  text-decoration: underline;
}

.mindmap-palette__field--inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mindmap-palette__field--inline label {
  margin: 0;
}

.mindmap-palette__field--inline input[type='number'] {
  width: 90px;
}

.mindmap-palette__colors {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mindmap-palette__colors label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #475569;
}

.mindmap-palette__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mindmap-palette__actions button {
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  background: #38bdf8;
  color: #0f172a;
  transition: background 0.2s ease;
}

.mindmap-palette__actions button:hover {
  background: #0ea5e9;
}

.mindmap-palette__actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #94a3b8;
  color: #f1f5f9;
}

.mindmap-palette__actions .danger {
  background: #f87171;
  color: #fff;
}

.mindmap-palette__actions .danger:hover {
  background: #ef4444;
}

.mindmap-palette__zones {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mindmap-palette__zone-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mindmap-palette__zone-chip {
  padding: 6px 12px;
  border-radius: 9999px;
  border: none;
  background: #e2e8f0;
  color: #1f2937;
  cursor: pointer;
  font-weight: 600;
}

.mindmap-palette__zone-chip.active {
  background: #2563eb;
  color: #ffffff;
}

.mindmap-palette__hint {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  line-height: 1.4;

.mindmap-palette__hint code {
  background: #e2e8f0;
  color: #1f2937;
  padding: 2px 6px;
  border-radius: 6px;
  font-family: 'Fira Code', monospace;
}
}

.mindmap-interpreter-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 60px 20px;
  z-index: 2000;
}

.mindmap-interpreter-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
}

.mindmap-interpreter-modal__dialog {
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

.mindmap-interpreter-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: #0f172a;
}

.mindmap-interpreter-modal__close {
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
  color: #0f172a;
  transition: transform 0.2s ease, color 0.2s ease;
}

.mindmap-interpreter-modal__close:hover {
  color: #2563eb;
  transform: scale(1.1);
}
</style>

