const isControlChar = (char) => {
  const code = char.charCodeAt(0)
  return code < 32 || code === 127
}

/**
 * Neutralise une valeur venant de l'extérieur (paramètre d'URL, adresse email d'un fournisseur…) avant de
 * l'écrire dans un journal : les retours à la ligne et caractères de contrôle permettraient de falsifier
 * de fausses entrées (injection dans les logs, OWASP A09).
 *
 * @param {*} value - Valeur à journaliser
 * @returns {string} Texte sur une seule ligne, tronqué à 200 caractères
 */
const sanitizeLog = (value) => {
  // CHOIX: \s (retours à la ligne, tabulations) en regex, puis les autres caractères de contrôle un à un
  // RAISON: une classe de caractères de contrôle dans la regex est refusée par ESLint (no-control-regex)
  const singleLine = String(value).replace(/\s+/g, ' ')
  return Array.from(singleLine, (char) => (isControlChar(char) ? ' ' : char))
    .join('')
    .slice(0, 200)
}

module.exports = sanitizeLog
