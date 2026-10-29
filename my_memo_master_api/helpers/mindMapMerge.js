const dayjs = require('dayjs')

// Clés qui varient à chaque sauvegarde sans changer le contenu de la carte
const VOLATILE_KEYS = ['updatedAt', 'history']

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * Normalise un texte pour comparer deux contenus (casse, espaces multiples et bords ignorés).
 *
 * @param {*} value - Texte à normaliser
 * @returns {string} Texte comparable
 */
function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

// Sérialisation stable (clés triées) pour comparer deux objets sans dépendre de l'ordre des clés
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

function withoutVolatileKeys(map) {
  const copy = { ...map }
  VOLATILE_KEYS.forEach((key) => delete copy[key])
  return copy
}

/**
 * Indique si deux cartes mentales ont strictement le même contenu (hors date de
 * modification et historique d'annulation).
 *
 * @param {object} base - Carte déjà présente
 * @param {object} incoming - Carte importée
 * @returns {boolean} true si rien ne les distingue
 */
function isIdenticalMindMap(base, incoming) {
  return stableStringify(withoutVolatileKeys(base)) === stableStringify(withoutVolatileKeys(incoming))
}

/**
 * Indique si deux cartes viennent de la même carte d'origine (même identifiant de carte ou même
 * nœud racine). Deux cartes homonymes sans ancêtre commun sont des contenus distincts : les
 * fusionner mélangerait deux arbres indépendants.
 *
 * @param {object} base - Carte déjà présente
 * @param {object} incoming - Carte importée
 * @returns {boolean} true si elles partagent leur origine
 */
function isSameMindMapLineage(base, incoming) {
  if (base?.id && base.id === incoming?.id) return true
  return Boolean(base?.subjectNodeId) && base.subjectNodeId === incoming?.subjectNodeId
}

const linkKey = (link) => `${link?.from}|${link?.to}`

/**
 * Ajoute à la carte existante les éléments de la carte importée qui lui manquent (nœuds, branches,
 * zones, types de branche, disciplines). Un élément déjà présent n'est jamais modifié ni supprimé.
 *
 * @param {object} base - Carte déjà présente (non modifiée)
 * @param {object} incoming - Carte importée
 * @returns {{json: object, changed: boolean, added: {nodes: number, links: number, zones: number}}}
 *   La carte fusionnée et le détail de ce qui a été ajouté
 */
function mergeMindMapJson(base, incoming) {
  const merged = JSON.parse(JSON.stringify(base))
  const added = { nodes: 0, links: 0, zones: 0 }

  merged.nodes = isObject(merged.nodes) ? merged.nodes : {}
  merged.links = Array.isArray(merged.links) ? merged.links : []
  merged.zones = Array.isArray(merged.zones) ? merged.zones : []

  const incomingZones = Array.isArray(incoming.zones) ? incoming.zones : []
  const zoneIds = new Set(merged.zones.map((zone) => zone?.id))
  for (const zone of incomingZones) {
    if (isObject(zone) && zone.id && !zoneIds.has(zone.id)) {
      merged.zones.push(JSON.parse(JSON.stringify(zone)))
      zoneIds.add(zone.id)
      added.zones += 1
    }
  }

  const incomingNodes = isObject(incoming.nodes) ? incoming.nodes : {}
  for (const [id, node] of Object.entries(incomingNodes)) {
    if (!isObject(node) || merged.nodes[id]) continue
    const copy = JSON.parse(JSON.stringify(node))
    // Une zone absente de la carte fusionnée ne doit pas rester référencée
    if (copy.zoneId && !zoneIds.has(copy.zoneId)) copy.zoneId = null
    merged.nodes[id] = copy
    added.nodes += 1
  }

  const linkIds = new Set(merged.links.map((link) => link?.id).filter(Boolean))
  const linkKeys = new Set(merged.links.map(linkKey))
  const incomingLinks = Array.isArray(incoming.links) ? incoming.links : []
  for (const link of incomingLinks) {
    if (!isObject(link)) continue
    const known = (link.id && linkIds.has(link.id)) || linkKeys.has(linkKey(link))
    // Une branche dont une extrémité n'existe pas dans la carte fusionnée est ignorée
    if (known || !merged.nodes[link.from] || !merged.nodes[link.to]) continue
    merged.links.push(JSON.parse(JSON.stringify(link)))
    if (link.id) linkIds.add(link.id)
    linkKeys.add(linkKey(link))
    added.links += 1
  }

  for (const listKey of ['disciplineIds', 'branchTypes']) {
    const incomingList = Array.isArray(incoming[listKey]) ? incoming[listKey] : []
    if (!incomingList.length) continue
    const current = Array.isArray(merged[listKey]) ? merged[listKey] : []
    const idOf = (item) => (isObject(item) ? item.id : item)
    const known = new Set(current.map(idOf))
    const extra = incomingList.filter((item) => !known.has(idOf(item)))
    if (extra.length) merged[listKey] = [...current, ...JSON.parse(JSON.stringify(extra))]
  }

  const changed = added.nodes + added.links + added.zones > 0 ||
    stableStringify(withoutVolatileKeys(merged)) !== stableStringify(withoutVolatileKeys(base))
  if (changed) merged.updatedAt = dayjs().toISOString()

  return { json: merged, changed, added }
}

module.exports = { normalizeText, isIdenticalMindMap, isSameMindMapLineage, mergeMindMapJson }
