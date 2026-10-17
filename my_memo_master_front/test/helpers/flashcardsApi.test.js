import { describe, it, expect, vi, beforeEach } from 'vitest'

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } }))
vi.mock('@/helpers/api', () => ({ api }))

import { flashcardsApi } from '@/helpers/flashcards/flashcardsApi'

describe('flashcardsApi — routes de la gestion des cartes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lecture : système, carte mentale, boîtes, cartes d’une boîte, réponse de référence, aperçu de qualité', () => {
    flashcardsApi.getSystem(5)
    expect(api.get).toHaveBeenLastCalledWith('leitnersystems/5')
    flashcardsApi.getMindMap(9)
    expect(api.get).toHaveBeenLastCalledWith('diagrammes/9')
    flashcardsApi.listBoxes()
    expect(api.get).toHaveBeenLastCalledWith('leitnerboxes')
    flashcardsApi.listBoxCards(10)
    expect(api.get).toHaveBeenLastCalledWith('leitnercards/leitnerboxes/10')
    flashcardsApi.getCorrection(101)
    expect(api.get).toHaveBeenLastCalledWith('responses/correction/101')
    flashcardsApi.previewQuality({ statement: 'Q' })
    expect(api.post).toHaveBeenLastCalledWith('responses/quality-preview', { statement: 'Q' })
  })

  it('questions, réponses et cartes : création, mise à jour, suppression', () => {
    flashcardsApi.createQuestion({ a: 1 })
    expect(api.post).toHaveBeenLastCalledWith('questions', { a: 1 })
    flashcardsApi.updateQuestion(101, { a: 2 })
    expect(api.put).toHaveBeenLastCalledWith('questions/edit/101', { a: 2 })
    flashcardsApi.createResponse({ b: 1 })
    expect(api.post).toHaveBeenLastCalledWith('responses', { b: 1 })
    flashcardsApi.updateResponse(201, { b: 2 })
    expect(api.put).toHaveBeenLastCalledWith('responses/edit/201', { b: 2 })
    flashcardsApi.createCard({ c: 1 })
    expect(api.post).toHaveBeenLastCalledWith('leitnercards', { c: 1 })
    flashcardsApi.updateCard(1, { c: 2 })
    expect(api.put).toHaveBeenLastCalledWith('leitnercards/1', { c: 2 })
    flashcardsApi.deleteCard(1)
    expect(api.del).toHaveBeenLastCalledWith('leitnercards/1')
  })

  it('boîtes : création, mise à jour, suppression', () => {
    flashcardsApi.createBox({ level: 1 })
    expect(api.post).toHaveBeenLastCalledWith('leitnerboxes', { level: 1 })
    flashcardsApi.updateBox(10, { level: 2 })
    expect(api.put).toHaveBeenLastCalledWith('leitnerboxes/10', { level: 2 })
    flashcardsApi.deleteBox(10)
    expect(api.del).toHaveBeenLastCalledWith('leitnerboxes/10')
  })
})
