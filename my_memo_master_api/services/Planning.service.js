const dayjs = require('dayjs')
const { Op } = require('sequelize')
const { RevisionSession, LeitnerSystem, LeitnerBox, LeitnerCard } = require('../models')
const DeadlineService = require('./Deadline.service')
const logger = require('../helpers/logger')

class PlanningService {
  /**
   * Résout les IDs de boîtes appartenant à l'utilisateur.
   *
   * @param {number} userId
   * @returns {Promise<{systemIds: number[], boxIds: number[], systems: object[]}>}
   */
  async _resolveUserLeitner(userId) {
    const systems = await LeitnerSystem.findAll({
      where: { idUser: userId },
      attributes: ['idSystem', 'name']
    })
    const systemIds = systems.map((s) => s.idSystem)
    if (systemIds.length === 0) return { systemIds: [], boxIds: [], systems }

    const boxes = await LeitnerBox.findAll({
      where: { idSystem: systemIds },
      attributes: ['idBox', 'idSystem']
    })
    const boxIds = boxes.map((b) => b.idBox)
    return { systemIds, boxIds, systems, boxes }
  }

  /**
   * Calcule la charge de révision quotidienne sur N jours à partir d'aujourd'hui.
   * Agrège sessions, échéances et cartes Leitner dues par jour.
   *
   * @param {number} userId
   * @param {number} days - Nombre de jours (1-90)
   * @returns {Promise<Array<{date: string, cardsDue: number, sessions: number, deadlines: number, loadScore: number}>>}
   */
  async getLoad(userId, days) {
    const today = dayjs().startOf('day')
    const endDate = today.add(days - 1, 'day')
    const todayStr = today.format('YYYY-MM-DD')
    const endStr = endDate.format('YYYY-MM-DD')

    // Sessions de révision dans la plage
    const sessions = await RevisionSession.findAll({
      where: { userId, date: { [Op.between]: [todayStr, endStr] } },
      attributes: ['date']
    })
    const sessionsByDay = {}
    sessions.forEach((s) => {
      sessionsByDay[s.date] = (sessionsByDay[s.date] || 0) + 1
    })

    // Cartes Leitner dues dans la plage + cartes en retard (ajoutées à aujourd'hui)
    const cardsByDay = {}
    const { boxIds } = await this._resolveUserLeitner(userId)

    if (boxIds.length > 0) {
      const dueCards = await LeitnerCard.findAll({
        where: {
          idBox: boxIds,
          next_review_at: { [Op.between]: [today.toDate(), endDate.endOf('day').toDate()] }
        },
        attributes: ['next_review_at']
      })
      dueCards.forEach((c) => {
        const key = dayjs(c.next_review_at).format('YYYY-MM-DD')
        cardsByDay[key] = (cardsByDay[key] || 0) + 1
      })

      // Cartes en retard ou jamais révisées — comptées sur aujourd'hui
      const overdueCount = await LeitnerCard.count({
        where: {
          idBox: boxIds,
          [Op.or]: [{ next_review_at: { [Op.lt]: today.toDate() } }, { next_review_at: null }]
        }
      })
      if (overdueCount > 0) cardsByDay[todayStr] = (cardsByDay[todayStr] || 0) + overdueCount
    }

    // Échéances de l'utilisateur (via groupes)
    const deadlinesByDay = {}
    try {
      const allDeadlines = await DeadlineService.findAll(userId)
      allDeadlines.forEach((dl) => {
        if (dl.dueDate >= todayStr && dl.dueDate <= endStr) {
          deadlinesByDay[dl.dueDate] = (deadlinesByDay[dl.dueDate] || 0) + 1
        }
      })
    } catch (err) {
      // CHOIX: erreur de résolution des échéances non-bloquante
      // RAISON: un étudiant sans groupe ne doit pas voir l'endpoint échouer
      logger.warn(`Planning.getLoad: impossible de charger les échéances pour userId=${userId}: ${err?.message}`)
    }

    // Construction du tableau journalier
    const result = []
    for (let i = 0; i < days; i++) {
      const date = today.add(i, 'day').format('YYYY-MM-DD')
      const cardsDue = cardsByDay[date] || 0
      const sessionCount = sessionsByDay[date] || 0
      const deadlineCount = deadlinesByDay[date] || 0
      // CHOIX: score pondéré deadlines(5) > sessions(3) > cartes(1)
      // RAISON: une échéance manquée a un impact plus fort qu'une carte non révisée
      const loadScore = cardsDue + sessionCount * 3 + deadlineCount * 5
      result.push({ date, cardsDue, sessions: sessionCount, deadlines: deadlineCount, loadScore })
    }
    return result
  }

  /**
   * Retourne une liste priorisée des tâches de révision de l'utilisateur.
   * Les items sont classés en trois catégories : overdue, today, upcoming (7 j).
   *
   * @param {number} userId
   * @returns {Promise<{overdue: Array, today: Array, upcoming: Array}>}
   */
  async getPriorities(userId) {
    const todayStr = dayjs().format('YYYY-MM-DD')
    const in7DaysStr = dayjs().add(7, 'day').format('YYYY-MM-DD')
    const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD')
    const nowDate = dayjs().toDate()

    const overdue = []
    const todayItems = []
    const upcoming = []

    // ── Échéances ─────────────────────────────────────────────────────────────
    try {
      const allDeadlines = await DeadlineService.findAll(userId)
      allDeadlines.forEach((dl) => {
        const entry = { type: 'deadline', id: dl.id, name: dl.name, dueDate: dl.dueDate, dueTime: dl.dueTime || null }
        if (dl.dueDate < todayStr) {
          overdue.push({ ...entry, daysOverdue: dayjs(todayStr).diff(dayjs(dl.dueDate), 'day') })
        } else if (dl.dueDate === todayStr) {
          todayItems.push(entry)
        } else if (dl.dueDate <= in7DaysStr) {
          upcoming.push({ ...entry, daysUntil: dayjs(dl.dueDate).diff(dayjs(todayStr), 'day') })
        }
      })
    } catch (err) {
      logger.warn(`Planning.getPriorities: échéances inaccessibles pour userId=${userId}: ${err?.message}`)
    }

    // ── Sessions de révision aujourd'hui ──────────────────────────────────────
    const todaySessions = await RevisionSession.findAll({
      where: { userId, date: todayStr },
      order: [['startTime', 'ASC']]
    })
    todaySessions.forEach((s) => {
      todayItems.push({ type: 'revision_session', id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime })
    })

    // ── Sessions à venir (J+1 à J+7) ─────────────────────────────────────────
    const upcomingSessions = await RevisionSession.findAll({
      where: { userId, date: { [Op.between]: [tomorrowStr, in7DaysStr] } },
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    })
    upcomingSessions.forEach((s) => {
      upcoming.push({
        type: 'revision_session',
        id: s.id,
        name: s.name,
        date: s.date,
        startTime: s.startTime,
        daysUntil: dayjs(s.date).diff(dayjs(todayStr), 'day')
      })
    })

    // ── Cartes Leitner dues ou en retard (groupées par système) ───────────────
    const { systems, boxes } = await this._resolveUserLeitner(userId)
    if (systems && systems.length > 0 && boxes && boxes.length > 0) {
      for (const system of systems) {
        const systemBoxIds = boxes.filter((b) => b.idSystem === system.idSystem).map((b) => b.idBox)
        if (systemBoxIds.length === 0) continue
        const count = await LeitnerCard.count({
          where: {
            idBox: systemBoxIds,
            [Op.or]: [{ next_review_at: { [Op.lte]: nowDate } }, { next_review_at: null }]
          }
        })
        if (count > 0) {
          todayItems.push({
            type: 'leitner',
            systemId: system.idSystem,
            name: system.name || `Système ${system.idSystem}`,
            cardsDue: count
          })
        }
      }
    }

    // Tri : deadlines en tête de "today", puis sessions, puis cartes
    const typePriority = { deadline: 0, revision_session: 1, leitner: 2 }
    todayItems.sort((a, b) => (typePriority[a.type] ?? 3) - (typePriority[b.type] ?? 3))
    upcoming.sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0))

    return { overdue, today: todayItems, upcoming }
  }
}

module.exports = new PlanningService()
