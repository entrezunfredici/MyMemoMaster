const { FieldsType } = require("../models/index");

const FieldTypeService = {
  async findAll() {
    return await FieldsType.findAll();
  },

  async findOne(idType) {
    return await FieldsType.findOne({ 
      where: { idType },
    });
  },

  async create(data) {
    return await FieldsType.create(data);
  },
};

module.exports = FieldTypeService;