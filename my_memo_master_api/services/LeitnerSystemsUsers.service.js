const { LeitnerSystemsUsers } = require('../models')
const rightsCache = require('../helpers/leitnerRightsCache')

const LeitnerSystemsUsersService = {
  // Créer une relation entre un utilisateur et un système
  async create(data) {
    const result = await LeitnerSystemsUsers.create(data)
    // R5 (B4_RENDU.md §5) : un partage tout juste créé ne doit pas rester invisible jusqu'à
    // l'expiration de la TTL du cache de droits Leitner (helpers/leitnerRightsCache.js)
    await rightsCache.invalidateRights(data.idUser, data.idSystem)
    return result
  },

  async findAll() {
    return await LeitnerSystemsUsers.findAll()
  },

  async findOne(idUser, idSystem) {
    return await LeitnerSystemsUsers.findOne({
      where: { idUser, idSystem }
    })
  },

  async update(idUser, idSystem, data) {
    const result = await LeitnerSystemsUsers.update(data, {
      where: { idUser, idSystem }
    })
    await rightsCache.invalidateRights(idUser, idSystem)
    return result
  },

  async delete(idUser, idSystem) {
    const result = await LeitnerSystemsUsers.destroy({
      where: { idUser, idSystem }
    })
    await rightsCache.invalidateRights(idUser, idSystem)
    return result
  }
}

module.exports = LeitnerSystemsUsersService
