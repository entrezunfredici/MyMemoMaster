<template>
  <div class="relative" ref="rootRef">

    <!-- Champ avec chips -->
    <div
      class="relative flex flex-wrap gap-1.5 items-center min-h-[42px] pl-2.5 pr-8 py-1.5 border rounded-lg cursor-text transition-all"
      :class="anyOpen ? 'border-purple-400 ring-2 ring-purple-100' : 'border-gray-300 hover:border-gray-400'"
      style="background-color: white !important"
      @click="handleFieldClick"
    >
      <!-- Chips des tags sélectionnés -->
      <span
        v-for="tag in selectedTags"
        :key="tag.tagId"
        class="inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full text-xs font-semibold text-white select-none flex-shrink-0"
        :style="{ backgroundColor: tag.color || DEFAULT_COLOR }"
        @click.stop
      >
        <!-- Pastille couleur (ouvre le sélecteur) -->
        <button
          type="button"
          class="w-3.5 h-3.5 rounded-full border-2 border-white/50 hover:border-white transition flex-shrink-0"
          :style="{ backgroundColor: tag.color || DEFAULT_COLOR }"
          :title="`Changer la couleur de « ${tag.name} »`"
          @click.stop="toggleColorPicker(tag)"
        />
        <span>{{ tag.name }}</span>
        <button
          type="button"
          class="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-white/40 transition leading-none text-[10px] font-bold"
          :aria-label="`Retirer ${tag.name}`"
          @click.stop="removeTag(tag.tagId)"
        >×</button>
      </span>

      <!-- Champ de recherche -->
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        :placeholder="selectedTags.length === 0 ? 'Ajouter des tags…' : ''"
        class="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 py-0.5"
        @click.stop
        @focus="openDropdown"
        @input="openDropdown"
        @keydown.backspace="handleBackspace"
        @keydown.enter.prevent="handleEnter"
        @keydown.escape="closeAll"
        @keydown.down.prevent="moveFocus(1)"
        @keydown.up.prevent="moveFocus(-1)"
      />

      <!-- Flèche (cliquable, tourne quand ouvert) -->
      <button
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 transition-transform focus:outline-none"
        :class="anyOpen ? 'rotate-180' : ''"
        tabindex="-1"
        @click.stop="handleFieldClick"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

    <!-- Dropdown de sélection -->
    <Transition name="pop">
      <div
        v-if="showDropdown && (filteredTags.length || canCreate)"
        class="absolute z-50 left-0 right-0 mt-1 border border-gray-200 rounded-xl shadow-xl py-1 max-h-52 overflow-y-auto"
        style="background-color: white !important"
      >
        <button
          v-for="(tag, i) in filteredTags"
          :key="tag.tagId"
          type="button"
          class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition"
          :class="focusIndex === i ? 'bg-gray-50' : 'hover:bg-gray-50'"
          @mousedown.prevent="selectTag(tag)"
        >
          <span
            class="w-3 h-3 rounded-full flex-shrink-0"
            :style="{ backgroundColor: tag.color || DEFAULT_COLOR }"
          />
          <span class="flex-1 text-gray-800">{{ tag.name }}</span>
          <span v-if="modelValue.includes(tag.tagId)" class="text-purple-500 text-xs font-bold">✓</span>
        </button>

        <div v-if="filteredTags.length && canCreate" class="border-t border-gray-100 my-0.5" />

        <button
          v-if="canCreate"
          type="button"
          class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition"
          :class="focusIndex === filteredTags.length ? 'bg-purple-50' : 'hover:bg-purple-50'"
          :disabled="creating"
          @mousedown.prevent="createAndSelect"
        >
          <span
            class="w-3 h-3 rounded-full flex-shrink-0"
            :style="{ backgroundColor: DEFAULT_COLOR }"
          />
          <span class="text-purple-700 font-medium">
            {{ creating ? 'Création…' : `Créer « ${query.trim()} »` }}
          </span>
        </button>
      </div>
    </Transition>

    <!-- Palette de couleurs -->
    <Transition name="pop">
      <div
        v-if="colorPickerTag"
        class="absolute z-50 left-0 mt-1 border border-gray-200 rounded-xl shadow-xl p-3"
        style="background-color: white !important"
      >
        <p class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Couleur — {{ colorPickerTag.name }}
        </p>
        <div class="grid grid-cols-5 gap-1.5">
          <button
            v-for="color in PALETTE"
            :key="color"
            type="button"
            class="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
            :class="(colorPickerTag.color || DEFAULT_COLOR) === color
              ? 'ring-2 ring-offset-2 ring-gray-500 scale-110'
              : ''"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="applyColor(color)"
          />
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useTagStore } from '@/stores/tags'

const PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#D946EF', '#EC4899', '#64748B'
]

const DEFAULT_COLOR = '#6366F1'

const props = defineProps({
  modelValue: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue'])

const tagStore = useTagStore()
const rootRef = ref(null)
const inputRef = ref(null)

const query = ref('')
const showDropdown = ref(false)
const colorPickerTag = ref(null)
const focusIndex = ref(-1)
const creating = ref(false)

// ── Computed ─────────────────────────────────────────────────────────────────

const anyOpen = computed(() => showDropdown.value || !!colorPickerTag.value)

const selectedTags = computed(() =>
  tagStore.tags.filter((t) => props.modelValue.includes(t.tagId))
)

const filteredTags = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return tagStore.tags
  return tagStore.tags.filter((t) => t.name.toLowerCase().includes(q))
})

const canCreate = computed(() => {
  const q = query.value.trim()
  if (!q) return false
  return !tagStore.tags.some((t) => t.name.toLowerCase() === q.toLowerCase())
})

// ── Actions ───────────────────────────────────────────────────────────────────

function focusInput() {
  inputRef.value?.focus()
}

function handleFieldClick() {
  if (showDropdown.value || colorPickerTag.value) {
    closeAll()
  } else {
    showDropdown.value = true
    inputRef.value?.focus()
  }
}

function openDropdown() {
  showDropdown.value = true
  colorPickerTag.value = null
  focusIndex.value = -1
}

function closeAll() {
  showDropdown.value = false
  colorPickerTag.value = null
  query.value = ''
  focusIndex.value = -1
}

function selectTag(tag) {
  const current = [...props.modelValue]
  const idx = current.indexOf(tag.tagId)
  if (idx === -1) current.push(tag.tagId)
  else current.splice(idx, 1)
  emit('update:modelValue', current)
  query.value = ''
  focusIndex.value = -1
  inputRef.value?.focus()
}

function removeTag(tagId) {
  emit('update:modelValue', props.modelValue.filter((id) => id !== tagId))
}

async function createAndSelect() {
  if (creating.value) return
  const name = query.value.trim()
  if (!name) return
  creating.value = true
  const newTag = await tagStore.createTag(name, DEFAULT_COLOR)
  if (newTag) {
    emit('update:modelValue', [...props.modelValue, newTag.tagId])
    query.value = ''
  }
  creating.value = false
  inputRef.value?.focus()
}

function handleBackspace() {
  if (query.value === '' && props.modelValue.length) {
    const lastId = props.modelValue[props.modelValue.length - 1]
    emit('update:modelValue', props.modelValue.filter((id) => id !== lastId))
  }
}

function handleEnter() {
  if (focusIndex.value >= 0 && focusIndex.value < filteredTags.value.length) {
    selectTag(filteredTags.value[focusIndex.value])
  } else if (focusIndex.value === filteredTags.value.length && canCreate.value) {
    createAndSelect()
  } else if (filteredTags.value.length === 1) {
    selectTag(filteredTags.value[0])
  } else if (canCreate.value) {
    createAndSelect()
  }
}

function moveFocus(dir) {
  const max = filteredTags.value.length - 1 + (canCreate.value ? 1 : 0)
  if (max < 0) return
  focusIndex.value = Math.max(-1, Math.min(max, focusIndex.value + dir))
}

function toggleColorPicker(tag) {
  if (colorPickerTag.value?.tagId === tag.tagId) {
    colorPickerTag.value = null
  } else {
    colorPickerTag.value = tag
    showDropdown.value = false
    query.value = ''
  }
}

function applyColor(color) {
  if (!colorPickerTag.value) return
  const tagId = colorPickerTag.value.tagId
  colorPickerTag.value = null
  tagStore.updateTagColor(tagId, color)
}

function handleOutside(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    closeAll()
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  if (tagStore.tags.length === 0) await tagStore.fetchTags()
  document.addEventListener('mousedown', handleOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutside)
})
</script>

<style scoped>
.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
