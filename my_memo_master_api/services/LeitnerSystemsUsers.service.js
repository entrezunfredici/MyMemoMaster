const { LeitnerSystemsUsers } = require("../models");

const LeitnerSystemsUsersService = {
  // Créer une relation entre un utilisateur et un système
  async create(data) {
    return await LeitnerSystemsUsers.create(data);
  },

  async findAll() {
    return await LeitnerSystemsUsers.findAll();
  },

  async findOne(idUser, idSystem) {
    return await LeitnerSystemsUsers.findOne({
      where: { idUser, idSystem },
    });
  },

  async update(idUser, idSystem, data) {
    return await LeitnerSystemsUsers.update(data, {
      where: { idUser, idSystem },
    });
  },

  async delete(idUser, idSystem) {
    return await LeitnerSystemsUsers.destroy({
      where: { idUser, idSystem },
    });
  },
};

module.exports = LeitnerSystemsUsersService;
