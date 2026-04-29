const semanticService = require('../services/Semantic.service');

exports.gradeSemantic = async (req, res) => {
  try {
    const { correct_answers, student_answer } = req.body;

    // validation des champs
    if (!correct_answers) {
      return res.status(400).send({
        message: 'Field "correct_answers" is required (string or array of strings).',
      });
    }

    // Validation de correct_answers: must be non-empty string or array of non-empty strings
    const isValidCorrect =
      (typeof correct_answers === 'string' && correct_answers.trim()) ||
      (Array.isArray(correct_answers) &&
        correct_answers.length > 0 &&
        correct_answers.every((a) => typeof a === 'string' && a.trim()));

    if (!isValidCorrect) {
      return res.status(400).send({
        message: 'Field "correct_answers" must be a non-empty string or array of non-empty strings.',
      });
    }

    if (student_answer === undefined) {
      return res.status(400).send({
        message: 'Field "student_answer" is required.',
      });
    }

    // appel du service de correction sémantique
    const result = await semanticService.gradeSemantic(correct_answers, student_answer);

    res.status(200).send(result);
  } catch (error) {
    console.error('[SemanticController] Error:', error?.message || error);
    res.status(500).send({
      message: 'Erreur lors de la correction sémantique.',
    });
  }
};
