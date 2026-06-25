import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ClassroomPage from '@/pages/ClassroomPage.vue'
import { useInvitationStore } from '@/stores/invitations'
import { useClassGroupStore } from '@/stores/classGroups'

// ── Mocks globaux ──────────────────────────────────────────────────────────────

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn().mockResolvedValue({ status: 200, data: { data: null } })
}))

vi.mock('@/helpers/api', () => ({
  api: { get: mockGet, post: vi.fn(), put: vi.fn(), del: vi.fn() }
}))

vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADMIN_USER = { userId: 1, roleId: 1, name: 'Admin' }
const STUDENT_USER = { userId: 2, roleId: 2, name: 'Étudiant' }

const PENDING_INV = {
  id: 10,
  classGroupId: 1,
  classGroup: { name: 'MP2I A' },
  role: 'student',
  invitedBy: { name: 'M. Prof' },
  status: 'pending'
}

// ── Helper de montage ─────────────────────────────────────────────────────────

function mountPage({ user = ADMIN_USER, mine = [] } = {}) {
  return mount(ClassroomPage, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: true,
          initialState: {
            auth: { user, authenticated: true, token: 'tok' },
            invitations: { mine, groupInvitations: [] },
            classGroups: { groups: [], group: null }
          }
        })
      ],
      stubs: { RouterLink: true, RouterView: true }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ClassroomPage', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── onMounted ──────────────────────────────────────────────────────────────

  it('onMounted — appelle fetchGroups et fetchMine en parallèle', async () => {
    mountPage()
    const classStore = useClassGroupStore()
    const invStore = useInvitationStore()
    await flushPromises()
    expect(classStore.fetchGroups).toHaveBeenCalledOnce()
    expect(invStore.fetchMine).toHaveBeenCalledOnce()
  })

  // ── Rendu initial ──────────────────────────────────────────────────────────

  it('affiche le premier groupe par défaut (données mock locales)', async () => {
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('MP2I A')
  })

  it('section invitations absente si mine est vide', async () => {
    const wrapper = mountPage({ mine: [] })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Invitations en attente')
  })

  it('section invitations présente et affiche le groupe si mine non vide', async () => {
    const wrapper = mountPage({ mine: [PENDING_INV] })
    await flushPromises()
    expect(wrapper.text()).toContain('Invitations en attente (1)')
    expect(wrapper.text()).toContain('MP2I A')
  })

  // ── Invitations ────────────────────────────────────────────────────────────

  it('clic Accepter — appelle invitationStore.respond(id, "accepted")', async () => {
    const wrapper = mountPage({ mine: [PENDING_INV] })
    await flushPromises()
    const invStore = useInvitationStore()

    const btn = wrapper.findAll('button').find((b) => b.text() === 'Accepter')
    await btn.trigger('click')
    await flushPromises()

    expect(invStore.respond).toHaveBeenCalledWith(10, 'accepted')
  })

  it('clic Décliner — appelle invitationStore.respond(id, "declined")', async () => {
    const wrapper = mountPage({ mine: [PENDING_INV] })
    await flushPromises()
    const invStore = useInvitationStore()

    const btn = wrapper.findAll('button').find((b) => b.text() === 'Décliner')
    await btn.trigger('click')
    await flushPromises()

    expect(invStore.respond).toHaveBeenCalledWith(10, 'declined')
  })

  // ── Rôle / vue ─────────────────────────────────────────────────────────────

  it('toggle Professeur/Etudiant — visible pour un admin', async () => {
    const wrapper = mountPage({ user: ADMIN_USER })
    await flushPromises()
    expect(wrapper.text()).toContain('Prévisualiser :')
  })

  it('toggle Professeur/Etudiant — absent pour un étudiant', async () => {
    const wrapper = mountPage({ user: STUDENT_USER })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Prévisualiser :')
  })

  // ── sendInvite ─────────────────────────────────────────────────────────────

  it('sendInvite — email vide → message erreur, invite non appelé', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const invStore = useInvitationStore()

    const btn = wrapper.findAll('button').find((b) => b.text() === "Envoyer l'invitation")
    await btn.trigger('click')
    await flushPromises()

    expect(invStore.invite).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain("L'adresse email est requise.")
  })

  it('sendInvite — email valide → appelle invitationStore.invite avec les bons paramètres', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const invStore = useInvitationStore()
    invStore.invite.mockResolvedValueOnce(true)

    await wrapper.find('input[type="email"]').setValue('test@test.com')
    const btn = wrapper.findAll('button').find((b) => b.text() === "Envoyer l'invitation")
    await btn.trigger('click')
    await flushPromises()

    expect(invStore.invite).toHaveBeenCalledWith('grp-mp2i', {
      targetEmail: 'test@test.com',
      role: 'student'
    })
  })

  // ── createSession ──────────────────────────────────────────────────────────

  it('createSession — titre vide → message erreur', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const btn = wrapper.findAll('button').find((b) => b.text() === 'Créer')
    await btn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Le nom est requis.')
  })

  it('createSession — titre valide → section créée et ajoutée dans la liste', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('input[placeholder="Nom de section"]').setValue('Chapitre 1')
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Créer')
    await btn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Section créée.')
    expect(wrapper.text()).toContain('Chapitre 1')
  })
})
