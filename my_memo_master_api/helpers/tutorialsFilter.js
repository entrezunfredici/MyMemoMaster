const { Op } = require('sequelize')

// Interprète le paramètre de requête `revisionTips` (chaîne dans l'URL) : « true » / « 1 » -> true,
// « false » / « 0 » -> false ; toute autre valeur (absente, vide, inconnue) -> non filtré.
function parseRevisionTips(value) {
  if (value === true || value === 'true' || value === '1') return true
  if (value === false || value === 'false' || value === '0') return false
  return undefined
}

// Clause `where` de la liste des tutoriels, partagée par la requête paginée et par le comptage (les deux
// DOIVENT filtrer pareil, sinon le nombre de pages ne correspond pas aux résultats).
//
// BUG CORRIGÉ: le filtre ciblait la colonne `revisionTips`, qui n'existe pas (le modèle déclare
// `revision_tips`) : toute requête filtrée sur les tips de révision échouait côté base.
function buildTutorialsWhere({ search, subjectId, revisionTips } = {}) {
  const where = {}
  if (search) {
    where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }]
  }
  if (subjectId) {
    where.subjectId = subjectId
  }
  const tips = parseRevisionTips(revisionTips)
  if (tips !== undefined) {
    where.revision_tips = tips
  }
  return where
}

module.exports = { buildTutorialsWhere, parseRevisionTips }
