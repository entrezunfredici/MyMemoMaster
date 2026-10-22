import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import AdminBackupsPanel from '@/components/admin/AdminBackupsPanel.vue'
import { useBackupStore } from '@/stores/backups'
import { backupStatusLabel, backupTriggerLabel, formatDuration } from '@/helpers/adminLabels'

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))

const SUCCESS = { id: 1, trigger: 'auto', status: 'success', startedAt: '2026-10-22T03:00:00Z', durationMs: 12000, sizeBytes: '2048', location: 'backups/prod/mmm-a.dump', errorMessage: null, author: null }
const FAILED = { id: 2, trigger: 'manual', status: 'failed', startedAt: '2026-10-23T10:00:00Z', durationMs: 800, sizeBytes: null, location: null, errorMessage: 'pg_dump a échoué (code 1) : connection refused', author: { name: 'Admin' } }

const BASE_STATUS = {
  supported: true, scheduleEnabled: true, scheduleHourUtc: 3, nextRunAt: '2026-10-24T03:00:00Z',
  destination: 's3', keep: 14, running: false, lastRun: SUCCESS, lastSuccess: SUCCESS, lastFailure: null, lastAuto: SUCCESS,
}

function mountPanel({ status = BASE_STATUS, runs = [SUCCESS], loading = false, launching = false } = {}) {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true, initialState: { backups: { status, runs, loading, launching } } })
  const wrapper = mount(AdminBackupsPanel, { global: { plugins: [pinia] }, attachTo: document.body })
  return { wrapper, store: useBackupStore() }
}

const launchButton = (w) => w.find('button')

beforeEach(() => { vi.clearAllMocks(); document.body.innerHTML = '' })
afterEach(() => { vi.useRealTimers() })

describe('AdminBackupsPanel', () => {
  it('charge l\'état à l\'ouverture', () => {
    const { store } = mountPanel()
    expect(store.fetchBackups).toHaveBeenCalledTimes(1)
  })

  it('affiche dernière réussite, dernière sauvegarde automatique, prochaine échéance et stockage', () => {
    const { wrapper } = mountPanel()
    const text = wrapper.find('dl').text()
    expect(text).toContain('Dernière sauvegarde réussie')
    expect(text).toContain('Dernière sauvegarde automatique')
    expect(text).toContain('Réussie')
    expect(text).toContain('Chaque jour à 3 h (UTC)')
    expect(text).toContain('Stockage S3')
    expect(text).toContain('14 dernières sauvegardes conservées')
  })

  it('tableau accessible : légende, en-têtes de colonne, une exécution par ligne', () => {
    const { wrapper } = mountPanel({ status: { ...BASE_STATUS, lastFailure: FAILED }, runs: [FAILED, SUCCESS] })
    expect(wrapper.find('caption').text()).toBe('Historique des sauvegardes')
    expect(wrapper.findAll('th[scope="col"]').map((h) => h.text())).toEqual(['Date', 'Type', 'Résultat', 'Durée', 'Taille', 'Détails'])
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Manuelle')
    expect(rows[0].text()).toContain('par Admin')
    expect(rows[0].text()).toContain('Échouée')
    expect(rows[0].text()).toContain('connection refused')
    expect(rows[1].text()).toContain('Automatique')
    expect(rows[1].text()).toContain('12 s')
    expect(rows[1].text()).toContain('2 Ko')
  })

  it('échec plus récent que le dernier succès - alerte affichée avec le message', () => {
    const { wrapper } = mountPanel({ status: { ...BASE_STATUS, lastFailure: FAILED } })
    const alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('La dernière sauvegarde a échoué')
    expect(alert.text()).toContain('connection refused')
  })

  it('échec plus ancien que le dernier succès - pas d\'alerte', () => {
    const older = { ...FAILED, startedAt: '2026-10-20T10:00:00Z' }
    const { wrapper } = mountPanel({ status: { ...BASE_STATUS, lastFailure: older } })
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('bouton manuel - lance la sauvegarde', async () => {
    const { wrapper, store } = mountPanel()
    expect(launchButton(wrapper).text()).toBe('Lancer une sauvegarde maintenant')
    expect(launchButton(wrapper).attributes('disabled')).toBeUndefined()
    await launchButton(wrapper).trigger('click')
    expect(store.launchBackup).toHaveBeenCalledTimes(1)
  })

  it('sauvegarde en cours - bouton désactivé et libellé explicite', () => {
    const { wrapper } = mountPanel({ status: { ...BASE_STATUS, running: true } })
    expect(launchButton(wrapper).attributes('disabled')).toBeDefined()
    expect(launchButton(wrapper).text()).toBe('Sauvegarde en cours…')
  })

  it('base non PostgreSQL - bouton désactivé et explication', () => {
    const { wrapper } = mountPanel({ status: { ...BASE_STATUS, supported: false, nextRunAt: null, scheduleEnabled: false } })
    expect(launchButton(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('qu’avec la base PostgreSQL')
    expect(wrapper.text()).toContain('Planification désactivée')
  })

  it('aucune exécution - message vide, pas de tableau', () => {
    const { wrapper } = mountPanel({ status: { ...BASE_STATUS, lastRun: null, lastSuccess: null, lastAuto: null }, runs: [] })
    expect(wrapper.text()).toContain('Aucune sauvegarde enregistrée.')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('chargement initial - message de chargement', () => {
    const { wrapper } = mountPanel({ status: null, runs: [], loading: true })
    expect(wrapper.text()).toContain('Chargement…')
  })

  it('rafraîchit l\'état toutes les 4 s tant qu\'une sauvegarde est en cours, puis s\'arrête', async () => {
    vi.useFakeTimers()
    const { wrapper, store } = mountPanel({ status: { ...BASE_STATUS, running: false } })
    store.fetchBackups.mockClear()

    store.status = { ...BASE_STATUS, running: true }
    await wrapper.vm.$nextTick()
    vi.advanceTimersByTime(8000)
    expect(store.fetchBackups).toHaveBeenCalledTimes(2)
    expect(store.fetchBackups).toHaveBeenCalledWith({ silent: true })

    store.status = { ...BASE_STATUS, running: false }
    await wrapper.vm.$nextTick()
    store.fetchBackups.mockClear()
    vi.advanceTimersByTime(8000)
    expect(store.fetchBackups).not.toHaveBeenCalled()
  })
})

describe('libellés de sauvegarde', () => {
  it('backupStatusLabel / backupTriggerLabel - valeurs connues traduites, inconnues conservées', () => {
    expect(backupStatusLabel('running')).toBe('En cours')
    expect(backupStatusLabel('failed')).toBe('Échouée')
    expect(backupStatusLabel('autre')).toBe('autre')
    expect(backupTriggerLabel('auto')).toBe('Automatique')
    expect(backupTriggerLabel('manual')).toBe('Manuelle')
    expect(backupTriggerLabel('x')).toBe('x')
  })

  it('formatDuration - millisecondes, secondes, minutes, absence', () => {
    expect(formatDuration(850)).toBe('850 ms')
    expect(formatDuration(12000)).toBe('12 s')
    expect(formatDuration(125000)).toBe('2 min 05 s')
    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(undefined)).toBe('—')
  })
})
