import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useRole, ROLE_IDS } from '@/composables/useRole'

vi.mock('@/helpers/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))
vi.mock('@/helpers/notif', () => ({
  notif: { notify: vi.fn(), clear: vi.fn() },
}))

function setupRole(roleId) {
  const auth = useAuthStore()
  auth.user = { userId: 1, roleId }
  return useRole()
}

describe('useRole — ROLE_IDS', () => {
  it('expose les bonnes constantes de rôles', () => {
    expect(ROLE_IDS.ADMIN_PLATEFORME).toBe(1)
    expect(ROLE_IDS.ETUDIANT).toBe(2)
    expect(ROLE_IDS.ENSEIGNANT).toBe(3)
    expect(ROLE_IDS.ADMIN_ETABLISSEMENT).toBe(4)
    expect(ROLE_IDS.MODERATEUR).toBe(5)
  })
})

describe('useRole — computed par rôle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('roleId=1 → isAdminPlateforme=true, les autres false', () => {
    const role = setupRole(1)
    expect(role.isAdminPlateforme.value).toBe(true)
    expect(role.isEtudiant.value).toBe(false)
    expect(role.isEnseignant.value).toBe(false)
    expect(role.isAdminEtablissement.value).toBe(false)
    expect(role.isModerateur.value).toBe(false)
  })

  it('roleId=2 → isEtudiant=true, les autres false', () => {
    const role = setupRole(2)
    expect(role.isEtudiant.value).toBe(true)
    expect(role.isAdminPlateforme.value).toBe(false)
    expect(role.isEnseignant.value).toBe(false)
  })

  it('roleId=3 → isEnseignant=true', () => {
    const role = setupRole(3)
    expect(role.isEnseignant.value).toBe(true)
    expect(role.isEtudiant.value).toBe(false)
  })

  it('roleId=4 → isAdminEtablissement=true', () => {
    const role = setupRole(4)
    expect(role.isAdminEtablissement.value).toBe(true)
    expect(role.isAdminPlateforme.value).toBe(false)
  })

  it('roleId=5 → isModerateur=true', () => {
    const role = setupRole(5)
    expect(role.isModerateur.value).toBe(true)
    expect(role.isEtudiant.value).toBe(false)
  })

  it('roleId=null → tous les computed false', () => {
    const auth = useAuthStore()
    auth.user = {}
    const role = useRole()
    expect(role.isAdminPlateforme.value).toBe(false)
    expect(role.isEtudiant.value).toBe(false)
    expect(role.isEnseignant.value).toBe(false)
    expect(role.isAdminEtablissement.value).toBe(false)
    expect(role.isModerateur.value).toBe(false)
  })
})

describe('useRole — isAdmin', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('roleId=1 → isAdmin=true', () => {
    expect(setupRole(1).isAdmin.value).toBe(true)
  })

  it('roleId=4 → isAdmin=true', () => {
    expect(setupRole(4).isAdmin.value).toBe(true)
  })

  it('roleId=2 → isAdmin=false', () => {
    expect(setupRole(2).isAdmin.value).toBe(false)
  })
})

describe('useRole — canManageGroups', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('roleId=1 → canManageGroups=true', () => {
    expect(setupRole(1).canManageGroups.value).toBe(true)
  })

  it('roleId=3 → canManageGroups=true', () => {
    expect(setupRole(3).canManageGroups.value).toBe(true)
  })

  it('roleId=4 → canManageGroups=true', () => {
    expect(setupRole(4).canManageGroups.value).toBe(true)
  })

  it('roleId=2 → canManageGroups=false', () => {
    expect(setupRole(2).canManageGroups.value).toBe(false)
  })

  it('roleId=5 → canManageGroups=false', () => {
    expect(setupRole(5).canManageGroups.value).toBe(false)
  })
})

describe('useRole — hasAnyRole()', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('hasAnyRole(1, 4) → true quand roleId=1', () => {
    expect(setupRole(1).hasAnyRole(1, 4)).toBe(true)
  })

  it('hasAnyRole(1, 4) → true quand roleId=4', () => {
    expect(setupRole(4).hasAnyRole(1, 4)).toBe(true)
  })

  it('hasAnyRole(1, 4) → false quand roleId=2', () => {
    expect(setupRole(2).hasAnyRole(1, 4)).toBe(false)
  })

  it('hasAnyRole() sans argument → false', () => {
    expect(setupRole(1).hasAnyRole()).toBe(false)
  })
})
