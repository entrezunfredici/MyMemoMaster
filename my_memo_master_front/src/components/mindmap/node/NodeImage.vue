<template>
  <div
    class="mindmap-node__image"
    :class="{ 'mindmap-node__image--drag': isDragOver }"
    @dragover.prevent.stop="isDragOver = true"
    @dragleave.stop="isDragOver = false"
    @drop.prevent.stop="handleImageDrop"
  >
    <img v-if="imageSrc" :src="imageSrc" :alt="node.label" @load="handleImageLoad" />
    <span v-else class="mindmap-node__image-placeholder">
      {{ isDragOver ? 'Déposer ici' : 'Glissez une image ici' }}
    </span>
  </div>
</template>

<script setup>
// Image d'un item de carte : dépôt d'un fichier et redimensionnement selon les proportions de l'image.
// Extrait de MindMapNode.vue.
import { computed, ref } from 'vue';
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder';
import { MAX_IMAGE_SIZE, uploadMindmapImage } from '@/helpers/mindmap/mindmapImage';
import { notif } from '@/helpers/notif';

const props = defineProps({
  node: { type: Object, required: true },
  // Dimensions actuelles de l'item (le redimensionnement automatique les compare aux proportions voulues).
  width: { type: Number, required: true },
  height: { type: Number, required: true },
});

const store = useMindMapBuilderStore();

const imageSrc = computed(() => props.node.content || '');
const isDragOver = ref(false);

const handleImageLoad = (event) => {
  const img = event.target;
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  if (!naturalW || !naturalH) return;

  const TITLE_H = 30;
  const targetW = Math.max(180, Math.min(400, props.width));
  const imgAreaW = targetW - 24;
  const imgH = Math.round(imgAreaW * naturalH / naturalW);
  const targetH = Math.max(120, TITLE_H + imgH + 20);

  if (Math.abs(targetH - props.height) > 2 || Math.abs(targetW - props.width) > 2) {
    store.updateNodeStyle(props.node.id, { width: targetW, height: targetH });
  }
};

const handleImageDrop = async (event) => {
  isDragOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    notif.notify("Ce fichier n'est pas une image.", 'error');
    return;
  }
  try {
    store.updateNode(props.node.id, { content: await uploadMindmapImage(file) });
  } catch (error) {
    if (error.code === 'IMAGE_TOO_LARGE') {
      notif.notify(`L'image est trop lourde (${MAX_IMAGE_SIZE / (1024 * 1024)} Mo maximum).`, 'error');
      return;
    }
    notif.notify("L'image n'a pas pu être téléchargée.", 'error');
  }
};
</script>
