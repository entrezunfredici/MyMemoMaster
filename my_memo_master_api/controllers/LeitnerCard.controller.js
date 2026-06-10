const leitnerCardService = require("../services/LeitnerCard.service");
const logger = require("../helpers/logger");

exports.getCardsByBoxId = async (req, res) => {
  try {
    const cards = await leitnerCardService.getCardsByBoxId(req.params.leitnerboxid);
    res.status(200).json(cards);
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la récupération des cartes." });
  }
};

exports.getCardById = async (req, res) => {
  try {
    const card = await leitnerCardService.getCardById(req.params.id);
    if (!card) return res.status(404).json({ message: "Carte introuvable." });
    res.status(200).json(card);
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la récupération de la carte." });
  }
};

exports.getDueCards = async (req, res) => {
  try {
    const cards = await leitnerCardService.getDueCards(req.params.systemId);
    res.status(200).json(cards);
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la récupération des cartes à réviser." });
  }
};

exports.addCard = async (req, res) => {
  try {
    const rights = await leitnerCardService.resolveUserRights(req.user.id, req.body.idSystem);
    const card = await leitnerCardService.addCard(req.body, rights);
    res.status(201).json(card);
  } catch (error) {
    logger.error(error?.message || error);
    if (error.statusCode === 403) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur lors de l'ajout de la carte." });
  }
};

exports.updateCard = async (req, res) => {
  try {
    const idSystem = await leitnerCardService.getCardSystem(req.params.id);
    const rights = idSystem
      ? await leitnerCardService.resolveUserRights(req.user.id, idSystem)
      : { canAdd: false, canEdit: false, canDelete: false };
    const card = await leitnerCardService.updateCard(req.params.id, req.body, rights);
    if (!card) return res.status(403).json({ message: "Droits insuffisants ou carte introuvable." });
    res.status(200).json(card);
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de la carte." });
  }
};

exports.correctResponse = async (req, res) => {
  try {
    const result = await leitnerCardService.correctResponse(req.body.cardId, req.body.studentAnswer);
    if (!result) return res.status(404).json({ message: "Carte ou réponse introuvable." });
    res.status(200).json(result);
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors du traitement de la réponse." });
  }
};

exports.deleteCard = async (req, res) => {
  try {
    const idSystem = await leitnerCardService.getCardSystem(req.params.id);
    const rights = idSystem
      ? await leitnerCardService.resolveUserRights(req.user.id, idSystem)
      : { canAdd: false, canEdit: false, canDelete: false };
    const deleted = await leitnerCardService.deleteCard(req.params.id, rights);
    if (!deleted) return res.status(403).json({ message: "Droits insuffisants ou carte introuvable." });
    res.status(200).json({ message: "Carte supprimée avec succès." });
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la suppression de la carte." });
  }
};
