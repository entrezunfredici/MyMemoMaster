const { Tutorials } = require("../models/index");
const { Op } = require("sequelize");

class TutorialsService {
  async findAll({ where, offset, limit }) {
    return await Tutorials.findAll({ where, offset, limit });
  }

  async findOne(id) {
    return await Tutorials.findByPk(id);
  }

  async create(data) {
    return await Tutorials.create(data);
  }

  async update(id, newData) {
    const tutorial = await Tutorials.findByPk(id);
    if (tutorial) {
      await tutorial.update(newData);
      return tutorial;
    }
    return null;
  }

  async delete(id) {
    const tutorial = await Tutorials.findByPk(id);
    if (tutorial) {
      await tutorial.destroy();
      return true;
    }
    return false;
  }

  async count({ search, subjectId, revisionTips }) {
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        // { description: { [Op.like]: `%${search}%` } },
      ];
    }
    if (subjectId) {
      where.subjectId = subjectId;
    }
    if (revisionTips !== undefined) {
      where.revisionTips = revisionTips;
    }

    return await Tutorials.count({ where });
  }
}

module.exports = new TutorialsService();