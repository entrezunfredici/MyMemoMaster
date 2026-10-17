import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exercisesApi } from '@/helpers/exercisesApi'

const { mockGet, mockPost, mockPut, mockDel } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDel: vi.fn(),
}))
vi.mock('@/helpers/api', () => ({ api: { get: mockGet, post: mockPost, put: mockPut, del: mockDel } }))

describe('exercisesApi — routes et arguments', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['getTest', [4], 'get', ['tests/4']],
    ['createTest', [{ name: 'T', subjectId: 1 }], 'post', ['tests', { name: 'T', subjectId: 1 }]],
    ['updateTest', [4, { name: 'T2' }], 'put', ['tests/4', { name: 'T2' }]],
    ['createQuestion', [{ statement: 'Q' }], 'post', ['questions', { statement: 'Q' }]],
    ['updateQuestion', [9, { statement: 'Q2' }], 'put', ['questions/edit/9', { statement: 'Q2' }]],
    ['deleteQuestion', [9], 'del', ['questions/9']],
    ['validateImport', [[{ statement: 'Q' }]], 'post', ['ai-exercise-generations/validate-import', { questions: [{ statement: 'Q' }] }]],
  ])('%s appelle api.%s avec la bonne route', async (name, args, verb, expected) => {
    const mocks = { get: mockGet, post: mockPost, put: mockPut, del: mockDel }
    mocks[verb].mockResolvedValueOnce({ status: 200, data: 'x' })
    const result = await exercisesApi[name](...args)
    expect(mocks[verb]).toHaveBeenCalledWith(...expected)
    expect(result).toEqual({ status: 200, data: 'x' })
  })

  it('renvoie la réponse brute, y compris undefined (suppression réussie : 204 sans contenu)', async () => {
    mockDel.mockResolvedValueOnce(undefined)
    expect(await exercisesApi.deleteQuestion(1)).toBeUndefined()
  })

  it('ne masque pas une erreur HTTP : le statut et le message restent lisibles par la page', async () => {
    mockPost.mockResolvedValueOnce({ status: 400, data: { message: 'Nom requis.' } })
    const resp = await exercisesApi.createTest({})
    expect(resp.status).toBe(400)
    expect(resp.data.message).toBe('Nom requis.')
  })
})
