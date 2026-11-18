const { Subject } = require('../models/index')
const badgeService = require('./Badge.service')
const { levelForSubject } = require('../helpers/badges/subjectLevels')

// Boîtes de Leitner à partir desquelles une carte est considérée maîtrisée (comme le badge leitnerMastery).
const MASTERED_BOX_LEVEL = 4

class SubjectLevelService {
  /**
   * Niveau de l'utilisateur dans chaque matière où il a une activité : au moins une carte dans un de ses
   * systèmes, ou un exercice personnel terminé (les exercices de groupe ne comptent pas, comme pour les
   * badges). Triées du niveau le plus haut au plus bas, puis par cartes maîtrisées.
   *
   * @param {number} userId
   * @returns {Promise<Array<{ subjectId: number, name: string|null, rank: number, level: object, next: object|null,
   *   stats: { masteredCards: number, totalCards: number, exercises: number, averagePercent: number } }>>}
   */
  async list(userId) {
    const raw = await badgeService.loadRaw(userId)
    const bySubject = new Map()
    const entry = (subjectId) => {
      if (!bySubject.has(subjectId)) bySubject.set(subjectId, { masteredCards: 0, totalCards: 0, percents: [] })
      return bySubject.get(subjectId)
    }

    for (const system of raw.systems) {
      const subjectId = system.subject?.subjectId
      if (subjectId == null) continue
      const stats = entry(subjectId)
      for (const box of system.leitnerBoxes || []) {
        const count = box.cardCount ?? 0
        stats.totalCards += count
        if (box.level >= MASTERED_BOX_LEVEL) stats.masteredCards += count
      }
    }
    for (const result of raw.testResults) {
      const subjectId = result.test?.subjectId
      if (subjectId == null || result.test?.classGroups?.length || !(result.total > 0)) continue
      entry(subjectId).percents.push((result.score / result.total) * 100)
    }

    // Une matière dont le système est vide et sans exercice n'a rien à montrer
    const active = [...bySubject.entries()].filter(([, stats]) => stats.totalCards > 0 || stats.percents.length > 0)
    if (active.length === 0) return []

    const subjects = await Subject.findAll({ where: { subjectId: active.map(([id]) => id) }, attributes: ['subjectId', 'name'], raw: true })
    const nameById = new Map(subjects.map((subject) => [subject.subjectId, subject.name]))

    return active
      .map(([subjectId, stats]) => {
        const exercises = stats.percents.length
        const averagePercent = exercises ? Math.round(stats.percents.reduce((sum, p) => sum + p, 0) / exercises) : 0
        const summary = { masteredCards: stats.masteredCards, exercises, averagePercent }
        const { rank, level, next } = levelForSubject(summary)
        return {
          subjectId,
          name: nameById.get(subjectId) ?? null,
          rank,
          level,
          next,
          stats: { ...summary, totalCards: stats.totalCards }
        }
      })
      .sort((a, b) => b.rank - a.rank || b.stats.masteredCards - a.stats.masteredCards || String(a.name).localeCompare(String(b.name), 'fr'))
  }
}

module.exports = new SubjectLevelService()
module.exports.MASTERED_BOX_LEVEL = MASTERED_BOX_LEVEL
