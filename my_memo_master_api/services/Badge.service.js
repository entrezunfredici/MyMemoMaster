const dayjs = require('dayjs')
const { UniqueConstraintError } = require('sequelize')
const {
  UserBadge,
  UserActivityDay,
  BadgeSubject,
  instance,
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
// Seuil du badge leitnerMastery (catalog.js) : sert à savoir quels systèmes y ont contribué.
const MASTERY_TARGET_PERCENT = 50

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

    const values = await this.measure(userId, candidates, now)
    const awarded = []
    for (const badge of candidates) {
      const { value, subjectIds } = values.get(badge.code)
      if (value < badge.target) continue
      try {
        await UserBadge.create({ userId, badgeCode: badge.code, earnedAt: now, seenAt: markSeen ? now : null, context: { value, subjectIds } })
        awarded.push(badge.code)
      } catch (error) {
        // Obtenu entre-temps par une évaluation concurrente : rien à faire (idempotence)
        if (!(error instanceof UniqueConstraintError)) throw error
      }
    }
    return awarded
  }

  /**
   * Liens badge ↔ matières (table BadgeSubject).
   *
   * @returns {Promise<Map<string, number[]>>} code de badge → identifiants de matières (absent = badge global)
   */
  async loadLinks() {
    const rows = await BadgeSubject.findAll({ attributes: ['badgeCode', 'subjectId'], raw: true })
    const links = new Map()
    rows.forEach((row) => links.set(row.badgeCode, [...(links.get(row.badgeCode) || []), row.subjectId]))
    return links
  }

  /**
   * Matières qui restreignent le critère d'un badge : uniquement pour un badge restreignable et lié.
   *
   * @param {object} badge - entrée du catalogue
   * @param {Map<string, number[]>} links
   * @returns {number[]|null} null = critère global
   */
  scopeOf(badge, links) {
    const subjectIds = links.get(badge.code)
    return badge.scopable && subjectIds && subjectIds.length > 0 ? subjectIds : null
  }

  /**
   * Données brutes d'un utilisateur, lues une fois puis filtrées par matière selon le badge.
   *
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async loadRaw(userId) {
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
      LeitnerReviewSession.findAll({
        where: { userId },
        attributes: ['cardsReviewed'],
        include: [{ model: LeitnerSystem, as: 'system', attributes: ['subjectId'], required: true }]
      }),
      LeitnerSystem.findAll({
        where: { idUser: userId },
        include: [
          { model: LeitnerBox, as: 'leitnerBoxes', include: [{ model: LeitnerCard, as: 'leitnerCards', attributes: ['idCard'] }] },
          { model: Subject, as: 'subject', attributes: ['subjectId'] }
        ]
      })
    ])
    return { dates, testResults, leitnerSessions, systems }
  }

  /**
   * Mesures utilisées par les critères du catalogue. Les exercices de groupe comptent pour
   * l'activité mais pas pour les badges d'exercices ni de score (comme le KPI personnel).
   *
   * @param {object} raw - résultat de loadRaw
   * @param {Date} [now]
   * @param {number[]|null} [subjectIds] - si fourni, ne compte que l'activité de ces matières
   *   (jours d'activité exclus : ils ne se découpent pas par matière, voir `scopable` du catalogue)
   * @returns {object} statistiques
   */
  computeStats(raw, now = new Date(), subjectIds = null) {
    const today = dayjs(now).format('YYYY-MM-DD')
    const inScope = (subjectId) => !subjectIds || subjectIds.includes(subjectId)
    const testResults = raw.testResults.filter((r) => inScope(r.test?.subjectId))
    const leitnerSessions = raw.leitnerSessions.filter((s) => inScope(s.system?.subjectId))
    const systems = raw.systems.filter((s) => inScope(s.subject?.subjectId))

    const { current, best } = computeStreaks(raw.dates, today)
    const windowStart = dayjs(today).subtract(29, 'day').format('YYYY-MM-DD')

    const privateResults = testResults.filter((r) => !r.test?.classGroups?.length)
    const distinctSubjects = new Set()
    privateResults.forEach((r) => r.test?.subject && distinctSubjects.add(r.test.subject.subjectId))
    systems.forEach((s) => s.subject && distinctSubjects.add(s.subject.subjectId))

    let bestLeitnerMastery = 0
    const masteredSystems = []
    for (const system of systems) {
      let total = 0
      let advanced = 0
      for (const box of system.leitnerBoxes || []) {
        const count = (box.leitnerCards || []).length
        total += count
        if (box.level >= 4) advanced += count
      }
      if (total >= MIN_CARDS_FOR_MASTERY) {
        const mastery = Math.round((advanced / total) * 100)
        bestLeitnerMastery = Math.max(bestLeitnerMastery, mastery)
        if (mastery >= MASTERY_TARGET_PERCENT) masteredSystems.push(system)
      }
    }

    const uniqueSubjects = (items, pick) => [...new Set(items.map(pick).filter((id) => id != null))].sort((a, b) => a - b)

    return {
      subjectsAllExercises: uniqueSubjects(testResults, (r) => r.test?.subjectId),
      subjectsPrivateExercises: uniqueSubjects(privateResults, (r) => r.test?.subjectId),
      subjectsPerfectScores: uniqueSubjects(
        privateResults.filter((r) => r.total >= MIN_QUESTIONS_FOR_PERFECT && r.score >= r.total),
        (r) => r.test?.subjectId
      ),
      subjectsLeitnerSessions: uniqueSubjects(leitnerSessions, (s) => s.system?.subjectId),
      subjectsMastered: uniqueSubjects(masteredSystems, (s) => s.subject?.subjectId),
      streakCurrent: current,
      streakBest: best,
      activeDaysLast30: raw.dates.filter((d) => d >= windowStart && d <= today).length,
      exerciseCount: testResults.length,
      privateExerciseCount: privateResults.length,
      hasPerfectScore: privateResults.some((r) => r.total >= MIN_QUESTIONS_FOR_PERFECT && r.score >= r.total),
      leitnerSessionCount: leitnerSessions.length,
      cardsReviewedTotal: leitnerSessions.reduce((sum, s) => sum + s.cardsReviewed, 0),
      bestLeitnerMastery,
      distinctSubjects: distinctSubjects.size
    }
  }

  /**
   * Statistiques globales de l'utilisateur (séries, totaux).
   *
   * @param {number} userId
   * @param {Date} [now]
   * @returns {Promise<object>}
   */
  async loadStats(userId, now = new Date()) {
    return this.computeStats(await this.loadRaw(userId), now)
  }

  /**
   * Valeur mesurée de chaque badge, en tenant compte des matières auxquelles il est lié.
   *
   * @param {number} userId
   * @param {object[]} badges - entrées du catalogue à mesurer
   * @param {Date} [now]
   * @returns {Promise<Map<string, { value: number, subjectIds: number[] }>>} code → valeur mesurée et
   *   matières dont l'activité y contribue
   */
  async measure(userId, badges, now = new Date()) {
    const [raw, links] = await Promise.all([this.loadRaw(userId), this.loadLinks()])
    const cache = new Map()
    const values = new Map()
    for (const badge of badges) {
      const scope = this.scopeOf(badge, links)
      const key = scope ? [...scope].sort((a, b) => a - b).join(',') : 'global'
      if (!cache.has(key)) cache.set(key, this.computeStats(raw, now, scope))
      const stats = cache.get(key)
      values.set(badge.code, { value: badge.value(stats), subjectIds: badge.contributors(stats) })
    }
    return values
  }

  /**
   * Catalogue complet avec l'état de l'utilisateur : obtenu (date, vu) ou progression.
   *
   * @param {number} userId
   * @returns {Promise<object[]>}
   */
  async list(userId) {
    const [rows, links] = await Promise.all([UserBadge.findAll({ where: { userId } }), this.loadLinks()])
    const byCode = new Map(rows.map((row) => [row.badgeCode, row]))
    const values = await this.measure(userId, CATALOG.filter((badge) => !byCode.has(badge.code)))
    return CATALOG.map((badge) => {
      const row = byCode.get(badge.code)
      return {
        code: badge.code,
        category: badge.category,
        rarity: badge.rarity,
        icon: badge.icon,
        label: badge.label,
        description: badge.description,
        scopable: badge.scopable,
        linkedSubjectIds: links.get(badge.code) || [],
        earnedSubjectIds: row?.context?.subjectIds || [],
        earned: Boolean(row),
        earnedAt: row ? row.earnedAt : null,
        seenAt: row ? row.seenAt : null,
        progress: { current: row ? badge.target : Math.min(values.get(badge.code).value, badge.target), target: badge.target }
      }
    })
  }

  /**
   * Badges obtenus visibles par un enseignant qui n'a le consentement que pour certaines matières :
   * ceux obtenus avec au moins une matière consentie (matières enregistrées à l'obtention, qu'un lien
   * administrateur existe ou non). Un badge sans matière (série, régularité) n'est jamais montré ici.
   * Seules les matières consenties sont renvoyées (aucune fuite des autres matières).
   *
   * @param {number} userId - l'étudiant
   * @param {number[]} consentedSubjectIds
   * @returns {Promise<object[]>} au format historique de `kpis.badges`, tous `unlocked`
   */
  async listForSubjects(userId, consentedSubjectIds) {
    const badges = await this.list(userId)
    const visible = badges
      .filter((badge) => badge.earned && badge.earnedSubjectIds.some((id) => consentedSubjectIds.includes(id)))
      .map((badge) => ({
        id: badge.code,
        ...badge,
        earnedSubjectIds: badge.earnedSubjectIds.filter((id) => consentedSubjectIds.includes(id)),
        linkedSubjectIds: badge.linkedSubjectIds.filter((id) => consentedSubjectIds.includes(id)),
        unlocked: true
      }))
    return await this.withSubjectNames(visible)
  }

  /**
   * Ajoute `earnedSubjects: [{ subjectId, name }]` à chaque badge, pour qu'un enseignant sache avec
   * quelle matière un badge a été obtenu. Une seule requête, et aucune si aucun badge n'a de matière.
   *
   * @param {object[]} badges - badges portant `earnedSubjectIds`
   * @returns {Promise<object[]>}
   */
  async withSubjectNames(badges) {
    const ids = [...new Set(badges.flatMap((badge) => badge.earnedSubjectIds))]
    const subjects = ids.length > 0 ? await Subject.findAll({ where: { subjectId: ids }, attributes: ['subjectId', 'name'], raw: true }) : []
    const nameById = new Map(subjects.map((subject) => [subject.subjectId, subject.name]))
    return badges.map((badge) => ({
      ...badge,
      earnedSubjects: badge.earnedSubjectIds.map((subjectId) => ({ subjectId, name: nameById.get(subjectId) || null }))
    }))
  }

  /**
   * Remplace les matières liées à un badge (many-to-many). Les badges déjà obtenus restent acquis.
   *
   * @param {string} badgeCode
   * @param {number[]} subjectIds - vide = badge global
   * @returns {Promise<number[]>} matières liées après modification
   * @throws {Error} code BADGE_NOT_FOUND, BADGE_NOT_SCOPABLE ou SUBJECT_NOT_FOUND
   */
  async setSubjects(badgeCode, subjectIds) {
    const badge = CATALOG_BY_CODE.get(badgeCode)
    if (!badge) throw Object.assign(new Error('Badge introuvable.'), { code: 'BADGE_NOT_FOUND' })
    const unique = [...new Set(subjectIds)]
    if (unique.length > 0 && !badge.scopable) {
      throw Object.assign(new Error('Ce badge ne peut pas être lié à des matières.'), { code: 'BADGE_NOT_SCOPABLE' })
    }
    if (unique.length > 0 && (await Subject.count({ where: { subjectId: unique } })) !== unique.length) {
      throw Object.assign(new Error('Une ou plusieurs matières sont introuvables.'), { code: 'SUBJECT_NOT_FOUND' })
    }
    await instance.transaction(async (transaction) => {
      await BadgeSubject.destroy({ where: { badgeCode }, transaction })
      if (unique.length > 0) await BadgeSubject.bulkCreate(unique.map((subjectId) => ({ badgeCode, subjectId })), { transaction })
    })
    return unique
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
    // Avec un consentement global, l'enseignant voit les mêmes badges que l'étudiant, matières comprises
    return await this.withSubjectNames(badges.map((badge) => ({ id: badge.code, ...badge, unlocked: badge.earned })))
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
   * Renseigne les matières d'obtention des badges obtenus avant leur enregistrement
   * (`context.subjectIds` absent). Sans cela, ces badges restent invisibles pour un enseignant sous
   * consentement par matières. Les matières sont reconstruites depuis l'activité actuelle, donc
   * approximatives : elles peuvent inclure une matière pratiquée après l'obtention du badge.
   * Les badges sans matière (séries, régularité) reçoivent une liste vide. Rejouable.
   *
   * @param {number} userId
   * @returns {Promise<number>} nombre de badges mis à jour
   */
  async repairEarnedSubjects(userId) {
    const rows = await UserBadge.findAll({ where: { userId } })
    const missing = rows.filter((row) => CATALOG_BY_CODE.has(row.badgeCode) && !Array.isArray(row.context?.subjectIds))
    if (missing.length === 0) return 0

    const values = await this.measure(userId, missing.map((row) => CATALOG_BY_CODE.get(row.badgeCode)))
    for (const row of missing) {
      await row.update({ context: { ...(row.context || {}), subjectIds: values.get(row.badgeCode).subjectIds } })
    }
    return missing.length
  }

  /**
   * Rattrapage : reconstruit les jours d'activité depuis l'historique, attribue les badges
   * mérités (marqués « vus » : pas de rafale d'animations au déploiement) et renseigne les
   * matières d'obtention manquantes. Rejouable.
   *
   * @param {number} userId
   * @returns {Promise<{ activityDaysAdded: number, awarded: string[], subjectsRepaired: number }>}
   */
  async backfill(userId) {
    const activityDaysAdded = await userActivityDayService.rebuildFromHistory(userId)
    const awarded = await this.evaluate(userId, { markSeen: true })
    const subjectsRepaired = await this.repairEarnedSubjects(userId)
    return { activityDaysAdded, awarded, subjectsRepaired }
  }
}

module.exports = new BadgeService()
