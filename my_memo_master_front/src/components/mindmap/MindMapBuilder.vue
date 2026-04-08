<template>
  <div class="mindmap-builder">
    <header class="mindmap-builder__header">
      <div class="mindmap-builder__title">
        <label for="mindmap-title">Nom de la carte</label>
        <input
          id="mindmap-title"
          type="text"
          :value="currentTitle"
          @input="onTitleInput($event.target.value)"
          placeholder="Nom de la carte mentale"
        />
      </div>
      <div class="mindmap-builder__actions">
        <button class="secondary" @click="handleNew" :disabled="loading">Nouveau</button>
        <button class="secondary" @click="handleExport" :disabled="loading">Exporter</button>
        <button class="primary" @click="handleSave" :disabled="loading">Sauvegarder</button>
      </div>
    </header>

    <div class="mindmap-builder__content">
      <div class="mindmap-builder__board">
        <MindMapBoard />
      </div>
      <div class="mindmap-builder__sidebar">
        <MindMapPalette />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import MindMapBoard from './MindMapBoard.vue';
import MindMapPalette from './MindMapPalette.vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';

const props = defineProps({
  mapPayload: {
    type: [Object, String, null],
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['save', 'export', 'new-map']);

const store = useMindMapBuilderStore();

watch(
  () => props.mapPayload,
  (payload) => {
    if (payload) {
      store.load(payload);
    } else {
      store.new('Nouvelle carte mentale');
    }
  },
  { immediate: true }
);

const currentTitle = computed(() => store.map.title);

const handleSave = () => {
  emit('save', store.exportPayload());
};

const handleExport = () => {
  emit('export', store.exportPayload());
};

const handleNew = () => {
  store.new('Nouvelle carte mentale');
  emit('new-map', store.exportPayload());
};

const onTitleInput = (value) => {
  store.setTitle(value);
};

const getSerializedMap = () => store.exportPayload();

const loadMap = (payload) => {
  store.load(payload);
};

defineExpose({
  getSerializedMap,
  loadMap,
});
</script>

<style scoped>
.mindmap-builder {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.mindmap-builder__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgb(var(--white));
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgb(var(--border-soft));
  box-shadow: 0 8px 24px rgb(var(--text-strong) / 0.08);
}

.mindmap-builder__title {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mindmap-builder__title label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--text-soft));
  font-weight: 600;
}

.mindmap-builder__title input {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgb(var(--border-strong));
  min-width: 280px;
  font-size: 16px;
}

.mindmap-builder__actions {
  display: flex;
  gap: 12px;
}

.mindmap-builder__actions button {
  padding: 10px 18px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.mindmap-builder__actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mindmap-builder__actions .primary {
  background: rgb(var(--info));
  color: rgb(var(--white));
  box-shadow: 0 10px 20px rgb(var(--info) / 0.25);
}

.mindmap-builder__actions .primary:hover:not(:disabled) {
  transform: translateY(-1px);
}

.mindmap-builder__actions .secondary {
  background: rgb(var(--surface-info));
  color: rgb(var(--text-strong));
}

.mindmap-builder__content {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(260px, 1fr);
  gap: 16px;
  min-height: 0;
}

.mindmap-builder__board {
  background: rgb(var(--white));
  border-radius: 20px;
  padding: 16px;
  box-shadow: inset 0 0 0 1px rgb(var(--border-soft));
}

.mindmap-builder__board :deep(.mindmap-board) {
  height: 100%;
}

.mindmap-builder__sidebar {
  height: 100%;
}
</style>



