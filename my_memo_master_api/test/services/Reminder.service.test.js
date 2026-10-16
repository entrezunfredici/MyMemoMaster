const dayjs = require('dayjs')

// Mocks avant require du service
jest.mock('../../models/index', () => ({
  Reminder: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  Deadline: { findOne: jest.fn(), findByPk: jest.fn() },
  RevisionSession: { findOne: jest.fn() },
  EventOccurrence: {},
  CalendarEvent: {},
  ClassGroupUsers: { findOne: jest.fn() }
}))

jest.mock('../../jobs/reminder.queue', () => ({
  getReminderQueue: jest.fn(() => ({
    add: jest.fn(),
    getJob: jest.fn()
  }))
}))

const { Reminder, Deadline, RevisionSession, ClassGroupUsers } = require('../../models/index')
const { getReminderQueue } = require('../../jobs/reminder.queue')
const reminderService = require('../../services/Reminder.service')

const FUTURE_DATE = dayjs().add(7, 'day').format('YYYY-MM-DD')
const PAST_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD')

const makeDeadline = (overrides = {}) => ({
  id: 5,
  dueDate: FUTURE_DATE,
  dueTime: '14:00:00',
  createdBy: 1,
  occurrence: {
    calendarEvent: { classGroupId: 42 }
  },
  ...overrides
})

const makeRevSession = (overrides = {}) => ({
  id: 10,
  date: FUTURE_DATE,
  startTime: '09:00:00',
  userId: 1,
  ...overrides
})

const makeReminder = (overrides = {}) => ({
  id: 1,
  userId: 1,
  entityType: 'deadline',
  entityId: 5,
  delayMinutes: 60,
  reminderAt: dayjs(`${FUTURE_DATE} 13:00:00`).toDate(),
  status: 'pending',
  jobId: 'reminder-1',
  update: jest.fn().mockResolvedValue(true),
  destroy: jest.fn().mockResolvedValue(true),
  ...overrides
})

describe('ReminderService.findAll', () => {
  test("findAll - retourne les rappels de l'utilisateur", async () => {
    Reminder.findAll.mockResolvedValue([makeReminder()])
    const result = await reminderService.findAll(1)
    expect(Reminder.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 1 } }))
    expect(result).toHaveLength(1)
  })
})

describe('ReminderService.findOne', () => {
  test('findOne - trouvé - retourne le rappel', async () => {
    Reminder.findOne.mockResolvedValue(makeReminder())
    const result = await reminderService.findOne(1, 1)
    expect(result.id).toBe(1)
  })

  test('findOne - introuvable - retourne null', async () => {
    Reminder.findOne.mockResolvedValue(null)
    const result = await reminderService.findOne(99, 1)
    expect(result).toBeNull()
  })
})

describe('ReminderService.create', () => {
  beforeEach(() => {
    const mockQueue = { add: jest.fn().mockResolvedValue({ id: 'reminder-1' }), getJob: jest.fn() }
    getReminderQueue.mockReturnValue(mockQueue)
  })

  test('create - deadline valide - crée le rappel et planifie le job', async () => {
    Deadline.findByPk.mockResolvedValue(makeDeadline())
    ClassGroupUsers.findOne.mockResolvedValue({ classGroupId: 42, userId: 1 })
    const mockReminder = makeReminder()
    Reminder.create.mockResolvedValue(mockReminder)

    const result = await reminderService.create(1, {
      entityType: 'deadline',
      entityId: 5,
      delayMinutes: 60
    })

    expect(Reminder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        entityType: 'deadline',
        entityId: 5,
        delayMinutes: 60,
        status: 'pending'
      })
    )
    expect(getReminderQueue).toHaveBeenCalled()
    expect(result).toBeDefined()
  })

  test('create - revision_session valide - crée le rappel', async () => {
    RevisionSession.findOne.mockResolvedValue(makeRevSession())
    const mockReminder = makeReminder({ entityType: 'revision_session', entityId: 10 })
    Reminder.create.mockResolvedValue(mockReminder)

    await reminderService.create(1, {
      entityType: 'revision_session',
      entityId: 10,
      delayMinutes: 30
    })

    expect(Reminder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'revision_session',
        entityId: 10
      })
    )
  })

  test('create - entité introuvable - lève une erreur 404', async () => {
    Deadline.findByPk.mockResolvedValue(null)
    await expect(
      reminderService.create(1, { entityType: 'deadline', entityId: 999, delayMinutes: 60 })
    ).rejects.toMatchObject({ status: 404 })
  })

  test('create - date de rappel passée - lève une erreur 400', async () => {
    Deadline.findByPk.mockResolvedValue(makeDeadline({ dueDate: PAST_DATE, dueTime: '08:00:00' }))
    ClassGroupUsers.findOne.mockResolvedValue({ classGroupId: 42, userId: 1 })
    await expect(
      reminderService.create(1, { entityType: 'deadline', entityId: 5, delayMinutes: 60 })
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe('ReminderService.update', () => {
  beforeEach(() => {
    const mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'reminder-2' }),
      getJob: jest.fn().mockResolvedValue({ remove: jest.fn() })
    }
    getReminderQueue.mockReturnValue(mockQueue)
  })

  test('update - délai modifié - replanifie le job', async () => {
    const mockReminder = makeReminder()
    Reminder.findOne.mockResolvedValue(mockReminder)
    Deadline.findByPk.mockResolvedValue(makeDeadline())
    ClassGroupUsers.findOne.mockResolvedValue({ classGroupId: 42, userId: 1 })

    const result = await reminderService.update(1, 1, { delayMinutes: 30 })

    expect(mockReminder.update).toHaveBeenCalledWith(expect.objectContaining({ delayMinutes: 30 }))
    expect(result).toBeTruthy()
  })

  test('update - introuvable - retourne null', async () => {
    Reminder.findOne.mockResolvedValue(null)
    const result = await reminderService.update(99, 1, { delayMinutes: 30 })
    expect(result).toBeNull()
  })

  test('update - rappel déjà envoyé - lève une erreur 400', async () => {
    Reminder.findOne.mockResolvedValue(makeReminder({ status: 'sent' }))
    await expect(reminderService.update(1, 1, { delayMinutes: 30 })).rejects.toMatchObject({
      status: 400
    })
  })
})

describe('ReminderService.delete', () => {
  test('delete - trouvé - annule le job et supprime', async () => {
    const mockJob = { remove: jest.fn() }
    getReminderQueue.mockReturnValue({
      getJob: jest.fn().mockResolvedValue(mockJob)
    })
    const mockReminder = makeReminder()
    Reminder.findOne.mockResolvedValue(mockReminder)

    const result = await reminderService.delete(1, 1)

    expect(mockReminder.update).toHaveBeenCalledWith({ status: 'cancelled' })
    expect(mockReminder.destroy).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  test('delete - introuvable - retourne false', async () => {
    Reminder.findOne.mockResolvedValue(null)
    const result = await reminderService.delete(99, 1)
    expect(result).toBe(false)
  })
})
