const dayjs = require('dayjs')
const {
  User,
  Subject,
  Tag,
  LeitnerSystem,
  LeitnerBox,
  LeitnerCard,
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
const { normalizeText, isIdenticalMindMap, isSameMindMapLineage, mergeMindMapJson } = require('../helpers/mindMapMerge')

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
              include: [{ model: Question, as: 'question' }]
            }
          ]
        }
      ],
      order: [['idSystem', 'ASC']]
    })

    const plainSystems = systems.map(plain)
    const questionIds = plainSystems.flatMap((system) =>
      (system.leitnerBoxes || []).flatMap((box) => (box.leitnerCards || []).map((card) => card.question?.idQuestion))
    )
    const responsesByQuestion = await this._loadResponses(questionIds)

    return plainSystems.map((system) => {
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
                    responses: responsesByQuestion.get(card.question.idQuestion) || []
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

  // CHOIX: requête dédiée sur Response plutôt que l'include `Question.response`
  // RAISON: cette association est un hasOne (un seul objet) alors qu'une question peut avoir
  // plusieurs réponses (QCM) : l'include en perdrait et ne renvoie pas un tableau
  async _loadResponses(questionIds, transaction) {
    const ids = [...new Set(questionIds.filter((id) => id != null))]
    const byQuestion = new Map()
    if (!ids.length) return byQuestion
    const rows = await Response.findAll({
      where: { idQuestion: ids },
      order: [['idResponse', 'ASC']],
      raw: true,
      transaction
    })
    for (const row of rows) {
      if (!byQuestion.has(row.idQuestion)) byQuestion.set(row.idQuestion, [])
      byQuestion.get(row.idQuestion).push({ content: row.content, correction: Boolean(row.correction) })
    }
    return byQuestion
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
        { model: Question, as: 'question', through: { attributes: [] } }
      ]
    })
    const plainTests = tests.map(plain)
    const responsesByQuestion = await this._loadResponses(
      plainTests.flatMap((test) => (test.question || []).map((q) => q.idQuestion))
    )
    return plainTests.map((test) => {
      return {
        name: test.name,
        subject: test.subject?.name ?? null,
        createdAt: test.createdAt,
        questions: (test.question || []).map((q) => ({
          statement: q.statement,
          type: q.type,
          content: q.content,
          responses: responsesByQuestion.get(q.idQuestion) || []
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
   * Importe le contenu d'un export dans le compte de l'utilisateur connecté, en le fusionnant avec
   * l'existant : un contenu strictement identique est laissé tel quel, un contenu déjà présent mais
   * moins complet reçoit les éléments manquants, un contenu inconnu est créé. Rien n'est jamais
   * modifié ni supprimé dans l'existant, et le profil, le rôle et les identifiants ne sont pas
   * touchés. Opération atomique.
   *
   * Rapprochement : un système Leitner est le même s'il a le même nom et la même matière ; une carte
   * Leitner est la même si elle a le même énoncé et le même type dans ce système ; une carte mentale
   * est la même si elle a le même nom, la même matière et la même origine (identifiant de carte ou
   * nœud racine).
   *
   * @param {number} userId - Identifiant de l'utilisateur connecté
   * @param {object} payload - Document d'export (voir exportUserData)
   * @returns {Promise<{created: object, merged: object, unchanged: object, added: object, skipped: string[]}>}
   *   Bilan : éléments créés, fusionnés (complétés), inchangés (identiques) et ajoutés, plus les ignorés
   * @throws {ImportValidationError} Si le fichier est invalide
   */
  async importUserData(userId, payload) {
    const { systems, mindMaps } = this.validateImportPayload(payload)
    const report = {
      created: { systems: 0, mindMaps: 0 },
      merged: { systems: 0, mindMaps: 0 },
      unchanged: { systems: 0, mindMaps: 0 },
      added: { cards: 0, responses: 0, tags: 0, nodes: 0, links: 0, zones: 0 },
      skipped: []
    }

    const t = await instance.transaction()
    try {
      const subjectCache = new Map()
      const ctx = {
        userId,
        t,
        report,
        resolveSubject: async (name) => {
          if (!name) return null
          if (!subjectCache.has(name)) {
            // CHOIX: les matières sont rapprochées par nom, jamais créées par l'import
            // RAISON: ce sont des référentiels partagés par toute la plateforme
            const subject = await Subject.findOne({ where: { name }, transaction: t })
            subjectCache.set(name, subject?.subjectId ?? null)
          }
          return subjectCache.get(name)
        },
        resolveTags: async (tags) => {
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
      }

      const knownSystems = await this._loadUserSystems(ctx)
      for (const s of systems) await this._mergeSystem(ctx, knownSystems, s)

      const knownMaps = await this._loadUserMindMaps(ctx)
      for (const m of mindMaps) await this._mergeMindMap(ctx, knownMaps, m)

      await t.commit()
    } catch (err) {
      await t.rollback()
      logger.error(`Import de données refusé pour l'utilisateur ${userId} : ${err?.message || err}`)
      throw err
    }

    return report
  }

  // Index des systèmes de l'utilisateur : de quoi rapprocher un système, ses cartes et ses tags
  async _loadUserSystems({ userId, t }) {
    const rows = await LeitnerSystem.findAll({
      where: { idUser: userId },
      include: [
        { model: Tag, as: 'tags', attributes: ['name'], through: { attributes: [] } },
        {
          model: LeitnerBox,
          as: 'leitnerBoxes',
          include: [{ model: LeitnerCard, as: 'leitnerCards', include: [{ model: Question, as: 'question' }] }]
        }
      ],
      transaction: t
    })
    const plainRows = rows.map(plain)
    const responses = await this._loadResponses(
      plainRows.flatMap((system) =>
        (system.leitnerBoxes || []).flatMap((box) => (box.leitnerCards || []).map((c) => c.question?.idQuestion))
      ),
      t
    )

    return rows.map((model, index) => {
      const system = plainRows[index]
      const entry = {
        model,
        idSystem: system.idSystem,
        nameKey: normalizeText(system.name),
        subjectId: system.subjectId ?? null,
        tagNames: new Set((system.tags || []).map((tag) => normalizeText(tag.name))),
        boxes: new Map((system.leitnerBoxes || []).map((box) => [box.level, box.idBox])),
        cards: new Map()
      }
      for (const box of system.leitnerBoxes || []) {
        for (const card of box.leitnerCards || []) {
          if (!card.question) continue
          const responseKeys = new Set(
            (responses.get(card.question.idQuestion) || []).map((r) => normalizeText(r.content))
          )
          entry.cards.set(this._cardKey(card.question), { idQuestion: card.question.idQuestion, responseKeys })
        }
      }
      return entry
    })
  }

  _cardKey({ statement, type }) {
    return `${normalizeText(statement)}|${type}`
  }

  async _boxIdForLevel({ t }, entry, level) {
    if (!entry.boxes.has(level)) {
      const box = await LeitnerBox.create({ ...this._boxDefaults(level), idSystem: entry.idSystem }, { transaction: t })
      entry.boxes.set(level, box.idBox)
    }
    return entry.boxes.get(level)
  }

  async _mergeSystem(ctx, knownSystems, incoming) {
    const { userId, t, report } = ctx
    const subjectId = await ctx.resolveSubject(incoming.subject)
    let entry = knownSystems.find((e) => e.nameKey === normalizeText(incoming.name) && e.subjectId === subjectId)
    const isNew = !entry
    let additions = 0

    if (isNew) {
      const model = await LeitnerSystem.create(
        { name: incoming.name, sujet: incoming.sujet, idUser: userId, subjectId },
        { transaction: t }
      )
      entry = {
        model,
        idSystem: model.idSystem,
        nameKey: normalizeText(incoming.name),
        subjectId,
        tagNames: new Set(),
        boxes: new Map(),
        cards: new Map()
      }
      knownSystems.push(entry)
      report.created.systems += 1
    }

    const newTags = (await ctx.resolveTags(incoming.tags)).filter((tag) => !entry.tagNames.has(normalizeText(tag.name)))
    if (newTags.length) {
      await entry.model.addTags(newTags, { transaction: t })
      newTags.forEach((tag) => entry.tagNames.add(normalizeText(tag.name)))
      report.added.tags += newTags.length
      additions += newTags.length
    }

    for (const box of incoming.boxes) {
      for (const card of box.cards) {
        const known = entry.cards.get(this._cardKey(card))
        if (known) {
          // Même question : on n'ajoute que les réponses qui lui manquent
          for (const response of card.responses) {
            const key = normalizeText(response.content)
            if (known.responseKeys.has(key)) continue
            await Response.create({ ...response, idQuestion: known.idQuestion }, { transaction: t })
            known.responseKeys.add(key)
            report.added.responses += 1
            additions += 1
          }
          continue
        }

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
        // CHOIX: pas d'écriture dans la table de jointure `cardSystems`
        // RAISON: LeitnerCard.service#create ne l'alimente pas non plus (la carte appartient au
        // système via sa boîte) ; son schéma diffère selon les bases (createdAt/updatedAt NOT NULL
        // en dev issu de `sync`, absents des migrations) et l'insertion y échouait en 500
        await LeitnerCard.create(
          { idQuestion: question.idQuestion, idBox: await this._boxIdForLevel(ctx, entry, box.level) },
          { transaction: t }
        )
        entry.cards.set(this._cardKey(card), {
          idQuestion: question.idQuestion,
          responseKeys: new Set(card.responses.map((r) => normalizeText(r.content)))
        })
        report.added.cards += 1
        additions += 1
      }
    }

    if (!isNew) report[additions > 0 ? 'merged' : 'unchanged'].systems += 1
  }

  async _loadUserMindMaps({ userId, t }) {
    const rows = await Diagramme.findAll({
      where: { userId },
      include: [{ model: Tag, as: 'tags', attributes: ['name'], through: { attributes: [] } }],
      transaction: t
    })
    return rows.map((model) => {
      const map = plain(model)
      let json = map.mindMapJson
      if (typeof json === 'string') {
        try {
          json = JSON.parse(json)
        } catch {
          json = null
        }
      }
      return {
        model,
        nameKey: normalizeText(map.mmName),
        subjectId: map.subjectId ?? null,
        json: isPlainObject(json) ? json : {},
        tagNames: new Set((map.tags || []).map((tag) => normalizeText(tag.name)))
      }
    })
  }

  async _mergeMindMap(ctx, knownMaps, incoming) {
    const { userId, t, report } = ctx
    const subjectId = await ctx.resolveSubject(incoming.subject)
    if (!subjectId) {
      report.skipped.push(
        `Carte mentale « ${incoming.name} » : matière « ${incoming.subject ?? 'non renseignée'} » introuvable.`
      )
      return
    }

    const entry = knownMaps.find(
      (e) =>
        e.nameKey === normalizeText(incoming.name) &&
        e.subjectId === subjectId &&
        isSameMindMapLineage(e.json, incoming.mindMapJson)
    )

    if (!entry) {
      const model = await Diagramme.create(
        { mmName: incoming.name, mindMapJson: incoming.mindMapJson, userId, subjectId },
        { transaction: t }
      )
      const tags = await ctx.resolveTags(incoming.tags)
      await model.addTags(tags, { transaction: t })
      knownMaps.push({
        model,
        nameKey: normalizeText(incoming.name),
        subjectId,
        json: incoming.mindMapJson,
        tagNames: new Set(tags.map((tag) => normalizeText(tag.name)))
      })
      report.created.mindMaps += 1
      return
    }

    let changed = false
    if (!isIdenticalMindMap(entry.json, incoming.mindMapJson)) {
      const merge = mergeMindMapJson(entry.json, incoming.mindMapJson)
      if (merge.changed) {
        await entry.model.update({ mindMapJson: merge.json }, { transaction: t })
        entry.json = merge.json
        report.added.nodes += merge.added.nodes
        report.added.links += merge.added.links
        report.added.zones += merge.added.zones
        changed = true
      }
    }

    const newTags = (await ctx.resolveTags(incoming.tags)).filter((tag) => !entry.tagNames.has(normalizeText(tag.name)))
    if (newTags.length) {
      await entry.model.addTags(newTags, { transaction: t })
      newTags.forEach((tag) => entry.tagNames.add(normalizeText(tag.name)))
      report.added.tags += newTags.length
      changed = true
    }

    report[changed ? 'merged' : 'unchanged'].mindMaps += 1
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
