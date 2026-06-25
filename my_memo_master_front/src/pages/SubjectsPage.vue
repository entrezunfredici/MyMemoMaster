<template>
  <div class="container mx-auto px-4 py-8">

    <!-- En-tête -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-heading mb-1">Mes contenus par sujet</h1>
      <p class="text-sm text-gray-500">Retrouvez toutes vos cartes mentales, flashcards et exercices organisés par matière.</p>
    </div>

    <!-- Barre de recherche -->
    <div class="relative mb-8 max-w-2xl">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Rechercher dans tous les contenus…"
        class="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <span class="absolute left-3 top-3.5 text-gray-400">🔍</span>
      <button
        v-if="searchQuery"
        @click="searchQuery = ''"
        class="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-lg leading-none"
      >×</button>
    </div>

    <!-- Chargement -->
    <div v-if="searchStore.loading" class="text-center text-gray-400 py-12">
      Chargement des contenus…
    </div>

    <template v-else>

      <!-- Compteur résultats -->
      <p class="text-sm text-gray-500 mb-4">
        <template v-if="searchQuery">
          <strong>{{ totalResults }}</strong> résultat{{ totalResults !== 1 ? 's' : '' }}
          pour « {{ searchQuery }} »
        </template>
        <template v-else>
          <strong>{{ visibleGroups.length }}</strong> sujet{{ visibleGroups.length !== 1 ? 's' : '' }}
        </template>
      </p>

      <!-- Aucun résultat -->
      <p v-if="visibleGroups.length === 0" class="text-center text-gray-400 py-12">
        Aucun contenu trouvé{{ searchQuery ? ` pour « ${searchQuery} »` : '' }}.
      </p>

      <!-- Groupes par sujet -->
      <div class="space-y-3">
        <div
          v-for="group in visibleGroups"
          :key="group.subjectId ?? 'sans-sujet'"
          class="border border-gray-200 rounded-xl overflow-hidden shadow-xs"
        >
          <!-- En-tête accordéon -->
          <button
            class="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
            @click="toggle(group.subjectId)"
          >
            <div class="flex items-center gap-3">
              <span
                class="w-3 h-3 rounded-full flex-shrink-0"
                :class="group.subjectId ? 'bg-primary' : 'bg-gray-300'"
              />
              <span class="font-semibold text-heading text-base">{{ group.subjectName }}</span>
              <span class="text-xs text-gray-400 font-normal">
                {{ group.total }} contenu{{ group.total !== 1 ? 's' : '' }}
              </span>
            </div>
            <svg
              class="w-4 h-4 text-gray-400 transition-transform flex-shrink-0"
              :class="isExpanded(group.subjectId) ? 'rotate-180' : ''"
              fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Contenu accordéon -->
          <Transition name="slide">
            <div v-if="isExpanded(group.subjectId)" class="border-t border-gray-100 divide-y divide-gray-50">

              <!-- Mind Maps -->
              <ContentSection
                v-if="group.mindMaps.length"
                label="Cartes mentales"
                icon="🗺️"
                :items="group.mindMaps"
                :get-title="m => m.mmName"
                :get-tags="m => m.tags"
                :on-click="() => router.push({ name: 'mindmaps' })"
              />

              <!-- Flashcards -->
              <ContentSection
                v-if="group.leitnerSystems.length"
                label="Flashcards"
                icon="🃏"
                :items="group.leitnerSystems"
                :get-title="s => s.name"
                :get-tags="s => s.tags"
                :on-click="s => router.push({ name: 'flashcards.cards', params: { systemId: s.idSystem } })"
              />

              <!-- Exercices -->
              <ContentSection
                v-if="group.tests.length"
                label="Exercices"
                icon="📝"
                :items="group.tests"
                :get-title="t => t.name"
                :get-tags="t => t.tags"
                :on-click="t => router.push({ name: 'exercise-detail', params: { id: t.testId } })"
              />

              <!-- Sujet vide -->
              <p
                v-if="group.total === 0"
                class="px-5 py-4 text-sm text-gray-400 italic"
              >
                Aucun contenu associé à ce sujet.
              </p>

            </div>
          </Transition>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, defineComponent, h } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/search'
import { useSubjectStore } from '@/stores/subjects'

const router = useRouter()
const searchStore = useSearchStore()
const subjectStore = useSubjectStore()

const searchQuery = ref('')
const expanded = ref({})

// ── Debounce recherche ────────────────────────────────────────────────────────
let debounceTimer = null
watch(searchQuery, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    searchStore.searchAll({ q: val.trim() || null })
  }, 300)
})

// ── Regroupement par sujet ────────────────────────────────────────────────────
const groupedResults = computed(() => {
  const { mindMaps, leitnerSystems, tests } = searchStore.results
  const map = {}

  // Initialise tous les sujets connus (même ceux sans contenu)
  for (const s of subjectStore.subjects) {
    map[s.subjectId] = { subjectId: s.subjectId, subjectName: s.name, mindMaps: [], leitnerSystems: [], tests: [] }
  }

  for (const m of mindMaps) {
    const key = m.subjectId ?? 'null'
    if (!map[key]) map[key] = { subjectId: m.subjectId, subjectName: m.subject?.name || 'Sans sujet', mindMaps: [], leitnerSystems: [], tests: [] }
    map[key].mindMaps.push(m)
  }
  for (const s of leitnerSystems) {
    const key = s.subjectId ?? 'null'
    if (!map[key]) map[key] = { subjectId: s.subjectId, subjectName: s.subject?.name || 'Sans sujet', mindMaps: [], leitnerSystems: [], tests: [] }
    map[key].leitnerSystems.push(s)
  }
  for (const t of tests) {
    const key = t.subjectId ?? 'null'
    if (!map[key]) map[key] = { subjectId: t.subjectId, subjectName: t.subject?.name || 'Sans sujet', mindMaps: [], leitnerSystems: [], tests: [] }
    map[key].tests.push(t)
  }

  return Object.values(map)
    .map(g => ({ ...g, total: g.mindMaps.length + g.leitnerSystems.length + g.tests.length }))
    .sort((a, b) => {
      if (a.subjectId === null || a.subjectId === undefined) return 1
      if (b.subjectId === null || b.subjectId === undefined) return -1
      return a.subjectName.localeCompare(b.subjectName)
    })
})

// Quand la recherche est active : masque les sujets sans résultat
const visibleGroups = computed(() =>
  searchQuery.value.trim()
    ? groupedResults.value.filter(g => g.total > 0)
    : groupedResults.value
)

const totalResults = computed(() =>
  visibleGroups.value.reduce((acc, g) => acc + g.total, 0)
)

// ── Accordéon ─────────────────────────────────────────────────────────────────
function toggle(subjectId) {
  const key = subjectId ?? 'null'
  expanded.value = { ...expanded.value, [key]: !expanded.value[key] }
}

function isExpanded(subjectId) {
  return !!expanded.value[subjectId ?? 'null']
}

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([subjectStore.fetchSubjects(), searchStore.searchAll()])
  // Déplie automatiquement les sujets qui ont du contenu
  const initial = {}
  for (const g of groupedResults.value) {
    if (g.total > 0) initial[g.subjectId ?? 'null'] = true
  }
  expanded.value = initial
})

// ── Composant interne — ligne de contenu ──────────────────────────────────────
const ContentSection = defineComponent({
  props: {
    label: String,
    icon: String,
    items: Array,
    getTitle: Function,
    getTags: Function,
    onClick: Function
  },
  setup(props) {
    return () => h('div', { class: 'px-5 py-3' }, [
      h('p', { class: 'text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2' },
        `${props.icon} ${props.label}`),
      h('ul', { class: 'space-y-1' },
        props.items.map(item =>
          h('li', {
            key: props.getTitle(item),
            class: 'flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group',
            onClick: () => props.onClick(item)
          }, [
            h('span', { class: 'text-sm text-gray-800 font-medium group-hover:text-primary transition-colors truncate' },
              props.getTitle(item)),
            h('div', { class: 'flex gap-1 flex-shrink-0' },
              (props.getTags(item) || []).slice(0, 3).map(tag =>
                h('span', {
                  key: tag.tagId,
                  class: 'px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-white',
                  style: { backgroundColor: tag.color || '#6366F1' }
                }, tag.name)
              )
            )
          ])
        )
      )
    ])
  }
})
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.15s ease, max-height 0.2s ease;
  overflow: hidden;
  max-height: 1000px;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
