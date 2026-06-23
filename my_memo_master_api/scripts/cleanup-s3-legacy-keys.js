/**
 * Supprime les fichiers S3 uploadés avant la correction H3 (M-00b.07b).
 *
 * Ancien format : uploads/{timestamp}-{random}{ext}         ← legacy, pas de userId
 * Nouveau format : uploads/{userId}/{timestamp}-{random}{ext} ← valide
 *
 * Usage :
 *   node scripts/cleanup-s3-legacy-keys.js           → dry-run (affiche sans supprimer)
 *   node scripts/cleanup-s3-legacy-keys.js --delete  → suppression réelle
 *
 * Variables d'env requises : S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY
 * Variables optionnelles  : S3_ENDPOINT, S3_FORCE_PATH_STYLE
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const { ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3')
const { s3Client, bucket } = require('../config/storage.config')

const DRY_RUN = !process.argv.includes('--delete')
const BATCH_SIZE = 1000 // maximum ListObjectsV2

if (!bucket) {
  console.error('❌  S3_BUCKET non configuré — ce script ne fonctionne qu\'avec S3.')
  process.exit(1)
}

// Un fichier est "legacy" s'il est directement sous uploads/ sans sous-dossier userId.
// Nouveau : uploads/42/1717234567890-123456789.jpg  → 3 segments
// Legacy  : uploads/1717234567890-123456789.jpg     → 2 segments
function isLegacyKey(key) {
  const parts = key.split('/')
  // parts[0] = 'uploads', parts[1] = fichier ou userId, parts[2] = fichier ou undefined
  if (parts.length !== 2) return false
  // Sécurité : on ne traite que le préfixe uploads/
  return parts[0] === 'uploads'
}

async function listLegacyKeys() {
  const legacyKeys = []
  let continuationToken

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: 'uploads/',
      MaxKeys: BATCH_SIZE,
      ContinuationToken: continuationToken
    })

    const response = await s3Client.send(cmd)
    const contents = response.Contents || []

    for (const obj of contents) {
      if (isLegacyKey(obj.Key)) {
        legacyKeys.push({ key: obj.Key, size: obj.Size, lastModified: obj.LastModified })
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
  } while (continuationToken)

  return legacyKeys
}

async function deleteKeys(keys) {
  // DeleteObjects accepte max 1000 clés par appel
  const chunks = []
  for (let i = 0; i < keys.length; i += 1000) {
    chunks.push(keys.slice(i, i + 1000))
  }

  let deleted = 0
  for (const chunk of chunks) {
    const cmd = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: chunk.map((k) => ({ Key: k })),
        Quiet: true
      }
    })
    const result = await s3Client.send(cmd)
    if (result.Errors && result.Errors.length > 0) {
      for (const err of result.Errors) {
        console.error(`  ⚠  Erreur suppression ${err.Key} : ${err.Message}`)
      }
    }
    deleted += chunk.length - (result.Errors?.length || 0)
  }
  return deleted
}

async function run() {
  console.log(`\n🔍  Scan S3 bucket "${bucket}" — recherche des fichiers legacy...\n`)

  const legacyFiles = await listLegacyKeys()

  if (legacyFiles.length === 0) {
    console.log('✅  Aucun fichier legacy trouvé. Le bucket est propre.')
    return
  }

  const totalBytes = legacyFiles.reduce((acc, f) => acc + f.size, 0)
  const totalKb = (totalBytes / 1024).toFixed(1)

  console.log(`📋  ${legacyFiles.length} fichier(s) legacy trouvé(s) (${totalKb} Ko) :\n`)
  for (const f of legacyFiles) {
    const date = f.lastModified.toISOString().slice(0, 10)
    const kb = (f.size / 1024).toFixed(1)
    console.log(`  ${date}  ${kb.padStart(8)} Ko  ${f.key}`)
  }

  if (DRY_RUN) {
    console.log('\n⚠️   MODE DRY-RUN — aucune suppression effectuée.')
    console.log('    Relancez avec --delete pour supprimer ces fichiers.\n')
    return
  }

  console.log('\n🗑   Suppression en cours...')
  const deletedCount = await deleteKeys(legacyFiles.map((f) => f.key))
  console.log(`\n✅  ${deletedCount}/${legacyFiles.length} fichier(s) supprimé(s).\n`)
}

run().catch((err) => {
  console.error('❌  Erreur inattendue :', err.message || err)
  process.exit(1)
})
