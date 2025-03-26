const QuestionService = require("../services/Question.service");


  exports.getAllQuestions = async(req, res) => {
    try {
      const questions = await QuestionService.getAllQuestions();
      res.status(200).json(questions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  exports.getQuestionsByTest  = async(req, res) => {
    try {
      const { testId } = req.params;
      const questions = await QuestionService.getQuestionsByTest(testId);
      res.status(200).json(questions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  exports.getQuestionByCard = async(req, res) => {
    try {
      const { cardId } = req.params;
      const question = await QuestionService.getQuestionByCard(cardId);
      res.status(200).json(question);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  exports.findOne = async (req, res) => {
    try {
      const { id } = req.params;
      const question = await QuestionService.findOne(id);
      res.status(200).json(question);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  exports.getCorrectionByQuestion = async (req, res) => {
    try {
      const { idQuestion } = req.params;
      const correction = await QuestionService.getCorrectionByQuestion(idQuestion);
      res.status(200).json(correction);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  exports.create = async (req, res) => {
    try {
      const data = req.body;
      const question = await QuestionService.create(data);
      res.status(201).json(question);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  exports.update = async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const question = await QuestionService.update(id, data);
      res.status(200).json(question);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  exports.delete = async (req, res) => {
    try {
      const { id } = req.params;
      await QuestionService.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
