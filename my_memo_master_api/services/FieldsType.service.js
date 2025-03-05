const { FieldType } = require("../models/index");

const FieldTypeService = {
  // 1. Obtenir la liste de tous les types de champs
  async findAll() {
    return await FieldType.findAll();
  },

  // 2. Obtenir un type de champ par son ID
  async findOne(idType) {
    return await FieldType.findOne({
      where: { idType },
    });
  },

  // 3. Ajouter un type de champ
  async create(data) {
    return await FieldType.create(data);
  },
};

module.exports = FieldTypeService;
