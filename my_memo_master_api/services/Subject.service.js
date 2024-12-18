const { Subject } = require("../models/index");

const SubjectService = {
  // Récupérer tous les sujets
  async findAll() {
    return await Subject.findAll();
  },

  async findOne(subjectId) {
    return await Subject.findByPk(subjectId);
  },

  async create(data) {
    return await Subject.create(data);
  },

  async update(subjectId, data) {
    const subject = await Subject.findByPk(subjectId);
    if (!subject) return null;

    await subject.update(data);
    return subject;
  },

  async delete(subjectId) {
    const subject = await Subject.findByPk(subjectId);
    if (!subject) return false;

    await subject.destroy();
    return true;
  },
};

module.exports = SubjectService;
