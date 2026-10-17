// Formatage et libellés des vues « Classe » (enseignant) : fonctions pures, extraites de
// pages/ClassroomEnseignantView.vue sans changement de comportement.

export function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Date et heure, pour les journaux et les listes d'administration ; « — » quand la valeur est absente. */
export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function fileIcon(mimeType) {
  if (!mimeType) return '📄'
  if (mimeType === 'application/pdf') return '📕'
  if (mimeType.startsWith('image/')) return '🖼'
  // Présentation et tableur AVANT « document » : leurs types Office Open XML contiennent « officedocument »
  // (…officedocument.presentationml…, …officedocument.spreadsheetml…) et recevaient l'icône Word.
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📈'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  return '📄'
}

export function deadlineTypeLabel(type) {
  const map = { ds: 'DS', devoir: 'Devoir', exposé: 'Exposé', autre: 'Autre' }
  return map[type] ?? type
}

export function resourceTypeLabel(type) {
  const map = { cours: 'Cours', carte_mentale: 'Carte mentale', sujet: 'Sujet', autre: 'Autre' }
  return map[type] ?? type
}

/** Couleur du score de discipline (30 jours) : bon à partir de 70, moyen à partir de 40. */
export function disciplineScoreClass(score) {
  if (score >= 70) return 'text-success'
  if (score >= 40) return 'text-primary'
  return 'text-secondary'
}

/** Normalise la hauteur d'une barre d'activité hebdomadaire (max 7 séances par semaine). */
export function weeklyBarHeight(count) {
  if (!count) return '3px'
  return Math.max(20, Math.min(100, Math.round((count / 7) * 100))) + '%'
}

export function formatMinutes(minutes) {
  if (!minutes) return '0 min'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${m > 0 ? ' ' + m + 'min' : ''}` : `${m} min`
}
