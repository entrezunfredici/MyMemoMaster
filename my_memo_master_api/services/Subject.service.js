const { Subject } = require("../models/index");
const { Op } = require("sequelize");

class SubjectService {
  async findAll() {
    return await Subject.findAll();
  }

  async findOne(id) {
    return await Subject.findByPk(id);
  }

  async create(data) {
    return await Subject.create(data);
  }
}

module.exports = new SubjectService();
