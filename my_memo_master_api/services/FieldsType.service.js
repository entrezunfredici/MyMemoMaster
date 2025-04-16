const { FieldType } = require("../models/index");

const FieldTypeService = {
  async findAll() {
    return await FieldType.findAll();
  },

  async findOne(idType) {
    return await FieldType.findOne({
      where: { idType },
    });
  },

  async create(data) {
    return await FieldType.create(data);
  },
};

module.exports = FieldTypeService;
