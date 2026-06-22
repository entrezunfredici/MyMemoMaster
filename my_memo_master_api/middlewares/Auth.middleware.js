const jwt = require('jsonwebtoken')
const logger = require('../helpers/logger')

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization']

  if (!authHeader) {
    res.status(401).send({ message: 'Authentification requise.' })
    return
  }

  const token = authHeader.split(' ')[1] || authHeader || null // * authHeader as 'Bearer <token>'

  if (!token) {
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
