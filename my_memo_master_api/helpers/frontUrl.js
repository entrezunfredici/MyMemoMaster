const logger = require('./logger')

// Résout l'URL publique du front de L'ENVIRONNEMENT COURANT (dev, test, preprod, prod).
// Tout lien envoyé par email (vérification d'adresse, invitation) doit pointer sur le
// front de l'environnement qui a émis le mail — un mail parti de la prod ne doit jamais
// contenir http://localhost.
//
// Chaîne de repli (première valeur non vide gagne) :
//   1. APP_FRONT_URL  — variable dédiée, définie par environnement
//   2. VITE_FRONT_URL — même URL côté build front, présente dans tous les environnements
//   3. CORS_ORIGIN    — 1re origine autorisée = le front de l'environnement (garde-fou)
//   4. http://localhost[:VITE_PORT] — dev uniquement, avec log d'erreur hors dev
//
// Les repli 3 et 4 signalent une configuration incomplète : ils sont journalisés une
// seule fois par processus (le log est appelé à chaque envoi de mail).

let corsFallbackLogged = false
let missingConfigLogged = false

const normalize = (value) => String(value || '').trim().replace(/\/+$/, '')

module.exports = function getFrontUrl () {
  const fromApp = normalize(process.env.APP_FRONT_URL)
  if (fromApp) return fromApp

  const fromVite = normalize(process.env.VITE_FRONT_URL)
  if (fromVite) return fromVite

  const fromCors = normalize(String(process.env.CORS_ORIGIN || '').split(',')[0])
  if (fromCors) {
    if (!corsFallbackLogged) {
      corsFallbackLogged = true
      logger.warn(
        `APP_FRONT_URL et VITE_FRONT_URL absents — les liens des emails utilisent la 1re origine CORS (${fromCors}). ` +
        "Définir APP_FRONT_URL dans la configuration de l'environnement."
      )
    }
    return fromCors
  }

  if (process.env.NODE_ENV === 'production' && !missingConfigLogged) {
    missingConfigLogged = true
    logger.error(
      'APP_FRONT_URL, VITE_FRONT_URL et CORS_ORIGIN sont tous absents en production — ' +
      'les liens envoyés par email vont pointer sur localhost et seront inutilisables.'
    )
  }

  // Dev hors Docker : le front écoute sur VITE_PORT (5173). Sous Docker, Traefik
  // l'expose sur :80 et APP_FRONT_URL est défini — ce repli ne s'applique pas.
  const port = normalize(process.env.VITE_PORT)
  return port && port !== '80' ? `http://localhost:${port}` : 'http://localhost'
}
