<template>
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
</template>

<script setup>
// Sections « Créer » (type par défaut) et « Mode » (lien / zone). Extrait de MindMapPalette.vue.
import { computed } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { ITEM_KINDS } from '@/helpers/mindmap/mindmapItems';

const store = useMindMapBuilderStore();

const nodeTypes = ITEM_KINDS;
const branchTypes = computed(() => store.map.branchTypes || []);
</script>
