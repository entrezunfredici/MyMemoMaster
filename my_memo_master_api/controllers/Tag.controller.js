const logger = require('../helpers/logger')
const tagService = require('../services/Tag.service')

exports.findAll = async (req, res) => {
  try {
    const data = await tagService.findAll()
    res.status(200).json(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération des tags.' })
  }
}

exports.findOne = async (req, res) => {
  try {
    const data = await tagService.findOne(req.params.id)
    if (!data) return res.status(404).json({ message: 'Tag introuvable.' })
    res.status(200).json(data)
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la récupération du tag.' })
  }
}

exports.create = async (req, res) => {
  try {
    const data = await tagService.create(req.body)
    res.status(201).json({ message: 'Tag créé avec succès.', data })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la création du tag.' })
  }
}

exports.update = async (req, res) => {
  try {
    const data = await tagService.update(req.params.id, req.body)
    if (!data) return res.status(404).json({ message: 'Tag introuvable.' })
    res.status(200).json({ message: 'Tag mis à jour avec succès.', data })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la mise à jour du tag.' })
  }
}

exports.delete = async (req, res) => {
  try {
    const deleted = await tagService.delete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'Tag introuvable.' })
    res.status(200).json({ message: 'Tag supprimé avec succès.' })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la suppression du tag.' })
  }
}

exports.setForMindMap = async (req, res) => {
  try {
    const { tagIds } = req.body
    const data = await tagService.setTagsForMindMap(req.params.id, tagIds || [], req.user.id)
    if (data === null) return res.status(404).json({ message: 'Carte mentale introuvable.' })
    res.status(200).json({ message: 'Tags mis à jour avec succès.', data })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la mise à jour des tags.' })
  }
}

exports.setForLeitnerSystem = async (req, res) => {
  try {
    const { tagIds } = req.body
    const data = await tagService.setTagsForLeitnerSystem(req.params.id, tagIds || [], req.user.id)
    if (data === null) return res.status(404).json({ message: 'Système Leitner introuvable.' })
    res.status(200).json({ message: 'Tags mis à jour avec succès.', data })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la mise à jour des tags.' })
  }
}

exports.setForTest = async (req, res) => {
  try {
    const { tagIds } = req.body
    const data = await tagService.setTagsForTest(req.params.id, tagIds || [])
    if (data === null) return res.status(404).json({ message: 'Exercice introuvable.' })
    res.status(200).json({ message: 'Tags mis à jour avec succès.', data })
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).json({ message: 'Erreur lors de la mise à jour des tags.' })
  }
}
