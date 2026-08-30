const path = require('path')
const crypto = require('crypto')
const os = require('os')
const multer = require('multer')
const multerS3 = require('multer-s3')
const { s3Client, bucket } = require('../config/storage.config')
const { extensionMatchesMime, s3SniffContentType } = require('../helpers/fileSignature')
const logger = require('../helpers/logger')

// Suffixe de nom de fichier tire d'un generateur CRYPTOGRAPHIQUE, pas de
// Math.random() : les cles d'objets uploades ne doivent pas etre devinables.
// Une cle previsible (`<horodatage>-<random faible>`) se brute-force, et celles
// des mind maps ne sont meme pas cloisonnees par utilisateur.
// Signale par javascript:S2245.
const uniqueSuffix = () => `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const err = new Error(
      `Type de fichier non autorisé. Types acceptés : ${ALLOWED_MIME_TYPES.join(', ')}`
    )
    err.isFileFilterError = true
    return cb(err, false)
  }
  // OWASP A08-M2 — croisement extension ↔ MIME déclaré (anti-spoofing, 1re ligne)
  const ext = path.extname(file.originalname).toLowerCase()
  if (!extensionMatchesMime(ext, file.mimetype)) {
    const err = new Error(
      `L'extension du fichier (${ext || 'absente'}) ne correspond pas à son type déclaré.`
    )
    err.isFileFilterError = true
    return cb(err, false)
  }
  cb(null, true)
}

const storage = bucket
  ? multerS3({
      s3: s3Client,
      bucket,
      // OWASP A08-M2 — magic bytes vérifiés sur le flux (2e ligne, remplace AUTO_CONTENT_TYPE)
      contentType: s3SniffContentType,
      key: (req, file, cb) => {
        const userId = req.user?.id || 'anon'
        const suffix = uniqueSuffix()
        const ext = path.extname(file.originalname).toLowerCase()
        cb(null, `uploads/${userId}/${suffix}${ext}`)
      }
    })
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, os.tmpdir()),
      filename: (_req, file, cb) => {
        const suffix = uniqueSuffix()
        const ext = path.extname(file.originalname).toLowerCase()
        cb(null, `${suffix}${ext}`)
      }
    })

if (!bucket) {
  logger.warn(
    '[upload] S3_BUCKET non configuré — stockage temporaire local (disk) actif. Configurer S3 pour la production.'
  )
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
})

module.exports = upload
