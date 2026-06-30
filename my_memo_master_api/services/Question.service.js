const { Question, Test, Response, LeitnerCard } = require('../models/index')

class QuestionService {
  async getAllQuestions() {
    return await Question.findAll()
  }

  async getQuestionsByTest(testId) {
    return await Question.findAll({
      include: [
        {
          model: Test,
          as: 'test',
          where: { testId }
        }
      ]
    })
  }

  async getQuestionByCard(cardId) {
    return await Question.findOne({
      include: [
        {
          model: LeitnerCard,
          as: 'leitnerCard',
          where: { idCard: cardId }
        }
      ]
    })
  }

  async findOne(id) {
    return await Question.findByPk(id)
  }

  async getCorrectionByQuestion(idQuestion) {
    return await Response.findOne({
      where: { idQuestion, correction: true }
    })
  }

  async create(data) {
    const { statement, questionPosition, type, content = null, idTest } = data
    const question = await Question.create({ statement, questionPosition, type, content })
    if (idTest) {
      const test = await Test.findByPk(idTest)
      if (test) await question.addTest(test)
    }
    return question
  }

  async update(id, data) {
    const question = await Question.findByPk(id)
    if (!question) {
      throw Object.assign(new Error('Question introuvable'), { code: 'NOT_FOUND' })
    }
    const { statement, questionPosition, type, content } = data
    return await question.update({ statement, questionPosition, type, content })
  }

  async delete(id) {
    const question = await Question.findByPk(id)
    if (!question) {
      throw Object.assign(new Error('Question introuvable'), { code: 'NOT_FOUND' })
    }
    return await question.destroy()
  }
}

module.exports = new QuestionService()
