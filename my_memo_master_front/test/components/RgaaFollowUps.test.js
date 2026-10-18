import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ItemListLayout from '@/components/ItemListLayout.vue'
import FlashcardsCardListComponent from '@/components/flashcards/FlashcardsCardListComponent.vue'
import FlashcardsBoxesPanelComponent from '@/components/flashcards/FlashcardsBoxesPanelComponent.vue'
import TeacherResourceForm from '@/components/classroom/teacher/TeacherResourceForm.vue'
import StudentRenduCard from '@/components/classroom/student/StudentRenduCard.vue'
import ClassroomPage from '@/pages/ClassroomPage.vue'

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn().mockResolvedValue({ status: 200, data: [] }), post: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))
vi.mock('@/composables/useStoredFile', () => ({ useStoredFile: () => ({ openFile: vi.fn(), downloadFile: vi.fn() }) }))
vi.mock('@/composables/useRole', () => ({
  useRole: () => ({ isAdmin: { value: true }, isAdminPlateforme: { value: true }, isEnseignant: { value: false } }),
}))
// Les vues de la page Classe sont testées à part : ici seule la barre de choix de vue compte.
vi.mock('@/pages/ClassroomPlateformeView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/pages/ClassroomEtablissementView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/pages/ClassroomEnseignantView.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/pages/ClassroomEtudiantView.vue', () => ({ default: { template: '<div />' } }))

beforeEach(() => { vi.clearAllMocks(); document.body.innerHTML = '' })

const pinia = (state = {}) => createTestingPinia({ createSpy: vi.fn, stubActions: true, initialState: state })

describe('ItemListLayout — filtre de sujets', () => {
  const SUBJECTS = [{ subjectId: 1, name: 'Maths' }, { subjectId: 2, name: 'Physique' }]
  const mountList = (props = {}) =>
    mount(ItemListLayout, {
      props: { search: '', subjects: SUBJECTS, filteredCount: 2, itemLabel: 'exercice', ...props },
      slots: { default: '<p>contenu</p>' },
    })
  const filterButtons = (w) => w.findAll('[role="group"] button')

  it('groupe nommé par « Filtrer par sujet » ; chaque sujet annonce son état (aria-pressed)', () => {
    const w = mountList({ selectedSubjectId: 2 })
    const group = w.find('[role="group"]')
    expect(w.find(`#${group.attributes('aria-labelledby')}`).text()).toBe('Filtrer par sujet :')
    expect(filterButtons(w).slice(0, 2).map((b) => [b.text(), b.attributes('aria-pressed')])).toEqual([['Maths', 'false'], ['Physique', 'true']])
  })

  it('aucun sujet choisi : tous à false, pas de « Réinitialiser »', () => {
    const w = mountList()
    expect(filterButtons(w).map((b) => b.attributes('aria-pressed'))).toEqual(['false', 'false'])
    expect(w.text()).not.toContain('Réinitialiser')
  })

  it('un clic choisit le sujet, un second clic le retire ; « Réinitialiser » vide le choix', async () => {
    const w = mountList({ selectedSubjectId: 1 })
    await filterButtons(w)[1].trigger('click')
    await filterButtons(w)[0].trigger('click')
    await w.findAll('button').find((b) => b.text() === 'Réinitialiser').trigger('click')
    expect(w.emitted('update:selectedSubjectId')).toEqual([[2], [null], [null]])
  })

  it.each([
    [0, 'exercice', undefined, false, '0 exercice trouvé'],
    [1, 'exercice', undefined, false, '1 exercice trouvé'],
    [2, 'exercice', undefined, false, '2 exercices trouvés'],
    [0, 'carte mentale', 'cartes mentales', true, '0 carte mentale trouvée'],
    [1, 'carte mentale', 'cartes mentales', true, '1 carte mentale trouvée'],
    [2, 'carte mentale', 'cartes mentales', true, '2 cartes mentales trouvées'],
    [5, 'système', undefined, false, '5 systèmes trouvés'],
  ])('%i %s : « %s » accordé', (count, label, labelPlural, feminine, expected) => {
    const w = mountList({ filteredCount: count, itemLabel: label, itemLabelPlural: labelPlural, feminine })
    expect(w.find('p.text-sm').text().replace(/\s+/g, ' ')).toBe(expected)
  })

  it('le chargement emploie le pluriel du libellé', () => {
    expect(mountList({ loading: true, itemLabel: 'carte mentale', itemLabelPlural: 'cartes mentales' }).text()).toContain('Chargement des cartes mentales…')
    expect(mountList({ loading: true, itemLabel: 'exercice' }).text()).toContain('Chargement des exercices…')
  })
})

describe('boutons ✎ / ✕ des cartes et des boîtes', () => {
  const card = (idCard, statement) => ({ idCard, question: statement === null ? null : { statement }, correctAnswer: 'x' })

  it('chaque carte a des actions nommées par sa question', () => {
    const w = mount(FlashcardsCardListComponent, { props: { cardsByLevel: { 1: [card(1, 'Capitale de la France ?'), card(2, 'Dérivée de x²')] } } })
    expect(w.findAll('button').map((b) => b.attributes('aria-label'))).toEqual([
      'Modifier la carte « Capitale de la France ? »', 'Supprimer la carte « Capitale de la France ? »',
      'Modifier la carte « Dérivée de x² »', 'Supprimer la carte « Dérivée de x² »',
    ])
  })

  it('question longue raccourcie, espaces normalisés ; sans question : numéro de la carte', () => {
    const long = `Une question ${'très '.repeat(30)}longue`
    const w = mount(FlashcardsCardListComponent, { props: { cardsByLevel: { 1: [card(1, long), card(7, null), card(8, '  a \n b  ')] } } })
    const labels = w.findAll('button').map((b) => b.attributes('aria-label'))
    expect(labels[0]).toMatch(/^Modifier la carte « Une question très .*… »$/)
    expect(labels[0].length).toBeLessThan(90)
    expect(labels[2]).toBe('Modifier la carte n° 7')
    expect(labels[4]).toBe('Modifier la carte « a b »')
  })

  it('les boutons restent de vrais boutons de type « button » et émettent leur carte', async () => {
    const c = card(1, 'Q')
    const w = mount(FlashcardsCardListComponent, { props: { cardsByLevel: { 1: [c] } } })
    for (const b of w.findAll('button')) expect(b.attributes('type')).toBe('button')
    await w.findAll('button')[0].trigger('click')
    await w.findAll('button')[1].trigger('click')
    expect(w.emitted('edit')[0][0]).toEqual(c)
    expect(w.emitted('delete')[0][0]).toEqual(c)
  })

  it('boîtes : actions nommées par leur niveau', () => {
    const w = mount(FlashcardsBoxesPanelComponent, { props: { boxes: [{ idBox: 1, level: 1, intervall: 60, color: '#ff0000' }, { idBox: 3, level: 3, intervall: 3600, color: '#00ff00' }] } })
    expect(w.findAll('button[aria-label]').map((b) => b.attributes('aria-label'))).toEqual([
      'Modifier la boîte B1', 'Supprimer la boîte B1', 'Modifier la boîte B3', 'Supprimer la boîte B3',
    ])
  })
})

describe('« Retirer » un fichier : nom explicite et focus rendu au clavier', () => {
  const file = (name) => new File(['x'], name, { type: 'application/pdf' })

  it('partage de document : « Retirer le fichier … », puis le focus revient sur « Parcourez »', async () => {
    const w = mount(TeacherResourceForm, { props: { groupId: 7 }, global: { plugins: [pinia()] }, attachTo: document.body })
    await w.find('.border-dashed').trigger('drop', { dataTransfer: { files: [file('cours.pdf')] } })
    const remove = w.findAll('button').find((b) => b.text() === 'Retirer')
    expect(remove.attributes('aria-label')).toBe('Retirer le fichier cours.pdf')
    remove.element.focus()
    await remove.trigger('click')
    await flushPromises()
    const browse = w.find('.border-dashed button')
    expect(browse.text()).toContain('parcourez')
    expect(document.activeElement).toBe(browse.element)
    w.unmount()
  })

  it('remise d’un rendu : même comportement', async () => {
    const w = mount(StudentRenduCard, {
      props: { rendu: { id: 3, title: 'DM', dueDate: null }, groupId: 7, pendingFile: file('dm.pdf') },
      global: { plugins: [pinia({ classGroupSubmissions: { mySubmissions: {} } })] },
      attachTo: document.body,
    })
    const remove = w.findAll('button').find((b) => b.text() === 'Retirer')
    expect(remove.attributes('aria-label')).toBe('Retirer le fichier dm.pdf')
    await remove.trigger('click')
    expect(w.emitted('update:pendingFile')).toEqual([[null]])
    await w.setProps({ pendingFile: null })
    await flushPromises()
    expect(document.activeElement).toBe(w.find('.border-dashed button').element)
    w.unmount()
  })
})

describe('ClassroomPage — barre « Vue : »', () => {
  it('groupe nommé ; chaque vue annonce son état et le suit au clic', async () => {
    const w = mount(ClassroomPage, {
      global: { plugins: [pinia({ invitations: { invitations: [] }, classGroups: { groups: [] } })] },
    })
    const group = w.find('[role="group"]')
    expect(w.find(`#${group.attributes('aria-labelledby')}`).text()).toBe('Vue :')
    const state = () => group.findAll('button').map((b) => [b.text(), b.attributes('aria-pressed')])
    expect(state().filter(([, pressed]) => pressed === 'true')).toHaveLength(1)
    const second = group.findAll('button')[1]
    await second.trigger('click')
    expect(second.attributes('aria-pressed')).toBe('true')
    expect(state().filter(([, pressed]) => pressed === 'true')).toHaveLength(1)
    for (const b of group.findAll('button')) expect(b.attributes('type')).toBe('button')
  })
})
