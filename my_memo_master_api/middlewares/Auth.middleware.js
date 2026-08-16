const jwt = require('jsonwebtoken')
const logger = require('../helpers/logger')
const tokenBlacklist = require('../helpers/tokenBlacklist')

module.exports = async (req, res, next) => {
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

    // A07-M1 : rejette les tokens émis avant la dernière révocation de l'utilisateur
    // (logout, changement/reset de mot de passe, désactivation de compte) — voir helpers/tokenBlacklist.js
    if (await tokenBlacklist.isTokenRevoked(decoded.id, decoded.iat)) {
      res.status(401).send({ message: 'Session révoquée. Merci de vous reconnecter.' })
      return
    }

    req.user = decoded
    next()
  } catch (error) {
    logger.error(error?.message || error)
    res.status(401).send({ message: 'Token invalide ou expiré.' })
    return
  }
}
