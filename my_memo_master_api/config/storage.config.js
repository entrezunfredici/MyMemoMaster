const { S3Client } = require('@aws-sdk/client-s3')

const bucket = process.env.S3_BUCKET
const publicUrl = process.env.S3_PUBLIC_URL
// Requis pour MinIO et certains fournisseurs S3-compatibles (ex: Scaleway, Backblaze, Infomaniak)
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  },
  forcePathStyle
})

/**
 * Construit l'URL publique d'une clé S3 en respectant le style d'adressage du fournisseur.
 * En path-style (`forcePathStyle`, ex. Infomaniak) le nom du bucket fait partie du chemin
 * (`publicUrl/bucket/key`) ; `multer-s3` le calcule automatiquement via `req.file.location`
 * (voir `middlewares/upload.middleware.js`, `middlewares/mindmapImageUpload.js`), mais un upload
 * direct par `PutObjectCommand` (pas de requête multipart à parser) doit le reconstruire lui-même.
 * En virtual-hosted-style (AWS standard), le bucket est déjà dans le domaine de `publicUrl`.
 *
 * @param {string} key
 * @returns {string}
 */
const buildPublicUrl = (key) => (forcePathStyle ? `${publicUrl}/${bucket}/${key}` : `${publicUrl}/${key}`)

module.exports = {
  s3Client,
  bucket,
  publicUrl,
  buildPublicUrl
}
