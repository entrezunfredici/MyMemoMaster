// Cron des rappels de série : planification (passage horaire) et robustesse du traitement planifié.
// node-cron est simulé : on vérifie l'expression, que le traitement appelle bien le service et qu'une
// erreur du service ne fait pas tomber le processus.

const mockSchedule = jest.fn()
jest.mock('node-cron', () => ({ schedule: (...args) => mockSchedule(...args), validate: jest.requireActual('node-cron').validate }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))
const mockRunDailyReminders = jest.fn()
jest.mock('../../services/StreakReminder.service', () => ({ runDailyReminders: (...args) => mockRunDailyReminders(...args) }))

const cron = require('node-cron')
const logger = require('../../helpers/logger')
const { startStreakReminderCron, stopStreakReminderCron, SCHEDULE } = require('../../jobs/streakReminder.cron')

describe('streakReminder.cron', () => {
  let task

  beforeEach(() => {
    jest.clearAllMocks()
    task = { stop: jest.fn() }
    mockSchedule.mockReturnValue(task)
    stopStreakReminderCron()
  })

  it('SCHEDULE - expression cron valide, passage toutes les heures à la minute 30', () => {
    expect(cron.validate(SCHEDULE)).toBe(true)
    expect(SCHEDULE).toBe('30 * * * *')
  })

  it('start - planifie une seule tâche même si appelé deux fois (idempotent)', () => {
    startStreakReminderCron()
    startStreakReminderCron()

    expect(mockSchedule).toHaveBeenCalledTimes(1)
    expect(mockSchedule).toHaveBeenCalledWith(SCHEDULE, expect.any(Function))
  })

  it('tâche planifiée - appelle runDailyReminders', async () => {
    startStreakReminderCron()
    const callback = mockSchedule.mock.calls[0][1]
    mockRunDailyReminders.mockResolvedValue({ created: 1, skipped: 0 })

    await callback()

    expect(mockRunDailyReminders).toHaveBeenCalledTimes(1)
  })

  it('tâche planifiée - erreur du service - journalisée, jamais propagée', async () => {
    startStreakReminderCron()
    const callback = mockSchedule.mock.calls[0][1]
    mockRunDailyReminders.mockRejectedValue(new Error('base indisponible'))

    await expect(callback()).resolves.toBeUndefined()

    expect(logger.error).toHaveBeenCalled()
  })

  it('stop - arrête la tâche et permet de la relancer', () => {
    startStreakReminderCron()
    stopStreakReminderCron()
    startStreakReminderCron()

    expect(task.stop).toHaveBeenCalledTimes(1)
    expect(mockSchedule).toHaveBeenCalledTimes(2)
  })
})
