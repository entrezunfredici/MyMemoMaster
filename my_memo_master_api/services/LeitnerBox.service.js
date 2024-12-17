const { LeitnerBox } = require("../models/index");

class LeitnerBoxService {
  async findAll() {
    return await LeitnerBox.findAll();
  }

  async findOne(id) {
    return await LeitnerBox.findByPk(id);
  }

  async create(data) {
    return await LeitnerBox.create(data);
  }

  async update(id, newData) {
    const box = await LeitnerBox.findByPk(id);
    if (box) {
      await box.update(newData);
      return box;
    }
    return null;
  }

  async delete(id) {
    const box = await LeitnerBox.findByPk(id);
    if (box) {
      await box.destroy();
      return true;
    }
    return false;
  }
}

module.exports = new LeitnerBoxService();
