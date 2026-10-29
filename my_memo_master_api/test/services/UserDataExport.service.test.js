jest.mock('../../models/index', () => ({
  User: { findByPk: jest.fn() },
  Subject: { findOne: jest.fn() },
  Tag: { findOrCreate: jest.fn() },
  LeitnerSystem: { findAll: jest.fn(), create: jest.fn() },
  LeitnerBox: { create: jest.fn() },
  LeitnerCard: { create: jest.fn() },
  Question: { create: jest.fn(), findAll: jest.fn() },
  Response: { bulkCreate: jest.fn(), findAll: jest.fn(), create: jest.fn() },
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
      models.Tag.findOrCreate.mockResolvedValue([{ tagId: 1, name: 'europe' }])
      models.LeitnerSystem.findAll.mockResolvedValue([])
      models.Diagramme.findAll.mockResolvedValue([])
      models.Response.findAll.mockResolvedValue([])
      models.LeitnerSystem.create.mockResolvedValue({ idSystem: 10, addTags: jest.fn() })
      models.LeitnerBox.create.mockResolvedValue({ idBox: 20 })
      models.Question.create.mockResolvedValue({ idQuestion: 30 })
      models.LeitnerCard.create.mockResolvedValue({ idCard: 40 })
      models.Diagramme.create.mockResolvedValue({ addTags: jest.fn() })
    })

    // Système déjà présent, avec la question de validPayload() et sa réponse « Paris »
    const existingSystem = () => ({
      addTags: jest.fn(),
      get: () => ({
        idSystem: 10,
        name: ' géo ',
        subjectId: 3,
        tags: [{ name: 'EUROPE' }],
        leitnerBoxes: [
          {
            level: 1,
            idBox: 20,
            leitnerCards: [{ question: { idQuestion: 30, statement: 'capitale de la  france ?', type: 'open' } }]
          }
        ]
      })
    })

    it('importUserData - contenu inconnu - crée tout pour l’utilisateur et commit', async () => {
      const report = await service.importUserData(7, validPayload())

      expect(report.created).toEqual({ systems: 1, mindMaps: 1 })
      expect(report.merged).toEqual({ systems: 0, mindMaps: 0 })
      expect(report.added).toMatchObject({ cards: 1, responses: 0, tags: 1 })
      expect(models.LeitnerSystem.create).toHaveBeenCalledWith(
        expect.objectContaining({ idUser: 7, subjectId: 3 }),
        { transaction: t }
      )
      expect(models.Diagramme.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 7 }), { transaction: t })
      expect(t.commit).toHaveBeenCalled()
    })

    it('importUserData - système strictement identique - ne crée ni ne modifie rien', async () => {
      const system = existingSystem()
      models.LeitnerSystem.findAll.mockResolvedValue([system])
      models.Response.findAll.mockResolvedValue([{ idQuestion: 30, content: 'paris', correction: true }])

      const report = await service.importUserData(7, validPayload())

      expect(report.unchanged.systems).toBe(1)
      expect(report.created.systems).toBe(0)
      expect(report.merged.systems).toBe(0)
      expect(models.LeitnerSystem.create).not.toHaveBeenCalled()
      expect(models.Question.create).not.toHaveBeenCalled()
      expect(models.Response.create).not.toHaveBeenCalled()
      expect(system.addTags).not.toHaveBeenCalled()
    })

    it('importUserData - système existant avec réponse et carte en plus - les ajoute à l’existant', async () => {
      const system = existingSystem()
      models.LeitnerSystem.findAll.mockResolvedValue([system])
      models.Response.findAll.mockResolvedValue([{ idQuestion: 30, content: 'Lyon', correction: false }])
      const payload = validPayload()
      payload.leitnerSystems[0].boxes[0].cards.push({ question: { statement: 'Fleuve ?', type: 'open', responses: [] } })
      payload.leitnerSystems[0].tags = [{ name: 'europe' }, { name: 'nouveau' }]
      models.Tag.findOrCreate.mockResolvedValueOnce([{ name: 'europe' }]).mockResolvedValueOnce([{ name: 'nouveau' }])

      const report = await service.importUserData(7, payload)

      expect(report.merged.systems).toBe(1)
      expect(report.added).toMatchObject({ cards: 1, responses: 1, tags: 1 })
      expect(models.Response.create).toHaveBeenCalledWith(
        { content: 'Paris', correction: true, idQuestion: 30 },
        { transaction: t }
      )
      expect(models.LeitnerSystem.create).not.toHaveBeenCalled()
      expect(models.LeitnerCard.create).toHaveBeenCalledWith({ idQuestion: 30, idBox: 20 }, { transaction: t })
      expect(system.addTags).toHaveBeenCalledWith([{ name: 'nouveau' }], { transaction: t })
    })

    it('importUserData - même carte deux fois dans le fichier - ne la crée qu’une fois', async () => {
      const payload = validPayload()
      payload.leitnerSystems[0].boxes[0].cards.push({
        question: { statement: ' CAPITALE DE LA FRANCE ? ', type: 'open', responses: [] }
      })

      const report = await service.importUserData(7, payload)

      expect(report.added.cards).toBe(1)
      expect(models.Question.create).toHaveBeenCalledTimes(1)
    })

    it('importUserData - matière introuvable - ignore la carte mentale et le signale', async () => {
      models.Subject.findOne.mockResolvedValue(null)
      const report = await service.importUserData(7, validPayload())

      expect(report.created.mindMaps).toBe(0)
      expect(report.skipped).toHaveLength(1)
      expect(models.Diagramme.create).not.toHaveBeenCalled()
    })

    it('importUserData - carte mentale existante avec un nœud en plus - l’ajoute sans toucher aux autres', async () => {
      const update = jest.fn()
      const base = { id: 'm1', subjectNodeId: 'r', nodes: { r: { id: 'r', label: 'Racine' } }, links: [], zones: [] }
      models.Diagramme.findAll.mockResolvedValue([
        { update, addTags: jest.fn(), get: () => ({ mmName: 'carte', subjectId: 3, mindMapJson: base, tags: [] }) }
      ])
      const payload = validPayload()
      payload.mindMaps[0].name = 'Carte'
      payload.mindMaps[0].mindMapJson = {
        ...base,
        nodes: { r: { id: 'r', label: 'MODIFIÉ' }, a: { id: 'a', label: 'A' } }
      }

      const report = await service.importUserData(7, payload)

      expect(report.merged.mindMaps).toBe(1)
      expect(report.added.nodes).toBe(1)
      expect(models.Diagramme.create).not.toHaveBeenCalled()
      const saved = update.mock.calls[0][0].mindMapJson
      expect(saved.nodes.r.label).toBe('Racine')
      expect(saved.nodes.a).toEqual({ id: 'a', label: 'A' })
    })

    it('importUserData - carte mentale homonyme sans origine commune - la crée à part', async () => {
      const base = { id: 'm1', subjectNodeId: 'r', nodes: {}, links: [], zones: [] }
      models.Diagramme.findAll.mockResolvedValue([
        { update: jest.fn(), addTags: jest.fn(), get: () => ({ mmName: 'Carte', subjectId: 3, mindMapJson: base, tags: [] }) }
      ])

      const report = await service.importUserData(7, validPayload())

      expect(report.created.mindMaps).toBe(1)
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
