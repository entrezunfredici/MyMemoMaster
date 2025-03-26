const {  Question, Response } = require("../models/index");

class ResponseService  {

  async getAllResponsesByQuestion(idQuestion) {
    return await Response.findAll({
      where: { idQuestion, correction: false },
    });
  }

  async getCorrectionByQuestion(idQuestion) {
    return await Response.findOne({
      where: { idQuestion, correction: true },
    });
  }

  async findOne(id) {
    return await Response.findByPk(id);
  }

  async create(data) {
    const {content, idQuestion, correction} = data;

    //check if question exist
    const question = await Question.findByPk(idQuestion);
    if (!question) {
      throw new Error("Question not found");
    }

    return await Response.create({ content, idQuestion, correction });

  }

  async update(id, data) {
    const {content, idQuestion, correction} = data;

    const response = await Response.findByPk(id);
    if (!response) {
      throw new Error("Response not found");
    }
    return await response.update({ content, idQuestion, correction });
  }

  async delete(id) {
    const response = await Response.findByPk(id);
    if (!response) {
      throw new Error("Response not found");
    }
    return await response.destroy();
  }
}

module.exports = new ResponseService();
