// Règles de signalement côté interface — doivent rester alignées sur l'API
// (my_memo_master_api/services/ContentReport.service.js, diagrams/moderation_rules.md §4).

/** Motifs de signalement proposés, dans l'ordre d'affichage. */
export const REPORT_REASONS = [
  { value: 'illegal', label: 'Contenu illégal', hint: 'Incitation à la haine, contenu violent ou sexuel' },
  { value: 'harassment', label: 'Harcèlement ou insulte', hint: 'Propos visant une personne' },
  { value: 'copyright', label: "Droits d'auteur", hint: 'Cours ou sujet copié sans autorisation' },
  { value: 'spam', label: 'Spam ou publicité', hint: 'Lien commercial sans rapport' },
  { value: 'personal_data', label: 'Données personnelles', hint: 'Coordonnées, note ou copie nominative exposée' },
  { value: 'other', label: 'Autre', hint: 'Précisez dans le commentaire' },
]

/** Longueur maximale du commentaire du signalant (identique à l'API). */
export const REPORT_COMMENT_MAX = 500

/** Types de contenu signalables. */
export const REPORT_CONTENT_TYPES = ['resource', 'section']

/**
 * Le commentaire est obligatoire pour le motif « autre ».
 *
 * @param {string} reason - Code du motif
 * @returns {boolean}
 */
export function isCommentRequired(reason) {
  return reason === 'other'
}

/**
 * Valide le formulaire de signalement avant envoi.
 *
 * @param {{reason: string, comment: string}} form
 * @returns {string} Message d'erreur en français, chaîne vide si le formulaire est valide
 */
export function validateReport({ reason, comment }) {
  if (!REPORT_REASONS.some((r) => r.value === reason)) return 'Choisissez un motif de signalement.'
  const text = (comment || '').trim()
  if (isCommentRequired(reason) && !text) return "Une précision est obligatoire pour le motif « Autre »."
  if (text.length > REPORT_COMMENT_MAX) return `Le commentaire ne peut pas dépasser ${REPORT_COMMENT_MAX} caractères.`
  return ''
}
