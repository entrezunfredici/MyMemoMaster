<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { mindmapApi } from '@/helpers/mindmap/mindmapApi'
import { useMindMapBuilderStore } from '@/stores/mindmapBuilder'
import MindMapBoard from '@/components/mindmap/MindMapBoard.vue'

// Page PUBLIQUE (pas de meta.private) : un visiteur sans compte ouvre le lien de partage d'une carte.
// Lecture seule : le plateau n'expose ni édition, ni déplacement, ni création d'élément.
const route = useRoute()
const store = useMindMapBuilderStore()

const status = ref('loading') // 'loading' | 'ready' | 'invalid'
const title = ref('')

const parsePayload = (raw) => (typeof raw === 'string' ? JSON.parse(raw) : raw)

onMounted(async () => {
  try {
    const response = await mindmapApi.getShared(String(route.params.token || ''))
    if (response?.status !== 200 || !response.data?.mindMapJson) {
      status.value = 'invalid'
      return
    }
    title.value = response.data.mmName || 'Carte mentale'
    // syncCards: false — un visiteur n'a pas de compte, les couleurs de boîte Leitner ne le concernent pas
    store.load(parsePayload(response.data.mindMapJson), null, { syncCards: false })
    status.value = 'ready'
  } catch {
    status.value = 'invalid'
  }
})

// La carte partagée ne doit pas rester dans le store si le visiteur se connecte ensuite.
onBeforeUnmount(() => store.new(''))
</script>

<template>
  <main class="shared-mindmap">
    <p v-if="status === 'loading'" class="shared-mindmap__message" role="status">Chargement de la carte…</p>

    <div v-else-if="status === 'invalid'" class="shared-mindmap__message" role="alert">
      <h1 class="text-2xl font-semibold mb-2">Carte introuvable</h1>
      <p>Ce lien de partage est invalide ou a été désactivé par son auteur.</p>
    </div>

    <template v-else>
      <header class="shared-mindmap__header">
        <h1 class="text-2xl font-semibold" data-testid="shared-mindmap-title">{{ title }}</h1>
        <p class="shared-mindmap__badge">Carte partagée · lecture seule</p>
      </header>
      <div class="shared-mindmap__board">
        <MindMapBoard readonly />
      </div>
    </template>
  </main>
</template>

<style scoped>
.shared-mindmap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.shared-mindmap__message {
  margin: auto;
  text-align: center;
  color: var(--slate-900);
}

.shared-mindmap__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}

.shared-mindmap__badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--blue-50);
  color: var(--blue-600);
}

/* CHOIX: hauteur explicite (et non flex: 1) : MindMapBoard (height: 100 %) et son SVG se calent
   sur la hauteur de ce bloc ; avec flex: 1 dans un parent sans hauteur définie, le SVG retombait
   sur sa hauteur par défaut (~150 px). 320 px = titre de la page + en-tête de la carte. */
.shared-mindmap__board {
  flex: none;
  height: max(420px, calc(100vh - 320px));
}
</style>
