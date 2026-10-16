const dayjs = require('dayjs')

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('../../helpers/logger', () => ({ error: jest.fn(), warn: jest.fn() }))

const mockRevisionSession = { findAll: jest.fn() }
const mockLeitnerSystem = { findAll: jest.fn() }
const mockLeitnerBox = { findAll: jest.fn() }
const mockLeitnerCard = { findAll: jest.fn(), count: jest.fn() }

jest.mock('../../models', () => ({
  RevisionSession: mockRevisionSession,
  LeitnerSystem: mockLeitnerSystem,
  LeitnerBox: mockLeitnerBox,
  LeitnerCard: mockLeitnerCard
}))

const mockDeadlineService = { findAll: jest.fn() }
jest.mock('../../services/Deadline.service', () => mockDeadlineService)

const planningService = require('../../services/Planning.service')

const TODAY = dayjs().format('YYYY-MM-DD')
const TOMORROW = dayjs().add(1, 'day').format('YYYY-MM-DD')

// Helper : simule un utilisateur sans systèmes Leitner
function noLeitner() {
  mockLeitnerSystem.findAll.mockResolvedValue([])
  mockLeitnerBox.findAll.mockResolvedValue([])
}

beforeEach(() => jest.clearAllMocks())

// ── getLoad ───────────────────────────────────────────────────────────────────
describe('getLoad', () => {
  test('getLoad - aucune donnée - retourne des jours à zéro', async () => {
    mockRevisionSession.findAll.mockResolvedValue([])
    noLeitner()
    mockDeadlineService.findAll.mockResolvedValue([])

    const result = await planningService.getLoad(1, 3)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ date: TODAY, cardsDue: 0, sessions: 0, deadlines: 0, loadScore: 0 })
  })

  test('getLoad - sessions présentes - comptées par jour', async () => {
    mockRevisionSession.findAll.mockResolvedValue([
      { date: TODAY },
      { date: TODAY },
      { date: TOMORROW }
    ])
    noLeitner()
    mockDeadlineService.findAll.mockResolvedValue([])

    const result = await planningService.getLoad(1, 2)

    expect(result[0].sessions).toBe(2)
    expect(result[1].sessions).toBe(1)
    expect(result[0].loadScore).toBe(6) // 2 sessions × 3
  })

  test('getLoad - deadline dans la plage - comptée', async () => {
    mockRevisionSession.findAll.mockResolvedValue([])
    noLeitner()
    mockDeadlineService.findAll.mockResolvedValue([{ dueDate: TOMORROW, name: 'Rendu' }])

    const result = await planningService.getLoad(1, 2)

    expect(result[1].deadlines).toBe(1)
    expect(result[1].loadScore).toBe(5) // 1 deadline × 5
  })

  test('getLoad - cartes Leitner dues - comptées', async () => {
    mockRevisionSession.findAll.mockResolvedValue([])
    mockLeitnerSystem.findAll.mockResolvedValue([{ idSystem: 1 }])
    mockLeitnerBox.findAll.mockResolvedValue([{ idBox: 10, idSystem: 1 }])
    mockLeitnerCard.findAll.mockResolvedValue([
      { next_review_at: dayjs().toDate() }
    ])
    mockLeitnerCard.count.mockResolvedValue(3) // 3 cartes en retard
    mockDeadlineService.findAll.mockResolvedValue([])

    const result = await planningService.getLoad(1, 1)

    // 3 overdue + 1 due aujourd'hui = 4
    expect(result[0].cardsDue).toBe(4)
    expect(result[0].loadScore).toBe(4)
  })

  test('getLoad - erreur DeadlineService - non bloquante', async () => {
    mockRevisionSession.findAll.mockResolvedValue([])
    noLeitner()
    mockDeadlineService.findAll.mockRejectedValue(new Error('DB error'))

    const result = await planningService.getLoad(1, 1)

    expect(result).toHaveLength(1)
    expect(result[0].deadlines).toBe(0)
  })
})

// ── getPriorities ─────────────────────────────────────────────────────────────
describe('getPriorities', () => {
  test('getPriorities - aucune donnée - retourne des catégories vides', async () => {
    mockDeadlineService.findAll.mockResolvedValue([])
    mockRevisionSession.findAll.mockResolvedValue([])
    noLeitner()

    const result = await planningService.getPriorities(1)

    expect(result.overdue).toEqual([])
    expect(result.today).toEqual([])
    expect(result.upcoming).toEqual([])
  })

  test('getPriorities - deadline en retard - dans overdue avec daysOverdue', async () => {
    const overdueDate = dayjs().subtract(3, 'day').format('YYYY-MM-DD')
    mockDeadlineService.findAll.mockResolvedValue([{ id: 1, name: 'Rendu', dueDate: overdueDate, dueTime: null }])
    mockRevisionSession.findAll.mockResolvedValue([])
    noLeitner()

    const result = await planningService.getPriorities(1)

    expect(result.overdue).toHaveLength(1)
    expect(result.overdue[0].daysOverdue).toBe(3)
    expect(result.overdue[0].type).toBe('deadline')
  })

  test('getPriorities - deadline aujourd\'hui - dans today', async () => {
    mockDeadlineService.findAll.mockResolvedValue([{ id: 2, name: 'DS', dueDate: TODAY, dueTime: '10:00' }])
    mockRevisionSession.findAll.mockResolvedValue([])
    noLeitner()

    const result = await planningService.getPriorities(1)

    expect(result.today.find((i) => i.type === 'deadline')).toBeDefined()
    expect(result.today[0].name).toBe('DS')
  })

  test('getPriorities - session aujourd\'hui - dans today', async () => {
    mockDeadlineService.findAll.mockResolvedValue([])
    mockRevisionSession.findAll
      .mockResolvedValueOnce([{ id: 1, name: 'Maths', startTime: '09:00', endTime: '11:00' }]) // today
      .mockResolvedValueOnce([]) // upcoming
    noLeitner()

    const result = await planningService.getPriorities(1)

    expect(result.today.find((i) => i.type === 'revision_session')).toBeDefined()
  })

  test('getPriorities - session à venir - dans upcoming avec daysUntil', async () => {
    mockDeadlineService.findAll.mockResolvedValue([])
    mockRevisionSession.findAll
      .mockResolvedValueOnce([]) // today
      .mockResolvedValueOnce([{ id: 2, name: 'Physique', date: TOMORROW, startTime: '14:00' }]) // upcoming
    noLeitner()

    const result = await planningService.getPriorities(1)

    expect(result.upcoming.find((i) => i.type === 'revision_session')).toBeDefined()
    expect(result.upcoming[0].daysUntil).toBe(1)
  })

  test('getPriorities - cartes Leitner dues - dans today avec type leitner', async () => {
    mockDeadlineService.findAll.mockResolvedValue([])
    mockRevisionSession.findAll.mockResolvedValue([])
    mockLeitnerSystem.findAll.mockResolvedValue([{ idSystem: 1, name: 'Histoire' }])
    mockLeitnerBox.findAll.mockResolvedValue([{ idBox: 10, idSystem: 1 }])
    mockLeitnerCard.count.mockResolvedValue(5)

    const result = await planningService.getPriorities(1)

    const leitnerItem = result.today.find((i) => i.type === 'leitner')
    expect(leitnerItem).toBeDefined()
    expect(leitnerItem.cardsDue).toBe(5)
    expect(leitnerItem.name).toBe('Histoire')
  })

  test('getPriorities - today trié deadlines > sessions > leitner', async () => {
    mockDeadlineService.findAll.mockResolvedValue([{ id: 1, name: 'Rendu', dueDate: TODAY, dueTime: null }])
    mockRevisionSession.findAll
      .mockResolvedValueOnce([{ id: 2, name: 'Révision', startTime: '10:00', endTime: '12:00' }])
      .mockResolvedValueOnce([])
    mockLeitnerSystem.findAll.mockResolvedValue([{ idSystem: 1, name: 'Bio' }])
    mockLeitnerBox.findAll.mockResolvedValue([{ idBox: 5, idSystem: 1 }])
    mockLeitnerCard.count.mockResolvedValue(3)

    const result = await planningService.getPriorities(1)

    expect(result.today[0].type).toBe('deadline')
    expect(result.today[1].type).toBe('revision_session')
    expect(result.today[2].type).toBe('leitner')
  })

  test('getPriorities - erreur DeadlineService - non bloquante', async () => {
    mockDeadlineService.findAll.mockRejectedValue(new Error('DB error'))
    mockRevisionSession.findAll.mockResolvedValue([])
    noLeitner()

    const result = await planningService.getPriorities(1)

    expect(result.overdue).toEqual([])
    expect(result.today).toEqual([])
  })
})
