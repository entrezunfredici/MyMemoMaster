import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import StudentGroupPicker from '@/components/classroom/student/StudentGroupPicker.vue'
import StudentSearchBar from '@/components/classroom/student/StudentSearchBar.vue'
import StudentUpcomingSessions from '@/components/classroom/student/StudentUpcomingSessions.vue'
import StudentSections from '@/components/classroom/student/StudentSections.vue'
import StudentRendus from '@/components/classroom/student/StudentRendus.vue'
import StudentRenduCard from '@/components/classroom/student/StudentRenduCard.vue'
import StudentDeadlines from '@/components/classroom/student/StudentDeadlines.vue'
import StudentResources from '@/components/classroom/student/StudentResources.vue'
import StudentKpiSharing from '@/components/classroom/student/StudentKpiSharing.vue'
import { useClassGroupSubmissionStore } from '@/stores/classGroupSubmissions'
import { useKpiConsentStore } from '@/stores/kpiConsent'

const { mockOpenFile, mockDownloadFile } = vi.hoisted(() => ({ mockOpenFile: vi.fn(), mockDownloadFile: vi.fn() }))
vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))
vi.mock('@/composables/useStoredFile', () => ({ useStoredFile: () => ({ openFile: mockOpenFile, downloadFile: mockDownloadFile }) }))

const day = (n) => new Date(Date.now() + n * 24 * 3600 * 1000).toISOString().slice(0, 10)
const RouterLink = { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' }

function mountPanel(component, { props = {}, state = {} } = {}) {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true, initialState: state })
  return mount(component, { props, global: { plugins: [pinia], stubs: { RouterLink } }, attachTo: document.body })
}
const btn = (w, text) => w.findAll('button').find((b) => b.text().trim() === text)
const file = (name = 'dm.pdf') => new File(['x'], name, { type: 'application/pdf' })

beforeEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ''
})

describe('StudentGroupPicker', () => {
  const groups = [{ id: 1, name: 'MP2I A', code: 'A', level: 'Prépa' }, { id: 2, name: 'L3', code: 'L3', level: 'L3' }]

  it('une carte par groupe (niveau, nom, code), la sélection est mise en évidence', () => {
    const w = mountPanel(StudentGroupPicker, { props: { groups, selectedId: 2 } })
    const cards = w.findAll('[role="button"]')
    expect(cards.map((c) => c.find('.text-lg').text())).toEqual(['MP2I A', 'L3'])
    expect(cards[1].classes()).toContain('border-primary')
    expect(cards[0].classes()).toContain('border-gray')
  })

  it('clic, Entrée et Espace émettent « select » (RGAA 7.1)', async () => {
    const w = mountPanel(StudentGroupPicker, { props: { groups, selectedId: null } })
    const card = w.findAll('[role="button"]')[0]
    expect(card.attributes('tabindex')).toBe('0')
    await card.trigger('click')
    await card.trigger('keydown', { key: 'Enter' })
    await card.trigger('keydown', { key: ' ' })
    expect(w.emitted('select')).toEqual([[1], [1], [1]])
  })

  it('aucun groupe', () => {
    expect(mountPanel(StudentGroupPicker, { props: { groups: [] } }).text()).toContain('Aucun groupe.')
  })
})

describe('StudentSearchBar', () => {
  it('champ nommé (RGAA 11.1), valeur liée en v-model', async () => {
    const w = mountPanel(StudentSearchBar, { props: { modelValue: 'cours', 'onUpdate:modelValue': (v) => w.setProps({ modelValue: v }) } })
    const input = w.find('input')
    expect(input.attributes('aria-label')).toBe('Rechercher une section, un rendu, une ressource')
    expect(input.element.value).toBe('cours')
    await input.setValue('dm')
    expect(w.emitted('update:modelValue')[0]).toEqual(['dm'])
  })

  it('le bouton d’effacement n’apparaît que s’il y a une saisie, et vide le champ', async () => {
    const w = mountPanel(StudentSearchBar, { props: { modelValue: '', 'onUpdate:modelValue': (v) => w.setProps({ modelValue: v }) } })
    expect(w.find('button[aria-label="Effacer la recherche"]').exists()).toBe(false)
    await w.setProps({ modelValue: 'x' })
    await w.find('button[aria-label="Effacer la recherche"]').trigger('click')
    expect(w.emitted('update:modelValue').at(-1)).toEqual([''])
  })
})

describe('StudentUpcomingSessions', () => {
  const EVENTS = [
    { id: 1, name: 'Maths', type: 'cours', occurrences: [{ id: 11, date: day(3), startTime: '08:00:00', endTime: '10:00:00' }, { id: 12, date: day(-2), startTime: '08:00:00', endTime: '10:00:00' }] },
    { id: 2, name: 'Partiel', type: 'examen', occurrences: [{ id: 21, date: day(1), startTime: '09:00:00', endTime: '12:00:00' }] },
    { id: 3, name: 'Sans séance', type: 'autre' },
  ]
  const mountSessions = (events = EVENTS, props = {}) => mountPanel(StudentUpcomingSessions, { props, state: { calendarEvents: { groupEvents: events } } })

  it('chargement et liste vide', () => {
    expect(mountSessions(EVENTS, { loading: true }).text()).toContain('Chargement...')
    expect(mountSessions([]).text()).toContain('Aucune séance prévue.')
  })

  it('séances à venir uniquement, de la plus proche à la plus lointaine, avec heures et type', () => {
    const w = mountSessions()
    const names = w.findAll('.text-sm.font-semibold').map((n) => n.text())
    expect(names).toEqual(['Partiel', 'Maths'])
    expect(w.text()).toContain('09:00 – 12:00')
    expect(w.text()).toContain('Examen')
    expect(w.text()).toContain('Cours')
  })

  it('limite à 10 séances', () => {
    const many = [{ id: 1, name: 'Cours', type: 'cours', occurrences: Array.from({ length: 15 }, (_, i) => ({ id: i, date: day(i + 1), startTime: '08:00:00', endTime: '09:00:00' })) }]
    expect(mountSessions(many).findAll('.rounded-xl.border')).toHaveLength(10)
  })
})

describe('StudentSections', () => {
  const SECTIONS = [
    { id: 1, title: 'Chapitre 1', type: 'section', description: 'Introduction', dueDate: day(5) },
    { id: 2, title: 'DM', type: 'rendu', description: '', dueDate: null },
    { id: 3, title: 'Annexes', type: 'section', description: '', dueDate: null },
  ]
  const mountSections = (props = {}, sections = SECTIONS) => mountPanel(StudentSections, { props, state: { classGroupSections: { sections } } })

  it('seules les sections (pas les rendus) sont listées', () => {
    const text = mountSections().text()
    expect(text).toContain('Chapitre 1')
    expect(text).toContain('Annexes')
    expect(text).not.toContain('DM')
    expect(text).toContain('Cible :')
  })

  it('messages vides, avec ou sans recherche', () => {
    expect(mountSections({}, []).text()).toContain('Aucune section partagée.')
    expect(mountSections({ search: 'zzz' }).text()).toContain('Aucune section correspondante.')
    expect(mountSections({ loading: true }).text()).toContain('Chargement...')
  })

  it('recherche sur le titre et la description, insensible à la casse', () => {
    expect(mountSections({ search: 'CHAPITRE' }).text()).toContain('Chapitre 1')
    expect(mountSections({ search: 'introduc' }).text()).toContain('Chapitre 1')
    expect(mountSections({ search: 'annexes' }).text()).not.toContain('Chapitre 1')
  })
})

describe('StudentRendus / StudentRenduCard', () => {
  const SECTIONS = [
    { id: 32, title: 'DM 1', type: 'rendu', description: 'À rendre vite', dueDate: day(1) },
    { id: 33, title: 'DM 2', type: 'rendu', description: '', dueDate: day(20) },
    { id: 1, title: 'Chapitre', type: 'section', description: '', dueDate: null },
  ]
  const SUBMISSION = { 32: { id: 900, originalName: 'dm1.pdf', fileKey: 'sub-key' } }
  const mountRendus = (props = {}, { sections = SECTIONS, submissions = {} } = {}) =>
    mountPanel(StudentRendus, {
      props: { groupId: 7, ...props },
      state: { classGroupSections: { sections }, classGroupSubmissions: { mySubmissions: submissions, uploading: false } },
    })
  const cards = (w) => w.findAllComponents(StudentRenduCard)

  it('un rendu par carte (les sections sont ignorées)', () => {
    const w = mountRendus()
    expect(cards(w)).toHaveLength(2)
    expect(w.text()).toContain('DM 1')
    expect(w.text()).not.toContain('Chapitre')
  })

  it('messages vides, avec ou sans recherche', () => {
    expect(mountRendus({}, { sections: [] }).text()).toContain('Aucun rendu à remettre.')
    expect(mountRendus({ search: 'zzz' }).text()).toContain('Aucun rendu correspondant.')
    expect(mountRendus({ loading: true }).text()).toContain('Chargement...')
  })

  it('recherche : filtre les cartes', () => {
    expect(cards(mountRendus({ search: 'vite' }))).toHaveLength(1)
  })

  describe('carte d’un rendu', () => {
    it('échéance proche : mise en évidence « urgent »', () => {
      const [urgent, calm] = cards(mountRendus())
      expect(urgent.classes()).toContain('border-secondary/50')
      expect(calm.classes()).not.toContain('border-secondary/50')
      expect(urgent.find('.text-secondary.font-semibold').exists()).toBe(true)
    })

    it('non soumis : « Non soumis », zone de dépôt avec bouton « parcourez » (RGAA 7.1)', () => {
      const w = mountRendus()
      expect(w.text()).toContain('Non soumis')
      expect(w.findAll('button').some((b) => b.text().includes('Glissez votre rendu ici'))).toBe(true)
      expect(w.find('input[type="file"]').attributes('aria-label')).toBe('Choisir un fichier à rendre')
    })

    it('fichier déposé : nom et taille affichés, bouton « Remettre le rendu »', async () => {
      const w = mountRendus()
      const zone = cards(w)[0].find('.border-dashed')
      await zone.trigger('dragover')
      expect(zone.classes()).toContain('border-secondary')
      await zone.trigger('drop', { dataTransfer: { files: [file('depot.pdf')] } })
      expect(zone.classes()).not.toContain('border-secondary')
      expect(cards(w)[0].text()).toContain('depot.pdf')
      expect(btn(cards(w)[0], 'Remettre le rendu')).toBeDefined()
      expect(btn(cards(w)[1], 'Remettre le rendu')).toBeUndefined() // l'autre rendu n'est pas concerné
    })

    it('fichier choisi par l’input', async () => {
      const w = mountRendus()
      const input = cards(w)[1].find('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file('choisi.pdf')], configurable: true })
      await input.trigger('change')
      expect(cards(w)[1].text()).toContain('choisi.pdf')
    })

    it('« Retirer » écarte le fichier en attente', async () => {
      const w = mountRendus()
      await cards(w)[0].find('.border-dashed').trigger('drop', { dataTransfer: { files: [file()] } })
      await btn(cards(w)[0], 'Retirer').trigger('click')
      expect(cards(w)[0].text()).toContain('Glissez votre rendu ici')
    })

    it('remise : envoie le fichier au bon groupe et au bon rendu, puis vide l’attente', async () => {
      const w = mountRendus()
      const f = file('final.pdf')
      useClassGroupSubmissionStore().uploadAndSubmit.mockResolvedValue(true)
      await cards(w)[0].find('.border-dashed').trigger('drop', { dataTransfer: { files: [f] } })
      await btn(cards(w)[0], 'Remettre le rendu').trigger('click')
      await flushPromises()
      expect(useClassGroupSubmissionStore().uploadAndSubmit).toHaveBeenCalledWith(7, 32, f)
      expect(cards(w)[0].text()).not.toContain('final.pdf')
    })

    it('remise en échec : le fichier reste en attente', async () => {
      const w = mountRendus()
      useClassGroupSubmissionStore().uploadAndSubmit.mockResolvedValue(false)
      await cards(w)[0].find('.border-dashed').trigger('drop', { dataTransfer: { files: [file('garde.pdf')] } })
      await btn(cards(w)[0], 'Remettre le rendu').trigger('click')
      await flushPromises()
      expect(cards(w)[0].text()).toContain('garde.pdf')
    })

    it('envoi en cours : bouton désactivé', async () => {
      const w = mountPanel(StudentRendus, {
        props: { groupId: 7 },
        state: { classGroupSections: { sections: SECTIONS }, classGroupSubmissions: { mySubmissions: {}, uploading: true } },
      })
      await w.findAllComponents(StudentRenduCard)[0].find('.border-dashed').trigger('drop', { dataTransfer: { files: [file()] } })
      expect(btn(w, 'Envoi en cours...').attributes('disabled')).toBeDefined()
    })

    it('le fichier en attente survit à un filtrage par la recherche (la carte est démontée puis remontée)', async () => {
      const w = mountRendus()
      await cards(w)[0].find('.border-dashed').trigger('drop', { dataTransfer: { files: [file('survivant.pdf')] } })
      await w.setProps({ search: 'zzz' })
      expect(cards(w)).toHaveLength(0)
      await w.setProps({ search: '' })
      expect(cards(w)[0].text()).toContain('survivant.pdf')
    })

    it('déjà soumis : « ✓ Soumis », nom du fichier, voir / télécharger / retirer, pas de zone de dépôt', async () => {
      const w = mountRendus({}, { submissions: SUBMISSION })
      const card = cards(w)[0]
      expect(card.text()).toContain('✓ Soumis')
      expect(card.text()).toContain('dm1.pdf')
      expect(card.find('.border-dashed').exists()).toBe(false)
      await btn(card, 'Voir').trigger('click')
      await btn(card, 'Télécharger').trigger('click')
      expect(mockOpenFile).toHaveBeenCalledWith('sub-key')
      expect(mockDownloadFile).toHaveBeenCalledWith('sub-key')
      await btn(card, 'Retirer').trigger('click')
      expect(useClassGroupSubmissionStore().deleteSubmission).toHaveBeenCalledWith(7, 32, 900)
    })
  })
})

describe('StudentDeadlines', () => {
  const DEADLINES = [
    { id: 1, name: 'DS 1', type: 'ds', dueDate: day(2), dueTime: '14:30:00', test: { testId: 7, name: 'Algèbre' }, occurrence: { calendarEvent: { name: 'Maths' } } },
    { id: 2, name: 'Exposé', type: 'exposé', dueDate: day(30), dueTime: null, test: null, occurrence: null },
    { id: 3, name: 'Passée', type: 'autre', dueDate: day(-5), dueTime: null, test: null, occurrence: null },
  ]
  const mountDeadlines = (deadlines = DEADLINES, props = {}) => mountPanel(StudentDeadlines, { props, state: { deadlines: { groupDeadlines: deadlines } } })

  it('chargement et liste vide', () => {
    expect(mountDeadlines(DEADLINES, { loading: true }).text()).toContain('Chargement...')
    expect(mountDeadlines([]).text()).toContain('Aucune échéance prévue.')
  })

  it('échéances à venir seulement ; heure, séance et type affichés', () => {
    const w = mountDeadlines()
    expect(w.text()).toContain('DS 1')
    expect(w.text()).toContain('Exposé')
    expect(w.text()).not.toContain('Passée')
    expect(w.text()).toContain('à 14:30')
    expect(w.text()).toContain('Séance : Maths')
    expect(w.text()).toContain('DS')
  })

  it('échéance proche mise en évidence, lointaine non', () => {
    const rows = mountDeadlines().findAll('.rounded-xl.border')
    expect(rows[0].classes()).toContain('border-secondary/50')
    expect(rows[1].classes()).not.toContain('border-secondary/50')
  })

  it('lien vers l’exercice associé', () => {
    const link = mountDeadlines().find('a')
    expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'exercise-detail', params: { id: 7 } })
    expect(link.text()).toContain('Algèbre')
  })
})

describe('StudentResources', () => {
  const RESOURCES = [
    { id: 1, title: 'Cours.pdf', type: 'cours', mimeType: 'application/pdf', fileSize: 2048, fileKey: 'k1', creator: { name: 'Prof Un' } },
    { id: 2, title: 'Diaporama', type: 'autre', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', fileSize: 0, fileKey: null, creator: { name: 'Prof Deux' } },
  ]
  const mountResources = (props = {}, resources = RESOURCES) => mountPanel(StudentResources, { props, state: { classGroupResources: { resources } } })

  it('liste : icône, type, auteur, taille ; icône de présentation correcte pour un .pptx', () => {
    const text = mountResources().text()
    expect(text).toContain('📕')
    expect(text.replace(/\s+/g, ' ')).toContain('Cours · Prof Un · 2 Ko')
    expect(text).toContain('📊')
    expect(text).not.toContain('📝')
  })

  it('« Télécharger » seulement pour un document qui a un fichier', async () => {
    const w = mountResources()
    expect(w.findAll('button').filter((b) => b.text() === 'Télécharger')).toHaveLength(1)
    await btn(w, 'Télécharger').trigger('click')
    expect(mockDownloadFile).toHaveBeenCalledWith('k1')
  })

  it('messages vides, avec ou sans recherche', () => {
    expect(mountResources({}, []).text()).toContain('Aucun document partagé.')
    expect(mountResources({ search: 'zzz' }).text()).toContain('Aucune ressource correspondante.')
    expect(mountResources({ loading: true }).text()).toContain('Chargement...')
  })

  it('recherche sur le titre et le type', () => {
    expect(mountResources({ search: 'diapo' }).text()).not.toContain('Cours.pdf')
    expect(mountResources({ search: 'AUTRE' }).text()).toContain('Diaporama')
  })
})

describe('StudentKpiSharing', () => {
  const GROUP = {
    id: 1,
    members: [
      { userId: 10, role: 'teacher', user: { name: 'Prof Un' } },
      { userId: 11, role: 'teacher', user: { name: 'Prof Deux' } },
      { userId: 21, role: 'student', user: { name: 'Alice' } },
    ],
  }
  const CONSENTS = [
    { id: 1, teacherId: 10, classGroupId: 1, subjectId: null, teacher: { name: 'Prof Un' }, classGroup: { name: 'MP2I A' }, subject: null, grantedAt: '2026-10-01T10:00:00Z' },
    { id: 2, teacherId: 11, classGroupId: 1, subjectId: 3, teacher: { name: 'Prof Deux' }, classGroup: { name: 'MP2I A' }, subject: { name: 'Maths' }, grantedAt: '2026-10-02T10:00:00Z' },
    { id: 3, teacherId: 10, classGroupId: 2, subjectId: null, teacher: { name: 'Autre' }, classGroup: { name: 'L3' }, subject: null, grantedAt: '2026-10-03T10:00:00Z' },
  ]
  const SUBJECTS = [{ subjectId: 3, name: 'Maths' }, { subjectId: 4, name: 'Physique' }]
  const mountKpi = ({ group = GROUP, consents = CONSENTS, loading = false, granting = false } = {}) =>
    mountPanel(StudentKpiSharing, { props: { group }, state: { kpiConsent: { consents, loading, granting }, subjects: { subjects: SUBJECTS } } })

  it('chargement des partages', () => {
    expect(mountKpi({ loading: true }).text()).toContain('Chargement des partages…')
  })

  it('accès accordés : uniquement ceux du groupe affiché, avec matière ou « Toutes matières »', () => {
    const text = mountKpi().text()
    expect(text).toContain('Accès accordés (2)')
    expect(text).toContain('Prof Un')
    expect(text).toContain('Toutes matières')
    expect(text).toContain('Maths')
    expect(text).not.toContain('Autre')
  })

  it('aucun accès : message et libellé « Autoriser un enseignant »', () => {
    const w = mountKpi({ consents: [] })
    expect(w.text()).toContain("Vous n'avez autorisé aucun enseignant")
    expect(w.text()).toContain('Autoriser un enseignant')
  })

  it('enseignants proposés : ceux sans accès global ; matières déjà accordées exclues', async () => {
    const w = mountKpi()
    const teachers = w.findAll('select[aria-label="Enseignant"] option').map((o) => o.text())
    expect(teachers).toEqual(['Choisir un enseignant du groupe', 'Prof Deux'])
    await w.find('select[aria-label="Enseignant"]').setValue(11)
    expect(w.findAll('select[aria-label="Sujet"] option').map((o) => o.text())).toEqual(['Toutes mes matières (accès global)', 'Physique'])
  })

  it('changer d’enseignant remet la matière à « globale »', async () => {
    const w = mountKpi({ consents: [] })
    await w.find('select[aria-label="Enseignant"]').setValue(10)
    await w.find('select[aria-label="Sujet"]').setValue(4)
    await w.find('select[aria-label="Enseignant"]').setValue(11)
    expect(w.find('select[aria-label="Sujet"]').element.selectedIndex).toBe(0) // « Toutes mes matières »
  })

  it('aucun enseignant dans le groupe / tous ont déjà accès : messages dédiés', () => {
    expect(mountKpi({ group: { id: 1, members: [GROUP.members[2]] }, consents: [] }).text()).toContain('Aucun enseignant disponible dans ce groupe.')
    const all = [CONSENTS[0], { ...CONSENTS[1], subjectId: null }]
    expect(mountKpi({ consents: all }).text()).toContain('Tous les enseignants de ce groupe ont déjà accès')
  })

  it('« Accorder l’accès » : désactivé sans enseignant ; sinon accorde pour ce groupe et vide le formulaire', async () => {
    const w = mountKpi()
    expect(btn(w, "Accorder l'accès").attributes('disabled')).toBeDefined()
    useKpiConsentStore().grantConsent.mockResolvedValue(true)
    await w.find('select[aria-label="Enseignant"]').setValue(11)
    await w.find('select[aria-label="Sujet"]').setValue(4)
    await btn(w, "Accorder l'accès").trigger('click')
    await flushPromises()
    expect(useKpiConsentStore().grantConsent).toHaveBeenCalledWith(11, 1, 4)
    expect(w.find('select[aria-label="Enseignant"]').element.selectedIndex).toBe(0) // « Choisir un enseignant »
  })

  it('envoi en cours : bouton « Envoi… » désactivé', async () => {
    const w = mountKpi({ granting: true })
    await w.find('select[aria-label="Enseignant"]').setValue(11)
    expect(btn(w, 'Envoi…').attributes('disabled')).toBeDefined()
  })

  describe('révocation', () => {
    const dialog = () => document.body.querySelector('[role="dialog"]')
    const click = async (selector) => {
      document.body.querySelector(selector).click()
      await flushPromises()
    }

    it('ouvre une confirmation nominative (accès global)', async () => {
      const w = mountKpi()
      await w.findAll('button').filter((b) => b.text() === 'Révoquer')[0].trigger('click')
      expect(dialog().textContent).toContain("Révoquer l'accès à Prof Un (Toutes matières) ?")
      expect(dialog().textContent).toContain("l'ensemble de vos KPI personnels")
    })

    it('accès par matière : la confirmation cite la matière', async () => {
      const w = mountKpi()
      await w.findAll('button').filter((b) => b.text() === 'Révoquer')[1].trigger('click')
      expect(dialog().textContent).toContain('vos KPI de Maths')
    })

    it('« Annuler » ferme sans révoquer', async () => {
      const w = mountKpi()
      await w.findAll('button').filter((b) => b.text() === 'Révoquer')[0].trigger('click')
      await click('.btn-modal-cancel')
      expect(dialog()).toBeNull()
      expect(useKpiConsentStore().revokeConsent).not.toHaveBeenCalled()
    })

    it('confirmer révoque cet accès précisément, puis ferme', async () => {
      const w = mountKpi()
      await w.findAll('button').filter((b) => b.text() === 'Révoquer')[1].trigger('click')
      await click('.btn-modal-danger')
      expect(useKpiConsentStore().revokeConsent).toHaveBeenCalledWith(11, 1, 3)
      expect(dialog()).toBeNull()
    })
  })
})
