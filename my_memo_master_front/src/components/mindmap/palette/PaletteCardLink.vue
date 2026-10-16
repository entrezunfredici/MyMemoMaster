<template>
  <div class="palette__field">
    <label class="palette__label">Flashcard liée</label>

    <!-- Carte actuellement liée -->
    <div v-if="node.idCard" class="palette__card-linked">
      <span
        class="palette__card-dot"
        :style="{ background: linkedCardColor || mindmapColors.secondary }"
      />
      <span class="palette__card-statement">{{ linkedCardStatement }}</span>
      <button class="palette__card-unlink" title="Délier" @click="unlinkCard">✕</button>
    </div>

    <!-- Bouton ouvrir le picker -->
    <button class="palette__btn palette__btn--ghost palette__btn--sm" @click="openCardPicker">
      {{ node.idCard ? 'Changer' : 'Lier une flashcard' }}
    </button>

    <!-- Picker inline -->
    <div v-if="showCardPicker" class="palette__card-picker">
      <select aria-label="Système de Leitner source"
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

      <select aria-label="Carte à lier"
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
</template>

<script setup>
// Section « Flashcard liée » de la palette : lien d'un item de carte mentale à une carte Leitner.
// Rendue dans `.palette` : ses classes viennent de palette/palette.css.
import { computed, ref, watch } from 'vue';
import { mindmapColors } from '@/helpers/themeColors';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { boxColorToHex, boxLevelToMastery } from '@/helpers/mindmap/mindmap';
import { mindmapApi } from '@/helpers/mindmap/mindmapApi';
import { notif } from '@/helpers/notif';

const props = defineProps({
  node: { type: Object, required: true },
});

const store = useMindMapBuilderStore();

const showCardPicker = ref(false);
const pickerSystems = ref([]);
const pickerSystemId = ref(null);
const pickerCards = ref([]);
const pickerCardId = ref(null);
const pickerLoading = ref(false);

const linkedCard = computed(() =>
  props.node.idCard ? pickerCards.value.find((c) => c.idCard === props.node.idCard) : null
);

const linkedCardStatement = computed(() => {
  if (!props.node.idCard) return null;
  return linkedCard.value?.question?.statement || `Carte #${props.node.idCard}`;
});

const linkedCardColor = computed(() =>
  linkedCard.value?.leitnerBox ? boxColorToHex(linkedCard.value.leitnerBox.color) : null
);

const openCardPicker = async () => {
  showCardPicker.value = true;
  pickerLoading.value = true;
  pickerSystems.value = [];
  pickerCards.value = [];
  pickerSystemId.value = null;
  pickerCardId.value = null;
  try {
    const res = await mindmapApi.listLeitnerSystems();
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
    const res = await mindmapApi.listSystemCards(systemId);
    pickerCards.value = res?.data || [];
  } catch {
    notif.notify('Impossible de charger les cartes de ce système.', 'error');
  } finally {
    pickerLoading.value = false;
  }
};

const confirmLinkCard = () => {
  if (!pickerCardId.value || !pickerSystemId.value) return;
  store.linkCard(props.node.id, Number(pickerCardId.value), Number(pickerSystemId.value));
  const card = pickerCards.value.find((c) => c.idCard === Number(pickerCardId.value));
  if (card?.leitnerBox) {
    store.updateNode(props.node.id, { mastery: boxLevelToMastery(card.leitnerBox.level) });
    store.updateNodeStyle(props.node.id, { secondaryColor: boxColorToHex(card.leitnerBox.color) });
  }
  showCardPicker.value = false;
};

const unlinkCard = () => {
  store.unlinkCard(props.node.id);
  showCardPicker.value = false;
};

// À chaque changement d'item : ferme le sélecteur et charge les cartes du système déjà lié
// (pour afficher l'énoncé et la couleur de la carte liée).
watch(
  () => props.node,
  (node) => {
    showCardPicker.value = false;
    if (node?.idSystem && node?.idCard) {
      mindmapApi.listSystemCards(node.idSystem).then((res) => {
        if (res?.data) pickerCards.value = res.data;
      });
    } else {
      pickerCards.value = [];
    }
  },
  { immediate: true }
);
</script>
