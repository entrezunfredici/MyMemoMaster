const multer = require('multer')
const logger = require('../helpers/logger')

// OWASP F-M7 — neutralise les retours à la ligne et caractères de contrôle dans les
// messages d'erreur avant journalisation (un message forgé ne peut pas injecter de
// fausses lignes de log ni corrompre le format)
// eslint-disable-next-line no-control-regex -- le but est précisément de retirer les caractères de contrôle
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001f\\u007f]+', 'g')
const sanitizeForLog = (value) => String(value ?? '').replace(CONTROL_CHARS, ' ')

// eslint-disable-next-line no-unused-vars -- 4 params requis par Express pour les error handlers
module.exports = (err, req, res, _next) => {
  logger.error(`${req.method} ${sanitizeForLog(req.path)} — ${sanitizeForLog(err.message || err)}`)

  if (err instanceof multer.MulterError || err?.isFileFilterError) {
    return res.status(400).json({ message: err.message })
  }

  const status = err.status || err.statusCode || 500
  const isProd = process.env.NODE_ENV === 'production'
  res
    .status(status)
    .json({
      message: isProd ? 'Erreur interne du serveur.' : err.message || 'Erreur interne du serveur.'
    })
}
