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
    <textarea
      ref="textareaRef"
      v-model="userInput"
      rows="6"
      class="interpreter__textarea"
      placeholder="Saisir ou coller votre contenu mathématique"
    ></textarea>

    <h3>Résultat</h3>
    <div class="interpreter__preview" v-html="renderedContent"></div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const formulaMapping = {
  '√x': 'sqrt',
  'x²': '^',
  'x/y': 'over',
  'xₙ': '_',
  '∫a^b f(x)': '∫┤^┤(┤)',
  '∮a^b f(x)': '∮┤^┤(┤)',
  '∯a^b f(x)': '∯┤^┤(┤)',
  'e^x': 'e^',
  'ln(x)': 'ln',
  'ẋ': '̇',
  'ẍ': '̈',
  'x̅': '̅',
  '→x': 'widevec',
  'ⁿ√x': 'nsqrt',
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
};

const extraPalette = [
  { label: 'sqrt(…)', insert: 'sqrt(__CARET__)', description: 'Racine carrée' },
  { label: 'nsqrt(n, …)', insert: 'nsqrt(__CARET__)', description: 'Racine n-ième', action: 'nsqrt' },
  { label: 'over(a, b)', insert: 'over(__CARET__, )', description: 'Fraction' },
  { label: 'widevec(…)', insert: 'widevec(__CARET__)', description: 'Vecteur' },
  { label: 'mattrix([...])', insert: 'mattrix([__CARET__],[],[])', description: 'Matrice 3×3' },
  { label: '<text …>', insert: '<text bold color:red>__CARET__</text>', description: 'Bloc de texte stylé' },
];

const paletteItems = [
  ...Object.entries(formulaMapping)
    .filter(([label, token]) => label && token && label !== token)
    .map(([label, token]) => ({ label, insert: token, description: 'Insertion rapide' })),
  ...extraPalette,
];

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
];

const setButtons = [
  { label: 'ℕ', insert: 'ℕ' },
  { label: 'ℤ', insert: 'ℤ' },
  { label: 'ℚ', insert: 'ℚ' },
  { label: 'ℝ', insert: 'ℝ' },
  { label: 'ℂ', insert: 'ℂ' },
  { label: '∅', insert: '∅' },
];

const tokenToDisplay = Object.entries(formulaMapping).reduce((acc, [display, token]) => {
  if (token && token !== display) acc[token] = display;
  return acc;
}, {});

const showPalette = ref(false);
const userInput = ref('');
const renderedContent = ref('');
const textareaRef = ref(null);

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeRegex = (value) => value.replace(/[[\]{}()*+?.\\^$|]/g, '\$&');

const normalizeTokens = (raw) => {
  let output = raw;
  for (const [token, display] of Object.entries(tokenToDisplay)) {
    const pattern = new RegExp(escapeRegex(token), 'g');
    output = output.replace(pattern, display);
  }
  return output;
};

const superscriptMap = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁻': '-',
};

const convertSuperscripts = (value) =>
  value.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (char) => superscriptMap[char] || '');

const equivalentUnits = {
  mm: 'm',
  cm: 'm',
  dm: 'm',
  m: 'm',
  dam: 'm',
  hm: 'm',
  km: 'm',
  ms: 's',
  s: 's',
  min: 's',
  h: 's',
  hr: 's',
  day: 's',
  mg: 'kg',
  g: 'kg',
  kg: 'kg',
  tonne: 'kg',
  t: 'kg',
  'm/s': 'm/s',
  'km/h': 'm/s',
  'mm²': 'm²',
  'cm²': 'm²',
  'dm²': 'm²',
  'm²': 'm²',
  a: 'm²',
  ha: 'm²',
  'km²': 'm²',
  'mm³': 'm³',
  'cm³': 'm³',
  'dm³': 'm³',
  'm³': 'm³',
  L: 'm³',
  dL: 'm³',
  cL: 'm³',
  mL: 'm³',
  J: 'J',
  kJ: 'J',
  MJ: 'J',
  cal: 'J',
  kcal: 'J',
  Wh: 'J',
  kWh: 'J',
  N: 'N',
  kN: 'N',
  Pa: 'Pa',
  kPa: 'Pa',
  bar: 'Pa',
  atm: 'Pa',
  mmHg: 'Pa',
  W: 'W',
  kW: 'W',
  MW: 'W',
  V: 'V',
  mV: 'V',
  A: 'A',
  mA: 'A',
  Ω: 'Ω',
  ohm: 'Ω',
  Hz: 'Hz',
  kHz: 'Hz',
  MHz: 'Hz',
  K: 'K',
  '°C': 'K',
  '°F': 'K',
};

const formatSignature = (signature) => {
  const entries = Object.entries(signature).filter(([, exponent]) => exponent);
  if (!entries.length) return 'sans unité';
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([unit, exponent]) => (exponent === 1 ? unit : `${unit}^${exponent}`))
    .join(' · ');
};

const cloneSignature = (signature) => ({ ...signature });

const simplifySignature = (signature) => {
  const result = {};
  Object.entries(signature).forEach(([unit, exponent]) => {
    if (exponent) result[unit] = exponent;
  });
  return result;
};

const signaturesEqual = (left, right) => {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if ((left[key] || 0) !== (right[key] || 0)) return false;
  }
  return true;
};

const multiplySignatures = (left, right) => {
  const result = cloneSignature(left);
  Object.entries(right).forEach(([unit, exponent]) => {
    const value = (result[unit] || 0) + exponent;
    if (value) result[unit] = value;
    else delete result[unit];
  });
  return result;
};

const divideSignatures = (left, right) => {
  const inverted = {};
  Object.entries(right).forEach(([unit, exponent]) => {
    inverted[unit] = -exponent;
  });
  return multiplySignatures(left, inverted);
};

const normalizeUnitString = (unit) => {
  if (!unit) return unit;
  if (equivalentUnits[unit]) return equivalentUnits[unit];
  const lower = typeof unit === 'string' ? unit.toLowerCase() : unit;
  return equivalentUnits[lower] || unit;
};

const unitStringToSignature = (unit) => {
  const signature = {};

  const addUnit = (token, exponent) => {
    if (!token) return;
    const normalized = convertSuperscripts(normalizeUnitString(token));
    const match = normalized.match(/^([a-zA-ZµΩ°]+)(?:\^(-?\d+))?$/);
    if (match) {
      const base = match[1];
      const power = exponent * (match[2] ? parseInt(match[2], 10) : 1);
      const value = (signature[base] || 0) + power;
      if (value) signature[base] = value;
      else delete signature[base];
      return;
    }
    const value = (signature[normalized] || 0) + exponent;
    if (value) signature[normalized] = value;
    else delete signature[normalized];
  };

  const handleToken = (token, exponent) => {
    if (!token) return;
    const normalized = convertSuperscripts(normalizeUnitString(token));
    if (normalized.includes('/')) {
      const [first, ...rest] = normalized.split('/');
      handleToken(first, exponent);
      rest.forEach((part) => handleToken(part, -exponent));
      return;
    }
    if (normalized.includes('*')) {
      normalized.split('*').forEach((part) => handleToken(part, exponent));
      return;
    }
    addUnit(normalized, exponent);
  };

  handleToken(unit, 1);
  return simplifySignature(signature);
};

const parseUnitExpression = (input) => {
  const source = (input || '').replace(/\s+/g, '');
  let index = 0;

  const peek = () => source[index];
  const consume = () => source[index++];

  const parseExpression = () => {
    let value = parseTerm();
    while (index < source.length) {
      const operator = peek();
      if (operator !== '+' && operator !== '-') break;
      consume();
      const nextValue = parseTerm();
      if (!signaturesEqual(value, nextValue)) {
        throw { type: 'addition', left: value, right: nextValue };
      }
    }
    return value;
  };

  const parseTerm = () => {
    let value = parseFactor();
    while (index < source.length) {
      const operator = peek();
      if (operator === '*' || operator === '·') {
        consume();
        value = multiplySignatures(value, parseFactor());
      } else if (operator === '/') {
        consume();
        value = divideSignatures(value, parseFactor());
      } else {
        break;
      }
    }
    return value;
  };

  const parseFactor = () => {
    if (peek() === '(') {
      consume();
      const value = parseExpression();
      if (peek() === ')') consume();
      return value;
    }
    return parseUnitToken();
  };

  const parseUnitToken = () => {
    const remaining = source.slice(index);
    const numberMatch = remaining.match(/^(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      index += numberMatch[1].length;
      const unitMatch = source.slice(index).match(/^([a-zA-ZµΩ°][a-zA-Z0-9µΩ°\/^⁰¹²³⁴⁵⁶⁷⁸⁹⁻]*)/);
      if (unitMatch) {
        index += unitMatch[1].length;
        return unitStringToSignature(unitMatch[1]);
      }
      return {};
    }

    const unitMatch = remaining.match(/^([a-zA-ZµΩ°][a-zA-Z0-9µΩ°\/^⁰¹²³⁴⁵⁶⁷⁸⁹⁻]*)/);
    if (unitMatch) {
      index += unitMatch[1].length;
      return unitStringToSignature(unitMatch[1]);
    }

    if (index < source.length) index += 1;
    return {};
  };

  return simplifySignature(parseExpression());
};

const checkUnitHomogeneity = (expression) => {
  const preprocess = (text) =>
    text
      .replace(/(\d+(?:\.\d+)?)\s*([a-zA-ZµΩ°]+)\/1([a-zA-ZµΩ°]+)/g, '$1$2/$3')
      .replace(/(\d+(?:\.\d+)?)\s*([a-zA-ZµΩ°]+)\/\d+(?:\.\d+)?([a-zA-ZµΩ°]+)/g, '$1$2/$3');

  const lines = preprocess(expression).split(/\r?\n+/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    try {
      const segments = line.split('=').map((segment) => segment.trim()).filter(Boolean);
      let reference = null;

      for (const segment of segments) {
        const signature = parseUnitExpression(segment);
        if (!reference) {
          reference = signature;
        } else if (!signaturesEqual(reference, signature)) {
          const left = formatSignature(reference);
          const right = formatSignature(signature);
          return `Erreur : unités incompatibles dans "${line}" (${left} et ${right}).`;
        }
      }
    } catch (error) {
      if (error?.type === 'addition') {
        const left = formatSignature(error.left);
        const right = formatSignature(error.right);
        return `Erreur : addition d'unités incompatibles (${left} et ${right}).`;
      }
      return `Erreur : unités incompatibles dans "${line}".`;
    }
  }

  return null;
};

const sanitizeForUnits = (text) =>
  text
    .replace(/<text[^>]*>[\s\S]*?<\/text>/gi, '')
    .replace(/mattrix\([^)]*\)/gi, '')
    .replace(/nsqrt\([^)]*\)/gi, '')
    .replace(/sqrt\([^)]*\)/gi, '')
    .replace(/ln\([^)]*\)/gi, '')
    .replace(/over\([^)]*\)/gi, '')
    .replace(/e\^([^\s^]+)/gi, '')
    .replace(/[a-zA-Z]+\^\d+/gi, '')
    .replace(/[ẋẍx̅→┤]/g, '');

const renderMatrix = (html) =>
  html.replace(/mattrix\((\s*\[[^\]]*\](?:\s*,\s*\[[^\]]*\])*)\)/g, (_match, content) => {
    const rows = content.match(/\[[^\]]*\]/g) || [];
    const cells = rows.map((row) =>
      row
        .slice(1, -1)
        .split(',')
        .map((cell) => cell.trim() || '&nbsp;')
    );

    const tableRows = cells
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
      .join('');

    return `<table class="interpreter__matrix">${tableRows}</table>`;
  });

const formatContent = (rawValue) => {
  if (!rawValue) return '';

  const normalized = normalizeTokens(rawValue);
  const unitIssue = checkUnitHomogeneity(sanitizeForUnits(normalized));
  if (unitIssue) {
    return `<span style="color: #dc2626; font-weight: 600;">${escapeHtml(unitIssue)}</span>`;
  }

  let html = escapeHtml(normalized);

  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<em>$1</em>')
    .replace(/\|(.*?)\|/g, '<span class="interpreter__abs">|$1|</span>')
    .replace(/‖(.*?)‖/g, '<span class="interpreter__abs">‖$1‖</span>')
    .replace(/⌊(.*?)⌋/g, '<span class="interpreter__floor">⌊$1⌋</span>')
    .replace(/nsqrt\((.*?),(.*?)\)/g, (_match, n, value) => `<span style="font-size: 0.75em; vertical-align: super;">${n.trim()}</span>√(${value.trim()})`)
    .replace(/sqrt\((.*?)\)/g, '<span class="interpreter__sqrt">&radic;($1)</span>')
    .replace(/widevec\((.*?)\)/g, (_match, inner) => `<span style="display: inline-block; position: relative; text-align: center;"><span style="text-decoration: none;">${inner}</span><span style="position: absolute; top: -0.55em; left: 50%; transform: translateX(-50%); font-size: 0.8em; font-weight: bold;">→</span></span>`)
    .replace(/over\((.*?),(.*?)\)/g, (_match, numerator, denominator) => `<span style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; font-size: 1.1em;"><span>${numerator.trim()}</span><span style="width: 100%; height: 1px; background-color: currentColor; margin: 2px 0;"></span><span>${denominator.trim()}</span></span>`)
    .replace(/([A-Za-z0-9]+)_\((.*?)\)/g, (_match, base, sub) => `${base}<sub>${sub.replace(/,/g, '')}</sub>`)
    .replace(/([A-Za-z0-9]+)\^(\((.*?)\)|\{(.*?)\}|(\S+))/g, (_match, base, _group, paren, brace, simple) => {
      const exponent = paren || brace || simple || '';
      return `${base}<sup>${exponent}</sup>`;
    })
    .replace(/∫_(.*?)\^(.*?)\((.*?)\)/g, '<span style="font-style: italic;">∫<sub>$1</sub><sup>$2</sup> $3</span>')
    .replace(/∮_(.*?)\^(.*?)\((.*?)\)/g, '<span style="font-style: italic;">∮<sub>$1</sub><sup>$2</sup> $3</span>')
    .replace(/∯_(.*?)\^(.*?)\((.*?)\)/g, '<span style="font-style: italic;">∯<sub>$1</sub><sup>$2</sup> $3</span>')
    .replace(/∫([^\s^]+)\^([^\s^]+)\s*([^
]+)/g, '<span style="font-style: italic;">∫<sub>$1</sub><sup>$2</sup> $3</span>')
    .replace(/∮([^\s^]+)\^([^\s^]+)\s*([^
]+)/g, '<span style="font-style: italic;">∮<sub>$1</sub><sup>$2</sup> $3</span>')
    .replace(/∯([^\s^]+)\^([^\s^]+)\s*([^
]+)/g, '<span style="font-style: italic;">∯<sub>$1</sub><sup>$2</sup> $3</span>')
    .replace(/([A-Za-z])̅/g, '<span style="text-decoration: overline;">$1</span>')
    .replace(/ẋ/g, '<span>x<sup style="font-size: 0.7em;">·</sup></span>')
    .replace(/ẍ/g, '<span>x<sup style="font-size: 0.7em;">..</sup></span>')
    .replace(/ℕ/g, '&#8469;')
    .replace(/ℤ/g, '&#8484;')
    .replace(/ℚ/g, '&#8474;')
    .replace(/ℝ/g, '&#8477;')
    .replace(/ℂ/g, '&#8450;')
    .replace(/∞/g, '&#8734;')
    .replace(/
/g, '<br />');

  html = renderMatrix(html);

  html = html.replace(/<text([^>]*)>([\s\S]*?)<\/text>/gi, (_match, attributes, content) => {
    let openTags = '';
    let closeTags = '';
    let styles = '';

    if (attributes.includes('bold')) styles += 'font-weight: bold;';
    if (attributes.includes('italic')) styles += 'font-style: italic;';

    const colorMatch = attributes.match(/color:([a-zA-Z]+)/);
    if (colorMatch) styles += `color: ${colorMatch[1]};`;

    if (styles) {
      openTags += `<span style="${styles}">`;
      closeTags = '</span>' + closeTags;
    }

    const contentWithBreaks = content.replace(/
/g, '<br>');
    return `${openTags}${contentWithBreaks}${closeTags}`;
  });

  return html;
};

watch(
  () => userInput.value,
  (value) => {
    renderedContent.value = formatContent(value);
    nextTick(() => {
      if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise().catch((err) => console.error('Erreur MathJax :', err));
      }
    });
  },
  { immediate: true }
);

const appendToken = (item) => {
  const textarea = textareaRef.value;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const current = userInput.value;

  const tokenMeta = typeof item === 'string' ? { insert: item } : item;
  let token = tokenMeta.insert || '';

  if (tokenMeta.action === 'nsqrt') {
    const nValue = window.prompt('Valeur de n pour la racine ?', '2') || '2';
    token = `nsqrt(${nValue}, __CARET__)`;
  }

  let caretIndex = null;
  if (token.includes('__CARET__')) {
    caretIndex = token.indexOf('__CARET__');
    token = token.replace('__CARET__', '');
  }

  userInput.value = `${current.slice(0, start)}${token}${current.slice(end)}`;

  nextTick(() => {
    textarea.focus();
    const cursor = caretIndex !== null ? start + caretIndex : start + token.length;
    textarea.setSelectionRange(cursor, cursor);
  });
};
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

.palette__grid button:hover {
  background: #bfdbfe;
  transform: translateY(-1px);
}

.interpreter__toolbar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.interpreter__toolbar-group h4 {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.interpreter__toolbar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(48px, 1fr));
  gap: 6px;
}

.interpreter__toolbar-grid button {
  padding: 6px 0;
  border-radius: 10px;
  border: 1px solid #cbd5f5;
  background: #f1f5f9;
  color: #0f172a;
  cursor: pointer;
  font-weight: 600;
}

.interpreter__toolbar-grid button:hover {
  background: #dbeafe;
}

.interpreter__textarea {
  width: 100%;
  min-height: 140px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #cbd5f5;
  font-size: 14px;
  font-family: 'Fira Code', monospace;
  background: #f9fafb;
  color: #0f172a;
}

.interpreter__preview {
  min-height: 120px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  background: #ffffff;
  font-size: 16px;
  color: #0f172a;
}

.interpreter__abs {
  font-weight: 600;
  color: #2563eb;
}

.interpreter__sqrt {
  font-style: italic;
  color: #1d4ed8;
}

.interpreter__floor {
  font-weight: 600;
}

.interpreter__matrix {
  border-collapse: collapse;
  margin: 8px 0;
}

.interpreter__matrix td {
  border: 1px solid #cbd5f5;
  padding: 4px 6px;
  text-align: center;
  min-width: 32px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
