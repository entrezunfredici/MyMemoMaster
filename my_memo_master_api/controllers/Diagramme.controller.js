const DiagrammeService = require("../services/Diagramme.service.js");
const logger = require("../helpers/logger");

exports.findAll = async (req, res) => {
  try {
    const responses = await DiagrammeService.findAll();
    res.status(200).json(responses);
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la récupération des diagrammes." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const response = await DiagrammeService.findOne(req.params.id);
    if (!response) {
      return res.status(404).json({ message: `Diagramme introuvable pour l'identifiant ${req.params.id}.` });
    }
    res.status(200).json(response);
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la récupération du diagramme." });
  }
};

exports.create = async (req, res) => {
  try {
    const { mmName, mindMapJson, userId, idSubject } = req.body;

    if (!mmName || !mindMapJson || !userId || !idSubject) {
      return res.status(400).json({ message: "Tous les champs (mmName, mindMapJson, userId, idSubject) sont requis." });
    }

    const data = await DiagrammeService.create({ mmName, mindMapJson, userId, idSubject });
    res.status(201).json(data);
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la création du diagramme." });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { mmName, mindMapJson, userId } = req.body;

    if (!mmName || !mindMapJson || !userId) {
      return res.status(400).json({ message: "Tous les champs (mmName, mindMapJson, userId) sont requis." });
    }

    const updatedDiagramme = await DiagrammeService.update(id, { mmName, mindMapJson, userId });

    if (!updatedDiagramme) {
      return res.status(404).json({ message: `Diagramme avec l'ID ${id} non trouvé.` });
    }

    res.status(200).json(updatedDiagramme);
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la modification du diagramme." });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const diagramme = await DiagrammeService.findById(id);
    if (!diagramme) {
      return res.status(404).json({ message: `Diagramme avec l'ID ${id} non trouvé.` });
    }

    await DiagrammeService.delete(id);
    res.status(204).send();
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la suppression du diagramme." });
  }
};
