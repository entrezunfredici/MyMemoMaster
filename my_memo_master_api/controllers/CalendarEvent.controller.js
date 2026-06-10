const CalendarEventService = require("../services/CalendarEvent.service");
const logger = require("../helpers/logger");

exports.findAll = async (req, res) => {
  try {
    const events = await CalendarEventService.findAll(req.user.id);
    res.status(200).json({ message: "Événements récupérés avec succès.", data: events });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la récupération des événements." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const event = await CalendarEventService.findOne(req.params.id);
    if (!event) return res.status(404).json({ message: "Événement introuvable." });
    res.status(200).json({ message: "Événement récupéré avec succès.", data: event });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la récupération de l'événement." });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await CalendarEventService.create(req.user.id, req.body);
    if (result === false) return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent créer des événements." });
    res.status(201).json({ message: "Événement créé avec succès.", data: result });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la création de l'événement." });
  }
};

exports.update = async (req, res) => {
  try {
    const result = await CalendarEventService.update(req.params.id, req.user.id, req.body);
    if (result === false) return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent modifier des événements." });
    if (result === null) return res.status(404).json({ message: "Événement introuvable." });
    res.status(200).json({ message: "Événement mis à jour avec succès.", data: result });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'événement." });
  }
};

exports.delete = async (req, res) => {
  try {
    const result = await CalendarEventService.delete(req.params.id, req.user.id);
    if (result === false) return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent supprimer des événements." });
    if (result === null) return res.status(404).json({ message: "Événement introuvable." });
    res.status(200).json({ message: "Événement supprimé avec succès." });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la suppression de l'événement." });
  }
};

exports.addOccurrence = async (req, res) => {
  try {
    const { date, startTime, endTime } = req.body;
    const result = await CalendarEventService.addOccurrence(req.params.id, req.user.id, { date, startTime, endTime });
    if (result === false) return res.status(403).json({ message: "Accès refusé." });
    if (result === null) return res.status(404).json({ message: "Événement introuvable." });
    res.status(201).json({ message: "Occurrence ajoutée avec succès.", data: result });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de l'ajout de l'occurrence." });
  }
};

exports.deleteOccurrence = async (req, res) => {
  try {
    const result = await CalendarEventService.deleteOccurrence(req.params.occurrenceId, req.user.id);
    if (result === false) return res.status(403).json({ message: "Accès refusé." });
    if (result === null) return res.status(404).json({ message: "Occurrence introuvable." });
    res.status(200).json({ message: "Occurrence supprimée avec succès." });
  } catch (error) {
    // Contrainte RESTRICT : occurrence liée à des échéances
    if (error?.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({ message: "Impossible de supprimer cette occurrence : des échéances y sont rattachées." });
    }
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la suppression de l'occurrence." });
  }
};
