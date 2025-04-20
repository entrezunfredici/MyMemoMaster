const { Fields } = require("../models/index");

const FieldsService = {
  // 1. Obtenir la liste des champs
  async findAll() {
    return await Fields.findAll();
  },

  // 2. Obtenir un seul champ par son ID
  async findOne(id) {
    return await Fields.findOne({
      where: { id },
    });
  },

  // 3. Ajouter un champ
  async create(data) {
    return await Fields.create(data);
  },

  // 4. Modifier un champ par son ID
  async update(id, data) {
    const field = await Fields.findByPk(id);
    if (!field) return null;
    await field.update(data);
    return field;
  },

  // 5. Supprimer un champ par son ID
  async delete(id) {
    return await Fields.destroy({
      where: { id },
    });
  },
};

module.exports = FieldsService;
