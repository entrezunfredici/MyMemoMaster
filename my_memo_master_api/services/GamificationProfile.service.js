const dayjs = require('dayjs')
const { Op, UniqueConstraintError } = require('sequelize')
const { UserGamificationSettings, UserBadge, UserActivityDay, LeitnerReviewSession, TestResult } = require('../models/index')
const badgeService = require('./Badge.service')
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
  zenMode: false
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
    const today = dayjs(now)
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
    const start = dayjs(now).startOf('day').toDate()
    const end = dayjs(now).endOf('day').toDate()
    const range = { [Op.between]: [start, end] }
    const [settings, sessions, exercises] = await Promise.all([
      this.getSettings(userId),
      LeitnerReviewSession.findAll({ where: { userId, completedAt: range }, attributes: ['cardsReviewed'], raw: true }),
      TestResult.count({ where: { userId, completedAt: range } })
    ])
    const cards = { goal: settings.dailyGoalCards, done: sessions.reduce((sum, row) => sum + (row.cardsReviewed || 0), 0) }
    const exercisesProgress = { goal: settings.dailyGoalExercises, done: exercises }
    const goals = [cards, exercisesProgress].filter((entry) => entry.goal > 0)
    return {
      date: dayjs(now).format('YYYY-MM-DD'),
      cards,
      exercises: exercisesProgress,
      achieved: goals.length > 0 && goals.every((entry) => entry.done >= entry.goal)
    }
  }

  /**
   * Utilisateurs dont une série d'au moins `minStreak` jours est menacée : pratique hier mais pas encore
   * aujourd'hui, rappel activé et mode zen désactivé (le mode zen coupe toute sollicitation).
   *
   * @param {Date} [now]
   * @param {number} [minStreak]
   * @returns {Promise<Array<{ userId: number, streak: number }>>}
   */
  async findStreaksAtRisk(now = new Date(), minStreak = 2) {
    const settings = await UserGamificationSettings.findAll({
      where: { streakReminderEnabled: true, zenMode: false },
      attributes: ['userId'],
      raw: true
    })
    const today = dayjs(now).format('YYYY-MM-DD')
    const yesterday = dayjs(now).subtract(1, 'day').format('YYYY-MM-DD')
    const atRisk = []
    for (const { userId } of settings) {
      const dates = (await UserActivityDay.findAll({ where: { userId, date: { [Op.gte]: dayjs(now).subtract(400, 'day').format('YYYY-MM-DD') } }, attributes: ['date'], raw: true })).map((row) => row.date)
      if (dates.includes(today) || !dates.includes(yesterday)) continue
      const { current } = computeStreaks(dates, today)
      if (current >= minStreak) atRisk.push({ userId, streak: current })
    }
    return atRisk
  }
}

module.exports = new GamificationProfileService()
module.exports.MAX_SHOWCASE = MAX_SHOWCASE
module.exports.DEFAULT_WEEKS = DEFAULT_WEEKS
