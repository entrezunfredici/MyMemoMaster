const { ClassGroup, ClassGroupUsers, User } = require('../models/index')

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
    if (user?.roleId === 1) {
      return ClassGroup.findAll({ include: [{ model: ClassGroupUsers, as: 'members' }] })
    }
    const memberships = await ClassGroupUsers.findAll({ where: { userId } })
    const groupIds = memberships.map((m) => m.classGroupId)
    if (groupIds.length === 0) return []
    return ClassGroup.findAll({
      where: { id: groupIds },
      include: [{ model: ClassGroupUsers, as: 'members' }]
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
      include: [{ model: ClassGroupUsers, as: 'members' }]
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
    if (user?.roleId !== 1) return false
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
    if (user?.roleId !== 1) return false
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
   * @returns {Promise<boolean|false>} false si droits insuffisants
   */
  async delete(id, userId) {
    const user = await User.findByPk(userId, { attributes: ['roleId'] })
    if (user?.roleId !== 1) return false
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
    if (requester?.roleId !== 1) return false
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
  async removeMember(groupId, targetUserId, requesterId) {
    const requester = await User.findByPk(requesterId, { attributes: ['roleId'] })
    if (requester?.roleId !== 1) return false
    const membership = await ClassGroupUsers.findOne({
      where: { classGroupId: groupId, userId: targetUserId }
    })
    if (!membership) return null
    await membership.destroy()
    return true
  }
}

module.exports = new ClassGroupService()
