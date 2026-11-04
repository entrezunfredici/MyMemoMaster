const logger = require('../logger')

/**
 * Signale un événement métier au moteur de badges.
 * Ne lève jamais : un échec du moteur ne doit pas faire échouer l'action de l'utilisateur
 * (même principe best effort que le journal des sessions Leitner).
 *
 * @param {string} type - 'exercise.submitted' | 'leitner.session.completed' | 'mindmap.viewed'
 * @param {{ userId: number }} payload
 * @returns {Promise<string[]>} codes des badges nouvellement obtenus (vide en cas d'échec)
 */
async function emit(type, payload) {
  try {
    // Chargement différé : évite une dépendance circulaire avec les services émetteurs
    const badgeService = require('../../services/Badge.service')
    return await badgeService.handle(type, payload)
  } catch (error) {
    logger.error(`[badges] Échec du traitement de l'événement ${type} : ${error?.message || error}`)
    return []
  }
}

module.exports = { emit }
