<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="interpreter">
    <!-- Zone rendue : éditeur principal (MathLive). Flèches = navigation entre
         éléments et cellules de matrices, Tab = placeholder suivant. -->
    <div>
      <h2 class="interpreter__heading">Formule</h2>
      <math-field
        ref="mathfieldRef"
        class="interpreter__mathfield"
        math-virtual-keyboard-policy="manual"
        aria-label="Éditeur de formule — utilisez les flèches pour naviguer entre les éléments"
      ></math-field>
      <p v-if="!mathliveReady" class="interpreter__hint">
        Éditeur visuel indisponible — la zone brute ci-dessous reste utilisable.
      </p>
    </div>

    <!-- Palette à sections (diagrams/interpreteur_palette_v2.md §4) -->
    <div class="interpreter__palette-v2">
      <div class="interpreter__tabs" role="tablist" aria-label="Sections de symboles">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :id="`interp-tab-${tab.key}`"
          role="tab"
          type="button"
          :aria-selected="activeTab === tab.key"
          :aria-controls="`interp-panel-${tab.key}`"
          :tabindex="activeTab === tab.key ? 0 : -1"
          :class="['interpreter__tab', { 'interpreter__tab--active': activeTab === tab.key }]"
          @click="activeTab = tab.key"
          @keydown.left.prevent="focusTab(-1)"
          @keydown.right.prevent="focusTab(1)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div
        v-for="tab in tabs"
        v-show="activeTab === tab.key"
        :key="tab.key"
        :id="`interp-panel-${tab.key}`"
        role="tabpanel"
        :aria-labelledby="`interp-tab-${tab.key}`"
        class="interpreter__panel"
      >
        <div v-for="group in tab.groups" :key="group.name" class="interpreter__group">
          <p class="interpreter__group-name">{{ group.name }}</p>
          <div class="interpreter__grid">
            <button
              v-for="item in group.items"
              :key="item.aria"
              type="button"
              :aria-label="item.aria"
              :title="item.aria"
              class="interpreter__symbol"
              @click="insertItem(item)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </div>
      <p v-if="matrixHint" class="interpreter__hint interpreter__hint--matrix" aria-live="polite">
        {{ matrixHint }}
      </p>
    </div>

    <!-- Zone brute : mode expert (LaTeX ou raccourcis historiques over/sqrt/^) -->
    <div>
      <h2 class="interpreter__heading">Zone brute (mode expert)</h2>
      <textarea aria-label="Saisir ou coller votre contenu mathématique"
        ref="textareaRef"
        v-model="userInput"
        rows="3"
        class="interpreter__textarea"
        placeholder="LaTeX ou raccourcis : over(1, 2), sqrt(x), x^2…"
      ></textarea>
    </div>

    <h3 class="interpreter__heading">Résultat</h3>
    <div
      class="interpreter__preview"
      :style="{
        ...(props.bgColor ? { background: props.bgColor, borderColor: props.bgColor } : {}),
        ...(props.textColor ? { color: props.textColor } : {}),
      }"
      v-html="renderedContent"
    />
    <div v-if="unitsError" class="interpreter__units-error">
      {{ unitsError }}
    </div>
    <p class="interpreter__hint">
      Vérification d'homogénéité : déclarez l'unité d'une variable avec <code>P[Pa] = F[N] / S[m^2]</code> —
      sans déclaration, les formules symboliques ne sont pas jugées.
    </p>
    <div v-if="props.showApply" class="interpreter__actions">
      <button type="button" @click="apply">{{ props.applyLabel }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { renderMathMultiline, toLatex, addMatrixColumn, addMatrixRow } from './interpreter.js'
import { checkUnitHomogeneity } from './units.js'
import { PALETTE_TABS } from './palette.js'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  showApply: {
    type: Boolean,
    default: false,
  },
  applyLabel: {
    type: String,
    default: 'Appliquer',
  },
  bgColor: {
    type: String,
    default: '',
  },
  textColor: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'apply'])

const tabs = PALETTE_TABS
const activeTab = ref('carac')

/* --- État & rendu --- */
const userInput = ref(props.modelValue || '')
const textareaRef = ref(null)
const mathfieldRef = ref(null)
const mathliveReady = ref(false)
// Message temporaire affiché quand une commande de matrice (+1C…+3L) n'a pas
// pu s'appliquer — voir insertItem pour la garde qui protège ces commandes.
const matrixHint = ref('')
let matrixHintTimer = null

watch(
  () => props.modelValue,
  (value) => {
    const nextValue = value ?? ''
    if (nextValue !== userInput.value) {
      userInput.value = nextValue
    }
  }
)

watch(userInput, (value) => {
  emit('update:modelValue', value)
  syncMathfieldFromRaw(value)
})

// Le chargement est différé (l'éditeur n'est monté que dans la modale/palette) et
// toléré en échec : sans MathLive (jsdom des tests, vieux navigateur), la zone
// brute + l'aperçu KaTeX restent pleinement fonctionnels.
onMounted(async () => {
  try {
    const { MathfieldElement } = await import('mathlive')
    await import('mathlive/fonts.css')
    MathfieldElement.soundsDirectory = null
    MathfieldElement.fontsDirectory = null
    const mf = mathfieldRef.value
    if (!mf || typeof mf.getValue !== 'function') return
    mf.addEventListener('input', () => {
      // L'édition WYSIWYG fait foi : la zone brute suit en LaTeX (aller simple
      // documenté — on ne reconvertit pas vers les raccourcis historiques)
      const latex = mf.getValue('latex')
      if (latex !== userInput.value && toLatex(userInput.value) !== latex) {
        userInput.value = latex
      }
    })
    mathliveReady.value = true
    syncMathfieldFromRaw(userInput.value)
  } catch {
    mathliveReady.value = false
  }
})

const syncMathfieldFromRaw = (value) => {
  const mf = mathfieldRef.value
  if (!mathliveReady.value || !mf) return
  const latex = toLatex(value ?? '')
  if (mf.getValue('latex') !== latex) {
    mf.setValue(latex, { silenceNotifications: true })
  }
}

// Le vérificateur convertit le LaTeX de l'éditeur en syntaxe plate (latexToPlain)
// et s'abstient sur ce qu'il ne sait pas juger (variables sans annotation Var[unité])
const unitsError = computed(() => checkUnitHomogeneity(userInput.value))
const renderedContent = computed(() => renderMathMultiline(userInput.value))

const MATRIX_TRANSFORMS = { addColumnAfter: addMatrixColumn, addRowAfter: addMatrixRow }

const showMatrixHint = (message) => {
  matrixHint.value = message
  clearTimeout(matrixHintTimer)
  matrixHintTimer = setTimeout(() => { matrixHint.value = '' }, 5000)
}

/* --- Insertion depuis la palette --- */
const insertItem = (item) => {
  const mf = mathfieldRef.value
  if (item.command) {
    const transform = MATRIX_TRANSFORMS[item.command]
    let latex = mathliveReady.value && mf ? mf.getValue('latex') : toLatex(userInput.value)
    let ok = true
    for (let i = 0; i < (item.repeat || 1); i++) {
      const next = transform(latex)
      if (next === null) { ok = false; break }
      latex = next
    }
    if (ok) {
      userInput.value = latex
      matrixHint.value = ''
    } else {
      showMatrixHint('Cette commande ne s’applique que si la formule est entièrement une matrice (ou un système de cas).')
    }
    if (mathliveReady.value && mf) mf.focus()
    return
  }
  if (mathliveReady.value && mf) {
    mf.insert(item.latex, { focus: true })
    userInput.value = mf.getValue('latex')
    return
  }
  insertInTextarea(item.latex.replace(/\\placeholder\{\}/g, ''))
}

// Repli sans MathLive : insertion à la position du curseur de la zone brute
const insertInTextarea = (token) => {
  const textarea = textareaRef.value
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const current = userInput.value
  userInput.value = `${current.slice(0, start)}${token}${current.slice(end)}`
  nextTick(() => {
    textarea.focus()
    const cursor = start + token.length
    textarea.setSelectionRange(cursor, cursor)
  })
}

const focusTab = (delta) => {
  const index = tabs.findIndex((t) => t.key === activeTab.value)
  const next = tabs[(index + delta + tabs.length) % tabs.length]
  activeTab.value = next.key
  nextTick(() => document.getElementById(`interp-tab-${next.key}`)?.focus())
}

const apply = () => {
  emit('apply', userInput.value)
}
</script>

<style scoped>
.interpreter {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #ffffff;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.interpreter__heading {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.interpreter__mathfield {
  display: block;
  width: 100%;
  min-height: 64px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #cbd5f5;
  background: #f9fafb;
  font-size: 20px;
}
.interpreter__mathfield:focus-within {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
}
/* La palette à onglets remplace le clavier virtuel et le menu MathLive */
.interpreter__mathfield::part(virtual-keyboard-toggle),
.interpreter__mathfield::part(menu-toggle) {
  display: none;
}

.interpreter__palette-v2 {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  overflow: hidden;
}

.interpreter__tabs {
  display: flex;
  gap: 2px;
  padding: 8px 8px 0;
  border-bottom: 1px solid #e2e8f0;
  background: #f1f5f9;
}

.interpreter__tab {
  padding: 8px 16px;
  border: none;
  border-radius: 10px 10px 0 0;
  background: transparent;
  color: #475569;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
.interpreter__tab--active {
  background: #f8fafc;
  color: #1d4ed8;
  box-shadow: inset 0 2px 0 #2563eb;
}
.interpreter__tab:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}

.interpreter__panel {
  padding: 12px 16px 16px;
  max-height: 260px;
  overflow-y: auto;
}

.interpreter__group + .interpreter__group {
  margin-top: 12px;
}

.interpreter__group-name {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.interpreter__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.interpreter__symbol {
  min-width: 42px;
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid #cbd5f5;
  background: #ffffff;
  color: #1d4ed8;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}
.interpreter__symbol:hover:not(:disabled) { background: #dbeafe; }
.interpreter__symbol:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
}
.interpreter__symbol:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.interpreter__textarea {
  width: 100%; min-height: 72px; padding: 12px; border-radius: 12px; border: 1px solid #cbd5f5;
  font-size: 14px; font-family: 'Fira Code', monospace; background: #f9fafb; color: #0f172a;
}

.interpreter__preview {
  min-height: 80px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;
  background: #ffffff; font-size: 16px; color: #0f172a;
}

.interpreter__units-error {
  margin-bottom: 8px;
  padding: 8px 12px;
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #b91c1c;
  border-radius: 8px;
  font-weight: 600;
}

.interpreter__hint {
  margin-bottom: 8px;
  font-size: 12px;
  color: #64748b;
}

.interpreter__hint--matrix {
  margin: 0;
  padding: 8px 16px 12px;
  font-weight: 600;
  color: #b45309;
}

.interpreter__actions {
  display: flex;
  justify-content: flex-end;
}

.interpreter__actions button {
  margin-top: 12px;
  padding: 8px 16px;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  background: #2563eb;
  color: #ffffff;
  transition: background 0.2s ease, transform 0.2s ease;
}

.interpreter__actions button:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}
</style>
