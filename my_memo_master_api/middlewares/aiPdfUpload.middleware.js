const multer = require('multer')

// Upload du PDF source pour la génération de cartes par IA (C-01). Volontairement distinct de
// middlewares/upload.middleware.js : ce fichier stocke durablement (S3/disque) des assets
// utilisateur (images mindmap, ressources de classe) ; ici le PDF n'est qu'une entrée éphémère
// pour l'extraction de texte (services/PdfExtraction.service.js) — jamais conservé après la
// requête. `memoryStorage()` évite une écriture disque/S3 inutile : `req.file.buffer` suffit.
//
// Vérification magic bytes (OWASP A08-M2) faite dans le controller via `bufferMatchesMime`
// (comme s3SniffContentType le fait pour l'upload S3) — memoryStorage n'a pas d'équivalent
// "contentType" pour intercepter le flux, le buffer est déjà entièrement disponible après multer.

const MAX_PDF_SIZE = 10 * 1024 * 1024 // 10 Mo, même plafond que middlewares/upload.middleware.js

const fileFilter = (_req, file, cb) => {
  if (file.mimetype !== 'application/pdf') {
    const err = new Error('Seuls les fichiers PDF sont acceptés.')
    err.isFileFilterError = true
    return cb(err, false)
  }
  cb(null, true)
}

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_SIZE },
  fileFilter
})
