import { describe, it, expect } from 'vitest'
import {
  defaultQuestionFormFields,
  contentToFormState,
  buildQuestionContent,
  defaultQuestionImageFields,
  questionImageFieldsFrom,
  questionImagePayload,
} from '@/helpers/exerciseQuestionForm'

describe('exerciseQuestionForm', () => {
  describe('defaultQuestionFormFields', () => {
    it('retourne les 4 groupes de champs, tous vides/par défaut', () => {
      expect(defaultQuestionFormFields()).toEqual({
        openAnswer: '',
        openAltAnswers: [],
        mcqOptions: [{ text: '' }, { text: '' }],
        mcqCorrectIdx: 0,
        fillTemplate: '',
        fillBlanks: [],
        reorderFragments: ['', ''],
      })
    })

    it('retourne une nouvelle référence de tableaux à chaque appel (pas de partage d\'état)', () => {
      const a = defaultQuestionFormFields()
      const b = defaultQuestionFormFields()
      a.mcqOptions.push({ text: 'x' })
      expect(b.mcqOptions).toHaveLength(2)
    })
  })

  describe('contentToFormState', () => {
    it('open - reprend correct_answer et accepted_answers', () => {
      const state = contentToFormState({ type: 'open', content: { correct_answer: 'R', accepted_answers: ['A1', 'A2'] } })
      expect(state.openAnswer).toBe('R')
      expect(state.openAltAnswers).toEqual(['A1', 'A2'])
    })

    it('open - accepted_answers absent -> tableau vide', () => {
      const state = contentToFormState({ type: 'open', content: { correct_answer: 'R' } })
      expect(state.openAltAnswers).toEqual([])
    })

    it('mcq - retrouve l\'index de l\'option correcte', () => {
      const state = contentToFormState({
        type: 'mcq',
        content: { options: [{ text: 'Paris', correct: false }, { text: 'Madrid', correct: true }] },
      })
      expect(state.mcqOptions).toEqual([{ text: 'Paris' }, { text: 'Madrid' }])
      expect(state.mcqCorrectIdx).toBe(1)
    })

    it('mcq - aucune option correcte -> correctIdx par défaut 0', () => {
      const state = contentToFormState({ type: 'mcq', content: { options: [{ text: 'A', correct: false }, { text: 'B', correct: false }] } })
      expect(state.mcqCorrectIdx).toBe(0)
    })

    it('fill_blank - reprend template et blanks', () => {
      const state = contentToFormState({ type: 'fill_blank', content: { template: 'La {{0}} de la {{1}}.', blanks: ['clé', 'porte'] } })
      expect(state.fillTemplate).toBe('La {{0}} de la {{1}}.')
      expect(state.fillBlanks).toEqual(['clé', 'porte'])
    })

    it('reorder - reprend fragments', () => {
      const state = contentToFormState({ type: 'reorder', content: { fragments: ['un', 'deux', 'trois'] } })
      expect(state.reorderFragments).toEqual(['un', 'deux', 'trois'])
    })

    it('type inconnu -> valeurs par défaut', () => {
      expect(contentToFormState({ type: 'unknown', content: {} })).toEqual(defaultQuestionFormFields())
    })

    it('content absent -> valeurs par défaut adaptées au type', () => {
      const state = contentToFormState({ type: 'open' })
      expect(state.openAnswer).toBe('')
      expect(state.openAltAnswers).toEqual([])
    })
  })

  describe('buildQuestionContent', () => {
    it('open - sans formulations acceptées', () => {
      expect(buildQuestionContent({ type: 'open', openAnswer: 'R', openAltAnswers: [] })).toEqual({ correct_answer: 'R' })
    })

    it('open - avec formulations acceptées, en filtrant les entrées vides', () => {
      expect(buildQuestionContent({ type: 'open', openAnswer: 'R', openAltAnswers: [' A1 ', '', 'A2'] }))
        .toEqual({ correct_answer: 'R', accepted_answers: ['A1', 'A2'] })
    })

    it('mcq - marque la bonne option correcte via mcqCorrectIdx', () => {
      const content = buildQuestionContent({ type: 'mcq', mcqOptions: [{ text: 'A' }, { text: 'B' }], mcqCorrectIdx: 1 })
      expect(content).toEqual({ options: [{ text: 'A', correct: false }, { text: 'B', correct: true }] })
    })

    it('fill_blank - reconstruit template/blanks', () => {
      expect(buildQuestionContent({ type: 'fill_blank', fillTemplate: 'T {{0}}', fillBlanks: ['x'] }))
        .toEqual({ template: 'T {{0}}', blanks: ['x'] })
    })

    it('reorder - reconstruit fragments + solution (ordre identité)', () => {
      expect(buildQuestionContent({ type: 'reorder', reorderFragments: ['a', 'b', 'c'] }))
        .toEqual({ fragments: ['a', 'b', 'c'], solution: [0, 1, 2] })
    })

    it('type inconnu -> null', () => {
      expect(buildQuestionContent({ type: 'unknown' })).toBeNull()
    })

    it('round-trip : contentToFormState puis buildQuestionContent restitue le content d\'origine (mcq)', () => {
      const original = { options: [{ text: 'Paris', correct: true }, { text: 'Madrid', correct: false }, { text: 'Berlin', correct: false }] }
      const state = contentToFormState({ type: 'mcq', content: original })
      expect(buildQuestionContent({ type: 'mcq', ...state })).toEqual(original)
    })
  })

  // Ticket C (2026-09-12, « images sur les questions ») : champs image, colonnes dédiées sur `Question`
  // (Ticket A), PAS une partie de `content` — jusqu'ici jamais lus par l'Écran de révision IA ni
  // reportés jusqu'à la persistance (voir AiExerciseReviewModalComponent.vue/ExercisesPage.vue).
  describe('defaultQuestionImageFields', () => {
    it('retourne les 6 champs image à null (aucune image)', () => {
      expect(defaultQuestionImageFields()).toEqual({
        imageUrl: null,
        imageKey: null,
        imageMimeType: null,
        imageOriginalName: null,
        imageSize: null,
        imageSource: null,
      })
    })
  })

  describe('questionImageFieldsFrom', () => {
    it('copie les champs image présents sur la source (question générée par IA)', () => {
      const q = {
        statement: 'Q', type: 'open',
        imageUrl: 'https://s3/x.png', imageKey: 'uploads/1/x.png', imageMimeType: 'image/png',
        imageOriginalName: 'schema-genere-ia-1.png', imageSize: 1234, imageSource: 'ai',
      }
      expect(questionImageFieldsFrom(q)).toEqual({
        imageUrl: 'https://s3/x.png',
        imageKey: 'uploads/1/x.png',
        imageMimeType: 'image/png',
        imageOriginalName: 'schema-genere-ia-1.png',
        imageSize: 1234,
        imageSource: 'ai',
      })
    })

    it('aucun champ image sur la source -> valeurs par défaut (à null)', () => {
      expect(questionImageFieldsFrom({ statement: 'Q', type: 'open' })).toEqual(defaultQuestionImageFields())
    })
  })

  describe('questionImagePayload', () => {
    it('aucune image (imageUrl absent/null) -> objet vide, ne doit jamais écraser une image existante côté serveur', () => {
      expect(questionImagePayload({})).toEqual({})
      expect(questionImagePayload({ imageUrl: null })).toEqual({})
    })

    it('image IA -> transmet les 5 champs + imageSource:"ai"', () => {
      const q = {
        imageUrl: 'https://s3/x.png', imageKey: 'uploads/1/x.png', imageMimeType: 'image/png',
        imageOriginalName: 'schema-genere-ia-1.png', imageSize: 1234, imageSource: 'ai',
      }
      expect(questionImagePayload(q)).toEqual({
        imageUrl: 'https://s3/x.png',
        imageKey: 'uploads/1/x.png',
        imageMimeType: 'image/png',
        imageOriginalName: 'schema-genere-ia-1.png',
        imageSize: 1234,
        imageSource: 'ai',
      })
    })

    it('imageSource autre que "ai" -> jamais transmis (Question.validators.js ne l\'accepte pas du client)', () => {
      const q = { imageUrl: 'https://s3/x.png', imageKey: 'k', imageMimeType: 'image/png', imageOriginalName: 'x.png', imageSize: 1, imageSource: 'manual' }
      expect(questionImagePayload(q).imageSource).toBeUndefined()
    })
  })
})
