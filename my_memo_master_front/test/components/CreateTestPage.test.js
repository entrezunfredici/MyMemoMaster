import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import CreateTestPage from '@/pages/CreateTestPage.vue'
import { useQuestionStore } from '@/stores/questions'
import { useResponseStore } from '@/stores/responses'
import { useTestStore } from '@/stores/tests'

const stubs = {
  Mindmap: { template: '<div data-testid="mindmap" />' },
  MindmapComponent: { template: '<div data-testid="mindmap" />' },
  Dropdown: { template: '<div><slot /></div>' },
  DropdownComponent: { template: '<div><slot /></div>' },
  FormulaHelper: { template: '<div><slot /></div>' },
  FormulaHelperComponent: { template: '<div><slot /></div>' },
  FormulaText: { props: ['text'], template: '<span>{{ text }}</span>' },
  FormulaTextComponent: { props: ['text'], template: '<span>{{ text }}</span>' },
  Button: { props: ['callback'], template: '<button type="button" @click="callback"><slot /></button>' },
  ButtonComponent: { props: ['callback'], template: '<button type="button" @click="callback"><slot /></button>' },
}

function mountPage() {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
  const tests = useTestStore(pinia)
  const questions = useQuestionStore(pinia)
  const responses = useResponseStore(pinia)

  // Les actions réelles écrivent dans le store ; on simule le comportement utile à la page.
  tests.createTest.mockImplementation(async () => {
    tests.test = { ...tests.test, id: 42 }
    return true
  })
  questions.createQuestion.mockImplementation(async () => {
    questions.question = { ...questions.question, idQuestion: 100 + (questions.created = (questions.created || 0) + 1) }
    return true
  })
  responses.createResponse.mockResolvedValue(true)

  const wrapper = mount(CreateTestPage, { global: { plugins: [pinia], stubs } })
  return { wrapper, tests, questions, responses }
}

const addButton = (wrapper) => wrapper.findAll('button').find((b) => b.text() === 'Ajouter Question')
const fillQuestion = async (wrapper, statement, answer) => {
  await wrapper.find('input[aria-label="Énoncé de la question"]').setValue(statement)
  await wrapper.find('textarea[aria-label="Réponse attendue"]').setValue(answer)
}
const addQuestion = async (wrapper, statement, answer) => {
  await fillQuestion(wrapper, statement, answer)
  await addButton(wrapper).trigger('click')
  await flushPromises()
}

describe('CreateTestPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('champs étiquetés pour les lecteurs d’écran (RGAA 11.1)', () => {
    const { wrapper } = mountPage()
    expect(wrapper.find('input[aria-label="Énoncé de la question"]').exists()).toBe(true)
    expect(wrapper.find('textarea[aria-label="Réponse attendue"]').exists()).toBe(true)
    expect(wrapper.find('input[type="file"]').attributes('aria-label')).toBe('Choisir une image pour la question')
  })

  describe('ajout d’une question', () => {
    it('crée le test une seule fois puis la question et sa réponse', async () => {
      const { wrapper, tests, questions, responses } = mountPage()
      await addQuestion(wrapper, 'Quelle est la loi de Newton ?', 'F = ma')

      expect(tests.createTest).toHaveBeenCalledTimes(1)
      expect(tests.test).toMatchObject({ name: 'Mon nouveau test', subjectId: 1, id: 42 })
      expect(questions.createQuestion).toHaveBeenCalledTimes(1)
      expect(questions.question).toMatchObject({
        statement: 'Quelle est la loi de Newton ?',
        questionPosition: 1,
        type: 'text',
        idTest: 42,
      })
      expect(responses.createResponse).toHaveBeenCalledTimes(1)
      expect(responses.response).toMatchObject({ content: 'F = ma', correction: true, questionId: 101 })
    })

    it('la question apparaît dans le récapitulatif et les champs sont réinitialisés', async () => {
      const { wrapper } = mountPage()
      await addQuestion(wrapper, 'Question 1 ?', 'Réponse 1')
      expect(wrapper.text()).toContain('Question 1 ?')
      expect(wrapper.find('input[aria-label="Énoncé de la question"]').element.value).toBe('')
      expect(wrapper.find('textarea[aria-label="Réponse attendue"]').element.value).toBe('')
    })

    it('une seconde question ne recrée pas le test et incrémente la position', async () => {
      const { wrapper, tests, questions } = mountPage()
      await addQuestion(wrapper, 'Q1 ?', 'R1')
      await addQuestion(wrapper, 'Q2 ?', 'R2')
      expect(tests.createTest).toHaveBeenCalledTimes(1)
      expect(questions.createQuestion).toHaveBeenCalledTimes(2)
      expect(questions.question.questionPosition).toBe(2)
      expect(questions.question.idTest).toBe(42)
    })

    it('normalise la syntaxe des formules avant l’envoi', async () => {
      const { wrapper, questions, responses } = mountPage()
      await addQuestion(wrapper, 'Calculer frac(1, 2)', 'frac(a, b)')
      expect(questions.question.statement).toBe('Calculer over(1, 2)')
      expect(responses.response.content).toBe('over(a, b)')
    })

    it('échec de création du test - rien d’autre n’est créé', async () => {
      const { wrapper, tests, questions } = mountPage()
      tests.createTest.mockResolvedValueOnce(false)
      await addQuestion(wrapper, 'Q ?', 'R')
      expect(questions.createQuestion).not.toHaveBeenCalled()
      expect(wrapper.findAll('.border-gray').length).toBe(0)
    })

    it('après un échec de création du test, un nouvel essai recrée le test', async () => {
      const { wrapper, tests } = mountPage()
      tests.createTest.mockResolvedValueOnce(false)
      await addQuestion(wrapper, 'Q ?', 'R')
      await addButton(wrapper).trigger('click')
      await flushPromises()
      expect(tests.createTest).toHaveBeenCalledTimes(2)
    })

    it('échec de création de la question - pas de réponse créée, pas de récapitulatif', async () => {
      const { wrapper, questions, responses } = mountPage()
      questions.createQuestion.mockResolvedValueOnce(false)
      await addQuestion(wrapper, 'Q ?', 'R')
      expect(responses.createResponse).not.toHaveBeenCalled()
      expect(wrapper.text()).not.toContain('Q ?')
    })

    it('échec de création de la réponse - la question n’est pas ajoutée au récapitulatif', async () => {
      const { wrapper, responses } = mountPage()
      responses.createResponse.mockResolvedValueOnce(false)
      await addQuestion(wrapper, 'Q perdue ?', 'R')
      expect(wrapper.text()).not.toContain('Q perdue ?')
      expect(wrapper.find('input[aria-label="Énoncé de la question"]').element.value).toBe('Q perdue ?')
    })
  })

  describe('suppression', () => {
    it('supprime la question côté store et la retire du récapitulatif', async () => {
      const { wrapper, questions } = mountPage()
      await addQuestion(wrapper, 'À supprimer ?', 'R')
      await addQuestion(wrapper, 'À garder ?', 'R')
      const row = wrapper.findAll('.border-gray').find((r) => r.text().includes('À supprimer ?'))
      await row.find('button').trigger('click')
      await flushPromises()
      expect(questions.deleteQuestion).toHaveBeenCalledWith(101)
      expect(wrapper.text()).not.toContain('À supprimer ?')
      expect(wrapper.text()).toContain('À garder ?')
    })
  })

  describe('image de la question', () => {
    const file = new File(['x'], 'schema.png', { type: 'image/png' })
    const uploaded = { imageUrl: '/u/schema.png', imageKey: 'k', imageMimeType: 'image/png', imageOriginalName: 'schema.png', imageSize: 1 }

    async function upload(wrapper, questions, result = uploaded) {
      questions.uploadImage.mockResolvedValueOnce(result)
      const input = wrapper.find('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
      await input.trigger('change')
      await flushPromises()
    }

    it('téléverse le fichier et affiche l’aperçu avec un alt significatif', async () => {
      const { wrapper, questions } = mountPage()
      await upload(wrapper, questions)
      expect(questions.uploadImage).toHaveBeenCalledWith(file)
      const img = wrapper.find('img[src="/u/schema.png"]')
      expect(img.exists()).toBe(true)
      expect(img.attributes('alt')).toBe('schema.png')
    })

    it('échec du téléversement - pas d’aperçu', async () => {
      const { wrapper, questions } = mountPage()
      await upload(wrapper, questions, null)
      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('aucun fichier choisi - pas d’appel', async () => {
      const { wrapper, questions } = mountPage()
      Object.defineProperty(wrapper.find('input[type="file"]').element, 'files', { value: [], configurable: true })
      await wrapper.find('input[type="file"]').trigger('change')
      expect(questions.uploadImage).not.toHaveBeenCalled()
    })

    it('« Retirer l’image » sur un brouillon efface sans appel API', async () => {
      const { wrapper, questions } = mountPage()
      await upload(wrapper, questions)
      await wrapper.find("button[aria-label=\"Retirer l'image\"]").trigger('click')
      await flushPromises()
      expect(questions.removeImage).not.toHaveBeenCalled()
      expect(wrapper.find('img[src="/u/schema.png"]').exists()).toBe(false)
    })

    it('RGAA 12.x : retirer l’image est un vrai bouton nommé (l’icône seule est aria-hidden)', async () => {
      const { wrapper, questions } = mountPage()
      await upload(wrapper, questions)
      const button = wrapper.find("button[aria-label=\"Retirer l'image\"]")
      expect(button.attributes('type')).toBe('button')
      expect(button.find('svg').attributes('aria-hidden')).toBe('true')
    })

    it('RGAA 12.x : supprimer une question est un vrai bouton dont le nom cite la question', async () => {
      const { wrapper } = mountPage()
      await addQuestion(wrapper, 'Loi de Hooke ?', 'F = kx')
      const button = wrapper.find('button[aria-label^="Supprimer la question"]')
      expect(button.attributes('aria-label')).toBe('Supprimer la question Loi de Hooke ?')
      expect(button.attributes('type')).toBe('button')
    })

    it('le bouton d’insertion est désactivé pendant l’envoi', async () => {
      const { wrapper, questions } = mountPage()
      questions.uploading = true
      await flushPromises()
      const btn = wrapper.findAll('button').find((b) => b.text().includes('Envoi en cours'))
      expect(btn.attributes('disabled')).toBeDefined()
    })
  })
})
