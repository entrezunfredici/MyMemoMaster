/**
 * Export d'une carte mentale en fichier JSON téléchargé par le navigateur.
 * Aucun appel serveur : on sérialise le payload déjà produit par le store.
 */

/**
 * Construit un nom de fichier sûr à partir du titre de la carte.
 *
 * @param {string} title - Titre de la carte
 * @returns {string} Nom de fichier terminé par « .json »
 */
export function buildJsonFileName(title) {
  const base = String(title || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `${base || 'carte-mentale'}.json`
}

/**
 * Télécharge la carte au format JSON.
 *
 * @param {object|string|null} payload - Carte sérialisée (objet ou chaîne JSON)
 * @returns {boolean} true si le téléchargement a été déclenché, false si la carte est vide
 */
export function downloadMindMapJson(payload) {
  if (!payload) return false
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
  let title = payload?.title
  if (typeof payload === 'string') {
    try { title = JSON.parse(payload)?.title } catch { title = '' }
  }

  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = buildJsonFileName(title)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return true
}
