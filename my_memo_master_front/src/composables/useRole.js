import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export const ROLE_IDS = {
  ADMIN_PLATEFORME: 1,
  ETUDIANT: 2,
  ENSEIGNANT: 3,
  ADMIN_ETABLISSEMENT: 4,
  MODERATEUR: 5,
}

/**
 * Composable RBAC — expose l'identité de rôle de l'utilisateur connecté.
 *
 * Usage : const { isEnseignant, isAdmin, hasAnyRole } = useRole()
 */
export function useRole() {
  const auth = useAuthStore()

  const roleId = computed(() => auth.user?.roleId ?? null)
  const roleName = computed(() => auth.user?.role?.name ?? null)

  const isAdminPlateforme = computed(() => roleId.value === ROLE_IDS.ADMIN_PLATEFORME)
  const isEtudiant = computed(() => roleId.value === ROLE_IDS.ETUDIANT)
  const isEnseignant = computed(() => roleId.value === ROLE_IDS.ENSEIGNANT)
  const isAdminEtablissement = computed(() => roleId.value === ROLE_IDS.ADMIN_ETABLISSEMENT)
  const isModerateur = computed(() => roleId.value === ROLE_IDS.MODERATEUR)

  // Admin plateforme (1) OU admin établissement (4)
  const isAdmin = computed(() =>
    [ROLE_IDS.ADMIN_PLATEFORME, ROLE_IDS.ADMIN_ETABLISSEMENT].includes(roleId.value)
  )

  // Peut gérer des groupes classes (créer, modifier, gérer membres)
  const canManageGroups = computed(() =>
    [ROLE_IDS.ADMIN_PLATEFORME, ROLE_IDS.ADMIN_ETABLISSEMENT, ROLE_IDS.ENSEIGNANT].includes(roleId.value)
  )

  /**
   * Vérifie si l'utilisateur a exactement l'un des rôles spécifiés.
   * @param {...number} ids
   */
  const hasAnyRole = (...ids) => ids.includes(roleId.value)

  return {
    roleId,
    roleName,
    isAdminPlateforme,
    isEtudiant,
    isEnseignant,
    isAdminEtablissement,
    isModerateur,
    isAdmin,
    canManageGroups,
    hasAnyRole,
    ROLE_IDS,
  }
}
