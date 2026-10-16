const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('../../models/index', () => ({
  Role: {},
  Subject: {},
  LeitnerSystem: {},
  LeitnerSystemsUsers: {},
  LeitnerCard: {},
  LeitnerBox: {},
  Unit: {},
  User: {},
  Response: {},
  Fields: {},
  FieldsType: {},
  Diagramme: {},
  Test: {},
  Question: {},
  Tutorials: {},
  UserOnboardingState: {},
  ClassGroup: {},
  ClassGroupUsers: {},
  CalendarEvent: {},
  EventOccurrence: {},
  Deadline: {},
  RevisionSession: {},
  Reminder: {}
}))

jest.mock('../../services/Reminder.service')
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }))
jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))

const reminderService = require('../../services/Reminder.service')
const app = require('../../app')

const SECRET = 'test-secret'
process.env.AUTH_JWT_SECRET = SECRET

const makeToken = (payload = { id: 1 }) => jwt.sign(payload, SECRET)

const REMINDER_FIXTURE = {
  id: 1,
  userId: 1,
  entityType: 'deadline',
  entityId: 5,
  reminderAt: '2026-12-01T08:00:00.000Z',
  delayMinutes: 1440,
  channel: 'email',
  status: 'pending',
  jobId: 'reminder-1',
  message: null
}

describe('GET /api/v1/reminders', () => {
  test('findAll - authentifié - retourne la liste', async () => {
    reminderService.findAll.mockResolvedValue([REMINDER_FIXTURE])
    const res = await request(app)
      .get('/api/v1/reminders')
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })

  test('findAll - sans token - retourne 401', async () => {
    const res = await request(app).get('/api/v1/reminders')
    expect(res.status).toBe(401)
  })

  test('findAll - erreur service - retourne 500', async () => {
    reminderService.findAll.mockRejectedValue(new Error('DB error'))
    const res = await request(app)
      .get('/api/v1/reminders')
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(500)
  })
})

describe('GET /api/v1/reminders/:id', () => {
  test('findOne - trouvé - retourne 200', async () => {
    reminderService.findOne.mockResolvedValue(REMINDER_FIXTURE)
    const res = await request(app)
      .get('/api/v1/reminders/1')
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(1)
  })

  test('findOne - introuvable - retourne 404', async () => {
    reminderService.findOne.mockResolvedValue(null)
    const res = await request(app)
      .get('/api/v1/reminders/99')
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/v1/reminders', () => {
  const VALID_BODY = { entityType: 'deadline', entityId: 5, delayMinutes: 1440 }

  test('create - données valides - retourne 201', async () => {
    reminderService.create.mockResolvedValue(REMINDER_FIXTURE)
    const res = await request(app)
      .post('/api/v1/reminders')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(VALID_BODY)
    expect(res.status).toBe(201)
    expect(res.body.data.entityType).toBe('deadline')
  })

  test('create - entityType invalide - retourne 400', async () => {
    const res = await request(app)
      .post('/api/v1/reminders')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ ...VALID_BODY, entityType: 'invalid' })
    expect(res.status).toBe(400)
  })

  test('create - delayMinutes manquant - retourne 400', async () => {
    const res = await request(app)
      .post('/api/v1/reminders')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ entityType: 'deadline', entityId: 5 })
    expect(res.status).toBe(400)
  })

  test('create - delayMinutes = 0 - retourne 400', async () => {
    const res = await request(app)
      .post('/api/v1/reminders')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ ...VALID_BODY, delayMinutes: 0 })
    expect(res.status).toBe(400)
  })

  test('create - entité introuvable (service 404) - retourne 404', async () => {
    reminderService.create.mockRejectedValue(
      Object.assign(new Error('Entité introuvable'), { status: 404 })
    )
    const res = await request(app)
      .post('/api/v1/reminders')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(VALID_BODY)
    expect(res.status).toBe(404)
  })

  test('create - date passée (service 400) - retourne 400', async () => {
    reminderService.create.mockRejectedValue(
      Object.assign(new Error('Date passée'), { status: 400 })
    )
    const res = await request(app)
      .post('/api/v1/reminders')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(VALID_BODY)
    expect(res.status).toBe(400)
  })

  test('create - sans token - retourne 401', async () => {
    const res = await request(app).post('/api/v1/reminders').send(VALID_BODY)
    expect(res.status).toBe(401)
  })

  test('create - erreur service - retourne 500', async () => {
    reminderService.create.mockRejectedValue(new Error('DB error'))
    const res = await request(app)
      .post('/api/v1/reminders')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(VALID_BODY)
    expect(res.status).toBe(500)
  })
})

describe('PUT /api/v1/reminders/:id', () => {
  test('update - données valides - retourne 200', async () => {
    reminderService.update.mockResolvedValue({ ...REMINDER_FIXTURE, delayMinutes: 60 })
    const res = await request(app)
      .put('/api/v1/reminders/1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ delayMinutes: 60 })
    expect(res.status).toBe(200)
  })

  test('update - introuvable - retourne 404', async () => {
    reminderService.update.mockResolvedValue(null)
    const res = await request(app)
      .put('/api/v1/reminders/99')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ delayMinutes: 60 })
    expect(res.status).toBe(404)
  })

  test('update - rappel déjà traité (service 400) - retourne 400', async () => {
    reminderService.update.mockRejectedValue(
      Object.assign(new Error('Déjà traité'), { status: 400 })
    )
    const res = await request(app)
      .put('/api/v1/reminders/1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ delayMinutes: 60 })
    expect(res.status).toBe(400)
  })

  test('update - sans token - retourne 401', async () => {
    const res = await request(app).put('/api/v1/reminders/1').send({ delayMinutes: 60 })
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/v1/reminders/:id', () => {
  test('delete - trouvé - retourne 200', async () => {
    reminderService.delete.mockResolvedValue(true)
    const res = await request(app)
      .delete('/api/v1/reminders/1')
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(200)
  })

  test('delete - introuvable - retourne 404', async () => {
    reminderService.delete.mockResolvedValue(false)
    const res = await request(app)
      .delete('/api/v1/reminders/99')
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(404)
  })

  test('delete - sans token - retourne 401', async () => {
    const res = await request(app).delete('/api/v1/reminders/1')
    expect(res.status).toBe(401)
  })

  test('delete - erreur service - retourne 500', async () => {
    reminderService.delete.mockRejectedValue(new Error('DB error'))
    const res = await request(app)
      .delete('/api/v1/reminders/1')
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(500)
  })
})
