const { Op } = require('sequelize')
const { Etablissement, User, ClassGroup, ClassGroupUsers, Invitation, AuditLog, ClassGroupResource, ClassGroupSection } = require('../models/index')
const AuditLogService = require('./AuditLog.service')
const logger = require('../helpers/logger')

const adminInclude = {
  model: User,
  as: 'admin',
  attributes: ['userId', 'name', 'email']
}

class EtablissementService {
  async findAll() {
    return Etablissement.findAll({
      include: [adminInclude],
      order: [['name', 'ASC']]
    })
  }

  async findOne(id) {
    return Etablissement.findByPk(id, { include: [adminInclude] })
  }

  async findByAdmin(adminId) {
    return Etablissement.findOne({
      where: { adminId },
      include: [adminInclude]
    })
  }

  async create({ name, code, adminId = null }) {
    return Etablissement.create({ name, code, adminId })
  }

  async update(id, data) {
    const etab = await Etablissement.findByPk(id)
    if (!etab) return null
    const fields = {}
    if (data.name !== undefined) fields.name = data.name
    if (data.code !== undefined) fields.code = data.code
    if (data.adminId !== undefined) fields.adminId = data.adminId
    return etab.update(fields)
  }

  async delete(id) {
    const etab = await Etablissement.findByPk(id)
    if (!etab) return null
    await etab.destroy()
    return true
  }

  /**
   * Calcule les statistiques de pilotage d'un établissement.
   * Accessible à l'admin plateforme (1) sur tout établissement,
   * et à l'admin établissement (4) uniquement sur le sien.
   *
   * @param {number} etablissementId - ID de l'établissement
   * @param {number} requesterId - ID de l'utilisateur requérant
   * @param {number} requesterRoleId - Rôle de l'utilisateur requérant
   * @returns {object|null|false} Stats, null si non trouvé, false si accès refusé
   */
  async getStats(etablissementId, requesterId, requesterRoleId) {
    const etab = await Etablissement.findByPk(etablissementId, { attributes: ['id', 'adminId'] })
    if (!etab) return null

    // Admin établissement (4) limité à son propre établissement
    if (requesterRoleId === 4 && etab.adminId !== requesterId) return false

    const { adminId } = etab

    // Établissement sans admin assigné — stats vides
    if (!adminId) {
      return this._emptyStats()
    }

    // 1. Groupes classes créés par l'admin
    const groups = await ClassGroup.findAll({
      where: { createdBy: adminId },
      attributes: ['id']
    })
    const groupIds = groups.map((g) => g.id)
    const groupCount = groupIds.length

    // 2. Membres uniques à travers tous les groupes
    const memberStats = { total: 0, active: 0, inactive: 0, validated: 0, students: 0, teachers: 0 }

    if (groupIds.length > 0) {
      const memberships = await ClassGroupUsers.findAll({
        where: { classGroupId: { [Op.in]: groupIds } },
        include: [{
          model: User,
          as: 'user',
          attributes: ['userId', 'isActive', 'hasValidatedEmail']
        }]
      })

      // Déduplication par userId + cumul du rôle ClassGroup (student/teacher)
      const seen = new Map()
      for (const m of memberships) {
        if (!m.user) continue
        if (!seen.has(m.user.userId)) {
          seen.set(m.user.userId, { user: m.user, role: m.role })
        }
      }

      for (const { user, role } of seen.values()) {
        memberStats.total++
        if (user.isActive) memberStats.active++
        else memberStats.inactive++
        if (user.hasValidatedEmail) memberStats.validated++
        if (role === 'student') memberStats.students++
        else if (role === 'teacher') memberStats.teachers++
      }
    }

    // 3. Invitations envoyées par cet admin
    const invitations = await Invitation.findAll({
      where: { invitedByUserId: adminId },
      attributes: ['status']
    })
    const pendingInvitations = invitations.filter((i) => i.status === 'pending').length

    // 4. Activité récente — 5 dernières entrées audit de cet admin
    const recentActivity = await AuditLog.findAll({
      where: { actorId: adminId },
      include: [{ model: User, as: 'actor', attributes: ['userId', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: 5
    })

    return {
      groupCount,
      totalMembers: memberStats.total,
      activeMembers: memberStats.active,
      inactiveMembers: memberStats.inactive,
      validatedAccounts: memberStats.validated,
      pendingInvitations,
      roleBreakdown: {
        students: memberStats.students,
        teachers: memberStats.teachers
      },
      recentActivity
    }
  }

  /**
   * Retourne les entrées d'audit scopées à l'admin d'un établissement.
   * Admin plateforme (1) : accès à tout établissement.
   * Admin établissement (4) : uniquement le sien.
   *
   * @param {number} etablissementId
   * @param {number} requesterId
   * @param {number} requesterRoleId
   * @param {{ action?: string, entityType?: string, entityId?: number, limit?: number }} filters
   * @returns {Promise<AuditLog[]|null|false>}
   */
  async getAuditLogs(etablissementId, requesterId, requesterRoleId, filters = {}) {
    const etab = await Etablissement.findByPk(etablissementId, { attributes: ['id', 'adminId'] })
    if (!etab) return null

    if (requesterRoleId === 4 && etab.adminId !== requesterId) return false

    const { adminId } = etab

    // Aucun admin assigné → aucun log possible
    if (!adminId) return []

    const where = { actorId: adminId }
    if (filters.action) where.action = filters.action
    if (filters.entityType) where.entityType = filters.entityType
    if (filters.entityId) where.entityId = parseInt(filters.entityId, 10)

    return AuditLog.findAll({
      where,
      include: [{ model: User, as: 'actor', attributes: ['userId', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: filters.limit ? parseInt(filters.limit, 10) : 100
    })
  }

  /**
   * Retourne l'ensemble du contenu (ressources + sections) de tous les groupes
   * d'un établissement pour modération par l'admin.
   *
   * @param {number} etablissementId
   * @param {number} requesterId
   * @param {number} requesterRoleId
   * @returns {Promise<{resources: object[], sections: object[]}|null|false>}
   */
  async getContent(etablissementId, requesterId, requesterRoleId) {
    const etab = await Etablissement.findByPk(etablissementId, { attributes: ['id', 'adminId'] })
    if (!etab) return null

    if (requesterRoleId === 4 && etab.adminId !== requesterId) return false

    const { adminId } = etab
    if (!adminId) return { resources: [], sections: [] }

    const groups = await ClassGroup.findAll({ where: { createdBy: adminId }, attributes: ['id'] })
    const groupIds = groups.map((g) => g.id)

    if (groupIds.length === 0) return { resources: [], sections: [] }

    const [resources, sections] = await Promise.all([
      ClassGroupResource.findAll({
        where: { classGroupId: { [Op.in]: groupIds } },
        include: [
          { model: User, as: 'creator', attributes: ['userId', 'name', 'email'] },
          { model: ClassGroup, as: 'classGroup', attributes: ['id', 'name'] }
        ],
        order: [['createdAt', 'DESC']]
      }),
      ClassGroupSection.findAll({
        where: { classGroupId: { [Op.in]: groupIds } },
        include: [
          { model: User, as: 'creator', attributes: ['userId', 'name', 'email'] },
          { model: ClassGroup, as: 'classGroup', attributes: ['id', 'name'] }
        ],
        order: [['createdAt', 'DESC']]
      })
    ])

    return { resources, sections }
  }

  /**
   * Supprime un contenu (ressource ou section) dans un établissement pour modération.
   * Vérifie que le contenu appartient bien à un groupe de l'établissement.
   *
   * @param {number} etablissementId
   * @param {'resource'|'section'} contentType
   * @param {number} contentId
   * @param {number} requesterId
   * @param {number} requesterRoleId
   * @returns {Promise<true|null|false|'not_found'>}
   */
  async deleteContent(etablissementId, contentType, contentId, requesterId, requesterRoleId) {
    const etab = await Etablissement.findByPk(etablissementId, { attributes: ['id', 'adminId'] })
    if (!etab) return null

    if (requesterRoleId === 4 && etab.adminId !== requesterId) return false

    const { adminId } = etab
    const groups = adminId
      ? await ClassGroup.findAll({ where: { createdBy: adminId }, attributes: ['id'] })
      : []
    const groupIds = groups.map((g) => g.id)

    const Model = contentType === 'resource' ? ClassGroupResource : ClassGroupSection
    const item = await Model.findByPk(contentId)

    if (!item || !groupIds.includes(item.classGroupId)) return 'not_found'

    await item.destroy()

    const action = contentType === 'resource' ? 'CONTENT_RESOURCE_REMOVED' : 'CONTENT_SECTION_REMOVED'
    const entityType = contentType === 'resource' ? 'ClassGroupResource' : 'ClassGroupSection'
    try {
      await AuditLogService.log(requesterId, action, entityType, contentId, {
        classGroupId: item.classGroupId,
        etablissementId: Number(etablissementId)
      })
    } catch (auditErr) {
      logger.warn(`Audit log échoué (${action}): ${auditErr.message}`)
    }

    return true
  }

  /**
   * Assigne un gérant (admin établissement) à un établissement par email.
   * Passe le roleId de l'utilisateur à 4 et le définit comme adminId de l'établissement.
   *
   * @param {number} etablissementId
   * @param {string} email - Email du futur gérant
   * @param {number} requesterId - ID de l'admin plateforme qui fait la demande
   * @returns {Promise<{etab, user}|null|'user_not_found'>}
   */
  async assignAdmin(etablissementId, email, requesterId) {
    const etab = await Etablissement.findByPk(etablissementId)
    if (!etab) return null

    const user = await User.findOne({ where: { email } })
    if (!user) return 'user_not_found'

    await Promise.all([
      user.update({ roleId: 4 }),
      etab.update({ adminId: user.userId })
    ])

    try {
      await AuditLogService.log(requesterId, 'ADMIN_ETABLISSEMENT_ASSIGNED', 'Etablissement', Number(etablissementId), {
        adminId: user.userId,
        adminEmail: email
      })
    } catch (auditErr) {
      logger.warn(`Audit log échoué (ADMIN_ETABLISSEMENT_ASSIGNED): ${auditErr.message}`)
    }

    const updated = await Etablissement.findByPk(etablissementId, { include: [adminInclude] })
    return { etab: updated, user: { userId: user.userId, name: user.name, email: user.email } }
  }

  _emptyStats() {
    return {
      groupCount: 0,
      totalMembers: 0,
      activeMembers: 0,
      inactiveMembers: 0,
      validatedAccounts: 0,
      pendingInvitations: 0,
      roleBreakdown: { students: 0, teachers: 0 },
      recentActivity: []
    }
  }
}

module.exports = new EtablissementService()
