const LeitnerSystemsUsersService = require("../services/LeitnerSystemsUsers.service");

module.exports = {
  async create(req, res) {
    try {
      const data = req.body;
      const result = await LeitnerSystemsUsersService.create(data);
      return res.status(201).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  },

  async findAll(req, res) {
    try {
      const result = await LeitnerSystemsUsersService.findAll();
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  },

  async findOne(req, res) {
    try {
      const { idUser, idSystem } = req.params;
      const result = await LeitnerSystemsUsersService.findOne(idUser, idSystem);
      if (!result) {
        return res.status(404).json({ message: "Relation non trouvée" });
      }
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  },

  async update(req, res) {
    try {
      const { idUser, idSystem } = req.params;
      const data = req.body;
      const result = await LeitnerSystemsUsersService.update(
        idUser,
        idSystem,
        data
      );
      return res.status(200).json({ message: "Mise à jour réussie" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  },

  async delete(req, res) {
    try {
      const { idUser, idSystem } = req.params;
      await LeitnerSystemsUsersService.delete(idUser, idSystem);
      return res
        .status(200)
        .json({ message: "Relation supprimée avec succès" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  },
};
