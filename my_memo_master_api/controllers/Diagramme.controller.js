const path = require('path')
const DiagrammeService = require('../services/Diagramme.service.js')
const logger = require('../helpers/logger')

exports.findAll = async (req, res) => {
  try {
    const { subjectId } = req.query
    const responses = await DiagrammeService.findByUser(req.user.id, {
      subjectId: subjectId ? Number(subjectId) : undefined,
    })
    res.status(200).json(responses)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des diagrammes.' })
  }
}

exports.findOne = async (req, res) => {
  try {
    const response = await DiagrammeService.findOne(req.params.id)
    if (!response) {
      return res
        .status(404)
        .json({ message: `Diagramme introuvable pour l'identifiant ${req.params.id}.` })
    }
    if (String(response.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Accès refusé.' })
    }
    res.status(200).json(response)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération du diagramme.' })
  }
}

exports.create = async (req, res) => {
  try {
    let { mmName, mindMapJson, subjectId } = req.body
    const userId = req.user.id

    subjectId = await DiagrammeService.resolveSubject(subjectId)
    const data = await DiagrammeService.create({ mmName, mindMapJson, userId, subjectId })
    res.status(201).json(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la création du diagramme.' })
  }
}

exports.update = async (req, res) => {
  try {
    const { id } = req.params
    const { mmName, mindMapJson, subjectId } = req.body

    const existing = await DiagrammeService.findById(id)
    if (!existing) {
      return res.status(404).json({ message: `Diagramme avec l'ID ${id} non trouvé.` })
    }
    if (String(existing.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Accès refusé.' })
    }

    let resolvedSubjectId = existing.subjectId
    if (subjectId && Number(subjectId) !== existing.subjectId) {
      resolvedSubjectId = await DiagrammeService.resolveSubject(Number(subjectId))
    }

    const updatedDiagramme = await DiagrammeService.update(id, {
      mmName,
      mindMapJson,
      subjectId: resolvedSubjectId,
    })
    res.status(200).json(updatedDiagramme)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la modification du diagramme.' })
  }
}

exports.delete = async (req, res) => {
  try {
    const { id } = req.params
    const diagramme = await DiagrammeService.findById(id)
    if (!diagramme) {
      return res.status(404).json({ message: `Diagramme avec l'ID ${id} non trouvé.` })
    }
    if (String(diagramme.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Accès refusé.' })
    }
    await DiagrammeService.delete(id)
    res.status(204).send()
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la suppression du diagramme.' })
  }
}

exports.uploadImage = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucune image n'a été envoyée." })
    }
    const relativePath = path.join('api', 'uploads', 'mindmaps', req.file.filename).replace(/\\/g, '/')
    const baseUrl = process.env.API_PUBLIC_URL || `${req.protocol}://${req.get('host')}`
    const url = `${baseUrl}/${relativePath}`
    return res.status(201).json({
      message: 'Image téléchargée avec succès.',
      url,
      path: `/${relativePath}`,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    })
  } catch (error) {
    logger.error(error?.message || error)
    return res.status(500).json({ message: "Erreur lors de l'upload de l'image." })
  }
}
