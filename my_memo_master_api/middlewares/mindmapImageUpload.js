const path = require('path')
const crypto = require('crypto')
const fs = require('fs')
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

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const error = new Error('INVALID_FILE_TYPE')
    error.code = 'INVALID_FILE_TYPE'
    return cb(error)
  }
  // OWASP A08-M2 — croisement extension ↔ MIME déclaré (anti-spoofing)
  const ext = path.extname(file.originalname).toLowerCase()
  if (!extensionMatchesMime(ext, file.mimetype)) {
    const error = new Error('INVALID_FILE_TYPE')
    error.code = 'INVALID_FILE_TYPE'
    return cb(error)
  }
  cb(null, true)
}

const buildStorage = () => {
  if (bucket) {
    return multerS3({
      s3: s3Client,
      bucket,
      // OWASP A08-M2 — magic bytes vérifiés sur le flux (remplace AUTO_CONTENT_TYPE)
      contentType: s3SniffContentType,
      key: (_req, file, cb) => {
        const suffix = uniqueSuffix()
        const ext = path.extname(file.originalname).toLowerCase()
        cb(null, `mindmaps/${suffix}${ext}`)
      }
    })
  }

  // Fallback local (dev sans S3)
  logger.warn('[mindmap-upload] S3_BUCKET non configuré — stockage local actif sous public/uploads/mindmaps/')
  const uploadsRoot = path.join(__dirname, '..', 'public', 'uploads', 'mindmaps')
  const sanitizeFilename = (filename) => {
    const name = filename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '')
    return name.slice(-50) || 'image'
  }
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      try {
        fs.mkdirSync(uploadsRoot, { recursive: true })
        cb(null, uploadsRoot)
      } catch (error) {
        cb(error)
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      const base = sanitizeFilename(path.basename(file.originalname, ext))
      cb(null, `${base}-${uniqueSuffix()}${ext}`)
    }
  })
}

const mindmapImageUpload = multer({
  storage: buildStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
})

module.exports = mindmapImageUpload
