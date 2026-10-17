import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import ExerciseQuestionEditor from '@/components/exercises/ExerciseQuestionEditor.vue'
import { defaultQuestion } from '@/helpers/exerciseQuestionEdit'

// L'objet question appartient au formulaire parent et est édité en place : on le monte donc réactif,
// comme le fait useExerciseForm.
function mountEditor(patch = {}, props = {}) {
  const question = reactive({ ...defaultQuestion(), ...patch })
  const wrapper = mount(ExerciseQuestionEditor, {
    props: { question, index: 0, ...props },
    global: { stubs: { FormulaHelper: { template: '<div><slot /></div>' }, FormulaHelperComponent: { template: '<div><slot /></div>' } } },
  })
  return { wrapper, question }
}

const statement = (w) => w.find('textarea[aria-label="Entrez l\'énoncé de la question"]')

describe('ExerciseQuestionEditor', () => {
  it('affiche le numéro de la question (1-based) et un id d’accessibilité stable', () => {
    const { wrapper } = mountEditor({}, { index: 2 })
    expect(wrapper.text()).toContain('Question 3')
    expect(wrapper.find('#exercise-question-2').exists()).toBe(true)
  })

  it('propose les 4 types de question', () => {
    const { wrapper } = mountEditor()
    const options = wrapper.findAll('select[aria-label="Type de question"] option').map((o) => o.attributes('value'))
    expect(options).toEqual(['open', 'mcq', 'fill_blank', 'reorder'])
  })

  describe('suppression', () => {
    it('le bouton « Supprimer » émet « remove »', async () => {
      const { wrapper } = mountEditor()
      await wrapper.findAll('button').find((b) => b.text() === 'Supprimer').trigger('click')
      expect(wrapper.emitted('remove')).toHaveLength(1)
    })

    it('absent quand la question n’est pas supprimable (seule question)', () => {
      const { wrapper } = mountEditor({}, { removable: false })
      expect(wrapper.findAll('button').some((b) => b.text() === 'Supprimer')).toBe(false)
    })
  })

  describe('édition en place de l’objet du formulaire', () => {
    it('l’énoncé saisi est écrit dans la question parente', async () => {
      const { wrapper, question } = mountEditor()
      await statement(wrapper).setValue('Quelle est la dérivée de x² ?')
      expect(question.statement).toBe('Quelle est la dérivée de x² ?')
    })

    it('changer de type remet à zéro les champs du type précédent mais garde l’énoncé', async () => {
      const { wrapper, question } = mountEditor({ statement: 'Q', openAnswer: 'réponse' })
      await wrapper.find('select[aria-label="Type de question"]').setValue('mcq')
      expect(question.type).toBe('mcq')
      expect(question.openAnswer).toBe('')
      expect(question.statement).toBe('Q')
    })
  })

  describe('question ouverte', () => {
    it('réponse attendue et formulations alternatives (ajout / suppression)', async () => {
      const { wrapper, question } = mountEditor()
      await wrapper.find('textarea[aria-label="Réponse correcte (utilisée pour la correction)"]').setValue('42')
      expect(question.openAnswer).toBe('42')

      await wrapper.findAll('button').find((b) => b.text().includes('Ajouter une formulation')).trigger('click')
      expect(question.openAltAnswers).toEqual([''])
      await wrapper.find('input[aria-label="Formulation acceptée 1"]').setValue('quarante-deux')
      expect(question.openAltAnswers).toEqual(['quarante-deux'])

      await wrapper.find('button[aria-label="Supprimer la formulation acceptée 1"]').trigger('click')
      expect(question.openAltAnswers).toEqual([])
    })
  })

  describe('QCM', () => {
    const mcq = () =>
      mountEditor({ type: 'mcq', mcqOptions: [{ text: 'A' }, { text: 'B' }, { text: 'C' }], mcqCorrectIdx: 1 })

    it('liste les options, la bonne réponse est cochée, groupe radio nommé (RGAA 11.6)', () => {
      const { wrapper } = mcq()
      const group = wrapper.find('[role="radiogroup"]')
      expect(group.attributes('aria-labelledby')).toBe('exercise-question-0 exercise-mcq-legend-0')
      const radios = wrapper.findAll('input[type="radio"]')
      expect(radios).toHaveLength(3)
      expect(radios.map((r) => r.element.checked)).toEqual([false, true, false])
    })

    it('choisir une autre bonne réponse met à jour l’indice', async () => {
      const { wrapper, question } = mcq()
      await wrapper.findAll('input[type="radio"]')[2].setValue(true)
      expect(question.mcqCorrectIdx).toBe(2)
    })

    it('modifier le texte d’une option', async () => {
      const { wrapper, question } = mcq()
      await wrapper.find('input[aria-label="Texte de l\'option 2"]').setValue('Bé')
      expect(question.mcqOptions.map((o) => o.text)).toEqual(['A', 'Bé', 'C'])
    })

    it('ajouter une option, puis en retirer une en gardant la bonne réponse alignée', async () => {
      const { wrapper, question } = mcq()
      await wrapper.findAll('button').find((b) => b.text().includes('Ajouter une option')).trigger('click')
      expect(question.mcqOptions).toHaveLength(4)
      // retrait de la 1re option : la bonne réponse (index 1) recule à 0
      await wrapper.find('[role="radiogroup"]').findAll('button').find((b) => b.text() === '✕').trigger('click')
      expect(question.mcqOptions.map((o) => o.text)).toEqual(['B', 'C', ''])
      expect(question.mcqCorrectIdx).toBe(0)
    })

    it('le bouton de retrait disparaît à 2 options (minimum d’un QCM)', () => {
      const { wrapper } = mountEditor({ type: 'mcq', mcqOptions: [{ text: 'A' }, { text: 'B' }] })
      expect(wrapper.find('[role="radiogroup"]').findAll('button')).toHaveLength(0)
    })
  })

  describe('texte à trous', () => {
    it('saisir le modèle crée les champs de réponse correspondant aux trous', async () => {
      const { wrapper, question } = mountEditor({ type: 'fill_blank' })
      expect(wrapper.text()).toContain('pour créer des trous')
      await wrapper.find('textarea[aria-label="Texte à trous avec emplacements"]').setValue('Un {{0}} et un {{1}}')
      expect(question.fillBlanks).toEqual(['', ''])
      expect(wrapper.find('input[aria-label="Réponse du trou 0"]').exists()).toBe(true)
      expect(wrapper.find('input[aria-label="Réponse du trou 1"]').exists()).toBe(true)
    })

    it('retirer un trou du modèle retire sa réponse', async () => {
      const { wrapper, question } = mountEditor({ type: 'fill_blank', fillTemplate: '{{0}} {{1}}', fillBlanks: ['a', 'b'] })
      await wrapper.find('textarea[aria-label="Texte à trous avec emplacements"]').setValue('{{0}}')
      expect(question.fillBlanks).toEqual(['a'])
    })
  })

  describe('phrase à reconstituer', () => {
    it('fragments : ajout, édition, retrait (minimum 2)', async () => {
      const { wrapper, question } = mountEditor({ type: 'reorder', reorderFragments: ['un', 'deux'] })
      expect(wrapper.findAll('button').some((b) => b.text() === '✕')).toBe(false) // 2 fragments : pas de retrait
      await wrapper.findAll('button').find((b) => b.text().includes('Ajouter un fragment')).trigger('click')
      expect(question.reorderFragments).toEqual(['un', 'deux', ''])
      await wrapper.find('input[aria-label="Fragment 3"]').setValue('trois')
      expect(question.reorderFragments).toEqual(['un', 'deux', 'trois'])
      await wrapper.findAll('button').find((b) => b.text() === '✕').trigger('click')
      expect(question.reorderFragments).toHaveLength(2)
    })
  })
})
