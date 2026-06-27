const dayjs = require('dayjs')
const { RevisionSession, TestResult, Test, Subject, LeitnerSystem, LeitnerBox, LeitnerCard } = require('../models')

/**
 * Retourne le lundi de la semaine (ISO) contenant la date donnée.
 * @param {string|Dayjs} date
 * @returns {string} YYYY-MM-DD
 */
function isoWeekStart(date) {
  const d = dayjs(date)
  const day = d.day() // 0=Dim, 1=Lun…6=Sam
  const offset = day === 0 ? 6 : day - 1
  return d.subtract(offset, 'day').format('YYYY-MM-DD')
}

class KpiService {
  /**
   * Calcule tous les KPI personnels d'un étudiant.
   *
   * @param {number} userId - ID de l'utilisateur
   * @returns {object} KPI agrégés (révision, exercices, leitner, sujets, discipline, badges)
   */
  async getMyKpis(userId) {
    const [sessions, testResults, leitnerSystems] = await Promise.all([
      RevisionSession.findAll({ where: { userId }, order: [['date', 'DESC']] }),
      TestResult.findAll({
        where: { userId },
        include: [
          {
            model: Test,
            as: 'test',
            attributes: ['testId', 'name', 'subjectId'],
            include: [{ model: Subject, as: 'subject', attributes: ['subjectId', 'name'] }]
          }
        ],
        order: [['completedAt', 'ASC']]
      }),
      LeitnerSystem.findAll({
        where: { idUser: userId },
        include: [
          {
            model: LeitnerBox,
            as: 'leitnerBoxes',
            include: [{ model: LeitnerCard, as: 'leitnerCards' }]
          },
          { model: Subject, as: 'subject', attributes: ['subjectId', 'name'] }
        ]
      })
    ])

    const revisionKpi = this._computeRevision(sessions)
    const exercisesKpi = this._computeExercises(testResults)
    const leitnerKpi = this._computeLeitner(leitnerSystems)
    const subjectsKpi = this._computeSubjects(testResults, leitnerSystems)
    const disciplineKpi = this._computeDiscipline(sessions)
    const badges = this._computeBadges({ revisionKpi, exercisesKpi, leitnerKpi, subjectsKpi })

    return { revision: revisionKpi, exercises: exercisesKpi, leitner: leitnerKpi, subjects: subjectsKpi, discipline: disciplineKpi, badges }
  }

  /**
   * Calcule les KPI personnels filtrés par matières consenties.
   * Leitner et exercices sont filtrés par subjectIds.
   * Révision et discipline sont partagées telles quelles (données générales non liées à une matière).
   *
   * @param {number} userId
   * @param {number[]} subjectIds - Liste des subjectId consentis
   * @returns {object} KPI filtrés
   */
  async getPersonalKpisForSubjects(userId, subjectIds) {
    const [sessions, testResults, leitnerSystems] = await Promise.all([
      RevisionSession.findAll({ where: { userId }, order: [['date', 'DESC']] }),
      TestResult.findAll({
        where: { userId },
        include: [
          {
            model: Test,
            as: 'test',
            attributes: ['testId', 'name', 'subjectId'],
            where: { subjectId: subjectIds },
            required: true,
            include: [{ model: Subject, as: 'subject', attributes: ['subjectId', 'name'] }]
          }
        ],
        order: [['completedAt', 'ASC']]
      }),
      LeitnerSystem.findAll({
        where: { idUser: userId, subjectId: subjectIds },
        include: [
          {
            model: LeitnerBox,
            as: 'leitnerBoxes',
            include: [{ model: LeitnerCard, as: 'leitnerCards' }]
          },
          { model: Subject, as: 'subject', attributes: ['subjectId', 'name'] }
        ]
      })
    ])

    const revisionKpi = this._computeRevision(sessions)
    const exercisesKpi = this._computeExercises(testResults)
    const leitnerKpi = this._computeLeitner(leitnerSystems)
    const subjectsKpi = this._computeSubjects(testResults, leitnerSystems)
    const disciplineKpi = this._computeDiscipline(sessions)
    const badges = this._computeBadges({ revisionKpi, exercisesKpi, leitnerKpi, subjectsKpi })

    return { revision: revisionKpi, exercises: exercisesKpi, leitner: leitnerKpi, subjects: subjectsKpi, discipline: disciplineKpi, badges }
  }

  /**
   * @private
   */
  _computeRevision(sessions) {
    const completed = sessions.filter((s) => s.isDone)
    const total = sessions.length
    const totalCompleted = completed.length
    const completionRate = total > 0 ? Math.round((totalCompleted / total) * 100) : 0

    // Streak — jours consécutifs avec au moins une session complétée
    const uniqueDates = [...new Set(completed.map((s) => s.date))].sort().reverse()
    let streakDays = 0
    const today = dayjs().format('YYYY-MM-DD')
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')

    if (uniqueDates.length > 0 && (uniqueDates[0] === today || uniqueDates[0] === yesterday)) {
      let expected = dayjs(uniqueDates[0])
      for (const d of uniqueDates) {
        if (d === expected.format('YYYY-MM-DD')) {
          streakDays++
          expected = expected.subtract(1, 'day')
        } else break
      }
    }

    // 30 derniers jours
    const thirtyAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD')
    const sessionsLast30 = sessions.filter((s) => s.date >= thirtyAgo)
    const completedLast30 = sessionsLast30.filter((s) => s.isDone)

    // Activité par semaine — 8 dernières semaines
    const weeklyMap = {}
    for (let i = 7; i >= 0; i--) {
      const ws = isoWeekStart(dayjs().subtract(i, 'week').format('YYYY-MM-DD'))
      weeklyMap[ws] = 0
    }
    for (const s of sessions) {
      const ws = isoWeekStart(s.date)
      if (ws in weeklyMap) weeklyMap[ws] += s.isDone ? 1 : 0
    }
    const weeklyActivity = Object.entries(weeklyMap).map(([week, count]) => ({ week, count }))

    // Temps total en minutes sur les sessions complétées ayant startTime/endTime
    let totalMinutes = 0
    for (const s of completed) {
      if (s.startTime && s.endTime) {
        const [sh, sm] = s.startTime.split(':').map(Number)
        const [eh, em] = s.endTime.split(':').map(Number)
        const diff = eh * 60 + em - (sh * 60 + sm)
        if (diff > 0) totalMinutes += diff
      }
    }

    const revivedToday = completed.some((s) => s.date === today)

    return { totalPlanned: total, totalCompleted, completionRate, streakDays, sessionsLast30Days: sessionsLast30.length, completedLast30Days: completedLast30.length, weeklyActivity, totalMinutes, revivedToday }
  }

  /**
   * @private
   */
  _computeExercises(testResults) {
    if (testResults.length === 0) {
      return { totalTests: 0, avgScore: 0, maxScore: 0, minScore: 0, recentTrend: 0, scoreHistory: [] }
    }

    const percentages = testResults.map((r) => Math.round((r.score / r.total) * 100))
    const avgScore = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
    const maxScore = Math.max(...percentages)
    const minScore = Math.min(...percentages)

    // Tendance : moyenne deuxième moitié vs première moitié
    let recentTrend = 0
    if (percentages.length >= 4) {
      const half = Math.floor(percentages.length / 2)
      const firstAvg = percentages.slice(0, half).reduce((a, b) => a + b, 0) / half
      const lastAvg = percentages.slice(-half).reduce((a, b) => a + b, 0) / half
      recentTrend = Math.round(lastAvg - firstAvg)
    }

    const scoreHistory = [...testResults]
      .reverse()
      .slice(0, 10)
      .map((r) => ({
        date: r.completedAt,
        score: r.score,
        total: r.total,
        percentage: Math.round((r.score / r.total) * 100),
        testName: r.test?.name || 'Inconnu'
      }))

    return { totalTests: testResults.length, avgScore, maxScore, minScore, recentTrend, scoreHistory }
  }

  /**
   * @private
   */
  _computeLeitner(systems) {
    const cardsByBox = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let totalCards = 0
    let totalCorrect = 0
    let totalReviews = 0
    let cardsDue = 0
    const now = dayjs()

    for (const system of systems) {
      for (const box of system.leitnerBoxes || []) {
        const lvl = box.level
        for (const card of box.leitnerCards || []) {
          totalCards++
          if (lvl >= 1 && lvl <= 5) cardsByBox[lvl]++
          totalCorrect += card.correct_count || 0
          totalReviews += card.review_count || 0
          const nra = card.next_review_at
          if (!nra || dayjs(nra).isBefore(now) || dayjs(nra).isSame(now)) cardsDue++
        }
      }
    }

    const globalSuccessRate = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0
    const advancedCards = cardsByBox[4] + cardsByBox[5]
    const mastery = totalCards > 0 ? Math.round((advancedCards / totalCards) * 100) : 0

    return { totalCards, cardsByBox, globalSuccessRate, mastery, cardsDue }
  }

  /**
   * @private
   */
  _computeSubjects(testResults, leitnerSystems) {
    const subjectMap = {}

    for (const r of testResults) {
      const sub = r.test?.subject
      if (sub) {
        if (!subjectMap[sub.subjectId]) subjectMap[sub.subjectId] = { subjectId: sub.subjectId, name: sub.name, tests: 0, systems: 0 }
        subjectMap[sub.subjectId].tests++
      }
    }

    for (const sys of leitnerSystems) {
      if (sys.subject) {
        const sub = sys.subject
        if (!subjectMap[sub.subjectId]) subjectMap[sub.subjectId] = { subjectId: sub.subjectId, name: sub.name, tests: 0, systems: 0 }
        subjectMap[sub.subjectId].systems++
      }
    }

    const list = Object.values(subjectMap)
    return { totalUnique: list.length, list }
  }

  /**
   * @private
   */
  _computeDiscipline(sessions) {
    const today = dayjs()
    const startWeek = isoWeekStart(today.format('YYYY-MM-DD'))
    const endWeek = dayjs(startWeek).add(6, 'day').format('YYYY-MM-DD')

    const thisWeek = sessions.filter((s) => s.date >= startWeek && s.date <= endWeek)
    const plannedThisWeek = thisWeek.length
    const completedThisWeek = thisWeek.filter((s) => s.isDone).length

    const thirtyAgo = today.subtract(30, 'day').format('YYYY-MM-DD')
    const last30 = sessions.filter((s) => s.date >= thirtyAgo)
    const completedLast30 = last30.filter((s) => s.isDone)
    const disciplineScore = last30.length > 0 ? Math.round((completedLast30.length / last30.length) * 100) : 0

    return { plannedThisWeek, completedThisWeek, disciplineScore }
  }

  /**
   * @private
   */
  _computeBadges({ revisionKpi, exercisesKpi, leitnerKpi, subjectsKpi }) {
    const { streakDays, completedLast30Days } = revisionKpi
    const { totalTests, scoreHistory } = exercisesKpi
    const { mastery } = leitnerKpi
    const { totalUnique } = subjectsKpi

    const hasPerfect = scoreHistory.some((s) => s.percentage === 100)

    return [
      { id: 'streak7', label: '7 jours de suite', description: 'Réviser 7 jours consécutifs', icon: '🔥', unlocked: streakDays >= 7 },
      { id: 'streak30', label: '30 jours de suite', description: 'Réviser 30 jours consécutifs', icon: '🏆', unlocked: streakDays >= 30 },
      { id: 'perfectScore', label: 'Score parfait', description: 'Obtenir 100% à un exercice', icon: '⭐', unlocked: hasPerfect },
      { id: 'tenTests', label: '10 exercices', description: 'Compléter 10 séries d\'exercices', icon: '📚', unlocked: totalTests >= 10 },
      { id: 'fiveSubjects', label: 'Polyvalent', description: 'Étudier 5 matières différentes', icon: '🎯', unlocked: totalUnique >= 5 },
      { id: 'leitnerMastery', label: 'Maîtrise Leitner', description: 'Plus de 50% des cartes en boîte 4 ou 5', icon: '🧠', unlocked: mastery >= 50 },
      { id: 'regular', label: 'Régulier', description: '20 sessions complétées dans les 30 derniers jours', icon: '📅', unlocked: completedLast30Days >= 20 }
    ]
  }
}

module.exports = new KpiService()
