const { Diagramme, Subject, Tag } = require('../models/index')

const TAG_INCLUDE = { model: Tag, as: 'tags', attributes: ['tagId', 'name', 'color'], through: { attributes: [] } }
const SUBJECT_INCLUDE = { model: Subject, as: 'subject', attributes: ['subjectId', 'name'] }

class DiagrammeService {
  async findById(id) {
    return await Diagramme.findByPk(id) // ou findOne({ where: { idMindMap: id } });
  }

  async findAll() {
    return await Diagramme.findAll()
  }

  async findByUser(userId, { subjectId } = {}) {
    const where = { userId }
    if (subjectId) where.subjectId = subjectId
    return await Diagramme.findAll({ where, include: [TAG_INCLUDE, SUBJECT_INCLUDE] })
  }

  async findOne(id) {
    return await Diagramme.findByPk(id, { include: [TAG_INCLUDE] })
  }

  async create(data) {
    return await Diagramme.create(data)
  }

  async update(id, data) {
    const diagramme = await Diagramme.findByPk(id)
    if (!diagramme) {
      throw new Error('Diagramme not found')
    }
    return await diagramme.update(data)
  }

  async delete(id) {
    const diagramme = await Diagramme.findByPk(id)
    if (!diagramme) {
      throw new Error('Diagramme not found')
    }
    return await diagramme.destroy()
  }

  /**
   * Résout le subjectId : vérifie l'existant ou retourne le sujet par défaut.
   * Note : Subject est un modèle global (sans userId) — le sujet par défaut est partagé
   * entre tous les utilisateurs, ce qui est cohérent avec la conception globale des sujets.
   *
   * @param {number|null} subjectId - ID du sujet fourni par le client
   * @returns {number} ID du sujet résolu
   */
  async resolveSubject(subjectId) {
    if (subjectId) {
      const subject = await Subject.findByPk(subjectId)
      if (subject) return subject.subjectId
    }
    const [subject] = await Subject.findOrCreate({
      where: { name: 'Sujet par défaut' },
      defaults: { name: 'Sujet par défaut' }
    })
    return subject.subjectId
  }
}

module.exports = new DiagrammeService()
