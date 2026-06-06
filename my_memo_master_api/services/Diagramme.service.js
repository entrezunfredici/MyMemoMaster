const { Diagramme, Subject } = require("../models/index");

class DiagrammeService  {

  async findById(id) {
    return await Diagramme.findByPk(id); // ou findOne({ where: { idMindMap: id } });
  };

  async findAll() {
    return await Diagramme.findAll();
  }

  async findByUser(userId) {
    return await Diagramme.findAll({ where: { userId } });
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

  /**
   * Résout le subjectId : vérifie l'existant ou crée le sujet par défaut.
   *
   * @param {number|null} subjectId - ID du sujet fourni par le client
   * @returns {number} ID du sujet résolu
   */
  async resolveSubject(subjectId) {
    if (subjectId) {
      const subject = await Subject.findByPk(subjectId);
      if (subject) return subject.subjectId;
    }
    const [subject] = await Subject.findOrCreate({
      where: { name: "Sujet par défaut" },
      defaults: { name: "Sujet par défaut" },
    });
    return subject.subjectId;
  }
}

module.exports = new DiagrammeService();
