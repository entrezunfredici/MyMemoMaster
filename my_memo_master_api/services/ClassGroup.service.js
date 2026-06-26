const dayjs = require('dayjs')
const { Op } = require('sequelize')
const { ClassGroup, ClassGroupUsers, User, Invitation, TestResult, RevisionSession, Deadline, EventOccurrence, CalendarEvent, Test } = require('../models/index')

const AT_RISK_INACTIVE_DAYS = 7
const AT_RISK_SCORE_DROP_PCT = 20
const AT_RISK_NO_EXERCISE_DAYS = 14

function isoWeekStart(date) {
  const d = dayjs(date)
  const day = d.day()
  const offset = day === 0 ? 6 : day - 1
  return d.subtract(offset, 'day').format('YYYY-MM-DD')
}

class ClassGroupService {
  /**
   * Liste tous les groupes visibles par l'utilisateur.
   * Admin : tous les groupes. Autres : uniquement les groupes dont ils sont membres.
   *
   * @param {number} userId
   * @returns {Promise<ClassGroup[]>}
   */
  async findAll(userId) {
    const user = await User.findByPk(userId, { attributes: ['roleId'] })
    const memberInclude = {
      model: ClassGroupUsers,
      as: 'members',
      include: [{ model: User, as: 'user', attributes: ['userId', 'name', 'email'] }]
    }
    if ([1, 4].includes(user?.roleId)) {
      return ClassGroup.findAll({ include: [memberInclude] })
    }
    const memberships = await ClassGroupUsers.findAll({ where: { userId } })
    const groupIds = memberships.map((m) => m.classGroupId)
    if (groupIds.length === 0) return []
    return ClassGroup.findAll({
      where: { id: groupIds },
      include: [memberInclude]
    })
  }

  /**
   * Récupère un groupe par son ID avec ses membres.
   *
   * @param {number} id
   * @returns {Promise<ClassGroup|null>}
   */
  async findOne(id) {
    return ClassGroup.findByPk(id, {
      include: [{
        model: ClassGroupUsers,
        as: 'members',
        include: [{ model: User, as: 'user', attributes: ['userId', 'name', 'email'] }]
      }]
    })
  }

  /**
   * Crée un groupe classe. Réservé aux admins (roleId = 1).
   *
   * @param {number} userId
   * @param {object} data - { name, description }
   * @returns {Promise<ClassGroup|false>} false si droits insuffisants
   */
  async create(userId, data) {
    const user = await User.findByPk(userId, { attributes: ['roleId'] })
    if (![1, 4].includes(user?.roleId)) return false
    return ClassGroup.create({ ...data, createdBy: userId })
  }

  /**
   * Met à jour un groupe classe. Réservé aux admins.
   *
   * @param {number} id
   * @param {number} userId
   * @param {object} data
   * @returns {Promise<ClassGroup|null|false>} null si introuvable, false si droits insuffisants
   */
  async update(id, userId, data) {
    const user = await User.findByPk(userId, { attributes: ['roleId'] })
    if (![1, 4].includes(user?.roleId)) return false
    const group = await ClassGroup.findByPk(id)
    if (!group) return null
    await group.update(data)
    return group
  }

  /**
   * Supprime un groupe classe. Réservé aux admins.
   *
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<true|null|false>} null si groupe introuvable, false si droits insuffisants
   */
  async delete(id, userId) {
    const user = await User.findByPk(userId, { attributes: ['roleId'] })
    if (![1, 4].includes(user?.roleId)) return false
    const group = await ClassGroup.findByPk(id)
    if (!group) return null
    await group.destroy()
    return true
  }

  /**
   * Ajoute un membre à un groupe. Réservé aux admins.
   *
   * @param {number} groupId
   * @param {number} requesterId
   * @param {{ userId: number, role: string }} memberData
   * @returns {Promise<ClassGroupUsers|null|false>}
   */
  async addMember(groupId, requesterId, memberData) {
    const requester = await User.findByPk(requesterId, { attributes: ['roleId'] })
    if (![1, 4].includes(requester?.roleId)) return false
    const group = await ClassGroup.findByPk(groupId)
    if (!group) return null
    const [membership] = await ClassGroupUsers.findOrCreate({
      where: { classGroupId: groupId, userId: memberData.userId },
      defaults: { role: memberData.role }
    })
    if (membership.role !== memberData.role) {
      await membership.update({ role: memberData.role })
    }
    return membership
  }

  /**
   * Retire un membre d'un groupe. Réservé aux admins.
   *
   * @param {number} groupId
   * @param {number} targetUserId
   * @param {number} requesterId
   * @returns {Promise<boolean|null|false>}
   */
  async updateMemberRole(groupId, targetUserId, requesterId, role) {
    const requester = await User.findByPk(requesterId, { attributes: ['roleId'] })
    if (![1, 4].includes(requester?.roleId)) return false
    const membership = await ClassGroupUsers.findOne({
      where: { classGroupId: groupId, userId: targetUserId }
    })
    if (!membership) return null
    await membership.update({ role })
    return membership
  }

  async removeMember(groupId, targetUserId, requesterId) {
    const requester = await User.findByPk(requesterId, { attributes: ['roleId'] })
    if (![1, 4].includes(requester?.roleId)) return false
    const membership = await ClassGroupUsers.findOne({
      where: { classGroupId: groupId, userId: targetUserId }
    })
    if (!membership) return null
    await membership.destroy()
    return true
  }

  /**
   * Calcule les KPI d'un groupe.
   * Admin et enseignants du groupe uniquement.
   *
   * @param {number} groupId
   * @param {number} requesterId
   * @returns {Promise<object|null|false>}
   */
  async getKpi(groupId, requesterId) {
    const requester = await User.findByPk(requesterId, { attributes: ['roleId'] })
    const isAdmin = [1, 4].includes(requester?.roleId)

    if (!isAdmin) {
      const membership = await ClassGroupUsers.findOne({
        where: { classGroupId: groupId, userId: requesterId, role: 'teacher' }
      })
      if (!membership) return false
    }

    const group = await ClassGroup.findByPk(groupId)
    if (!group) return null

    const members = await ClassGroupUsers.findAll({ where: { classGroupId: groupId } })
    const studentIds = members.filter((m) => m.role === 'student').map((m) => m.userId)
    const teacherCount = members.filter((m) => m.role === 'teacher').length

    let avgScore = null
    if (studentIds.length > 0) {
      const results = await TestResult.findAll({ where: { userId: studentIds } })
      if (results.length > 0) {
        const pcts = results.map((r) => (r.total > 0 ? (r.score / r.total) * 100 : 0))
        avgScore = Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10
      }
    }

    const pendingInvitations = await Invitation.count({
      where: { classGroupId: groupId, status: 'pending' }
    })

    return {
      memberCount: members.length,
      studentCount: studentIds.length,
      teacherCount,
      pendingInvitations,
      avgScore
    }
  }

  /**
   * Calcule l'analyse pédagogique détaillée d'un groupe : activité par étudiant,
   * scores, tendances hebdomadaires et détection de décrochage.
   * Admin et enseignants du groupe uniquement.
   *
   * @param {number} groupId
   * @param {number} requesterId
   * @returns {Promise<object|null|false>}
   */
  async getStudentAnalytics(groupId, requesterId) {
    const requester = await User.findByPk(requesterId, { attributes: ['roleId'] })
    const isAdmin = [1, 4].includes(requester?.roleId)

    if (!isAdmin) {
      const membership = await ClassGroupUsers.findOne({
        where: { classGroupId: groupId, userId: requesterId, role: 'teacher' }
      })
      if (!membership) return false
    }

    const group = await ClassGroup.findByPk(groupId)
    if (!group) return null

    const allMembers = await ClassGroupUsers.findAll({ where: { classGroupId: groupId } })
    const studentIds = allMembers.filter((m) => m.role === 'student').map((m) => m.userId)
    const teacherIds = allMembers.filter((m) => m.role === 'teacher').map((m) => m.userId)

    if (studentIds.length === 0) {
      return { activeStudentsCount: 0, atRiskCount: 0, scoreWeeklyTrend: this._computeGroupWeeklyTrend([]), students: [] }
    }

    // Exercices assignés comme devoir dans CE groupe par les enseignants du groupe
    const deadlines = teacherIds.length > 0
      ? await Deadline.findAll({
          where: { createdBy: teacherIds, testId: { [Op.not]: null } },
          attributes: ['testId'],
          include: [{
            model: EventOccurrence,
            as: 'occurrence',
            required: true,
            attributes: [],
            include: [{
              model: CalendarEvent,
              as: 'calendarEvent',
              where: { classGroupId: Number(groupId) },
              attributes: []
            }]
          }]
        })
      : []
    const teacherTestIds = [...new Set(deadlines.map((d) => d.testId).filter(Boolean))]

    const [users, sessions, results] = await Promise.all([
      User.findAll({ where: { userId: studentIds }, attributes: ['userId', 'name', 'email'] }),
      RevisionSession.findAll({ where: { userId: studentIds, isDone: true } }),
      teacherTestIds.length > 0
        ? TestResult.findAll({ where: { userId: studentIds, testId: teacherTestIds }, order: [['completedAt', 'ASC']] })
        : Promise.resolve([])
    ])

    const now = new Date()
    const cutoff14 = new Date(now - AT_RISK_NO_EXERCISE_DAYS * 24 * 60 * 60 * 1000)

    const students = studentIds.map((userId) => {
      const user = users.find((u) => u.userId === userId)
      const userSessions = sessions.filter((s) => s.userId === userId)
      const userResults = results.filter((r) => r.userId === userId)

      const lastSession = [...userSessions].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
      const lastActivityAt = lastSession ? lastSession.date : null
      // CHOIX: dayjs.diff plutôt que new Date() pour éviter le décalage UTC sur les champs DATEONLY
      const daysInactive = lastActivityAt
        ? dayjs().startOf('day').diff(dayjs(lastActivityAt), 'day')
        : null

      const avgScore =
        userResults.length > 0
          ? Math.round(
              (userResults.reduce((sum, r) => sum + (r.total > 0 ? (r.score / r.total) * 100 : 0), 0) /
                userResults.length) *
                10
            ) / 10
          : null

      const scoreTrend = userResults.slice(-4).map((r) => ({
        score: Math.round((r.total > 0 ? (r.score / r.total) * 100 : 0) * 10) / 10,
        completedAt: r.completedAt
      }))

      const atRiskReasons = []
      if (daysInactive === null) {
        atRiskReasons.push('Aucune session de révision enregistrée')
      } else if (daysInactive > AT_RISK_INACTIVE_DAYS) {
        atRiskReasons.push(`Inactif depuis ${daysInactive} jours`)
      }
      if (scoreTrend.length >= 2) {
        const prev = scoreTrend[scoreTrend.length - 2].score
        const last = scoreTrend[scoreTrend.length - 1].score
        if (prev > 0 && (prev - last) / prev >= AT_RISK_SCORE_DROP_PCT / 100) {
          atRiskReasons.push(`Baisse de score de ${Math.round(((prev - last) / prev) * 100)}%`)
        }
      }
      if (userResults.length > 0 && !userResults.some((r) => new Date(r.completedAt) > cutoff14)) {
        atRiskReasons.push(`Aucun exercice complété depuis ${AT_RISK_NO_EXERCISE_DAYS} jours`)
      }

      return {
        userId,
        name: user?.name ?? null,
        email: user?.email ?? null,
        lastActivityAt,
        daysInactive,
        avgScore,
        scoreTrend,
        atRisk: atRiskReasons.length > 0,
        atRiskReasons
      }
    })

    return {
      activeStudentsCount: students.filter((s) => s.daysInactive !== null && s.daysInactive <= AT_RISK_INACTIVE_DAYS).length,
      atRiskCount: students.filter((s) => s.atRisk).length,
      scoreWeeklyTrend: this._computeGroupWeeklyTrend(results),
      students
    }
  }

  /**
   * Retourne les événements de calendrier d'un groupe avec leurs occurrences.
   * Accessible à tout membre du groupe (enseignants et étudiants) ainsi qu'aux admins.
   *
   * @param {number} groupId
   * @param {number} requesterId
   * @returns {Promise<CalendarEvent[]|false>} false si non membre
   */
  async getGroupEvents(groupId, requesterId) {
    const requester = await User.findByPk(requesterId, { attributes: ['roleId'] })
    const isAdmin = [1, 4].includes(requester?.roleId)
    if (!isAdmin) {
      const membership = await ClassGroupUsers.findOne({
        where: { classGroupId: Number(groupId), userId: requesterId }
      })
      if (!membership) return false
    }
    return CalendarEvent.findAll({
      where: { classGroupId: Number(groupId) },
      include: [{ model: EventOccurrence, as: 'occurrences', order: [['date', 'ASC']] }],
      order: [['createdAt', 'ASC']]
    })
  }

  /**
   * Retourne les échéances d'un groupe (via ses séances de calendrier).
   * Accessible à tout membre du groupe ainsi qu'aux admins.
   *
   * @param {number} groupId
   * @param {number} requesterId
   * @returns {Promise<Deadline[]|false>} false si non membre
   */
  async getGroupDeadlines(groupId, requesterId) {
    const requester = await User.findByPk(requesterId, { attributes: ['roleId'] })
    const isAdmin = [1, 4].includes(requester?.roleId)
    if (!isAdmin) {
      const membership = await ClassGroupUsers.findOne({
        where: { classGroupId: Number(groupId), userId: requesterId }
      })
      if (!membership) return false
    }
    return Deadline.findAll({
      include: [
        {
          model: EventOccurrence,
          as: 'occurrence',
          required: true,
          include: [{
            model: CalendarEvent,
            as: 'calendarEvent',
            where: { classGroupId: Number(groupId) },
            attributes: ['id', 'name', 'type', 'classGroupId']
          }]
        },
        { model: Test, as: 'test', attributes: ['testId', 'name'], required: false }
      ],
      order: [['dueDate', 'ASC']]
    })
  }

  /**
   * Calcule l'évolution du score moyen du groupe sur les 4 dernières semaines ISO.
   *
   * @param {TestResult[]} results
   * @returns {{ weekStart: string, avgScore: number|null }[]}
   */
  _computeGroupWeeklyTrend(results) {
    const now = dayjs()
    const weekMap = {}
    for (let i = 3; i >= 0; i--) {
      weekMap[isoWeekStart(now.subtract(i * 7, 'day').toDate())] = []
    }
    for (const r of results) {
      const ws = isoWeekStart(r.completedAt)
      if (ws in weekMap) {
        weekMap[ws].push(r.total > 0 ? (r.score / r.total) * 100 : 0)
      }
    }
    return Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, scores]) => ({
        weekStart,
        avgScore:
          scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : null
      }))
  }
}

module.exports = new ClassGroupService()
