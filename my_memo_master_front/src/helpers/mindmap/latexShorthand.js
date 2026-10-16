// MathLive écrit certaines commandes sans accolades quand l'argument tient en un caractère :
// `\frac12` pour `\frac{1}{2}`, `\sqrt2` pour `\sqrt{2}`. Les analyseurs de formules du projet
// (calcul des grandeurs, tracé des graphiques) attendent des groupes {…} : on les rétablit ici.

// Lit un argument à partir de `start` : un groupe {…} (avec accolades imbriquées) ou un seul
// caractère. Retourne { text, end } où text est l'argument sans accolades, ou null s'il n'y en a pas.
const readArgument = (source, start) => {
  let i = start;
  while (source[i] === ' ') i++;
  if (i >= source.length) return null;
  if (source[i] === '{') {
    let depth = 0;
    for (let j = i; j < source.length; j++) {
      if (source[j] === '{') depth++;
      else if (source[j] === '}' && --depth === 0) return { text: source.slice(i + 1, j), end: j + 1 };
    }
    return null;
  }
  if (source[i] === '\\') {
    const m = /^\\([A-Za-z]+|.)/.exec(source.slice(i));
    return { text: m[0], end: i + m[0].length };
  }
  return { text: source[i], end: i + 1 };
};

const normalizeLatexShorthand = (source) => {
  const text = String(source ?? '');
  let out = '';
  let i = 0;
  while (i < text.length) {
    const frac = text.startsWith('\\frac', i) && !/[A-Za-z]/.test(text[i + 5] ?? '');
    const sqrt = text.startsWith('\\sqrt', i) && !/[A-Za-z]/.test(text[i + 5] ?? '');
    if (!frac && !sqrt) { out += text[i++]; continue; }
    let cursor = i + 5;
    let prefix = frac ? '\\frac' : '\\sqrt';
    if (sqrt && text[cursor] === '[') {
      // racine n-ième : \sqrt[3]{x}
      const close = text.indexOf(']', cursor);
      if (close !== -1) { prefix += text.slice(cursor, close + 1); cursor = close + 1; }
    }
    const args = [];
    for (let n = 0; n < (frac ? 2 : 1); n++) {
      const arg = readArgument(text, cursor);
      if (!arg) break;
      args.push(`{${normalizeLatexShorthand(arg.text)}}`);
      cursor = arg.end;
    }
    out += prefix + args.join('');
    i = cursor;
  }
  return out;
};

export { normalizeLatexShorthand };
