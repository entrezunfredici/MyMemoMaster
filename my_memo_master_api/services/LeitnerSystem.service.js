const { LeitnerSystem } = require("../models/index");
const { LeitnerSystemsUsers } = require("../models/index");

class LeitnerSystemService {
  async findAll() {
    return await LeitnerSystem.findAll();
  }

  async findBySubject(subjectId) {
    return await LeitnerSystem.findAll({
      where: { idMindMap: subjectId },
    });
  }

  async findOne(id) {
    return await LeitnerSystem.findByPk(id);
  }

  async create(data) {
    return await LeitnerSystem.create(data);
  }

  async update(data) {
    const { idSystem, idUser, ...updates } = data;
    const system = await LeitnerSystem.findByPk(idSystem);
    if (system && system.idUser === idUser) {
      await system.update(updates);
      return true;
    }
    return false;
  }

  async share(data) {
    const {
      idUserOwner,
      idUserShared,
      idSystem,
      writeRight = false,
      shareRight = false,
      shareWithWriteRightRight = false,
      shareWithAllRights = false,
    } = data;

    const ownerRights = await LeitnerSystemsUsers.findOne({
      where: { idUser: idUserOwner, idSystem },
    });

    if (!ownerRights || !ownerRights.shareRight) {
      throw new Error("Vous n'avez pas les droits pour partager ce système.");
    }

    await LeitnerSystemsUsers.upsert({
      idUser: idUserShared,
      idSystem,
      writeRight,
      shareRight,
      shareWithWriteRightRight,
      shareWithAllRights,
    });

    return { message: "Système partagé avec succès." };
  }

  async delete(id, idUser) {
    const system = await LeitnerSystem.findByPk(id);
    if (system && system.idUser === idUser) {
      await system.destroy();
      return true;
    }
    return false;
  }
}

module.exports = new LeitnerSystemService();
