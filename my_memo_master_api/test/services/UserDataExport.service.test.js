jest.mock('../../models/index', () => ({
  User: { findByPk: jest.fn() },
  Subject: { findOne: jest.fn() },
  Tag: { findOrCreate: jest.fn() },
  LeitnerSystem: { findAll: jest.fn(), create: jest.fn() },
  LeitnerBox: { create: jest.fn() },
  LeitnerCard: { create: jest.fn() },
  Question: { create: jest.fn(), findAll: jest.fn() },
  Response: { bulkCreate: jest.fn(), findAll: jest.fn() },
  Diagramme: { findAll: jest.fn(), create: jest.fn() },
  Test: { findAll: jest.fn() },
  TestResult: { findAll: jest.fn() },
  LeitnerReviewSession: { findAll: jest.fn() },
  RevisionSession: { findAll: jest.fn() },
  Reminder: { findAll: jest.fn() },
  ClassGroupUsers: { findAll: jest.fn() },
  ClassGroup: {},
  instance: { transaction: jest.fn() }
}))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))

const models = require('../../models/index')
const service = require('../../services/UserDataExport.service')

const makeCard = () => ({
  question: { statement: 'Capitale de la France ?', type: 'open', responses: [{ content: 'Paris', correction: true }] }
})
const validPayload = () => ({
  format: 'mymemomaster-export',
  version: 1,
  leitnerSystems: [
    { name: 'Géo', subject: 'Géographie', tags: [{ name: 'europe' }], boxes: [{ level: 1, cards: [makeCard()] }] }
  ],
  mindMaps: [{ name: 'Carte', subject: 'Géographie', tags: [], mindMapJson: { nodes: [] } }]
})

describe('UserDataExportService', () => {
  describe('validateImportPayload', () => {
    it('validateImportPayload - export valide - retourne le contenu normalisé', () => {
      const result = service.validateImportPayload(validPayload())
      expect(result.systems).toHaveLength(1)
      expect(result.systems[0].boxes[0].cards[0].responses[0].correction).toBe(true)
      expect(result.mindMaps).toHaveLength(1)
    })

    it.each([
      ['format inconnu', { ...validPayload(), format: 'autre' }],
      ['version inconnue', { ...validPayload(), version: 99 }],
      ['corps absent', null],
      ['liste de systèmes invalide', { ...validPayload(), leitnerSystems: 'x' }]
    ])('validateImportPayload - %s - lève ImportValidationError', (_label, payload) => {
      expect(() => service.validateImportPayload(payload)).toThrow(service.ImportValidationError)
    })

    it('validateImportPayload - type de question inconnu - lève ImportValidationError', () => {
      const p = validPayload()
      p.leitnerSystems[0].boxes[0].cards[0].question.type = 'inconnu'
      expect(() => service.validateImportPayload(p)).toThrow(/type de question/)
    })

    it('validateImportPayload - nom de système trop long - lève ImportValidationError', () => {
      const p = validPayload()
      p.leitnerSystems[0].name = 'x'.repeat(51)
      expect(() => service.validateImportPayload(p)).toThrow(/50 caractères/)
    })

    it('validateImportPayload - plus de 5000 cartes - lève ImportValidationError', () => {
      const p = validPayload()
      p.leitnerSystems[0].boxes[0].cards = Array.from({ length: 5001 }, makeCard)
      expect(() => service.validateImportPayload(p)).toThrow(/Trop de cartes/)
    })

    it('validateImportPayload - export vide - retourne des listes vides', () => {
      const result = service.validateImportPayload({ format: 'mymemomaster-export', version: 1 })
      expect(result).toEqual({ systems: [], mindMaps: [] })
    })
  })

  describe('importUserData', () => {
    let t
    beforeEach(() => {
      jest.clearAllMocks()
      t = { commit: jest.fn(), rollback: jest.fn() }
      models.instance.transaction.mockResolvedValue(t)
      models.Subject.findOne.mockResolvedValue({ subjectId: 3 })
      models.Tag.findOrCreate.mockResolvedValue([{ tagId: 1 }])
      models.LeitnerSystem.create.mockResolvedValue({ idSystem: 10, setTags: jest.fn() })
      models.LeitnerBox.create.mockResolvedValue({ idBox: 20 })
      models.Question.create.mockResolvedValue({ idQuestion: 30 })
      models.LeitnerCard.create.mockResolvedValue({ idCard: 40 })
      models.Diagramme.create.mockResolvedValue({ setTags: jest.fn() })
    })

    it('importUserData - export valide - crée le contenu pour l’utilisateur et commit', async () => {
      const summary = await service.importUserData(7, validPayload())

      expect(summary).toEqual({ systems: 1, cards: 1, mindMaps: 1, skipped: [] })
      expect(models.LeitnerSystem.create).toHaveBeenCalledWith(
        expect.objectContaining({ idUser: 7, subjectId: 3 }),
        { transaction: t }
      )
      expect(models.Diagramme.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 7 }), { transaction: t })
      expect(t.commit).toHaveBeenCalled()
    })

    it('importUserData - matière introuvable - ignore la carte mentale et le signale', async () => {
      models.Subject.findOne.mockResolvedValue(null)
      const summary = await service.importUserData(7, validPayload())

      expect(summary.mindMaps).toBe(0)
      expect(summary.skipped).toHaveLength(1)
      expect(models.Diagramme.create).not.toHaveBeenCalled()
    })

    it('importUserData - fichier invalide - ne démarre aucune transaction', async () => {
      await expect(service.importUserData(7, { format: 'x' })).rejects.toThrow(service.ImportValidationError)
      expect(models.instance.transaction).not.toHaveBeenCalled()
    })

    it('importUserData - erreur en base - rollback et propage l’erreur', async () => {
      models.LeitnerBox.create.mockRejectedValue(new Error('db down'))
      await expect(service.importUserData(7, validPayload())).rejects.toThrow('db down')
      expect(t.rollback).toHaveBeenCalled()
      expect(t.commit).not.toHaveBeenCalled()
    })
  })

  describe('exportUserData', () => {
    it('exportUserData - utilisateur inconnu - retourne null', async () => {
      models.User.findByPk.mockResolvedValue(null)
      await expect(service.exportUserData(1)).resolves.toBeNull()
    })

    it('exportUserData - utilisateur existant - retourne le document sans secret', async () => {
      models.User.findByPk.mockResolvedValue({ get: () => ({ userId: 1, name: 'Bob', email: 'b@x.fr' }) })
      models.LeitnerSystem.findAll.mockResolvedValue([])
      models.Diagramme.findAll.mockResolvedValue([])
      models.Test.findAll.mockResolvedValue([])
      for (const m of ['TestResult', 'LeitnerReviewSession', 'RevisionSession', 'Reminder', 'ClassGroupUsers']) {
        models[m].findAll.mockResolvedValue([])
      }

      const data = await service.exportUserData(1)

      expect(data).toMatchObject({ format: 'mymemomaster-export', version: 1, profile: { userId: 1 } })
      expect(data.profile.password).toBeUndefined()
      expect(models.User.findByPk.mock.calls[0][1].attributes).not.toContain('password')
    })

    it('exportUserData - question à plusieurs réponses - exporte toutes les réponses', async () => {
      models.User.findByPk.mockResolvedValue({ get: () => ({ userId: 1 }) })
      // Question.response est un hasOne : l'include ne fournit jamais de tableau
      const card = { question: { idQuestion: 5, statement: 'Q ?', type: 'mcq', content: null, questionPosition: 1 } }
      models.LeitnerSystem.findAll.mockResolvedValue([
        {
          get: () => ({
            name: 'Géo',
            sujet: null,
            subject: { name: 'Géographie' },
            tags: [],
            leitnerBoxes: [{ level: 1, intervall: 86400, color: 1, leitnerCards: [card] }]
          })
        }
      ])
      models.Response.findAll.mockResolvedValue([
        { idQuestion: 5, content: 'A', correction: true },
        { idQuestion: 5, content: 'B', correction: false }
      ])
      models.Diagramme.findAll.mockResolvedValue([])
      models.Test.findAll.mockResolvedValue([])
      for (const m of ['TestResult', 'LeitnerReviewSession', 'RevisionSession', 'Reminder', 'ClassGroupUsers']) {
        models[m].findAll.mockResolvedValue([])
      }

      const data = await service.exportUserData(1)

      expect(data.leitnerSystems[0].boxes[0].cards[0].question.responses).toEqual([
        { content: 'A', correction: true },
        { content: 'B', correction: false }
      ])
      expect(models.Response.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { idQuestion: [5] } }))
    })
  })
})
