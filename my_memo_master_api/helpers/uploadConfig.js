// Résout la taille maximale autorisée pour les uploads de documents (stockage générique,
// ressources de classe, PDF source de la génération IA) depuis la variable d'environnement
// MAX_UPLOAD_SIZE_MB.
//
// CHOIX : une fonction (résolution à l'appel), pas un objet figé au chargement du module —
// même pattern que helpers/mistralConfig.js et helpers/aiQuotaConfig.js. RAISON : reste
// testable sans jest.resetModules().
//
// Une seule variable partagée par les 3 middlewares d'upload de documents (upload.middleware.js,
// aiPdfUpload.middleware.js, ClassGroupResource.validators.js) plutôt qu'une variable par
// middleware — ce sont trois entrées vers le même concept ("un document utilisateur"), pas trois
// besoins distincts à ce jour ; à séparer si un cas d'usage futur le justifie.
// mindmapImageUpload.js n'est PAS concerné : c'est une image de nœud de mind map (5 Mo fixe),
// un usage différent, pas un document.
//
// ATTENTION : relever cette valeur ne suffit pas seul en prod/K8s — l'annotation nginx
// nginx.ingress.kubernetes.io/proxy-body-size (k8s/*/ingress.yml, helm/templates/ingress.yaml)
// doit rester au moins aussi large, sans quoi l'ingress rejette la requête avant qu'elle
// n'atteigne l'API. Cette annotation n'est pas pilotable par variable d'environnement.

const DEFAULT_MAX_UPLOAD_SIZE_MB = 20

/**
 * @returns {{ maxFileSizeMb: number, maxFileSizeBytes: number }}
 */
module.exports = function getUploadConfig() {
  const maxFileSizeMb = parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || DEFAULT_MAX_UPLOAD_SIZE_MB

  return {
    maxFileSizeMb,
    maxFileSizeBytes: maxFileSizeMb * 1024 * 1024
  }
}
