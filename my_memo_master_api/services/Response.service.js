const Response = require("../models/Response.model");

const ResponseService = {
  async getAll() {
    return await Response.findAll();
  },

  async getById(id) {
    return await Response.findByPk(id);
  },

  async create(data) {
    return await Response.create(data);
  },

  async update(id, data) {
    const response = await Response.findByPk(id);
    if (!response) {
      throw new Error("Response not found");
    }
    return await response.update(data);
  },

  async delete(id) {
    const response = await Response.findByPk(id);
    if (!response) {
      throw new Error("Response not found");
    }
    return await response.destroy();
  },
};

module.exports = ResponseService;
