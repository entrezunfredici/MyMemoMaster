const { fn, col } = require('sequelize')
const { LeitnerSystem, LeitnerBox, LeitnerCard, LeitnerReviewSession, TestResult, Test, ClassGroup, Subject } = require('../models/index')
const userActivityDayService = require('./UserActivityDay.service')
const { dayString, dayBounds } = require('../helpers/badges/zone')
const { dayNumber } = require('../helpers/badges/streak')

// Une matière est « délaissée » quand sa dernière pratique (avant aujourd'hui) date d'au moins 7 jours.
const NEGLECT_DAYS = 7

class DailyChallengeService {
  /**
   * Défi du jour (A4) : réviser la matière la plus délaissée.
   *
   * Le défi est DÉRIVÉ, pas stocké : il se calcule à partir de la pratique antérieure à aujourd'hui, donc il
   * reste le même toute la journée, même une fois relevé (la matière n'est plus « délaissée » après la
   * pratique, mais le défi du jour, lui, ne change pas). Une matière est candidate si l'utilisateur peut la
   * pratiquer (un système Leitner avec au moins une carte, ou des exercices personnels déjà faits) et qu'il
   * ne l'a pas pratiquée depuis 7 jours ou jamais. Les exercices de groupe ne comptent pas (comme pour les badges).
   * Priorité : la matière pratiquée il y a le plus longtemps, puis celles jamais pratiquées.
   *
   * @param {number} userId
   * @param {Date} [now]
   * @returns {Promise<{ date: string, available: boolean, subject: { subjectId: number, name: string|null }|null,
   *   daysSince: number|null, done: boolean, practicesToday: number }>}
   *   `daysSince` : jours depuis la dernière pratique (null = jamais pratiquée) ; `practicesToday` : pratiques
   *   du jour dans cette matière
   */
  async get(userId, now = new Date()) {
    const zone = await userActivityDayService.getZone(userId)
    const { start, end } = dayBounds(now, zone)
    const today = dayString(now, zone)
    const none = { date: today, available: false, subject: null, daysSince: null, done: false, practicesToday: 0 }

    const [systems, sessions, results] = await Promise.all([
      LeitnerSystem.findAll({ where: { idUser: userId }, attributes: ['idSystem', 'subjectId'], raw: true }),
      LeitnerReviewSession.findAll({
        where: { userId },
        attributes: ['completedAt'],
        include: [{ model: LeitnerSystem, as: 'system', attributes: ['subjectId'], required: true }]
      }),
      TestResult.findAll({
        where: { userId },
        attributes: ['completedAt'],
        include: [
          {
            model: Test,
            as: 'test',
            attributes: ['subjectId'],
            required: true,
            include: [{ model: ClassGroup, as: 'classGroups', through: { attributes: [] }, required: false, attributes: ['id'] }]
          }
        ]
      })
    ])

    const revisable = await this.subjectsWithCards(systems)
    // Pratiques par matière : instants (sessions Leitner et exercices personnels)
    const practices = new Map()
    const add = (subjectId, at) => {
      if (subjectId == null || !at) return
      if (!practices.has(subjectId)) practices.set(subjectId, [])
      practices.get(subjectId).push(new Date(at))
    }
    sessions.forEach((session) => add(session.system?.subjectId, session.completedAt))
    results.forEach((result) => {
      if (!result.test?.classGroups?.length) add(result.test?.subjectId, result.completedAt)
    })

    const candidates = new Set([...revisable, ...practices.keys()])
    const ranked = []
    for (const subjectId of candidates) {
      const instants = practices.get(subjectId) || []
      const before = instants.filter((at) => at < start)
      const todayCount = instants.filter((at) => at >= start && at <= end).length
      if (before.length === 0 && !revisable.has(subjectId)) continue // jamais pratiquée et rien à réviser
      const last = before.length ? new Date(Math.max(...before.map((at) => at.getTime()))) : null
      const daysSince = last ? dayNumber(today) - dayNumber(dayString(last, zone)) : null
      if (daysSince !== null && daysSince < NEGLECT_DAYS) continue
      ranked.push({ subjectId, daysSince, todayCount })
    }
    if (ranked.length === 0) return none

    // Pratiquée il y a le plus longtemps d'abord ; jamais pratiquée ensuite ; à égalité, identifiant croissant
    ranked.sort((a, b) => (b.daysSince ?? -1) - (a.daysSince ?? -1) || a.subjectId - b.subjectId)
    const chosen = ranked[0]
    const subject = await Subject.findOne({ where: { subjectId: chosen.subjectId }, attributes: ['subjectId', 'name'], raw: true })
    return {
      date: today,
      available: true,
      subject: { subjectId: chosen.subjectId, name: subject?.name ?? null },
      daysSince: chosen.daysSince,
      done: chosen.todayCount > 0,
      practicesToday: chosen.todayCount
    }
  }

  /**
   * Matières des systèmes Leitner qui contiennent au moins une carte (un système vide ne peut pas être révisé).
   *
   * @param {Array<{ idSystem: number, subjectId: number|null }>} systems
   * @returns {Promise<Set<number>>}
   */
  async subjectsWithCards(systems) {
    const withSubject = systems.filter((system) => system.subjectId != null)
    if (withSubject.length === 0) return new Set()
    const boxes = await LeitnerBox.findAll({ where: { idSystem: withSubject.map((s) => s.idSystem) }, attributes: ['idBox', 'idSystem'], raw: true })
    if (boxes.length === 0) return new Set()
    const counts = await LeitnerCard.findAll({
      where: { idBox: boxes.map((box) => box.idBox) },
      attributes: ['idBox', [fn('COUNT', col('idCard')), 'cardCount']],
      group: ['idBox'],
      raw: true
    })
    const filledBoxes = new Set(counts.filter((row) => Number(row.cardCount) > 0).map((row) => row.idBox))
    const filledSystems = new Set(boxes.filter((box) => filledBoxes.has(box.idBox)).map((box) => box.idSystem))
    return new Set(withSubject.filter((system) => filledSystems.has(system.idSystem)).map((system) => system.subjectId))
  }
}

module.exports = new DailyChallengeService()
module.exports.NEGLECT_DAYS = NEGLECT_DAYS
