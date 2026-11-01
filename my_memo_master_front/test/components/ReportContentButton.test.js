import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ReportContentButton from '@/components/classroom/ReportContentButton.vue'
import StudentResources from '@/components/classroom/student/StudentResources.vue'
import StudentSections from '@/components/classroom/student/StudentSections.vue'
import TeacherResourceList from '@/components/classroom/teacher/TeacherResourceList.vue'
import TeacherSectionsPanel from '@/components/classroom/teacher/TeacherSectionsPanel.vue'
import { CONFIRM_ACTION_KEY } from '@/composables/useConfirmAction'
import { useAuthStore } from '@/stores/auth'
import { useClassGroupResourceStore } from '@/stores/classGroupResources'
import { useClassGroupSectionStore } from '@/stores/classGroupSections'
import { useContentReportStore } from '@/stores/contentReports'

const { mockPost, mockNotify } = vi.hoisted(() => ({ mockPost: vi.fn(), mockNotify: vi.fn() }))

vi.mock('@/helpers/api', () => ({ api: { get: vi.fn(), post: mockPost, put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/notif', () => ({ notif: { notify: mockNotify } }))

const ME = 21
const OTHER = 99

let wrapper
let pinia

function setup() {
  pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.user = { userId: ME, roleId: 2 }
  return pinia
}

function mountButton(props = {}) {
  return mount(ReportContentButton, {
    props: { contentType: 'resource', contentId: 4, contentTitle: 'Cours Analyse', authorId: OTHER, ...props },
    global: { plugins: [pinia] },
    attachTo: document.body,
  })
}

const findButton = (w, text) => w.findAll('button').find((b) => b.text() === text)

beforeEach(() => {
  vi.clearAllMocks()
  setup()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('ReportContentButton', () => {
  describe('visibilité', () => {
    it('contenu d\'un autre utilisateur - affiche le bouton Signaler avec un nom accessible', () => {
      wrapper = mountButton()
      const btn = wrapper.get('button')
      expect(btn.text()).toBe('Signaler')
      expect(btn.attributes('aria-label')).toBe('Signaler « Cours Analyse »')
    })

    it('contenu de l\'utilisateur connecté - n\'affiche aucun bouton', () => {
      wrapper = mountButton({ authorId: ME })
      expect(wrapper.find('button').exists()).toBe(false)
    })

    it('auteur inconnu - affiche le bouton (l\'API tranchera)', () => {
      wrapper = mountButton({ authorId: null })
      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('utilisateur non connecté - n\'affiche aucun bouton', () => {
      useAuthStore().user = null
      wrapper = mountButton()
      expect(wrapper.find('button').exists()).toBe(false)
    })
  })

  describe('formulaire', () => {
    it('clic sur Signaler - ouvre la modale avec les six motifs', async () => {
      wrapper = mountButton()
      expect(document.body.querySelector('[role="dialog"]')).toBeNull()

      await wrapper.get('button').trigger('click')

      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
      expect(wrapper.findAll('input[type="radio"]')).toHaveLength(6)
      expect(wrapper.text()).toContain('Cours Analyse')
    })

    it('envoi sans motif - affiche l\'erreur et n\'appelle pas l\'API', async () => {
      wrapper = mountButton()
      await wrapper.get('button').trigger('click')

      await wrapper.get('form').trigger('submit')

      expect(wrapper.get('[role="alert"]').text()).toBe('Choisissez un motif de signalement.')
      expect(mockPost).not.toHaveBeenCalled()
    })

    it('motif Autre sans commentaire - exige une précision', async () => {
      wrapper = mountButton()
      await wrapper.get('button').trigger('click')
      await wrapper.get('input[value="other"]').setValue()

      await wrapper.get('form').trigger('submit')

      expect(wrapper.get('[role="alert"]').text()).toContain('obligatoire')
      expect(wrapper.get('textarea').attributes('aria-invalid')).toBe('true')
      expect(wrapper.get('textarea').attributes('required')).toBeDefined()
      expect(mockPost).not.toHaveBeenCalled()
    })

    it('motif sans obligation de commentaire - le champ est facultatif', async () => {
      wrapper = mountButton()
      await wrapper.get('button').trigger('click')
      await wrapper.get('input[value="spam"]').setValue()

      expect(wrapper.get('label[for$="-comment"]').text()).toContain('facultatif')
      expect(wrapper.get('textarea').attributes('required')).toBeUndefined()
    })

    it('le compteur suit la saisie et le champ est borné à 500 caractères', async () => {
      wrapper = mountButton()
      await wrapper.get('button').trigger('click')

      await wrapper.get('textarea').setValue('abc')

      expect(wrapper.text()).toContain('3 / 500')
      expect(wrapper.get('textarea').attributes('maxlength')).toBe('500')
    })

    it('envoi valide - poste le signalement, ferme la modale et notifie', async () => {
      mockPost.mockResolvedValueOnce({ status: 201, data: { data: { id: 1 } } })
      wrapper = mountButton()
      await wrapper.get('button').trigger('click')
      await wrapper.get('input[value="harassment"]').setValue()
      await wrapper.get('textarea').setValue('Propos déplacés')

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(mockPost).toHaveBeenCalledWith('content-reports', {
        contentType: 'resource', contentId: 4, reason: 'harassment', comment: 'Propos déplacés',
      })
      expect(document.body.querySelector('[role="dialog"]')).toBeNull()
      expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('Signalement envoyé'), 'success')
    })

    it('signalement d\'une section - envoie contentType section', async () => {
      mockPost.mockResolvedValueOnce({ status: 201, data: {} })
      wrapper = mountButton({ contentType: 'section', contentId: 9, contentTitle: 'Chapitre 1' })
      await wrapper.get('button').trigger('click')
      await wrapper.get('input[value="spam"]').setValue()

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(mockPost.mock.calls[0][1]).toMatchObject({ contentType: 'section', contentId: 9 })
    })

    it('refus de l\'API (doublon) - garde la modale ouverte et affiche le message', async () => {
      mockPost.mockResolvedValueOnce({ status: 409, data: { message: 'Vous avez déjà un signalement en cours sur ce contenu.' } })
      wrapper = mountButton()
      await wrapper.get('button').trigger('click')
      await wrapper.get('input[value="spam"]').setValue()

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
      expect(mockNotify).toHaveBeenCalledWith('Vous avez déjà un signalement en cours sur ce contenu.', 'warning')
    })

    it('pendant l\'envoi - le bouton d\'envoi est désactivé', async () => {
      wrapper = mountButton()
      await wrapper.get('button').trigger('click')
      useContentReportStore().submitting = true
      await wrapper.vm.$nextTick()

      expect(findButton(wrapper, 'Envoyer le signalement').attributes('disabled')).toBeDefined()
    })

    it('Annuler - ferme la modale sans appeler l\'API', async () => {
      wrapper = mountButton()
      await wrapper.get('button').trigger('click')

      await findButton(wrapper, 'Annuler').trigger('click')

      expect(document.body.querySelector('[role="dialog"]')).toBeNull()
      expect(mockPost).not.toHaveBeenCalled()
    })

    it('réouverture - repart d\'un formulaire vide', async () => {
      wrapper = mountButton()
      await wrapper.get('button').trigger('click')
      await wrapper.get('input[value="spam"]').setValue()
      await wrapper.get('textarea').setValue('Ancien texte')
      await findButton(wrapper, 'Annuler').trigger('click')

      await wrapper.get('button').trigger('click')

      expect(wrapper.get('textarea').element.value).toBe('')
      expect(wrapper.get('input[value="spam"]').element.checked).toBe(false)
    })
  })
})

describe('Bouton Signaler dans les listes de contenus', () => {
  const RESOURCES = [
    { id: 1, title: 'Cours A', type: 'cours', createdBy: OTHER, creator: { name: 'Prof' } },
    { id: 2, title: 'Mon document', type: 'cours', createdBy: ME, creator: { name: 'Moi' } },
  ]
  const SECTIONS = [
    { id: 10, title: 'Chapitre 1', type: 'section', createdBy: OTHER, description: '', dueDate: null },
    { id: 11, title: 'Ma section', type: 'section', createdBy: ME, description: '', dueDate: null },
    { id: 12, title: 'DM 1', type: 'rendu', createdBy: OTHER, description: '', dueDate: null },
  ]

  const reportLabels = (w) => w.findAll('button').map((b) => b.attributes('aria-label')).filter((l) => l?.startsWith('Signaler'))

  function seed() {
    useClassGroupResourceStore().resources = RESOURCES
    useClassGroupSectionStore().sections = SECTIONS
  }

  it('StudentResources - une ressource d\'autrui et une ressource à soi - un seul bouton, sur celle d\'autrui', () => {
    seed()
    wrapper = mount(StudentResources, { global: { plugins: [pinia] } })
    expect(reportLabels(wrapper)).toEqual(['Signaler « Cours A »'])
  })

  it('StudentSections - sections d\'autrui - signalables, la section à soi non', () => {
    seed()
    wrapper = mount(StudentSections, { global: { plugins: [pinia] } })
    expect(reportLabels(wrapper)).toEqual(['Signaler « Chapitre 1 »'])
  })

  it('TeacherResourceList - ressource d\'un autre enseignant - signalable, la sienne non', () => {
    seed()
    wrapper = mount(TeacherResourceList, { props: { groupId: 1 }, global: { plugins: [pinia], provide: { [CONFIRM_ACTION_KEY]: vi.fn() } } })
    expect(reportLabels(wrapper)).toEqual(['Signaler « Cours A »'])
  })

  it('TeacherSectionsPanel - sections et rendus d\'autrui - signalables, la sienne non', () => {
    seed()
    wrapper = mount(TeacherSectionsPanel, {
      props: { groupId: 1, loading: false, refreshToken: 0 },
      global: { plugins: [pinia], provide: { [CONFIRM_ACTION_KEY]: vi.fn() } },
    })
    expect(reportLabels(wrapper)).toEqual(['Signaler « Chapitre 1 »', 'Signaler « DM 1 »'])
  })
})
