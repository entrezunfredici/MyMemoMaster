const { Op, UniqueConstraintError } = require('sequelize')
const { UserGamificationSettings, UserBadge, UserActivityDay, LeitnerReviewSession, TestResult, MindMapViewSession } = require('../models/index')
const badgeService = require('./Badge.service')
const userActivityDayService = require('./UserActivityDay.service')
const dailyChallengeService = require('./DailyChallenge.service')
const { inZone, dayString, dayBounds, isValidZone } = require('../helpers/badges/zone')
const { computeStreaks } = require('../helpers/badges/streak')
const { CATALOG_BY_CODE } = require('../helpers/badges/catalog')

const MAX_SHOWCASE = 3
const DEFAULT_WEEKS = 12
const ACTIVITY_WINDOW_DAYS = 30

const DEFAULT_SETTINGS = Object.freeze({
  dailyGoalCards: 0,
  dailyGoalExercises: 0,
  streakReminderEnabled: false,
  badgesVisibleToTeachers: false,
  animationsEnabled: true,
  zenMode: false,
  timezone: null
})
const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS)

const domainError = (code, message) => Object.assign(new Error(message), { code })

class GamificationProfileService {
  /**
   * Ligne de préférences de l'utilisateur, créée à la première écriture.
   *
   * @param {number} userId
   * @returns {Promise<import('sequelize').Model>}
   */
  async ensureRow(userId) {
    const existing = await UserGamificationSettings.findOne({ where: { userId } })
    if (existing) return existing
    // CHOIX: create + capture de l'erreur d'unicité plutôt que findOrCreate
    // RAISON: findOrCreate ouvre une transaction, qui échoue sur SQLite en concurrence (voir UserActivityDay.service).
    try {
      return await UserGamificationSettings.create({ userId })
    } catch (error) {
      if (error instanceof UniqueConstraintError) return await UserGamificationSettings.findOne({ where: { userId } })
      throw error
    }
  }

  /**
   * Réglages de gamification (valeurs par défaut si l'utilisateur n'en a jamais enregistré).
   *
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async getSettings(userId) {
    const row = await UserGamificationSettings.findOne({ where: { userId } })
    return Object.fromEntries(SETTING_KEYS.map((key) => [key, row ? row[key] : DEFAULT_SETTINGS[key]]))
  }

  /**
   * Met à jour une partie des réglages (les clés absentes ou inconnues sont ignorées).
   *
   * @param {number} userId
   * @param {object} changes
   * @returns {Promise<object>} réglages complets après mise à jour
   */
  async updateSettings(userId, changes) {
    const patch = Object.fromEntries(SETTING_KEYS.filter((key) => changes[key] !== undefined).map((key) => [key, changes[key]]))
    // Un fuseau inconnu est ignoré plutôt que stocké (le validateur de route le refuse déjà en amont)
    if (patch.timezone !== undefined && patch.timezone !== null && !isValidZone(patch.timezone)) delete patch.timezone
    const row = await this.ensureRow(userId)
    if (Object.keys(patch).length > 0) await row.update(patch)
    return this.getSettings(userId)
  }

  /**
   * Indique si l'étudiant accepte que ses enseignants voient ses badges (désactivé par défaut).
   *
   * @param {number} userId
   * @returns {Promise<boolean>}
   */
  async areBadgesVisibleToTeachers(userId) {
    const row = await UserGamificationSettings.findOne({ where: { userId }, attributes: ['badgesVisibleToTeachers'] })
    return Boolean(row?.badgesVisibleToTeachers)
  }

  /**
   * Titre affiché et vitrine.
   *
   * @param {number} userId
   * @returns {Promise<{ titleCode: string|null, showcaseCodes: string[] }>}
   */
  async getProfile(userId) {
    const row = await UserGamificationSettings.findOne({ where: { userId } })
    return { titleCode: row?.titleCode || null, showcaseCodes: row?.showcaseCodes || [] }
  }

  /**
   * Titre affichable à un enseignant : null si l'étudiant n'a pas choisi de titre ou si son badge n'est
   * pas visible. En consentement par matières, `visibleCodes` limite le titre aux badges que
   * l'enseignant peut déjà voir (sinon le titre révélerait une matière non consentie).
   *
   * @param {number} userId - l'étudiant (le réglage de partage est vérifié par l'appelant)
   * @param {string[]|null} [visibleCodes] - codes des badges visibles ; null = tous
   * @returns {Promise<{ code: string, label: string, icon: string }|null>}
   */
  async getTeacherTitle(userId, visibleCodes = null) {
    const { titleCode } = await this.getProfile(userId)
    const badge = titleCode ? CATALOG_BY_CODE.get(titleCode) : null
    if (!badge || (visibleCodes && !visibleCodes.includes(titleCode))) return null
    return { code: badge.code, label: badge.label, icon: badge.icon }
  }

  /**
   * Définit le titre et la vitrine. Une clé absente garde l'ancienne valeur.
   *
   * @param {number} userId
   * @param {{ titleCode?: string|null, showcaseCodes?: string[] }} data
   * @returns {Promise<{ titleCode: string|null, showcaseCodes: string[] }>}
   * @throws {Error} code `TOO_MANY_SHOWCASE` (plus de 3 badges), `BADGE_NOT_EARNED` (code inconnu ou non obtenu)
   */
  async setProfile(userId, { titleCode, showcaseCodes } = {}) {
    const showcase = showcaseCodes === undefined ? undefined : [...new Set(showcaseCodes)]
    if (showcase && showcase.length > MAX_SHOWCASE) {
      throw domainError('TOO_MANY_SHOWCASE', `La vitrine accepte ${MAX_SHOWCASE} badges au maximum.`)
    }
    const wanted = [...(showcase || []), ...(titleCode ? [titleCode] : [])]
    if (wanted.length > 0) {
      const earned = new Set(
        (await UserBadge.findAll({ where: { userId, badgeCode: wanted }, attributes: ['badgeCode'], raw: true })).map((r) => r.badgeCode)
      )
      if (wanted.some((code) => !earned.has(code) || !CATALOG_BY_CODE.has(code))) {
        throw domainError('BADGE_NOT_EARNED', 'Seuls les badges que tu as obtenus peuvent être choisis.')
      }
    }
    const patch = {}
    if (titleCode !== undefined) patch.titleCode = titleCode
    if (showcase !== undefined) patch.showcaseCodes = showcase
    const row = await this.ensureRow(userId)
    if (Object.keys(patch).length > 0) await row.update(patch)
    return this.getProfile(userId)
  }

  /**
   * Calendrier d'activité : jours de pratique des N dernières semaines (semaines du lundi au dimanche,
   * la semaine en cours incluse jusqu'à aujourd'hui).
   *
   * @param {number} userId
   * @param {number} [weeks] - nombre de semaines (défaut 12)
   * @param {Date} [now]
   * @returns {Promise<object>} { from, to, today, weeks, activeDates, activeDaysLast30, streakCurrent, streakBest }
   */
  async getActivity(userId, weeks = DEFAULT_WEEKS, now = new Date()) {
    const zone = await userActivityDayService.getZone(userId)
    const today = inZone(now, zone)
    const mondayOffset = (today.day() + 6) % 7
    const from = today.subtract(mondayOffset + (weeks - 1) * 7, 'day').format('YYYY-MM-DD')
    const todayStr = today.format('YYYY-MM-DD')
    const windowStart = today.subtract(ACTIVITY_WINDOW_DAYS - 1, 'day').format('YYYY-MM-DD')
    // Seuls les jours utiles aux deux calculs (grille et 30 derniers jours) sont lus
    const rows = await UserActivityDay.findAll({
      where: { userId, date: { [Op.gte]: from < windowStart ? from : windowStart } },
      attributes: ['date'],
      raw: true
    })
    const all = rows.map((row) => row.date).sort()
    const stats = await badgeService.loadStats(userId, now)
    return {
      from,
      to: todayStr,
      today: todayStr,
      weeks,
      activeDates: all.filter((date) => date >= from && date <= todayStr),
      activeDaysLast30: all.filter((date) => date >= windowStart && date <= todayStr).length,
      streakCurrent: stats.streakCurrent,
      streakBest: stats.streakBest
    }
  }

  /**
   * Progression de l'objectif quotidien : cartes révisées et exercices terminés aujourd'hui,
   * comparés aux objectifs de l'utilisateur (0 = pas d'objectif).
   *
   * @param {number} userId
   * @param {Date} [now]
   * @returns {Promise<{ date: string, cards: { goal: number, done: number }, exercises: { goal: number, done: number }, achieved: boolean }>}
   */
  async getDailyGoal(userId, now = new Date()) {
    const settings = await this.getSettings(userId)
    const zone = isValidZone(settings.timezone) ? settings.timezone : null
    const { start, end } = dayBounds(now, zone)
    const range = { [Op.between]: [start, end] }
    const [sessions, exercises] = await Promise.all([
      LeitnerReviewSession.findAll({ where: { userId, completedAt: range }, attributes: ['cardsReviewed'], raw: true }),
      TestResult.count({ where: { userId, completedAt: range } })
    ])
    const cards = { goal: settings.dailyGoalCards, done: sessions.reduce((sum, row) => sum + (row.cardsReviewed || 0), 0) }
    const exercisesProgress = { goal: settings.dailyGoalExercises, done: exercises }
    const goals = [cards, exercisesProgress].filter((entry) => entry.goal > 0)
    return {
      date: dayString(now, zone),
      cards,
      exercises: exercisesProgress,
      achieved: goals.length > 0 && goals.every((entry) => entry.done >= entry.goal)
    }
  }

  /**
   * Utilisateurs dont une série d'au moins `minStreak` jours est menacée : pratique hier mais pas encore
   * aujourd'hui (jours comptés dans le fuseau de chaque utilisateur), rappel activé et mode zen désactivé
   * (le mode zen coupe toute sollicitation).
   *
   * @param {Date} [now]
   * @param {number} [minStreak]
   * @param {number|null} [localHour] - si fourni, ne retient que les utilisateurs dont il est actuellement
   *   cette heure locale (0-23) : le cron tourne toutes les heures et chacun est rappelé à sa propre heure
   * @returns {Promise<Array<{ userId: number, streak: number, zone: string|null }>>}
   */
  async findStreaksAtRisk(now = new Date(), minStreak = 2, localHour = null) {
    const settings = await UserGamificationSettings.findAll({
      where: { streakReminderEnabled: true, zenMode: false },
      attributes: ['userId', 'timezone'],
      raw: true
    })
    const atRisk = []
    for (const { userId, timezone } of settings) {
      const zone = isValidZone(timezone) ? timezone : null
      const local = inZone(now, zone)
      if (localHour !== null && local.hour() !== localHour) continue
      const today = local.format('YYYY-MM-DD')
      const yesterday = local.subtract(1, 'day').format('YYYY-MM-DD')
      const since = local.subtract(400, 'day').format('YYYY-MM-DD')
      const dates = (await UserActivityDay.findAll({ where: { userId, date: { [Op.gte]: since } }, attributes: ['date'], raw: true })).map((row) => row.date)
      if (dates.includes(today) || !dates.includes(yesterday)) continue
      const { current } = computeStreaks(dates, today)
      if (current >= minStreak) atRisk.push({ userId, streak: current, zone })
    }
    return atRisk
  }

  /**
   * Faits utiles au message de fin de session : est-ce la première pratique de la journée (bonus de
   * première session, sans points), et où en est la série. Les messages eux-mêmes sont composés côté
   * front. À appeler une fois la session enregistrée.
   *
   * @param {number} userId
   * @param {Date} [now]
   * @returns {Promise<{ date: string, firstOfDay: boolean, practicesToday: number, streakCurrent: number, streakBest: number, streakExtended: boolean, dailyGoalAchieved: boolean, freezeUsed: boolean, freezeEarned: boolean, freezesAvailable: number, challengeDone: boolean, challengeSubject: string|null }>}
   */
  async getSessionFeedback(userId, now = new Date()) {
    const zone = await userActivityDayService.getZone(userId)
    const { start, end } = dayBounds(now, zone)
    const range = { [Op.between]: [start, end] }
    const [leitner, exercises, views, stats, goal, challenge] = await Promise.all([
      LeitnerReviewSession.count({ where: { userId, completedAt: range } }),
      TestResult.count({ where: { userId, completedAt: range } }),
      MindMapViewSession.count({ where: { userId, viewedAt: range, durationSeconds: { [Op.gte]: userActivityDayService.MIN_MINDMAP_VIEW_SECONDS } } }),
      badgeService.loadStats(userId, now),
      this.getDailyGoal(userId, now),
      dailyChallengeService.get(userId, now)
    ])
    const practicesToday = leitner + exercises + views
    const firstOfDay = practicesToday === 1
    return {
      date: dayString(now, zone),
      firstOfDay,
      practicesToday,
      streakCurrent: stats.streakCurrent,
      streakBest: stats.streakBest,
      streakExtended: firstOfDay && stats.streakCurrent >= 2,
      dailyGoalAchieved: goal.achieved,
      // Gel de série (A3) : un gel vient de couvrir un trou avant la pratique d'aujourd'hui / vient d'être gagné
      freezeUsed: stats.lastFreezeUsedOn === dayString(now, zone),
      freezeEarned: stats.lastFreezeEarnedOn === dayString(now, zone),
      freezesAvailable: stats.freezesAvailable,
      // Défi du jour (A4) relevé par CETTE session : la première pratique du jour dans la matière du défi
      challengeDone: challenge.done && challenge.practicesToday === 1,
      challengeSubject: challenge.done && challenge.practicesToday === 1 ? challenge.subject?.name ?? null : null
    }
  }
}

module.exports = new GamificationProfileService()
module.exports.MAX_SHOWCASE = MAX_SHOWCASE
module.exports.DEFAULT_WEEKS = DEFAULT_WEEKS
