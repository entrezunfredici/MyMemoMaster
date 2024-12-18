const { Response } = require("../models/index");

class ResponseService  {

  async findAll() {
    return await Response.findAll();
  }

  async findOne(id) {
    return await Response.findByPk(id);
  }

  async create(data) {
    return await Response.create(data);
  }

  async update(id, data) {
    const response = await Response.findByPk(id);
    if (!response) {
      throw new Error("Response not found");
    }
    return await response.update(data);
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
