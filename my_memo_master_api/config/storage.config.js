const { S3Client } = require('@aws-sdk/client-s3')

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  },
  // Requis pour MinIO et certains fournisseurs S3-compatibles (ex: Scaleway, Backblaze)
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
})

module.exports = {
  s3Client,
  bucket: process.env.S3_BUCKET,
  publicUrl: process.env.S3_PUBLIC_URL
}
