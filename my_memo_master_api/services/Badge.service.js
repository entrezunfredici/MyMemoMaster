const dayjs = require('dayjs')
const { UniqueConstraintError } = require('sequelize')
const {
  UserBadge,
  UserActivityDay,
  TestResult,
  Test,
  Subject,
  ClassGroup,
  LeitnerSystem,
  LeitnerBox,
  LeitnerCard,
  LeitnerReviewSession
} = require('../models/index')
const userActivityDayService = require('./UserActivityDay.service')
const { computeStreaks } = require('../helpers/badges/streak')
const { CATALOG, CATALOG_BY_CODE, ACTIVITY_EVENTS, levelFor } = require('../helpers/badges/catalog')

// Plancher de cartes pour qu'un taux de maîtrise ait un sens (50 % de 2 cartes ne prouve rien).
const MIN_CARDS_FOR_MASTERY = 20
// Un « 100 % » sur une ou deux questions ne prouve rien non plus.
const MIN_QUESTIONS_FOR_PERFECT = 3

class BadgeService {
  /**
   * Réagit à un événement métier : enregistre le jour d'activité si l'événement est une pratique
   * réelle, puis attribue les badges concernés dont le critère est atteint.
   *
   * @param {string} type - ex. 'exercise.submitted', 'leitner.session.completed', 'mindmap.viewed'
   * @param {{ userId: number }} payload
   * @param {Date} [now] - instant de l'événement (défaut : maintenant)
   * @returns {Promise<string[]>} codes des badges nouvellement obtenus
   */
  async handle(type, payload, now = new Date()) {
    const { userId } = payload
    if (!userId) return []
    if (ACTIVITY_EVENTS.includes(type)) await userActivityDayService.record(userId, now)
    return await this.evaluate(userId, { eventType: type, now })
  }

  /**
   * Évalue les badges non encore obtenus et attribue ceux dont le critère est atteint.
   * Idempotent : l'unicité (userId, badgeCode) empêche tout doublon, même en concurrence.
   *
   * @param {number} userId
   * @param {{ eventType?: string, now?: Date, markSeen?: boolean }} [options] - eventType restreint
   *   l'évaluation aux badges liés à cet événement ; markSeen évite l'animation (rattrapage)
   * @returns {Promise<string[]>} codes des badges nouvellement obtenus
   */
  async evaluate(userId, { eventType = null, now = new Date(), markSeen = false } = {}) {
    const earnedRows = await UserBadge.findAll({ where: { userId }, attributes: ['badgeCode'], raw: true })
    const earned = new Set(earnedRows.map((row) => row.badgeCode))
    const candidates = CATALOG.filter((badge) => !earned.has(badge.code) && (!eventType || badge.events.includes(eventType)))
    if (candidates.length === 0) return []

    const stats = await this.loadStats(userId, now)
    const awarded = []
    for (const badge of candidates) {
      const value = badge.value(stats)
      if (value < badge.target) continue
      try {
        await UserBadge.create({ userId, badgeCode: badge.code, earnedAt: now, seenAt: markSeen ? now : null, context: { value } })
        awarded.push(badge.code)
      } catch (error) {
        // Obtenu entre-temps par une évaluation concurrente : rien à faire (idempotence)
        if (!(error instanceof UniqueConstraintError)) throw error
      }
    }
    return awarded
  }

  /**
   * Mesures utilisées par les critères du catalogue. Les exercices de groupe comptent pour
   * l'activité mais pas pour les badges d'exercices ni de score (comme le KPI personnel).
   *
   * @param {number} userId
   * @param {Date} [now]
   * @returns {Promise<object>} statistiques de l'utilisateur
   */
  async loadStats(userId, now = new Date()) {
    const today = dayjs(now).format('YYYY-MM-DD')
    const [dates, testResults, leitnerSessions, systems] = await Promise.all([
      userActivityDayService.findDates(userId),
      TestResult.findAll({
        where: { userId },
        include: [
          {
            model: Test,
            as: 'test',
            attributes: ['testId', 'subjectId'],
            required: true,
            include: [
              { model: Subject, as: 'subject', attributes: ['subjectId'] },
              { model: ClassGroup, as: 'classGroups', through: { attributes: [] }, required: false, attributes: ['id'] }
            ]
          }
        ]
      }),
      LeitnerReviewSession.findAll({ where: { userId }, attributes: ['cardsReviewed'], raw: true }),
      LeitnerSystem.findAll({
        where: { idUser: userId },
        include: [
          { model: LeitnerBox, as: 'leitnerBoxes', include: [{ model: LeitnerCard, as: 'leitnerCards', attributes: ['idCard'] }] },
          { model: Subject, as: 'subject', attributes: ['subjectId'] }
        ]
      })
    ])

    const { current, best } = computeStreaks(dates, today)
    const windowStart = dayjs(today).subtract(29, 'day').format('YYYY-MM-DD')

    const privateResults = testResults.filter((r) => !r.test?.classGroups?.length)
    const subjectIds = new Set()
    privateResults.forEach((r) => r.test?.subject && subjectIds.add(r.test.subject.subjectId))
    systems.forEach((s) => s.subject && subjectIds.add(s.subject.subjectId))

    let bestLeitnerMastery = 0
    for (const system of systems) {
      let total = 0
      let advanced = 0
      for (const box of system.leitnerBoxes || []) {
        const count = (box.leitnerCards || []).length
        total += count
        if (box.level >= 4) advanced += count
      }
      if (total >= MIN_CARDS_FOR_MASTERY) {
        bestLeitnerMastery = Math.max(bestLeitnerMastery, Math.round((advanced / total) * 100))
      }
    }

    return {
      streakCurrent: current,
      streakBest: best,
      activeDaysLast30: dates.filter((d) => d >= windowStart && d <= today).length,
      exerciseCount: testResults.length,
      privateExerciseCount: privateResults.length,
      hasPerfectScore: privateResults.some((r) => r.total >= MIN_QUESTIONS_FOR_PERFECT && r.score >= r.total),
      leitnerSessionCount: leitnerSessions.length,
      cardsReviewedTotal: leitnerSessions.reduce((sum, s) => sum + s.cardsReviewed, 0),
      bestLeitnerMastery,
      distinctSubjects: subjectIds.size
    }
  }

  /**
   * Catalogue complet avec l'état de l'utilisateur : obtenu (date, vu) ou progression.
   *
   * @param {number} userId
   * @returns {Promise<object[]>}
   */
  async list(userId) {
    const [rows, stats] = await Promise.all([UserBadge.findAll({ where: { userId } }), this.loadStats(userId)])
    const byCode = new Map(rows.map((row) => [row.badgeCode, row]))
    return CATALOG.map((badge) => {
      const row = byCode.get(badge.code)
      return {
        code: badge.code,
        category: badge.category,
        rarity: badge.rarity,
        icon: badge.icon,
        label: badge.label,
        description: badge.description,
        earned: Boolean(row),
        earnedAt: row ? row.earnedAt : null,
        seenAt: row ? row.seenAt : null,
        progress: { current: row ? badge.target : Math.min(badge.value(stats), badge.target), target: badge.target }
      }
    })
  }

  /**
   * Badges au format historique de `kpis.badges` (id, label, description, icon, unlocked), enrichi
   * (code, rarity, category, earnedAt, progress). Un utilisateur sans aucune donnée de gamification
   * (compte antérieur au déploiement) est rattrapé une fois, silencieusement, pour ne pas voir ses
   * badges disparaître en attendant le script `badges:backfill`.
   *
   * @param {number} userId
   * @returns {Promise<object[]>}
   */
  async listForKpi(userId) {
    const [badgeCount, dayCount] = await Promise.all([UserBadge.count({ where: { userId } }), UserActivityDay.count({ where: { userId } })])
    if (badgeCount === 0 && dayCount === 0) await this.backfill(userId)
    const badges = await this.list(userId)
    return badges.map((badge) => ({ id: badge.code, ...badge, unlocked: badge.earned }))
  }

  /**
   * Badges obtenus dont l'obtention n'a pas encore été vue (animation à jouer).
   *
   * @param {number} userId
   * @returns {Promise<object[]>} du plus ancien au plus récent
   */
  async findRecent(userId) {
    const rows = await UserBadge.findAll({ where: { userId, seenAt: null }, order: [['earnedAt', 'ASC'], ['id', 'ASC']] })
    return rows
      .filter((row) => CATALOG_BY_CODE.has(row.badgeCode))
      .map((row) => {
        const badge = CATALOG_BY_CODE.get(row.badgeCode)
        return {
          code: badge.code,
          category: badge.category,
          rarity: badge.rarity,
          icon: badge.icon,
          label: badge.label,
          description: badge.description,
          earnedAt: row.earnedAt
        }
      })
  }

  /**
   * Marque des badges comme vus. Les codes inconnus ou non obtenus sont ignorés.
   *
   * @param {number} userId
   * @param {string[]} codes
   * @returns {Promise<number>} nombre de badges marqués
   */
  async markSeen(userId, codes) {
    const [count] = await UserBadge.update({ seenAt: new Date() }, { where: { userId, badgeCode: codes, seenAt: null } })
    return count
  }

  /**
   * Résumé du profil gamifié : niveau, badges obtenus, séries.
   *
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async summary(userId) {
    const [earnedCount, stats] = await Promise.all([UserBadge.count({ where: { userId } }), this.loadStats(userId)])
    const level = levelFor(earnedCount)
    return {
      level: { name: level.name, next: level.next },
      earnedCount,
      totalCount: CATALOG.length,
      streakCurrent: stats.streakCurrent,
      streakBest: stats.streakBest
    }
  }

  /**
   * Rattrapage : reconstruit les jours d'activité depuis l'historique puis attribue les badges
   * mérités, marqués « vus » (pas de rafale d'animations au déploiement). Rejouable.
   *
   * @param {number} userId
   * @returns {Promise<{ activityDaysAdded: number, awarded: string[] }>}
   */
  async backfill(userId) {
    const activityDaysAdded = await userActivityDayService.rebuildFromHistory(userId)
    const awarded = await this.evaluate(userId, { markSeen: true })
    return { activityDaysAdded, awarded }
  }
}

module.exports = new BadgeService()
