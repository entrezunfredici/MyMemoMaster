const { EventEmitter } = require('events')
const { spawn } = require('child_process')
const fs = require('fs')
const { BackupRun, User } = require('../../models/index')
const logger = require('../../helpers/logger')
const sendEmail = require('../../helpers/sendEmail')
const backupService = require('../../services/Backup.service')

jest.mock('child_process', () => ({ spawn: jest.fn() }))
jest.mock('fs', () => ({
  promises: { stat: jest.fn(), rm: jest.fn(), mkdir: jest.fn(), copyFile: jest.fn(), readdir: jest.fn() },
  createReadStream: jest.fn()
}))
jest.mock('../../models/index', () => ({
  BackupRun: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  User: { findAll: jest.fn() }
}))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }))
jest.mock('../../helpers/sendEmail', () => jest.fn())

// Simule un processus enfant qui se termine avec ce code (ou ce signal).
const fakeProcess = ({ code = 0, signal = null, stderr = '', error = null } = {}) => {
  const child = new EventEmitter()
  child.stderr = new EventEmitter()
  setImmediate(() => {
    if (error) return child.emit('error', error)
    if (stderr) child.stderr.emit('data', Buffer.from(stderr))
    child.emit('close', code, signal)
  })
  return child
}

const makeRun = (overrides = {}) => ({
  id: 7,
  trigger: 'auto',
  status: 'running',
  startedAt: new Date('2026-10-22T03:00:00Z'),
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides
})

const ENV_KEYS = ['PG_HOST', 'S3_BUCKET', 'BACKUP_ENABLED', 'BACKUP_HOUR', 'BACKUP_KEEP', 'BACKUP_LOCAL_DIR']

describe('Backup.service', () => {
  const savedEnv = {}

  beforeEach(() => {
    jest.clearAllMocks()
    ENV_KEYS.forEach((k) => { savedEnv[k] = process.env[k]; delete process.env[k] })
    process.env.PG_HOST = 'postgres'
    BackupRun.findAll.mockResolvedValue([])
    BackupRun.findOne.mockResolvedValue(null)
    fs.promises.stat.mockResolvedValue({ size: 2048 })
    fs.promises.rm.mockResolvedValue(undefined)
    fs.promises.mkdir.mockResolvedValue(undefined)
    fs.promises.copyFile.mockResolvedValue(undefined)
    fs.promises.readdir.mockResolvedValue([])
    sendEmail.mockResolvedValue(undefined)
  })

  afterEach(() => {
    ENV_KEYS.forEach((k) => { if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k] })
  })

  // ── Planification ────────────────────────────────────────────────────────

  describe('getNextRunAt', () => {
    it('getNextRunAt - heure pas encore passée - retourne aujourd\'hui à 03h UTC', () => {
      expect(backupService.getNextRunAt(new Date('2026-10-22T01:00:00Z')).toISOString()).toBe('2026-10-22T03:00:00.000Z')
    })

    it('getNextRunAt - heure déjà passée - retourne demain', () => {
      expect(backupService.getNextRunAt(new Date('2026-10-22T03:00:00Z')).toISOString()).toBe('2026-10-23T03:00:00.000Z')
    })

    it('getNextRunAt - BACKUP_HOUR valide - respecte l\'heure configurée', () => {
      process.env.BACKUP_HOUR = '22'
      expect(backupService.getNextRunAt(new Date('2026-10-22T01:00:00Z')).toISOString()).toBe('2026-10-22T22:00:00.000Z')
    })

    it('getNextRunAt - BACKUP_HOUR invalide - retombe sur 3h', () => {
      process.env.BACKUP_HOUR = '99'
      expect(backupService.getScheduleHourUtc()).toBe(3)
    })

    it('getNextRunAt - planification désactivée ou SQLite - retourne null', () => {
      process.env.BACKUP_ENABLED = 'false'
      expect(backupService.getNextRunAt()).toBeNull()
      delete process.env.BACKUP_ENABLED
      delete process.env.PG_HOST
      expect(backupService.getNextRunAt()).toBeNull()
    })
  })

  // ── Sauvegarde manuelle ──────────────────────────────────────────────────

  describe('startManual', () => {
    it('startManual - base SQLite - lève UNSUPPORTED', async () => {
      delete process.env.PG_HOST
      await expect(backupService.startManual(1)).rejects.toMatchObject({ code: 'UNSUPPORTED' })
      expect(BackupRun.create).not.toHaveBeenCalled()
    })

    it('startManual - une sauvegarde est déjà en cours - lève ALREADY_RUNNING', async () => {
      BackupRun.findOne.mockResolvedValue({ id: 3, status: 'running' })
      await expect(backupService.startManual(1)).rejects.toMatchObject({ code: 'ALREADY_RUNNING' })
      expect(BackupRun.create).not.toHaveBeenCalled()
    })

    it('startManual - cas nominal - crée l\'exécution manuelle et la renvoie sans attendre le dump', async () => {
      const run = makeRun({ trigger: 'manual' })
      BackupRun.create.mockResolvedValue(run)
      spawn.mockImplementation(() => fakeProcess())

      const result = await backupService.startManual(42)

      expect(BackupRun.create).toHaveBeenCalledWith(expect.objectContaining({ trigger: 'manual', status: 'running', triggeredBy: 42, slot: null }))
      expect(result).toBe(run)
      await new Promise((resolve) => setImmediate(resolve))
    })

    it('startManual - exécution restée en cours depuis trop longtemps - la clôt en échec avant de réserver', async () => {
      const stale = makeRun({ id: 2 })
      BackupRun.findAll.mockResolvedValue([stale])
      BackupRun.create.mockResolvedValue(makeRun())
      spawn.mockImplementation(() => fakeProcess())

      await backupService.startManual(1)

      expect(stale.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
      await new Promise((resolve) => setImmediate(resolve))
    })
  })

  // ── Sauvegarde planifiée ─────────────────────────────────────────────────

  describe('runScheduled', () => {
    it('runScheduled - planification désactivée - ne fait rien', async () => {
      process.env.BACKUP_ENABLED = 'false'
      expect(await backupService.runScheduled()).toBeNull()
      expect(BackupRun.create).not.toHaveBeenCalled()
    })

    it('runScheduled - créneau du jour déjà pris par un autre pod - ne lance pas de dump', async () => {
      const conflict = Object.assign(new Error('unique'), { name: 'SequelizeUniqueConstraintError' })
      BackupRun.create.mockRejectedValue(conflict)

      expect(await backupService.runScheduled(new Date('2026-10-22T03:00:00Z'))).toBeNull()
      expect(BackupRun.create).toHaveBeenCalledWith(expect.objectContaining({ slot: 'auto-2026-10-22' }))
      expect(spawn).not.toHaveBeenCalled()
    })

    it('runScheduled - cas nominal - dump, contrôle, copie locale, succès enregistré et journalisé', async () => {
      const run = makeRun()
      BackupRun.create.mockResolvedValue(run)
      spawn.mockImplementation(() => fakeProcess())

      await backupService.runScheduled()

      expect(spawn.mock.calls.map((c) => c[0])).toEqual(['pg_dump', 'pg_restore'])
      expect(fs.promises.copyFile).toHaveBeenCalled()
      expect(run.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'success', sizeBytes: 2048 }))
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('réussie'))
      expect(sendEmail).not.toHaveBeenCalled()
      expect(fs.promises.rm).toHaveBeenCalledWith(expect.stringContaining('mmm-7.dump'), { force: true })
    })

    it('runScheduled - plus de BACKUP_KEEP dumps locaux - supprime les plus anciens', async () => {
      process.env.BACKUP_KEEP = '2'
      BackupRun.create.mockResolvedValue(makeRun())
      spawn.mockImplementation(() => fakeProcess())
      fs.promises.readdir.mockResolvedValue(['mmm-20261020T030000Z-a.dump', 'mmm-20261021T030000Z-b.dump', 'mmm-20261022T030000Z-c.dump', 'autre.txt'])

      await backupService.runScheduled()

      expect(fs.promises.rm).toHaveBeenCalledWith(expect.stringContaining('mmm-20261020T030000Z-a.dump'), { force: true })
      expect(fs.promises.rm).not.toHaveBeenCalledWith(expect.stringContaining('mmm-20261022T030000Z-c.dump'), expect.anything())
    })
  })

  // ── Échecs ───────────────────────────────────────────────────────────────

  describe('échec de sauvegarde', () => {
    beforeEach(() => {
      BackupRun.create.mockResolvedValue(makeRun())
      User.findAll.mockResolvedValue([
        { email: 'admin1@test.fr', isActive: true },
        { email: 'admin2@test.fr', isActive: null },
        { email: 'inactif@test.fr', isActive: false }
      ])
    })

    it('pg_dump échoue - enregistre l\'échec, journalise l\'erreur et prévient les admins actifs', async () => {
      const run = makeRun()
      BackupRun.create.mockResolvedValue(run)
      spawn.mockImplementation(() => fakeProcess({ code: 1, stderr: 'connection refused' }))

      await backupService.runScheduled()

      expect(run.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', errorMessage: expect.stringContaining('connection refused') }))
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('en échec'))
      expect(sendEmail).toHaveBeenCalledWith(expect.stringContaining('Échec de la sauvegarde'), expect.stringContaining('connection refused'), 'admin1@test.fr, admin2@test.fr')
      expect(fs.promises.copyFile).not.toHaveBeenCalled()
      expect(fs.promises.rm).toHaveBeenCalled()
    })

    it('pg_dump absent de l\'image - message explicite', async () => {
      const run = makeRun()
      BackupRun.create.mockResolvedValue(run)
      spawn.mockImplementation(() => fakeProcess({ error: Object.assign(new Error('spawn'), { code: 'ENOENT' }) }))

      await backupService.runScheduled()

      expect(run.update).toHaveBeenCalledWith(expect.objectContaining({ errorMessage: expect.stringContaining('introuvable') }))
    })

    it('processus tué par le délai maximal - échec avec mention du délai', async () => {
      const run = makeRun()
      BackupRun.create.mockResolvedValue(run)
      spawn.mockImplementation(() => fakeProcess({ code: null, signal: 'SIGTERM' }))

      await backupService.runScheduled()

      expect(run.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', errorMessage: expect.stringContaining('délai') }))
    })

    it('dump vide - échec', async () => {
      const run = makeRun()
      BackupRun.create.mockResolvedValue(run)
      spawn.mockImplementation(() => fakeProcess())
      fs.promises.stat.mockResolvedValue({ size: 0 })

      await backupService.runScheduled()

      expect(run.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', errorMessage: expect.stringContaining('vide') }))
    })

    it('envoi du mail impossible - l\'échec reste enregistré et l\'erreur d\'envoi est journalisée', async () => {
      const run = makeRun()
      BackupRun.create.mockResolvedValue(run)
      spawn.mockImplementation(() => fakeProcess({ code: 1 }))
      sendEmail.mockRejectedValue(new Error('SMTP down'))

      await expect(backupService.runScheduled()).resolves.toBe(run)

      expect(run.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('SMTP down'))
    })

    it('aucun administrateur actif - pas de mail, erreur journalisée', async () => {
      spawn.mockImplementation(() => fakeProcess({ code: 1 }))
      User.findAll.mockResolvedValue([{ email: 'inactif@test.fr', isActive: false }])

      await backupService.runScheduled()

      expect(sendEmail).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Aucun administrateur'))
    })
  })

  // ── Lecture ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('findAll - limite hors bornes - plafonnée à 100, minimum 1, défaut 30', async () => {
      BackupRun.findAll.mockResolvedValue([])
      await backupService.findAll(5000)
      expect(BackupRun.findAll).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 100 }))
      await backupService.findAll(-4)
      expect(BackupRun.findAll).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 1 }))
      await backupService.findAll(undefined)
      expect(BackupRun.findAll).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 30 }))
    })
  })

  describe('getStatus', () => {
    it('getStatus - dernière exécution en cours - running vrai et destination locale sans bucket', async () => {
      const running = makeRun()
      BackupRun.findOne.mockResolvedValue(running)

      const status = await backupService.getStatus()

      expect(status).toMatchObject({ supported: true, running: true, destination: 'local', keep: 14, lastRun: running })
    })

    it('getStatus - bucket configuré - destination s3', async () => {
      process.env.S3_BUCKET = 'bucket'
      expect((await backupService.getStatus()).destination).toBe('s3')
    })
  })
})
