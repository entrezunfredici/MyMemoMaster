<template>
  <div class="palette__field">
    <label class="palette__label">Image</label>
    <input aria-label="Choisir un fichier image" ref="inputRef" type="file" accept="image/*" class="palette__file-hidden" @change="handleSelection" />
    <div class="palette__actions-row">
      <button class="palette__btn" type="button" @click="trigger" :disabled="isUploading">
        {{ isUploading ? 'Envoi…' : 'Choisir une image' }}
      </button>
      <button v-if="node.content" class="palette__btn palette__btn--ghost" type="button" @click="remove" :disabled="isUploading">
        Retirer
      </button>
    </div>
    <p v-if="error" class="palette__error">{{ error }}</p>
    <div v-if="node.content" class="palette__image-preview">
      <img :src="node.content" :alt="node.label" />
    </div>
  </div>
</template>

<script setup>
// Section « Image » de la palette : choix d'un fichier pour un item de type image.
// Rendue dans `.palette` : ses classes viennent de palette/palette.css.
import { ref, watch } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { uploadMindmapImage } from '@/helpers/mindmap/mindmapImage';

const props = defineProps({
  node: { type: Object, required: true },
});

const store = useMindMapBuilderStore();
const inputRef = ref(null);
const isUploading = ref(false);
const error = ref('');

// Changement d'item : on repart d'un état propre (message d'erreur, fichier choisi).
watch(
  () => props.node.id,
  () => {
    error.value = '';
    if (inputRef.value) inputRef.value.value = '';
  }
);

const trigger = () => {
  error.value = '';
  inputRef.value?.click();
};

const handleSelection = async (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  error.value = '';
  isUploading.value = true;
  try {
    store.updateNode(props.node.id, { content: await uploadMindmapImage(file) });
  } catch (e) {
    error.value = e.code === 'IMAGE_TOO_LARGE' ? "L'image dépasse 5 Mo." : "L'image n'a pas pu être téléchargée.";
  } finally {
    isUploading.value = false;
    if (event?.target) event.target.value = '';
  }
};

const remove = () => {
  store.updateNode(props.node.id, { content: '' });
  error.value = '';
};
</script>
