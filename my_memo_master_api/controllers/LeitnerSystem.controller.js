const leitnerSystemService = require('../services/LeitnerSystem.service.js')
const logger = require('../helpers/logger')
exports.findAll = async (req, res) => {
  try {
    const data = await leitnerSystemService.findAll(req.user.id)
    res.status(200).send(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({
      message: "Une erreur s'est produite lors de la récupération des systèmes de Leitner."
    })
  }
}

exports.findBySubject = async (req, res) => {
  try {
    const { subjectid } = req.params
    const data = await leitnerSystemService.findBySubject(subjectid, req.user.id)
    if (!data.length) {
      res.status(404).send({ message: 'Aucun système trouvé pour ce sujet.' })
    } else {
      res.status(200).send(data)
    }
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur serveur lors de la récupération.' })
  }
}

exports.findOne = async (req, res) => {
  try {
    const { id } = req.params
    const data = await leitnerSystemService.findOne(id)
    if (!data) {
      res.status(404).send({ message: `Système introuvable avec l'ID ${id}` })
    } else {
      res.status(200).send(data)
    }
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur serveur.' })
  }
}

exports.create = async (req, res) => {
  try {
    const { name, subjectId, idMindMap } = req.body
    const idUser = req.user.id

    const newSystem = await leitnerSystemService.create({
      name,
      idUser,
      subjectId: subjectId || null,
      idMindMap: idMindMap || null
    })

    // Réponse avec le nouveau système créé
    return res.status(201).json(newSystem)
  } catch (error) {
    logger.error(error?.message || error)
    return res.status(500).json({ message: 'Erreur lors de la création du système.' })
  }
}

exports.update = async (req, res) => {
  try {
    const { id } = req.params
    const { name, subjectId, idMindMap } = req.body
    const idUser = req.user.id

    const updated = await leitnerSystemService.update({
      idSystem: id,
      idUser,
      name,
      subjectId: subjectId !== undefined ? subjectId : undefined,
      idMindMap: idMindMap !== undefined ? idMindMap : undefined
    })

    if (!updated) {
      return res.status(404).send({ message: `Système introuvable pour l'ID ${id}.` })
    }

    res.status(200).send({ message: 'Système modifié avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la modification.' })
  }
}

exports.share = async (req, res) => {
  try {
    const {
      idUserShared,
      idSystem,
      writeRight,
      shareRight,
      shareWithWriteRightRight,
      shareWithAllRights
    } = req.body
    const result = await leitnerSystemService.share({
      idUserOwner: req.user.id,
      idUserShared,
      idSystem,
      writeRight,
      shareRight,
      shareWithWriteRightRight,
      shareWithAllRights
    })
    res.status(200).send(result)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(403).send({ message: 'Erreur de partage.' })
  }
}

exports.delete = async (req, res) => {
  try {
    const { id } = req.params
    const idUser = req.user.id
    const deleted = await leitnerSystemService.delete(id, idUser)
    if (!deleted) {
      return res.status(403).send({ message: 'Accès refusé ou suppression impossible.' })
    }
    res.status(200).send({ message: 'Système supprimé avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: 'Erreur serveur lors de la suppression.' })
  }
}
