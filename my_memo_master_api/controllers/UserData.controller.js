const dayjs = require('dayjs')
const userDataExportService = require('../services/UserDataExport.service')
const logger = require('../helpers/logger')

/**
 * GET /users/me/export — télécharge toutes les données de l'utilisateur connecté en JSON.
 */
exports.exportMyData = async (req, res) => {
  try {
    const data = await userDataExportService.exportUserData(req.user.id)
    if (!data) return res.status(404).send({ message: 'Utilisateur introuvable.' })

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mymemomaster-export-${dayjs().format('YYYY-MM-DD')}.json"`
    )
    res.status(200).send(JSON.stringify(data, null, 2))
  } catch (error) {
    logger.error(error?.message || error)
    res.status(500).send({ message: "Erreur lors de l'export des données." })
  }
}

/**
 * POST /users/me/import — importe un fichier d'export dans le compte de l'utilisateur connecté.
 */
exports.importMyData = async (req, res) => {
  try {
    const summary = await userDataExportService.importUserData(req.user.id, req.body)
    res.status(201).send({ message: 'Import terminé avec succès.', data: summary })
  } catch (error) {
    if (error instanceof userDataExportService.ImportValidationError) {
      return res.status(400).send({ message: error.message })
    }
    logger.error(error?.message || error)
    res.status(500).send({ message: "Erreur lors de l'import des données." })
  }
}
