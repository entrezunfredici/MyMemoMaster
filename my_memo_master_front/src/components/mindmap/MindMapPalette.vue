<template>
  <div class="palette">
    <PaletteCreate />

    <!-- Item sélectionné, sinon branche sélectionnée, sinon aide -->
    <PaletteNodeOptions v-if="selectedNode" :node="selectedNode" />
    <PaletteLinkOptions v-else-if="selectedLink" :link="selectedLink" />
    <section class="palette__section palette__section--empty" v-else>
      <p class="palette__hint">Sélectionnez un item ou une branche pour modifier ses options.</p>
    </section>

    <PaletteZones />
  </div>
</template>

<script setup>
// Palette d'options de l'éditeur de cartes mentales : assemble les sections (création, options du nœud
// ou de la branche sélectionné, zones).
import './palette/palette.css';
import { computed } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import PaletteCreate from './palette/PaletteCreate.vue';
import PaletteNodeOptions from './palette/PaletteNodeOptions.vue';
import PaletteLinkOptions from './palette/PaletteLinkOptions.vue';
import PaletteZones from './palette/PaletteZones.vue';

const store = useMindMapBuilderStore();

const selectedNode = computed(() => store.selectedNode);
const selectedLink = computed(() => store.selectedLink || null);
</script>
