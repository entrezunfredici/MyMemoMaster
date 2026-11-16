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
  // CHOIX: caractères de contrôle remplacés un à un (ESLint refuse une classe de contrôle dans une regex),
  // puis un `replace` de retours à la ligne en DERNIÈRE étape
  // RAISON: c'est la forme que l'analyse CodeQL (js/log-injection) reconnaît comme nettoyage ; un traitement
  // caractère par caractère placé après lui ferait réapparaître l'alerte.
  const withoutControl = Array.from(String(value).slice(0, 200), (char) => (isControlChar(char) ? ' ' : char)).join('')
  return withoutControl.replace(/[\r\n]/g, '')
}

module.exports = sanitizeLog
