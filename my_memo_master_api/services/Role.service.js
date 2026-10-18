const { Role, User } = require('../models/index')

// Rôles câblés dans requireRole(...) et dans le front (ROLE_IDS) : ni renommés ni supprimés.
const SYSTEM_ROLE_IDS = [1, 2, 3, 4, 5]

class RoleService {
  async findAll() {
    const roles = await Role.findAll()
    return roles
  }

  async findOne(roleId) {
    const role = await Role.findByPk(roleId)
    return role
  }

  async create(data) {
    return await Role.create(data)
  }

  async update(roleId, data) {
    await Role.update(data, {
      where: { roleId: roleId }
    })
    return this.findOne(roleId)
  }

  /**
   * Indique si un rôle est un rôle système (identifiants 1 à 5).
   *
   * @param {number|string} roleId - Identifiant du rôle
   * @returns {boolean} true pour un rôle système
   */
  isSystemRole(roleId) {
    return SYSTEM_ROLE_IDS.includes(Number(roleId))
  }

  /**
   * Compte les comptes qui portent ce rôle.
   *
   * @param {number|string} roleId - Identifiant du rôle
   * @returns {Promise<number>} Nombre de comptes
   */
  async countUsers(roleId) {
    return User.count({ where: { roleId } })
  }

  async delete(roleId) {
    return await Role.destroy({
      where: { roleId: roleId }
    })
  }
}

module.exports = new RoleService()
module.exports.SYSTEM_ROLE_IDS = SYSTEM_ROLE_IDS
