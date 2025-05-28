const ResponseService = require("../services/Response.service.js");

// Obtenir toutes les réponses d'une question
exports.findAllByQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const responses = await ResponseService.getAllResponsesByQuestion(questionId);
    res.status(200).json(responses);
  } catch (error) {
    res.status(500).send({
      message: error.message || "Une erreur s'est produite lors de la récupération des réponses.",
    });
  }
};

// Obtenir la correction d'une question
exports.findCorrectionByQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const correction = await ResponseService.getCorrectionByQuestion(questionId);
    if (!correction) {
      res.status(404).send({
        message: `Aucune correction trouvée pour la question ${questionId}.`,
      });
    } else {
      res.status(200).json(correction);
    }
  } catch (error) {
    res.status(500).send({
      message: `Erreur lors de la récupération de la correction pour la question ${req.params.questionId}.`,
    });
  }
};

// Obtenir une réponse par son ID
exports.findOne = async (req, res) => {
  try {
    const response = await ResponseService.findOne(req.params.id);
    if (!response) {
      res.status(404).send({
        message: `Réponse introuvable pour l'identifiant ${req.params.id}.`,
      });
    } else {
      res.status(200).json(response);
    }
  } catch (error) {
    res.status(500).send({
      message: `Erreur lors de la récupération de la réponse avec l'identifiant ${req.params.id}.`,
    });
  }
};

// Créer une réponse
exports.create = async (req, res) => {
  try {
    const { content, idQuestion, correction } = req.body;
    const response = await ResponseService.create({ content, idQuestion, correction });
    res.status(201).json(response);
  } catch (error) {
    res.status(500).send({
      message: "Une erreur s'est produite lors de la création de la réponse.",
    });
  }
};

// Mettre à jour une réponse par son ID
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedResponse = await ResponseService.update(id, req.body);
    res.status(200).json(updatedResponse);
  } catch (error) {
    res.status(500).send({
      message: "Une erreur s'est produite lors de la modification de la réponse.",
    });
  }
};

// Supprimer une réponse par son ID
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await ResponseService.delete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).send({
      message: "Une erreur s'est produite lors de la suppression de la réponse.",
    });
  }
};
