// Résout la configuration d'appel à l'API Mistral (fournisseur retenu — voir
// diagrams/generation_ia_llm_benchmark.md, C-01.03) depuis les variables d'environnement.
//
// CHOIX : une fonction (résolution à l'appel), pas un objet figé au chargement du module
// (contrairement à config/redis.config.js) — même pattern que helpers/frontUrl.js.
// RAISON : reste testable sans jest.resetModules() — les tests ajustent process.env.MISTRAL_*
// juste avant d'appeler le service, sans dépendre de l'ordre de require des modules.
//
// Modèle par défaut : mistral-small-latest (choix documenté en C-01.03 — meilleur rapport
// coût/profil de tâche pour une extraction structurée sur un chunk court, pas un problème
// de raisonnement complexe).

/**
 * @returns {{ apiKey: string, apiUrl: string, model: string, ocrApiUrl: string, ocrModel: string, timeoutMs: number }}
 */
module.exports = function getMistralConfig() {
  return {
    apiKey: process.env.MISTRAL_API_KEY || '',
    apiUrl: process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions',
    model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
    // OCR (C-01.05, repli sur un PDF scanné sans couche texte) — endpoint et modèle distincts du
    // chat completions ci-dessus.
    ocrApiUrl: process.env.MISTRAL_OCR_API_URL || 'https://api.mistral.ai/v1/ocr',
    ocrModel: process.env.MISTRAL_OCR_MODEL || 'mistral-ocr-latest',
    timeoutMs: parseInt(process.env.MISTRAL_TIMEOUT_MS || '30000', 10)
  }
}
