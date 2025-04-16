const { FieldsType } = require("../models/index");  // Au lieu de FieldType

const FieldTypeService = {
  async findAll() {
    return await FieldsType.findAll();  // Utilisez FieldsType au lieu de FieldType
  },

  async findOne(idType) {
    return await FieldsType.findOne({  // Utilisez FieldsType au lieu de FieldType
      where: { idType },
    });
  },

  async create(data) {
    return await FieldsType.create(data);  // Utilisez FieldsType au lieu de FieldType
  },
};

module.exports = FieldTypeService;