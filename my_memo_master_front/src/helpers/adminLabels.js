import { ROLE_IDS } from '@/composables/useRole'

// Libellés de l'administration plateforme : rôles système, types d'entité et actions du journal d'audit.

// Rôles câblés dans l'API (requireRole) et dans useRole : ni renommés ni supprimés.
export const SYSTEM_ROLE_IDS = Object.values(ROLE_IDS)

/**
 * Indique si un rôle est un rôle système (non modifiable).
 *
 * @param {number|string} roleId - Identifiant du rôle
 * @returns {boolean} true pour un rôle système
 */
export function isSystemRole(roleId) {
  return SYSTEM_ROLE_IDS.includes(Number(roleId))
}

// Types d'entité que le journal sait filtrer : { valeur envoyée à l'API, libellé }.
export const AUDIT_ENTITY_TYPES = [
  { value: 'User', label: 'Compte' },
  { value: 'Etablissement', label: 'Établissement' },
  { value: 'Invitation', label: 'Invitation' },
  { value: 'ClassGroup', label: 'Groupe classe' },
]

const AUDIT_ACTION_LABELS = {
  USER_ROLE_CHANGED: 'Rôle d’un compte modifié',
  USER_INVITED: 'Utilisateur invité',
  USER_ACCOUNT_ACTIVATED: 'Compte activé',
  USER_ACCOUNT_DEACTIVATED: 'Compte désactivé',
  ADMIN_ETABLISSEMENT_INVITED: 'Gérant d’établissement invité',
  ADMIN_ETABLISSEMENT_ASSIGNED: 'Gérant d’établissement nommé',
}

/**
 * Libellé lisible d'une action d'audit ; le code brut quand elle n'est pas connue.
 *
 * @param {string} action - Code d'action (ex. USER_ROLE_CHANGED)
 * @returns {string} Libellé affichable
 */
export function auditActionLabel(action) {
  return AUDIT_ACTION_LABELS[action] ?? action
}

/**
 * Libellé lisible d'un type d'entité d'audit ; la valeur brute quand elle n'est pas connue.
 *
 * @param {string} entityType - Type d'entité (ex. User)
 * @returns {string} Libellé affichable
 */
export function auditEntityLabel(entityType) {
  return AUDIT_ENTITY_TYPES.find((type) => type.value === entityType)?.label ?? entityType
}
