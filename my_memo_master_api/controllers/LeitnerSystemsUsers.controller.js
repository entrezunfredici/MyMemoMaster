const LeitnerSystemsUsersService = require("../services/LeitnerSystemsUsers.service");
const logger = require("../helpers/logger");

module.exports = {
  async create(req, res) {
    try {
      const { idSystem, writeRight, shareRight, shareWithWriteRightRight, shareWithAllRights } = req.body;
      const idUser = req.user.id;
      const result = await LeitnerSystemsUsersService.create({
        idUser,
        idSystem,
        writeRight,
        shareRight,
        shareWithWriteRightRight,
        shareWithAllRights,
      });
      return res.status(201).json(result);
    } catch (error) {
      logger.error(error?.message || error);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  },

  async findAll(req, res) {
    try {
      const result = await LeitnerSystemsUsersService.findAll();
      return res.status(200).json(result);
    } catch (error) {
      logger.error(error?.message || error);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  },

  async findOne(req, res) {
    try {
      const { idUser, idSystem } = req.params;
      if (String(req.user.id) !== String(idUser)) {
        return res.status(403).json({ message: "Accès refusé." });
      }
      const result = await LeitnerSystemsUsersService.findOne(idUser, idSystem);
      if (!result) {
        return res.status(404).json({ message: "Relation non trouvée" });
      }
      return res.status(200).json(result);
    } catch (error) {
      logger.error(error?.message || error);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  },

  async update(req, res) {
    try {
      const { idUser, idSystem } = req.params;
      if (String(req.user.id) !== String(idUser)) {
        return res.status(403).json({ message: "Accès refusé." });
      }
      const { writeRight, shareRight, shareWithWriteRightRight, shareWithAllRights } = req.body;
      const data = { writeRight, shareRight, shareWithWriteRightRight, shareWithAllRights };

      const result = await LeitnerSystemsUsersService.update(
        idUser,
        idSystem,
        data
      );

      if (!result) {
        return res.status(404).json({
          message: `Aucun enregistrement trouvé pour idUser ${idUser} et idSystem ${idSystem}.`,
        });
      }

      return res.status(200).json({
        message: "Mise à jour réussie",
        updatedData: result,
      });
    } catch (error) {
      logger.error(error?.message || error);
      return res.status(500).json({ message: "Erreur serveur lors de la mise à jour." });
    }
  },

  async delete(req, res) {
    try {
      const { idUser, idSystem } = req.params;
      if (String(req.user.id) !== String(idUser)) {
        return res.status(403).json({ message: "Accès refusé." });
      }
      await LeitnerSystemsUsersService.delete(idUser, idSystem);
      return res
        .status(200)
        .json({ message: "Relation supprimée avec succès" });
    } catch (error) {
      logger.error(error?.message || error);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  },
};
