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

    <div class="mindmap-palette__section" v-if="selectedNode">
      <h4>Item selectionne</h4>
      <div class="mindmap-palette__field">
        <label>Titre</label>
        <input v-model="editableLabel" @change="updateLabel" />
      </div>
      <div class="mindmap-palette__field">
        <label>Contenu</label>
        <textarea v-model="editableContent" rows="4" @change="updateContent"></textarea>
      </div>
      <div class="mindmap-palette__field">
        <label>Niveau de maîtrise</label>
        <select :value="selectedNode.mastery" @change="updateMastery($event.target.value)">
          <option v-for="level in masteryLevels" :key="level.id" :value="level.id">{{ level.label }}</option>
        </select>
      </div>
      <div class="mindmap-palette__colors">
        <label>Couleur principale</label>
        <input type="color" :value="selectedNode.style?.primaryColor || '#1E3A8A'" @input="updateColor($event.target.value)" />
      </div>
      <div class="mindmap-palette__actions">
        <button @click="addChild">Ajouter un item enfant</button>
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
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { masteryList } from '@/helpers/mindmap';

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

const editableLabel = ref('');
const editableContent = ref('');
const zoneName = ref('Zone');
const zoneColor = ref('#BFDBFE');

watch(
  selectedNode,
  (node) => {
    editableLabel.value = node?.label || '';
    editableContent.value = node?.content || '';
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

const updateMastery = (value) => {
  if (!selectedNode.value) return;
  store.updateNode(selectedNode.value.id, { mastery: value });
};

const updateColor = (value) => {
  if (!selectedNode.value) return;
  store.updateNodeStyle(selectedNode.value.id, { primaryColor: value });
};

const addChild = () => {
  if (!selectedNode.value) return;
  store.addNode({ label: 'Nouvel item', parentId: selectedNode.value.id });
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
</style>

