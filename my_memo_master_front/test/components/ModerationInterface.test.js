import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ModerationQueue from '@/components/moderation/ModerationQueue.vue'
import ModerationReportDetail from '@/components/moderation/ModerationReportDetail.vue'
import ModerationPage from '@/pages/ModerationPage.vue'
import { useAuthStore } from '@/stores/auth'
import { useModerationStore } from '@/stores/moderation'

const { mockGet, mockPatch, mockNotify } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPatch: vi.fn(), mockNotify: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { get: mockGet, patch: mockPatch, post: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const ITEMS = [
  {
    id: 5, reportIds: [5, 6, 7], contentType: 'resource', contentId: 4, classGroupId: 1,
    author: { userId: 13, name: 'Prof Martin' }, status: 'pending', priority: 'high', reportCount: 3, reporterCount: 3,
    reasons: ['harassment', 'spam'], contentSnapshot: { title: 'Cours litigieux' }, oldestAt: '2026-10-20T10:00:00Z',
    overdue: true, purgeAt: null, daysLeft: null, purgeImminent: false,
  },
  {
    id: 9, reportIds: [9], contentType: 'section', contentId: 8, classGroupId: 1,
    author: null, status: 'hidden', priority: 'normal', reportCount: 1, reporterCount: 1,
    reasons: ['copyright'], contentSnapshot: { title: 'Chapitre copié' }, oldestAt: '2026-10-10T10:00:00Z',
    overdue: false, purgeAt: '2026-11-20T10:00:00Z', daysLeft: 3, purgeImminent: true,
  },
]

const queueResponse = (items = ITEMS, over = {}) => ({ status: 200, data: { data: { items, total: items.length, page: 1, limit: 20, ...over } } })

function detailOf({ status = 'pending', contentExists = true, authorActive = true, reports } = {}) {
  const base = { id: 5, contentType: 'resource', contentId: 4, reason: 'harassment', comment: 'Propos déplacés', createdAt: '2026-10-20T10:00:00Z', status, reporter: { userId: 21, name: 'Élève Dupont' } }
  const report = { ...base, contentSnapshot: { title: 'Cours litigieux', description: 'Texte du cours', originalName: 'cours.pdf' }, purgeAt: status === 'hidden' ? '2026-11-20T10:00:00Z' : null, hiddenAt: status === 'hidden' ? '2026-10-21T10:00:00Z' : null }
  return {
    status: 200,
    data: { data: { report, reports: reports ?? [report], content: contentExists ? { id: 4 } : null, author: { userId: 13, name: 'Prof Martin', isActive: authorActive } } },
  }
}

let wrapper
let pinia

function setup(roleId = 5) {
  pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = { userId: 99, roleId }
}

const text = () => document.body.textContent
const buttonByText = (label) => [...document.body.querySelectorAll('button')].find((b) => b.textContent.trim() === label)

beforeEach(() => {
  // mockReset (et non clearAllMocks) : efface aussi les mockResolvedValue persistants des tests précédents
  mockGet.mockReset()
  mockPatch.mockReset()
  mockNotify.mockReset()
  setup()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('ModerationQueue', () => {
  const mountQueue = () => mount(ModerationQueue, { global: { plugins: [pinia] }, attachTo: document.body })

  it('au montage - charge la file ouverte (page 1) et affiche une ligne par contenu', async () => {
    mockGet.mockResolvedValueOnce(queueResponse())
    wrapper = mountQueue()
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith('content-reports', { page: 1, limit: 20 })
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Cours litigieux')
    expect(rows[0].text()).toContain('Prof Martin')
    expect(rows[0].text()).toContain('Harcèlement ou insulte, Spam ou publicité')
    expect(rows[0].text()).toContain('3')
    expect(rows[0].text()).toContain('3 personnes')
    expect(rows[0].text()).toContain('Haute')
    expect(rows[0].text()).toContain('En attente')
    expect(rows[0].text()).toContain('En retard')
  })

  it('contenu masqué - affiche l\'échéance de suppression et l\'alerte d\'imminence ; auteur supprimé - tiret', async () => {
    mockGet.mockResolvedValueOnce(queueResponse())
    wrapper = mountQueue()
    await flushPromises()

    const row = wrapper.findAll('tbody tr')[1]
    expect(row.text()).toContain('Masqué')
    expect(row.text()).toContain('Suppression le')
    expect(row.text()).toContain('imminente')
    expect(row.text()).toContain('Normale')
    expect(row.findAll('td')[1].text()).toBe('—')
  })

  it('file vide - affiche le message d\'état', async () => {
    mockGet.mockResolvedValueOnce(queueResponse([]))
    wrapper = mountQueue()
    await flushPromises()

    expect(wrapper.text()).toContain('Aucun signalement à afficher.')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('Filtrer - transmet statut, motif et type, et repart de la page 1', async () => {
    mockGet.mockResolvedValue(queueResponse())
    wrapper = mountQueue()
    await flushPromises()

    await wrapper.get('#moderation-status').setValue('hidden')
    await wrapper.get('#moderation-reason').setValue('spam')
    await wrapper.get('#moderation-type').setValue('section')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mockGet).toHaveBeenLastCalledWith('content-reports', { page: 1, limit: 20, status: 'hidden', reason: 'spam', contentType: 'section' })
  })

  it('Examiner - émet select avec l\'identifiant du dossier', async () => {
    mockGet.mockResolvedValueOnce(queueResponse())
    wrapper = mountQueue()
    await flushPromises()

    await wrapper.get('button[aria-label="Examiner « Cours litigieux »"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[5]])
  })

  it('pagination - plus de 20 contenus - affiche Page 1 sur 3 et charge la page suivante', async () => {
    mockGet.mockResolvedValueOnce(queueResponse(ITEMS, { total: 45 }))
    wrapper = mountQueue()
    await flushPromises()
    expect(wrapper.text()).toContain('Page 1 sur 3')
    expect(wrapper.get('nav button').attributes('disabled')).toBeDefined()

    mockGet.mockResolvedValueOnce(queueResponse(ITEMS, { total: 45, page: 2 }))
    await wrapper.findAll('nav button')[1].trigger('click')
    await flushPromises()

    expect(mockGet).toHaveBeenLastCalledWith('content-reports', { page: 2, limit: 20 })
    expect(wrapper.text()).toContain('Page 2 sur 3')
  })

  it('une seule page - pas de pagination', async () => {
    mockGet.mockResolvedValueOnce(queueResponse())
    wrapper = mountQueue()
    await flushPromises()
    expect(wrapper.find('nav[aria-label="Pagination de la file"]').exists()).toBe(false)
  })

  it('reload exposé - recharge la page courante', async () => {
    mockGet.mockResolvedValue(queueResponse())
    wrapper = mountQueue()
    await flushPromises()

    wrapper.vm.reload()
    await flushPromises()

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(mockGet).toHaveBeenLastCalledWith('content-reports', { page: 1, limit: 20 })
  })
})

describe('ModerationReportDetail', () => {
  const mountDetail = async (detail, roleId = 5) => {
    setup(roleId)
    mockGet.mockResolvedValueOnce(detail)
    wrapper = mount(ModerationReportDetail, { props: { reportId: 5 }, global: { plugins: [pinia] }, attachTo: document.body })
    await flushPromises()
    return wrapper
  }
  const labels = () => [...document.body.querySelectorAll('section button')].map((b) => b.textContent.trim())

  it('fermée - reportId null - n\'affiche rien et n\'appelle pas l\'API', () => {
    setup()
    wrapper = mount(ModerationReportDetail, { props: { reportId: null }, global: { plugins: [pinia] }, attachTo: document.body })
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('ouverture - charge le détail et affiche contenu, auteur et signalements', async () => {
    await mountDetail(detailOf())

    expect(mockGet).toHaveBeenCalledWith('content-reports/5')
    expect(text()).toContain('Cours litigieux')
    expect(text()).toContain('Texte du cours')
    expect(text()).toContain('Fichier : cours.pdf')
    expect(text()).toContain('Prof Martin')
    expect(text()).toContain('Élève Dupont')
    expect(text()).toContain('Harcèlement ou insulte')
    expect(text()).toContain('Propos déplacés')
  })

  it('commentaire du signalant - texte brut : le HTML saisi n\'est jamais interprété', async () => {
    const d = detailOf()
    d.data.data.reports[0].comment = '<img src=x onerror=alert(1)>'
    await mountDetail(d)

    expect(document.body.querySelector('img')).toBeNull()
    expect(text()).toContain('<img src=x onerror=alert(1)>')
  })

  it('dossier en attente, modérateur - propose prise en charge, rejet, masquage, suppression, pas de suspension', async () => {
    await mountDetail(detailOf(), 5)

    expect(labels()).toEqual(expect.arrayContaining(['Prendre en charge', 'Rejeter le signalement', 'Masquer 30 jours', 'Supprimer définitivement']))
    expect(labels()).not.toContain('Suspendre le compte de l’auteur')
    expect(labels()).not.toContain('Rétablir le contenu')
  })

  it.each([1, 4])('dossier en attente, rôle %i - propose aussi la suspension du compte', async (roleId) => {
    await mountDetail(detailOf(), roleId)
    expect(labels()).toContain('Suspendre le compte de l’auteur')
  })

  it('compte déjà suspendu - affiche le badge et masque la suspension', async () => {
    await mountDetail(detailOf({ authorActive: false }), 1)

    expect(text()).toContain('Compte suspendu')
    expect(labels()).not.toContain('Suspendre le compte de l’auteur')
  })

  it('contenu masqué - affiche l\'échéance, propose rétablir et supprimer, plus masquer ni rejeter', async () => {
    await mountDetail(detailOf({ status: 'hidden' }))

    expect(text()).toContain('suppression définitive le')
    expect(labels()).toEqual(expect.arrayContaining(['Rétablir le contenu', 'Supprimer définitivement']))
    expect(labels()).not.toContain('Masquer 30 jours')
    expect(labels()).not.toContain('Rejeter le signalement')
  })

  it('contenu supprimé par ailleurs - le signale et ne propose plus de masquer', async () => {
    await mountDetail(detailOf({ contentExists: false }))

    expect(text()).toContain('Ce contenu n’existe plus')
    expect(labels()).not.toContain('Masquer 30 jours')
  })

  it('dossier clos - aucune action, message explicite', async () => {
    await mountDetail(detailOf({ status: 'dismissed' }), 1)

    expect(text()).toContain('Ce dossier est clos')
    expect(document.body.querySelector('#mod-actions-title')).toBeNull()
  })

  it('décision sans motif - affiche l\'erreur et n\'appelle pas l\'API', async () => {
    await mountDetail(detailOf())

    buttonByText('Rejeter le signalement').click()
    await flushPromises()

    expect(document.body.querySelector('#mod-note-error').textContent).toBe('Le motif de la décision est requis.')
    expect(document.body.querySelector('#mod-note').getAttribute('aria-invalid')).toBe('true')
    expect(mockPatch).not.toHaveBeenCalled()
  })

  it('rejet avec motif - appelle dismiss, émet changed puis close', async () => {
    await mountDetail(detailOf())
    mockPatch.mockResolvedValueOnce({ status: 200, data: { data: {} } })
    const note = document.body.querySelector('#mod-note')
    note.value = 'Contenu conforme'
    note.dispatchEvent(new Event('input'))

    buttonByText('Rejeter le signalement').click()
    await flushPromises()

    expect(mockPatch).toHaveBeenCalledWith('content-reports/5/dismiss', { decisionNote: 'Contenu conforme' })
    expect(wrapper.emitted('changed')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('masquage avec motif - appelle hide sans confirmation, car réversible', async () => {
    await mountDetail(detailOf())
    mockPatch.mockResolvedValueOnce({ status: 200, data: { data: {} } })
    const note = document.body.querySelector('#mod-note')
    note.value = 'Droits d’auteur'
    note.dispatchEvent(new Event('input'))

    buttonByText('Masquer 30 jours').click()
    await flushPromises()

    expect(mockPatch).toHaveBeenCalledWith('content-reports/5/hide', { decisionNote: 'Droits d’auteur' })
    expect(document.body.querySelector('[role="alert"]')).toBeNull()
  })

  it('suppression définitive - demande une confirmation avant d\'appeler l\'API, annulable', async () => {
    await mountDetail(detailOf())
    const note = document.body.querySelector('#mod-note')
    note.value = 'Illégal'
    note.dispatchEvent(new Event('input'))

    buttonByText('Supprimer définitivement').click()
    await flushPromises()

    expect(document.body.querySelector('[role="alert"]').textContent).toContain('irréversible')
    expect(mockPatch).not.toHaveBeenCalled()

    buttonByText('Annuler').click()
    await flushPromises()
    expect(document.body.querySelector('[role="alert"]')).toBeNull()
    expect(mockPatch).not.toHaveBeenCalled()
  })

  it('suppression définitive confirmée - appelle remove-content puis ferme', async () => {
    await mountDetail(detailOf())
    mockPatch.mockResolvedValueOnce({ status: 200, data: { data: {} } })
    const note = document.body.querySelector('#mod-note')
    note.value = 'Illégal'
    note.dispatchEvent(new Event('input'))

    buttonByText('Supprimer définitivement').click()
    await flushPromises()
    buttonByText('Confirmer').click()
    await flushPromises()

    expect(mockPatch).toHaveBeenCalledWith('content-reports/5/remove-content', { decisionNote: 'Illégal' })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('suspension confirmée - appelle suspend-author, recharge le détail et laisse la fenêtre ouverte', async () => {
    await mountDetail(detailOf(), 4)
    mockPatch.mockResolvedValueOnce({ status: 200, data: { data: {} } })
    mockGet.mockResolvedValueOnce(detailOf({ authorActive: false }))
    const note = document.body.querySelector('#mod-note')
    note.value = 'Propos répétés'
    note.dispatchEvent(new Event('input'))

    buttonByText('Suspendre le compte de l’auteur').click()
    await flushPromises()
    expect(document.body.querySelector('[role="alert"]').textContent).toContain('toute la plateforme')
    buttonByText('Confirmer').click()
    await flushPromises()

    expect(mockPatch).toHaveBeenCalledWith('content-reports/5/suspend-author', { decisionNote: 'Propos répétés' })
    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('changed')).toHaveLength(1)
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(text()).toContain('Compte suspendu')
  })

  it('prise en charge - appelle claim sans motif et laisse la fenêtre ouverte', async () => {
    await mountDetail(detailOf())
    mockPatch.mockResolvedValueOnce({ status: 200, data: { data: {} } })
    mockGet.mockResolvedValueOnce(detailOf({ status: 'in_review' }))

    buttonByText('Prendre en charge').click()
    await flushPromises()

    expect(mockPatch).toHaveBeenCalledWith('content-reports/5/claim', {})
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(text()).toContain('En cours')
    expect(buttonByText('Prendre en charge')).toBeUndefined()
  })

  it('rétablissement - appelle restore sans motif puis ferme', async () => {
    await mountDetail(detailOf({ status: 'hidden' }))
    mockPatch.mockResolvedValueOnce({ status: 200, data: { data: {} } })

    buttonByText('Rétablir le contenu').click()
    await flushPromises()

    expect(mockPatch).toHaveBeenCalledWith('content-reports/5/restore', {})
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('refus de l\'API (409) - garde la fenêtre ouverte et n\'émet pas changed', async () => {
    await mountDetail(detailOf())
    mockPatch.mockResolvedValueOnce({ status: 409, data: { message: 'Ce signalement ne peut pas recevoir cette action dans son état actuel.' } })
    const note = document.body.querySelector('#mod-note')
    note.value = 'x'
    note.dispatchEvent(new Event('input'))

    buttonByText('Masquer 30 jours').click()
    await flushPromises()

    expect(mockNotify).toHaveBeenCalledWith('Ce signalement ne peut pas recevoir cette action dans son état actuel.', 'warning')
    expect(wrapper.emitted('changed')).toBeUndefined()
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('plusieurs signalements dont un clos - agit sur un signalement encore ouvert', async () => {
    const d = detailOf()
    const closed = { ...d.data.data.report, id: 3, status: 'dismissed' }
    const open = { ...d.data.data.report, id: 8, status: 'pending' }
    d.data.data.reports = [closed, open]
    await mountDetail(d)
    mockPatch.mockResolvedValueOnce({ status: 200, data: { data: {} } })
    const note = document.body.querySelector('#mod-note')
    note.value = 'x'
    note.dispatchEvent(new Event('input'))

    buttonByText('Rejeter le signalement').click()
    await flushPromises()

    expect(mockPatch).toHaveBeenCalledWith('content-reports/8/dismiss', { decisionNote: 'x' })
  })

  it('dossier introuvable (404) - n\'affiche aucune action', async () => {
    setup()
    mockGet.mockResolvedValueOnce({ status: 404, data: { message: 'Signalement ou contenu introuvable.' } })
    wrapper = mount(ModerationReportDetail, { props: { reportId: 5 }, global: { plugins: [pinia] }, attachTo: document.body })
    await flushPromises()

    expect(useModerationStore().detail).toBeNull()
    expect(text()).toContain('Chargement')
    expect(document.body.querySelector('#mod-actions-title')).toBeNull()
  })

  it('fermeture - change de dossier - réinitialise motif et confirmation', async () => {
    await mountDetail(detailOf())
    const note = document.body.querySelector('#mod-note')
    note.value = 'Ancien motif'
    note.dispatchEvent(new Event('input'))
    buttonByText('Supprimer définitivement').click()
    await flushPromises()

    mockGet.mockResolvedValueOnce(detailOf())
    await wrapper.setProps({ reportId: 12 })
    await flushPromises()

    expect(document.body.querySelector('#mod-note').value).toBe('')
    expect(document.body.querySelector('[role="alert"]')).toBeNull()
  })
})

describe('ModerationPage', () => {
  it('affiche la file ; Examiner ouvre le détail ; une action recharge la file', async () => {
    mockGet.mockResolvedValueOnce(queueResponse())
    wrapper = mount(ModerationPage, { global: { plugins: [pinia] }, attachTo: document.body })
    await flushPromises()
    expect(wrapper.text()).toContain('File de traitement')
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()

    mockGet.mockResolvedValueOnce(detailOf())
    await wrapper.get('button[aria-label="Examiner « Cours litigieux »"]').trigger('click')
    await flushPromises()
    expect(mockGet).toHaveBeenLastCalledWith('content-reports/5')
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()

    mockPatch.mockResolvedValueOnce({ status: 200, data: { data: {} } })
    mockGet.mockResolvedValueOnce(queueResponse([]))
    buttonByText('Prendre en charge').click()
    await flushPromises()
    expect(mockGet).toHaveBeenCalledWith('content-reports', { page: 1, limit: 20 })
  })
})
