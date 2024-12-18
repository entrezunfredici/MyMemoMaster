const { Subject } = require("../models/index");

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

  async update(id, newData) {
    const subject = await Subject.findByPk(id);
    if (subject) {
      await subject.update(newData);
      return subject;
    }
    return null;
  }

  async delete(id) {
    const subject = await Subject.findByPk(id);
    if (subject) {
      await subject.destroy();
      return true;
    }
    return false;
  }
}

module.exports = new SubjectService();
