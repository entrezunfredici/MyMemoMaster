const path = require('path')
const os = require('os')
const multer = require('multer')
const multerS3 = require('multer-s3')
const { s3Client, bucket } = require('../config/storage.config')
const logger = require('../helpers/logger')

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    const err = new Error(
      `Type de fichier non autorisé. Types acceptés : ${ALLOWED_MIME_TYPES.join(', ')}`
    )
    err.isFileFilterError = true
    cb(err, false)
  }
}

const storage = bucket
  ? multerS3({
      s3: s3Client,
      bucket,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const userId = req.user?.id || 'anon'
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
        const ext = path.extname(file.originalname).toLowerCase()
        cb(null, `uploads/${userId}/${uniqueSuffix}${ext}`)
      }
    })
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, os.tmpdir()),
      filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
        const ext = path.extname(file.originalname).toLowerCase()
        cb(null, `${uniqueSuffix}${ext}`)
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
