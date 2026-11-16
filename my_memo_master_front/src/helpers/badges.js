// Fonctions pures d'affichage des badges (C-06) : testables sans composant.
// Forme d'un badge (GET /badges) : { code, category, rarity, icon, label, description, earned,
// earnedAt, seenAt, progress: { current, target }, earnedSubjects? }.

export const CATEGORY_LABELS = {
  regularity: 'Régularité',
  exercises: 'Exercices',
  memorization: 'Mémorisation',
  exploration: 'Exploration',
}

// CHOIX: libellé + forme + classes de palette du thème, jamais la couleur seule (RGAA)
export const RARITY_META = {
  common: { label: 'Commun', shape: '●', classes: 'bg-gray-100 text-gray-700 border-gray-500' },
  rare: { label: 'Rare', shape: '◆', classes: 'bg-blue-50 text-blue-700 border-blue-700' },
  epic: { label: 'Épique', shape: '★', classes: 'bg-purple-50 text-purple-700 border-purple-700' },
}

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS)

/**
 * Libellé d'une catégorie ; la clé brute si elle est inconnue (catalogue enrichi côté API).
 *
 * @param {string} category
 * @returns {string}
 */
export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category
}

/**
 * Métadonnées d'affichage d'une rareté (repli sur « Commun »).
 *
 * @param {string} rarity
 * @returns {{ label: string, shape: string, classes: string }}
 */
export function rarityMeta(rarity) {
  return RARITY_META[rarity] || RARITY_META.common
}

/**
 * État d'une carte : `earned` ou `locked`.
 *
 * @param {{ earned?: boolean }} badge
 * @returns {'earned'|'locked'}
 */
export function badgeState(badge) {
  return badge?.earned ? 'earned' : 'locked'
}

/**
 * Pourcentage de progression borné à 0–100 (cible nulle ou absente = 0).
 *
 * @param {{ current?: number, target?: number }} [progress]
 * @returns {number}
 */
export function progressPercent(progress) {
  const target = Number(progress?.target)
  if (!target || target <= 0) return 0
  const current = Math.max(0, Number(progress?.current) || 0)
  return Math.min(100, Math.round((current / target) * 100))
}

/**
 * Date d'obtention lisible en français, ou chaîne vide si la date est absente ou invalide.
 *
 * @param {string|Date|null} value
 * @returns {string}
 */
export function formatEarnedDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Nom accessible complet d'une carte (lu par les lecteurs d'écran).
 *
 * @param {object} badge
 * @returns {string}
 */
export function badgeAriaLabel(badge) {
  const parts = [badge.label, rarityMeta(badge.rarity).label.toLowerCase()]
  if (badge.earned) {
    const date = formatEarnedDate(badge.earnedAt)
    parts.push(date ? `obtenu le ${date}` : 'obtenu')
  } else {
    parts.push('non obtenu', `${badge.progress?.current ?? 0} sur ${badge.progress?.target ?? 0}`)
  }
  return parts.join(', ')
}

/**
 * Filtre les badges par état (`all`, `earned`, `locked`) et par catégorie (`all` ou clé).
 *
 * @param {object[]} badges
 * @param {{ status?: string, category?: string }} [filters]
 * @returns {object[]}
 */
export function filterBadges(badges, { status = 'all', category = 'all' } = {}) {
  return (badges || []).filter((badge) => {
    if (status === 'earned' && !badge.earned) return false
    if (status === 'locked' && badge.earned) return false
    if (category !== 'all' && badge.category !== category) return false
    return true
  })
}

/**
 * Regroupe par catégorie, dans l'ordre du catalogue ; les catégories vides n'apparaissent pas.
 *
 * @param {object[]} badges
 * @returns {{ category: string, label: string, badges: object[] }[]}
 */
export function groupByCategory(badges) {
  const groups = new Map()
  for (const badge of badges || []) {
    if (!groups.has(badge.category)) groups.set(badge.category, [])
    groups.get(badge.category).push(badge)
  }
  const known = CATEGORY_ORDER.filter((key) => groups.has(key))
  const unknown = [...groups.keys()].filter((key) => !CATEGORY_ORDER.includes(key))
  return [...known, ...unknown].map((category) => ({ category, label: categoryLabel(category), badges: groups.get(category) }))
}

/**
 * Les badges non obtenus les plus proches de l'obtention (plus forte progression relative).
 *
 * @param {object[]} badges
 * @param {number} [limit=3]
 * @returns {object[]}
 */
export function nextBadges(badges, limit = 3) {
  return (badges || [])
    .filter((badge) => !badge.earned)
    .map((badge) => ({ badge, percent: progressPercent(badge.progress) }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, limit)
    .map((entry) => entry.badge)
}

/**
 * Les derniers badges obtenus, du plus récent au plus ancien.
 *
 * @param {object[]} badges
 * @param {number} [limit=3]
 * @returns {object[]}
 */
export function latestEarned(badges, limit = 3) {
  return (badges || [])
    .filter((badge) => badge.earned && badge.earnedAt)
    .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
    .slice(0, limit)
}

/**
 * Jauge de niveau : texte « n / palier » toujours fourni (pas de jauge muette).
 *
 * @param {{ level?: { name: string, next: ({ name: string, min: number }|null) }, earnedCount?: number }} summary
 * @returns {{ name: string, percent: number, text: string, isMax: boolean }}
 */
export function levelProgress(summary) {
  const name = summary?.level?.name || 'Débutant'
  const earned = summary?.earnedCount ?? 0
  const next = summary?.level?.next
  if (!next) return { name, percent: 100, text: 'Niveau maximum atteint', isMax: true }
  const percent = next.min > 0 ? Math.min(100, Math.round((earned / next.min) * 100)) : 0
  return { name, percent, text: `${earned} / ${next.min} badges pour devenir ${next.name}`, isMax: false }
}

/**
 * Phrase décrivant la série, sans ton culpabilisant quand elle est à zéro.
 *
 * @param {{ streakCurrent?: number, streakBest?: number }} summary
 * @returns {string}
 */
export function streakMessage(summary) {
  const current = summary?.streakCurrent ?? 0
  const best = summary?.streakBest ?? 0
  if (current > 0) return ''
  if (best > 0) return `Ta série est repartie à 0. Ta meilleure série reste de ${best} jour${best > 1 ? 's' : ''} : une nouvelle commence dès ta prochaine pratique.`
  return "Ta première pratique d'aujourd'hui lance ta série."
}
