// Textes et règles d'affichage de la gamification « du quotidien » : flamme de série dans l'en-tête (A2),
// bonus de première session du jour (F4) et messages d'encouragement de fin de session (G2).
// Fonctions pures, sans aléa au rendu : voir `pickVariant`.

/**
 * Pastille de série de l'en-tête (flamme). Masquée sans série en cours : afficher « 0 jour » serait
 * culpabilisant. Le libellé dit si la série a déjà été prolongée aujourd'hui ; l'information ne repose pas
 * que sur la couleur (libellé texte, bordure pleine ou pointillée).
 *
 * @param {{ current?: number, practicedToday?: boolean, freezes?: number }|null} streak - `freezes` : gels de série en réserve (A3)
 * @returns {{ visible: boolean, count: number, done: boolean, freezes: number, label: string, hint: string }}
 */
export function streakFlame(streak) {
  const count = streak?.current ?? 0
  const hint = 'Un jour manqué par semaine est toléré.'
  if (count < 1) return { visible: false, count: 0, done: false, freezes: 0, label: '', hint }
  const days = `${count} jour${count > 1 ? 's' : ''}`
  const done = Boolean(streak?.practicedToday)
  const freezes = Math.max(0, Math.trunc(streak?.freezes ?? 0))
  const base = done ? `Série de ${days}, déjà prolongée aujourd'hui.` : `Série de ${days}. Une courte pratique aujourd'hui la prolonge.`
  return {
    visible: true,
    count,
    done,
    freezes,
    label: freezes > 0 ? `${base} ${freezeLabel(freezes)} en réserve.` : base,
    hint,
  }
}

/**
 * « 1 gel de série » / « 2 gels de série » (A3 : un gel couvre un jour manqué).
 *
 * @param {number} n
 * @returns {string}
 */
export function freezeLabel(n) {
  return `${n} gel${n > 1 ? 's' : ''} de série`
}

/**
 * Progression vers le prochain gel de série, pour la page des badges.
 *
 * @param {{ available?: number, max?: number, progress?: number, every?: number }|null|undefined} freezes - champ `freezes` de GET /badges/me/summary
 * @returns {{ visible: boolean, available: number, max: number, text: string }} `visible` faux si l'API ne renvoie pas les gels
 */
export function freezeSummary(freezes) {
  if (!freezes || typeof freezes.available !== 'number') return { visible: false, available: 0, max: 0, text: '' }
  const { available, max = 2, progress = 0, every = 14 } = freezes
  const text = available >= max
    ? `${freezeLabel(available)} en réserve (maximum atteint).`
    : `${freezeLabel(available)} en réserve. Le prochain arrive dans ${every - progress} jour${every - progress > 1 ? 's' : ''} de série.`
  return { visible: true, available, max, text }
}

/**
 * Texte du défi du jour (A4) : bienveillant, sans reproche sur l'absence de pratique.
 *
 * @param {{ available?: boolean, done?: boolean, subject?: { name?: string|null }|null, daysSince?: number|null }|null} challenge
 * @returns {string} chaîne vide s'il n'y a pas de défi
 */
export function challengeText(challenge) {
  if (!challenge?.available || !challenge.subject) return ''
  const name = challenge.subject.name || 'cette matière'
  if (challenge.done) return `Défi relevé : tu as pratiqué ${name} aujourd'hui. Bravo !`
  if (challenge.daysSince === null || challenge.daysSince === undefined) return `Tu n'as pas encore commencé à réviser ${name} : une courte session suffit pour s'y mettre.`
  return `Ça fait ${challenge.daysSince} jours que tu n'as pas pratiqué ${name} : une courte session suffit pour la relancer.`
}

// Messages de fin de session (G2). Bienveillants : jamais de reproche, même après un mauvais score.
export const ENCOURAGEMENTS = {
  excellent: [
    'Excellent travail, ça se voit !',
    'Superbe session : tu maîtrises bien ce sujet.',
    'Bravo, quel beau résultat !',
    'Impressionnant, continue sur cette lancée.',
  ],
  good: [
    'Belle session, tu progresses.',
    'Du bon travail : encore un peu et tout sera acquis.',
    'Bien joué, chaque révision compte.',
    'Tu es sur la bonne voie.',
  ],
  effort: [
    'Chaque erreur est une occasion d’apprendre : tu y reviendras plus fort.',
    'Revoir ce qui résiste, c’est exactement le but d’une révision.',
    'Merci d’avoir persévéré : les prochaines fois seront plus faciles.',
    'L’important, c’est d’avoir pratiqué. Le reste viendra.',
  ],
  neutral: [
    'Bien joué, une session de plus à ton actif.',
    'Merci pour cette session, à bientôt.',
    'Tu avances à ton rythme, c’est ce qui compte.',
    'Session terminée, bravo pour ta régularité.',
  ],
}

// Bonus de première session du jour (F4) : un message, jamais de points.
export const FIRST_OF_DAY = [
  'Première session du jour : bien commencé !',
  'Tu as lancé ta journée de révision, belle initiative.',
  'Premier pas du jour accompli, le plus dur est fait.',
  'Une première session aujourd’hui : le rythme est lancé.',
]

/**
 * Choix déterministe d'une variante : le même bilan donne toujours le même message (pas d'aléa au rendu,
 * donc pas de texte qui change à chaque mise à jour de l'écran), mais le message varie d'un jour et d'une
 * session à l'autre.
 *
 * @param {string[]} pool
 * @param {number} seed
 * @returns {string}
 */
export function pickVariant(pool, seed) {
  const n = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0
  return pool[n % pool.length]
}

/**
 * Niveau d'un score de session.
 *
 * @param {number|null|undefined} scorePercent - 0 à 100 ; null = pas de score
 * @returns {'excellent'|'good'|'effort'|'neutral'}
 */
export function scoreTone(scorePercent) {
  if (typeof scorePercent !== 'number' || Number.isNaN(scorePercent)) return 'neutral'
  if (scorePercent >= 90) return 'excellent'
  if (scorePercent >= 60) return 'good'
  return 'effort'
}

/**
 * Message de fin de session à partir du bilan de l'API (GET /badges/me/session-feedback).
 *
 * @param {object|null} feedback - { date, firstOfDay, practicesToday, streakCurrent, streakExtended, dailyGoalAchieved }
 * @param {{ scorePercent?: number|null }} [options] - score de la session (0-100) ; null = pas de score
 * @returns {{ tone: string, message: string, bonus: string|null, streak: string|null, goal: string|null, freeze: string|null, challenge: string|null }|null}
 */
export function sessionEncouragement(feedback, { scorePercent = null } = {}) {
  if (!feedback) return null
  const seed = Number(String(feedback.date ?? '').replaceAll('-', '')) + (feedback.practicesToday ?? 0)
  const tone = scoreTone(scorePercent)
  return {
    tone,
    message: pickVariant(ENCOURAGEMENTS[tone], seed),
    bonus: feedback.firstOfDay ? pickVariant(FIRST_OF_DAY, seed) : null,
    streak: feedback.streakExtended ? `Ta série passe à ${feedback.streakCurrent} jours.` : null,
    goal: feedback.dailyGoalAchieved ? 'Objectif du jour atteint, bravo !' : null,
    // Défi du jour (A4) relevé par cette session
    challenge: feedback.challengeDone ? `Défi du jour relevé${feedback.challengeSubject ? ` : ${feedback.challengeSubject}` : ''} !` : null,
    // Gel de série (A3) : annoncé quand il vient de servir (la série est sauvée) ou d'être gagné
    freeze: feedback.freezeUsed
      ? 'Un gel de série a protégé ta série : tu l’as gardée, bravo !'
      : feedback.freezeEarned
        ? 'Tu as gagné un gel de série grâce à ta régularité.'
        : null,
  }
}
