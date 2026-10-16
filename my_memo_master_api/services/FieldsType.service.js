const { FieldsType } = require('../models/index')

const FieldTypeService = {
  async findAll() {
    return await FieldsType.findAll()
  },

  async findOne(idType) {
    return await FieldsType.findOne({
      where: { idType }
    })
  },

  async create(data) {
    return await FieldsType.create(data)
  },

  async update(idType, data) {
    const [updated] = await FieldsType.update(data, { where: { idType } })
    return updated
  }
}

module.exports = FieldTypeService
