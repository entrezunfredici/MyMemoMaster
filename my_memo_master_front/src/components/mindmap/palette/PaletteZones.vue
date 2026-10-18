<template>
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
    <!-- Taille des zones : saisie au clavier, en plus de la poignée du plateau (glisser à la souris) -->
    <div v-if="zones.length" class="palette__field" role="group" aria-label="Taille des zones">
      <label class="palette__label">Taille des zones (largeur × hauteur)</label>
      <div v-for="zone in zones" :key="zone.id" class="palette__field palette__field--row">
        <span class="palette__label">{{ zone.name }}</span>
        <input :aria-label="`Largeur de la zone ${zone.name}`" type="number" class="palette__number"
          :min="ZONE_SIZE.minWidth" :max="ZONE_SIZE.max" step="20"
          :value="zone.layout?.width ?? 360" @change="resizeZone(zone, 'width', $event.target.value)" />
        <input :aria-label="`Hauteur de la zone ${zone.name}`" type="number" class="palette__number"
          :min="ZONE_SIZE.minHeight" :max="ZONE_SIZE.max" step="20"
          :value="zone.layout?.height ?? 240" @change="resizeZone(zone, 'height', $event.target.value)" />
      </div>
    </div>
  </section>
</template>

<script setup>
// Création de zones et affectation du nœud sélectionné à une zone. Extrait de MindMapPalette.vue.
import { computed, ref } from 'vue';
import { mindmapColors } from '@/helpers/themeColors';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';

const store = useMindMapBuilderStore();

const selectedNode = computed(() => store.selectedNode);
const selectedNodeZone = computed(() => selectedNode.value?.zoneId || null);
const zones = computed(() => store.map.zones || []);
const zoneName = ref('Zone');
const zoneColor = ref(mindmapColors.zone);

// Bornes de la taille d'une zone (mêmes minimums que la poignée du plateau).
const ZONE_SIZE = { minWidth: 120, minHeight: 80, max: 2000 };

const resizeZone = (zone, dimension, value) => {
  const numeric = Number.parseInt(value, 10);
  const min = dimension === 'width' ? ZONE_SIZE.minWidth : ZONE_SIZE.minHeight;
  const current = zone.layout?.[dimension] ?? (dimension === 'width' ? 360 : 240);
  const next = Number.isFinite(numeric) ? Math.min(ZONE_SIZE.max, Math.max(min, numeric)) : current;
  store.updateZone(zone.id, { layout: { [dimension]: next } });
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
