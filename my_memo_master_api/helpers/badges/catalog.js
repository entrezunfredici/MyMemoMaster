// Catalogue des badges (lot 1 : régularité, exercices, Leitner, exploration).
// Les définitions vivent en code ; seule l'obtention est stockée (table UserBadge).
// Les `code` sont des clés stables : ne jamais en renommer un après livraison.
// Les 7 codes historiques de Kpi.service#_computeBadges sont repris tels quels.
// Seuils = propositions non calibrées (diagrams/gamification_badges.md §16).
//
// `value(stats)` renvoie la valeur mesurée ; le badge est obtenu quand value >= target.
// `events` liste les événements après lesquels le badge doit être réévalué.

const ACTIVITY_EVENTS = ['exercise.submitted', 'leitner.session.completed', 'mindmap.viewed']
const EXERCISE = ['exercise.submitted']
const LEITNER = ['leitner.session.completed']

const bestStreak = (stats) => stats.streakBest

const CATALOG = [
  // ── Régularité ──────────────────────────────────────────────────────────
  { code: 'streak3', category: 'regularity', rarity: 'common', icon: '✨', label: 'Premier élan', description: 'Pratiquer 3 jours de suite', target: 3, events: ACTIVITY_EVENTS, value: bestStreak },
  { code: 'streak7', category: 'regularity', rarity: 'common', icon: '🔥', label: '7 jours de suite', description: 'Pratiquer 7 jours consécutifs', target: 7, events: ACTIVITY_EVENTS, value: bestStreak },
  { code: 'streak30', category: 'regularity', rarity: 'rare', icon: '🏆', label: '30 jours de suite', description: 'Pratiquer 30 jours consécutifs', target: 30, events: ACTIVITY_EVENTS, value: bestStreak },
  { code: 'streak100', category: 'regularity', rarity: 'epic', icon: '💯', label: 'Centurion', description: 'Pratiquer 100 jours consécutifs', target: 100, events: ACTIVITY_EVENTS, value: bestStreak },
  { code: 'regular', category: 'regularity', rarity: 'rare', icon: '📅', label: 'Régulier', description: 'Pratiquer 20 jours sur les 30 derniers jours', target: 20, events: ACTIVITY_EVENTS, value: (s) => s.activeDaysLast30 },

  // ── Exercices ───────────────────────────────────────────────────────────
  { code: 'firstExercise', category: 'exercises', rarity: 'common', icon: '👣', label: 'Premier pas', description: 'Soumettre un premier exercice', target: 1, events: EXERCISE, value: (s) => s.exerciseCount },
  { code: 'tenTests', category: 'exercises', rarity: 'common', icon: '📚', label: '10 exercices', description: "Compléter 10 séries d'exercices", target: 10, events: EXERCISE, value: (s) => s.privateExerciseCount },
  { code: 'fiftyTests', category: 'exercises', rarity: 'rare', icon: '🗂️', label: '50 exercices', description: "Compléter 50 séries d'exercices", target: 50, events: EXERCISE, value: (s) => s.privateExerciseCount },
  { code: 'perfectScore', category: 'exercises', rarity: 'common', icon: '⭐', label: 'Score parfait', description: 'Obtenir 100 % à un exercice personnel de 3 questions ou plus', target: 1, events: EXERCISE, value: (s) => (s.hasPerfectScore ? 1 : 0) },

  // ── Mémorisation (Leitner) ──────────────────────────────────────────────
  { code: 'firstLeitner', category: 'memorization', rarity: 'common', icon: '🃏', label: 'Première révision', description: 'Terminer une première session Leitner', target: 1, events: LEITNER, value: (s) => s.leitnerSessionCount },
  { code: 'hundredCards', category: 'memorization', rarity: 'common', icon: '🎴', label: '100 cartes revues', description: 'Corriger 100 cartes au total', target: 100, events: LEITNER, value: (s) => s.cardsReviewedTotal },
  { code: 'thousandCards', category: 'memorization', rarity: 'rare', icon: '🗃️', label: '1 000 cartes revues', description: 'Corriger 1 000 cartes au total', target: 1000, events: LEITNER, value: (s) => s.cardsReviewedTotal },
  { code: 'leitnerMastery', category: 'memorization', rarity: 'rare', icon: '🧠', label: 'Maîtrise Leitner', description: "50 % des cartes d'un système (20 cartes minimum) en boîte 4 ou 5", target: 50, events: LEITNER, value: (s) => s.bestLeitnerMastery },

  // ── Exploration ─────────────────────────────────────────────────────────
  { code: 'fiveSubjects', category: 'exploration', rarity: 'rare', icon: '🎯', label: 'Polyvalent', description: 'Étudier 5 matières différentes', target: 5, events: [...EXERCISE, ...LEITNER], value: (s) => s.distinctSubjects }
]

// Badges dont le critère se calcule sur l'activité par matière (exercices, Leitner) : seuls ceux-là
// peuvent être liés à des matières (table BadgeSubject). Les badges fondés sur les jours d'activité
// (séries, régularité) ou sur le nombre de matières ne se découpent pas par matière.
//
// Pour ces mêmes badges, `contributors` nomme la mesure (de Badge.service#computeStats) qui liste les
// matières dont l'activité a permis l'obtention. Elle est enregistrée à l'obtention (UserBadge.context)
// et décide de la visibilité pour un enseignant : un badge n'est montré que s'il a été obtenu avec
// une matière consentie.
const CONTRIBUTORS = {
  firstExercise: 'subjectsAllExercises',
  tenTests: 'subjectsPrivateExercises',
  fiftyTests: 'subjectsPrivateExercises',
  perfectScore: 'subjectsPerfectScores',
  firstLeitner: 'subjectsLeitnerSessions',
  hundredCards: 'subjectsLeitnerSessions',
  thousandCards: 'subjectsLeitnerSessions',
  leitnerMastery: 'subjectsMastered'
}
CATALOG.forEach((badge) => {
  badge.scopable = badge.code in CONTRIBUTORS
  badge.contributors = (stats) => (badge.scopable ? stats[CONTRIBUTORS[badge.code]] : [])
})

const CATALOG_BY_CODE = new Map(CATALOG.map((badge) => [badge.code, badge]))

// Niveaux selon le nombre de badges obtenus (propositions non calibrées, §7).
const LEVELS = [
  { name: 'Débutant', min: 0 },
  { name: 'Apprenti', min: 5 },
  { name: 'Confirmé', min: 10 },
  { name: 'Expert', min: 18 },
  { name: 'Maître', min: 26 }
]

/**
 * Niveau correspondant à un nombre de badges obtenus.
 *
 * @param {number} earnedCount - nombre de badges obtenus
 * @returns {{ name: string, min: number, next: ({name: string, min: number}|null) }}
 */
function levelFor(earnedCount) {
  let index = 0
  LEVELS.forEach((level, i) => {
    if (earnedCount >= level.min) index = i
  })
  return { ...LEVELS[index], next: LEVELS[index + 1] || null }
}

module.exports = { CATALOG, CATALOG_BY_CODE, ACTIVITY_EVENTS, levelFor }
