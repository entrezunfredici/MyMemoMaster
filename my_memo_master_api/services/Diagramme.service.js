const { Diagramme } = require("../models/index");

class DiagrammeService  {

  async findAll() {
    return await Diagramme.findAll();
  }

  async findOne(id) {
    return await Diagramme.findByPk(id);
  }

  async create(data) {
    return await Diagramme.create(data);
  }

  async update(id, data) {
    const diagramme = await Diagramme.findByPk(id);
    if (!diagramme) {
      throw new Error("Diagramme not found");
    }
    return await diagramme.update(data);
  }

  async delete(id) {
    const diagramme = await Diagramme.findByPk(id);
    if (!diagramme) {
      throw new Error("Diagramme not found");
    }
    return await diagramme.destroy();
  }
}

module.exports = new DiagrammeService();
