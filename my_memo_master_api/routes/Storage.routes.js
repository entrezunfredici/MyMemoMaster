const express = require('express')
const multer = require('multer')
const storage = require('../controllers/Storage.controller')
const upload = require('../middlewares/upload.middleware')
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const storageValidators = require('../validators/Storage.validators')

const router = express.Router()

/**
 * Wrapper pour capturer les erreurs Multer et les renvoyer en JSON propre.
 */
const handleUpload = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).send({ message: err.message })
    }
    if (err) {
      return res.status(400).send({ message: err.message })
    }
    next()
  })
}

/**
 * @swagger
 * /storage/upload:
 *   post:
 *     summary: Upload d'un fichier vers le stockage S3
 *     tags: [Storage]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: "Fichier à uploader (max 10 Mo, types : jpeg, png, gif, webp, pdf)"
 *     responses:
 *       201:
 *         description: Fichier uploadé avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 key:
 *                   type: string
 *                   example: "uploads/1717600000000-123456789.jpg"
 *                 url:
 *                   type: string
 *                   example: "https://my-bucket.s3.eu-west-3.amazonaws.com/uploads/1717600000000-123456789.jpg"
 *                 mimetype:
 *                   type: string
 *                   example: "image/jpeg"
 *                 size:
 *                   type: integer
 *                   example: 204800
 *       400:
 *         description: Fichier manquant ou type non autorisé.
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.post('/upload', authMiddleware, handleUpload(upload.single('file')), storage.upload)

/**
 * @swagger
 * /storage/upload/multiple:
 *   post:
 *     summary: Upload de plusieurs fichiers vers le stockage S3 (max 5)
 *     tags: [Storage]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "Fichiers à uploader (max 5, 10 Mo chacun)"
 *     responses:
 *       201:
 *         description: Fichiers uploadés avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   key:
 *                     type: string
 *                   url:
 *                     type: string
 *                   mimetype:
 *                     type: string
 *                   size:
 *                     type: integer
 *       400:
 *         description: Fichiers manquants ou type non autorisé.
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.post(
  '/upload/multiple',
  authMiddleware,
  handleUpload(upload.array('files', 5)),
  storage.uploadMultiple
)

/**
 * @swagger
 * /storage/file:
 *   delete:
 *     summary: Supprime un fichier du stockage S3
 *     tags: [Storage]
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Clé S3 du fichier à supprimer (ex. "uploads/1717600000000-123456789.jpg")
 *     responses:
 *       200:
 *         description: Fichier supprimé avec succès.
 *       400:
 *         description: Paramètre 'key' manquant.
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.delete('/file', authMiddleware, storageValidators.delete, validate, storage.delete)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: Storage
   *     description: Gestion du stockage de fichiers (S3)
   */
  app.use('/storage', router)
}
