const LeitnerBoxService = require("../services/LeitnerBox.service.js");
const logger = require("../helpers/logger");

exports.findAll = async (req, res) => {
  try {
    const boxes = await LeitnerBoxService.findAll();
    res.status(200).send(boxes);
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).send({
      message: "Erreur lors de la récupération des boîtes de Leitner.",
    });
  }
};

exports.findOne = async (req, res) => {
  try {
    const box = await LeitnerBoxService.findOne(req.params.id);
    if (!box) {
      res
        .status(404)
        .send({ message: `Boîte introuvable pour l'ID ${req.params.id}.` });
    } else {
      res.status(200).send(box);
    }
  } catch (error) {
    logger.error(error?.message || error);
    res
      .status(500)
      .send({ message: "Erreur lors de la récupération de la boîte: " });
  }
};

exports.create = async (req, res) => {
  try {
    const { level, intervall, color, idSystem } = req.body;
    const box = await LeitnerBoxService.create({
      level,
      intervall,
      color,
      idSystem,
    });
    res.status(201).send(box);
  } catch (error) {
    logger.error(error?.message || error);
    res
      .status(500)
      .send({ message: "Erreur lors de la création de la boîte." });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const newData = req.body;

    const updatedBox = await LeitnerBoxService.update(id, newData);

    if (!updatedBox) {
      return res
        .status(404)
        .json({ message: `Boîte introuvable pour l'ID ${id}.` });
    }

    return res.status(200).json(updatedBox);
  } catch (error) {
    logger.error(error?.message || error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour de la boîte." });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await LeitnerBoxService.delete(req.params.id);
    if (!deleted) {
      res
        .status(404)
        .send({ message: `Boîte introuvable pour l'ID ${req.params.id}.` });
    } else {
      res.status(200).send({ message: "Boîte supprimée avec succès." });
    }
  } catch (error) {
    logger.error(error?.message || error);
    res
      .status(500)
      .send({ message: "Erreur lors de la suppression de la boîte." });
  }
};
