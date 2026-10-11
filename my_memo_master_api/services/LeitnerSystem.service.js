const { LeitnerSystem, LeitnerBox, LeitnerSystemsUsers, Subject, Tag, instance } = require('../models/index')
const rightsCache = require('../helpers/leitnerRightsCache')

// CHOIX: valeurs de répétition espacée réelles (1j/3j/7j/14j/30j) plutôt que les
// raccourcis de test (5/10/15/20/30 s) utilisés jusqu'ici.
// RAISON: intervall est en secondes dans tous les environnements, sans branchement
// dev/prod dans le code (voir DECISIONS.md 2026-06-06) — les raccourcis de test
// étaient donc aussi ce que recevait un système créé en prod, tant que l'utilisateur
// ne les modifiait pas lui-même via l'UI de gestion des boîtes. Le fonctionnement
// étant validé, on bascule le défaut sur les valeurs "Prod (recommandé)" déjà
// documentées dans diagrams/leitner_algo.md §5. Reste configurable par système,
// sans restriction de droits (voir DECISIONS.md — décision explicite de l'utilisateur
// de ne pas ajouter de vérification de propriété sur LeitnerBox).
// `color` est un entier 0xRRGGBB (colonne BIGINT) : rouge → vert, du moins au mieux maîtrisé.
// Palette miroir de DEFAULT_BOX_PALETTE (front, helpers/mindmap.js).
const DEFAULT_BOXES = [
  { level: 1, intervall: 86400, color: 0xe74c3c }, // 1 jour — rouge
  { level: 2, intervall: 259200, color: 0xf39c12 }, // 3 jours — orange
  { level: 3, intervall: 604800, color: 0xf1c40f }, // 7 jours — jaune
  { level: 4, intervall: 1209600, color: 0x2ecc71 }, // 14 jours — vert clair
  { level: 5, intervall: 2592000, color: 0x27ae60 } // 30 jours — vert
]

const SUBJECT_INCLUDE = { model: Subject, as: 'subject', attributes: ['subjectId', 'name'] }
const TAG_INCLUDE = { model: Tag, as: 'tags', attributes: ['tagId', 'name'], through: { attributes: [] } }

class LeitnerSystemService {
  async findAll(userId) {
    return await LeitnerSystem.findAll({
      where: { idUser: userId },
      include: [SUBJECT_INCLUDE, TAG_INCLUDE]
    })
  }

  async findBySubject(subjectId, userId) {
    return await LeitnerSystem.findAll({
      where: { subjectId, idUser: userId },
      include: [SUBJECT_INCLUDE, TAG_INCLUDE]
    })
  }

  async findOne(id) {
    return await LeitnerSystem.findByPk(id, { include: [SUBJECT_INCLUDE, TAG_INCLUDE] })
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
      return await LeitnerSystem.findByPk(system.idSystem, { include: [SUBJECT_INCLUDE, TAG_INCLUDE] })
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
    // R5 (B4_RENDU.md §5) : voir LeitnerSystemsUsers.service.js — même invalidation, ce chemin
    // (upsert direct) contourne ce service.
    await rightsCache.invalidateRights(idUserShared, idSystem)

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
