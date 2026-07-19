<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="interpreter">
    <label class="interpreter__toggle">
      <input type="checkbox" v-model="showPalette" />
      Afficher la palette
    </label>

    <transition name="fade">
      <div v-if="showPalette" class="interpreter__palette">
        <h2>Symboles disponibles</h2>
        <div class="palette__grid">
          <button
            v-for="item in paletteItems"
            :key="item.label"
            @click="appendToken(item)"
          >
            <span class="palette__token">{{ item.label }}</span>
            <small>{{ item.description }}</small>
          </button>
        </div>
      </div>
    </transition>

    <div class="interpreter__toolbar">
      <div class="interpreter__toolbar-group">
        <h4>Opérateurs</h4>
        <div class="interpreter__toolbar-grid">
          <button
            v-for="item in operatorButtons"
            :key="item.label"
            @click="appendToken(item)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
      <div class="interpreter__toolbar-group">
        <h4>Ensembles</h4>
        <div class="interpreter__toolbar-grid">
          <button
            v-for="item in setButtons"
            :key="item.label"
            @click="appendToken(item)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>

    <h2>Zone de texte</h2>
    <textarea aria-label="Saisir ou coller votre contenu mathématique"
      ref="textareaRef"
      v-model="userInput"
      rows="6"
      class="interpreter__textarea"
      placeholder="Saisir ou coller votre contenu mathématique"
    ></textarea>

    <h3>Résultat</h3>
    <div
      class="interpreter__preview"
      :style="{
        ...(props.bgColor ? { background: props.bgColor, borderColor: props.bgColor } : {}),
        ...(props.textColor ? { color: props.textColor } : {}),
      }"
      v-html="renderedContent"
    />
    <div v-if="unitsError" style="margin-bottom:8px; padding:8px 12px; border:1px solid #fecaca; background:#fff1f2; color:#b91c1c; border-radius:8px; font-weight:600;">
      {{ unitsError }}
    </div>
    <p style="margin-bottom:8px; font-size:12px; color:#64748b;">
      Vérification d'homogénéité : déclarez l'unité d'une variable avec <code>P[Pa] = F[N] / S[m^2]</code> —
      sans déclaration, les formules symboliques ne sont pas jugées.
    </p>
    <div v-if="props.showApply" class="interpreter__actions">
      <button type="button" @click="apply">{{ props.applyLabel }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { renderMathMultiline } from './interpreter.js' // KaTeX bridge
import { checkUnitHomogeneity } from './units.js'

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

/* --- Palette & boutons (inchangés / légères retouches utiles) --- */
const formulaMapping = {
  '√x': 'sqrt(__CARET__)',
  'x²': '^',
  'x/y': 'over(__CARET__, )',
  'xₙ': '_',
  'e^x': 'e^',
  'ln(x)': 'ln(__CARET__)',
  'ẋ': '̇',
  'ẍ': '̈',
  'x̅': '̅',
  '→x': 'widevec(__CARET__)',
  'ⁿ√x': 'nsqrt(__CARET__)',
  '|x|': '|┤|',
  '⌊x⌋': '⌊┤⌋',
  '‖x‖': '‖┤‖',
  '∅': '∅',
  'ℕ': 'ℕ',
  'ℤ': 'ℤ',
  'ℚ': 'ℚ',
  'ℝ': 'ℝ',
  'ℂ': 'ℂ',
  '∞': '∞',
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '=': '=',
  '≠': '≠',
  '≈': '≈',
  '≤': '≤',
  '≥': '≥',
}

const extraPalette = [
  { label: 'sqrt(…)',      insert: 'sqrt(__CARET__)',                description: 'Racine carrée' },
  { label: 'nsqrt(n, …)',  insert: 'nsqrt(__CARET__)',               description: 'Racine n-ième', action: 'nsqrt' },
  { label: 'over(a, b)',   insert: 'over(__CARET__, )',              description: 'Fraction' },
  { label: 'widevec(…)',   insert: 'widevec(__CARET__)',             description: 'Vecteur' },
  { label: 'matrix(a;b)',  insert: 'matrix(__CARET__)',              description: 'Matrice (a,b; c,d; …)' },
  { label: 'mattrix([...])', insert: 'mattrix([__CARET__],[],[])',   description: 'Matrice 3×3' },
  { label: '<text …>',     insert: '<text bold color:red>__CARET__</text>', description: 'Texte stylé' },
]

const paletteItems = [
  ...Object.entries(formulaMapping)
    .filter(([label, token]) => label && token && label !== token)
    .map(([label, token]) => ({ label, insert: token, description: 'Insertion rapide' })),
  ...extraPalette,
]

const operatorButtons = [
  { label: '+', insert: '+' },
  { label: '-', insert: '-' },
  { label: '±', insert: '±' },
  { label: '*', insert: '*' },
  { label: '/', insert: '/' },
  { label: '=', insert: '=' },
  { label: '≠', insert: '≠' },
  { label: '≈', insert: '≈' },
  { label: '≤', insert: '≤' },
  { label: '≥', insert: '≥' },
]

const setButtons = [
  { label: 'ℕ', insert: 'ℕ' },
  { label: 'ℤ', insert: 'ℤ' },
  { label: 'ℚ', insert: 'ℚ' },
  { label: 'ℝ', insert: 'ℝ' },
  { label: 'ℂ', insert: 'ℂ' },
  { label: '∅', insert: '∅' },
]

/* --- État & rendu --- */
const showPalette = ref(false)
const userInput = ref(props.modelValue || '')
const textareaRef = ref(null)

watch(
  () => props.modelValue,
  (value) => {
    const nextValue = value ?? ''
    if (nextValue !== userInput.value) {
      userInput.value = nextValue
    }
  }
)

watch(
  userInput,
  (value) => {
    emit('update:modelValue', value)
  }
)

// KaTeX: rendu HTML (computed -> auto-refresh)
const unitsError = computed(() => checkUnitHomogeneity(userInput.value)) 
const renderedContent = computed(() => renderMathMultiline(userInput.value))

/* --- Insertion depuis la palette/toolbar --- */
const appendToken = (item) => {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const current = userInput.value

  const tokenMeta = typeof item === 'string' ? { insert: item } : item
  let token = tokenMeta.insert || ''

  if (tokenMeta.action === 'nsqrt') {
    const nValue = window.prompt('Valeur de n pour la racine ?', '2') || '2'
    token = `nsqrt(${nValue}, __CARET__)`
  }

  let caretIndex = null
  if (token.includes('__CARET__')) {
    caretIndex = token.indexOf('__CARET__')
    token = token.replace('__CARET__', '')
  }

  userInput.value = `${current.slice(0, start)}${token}${current.slice(end)}`
  nextTick(() => {
    textarea.focus()
    const cursor = caretIndex !== null ? start + caretIndex : start + token.length
    textarea.setSelectionRange(cursor, cursor)
  })
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

.interpreter__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #0f172a;
}

.interpreter__palette {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
  background: #f8fafc;
}

.palette__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.palette__grid button {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  background: #e0f2fe;
  color: #0f172a;
  font-weight: 600;
  transition: transform 0.2s ease, background 0.2s ease;
}
.palette__grid button:hover { background: #bfdbfe; transform: translateY(-1px); }

.interpreter__toolbar { display: flex; flex-direction: column; gap: 16px; }
.interpreter__toolbar-group h4 {
  margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #0f172a;
}
.interpreter__toolbar-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(48px, 1fr)); gap: 6px;
}
.interpreter__toolbar-grid button {
  padding: 6px 0; border-radius: 10px; border: 1px solid #cbd5f5; background: #f1f5f9;
  color: #0f172a; cursor: pointer; font-weight: 600;
}
.interpreter__toolbar-grid button:hover { background: #dbeafe; }

.interpreter__textarea {
  width: 100%; min-height: 140px; padding: 12px; border-radius: 12px; border: 1px solid #cbd5f5;
  font-size: 14px; font-family: 'Fira Code', monospace; background: #f9fafb; color: #0f172a;
}

.interpreter__preview {
  min-height: 120px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;
  background: #ffffff; font-size: 16px; color: #0f172a;
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

.fade-enter-active,.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
</style>
