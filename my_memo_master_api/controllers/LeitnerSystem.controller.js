const leitnerSystemService = require("../services/LeitnerSystem.service.js");

exports.findAll = async (req, res) => {
  try {
    const data = await leitnerSystemService.findAll();
    res.status(200).send(data);
  } catch (error) {
    res.status(500).send({
      message:
        "Une erreur s'est produite lors de la récupération des systèmes de Leitner.",
    });
  }
};

exports.findBySubject = async (req, res) => {
  try {
    const { subjectid } = req.params;
    const data = await leitnerSystemService.findBySubject(subjectid);
    if (!data.length) {
      res.status(404).send({ message: "Aucun système trouvé pour ce sujet." });
    } else {
      res.status(200).send(data);
    }
  } catch (error) {
    res
      .status(500)
      .send({ message: "Erreur serveur lors de la récupération." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await leitnerSystemService.findOne(id);
    if (!data) {
      res.status(404).send({ message: `Système introuvable avec l'ID ${id}` });
    } else {
      res.status(200).send(data);
    }
  } catch (error) {
    res.status(500).send({ message: "Erreur serveur." });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, idUser, idMindMap, sujet } = req.body;
    const data = await leitnerSystemService.create({
      name,
      idUser,
      idMindMap,
      sujet,
    });
    res.status(201).send(data);
  } catch (error) {
    res.status(500).send({ message: "Erreur lors de la création du système." });
  }
};

exports.update = async (req, res) => {
  try {
    const { idSystem, idUser, name, idMindMap } = req.body;
    const updated = await leitnerSystemService.update({
      idSystem,
      idUser,
      name,
      idMindMap,
    });
    if (!updated) {
      return res
        .status(403)
        .send({ message: "Accès refusé ou système non modifié." });
    }
    res.status(200).send({ message: "Système modifié avec succès." });
  } catch (error) {
    res.status(500).send({ message: "Erreur lors de la modification." });
  }
};

exports.share = async (req, res) => {
  try {
    const result = await leitnerSystemService.shareSystem(req.body);
    res.status(200).send(result);
  } catch (error) {
    res.status(403).send({ message: error.message || "Erreur de partage." });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const { idUser } = req.body;
    const deleted = await leitnerSystemService.delete(id, idUser);
    if (!deleted) {
      return res
        .status(403)
        .send({ message: "Accès refusé ou suppression impossible." });
    }
    res.status(200).send({ message: "Système supprimé avec succès." });
  } catch (error) {
    res.status(500).send({ message: "Erreur serveur lors de la suppression." });
  }
};
