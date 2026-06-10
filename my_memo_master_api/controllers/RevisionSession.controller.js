const RevisionSessionService = require("../services/RevisionSession.service");
const logger = require("../helpers/logger");

exports.findAll = async (req, res) => {
  try {
    const sessions = await RevisionSessionService.findAll(req.user.id);
    res.status(200).json({ message: "Séances récupérées avec succès.", data: sessions });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la récupération des séances." });
  }
};

exports.findToday = async (req, res) => {
  try {
    const sessions = await RevisionSessionService.findToday(req.user.id);
    res.status(200).json({ message: "Séances du jour récupérées avec succès.", data: sessions });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la récupération des séances du jour." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const session = await RevisionSessionService.findOne(req.params.id, req.user.id);
    if (!session) return res.status(404).json({ message: "Séance introuvable." });
    res.status(200).json({ message: "Séance récupérée avec succès.", data: session });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la récupération de la séance." });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description, date, startTime, endTime } = req.body;
    const session = await RevisionSessionService.create(req.user.id, { name, description, date, startTime, endTime });
    res.status(201).json({ message: "Séance de révision créée avec succès.", data: session });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la création de la séance." });
  }
};

exports.update = async (req, res) => {
  try {
    const session = await RevisionSessionService.update(req.params.id, req.user.id, req.body);
    if (!session) return res.status(404).json({ message: "Séance introuvable." });
    res.status(200).json({ message: "Séance mise à jour avec succès.", data: session });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de la séance." });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await RevisionSessionService.delete(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ message: "Séance introuvable." });
    res.status(200).json({ message: "Séance supprimée avec succès." });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la suppression de la séance." });
  }
};
