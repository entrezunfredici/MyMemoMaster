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

// ── Interface modérateur ────────────────────────────────────────────────────────────────────────────────

/** Longueur maximale du motif d'une décision de modération (identique à l'API). */
export const DECISION_NOTE_MAX = 500

/** Durée du masquage avant suppression automatique, en jours. */
export const HIDE_DAYS = 30

/** Libellés et styles des statuts d'un signalement (statuts ouverts : pending, in_review, hidden). */
export const REPORT_STATUSES = {
  pending: { label: 'En attente', badge: 'bg-gray-100 text-gray-800', open: true },
  in_review: { label: 'En cours', badge: 'bg-blue-100 text-blue-800', open: true },
  hidden: { label: 'Masqué', badge: 'bg-amber-100 text-amber-800', open: true },
  dismissed: { label: 'Rejeté', badge: 'bg-green-100 text-green-800', open: false },
  actioned: { label: 'Supprimé', badge: 'bg-red-100 text-red-800', open: false },
}

/** Libellés des types de contenu signalables. */
export const CONTENT_TYPE_LABELS = { resource: 'Ressource', section: 'Section' }

/**
 * Libellé d'un motif de signalement.
 *
 * @param {string} reason - Code du motif
 * @returns {string} Libellé, ou le code lui-même s'il est inconnu
 */
export function reasonLabel(reason) {
  return REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason
}

/**
 * Libellé d'un statut de signalement.
 *
 * @param {string} status - Code du statut
 * @returns {string} Libellé, ou le code lui-même s'il est inconnu
 */
export function statusLabel(status) {
  return REPORT_STATUSES[status]?.label ?? status
}

/**
 * Actions de modération proposées pour un dossier, selon son statut et le rôle du modérateur
 * (mêmes règles que l'API : diagrams/moderation_rules.md §7).
 *
 * @param {{status: string, contentExists: boolean, authorActive: (boolean|null), roleId: number}} context
 * @returns {{claim: boolean, dismiss: boolean, hide: boolean, restore: boolean, remove: boolean, suspend: boolean}}
 */
export function availableActions({ status, contentExists, authorActive, roleId }) {
  const workable = status === 'pending' || status === 'in_review'
  const open = REPORT_STATUSES[status]?.open === true
  return {
    claim: workable,
    dismiss: workable,
    hide: workable && contentExists,
    restore: status === 'hidden' && contentExists,
    remove: open,
    // La suspension d'un compte est réservée aux rôles 1 et 4 ; inutile si le compte est déjà suspendu.
    suspend: open && [1, 4].includes(roleId) && authorActive === true,
  }
}

/**
 * Valide le motif d'une décision de modération.
 *
 * @param {string} note
 * @returns {string} Message d'erreur en français, chaîne vide si valide
 */
export function validateDecisionNote(note) {
  const text = (note || '').trim()
  if (!text) return 'Le motif de la décision est requis.'
  if (text.length > DECISION_NOTE_MAX) return `Le motif ne peut pas dépasser ${DECISION_NOTE_MAX} caractères.`
  return ''
}
