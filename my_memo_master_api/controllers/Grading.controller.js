const gradingService = require('../services/Grading.service');

exports.gradeDateAnswer = async (req, res) => {
  try {
    const { correct_answer, student_answer } = req.body;

    // Validatation input
    if (!correct_answer || typeof correct_answer !== 'string') {
      return res.status(400).send({
        message: 'Field "correct_answer" is required and must be a string.',
      });
    }

    if (!student_answer || typeof student_answer !== 'string') {
      return res.status(400).send({
        message: 'Field "student_answer" is required and must be a string.',
      });
    }

    // notation
    const result = gradingService.gradeDateAnswer(correct_answer, student_answer);

    res.status(200).send(result);
  } catch (error) {
    console.error(error?.message || error);
    res.status(500).send({
      message: 'Erreur lors de la correction automatique.',
    });
  }
};
