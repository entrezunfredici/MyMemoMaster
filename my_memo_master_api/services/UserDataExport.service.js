const dayjs = require('dayjs')
const {
  User,
  Subject,
  Tag,
  LeitnerSystem,
  LeitnerBox,
  LeitnerCard,
  CardSystem,
  Question,
  Response,
  Diagramme,
  Test,
  TestResult,
  LeitnerReviewSession,
  RevisionSession,
  Reminder,
  ClassGroupUsers,
  ClassGroup,
  instance
} = require('../models/index')
const logger = require('../helpers/logger')

const EXPORT_FORMAT = 'mymemomaster-export'
const EXPORT_VERSION = 1

const QUESTION_TYPES = ['open', 'mcq', 'fill_blank', 'reorder']
const HEX_COLOR = /^#[0-9a-f]{6}$/i

// CHOIX: plafonds fixes sur l'import plutôt que laisser le body limiter seul faire barrière
// RAISON: 10 Mo de JSON peuvent encore contenir des dizaines de milliers de lignes à insérer
const MAX_SYSTEMS = 50
const MAX_CARDS_TOTAL = 5000
const MAX_RESPONSES_PER_QUESTION = 20
const MAX_MIND_MAPS = 200
const MAX_MIND_MAP_BYTES = 5 * 1024 * 1024
const MAX_TAGS_PER_ITEM = 20

/**
 * Erreur de validation du fichier importé — renvoyée en 400 par le controller.
 */
class ImportValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ImportValidationError'
  }
}

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const plain = (row) => (row?.get ? row.get({ plain: true }) : row)

function requireString(value, label, max) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ImportValidationError(`${label} est obligatoire.`)
  }
  if (value.length > max) {
    throw new ImportValidationError(`${label} dépasse ${max} caractères.`)
  }
  return value.trim()
}

function readTags(rawTags, label) {
  if (rawTags === undefined || rawTags === null) return []
  if (!Array.isArray(rawTags) || rawTags.length > MAX_TAGS_PER_ITEM) {
    throw new ImportValidationError(`${label} : liste de tags invalide (${MAX_TAGS_PER_ITEM} maximum).`)
  }
  return rawTags.map((tag) => ({
    name: requireString(tag?.name, `${label} : le nom d'un tag`, 50),
    color: typeof tag?.color === 'string' && HEX_COLOR.test(tag.color) ? tag.color : undefined
  }))
}

class UserDataExportService {
  /**
   * Construit l'export complet des données d'un utilisateur (droit à la portabilité).
   * Les secrets (mot de passe, codes 2FA, jetons) ne sont jamais inclus.
   *
   * @param {number} userId - Identifiant de l'utilisateur connecté
   * @returns {Promise<object|null>} Document d'export, ou null si l'utilisateur n'existe pas
   */
  async exportUserData(userId) {
    const user = await User.findByPk(userId, {
      attributes: ['userId', 'name', 'email', 'roleId', 'hasValidatedEmail', 'twoFactorEnabled', 'lastLogin', 'createdAt']
    })
    if (!user) return null

    const [leitnerSystems, mindMaps, tests, testResults, reviewSessions, revisionSessions, reminders, memberships] =
      await Promise.all([
        this._findLeitnerSystems(userId),
        this._findMindMaps(userId),
        this._findTests(userId),
        TestResult.findAll({ where: { userId }, raw: true }),
        LeitnerReviewSession.findAll({ where: { userId }, raw: true }),
        RevisionSession.findAll({ where: { userId }, raw: true }),
        Reminder.findAll({ where: { userId }, attributes: { exclude: ['jobId'] }, raw: true }),
        ClassGroupUsers.findAll({
          where: { userId },
          include: [{ model: ClassGroup, as: 'classGroup', attributes: ['name'] }]
        })
      ])

    return {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: dayjs().toISOString(),
      profile: plain(user),
      // Contenu réimportable (POST /users/me/import)
      leitnerSystems,
      mindMaps,
      // Données d'activité : exportées pour information, non réimportées
      activity: {
        tests,
        testResults,
        leitnerReviewSessions: reviewSessions,
        revisionSessions,
        reminders,
        classGroups: memberships.map((m) => ({ name: m.classGroup?.name ?? null, role: m.role }))
      }
    }
  }

  async _findLeitnerSystems(userId) {
    const systems = await LeitnerSystem.findAll({
      where: { idUser: userId },
      include: [
        { model: Subject, as: 'subject', attributes: ['name'] },
        { model: Tag, as: 'tags', attributes: ['name', 'color'], through: { attributes: [] } },
        {
          model: LeitnerBox,
          as: 'leitnerBoxes',
          include: [
            {
              model: LeitnerCard,
              as: 'leitnerCards',
              include: [{ model: Question, as: 'question', include: [{ model: Response, as: 'response' }] }]
            }
          ]
        }
      ],
      order: [['idSystem', 'ASC']]
    })

    return systems.map((raw) => {
      const system = plain(raw)
      return {
        name: system.name,
        sujet: system.sujet,
        subject: system.subject?.name ?? null,
        tags: (system.tags || []).map((t) => ({ name: t.name, color: t.color })),
        boxes: (system.leitnerBoxes || [])
          .sort((a, b) => a.level - b.level)
          .map((box) => ({
            level: box.level,
            intervall: box.intervall,
            color: box.color,
            cards: (box.leitnerCards || []).map((card) => ({
              question: card.question
                ? {
                    statement: card.question.statement,
                    type: card.question.type,
                    content: card.question.content,
                    questionPosition: card.question.questionPosition,
                    responses: (card.question.response || []).map((r) => ({
                      content: r.content,
                      correction: r.correction
                    }))
                  }
                : null,
              reviewCount: card.review_count,
              correctCount: card.correct_count,
              incorrectCount: card.incorrect_count,
              lastReviewAt: card.last_review_at,
              nextReviewAt: card.next_review_at
            }))
          }))
      }
    })
  }

  async _findMindMaps(userId) {
    const mindMaps = await Diagramme.findAll({
      where: { userId },
      include: [
        { model: Subject, as: 'subject', attributes: ['name'] },
        { model: Tag, as: 'tags', attributes: ['name', 'color'], through: { attributes: [] } }
      ],
      order: [['idMindMap', 'ASC']]
    })
    return mindMaps.map((raw) => {
      const map = plain(raw)
      return {
        name: map.mmName,
        subject: map.subject?.name ?? null,
        tags: (map.tags || []).map((t) => ({ name: t.name, color: t.color })),
        mindMapJson: map.mindMapJson
      }
    })
  }

  async _findTests(userId) {
    const tests = await Test.findAll({
      where: { userId },
      include: [
        { model: Subject, as: 'subject', attributes: ['name'] },
        { model: Question, as: 'question', include: [{ model: Response, as: 'response' }], through: { attributes: [] } }
      ]
    })
    return tests.map((raw) => {
      const test = plain(raw)
      return {
        name: test.name,
        subject: test.subject?.name ?? null,
        createdAt: test.createdAt,
        questions: (test.question || []).map((q) => ({
          statement: q.statement,
          type: q.type,
          content: q.content,
          responses: (q.response || []).map((r) => ({ content: r.content, correction: r.correction }))
        }))
      }
    })
  }

  /**
   * Valide la structure d'un fichier d'export avant toute écriture en base.
   *
   * @param {object} payload - Corps JSON reçu
   * @returns {{systems: object[], mindMaps: object[]}} Contenu normalisé
   * @throws {ImportValidationError} Si le fichier n'est pas un export valide
   */
  validateImportPayload(payload) {
    if (!isPlainObject(payload) || payload.format !== EXPORT_FORMAT) {
      throw new ImportValidationError("Ce fichier n'est pas un export MyMemoMaster.")
    }
    if (payload.version !== EXPORT_VERSION) {
      throw new ImportValidationError(`Version d'export non prise en charge (attendue : ${EXPORT_VERSION}).`)
    }

    const rawSystems = payload.leitnerSystems ?? []
    const rawMaps = payload.mindMaps ?? []
    if (!Array.isArray(rawSystems) || rawSystems.length > MAX_SYSTEMS) {
      throw new ImportValidationError(`Liste de systèmes invalide (${MAX_SYSTEMS} maximum).`)
    }
    if (!Array.isArray(rawMaps) || rawMaps.length > MAX_MIND_MAPS) {
      throw new ImportValidationError(`Liste de cartes mentales invalide (${MAX_MIND_MAPS} maximum).`)
    }

    let totalCards = 0
    const systems = rawSystems.map((s, i) => {
      const label = `Système n°${i + 1}`
      if (!isPlainObject(s)) throw new ImportValidationError(`${label} : format invalide.`)
      const rawBoxes = Array.isArray(s.boxes) ? s.boxes : []
      const boxes = rawBoxes.map((b) => {
        if (!isPlainObject(b) || !Number.isInteger(b.level) || b.level < 1 || b.level > 20) {
          throw new ImportValidationError(`${label} : niveau de boîte invalide.`)
        }
        const rawCards = Array.isArray(b.cards) ? b.cards : []
        totalCards += rawCards.length
        if (totalCards > MAX_CARDS_TOTAL) {
          throw new ImportValidationError(`Trop de cartes (${MAX_CARDS_TOTAL} maximum par import).`)
        }
        return { level: b.level, cards: rawCards.map((c) => this._validateCard(c, label)) }
      })
      return {
        name: requireString(s.name, `${label} : le nom`, 50),
        sujet: s.sujet ?? null,
        subject: typeof s.subject === 'string' ? s.subject.trim() : null,
        tags: readTags(s.tags, label),
        boxes
      }
    })

    const mindMaps = rawMaps.map((m, i) => {
      const label = `Carte mentale n°${i + 1}`
      if (!isPlainObject(m) || !isPlainObject(m.mindMapJson)) {
        throw new ImportValidationError(`${label} : contenu invalide.`)
      }
      if (Buffer.byteLength(JSON.stringify(m.mindMapJson)) > MAX_MIND_MAP_BYTES) {
        throw new ImportValidationError(`${label} : contenu trop volumineux.`)
      }
      return {
        name: requireString(m.name, `${label} : le nom`, 50),
        subject: typeof m.subject === 'string' ? m.subject.trim() : null,
        tags: readTags(m.tags, label),
        mindMapJson: m.mindMapJson
      }
    })

    return { systems, mindMaps }
  }

  _validateCard(card, label) {
    const q = card?.question
    if (!isPlainObject(q)) throw new ImportValidationError(`${label} : carte sans question.`)
    if (!QUESTION_TYPES.includes(q.type)) {
      throw new ImportValidationError(`${label} : type de question invalide (${QUESTION_TYPES.join(', ')}).`)
    }
    const responses = Array.isArray(q.responses) ? q.responses : []
    if (responses.length > MAX_RESPONSES_PER_QUESTION) {
      throw new ImportValidationError(`${label} : trop de réponses pour une question.`)
    }
    return {
      statement: requireString(q.statement, `${label} : l'énoncé`, 20000),
      type: q.type,
      content: q.content ?? null,
      questionPosition: Number.isInteger(q.questionPosition) ? q.questionPosition : 1,
      responses: responses.map((r) => ({
        content: requireString(r?.content, `${label} : une réponse`, 2000),
        correction: Boolean(r?.correction)
      }))
    }
  }

  /**
   * Importe le contenu d'un export dans le compte de l'utilisateur connecté.
   * Tout est créé comme nouveau contenu appartenant à l'utilisateur : rien n'est écrasé,
   * et le profil, le rôle et les identifiants ne sont jamais modifiés. Opération atomique.
   *
   * @param {number} userId - Identifiant de l'utilisateur connecté
   * @param {object} payload - Document d'export (voir exportUserData)
   * @returns {Promise<{systems: number, cards: number, mindMaps: number, skipped: string[]}>} Bilan
   * @throws {ImportValidationError} Si le fichier est invalide
   */
  async importUserData(userId, payload) {
    const { systems, mindMaps } = this.validateImportPayload(payload)
    const skipped = []
    let cardCount = 0
    let systemCount = 0
    let mindMapCount = 0

    const t = await instance.transaction()
    try {
      const subjectCache = new Map()
      const resolveSubject = async (name) => {
        if (!name) return null
        if (!subjectCache.has(name)) {
          // CHOIX: les matières sont rapprochées par nom, jamais créées par l'import
          // RAISON: ce sont des référentiels partagés par toute la plateforme
          const subject = await Subject.findOne({ where: { name }, transaction: t })
          subjectCache.set(name, subject?.subjectId ?? null)
        }
        return subjectCache.get(name)
      }
      const resolveTags = async (tags) => {
        const found = []
        for (const { name, color } of tags) {
          const [tag] = await Tag.findOrCreate({
            where: { name },
            defaults: color ? { name, color } : { name },
            transaction: t
          })
          found.push(tag)
        }
        return found
      }

      for (const s of systems) {
        const subjectId = await resolveSubject(s.subject)
        const system = await LeitnerSystem.create(
          { name: s.name, sujet: s.sujet, idUser: userId, subjectId },
          { transaction: t }
        )
        systemCount += 1

        const boxesByLevel = new Map()
        for (const box of s.boxes) {
          const created = await LeitnerBox.create(
            { ...this._boxDefaults(box.level), idSystem: system.idSystem },
            { transaction: t }
          )
          boxesByLevel.set(box.level, created)
        }
        await system.setTags(await resolveTags(s.tags), { transaction: t })

        for (const box of s.boxes) {
          for (const card of box.cards) {
            const question = await Question.create(
              {
                statement: card.statement,
                type: card.type,
                content: card.content,
                questionPosition: card.questionPosition
              },
              { transaction: t }
            )
            if (card.responses.length) {
              await Response.bulkCreate(
                card.responses.map((r) => ({ ...r, idQuestion: question.idQuestion })),
                { transaction: t }
              )
            }
            const leitnerCard = await LeitnerCard.create(
              { idQuestion: question.idQuestion, idBox: boxesByLevel.get(box.level).idBox },
              { transaction: t }
            )
            await CardSystem.create({ idCard: leitnerCard.idCard, idSystem: system.idSystem }, { transaction: t })
            cardCount += 1
          }
        }
      }

      for (const m of mindMaps) {
        const subjectId = await resolveSubject(m.subject)
        if (!subjectId) {
          skipped.push(`Carte mentale « ${m.name} » : matière « ${m.subject ?? 'non renseignée'} » introuvable.`)
          continue
        }
        const map = await Diagramme.create(
          { mmName: m.name, mindMapJson: m.mindMapJson, userId, subjectId },
          { transaction: t }
        )
        await map.setTags(await resolveTags(m.tags), { transaction: t })
        mindMapCount += 1
      }

      await t.commit()
    } catch (err) {
      await t.rollback()
      logger.error(`Import de données refusé pour l'utilisateur ${userId} : ${err?.message || err}`)
      throw err
    }

    return { systems: systemCount, cards: cardCount, mindMaps: mindMapCount, skipped }
  }

  _boxDefaults(level) {
    // Intervalles par défaut des boîtes (en secondes), repris de LeitnerSystem.service.js
    const DEFAULTS = [
      { intervall: 86400, color: 0xe40101 },
      { intervall: 259200, color: 0xfb9609 },
      { intervall: 604800, color: 0x01b207 },
      { intervall: 1209600, color: 0x0affce },
      { intervall: 2592000, color: 0x001eff }
    ]
    const base = DEFAULTS[Math.min(level, DEFAULTS.length) - 1]
    return { level, ...base }
  }
}

module.exports = new UserDataExportService()
module.exports.ImportValidationError = ImportValidationError
