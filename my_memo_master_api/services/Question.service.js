const { Question, Test } = require("../models/index");

class QuestionService {

  async getAllQuestions() {
    return await Question.findAll();
  }

  async getQuestionsByTest(testId) {
    return await Question.findAll({
      include: [{
        model: Test,
        where: { idTest: testId }
      }]
    });
  }

  async getQuestionByCard(cardId) {
    return await Question.findOne({
      include: [{
        model: LeitnerCard,
        where: { idCard: cardId }
      }]
    });
  }

  async findOne(id) {
    return await Question.findByPk(id);
  }

  async getCorrectionByQuestion(idQuestion) {
    return await Response.findOne({
      where: { idQuestion, correction: true },
    });
  }

  async create(data) {
    const { statement, questionPosition, type, idTest, idCard } = data;
    return await Question.create({ statement, questionPosition, type, idTest, idCard });
  }

  async update(id, data) {
    const question = await Question.findByPk(id);
    if (!question) {
      throw new Error("Question not found");
    }
    return await question.update(data);
  }

  async delete(id) {
    const question = await Question.findByPk(id);
    if (!question) {
      throw new Error("Question not found");
    }
    return await question.destroy();
  }
}

module.exports = new QuestionService();