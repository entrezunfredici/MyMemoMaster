const { LeitnerSystem, LeitnerBox, LeitnerSystemsUsers, Subject, instance } = require('../models/index')

const DEFAULT_BOXES = [
  { level: 1, intervall: 5, color: 123456 },
  { level: 2, intervall: 10, color: 654321 },
  { level: 3, intervall: 15, color: 111111 },
  { level: 4, intervall: 20, color: 222222 },
  { level: 5, intervall: 30, color: 333333 }
]

const SUBJECT_INCLUDE = { model: Subject, as: 'subject', attributes: ['subjectId', 'name'] }

class LeitnerSystemService {
  async findAll(userId) {
    return await LeitnerSystem.findAll({
      where: { idUser: userId },
      include: [SUBJECT_INCLUDE]
    })
  }

  async findBySubject(subjectId, userId) {
    return await LeitnerSystem.findAll({
      where: { subjectId, idUser: userId },
      include: [SUBJECT_INCLUDE]
    })
  }

  async findOne(id) {
    return await LeitnerSystem.findByPk(id, { include: [SUBJECT_INCLUDE] })
  }

  async create(data) {
    const t = await instance.transaction()
    try {
      const system = await LeitnerSystem.create(data, { transaction: t })
      await LeitnerBox.bulkCreate(
        DEFAULT_BOXES.map((box) => ({ ...box, idSystem: system.idSystem })),
        { transaction: t }
      )
      await t.commit()
      return await LeitnerSystem.findByPk(system.idSystem, { include: [SUBJECT_INCLUDE] })
    } catch (err) {
      await t.rollback()
      throw err
    }
  }

  async update(data) {
    const { idSystem, idUser, ...updates } = data
    const system = await LeitnerSystem.findByPk(idSystem)
    if (system && system.idUser === idUser) {
      await system.update(updates)
      return true
    }
    return false
  }

  async share(data) {
    const {
      idUserOwner,
      idUserShared,
      idSystem,
      writeRight = false,
      shareRight = false,
      shareWithWriteRightRight = false,
      shareWithAllRights = false
    } = data

    const ownerRights = await LeitnerSystemsUsers.findOne({
      where: { idUser: idUserOwner, idSystem }
    })

    if (!ownerRights || !ownerRights.shareRight) {
      throw new Error("Vous n'avez pas les droits pour partager ce système.")
    }

    await LeitnerSystemsUsers.upsert({
      idUser: idUserShared,
      idSystem,
      writeRight,
      shareRight,
      shareWithWriteRightRight,
      shareWithAllRights
    })

    return { message: 'Système partagé avec succès.' }
  }

  async delete(id, idUser) {
    const system = await LeitnerSystem.findByPk(id)
    if (system && system.idUser === idUser) {
      await system.destroy()
      return true
    }
    return false
  }
}

module.exports = new LeitnerSystemService()
