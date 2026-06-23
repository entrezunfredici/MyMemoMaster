const path = require('path')
const { Readable } = require('stream')
const { GetObjectCommand } = require('@aws-sdk/client-s3')
const DiagrammeService = require('../services/Diagramme.service.js')
const logger = require('../helpers/logger')
const { s3Client, bucket: s3Bucket } = require('../config/storage.config')

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

    let filePath
    if (s3Bucket && req.file.key) {
      // S3 : proxy via l'API (Infomaniak Swiss Backup ne supporte pas l'accès public direct)
      filePath = `/api/v1/diagrammes/image/${req.file.key}`
    } else {
      // Local (dev sans S3) : servi par express.static sous /api/uploads
      const relativePath = path.join('api', 'uploads', 'mindmaps', req.file.filename).replace(/\\/g, '/')
      filePath = `/${relativePath}`
    }

    return res.status(201).json({
      message: 'Image téléchargée avec succès.',
      path: filePath,
      key: req.file.key || req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    })
  } catch (error) {
    logger.error(error?.message || error)
    return res.status(500).json({ message: "Erreur lors de l'upload de l'image." })
  }
}

exports.getImage = async (req, res) => {
  if (!s3Bucket) {
    return res.status(404).json({ message: 'Stockage S3 non configuré.' })
  }
  try {
    const key = req.params[0]
    if (!key) return res.status(400).json({ message: 'Clé image manquante.' })

    const command = new GetObjectCommand({ Bucket: s3Bucket, Key: key })
    const s3Response = await s3Client.send(command)

    res.setHeader('Content-Type', s3Response.ContentType || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=31536000')
    if (s3Response.ContentLength) {
      res.setHeader('Content-Length', s3Response.ContentLength)
    }

    Readable.from(s3Response.Body).pipe(res)
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ message: 'Image introuvable.' })
    }
    logger.error(error?.message || error)
    return res.status(500).json({ message: "Erreur lors de la récupération de l'image." })
  }
}
