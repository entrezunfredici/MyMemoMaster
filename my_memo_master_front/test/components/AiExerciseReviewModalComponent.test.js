import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiExerciseReviewModal from '@/components/AiExerciseReviewModalComponent.vue'

const QUESTIONS = [
  {
    statement: 'Qu\'est-ce que la photosynthèse ?',
    type: 'open',
    content: { correct_answer: 'La conversion de lumière en énergie chimique.' },
    sourceExcerpt: 'La photosynthèse est le processus...',
  },
  {
    statement: 'Capitale de la France ?',
    type: 'mcq',
    content: { options: [{ text: 'Paris', correct: true }, { text: 'Madrid', correct: false }, { text: 'Berlin', correct: false }] },
    sourceExcerpt: 'Paris est la capitale de la France.',
  },
]

function mountModal(props = {}) {
  return mount(AiExerciseReviewModal, {
    props: { visible: true, questions: QUESTIONS, warnings: [], ...props },
  })
}

describe('AiExerciseReviewModalComponent', () => {
  it('affiche une carte par question générée, toutes incluses par défaut', () => {
    const wrapper = mountModal()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(2)
    checkboxes.forEach((cb) => expect(cb.element.checked).toBe(true))
    expect(wrapper.text()).toContain('2 incluse')
  })

  it('affiche le bandeau warning si fourni', () => {
    const wrapper = mountModal({ warnings: ['Une seule notion trouvée.'] })
    expect(wrapper.text()).toContain('Une seule notion trouvée.')
  })

  it('affiche plusieurs warnings (un par passage, pipeline multi-chunks)', () => {
    const wrapper = mountModal({ warnings: ['Passage 1/2 : Contenu limité.', 'Passage 2/2 : non conforme.'] })
    expect(wrapper.text()).toContain('Passage 1/2 : Contenu limité.')
    expect(wrapper.text()).toContain('Passage 2/2 : non conforme.')
  })

  it('écran vide - aucune question générée', () => {
    const wrapper = mountModal({ questions: [] })
    expect(wrapper.text()).toContain('Aucune question n\'a été générée.')
  })

  it('rejeter une question la décoche et diminue le compteur inclus, sans la retirer de la liste', async () => {
    const wrapper = mountModal()
    await wrapper.find('button[title="Rejeter"]').trigger('click')

    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('1 incluse')
    expect(wrapper.text()).toContain('1 rejetée')
  })

  it('"Tout accepter" réinclut les questions rejetées', async () => {
    const wrapper = mountModal()
    await wrapper.find('button[title="Rejeter"]').trigger('click')
    expect(wrapper.text()).toContain('1 rejetée')

    const acceptAllBtn = wrapper.findAll('button').find((b) => b.text() === 'Tout accepter')
    await acceptAllBtn.trigger('click')

    expect(wrapper.text()).toContain('2 incluse')
    expect(wrapper.text()).toContain('0 rejetée')
  })

  it('décocher la case d\'une question la rejette', async () => {
    const wrapper = mountModal()
    const firstCheckbox = wrapper.find('input[type="checkbox"]')
    await firstCheckbox.setValue(false)
    expect(wrapper.text()).toContain('1 rejetée')
  })

  it('le bouton d\'ajout est désactivé quand tout est rejeté', async () => {
    const wrapper = mountModal()
    const rejectButtons = wrapper.findAll('button[title="Rejeter"]')
    for (const btn of rejectButtons) await btn.trigger('click')

    expect(wrapper.find('.btn-modal-submit').attributes('disabled')).toBeDefined()
  })

  it('"✎ Modifier" bascule en édition et permet de changer l\'énoncé', async () => {
    const wrapper = mountModal()
    const editButtons = wrapper.findAll('button[title="Modifier"]')
    await editButtons[0].trigger('click')

    const textarea = wrapper.find('textarea')
    await textarea.setValue('Nouvel énoncé édité')

    const finishBtn = wrapper.findAll('button').find((b) => b.text().includes('Terminer l\'édition'))
    await finishBtn.trigger('click')

    expect(wrapper.text()).toContain('Nouvel énoncé édité')
    expect(wrapper.text()).toContain('✎ modifiée')
    expect(wrapper.text()).toContain('1 modifiée')
  })

  it('émet "confirm" avec les questions incluses au format form.questions (statement/type/... )', async () => {
    const wrapper = mountModal()
    await wrapper.find('button[title="Rejeter"]').trigger('click') // rejette la question "open"

    await wrapper.find('.btn-modal-submit').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    const [accepted] = wrapper.emitted('confirm')[0]
    expect(accepted).toHaveLength(1)
    expect(accepted[0]).toMatchObject({
      statement: 'Capitale de la France ?',
      type: 'mcq',
      mcqCorrectIdx: 0,
      mcqOptions: [{ text: 'Paris' }, { text: 'Madrid' }, { text: 'Berlin' }],
    })
  })

  it('émet "close" au clic sur "Annuler"', async () => {
    const wrapper = mountModal()
    await wrapper.find('.btn-modal-cancel').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  // Ticket C (2026-09-12, « images sur les questions ») : une question générée peut porter un schéma
  // rattaché par l'IA (Ticket B) — jusqu'ici jamais affiché ni reporté par cet écran.
  describe('image rattachée par l\'IA (Ticket C)', () => {
    const QUESTION_WITH_IMAGE = {
      statement: 'Que représente ce schéma ?',
      type: 'open',
      content: { correct_answer: 'Le cycle de l\'eau.' },
      sourceExcerpt: 'Le schéma n°1 illustre...',
      imageUrl: 'https://s3.example.com/uploads/1/schema.png',
      imageKey: 'uploads/1/schema.png',
      imageMimeType: 'image/png',
      imageOriginalName: 'schema-genere-ia-1.png',
      imageSize: 4321,
      imageSource: 'ai',
    }

    it('affiche la miniature et le badge "Image IA" quand la question générée en porte une', () => {
      const wrapper = mountModal({ questions: [QUESTION_WITH_IMAGE] })
      const img = wrapper.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toBe('https://s3.example.com/uploads/1/schema.png')
      expect(wrapper.text()).toContain('Image IA')
    })

    it('n\'affiche ni miniature ni badge quand la question générée n\'a pas d\'image', () => {
      const wrapper = mountModal()
      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Image IA')
    })

    it('"Retirer l\'image" efface l\'image de la question sans la rejeter', async () => {
      const wrapper = mountModal({ questions: [QUESTION_WITH_IMAGE] })
      expect(wrapper.find('img').exists()).toBe(true)

      const removeBtn = wrapper.findAll('button').find((b) => b.text() === 'Retirer l\'image')
      await removeBtn.trigger('click')

      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.text()).toContain('1 incluse') // toujours incluse, seule l'image a été retirée
      expect(wrapper.text()).not.toContain('1 rejetée')
    })

    it('émet "confirm" avec les champs image de la question générée', async () => {
      const wrapper = mountModal({ questions: [QUESTION_WITH_IMAGE] })
      await wrapper.find('.btn-modal-submit').trigger('click')

      const [accepted] = wrapper.emitted('confirm')[0]
      expect(accepted[0]).toMatchObject({
        imageUrl: 'https://s3.example.com/uploads/1/schema.png',
        imageKey: 'uploads/1/schema.png',
        imageMimeType: 'image/png',
        imageOriginalName: 'schema-genere-ia-1.png',
        imageSize: 4321,
        imageSource: 'ai',
      })
    })

    it('émet "confirm" avec des champs image à null pour une question sans image', async () => {
      const wrapper = mountModal() // QUESTIONS par défaut, sans image
      await wrapper.find('.btn-modal-submit').trigger('click')

      const [accepted] = wrapper.emitted('confirm')[0]
      expect(accepted[0].imageUrl).toBeNull()
      expect(accepted[0].imageSource).toBeNull()
    })
  })

  it('accordéon "Source" affiche le sourceExcerpt au clic', async () => {
    const wrapper = mountModal()
    expect(wrapper.text()).not.toContain('La photosynthèse est le processus...')

    const sourceBtn = wrapper.findAll('button').find((b) => b.text().includes('Source'))
    await sourceBtn.trigger('click')

    expect(wrapper.text()).toContain('La photosynthèse est le processus...')
  })

  it('réinitialise l\'état à chaque réouverture (visible false -> true) à partir de nouvelles questions', async () => {
    const wrapper = mountModal({ visible: false })
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0)

    await wrapper.setProps({ visible: true })
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(2)
  })
})
