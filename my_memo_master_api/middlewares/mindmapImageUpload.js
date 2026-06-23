const path = require('path')
const fs = require('fs')
const multer = require('multer')
const multerS3 = require('multer-s3')
const { s3Client, bucket } = require('../config/storage.config')
const logger = require('../helpers/logger')

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
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
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
        const ext = path.extname(file.originalname).toLowerCase()
        cb(null, `mindmaps/${uniqueSuffix}${ext}`)
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
      cb(null, `${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
    }
  })
}

const mindmapImageUpload = multer({
  storage: buildStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
})

module.exports = mindmapImageUpload
