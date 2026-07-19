const jwt = require('jsonwebtoken')
const logger = require('../helpers/logger')

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization']

  if (!authHeader) {
    res.status(401).send({ message: 'Authentification requise.' })
    return
  }

  // RFC 6750 : seul le schéma "Bearer <token>" est accepté — un token nu est refusé.
  // Tous les clients légitimes (front via helpers/api.js, Swagger UI bearerAuth)
  // envoient le préfixe ; accepter un token sans schéma élargirait la surface d'attaque.
  const [scheme, token, ...rest] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token || rest.length > 0) {
    res.status(401).send({ message: 'Token manquant.' })
    return
  }

  try {
    const decoded = jwt.verify(token, process.env.AUTH_JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    logger.error(error?.message || error)
    res.status(401).send({ message: 'Token invalide ou expiré.' })
    return
  }
}
