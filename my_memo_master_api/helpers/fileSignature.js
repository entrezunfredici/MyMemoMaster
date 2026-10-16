const { PassThrough } = require('stream')

// Vérification des signatures binaires (magic bytes) des fichiers uploadés — OWASP A08-M2.
// CHOIX: signatures codées à la main plutôt que le package `file-type`
// RAISON: file-type ≥ v17 est ESM-only (projet CommonJS) et la v16 CJS n'est plus
//         maintenue ; les 11 types autorisés ont des signatures stables et documentées

/**
 * Signatures binaires par type MIME autorisé.
 * Chaque entrée : { offset, bytes } — le buffer doit contenir `bytes` à `offset`.
 * Un MIME peut accepter plusieurs signatures (ex: GIF87a / GIF89a).
 */
const SIGNATURES = {
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/gif': [
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] } // GIF89a
  ],
  // RIFF....WEBP — les octets 4-7 (taille) varient, vérifiés en deux morceaux
  'image/webp': [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46], and: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } }
  ],
  'application/pdf': [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  // OOXML (docx/pptx/xlsx) = archive ZIP
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }
  ],
  // Office legacy (doc/ppt/xls) = conteneur CFB
  'application/msword': [{ offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],
  'application/vnd.ms-powerpoint': [{ offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],
  'application/vnd.ms-excel': [{ offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }]
}

/**
 * Extensions de fichier acceptées pour chaque type MIME déclaré.
 * Croisement extension ↔ MIME (première ligne de défense, avant les magic bytes).
 */
const EXTENSIONS_BY_MIME = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
}

const matchesAt = (buffer, offset, bytes) => {
  if (buffer.length < offset + bytes.length) return false
  return bytes.every((b, i) => buffer[offset + i] === b)
}

/**
 * Vérifie que l'extension du fichier est cohérente avec le type MIME déclaré.
 *
 * @param {string} ext - Extension en minuscules, point inclus (ex: ".png")
 * @param {string} mimetype - Type MIME déclaré par le client
 * @returns {boolean} true si l'extension correspond au MIME
 */
const extensionMatchesMime = (ext, mimetype) => {
  const allowed = EXTENSIONS_BY_MIME[mimetype]
  return Array.isArray(allowed) && allowed.includes(ext)
}

/**
 * Vérifie que le contenu binaire du fichier correspond au type MIME déclaré.
 *
 * @param {Buffer} buffer - Premiers octets du fichier (≥ 12 octets recommandés)
 * @param {string} mimetype - Type MIME déclaré par le client
 * @returns {boolean} true si une signature du MIME est présente dans le buffer
 */
const bufferMatchesMime = (buffer, mimetype) => {
  const signatures = SIGNATURES[mimetype]
  if (!Array.isArray(signatures) || !Buffer.isBuffer(buffer)) return false
  return signatures.some(
    (sig) =>
      matchesAt(buffer, sig.offset, sig.bytes) &&
      (!sig.and || matchesAt(buffer, sig.and.offset, sig.and.bytes))
  )
}

/**
 * Fonction `contentType` pour multer-s3 : lit le premier chunk du flux, vérifie
 * que les magic bytes correspondent au MIME déclaré, puis relaie le flux intact.
 * Remplace multerS3.AUTO_CONTENT_TYPE (qui détecte sans jamais rejeter).
 *
 * @param {object} _req - Requête Express (non utilisée)
 * @param {object} file - Fichier multer (`file.stream`, `file.mimetype`)
 * @param {Function} cb - Callback multer-s3 (err, mime, replacementStream)
 */
const s3SniffContentType = (_req, file, cb) => {
  const onEndEarly = () => {
    const err = new Error('Fichier vide ou illisible.')
    err.isFileFilterError = true
    cb(err)
  }
  file.stream.once('end', onEndEarly)
  // Handler synchrone : aucun chunk n'est perdu entre le premier 'data' et le pipe
  file.stream.once('data', (head) => {
    file.stream.removeListener('end', onEndEarly)
    if (!bufferMatchesMime(head, file.mimetype)) {
      const err = new Error(
        'Le contenu du fichier ne correspond pas à son type déclaré (signature invalide).'
      )
      err.isFileFilterError = true
      err.code = 'INVALID_FILE_SIGNATURE'
      return cb(err)
    }
    const replacement = new PassThrough()
    replacement.write(head)
    file.stream.pipe(replacement)
    cb(null, file.mimetype, replacement)
  })
}

module.exports = { extensionMatchesMime, bufferMatchesMime, s3SniffContentType, EXTENSIONS_BY_MIME }
