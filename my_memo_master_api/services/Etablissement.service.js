const { Etablissement, User } = require('../models/index')

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
}

module.exports = new EtablissementService()
