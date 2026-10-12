// Structure des clés d'objets S3 — un seul endroit pour les construire ET les valider.
//
// POURQUOI : le bucket est partagé entre environnements (prod, preprod) et avec les
// sauvegardes de la base (`backups/<env>/`). Sans préfixe d'environnement, deux
// environnements écrivent dans le même espace, et toute route qui lit une clé fournie par le
// client peut atteindre un objet qui n'est pas le sien.
//
// `S3_KEY_PREFIX` (ex. `prod/`) est ajouté devant les clés produites. Les clés DÉJÀ stockées
// (sans préfixe : `uploads/<userId>/...`, `mindmaps/...`) restent valides : on accepte donc
// aussi le format historique en lecture/suppression. Un préfixe d'un AUTRE environnement
// (`preprod/uploads/...` vu par la prod) n'est jamais accepté.
//
// Le préfixe est lu à l'appel (pas à l'import) : testable, et pris en compte si l'environnement
// change entre deux tests.

const PREFIX_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/

/**
 * Préfixe d'environnement normalisé : '' (aucun) ou 'xxx/' (un seul slash final).
 * Une valeur invalide (caractères inattendus, `..`) est refusée plutôt que corrigée : un
 * préfixe mal formé ne doit pas fabriquer silencieusement des clés inattendues.
 * @returns {string}
 */
const getKeyPrefix = () => {
  const raw = (process.env.S3_KEY_PREFIX || '').trim().replace(/^\/+|\/+$/g, '')
  if (!raw) return ''
  if (!PREFIX_PATTERN.test(raw) || raw.split('/').includes('..')) {
    throw new Error(`S3_KEY_PREFIX invalide : "${process.env.S3_KEY_PREFIX}"`)
  }
  return `${raw}/`
}

/** Une clé ne doit jamais contenir de segment vide, `.` ou `..`, ni de caractère de contrôle. */
const hasControlChar = (key) => Array.from(key).some((char) => char.charCodeAt(0) < 32)

const hasSafeSegments = (key) =>
  typeof key === 'string' &&
  key.length > 0 &&
  !hasControlChar(key) &&
  key.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')

/** @returns {string} `<prefixe>uploads/<userId>/<suffixe><ext>` */
const buildUploadKey = (userId, fileName) => `${getKeyPrefix()}uploads/${userId || 'anon'}/${fileName}`

/** @returns {string} `<prefixe>mindmaps/<suffixe><ext>` */
const buildMindmapKey = (fileName) => `${getKeyPrefix()}mindmaps/${fileName}`

// Préfixes acceptés pour une zone donnée : celui de l'environnement courant, plus le format
// historique (sans préfixe) pour les objets créés avant l'introduction de S3_KEY_PREFIX.
const acceptedBases = (zone) => {
  const bases = [`${getKeyPrefix()}${zone}/`]
  if (!bases.includes(`${zone}/`)) bases.push(`${zone}/`)
  return bases
}

const isInZone = (key, zone) => hasSafeSegments(key) && acceptedBases(zone).some((base) => key.startsWith(base))

/** Clé d'un fichier téléversé (`uploads/...`) de l'environnement courant ou historique. */
const isUploadKey = (key) => isInZone(key, 'uploads')

/** Clé d'une image de carte mentale (`mindmaps/...`) de l'environnement courant ou historique. */
const isMindmapKey = (key) => isInZone(key, 'mindmaps')

/** Clé d'un fichier appartenant à `userId` (`uploads/<userId>/...`). */
const isUserUploadKey = (key, userId) =>
  hasSafeSegments(key) &&
  acceptedBases('uploads').some((base) => key.startsWith(`${base}${userId}/`))

module.exports = {
  getKeyPrefix,
  buildUploadKey,
  buildMindmapKey,
  isUploadKey,
  isMindmapKey,
  isUserUploadKey
}
