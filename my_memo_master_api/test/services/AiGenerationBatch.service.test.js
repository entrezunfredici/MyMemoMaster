// Tests fonctionnels sur une vraie base SQLite en mémoire (comme test/bdd/) plutôt que des
// modèles Sequelize mockés : ce service repose sur une transaction (create + bulkCreate) et des
// associations (batch → cards, batch → user/leitnerSystem) que des mocks représenteraient mal.
process.env.DB_STORAGE = ':memory:'

const { syncModels, Role, User, LeitnerSystem } = require('../../models')
const AiGenerationBatchService = require('../../services/AiGenerationBatch.service')

const VALID_CARDS = [
  { statement: 'Q1', type: 'open', answer: 'A1', acceptedAnswers: ['a1'], sourceExcerpt: 'E1' },
  {
    statement: 'Q2',
    type: 'mcq',
    options: [{ text: 'x', correct: true }, { text: 'y', correct: false }, { text: 'z', correct: false }],
    sourceExcerpt: 'E2'
  }
]

describe('AiGenerationBatchService', () => {
  let userId
  let otherUserId
  let idSystem

  beforeAll(async () => {
    await syncModels({ force: true })

    const role = await Role.create({ name: 'Étudiant' })
    const user = await User.create({
      name: 'Batch Tester',
      email: 'batch-tester@test.fr',
      password: 'hash',
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    userId = user.userId

    const otherUser = await User.create({
      name: 'Autre utilisateur',
      email: 'autre@test.fr',
      password: 'hash',
      roleId: role.roleId,
      hasValidatedEmail: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    otherUserId = otherUser.userId

    const system = await LeitnerSystem.create({ name: 'Système test', idUser: userId })
    idSystem = system.idSystem
  })

  describe('createFromPipelineResult', () => {
    it('createFromPipelineResult - cas nominal - crée le batch "pending" et ses cartes "pending"', async () => {
      const batch = await AiGenerationBatchService.createFromPipelineResult({
        userId,
        idSystem,
        subjectContext: 'SVT',
        cardType: 'mixed',
        outputLanguage: 'fr',
        cards: VALID_CARDS,
        warnings: ['un avertissement']
      })

      expect(batch.status).toBe('pending')
      expect(batch.warnings).toEqual(['un avertissement'])
      expect(batch.cards).toHaveLength(2)
      expect(batch.cards.every((c) => c.status === 'pending')).toBe(true)
      const mcqCard = batch.cards.find((c) => c.type === 'mcq')
      expect(mcqCard.options).toHaveLength(3)
    })

    it('createFromPipelineResult - warnings absent - stocké comme tableau vide (valeur par défaut du paramètre)', async () => {
      const batch = await AiGenerationBatchService.createFromPipelineResult({
        userId,
        idSystem,
        cards: [VALID_CARDS[0]]
      })
      expect(batch.warnings).toEqual([])
    })
  })

  describe('findById', () => {
    it('findById - batch existant, appartenant à l\'utilisateur - le retourne avec ses cartes', async () => {
      const created = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })
      const found = await AiGenerationBatchService.findById(created.id, userId)
      expect(found.id).toBe(created.id)
      expect(found.cards).toHaveLength(2)
    })

    it('findById - batch appartenant à un autre utilisateur - retourne null', async () => {
      const created = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })
      const found = await AiGenerationBatchService.findById(created.id, otherUserId)
      expect(found).toBeNull()
    })

    it('findById - identifiant inexistant - retourne null', async () => {
      const found = await AiGenerationBatchService.findById(999999, userId)
      expect(found).toBeNull()
    })
  })

  describe('findPendingByUser', () => {
    it('findPendingByUser - retourne uniquement les batches "pending" de l\'utilisateur, du plus récent au plus ancien', async () => {
      const created = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })
      await AiGenerationBatchService.markBatchStatus(created.id, userId, 'discarded')
      const stillPending = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })

      const results = await AiGenerationBatchService.findPendingByUser(userId)

      expect(results.every((b) => b.status === 'pending')).toBe(true)
      expect(results.some((b) => b.id === stillPending.id)).toBe(true)
      expect(results.some((b) => b.id === created.id)).toBe(false)
    })

    it('findPendingByUser - aucun batch pour cet utilisateur - retourne un tableau vide', async () => {
      const role = await Role.create({ name: 'Étudiant sans batch' })
      const isolatedUser = await User.create({
        name: 'Isolé',
        email: 'isole@test.fr',
        password: 'hash',
        roleId: role.roleId,
        hasValidatedEmail: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      const results = await AiGenerationBatchService.findPendingByUser(isolatedUser.userId)
      expect(results).toEqual([])
    })
  })

  describe('updateCard', () => {
    it('updateCard - carte d\'un batch "pending" - met à jour les champs fournis', async () => {
      const batch = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })
      const cardId = batch.cards[0].id

      const updated = await AiGenerationBatchService.updateCard(cardId, userId, {
        statement: 'Question modifiée',
        status: 'edited'
      })

      expect(updated.statement).toBe('Question modifiée')
      expect(updated.status).toBe('edited')
    })

    it('updateCard - statut invalide - lève une erreur 400', async () => {
      const batch = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })
      await expect(
        AiGenerationBatchService.updateCard(batch.cards[0].id, userId, { status: 'archived' })
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('updateCard - carte n\'appartenant pas à l\'utilisateur - retourne null', async () => {
      const batch = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })
      const result = await AiGenerationBatchService.updateCard(batch.cards[0].id, otherUserId, { status: 'accepted' })
      expect(result).toBeNull()
    })

    it('updateCard - batch déjà validé - retourne null (plus modifiable)', async () => {
      const batch = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })
      await AiGenerationBatchService.markBatchStatus(batch.id, userId, 'validated')

      const result = await AiGenerationBatchService.updateCard(batch.cards[0].id, userId, { status: 'accepted' })
      expect(result).toBeNull()
    })

    it('updateCard - carte inexistante - retourne null', async () => {
      const result = await AiGenerationBatchService.updateCard(999999, userId, { status: 'accepted' })
      expect(result).toBeNull()
    })

    // Lien vers un nœud de carte mentale (même rôle que LeitnerCard.mindMapNodeId), choisi à
    // l'écran de révision avant promotion.
    it('updateCard - mindMapNodeId fourni - persiste le lien vers le nœud', async () => {
      const batch = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })
      const cardId = batch.cards[0].id

      const updated = await AiGenerationBatchService.updateCard(cardId, userId, {
        mindMapNodeId: 'node-42',
        status: 'edited'
      })

      expect(updated.mindMapNodeId).toBe('node-42')
    })

    it('updateCard - mindMapNodeId retiré (remis à null) - le lien est supprimé', async () => {
      const batch = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })
      const cardId = batch.cards[0].id
      await AiGenerationBatchService.updateCard(cardId, userId, { mindMapNodeId: 'node-42' })

      const updated = await AiGenerationBatchService.updateCard(cardId, userId, { mindMapNodeId: null })

      expect(updated.mindMapNodeId).toBeNull()
    })
  })

  describe('markBatchStatus', () => {
    it('markBatchStatus - "validated" - met à jour le statut, ne touche pas les cartes', async () => {
      const batch = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })
      const updated = await AiGenerationBatchService.markBatchStatus(batch.id, userId, 'validated')
      expect(updated.status).toBe('validated')
    })

    it('markBatchStatus - statut invalide - lève une erreur 400', async () => {
      const batch = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })
      await expect(AiGenerationBatchService.markBatchStatus(batch.id, userId, 'pending')).rejects.toMatchObject({
        statusCode: 400
      })
    })

    it('markBatchStatus - batch n\'appartenant pas à l\'utilisateur - retourne null', async () => {
      const batch = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })
      const result = await AiGenerationBatchService.markBatchStatus(batch.id, otherUserId, 'discarded')
      expect(result).toBeNull()
    })
  })

  describe('deleteBatch', () => {
    it('deleteBatch - batch existant - le supprime ainsi que ses cartes (cascade)', async () => {
      const batch = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })

      const deleted = await AiGenerationBatchService.deleteBatch(batch.id, userId)
      expect(deleted).toBe(true)

      const found = await AiGenerationBatchService.findById(batch.id, userId)
      expect(found).toBeNull()
    })

    it('deleteBatch - batch n\'appartenant pas à l\'utilisateur - ne supprime rien, retourne false', async () => {
      const batch = await AiGenerationBatchService.createFromPipelineResult({ userId, idSystem, cards: VALID_CARDS })

      const deleted = await AiGenerationBatchService.deleteBatch(batch.id, otherUserId)
      expect(deleted).toBe(false)

      const stillThere = await AiGenerationBatchService.findById(batch.id, userId)
      expect(stillThere).not.toBeNull()
    })
  })
})
