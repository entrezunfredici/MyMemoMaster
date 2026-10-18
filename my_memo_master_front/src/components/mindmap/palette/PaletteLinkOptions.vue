<template>
  <section class="palette__section palette__section--selected">
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
</template>

<script setup>
// Options de la branche sélectionnée (type, sens, forme, couleurs, ordre de lecture). Extrait de MindMapPalette.vue.
import { computed, ref } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { LINK_DIRECTIONS, LINK_SHAPES, getOutgoingLinks } from '@/helpers/mindmap/mindmapLinks';

const props = defineProps({
  link: { type: Object, required: true },
});

const store = useMindMapBuilderStore();

const selectedLink = computed(() => props.link);
const branchTypes = computed(() => store.map.branchTypes || []);
const newBranchType = ref('');
const outgoingLinks = computed(() => getOutgoingLinks(store.map.links, selectedLink.value.from));
const outgoingCount = computed(() => outgoingLinks.value.length);
const readingRank = computed(
  () => outgoingLinks.value.findIndex((link) => link.id === selectedLink.value.id) + 1
);

const createBranchType = () => {
  const id = store.addBranchType(newBranchType.value);
  if (!id) return;
  store.updateLink(selectedLink.value.id, { type: id });
  newBranchType.value = '';
};
</script>
