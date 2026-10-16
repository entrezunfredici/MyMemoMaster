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
      <button
        type="button"
        class="mindmap-builder__menu-toggle"
        aria-label="Actions de la carte"
        aria-haspopup="menu"
        :aria-expanded="actionsOpen"
        data-testid="builder-actions-toggle"
        @click="actionsOpen = !actionsOpen"
      >
        <Bars3Icon class="size-6" />
      </button>
      <div class="mindmap-builder__actions" :class="{ 'is-open': actionsOpen }" role="group" aria-label="Actions">
        <button class="secondary" @click="runAction(handleNew)" :disabled="loading">Nouveau</button>
        <button class="secondary" @click="runAction(handleExport)" :disabled="loading">Exporter</button>
        <button class="primary" @click="runAction(handleSave)" :disabled="loading">Sauvegarder</button>
      </div>
    </header>

    <div class="mindmap-builder__content">
      <div class="mindmap-builder__board">
        <MindMapBoard />
      </div>
      <div
        id="mindmap-tools"
        class="mindmap-builder__sidebar"
        :class="{ 'is-open': toolsOpen }"
        data-testid="builder-tools"
      >
        <MindMapPalette />
      </div>
    </div>

    <button
      type="button"
      class="mindmap-builder__tools-toggle"
      aria-controls="mindmap-tools"
      :aria-expanded="toolsOpen"
      data-testid="builder-tools-toggle"
      @click="toolsOpen = !toolsOpen"
    >
      {{ toolsOpen ? 'Fermer' : 'Outils' }}
    </button>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { Bars3Icon } from '@heroicons/vue/24/outline';
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
  idMindMap: {
    type: [Number, String, null],
    default: null,
  },
});

const emit = defineEmits(['save', 'export', 'new-map']);

const store = useMindMapBuilderStore();

// CHOIX: ne réinitialiser le store que si un payload est fourni
// RAISON: à la création d'une carte, MindmapsPage a déjà initialisé le store
// (mindmapStore.new(nom)) avant de monter ce composant avec mapPayload=null ;
// réinitialiser ici écrasait systématiquement le nom saisi par l'utilisateur.
watch(
  () => props.mapPayload,
  (payload) => {
    if (payload) {
      store.load(payload, props.idMindMap);
    }
  },
  { immediate: true }
);

const currentTitle = computed(() => store.map.title);

// CHOIX: menus (actions, outils) pilotés par deux booléens, l'affichage dépend uniquement du CSS
// RAISON: sur desktop les deux zones restent toujours visibles ; sur mobile (≤ 768px) elles
// deviennent un menu burger et un panneau escamotable — pas de duplication du DOM ni de JS de breakpoint
const actionsOpen = ref(false);
const toolsOpen = ref(false);

/**
 * Exécute une action de la barre puis referme le menu burger.
 *
 * @param {Function} action - Handler à appeler
 * @returns {void}
 */
const runAction = (action) => {
  actionsOpen.value = false;
  action();
};

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
  store.load(payload, props.idMindMap);
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
  border: 1px solid var(--slate-200);
  box-shadow: 0 8px 24px rgb(var(--slate-900-rgb) / 0.08);
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
  color: var(--slate-500);
  font-weight: 600;
}

.mindmap-builder__title input {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--periwinkle-200);
  min-width: 280px;
  font-size: 16px;
}

.mindmap-builder__actions {
  display: flex;
  gap: 12px;
}

.mindmap-builder__menu-toggle,
.mindmap-builder__tools-toggle {
  display: none;
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
  background: var(--blue-600);
  color: rgb(var(--white));
  box-shadow: 0 10px 20px rgb(var(--blue-600-rgb) / 0.25);
}

.mindmap-builder__actions .primary:hover:not(:disabled) {
  transform: translateY(-1px);
}

.mindmap-builder__actions .secondary {
  background: var(--sky-100);
  color: var(--slate-900);
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
  box-shadow: inset 0 0 0 1px var(--slate-200);
}

.mindmap-builder__board :deep(.mindmap-board) {
  height: 100%;
}

.mindmap-builder__sidebar {
  height: 100%;
}

/* Mobile / petit écran : canvas plein cadre, actions en menu burger, palette en panneau du bas */
@media (max-width: 768px) {
  .mindmap-builder {
    gap: 8px;
    position: relative;
  }

  .mindmap-builder__header {
    position: relative;
    padding: 8px 12px;
    border-radius: 12px;
    gap: 8px;
  }

  .mindmap-builder__title {
    flex: 1;
    min-width: 0;
  }

  .mindmap-builder__title label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .mindmap-builder__title input {
    min-width: 0;
    width: 100%;
    padding: 8px 12px;
  }

  .mindmap-builder__menu-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    border-radius: 12px;
    border: 1px solid var(--slate-300);
    background: rgb(var(--white));
    color: var(--slate-800);
    cursor: pointer;
  }

  .mindmap-builder__actions {
    display: none;
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 42;
    flex-direction: column;
    gap: 6px;
    min-width: 200px;
    padding: 8px;
    background: rgb(var(--white));
    border: 1px solid var(--slate-200);
    border-radius: 12px;
    box-shadow: 0 12px 28px rgb(var(--slate-900-rgb) / 0.2);
  }

  .mindmap-builder__actions.is-open {
    display: flex;
  }

  .mindmap-builder__actions button {
    min-height: 44px;
    text-align: left;
  }

  .mindmap-builder__content {
    display: block;
  }

  .mindmap-builder__board {
    height: 100%;
    padding: 4px;
    border-radius: 12px;
  }

  .mindmap-builder__sidebar {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 41;
    height: 55dvh;
    padding: 0 8px calc(8px + env(safe-area-inset-bottom));
    background: rgb(var(--white));
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -8px 24px rgb(var(--slate-900-rgb) / 0.2);
    transform: translateY(100%);
    visibility: hidden;
    transition: transform 0.2s ease, visibility 0.2s;
  }

  .mindmap-builder__sidebar.is-open {
    transform: translateY(0);
    visibility: visible;
  }

  .mindmap-builder__tools-toggle {
    display: inline-flex;
    align-items: center;
    position: fixed;
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom));
    z-index: 43;
    min-height: 48px;
    padding: 0 20px;
    border: none;
    border-radius: 24px;
    background: var(--blue-600);
    color: rgb(var(--white));
    font-weight: 700;
    box-shadow: 0 10px 20px rgb(var(--blue-600-rgb) / 0.35);
    cursor: pointer;
  }
}
</style>
