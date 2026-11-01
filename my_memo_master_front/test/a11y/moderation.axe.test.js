/**
 * Accessibilité (axe-core, jsdom) de l'interface modérateur : file de traitement et fenêtre d'examen d'un dossier.
 * Les contrastes sont audités au navigateur (e2e-a11y/moderation-filled.spec.js) : jsdom ne calcule pas les styles.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import axe from 'axe-core'
import ModerationQueue from '@/components/moderation/ModerationQueue.vue'
import ModerationReportDetail from '@/components/moderation/ModerationReportDetail.vue'
import { useAuthStore } from '@/stores/auth'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))
vi.mock('@/helpers/api', () => ({ api: { get: mockGet, patch: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))

const AXE_OPTIONS = {
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
    'page-has-heading-one': { enabled: false },
  },
}

const runAxe = async (element) => {
  const results = await axe.run(element, AXE_OPTIONS)
  return results.violations.map((v) => `${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}

const ITEM = {
  id: 5, contentType: 'resource', contentId: 4, author: { userId: 13, name: 'Prof Martin' }, status: 'hidden',
  priority: 'high', reportCount: 2, reporterCount: 2, reasons: ['harassment'], contentSnapshot: { title: 'Cours litigieux' },
  overdue: true, purgeAt: '2026-11-20T10:00:00Z', purgeImminent: true,
}
const REPORT = {
  id: 5, contentType: 'resource', contentId: 4, reason: 'harassment', comment: 'Propos déplacés', status: 'pending',
  createdAt: '2026-10-20T10:00:00Z', reporter: { userId: 21, name: 'Élève Dupont' }, contentSnapshot: { title: 'Cours litigieux', description: 'Texte' },
}

let wrapper

beforeEach(() => {
  mockGet.mockReset()
  setActivePinia(createPinia())
  useAuthStore().user = { userId: 99, roleId: 1 }
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('Accessibilité (axe-core) — interface modérateur', () => {
  it('ModerationQueue - file remplie - aucune violation axe', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: { items: [ITEM], total: 45, page: 2, limit: 20 } } })
    wrapper = mount(ModerationQueue, { global: { plugins: [createPinia()] }, attachTo: document.body })
    await flushPromises()
    expect(wrapper.find('table').exists()).toBe(true)
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('ModerationQueue - file vide - aucune violation axe', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: { items: [], total: 0, page: 1, limit: 20 } } })
    wrapper = mount(ModerationQueue, { global: { plugins: [createPinia()] }, attachTo: document.body })
    await flushPromises()
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('ModerationReportDetail - dossier ouvert avec actions - aucune violation axe', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: { report: REPORT, reports: [REPORT], content: { id: 4 }, author: { userId: 13, name: 'Prof Martin', isActive: true } } } })
    wrapper = mount(ModerationReportDetail, { props: { reportId: 5 }, global: { plugins: [createPinia()] }, attachTo: document.body })
    await flushPromises()
    expect(document.body.querySelector('#mod-actions-title')).not.toBeNull()
    expect(await runAxe(document.body.querySelector('[role="dialog"]'))).toEqual([])
  })

  it('ModerationReportDetail - erreur de motif et confirmation affichées - aucune violation axe', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: { data: { report: REPORT, reports: [REPORT], content: { id: 4 }, author: { userId: 13, name: 'Prof Martin', isActive: true } } } })
    wrapper = mount(ModerationReportDetail, { props: { reportId: 5 }, global: { plugins: [createPinia()] }, attachTo: document.body })
    await flushPromises()
    const find = (label) => [...document.body.querySelectorAll('button')].find((b) => b.textContent.trim() === label)
    find('Rejeter le signalement').click()
    await flushPromises()
    expect(document.body.querySelector('#mod-note-error')).not.toBeNull()

    const note = document.body.querySelector('#mod-note')
    note.value = 'Motif'
    note.dispatchEvent(new Event('input'))
    find('Supprimer définitivement').click()
    await flushPromises()
    expect(document.body.querySelector('[role="alert"]')).not.toBeNull()
    expect(await runAxe(document.body.querySelector('[role="dialog"]'))).toEqual([])
  })
})
