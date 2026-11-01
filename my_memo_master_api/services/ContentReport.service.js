const { Op } = require('sequelize')
const dayjs = require('dayjs')
const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { s3Client, bucket } = require('../config/storage.config')
const {
  instance: sequelize,
  ContentReport,
  ClassGroupResource,
  ClassGroupSection,
  ClassGroupUsers,
  ClassGroup,
  Etablissement,
  User,
  AuditLog
} = require('../models/index')
const AuditLogService = require('./AuditLog.service')
const UserService = require('./User.service')
const sendEmail = require('../helpers/sendEmail')
const logger = require('../helpers/logger')

// Règles de modération : voir diagrams/moderation_rules.md.
const REASONS = ['illegal', 'harassment', 'copyright', 'spam', 'personal_data', 'other']
const CONTENT_TYPES = ['resource', 'section']
const STATUSES = ['pending', 'in_review', 'hidden', 'dismissed', 'actioned']
const OPEN_STATUSES = ['pending', 'in_review', 'hidden']
const WORKABLE_STATUSES = ['pending', 'in_review']

const HIDE_DAYS = 30
const DAILY_REPORT_LIMIT = 10
const HIGH_PRIORITY_REPORTERS = 3
const OVERDUE_HOURS = 72
const OVERDUE_HOURS_HIGH = 24
const IMMINENT_PURGE_DAYS = 23
const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20
const CONTACT_EMAIL = process.env.SUPPORT_EMAIL || 'support@my-memo-master.com'

const REASON_LABELS = {
  illegal: 'contenu illégal',
  harassment: 'harcèlement ou insulte',
  copyright: "droits d'auteur",
  spam: 'spam ou publicité',
  personal_data: 'données personnelles',
  other: 'autre motif'
}

const CONTENT_LABELS = { resource: 'la ressource', section: 'la section' }
const REMOVED_ACTIONS = { resource: 'CONTENT_RESOURCE_REMOVED', section: 'CONTENT_SECTION_REMOVED' }
const ENTITY_TYPES = { resource: 'ClassGroupResource', section: 'ClassGroupSection' }

const modelFor = (contentType) => (contentType === 'resource' ? ClassGroupResource : ClassGroupSection)
const contentKey = (contentType, contentId) => `${contentType}:${contentId}`

/**
 * Retourne la valeur de configuration de rétention des dossiers (jours).
 *
 * @returns {number}
 */
const retentionDays = () => parseInt(process.env.CONTENT_REPORT_RETENTION_DAYS, 10) || 365

class ContentReportService {
  // ── Utilitaires internes ─────────────────────────────────────────────────

  /**
   * Copie des champs utiles du contenu, conservée pour le dossier une fois le contenu supprimé.
   *
   * @param {'resource'|'section'} contentType
   * @param {object} content
   * @returns {object}
   */
  _snapshot(contentType, content) {
    if (contentType === 'resource') {
      return {
        title: content.title,
        type: content.type,
        description: content.description ?? null,
        url: content.url ?? null,
        originalName: content.originalName ?? null,
        mimeType: content.mimeType ?? null
      }
    }
    return {
      title: content.title,
      type: content.type,
      description: content.description ?? null,
      dueDate: content.dueDate ?? null
    }
  }

  /**
   * Journalise une action de modération sans jamais bloquer le traitement.
   */
  async _audit(actorId, action, entityType, entityId, metadata) {
    try {
      await AuditLogService.log(actorId, action, entityType, entityId, metadata)
    } catch (err) {
      logger.warn(`Audit log échoué (${action}): ${err?.message}`)
    }
  }

  /**
   * Supprime un contenu et son fichier de stockage (échec du stockage journalisé, non bloquant).
   */
  async _destroyContent(contentType, content) {
    if (contentType === 'resource' && content.fileKey && bucket) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: content.fileKey }))
      } catch (err) {
        logger.warn(`[ContentReport] Impossible de supprimer le fichier ${content.fileKey}: ${err?.message}`)
      }
    }
    await content.destroy()
  }

  /**
   * Identifiants des groupes que le demandeur peut modérer.
   * Rôles 1 et 5 : tous (null). Rôle 4 : groupes de son établissement (périmètre S-04.06).
   *
   * @param {{id:number, roleId:number}} requester
   * @param {number} [etablissementId] - Filtre optionnel (rôles 1 et 5)
   * @returns {Promise<number[]|null>} null = aucun filtre de périmètre
   */
  async _scopeGroupIds(requester, etablissementId) {
    let adminId = null
    if (requester.roleId === 4) {
      const etab = await Etablissement.findOne({ where: { adminId: requester.id }, attributes: ['id', 'adminId'] })
      if (!etab) return []
      adminId = etab.adminId
    } else if (etablissementId) {
      const etab = await Etablissement.findByPk(etablissementId, { attributes: ['id', 'adminId'] })
      if (!etab || !etab.adminId) return []
      adminId = etab.adminId
    } else {
      return null
    }
    const groups = await ClassGroup.findAll({ where: { createdBy: adminId }, attributes: ['id'] })
    return groups.map((g) => g.id)
  }

  /**
   * Indique si un dossier est dans le périmètre du demandeur.
   */
  async _inScope(report, requester) {
    const groupIds = await this._scopeGroupIds(requester)
    if (groupIds === null) return true
    return report.classGroupId != null && groupIds.includes(report.classGroupId)
  }

  /**
   * Charge un dossier pour une action de traitement : périmètre + interdiction de juger son propre contenu.
   *
   * @returns {Promise<{report: object, content: object|null}|{error: string}>}
   */
  async _loadForAction(id, requester) {
    const report = await ContentReport.findByPk(id)
    if (!report || !(await this._inScope(report, requester))) return { error: 'not_found' }
    const content = await modelFor(report.contentType).findByPk(report.contentId)
    const authorId = content?.createdBy ?? report.authorId
    if (authorId === requester.id) return { error: 'own_report' }
    return { report, content }
  }

  _siblings(report, statuses, transaction) {
    return ContentReport.findAll({
      where: { contentType: report.contentType, contentId: report.contentId, status: { [Op.in]: statuses } },
      transaction
    })
  }

  async _updateSiblings(report, fromStatuses, values, transaction) {
    await ContentReport.update(values, {
      where: { contentType: report.contentType, contentId: report.contentId, status: { [Op.in]: fromStatuses } },
      transaction
    })
  }

  // ── Notifications (best effort) ──────────────────────────────────────────

  async _send(userIds, subject, buildText) {
    const ids = [...new Set(userIds.filter(Boolean))]
    if (ids.length === 0) return
    try {
      const users = await User.findAll({ where: { userId: { [Op.in]: ids } }, attributes: ['userId', 'name', 'email'] })
      await Promise.allSettled(
        users.filter((u) => u.email).map((u) => sendEmail(subject, buildText(u), u.email))
      )
    } catch (err) {
      logger.warn(`[ContentReport] Notification échouée (${subject}): ${err?.message}`)
    }
  }

  /**
   * Prévient l'auteur d'une restriction (article 17 du DSA : fait visé, motif, décision, recours).
   * Ne cite ni le signalant ni son commentaire.
   */
  async _notifyAuthor(report, decision, purgeAt) {
    if (!report.authorId) return
    const title = report.contentSnapshot?.title || 'sans titre'
    const label = CONTENT_LABELS[report.contentType]
    const lines = [
      'Bonjour,',
      '',
      `Suite à un signalement (motif : ${REASON_LABELS[report.reason]}), ${label} « ${title} » a été ${decision === 'hidden' ? 'masquée' : 'supprimée définitivement'} par la modération de MyMemoMaster.`
    ]
    if (decision === 'hidden') {
      lines.push(
        '',
        `Elle n'est plus visible des autres membres de votre groupe. Si elle n'est pas rétablie, elle sera supprimée définitivement le ${dayjs(purgeAt).format('DD/MM/YYYY')}.`
      )
    }
    lines.push('', `Pour contester cette décision, écrivez-nous à ${CONTACT_EMAIL} en citant le titre du contenu.`)
    await this._send([report.authorId], 'MyMemoMaster — décision de modération sur votre contenu', () => lines.join('\n'))
  }

  /**
   * Prévient l'auteur de la suspension de son compte (article 17 du DSA : fait visé, motif, recours).
   */
  async _notifyAuthorSuspended(report) {
    if (!report.authorId) return
    const title = report.contentSnapshot?.title || 'sans titre'
    const text = [
      'Bonjour,',
      '',
      `Suite à un signalement (motif : ${REASON_LABELS[report.reason]}) portant sur ${CONTENT_LABELS[report.contentType]} « ${title} », votre compte MyMemoMaster a été suspendu par la modération.`,
      '',
      `Pour contester cette décision, écrivez-nous à ${CONTACT_EMAIL}.`
    ].join('\n')
    await this._send([report.authorId], 'MyMemoMaster — suspension de votre compte', () => text)
  }

  /**
   * Informe les signalants de la décision (article 16 du DSA), sans information sur l'auteur.
   */
  async _notifyReporters(reports, decision) {
    const outcomes = {
      dismissed: "Après examen, aucune suite n'a été donnée à votre signalement.",
      hidden: 'Après examen, le contenu signalé a été masqué.',
      actioned: 'Après examen, le contenu signalé a été supprimé.'
    }
    await this._send(
      reports.map((r) => r.reporterId),
      'MyMemoMaster — suite donnée à votre signalement',
      () => `Bonjour,\n\nMerci pour votre signalement. ${outcomes[decision]}\n\nUne question : ${CONTACT_EMAIL}`
    )
  }

  // ── Signalement ──────────────────────────────────────────────────────────

  /**
   * Crée un signalement sur un contenu visible par le signalant.
   *
   * @param {number} reporterId
   * @param {{contentType: 'resource'|'section', contentId: number, reason: string, comment?: string}} data
   * @returns {Promise<{data: object}|{error: 'not_found'|'forbidden'|'own_content'|'already_hidden'|'duplicate'|'rate_limited'}>}
   */
  async create(reporterId, data) {
    const { contentType, contentId, reason, comment } = data
    const content = await modelFor(contentType).findByPk(contentId)
    if (!content) return { error: 'not_found' }

    const user = await User.findByPk(reporterId, { attributes: ['roleId'] })
    const privileged = [1, 4].includes(user?.roleId)
    if (!privileged) {
      const membership = await ClassGroupUsers.findOne({ where: { classGroupId: content.classGroupId, userId: reporterId } })
      if (!membership) return { error: 'forbidden' }
      // Un contenu masqué n'est visible que de son auteur : pour les autres, il n'existe plus.
      if (content.hiddenAt && content.createdBy !== reporterId) return { error: 'not_found' }
    }
    if (content.createdBy === reporterId) return { error: 'own_content' }
    if (content.hiddenAt) return { error: 'already_hidden' }

    const open = await ContentReport.findOne({
      where: { reporterId, contentType, contentId, status: { [Op.in]: OPEN_STATUSES } }
    })
    if (open) return { error: 'duplicate' }

    const recent = await ContentReport.count({
      where: { reporterId, createdAt: { [Op.gte]: dayjs().subtract(24, 'hour').toDate() } }
    })
    if (recent >= DAILY_REPORT_LIMIT) return { error: 'rate_limited' }

    const report = await ContentReport.create({
      contentType,
      contentId,
      classGroupId: content.classGroupId,
      reporterId,
      authorId: content.createdBy,
      reason,
      comment: comment || null,
      status: 'pending',
      contentSnapshot: this._snapshot(contentType, content)
    })
    await this._audit(reporterId, 'CONTENT_REPORT_CREATED', 'ContentReport', report.id, { contentType, contentId, reason })
    return { data: report }
  }

  // ── File de traitement ───────────────────────────────────────────────────

  /**
   * Priorité calculée d'un contenu signalé : haute si motif illégal ou au moins 3 signalants distincts.
   */
  _priority(reports) {
    const reporters = new Set(reports.map((r) => r.reporterId))
    const illegal = reports.some((r) => r.reason === 'illegal')
    return illegal || reporters.size >= HIGH_PRIORITY_REPORTERS ? 'high' : 'normal'
  }

  _aggregateStatus(reports) {
    for (const status of ['hidden', 'in_review', 'pending']) {
      if (reports.some((r) => r.status === status)) return status
    }
    return reports[0].status
  }

  /**
   * Liste la file de traitement : une ligne par contenu signalé, regroupant ses signalements.
   *
   * @param {{id:number, roleId:number}} requester
   * @param {{status?: string, reason?: string, contentType?: string, etablissementId?: number, page?: number, limit?: number}} [filters]
   * @returns {Promise<{items: object[], total: number, page: number, limit: number}>}
   */
  async findAll(requester, filters = {}) {
    const { status, reason, contentType, etablissementId } = filters
    const page = Math.max(1, parseInt(filters.page, 10) || 1)
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(filters.limit, 10) || DEFAULT_PAGE_SIZE))

    const where = { status: status ? status : { [Op.in]: OPEN_STATUSES } }
    if (reason) where.reason = reason
    if (contentType) where.contentType = contentType
    // Personne ne voit dans sa file les signalements visant son propre contenu.
    where[Op.or] = [{ authorId: null }, { authorId: { [Op.ne]: requester.id } }]

    const groupIds = await this._scopeGroupIds(requester, requester.roleId === 4 ? undefined : etablissementId)
    if (groupIds !== null) {
      if (groupIds.length === 0) return { items: [], total: 0, page, limit }
      where.classGroupId = { [Op.in]: groupIds }
    }

    const reports = await ContentReport.findAll({
      where,
      include: [{ model: User, as: 'author', attributes: ['userId', 'name'] }],
      order: [['createdAt', 'ASC']]
    })

    const groups = new Map()
    for (const r of reports) {
      const key = contentKey(r.contentType, r.contentId)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(r)
    }

    const now = dayjs()
    const items = [...groups.values()].map((list) => {
      const first = list[0]
      const priority = this._priority(list)
      const aggregate = this._aggregateStatus(list)
      const purgeAt = list.find((r) => r.purgeAt)?.purgeAt || null
      const ageHours = now.diff(dayjs(first.createdAt), 'hour')
      const open = WORKABLE_STATUSES.includes(aggregate)
      return {
        id: first.id,
        reportIds: list.map((r) => r.id),
        contentType: first.contentType,
        contentId: first.contentId,
        classGroupId: first.classGroupId,
        author: first.author ? { userId: first.author.userId, name: first.author.name } : null,
        status: aggregate,
        priority,
        reportCount: list.length,
        reporterCount: new Set(list.map((r) => r.reporterId)).size,
        reasons: [...new Set(list.map((r) => r.reason))],
        contentSnapshot: first.contentSnapshot,
        oldestAt: first.createdAt,
        overdue: open && ageHours >= (priority === 'high' ? OVERDUE_HOURS_HIGH : OVERDUE_HOURS),
        purgeAt,
        daysLeft: purgeAt ? Math.max(0, dayjs(purgeAt).diff(now, 'day')) : null,
        purgeImminent: purgeAt ? dayjs(purgeAt).diff(now, 'day') <= HIDE_DAYS - IMMINENT_PURGE_DAYS : false
      }
    })

    const rank = (s) => (OPEN_STATUSES.includes(s) ? 0 : 1)
    items.sort((a, b) => {
      if (status === 'hidden') return dayjs(a.purgeAt).valueOf() - dayjs(b.purgeAt).valueOf()
      if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status)
      if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1
      return dayjs(a.oldestAt).valueOf() - dayjs(b.oldestAt).valueOf()
    })

    const total = items.length
    return { items: items.slice((page - 1) * limit, page * limit), total, page, limit }
  }

  /**
   * Détail d'un dossier : tous les signalements du même contenu et le contenu actuel s'il existe.
   *
   * @param {number} id
   * @param {{id:number, roleId:number}} requester
   * @returns {Promise<{data: object}|{error: string}>}
   */
  async findOne(id, requester) {
    const loaded = await this._loadForAction(id, requester)
    if (loaded.error) return loaded
    const { report, content } = loaded
    const reports = await ContentReport.findAll({
      where: { contentType: report.contentType, contentId: report.contentId },
      include: [
        { model: User, as: 'reporter', attributes: ['userId', 'name'] },
        { model: User, as: 'handler', attributes: ['userId', 'name'] }
      ],
      order: [['createdAt', 'ASC']]
    })
    const author = report.authorId
      ? await User.findByPk(report.authorId, { attributes: ['userId', 'name', 'isActive'] })
      : null
    return { data: { report, reports, content, author } }
  }

  // ── Actions du modérateur ────────────────────────────────────────────────

  /**
   * Prend en charge un contenu signalé (tous ses signalements en attente).
   *
   * @returns {Promise<{data: object}|{error: string}>}
   */
  async claim(id, requester) {
    const loaded = await this._loadForAction(id, requester)
    if (loaded.error) return loaded
    const { report } = loaded
    if (!WORKABLE_STATUSES.includes(report.status)) return { error: 'conflict' }
    await this._updateSiblings(report, WORKABLE_STATUSES, { status: 'in_review', handledBy: requester.id })
    await this._audit(requester.id, 'CONTENT_REPORT_CLAIMED', 'ContentReport', report.id)
    return { data: await ContentReport.findByPk(id) }
  }

  /**
   * Rejette un signalement : le contenu respecte les règles et reste inchangé.
   *
   * @param {number} id
   * @param {{id:number, roleId:number}} requester
   * @param {string} decisionNote - Motif de la décision
   * @returns {Promise<{data: object}|{error: string}>}
   */
  async dismiss(id, requester, decisionNote) {
    const loaded = await this._loadForAction(id, requester)
    if (loaded.error) return loaded
    const { report } = loaded
    if (!WORKABLE_STATUSES.includes(report.status)) return { error: 'conflict' }

    const siblings = await this._siblings(report, WORKABLE_STATUSES)
    await this._updateSiblings(report, WORKABLE_STATUSES, {
      status: 'dismissed', handledBy: requester.id, decisionNote, resolvedAt: new Date()
    })
    await this._audit(requester.id, 'CONTENT_REPORT_DISMISSED', 'ContentReport', report.id, { count: siblings.length })
    await this._notifyReporters(siblings, 'dismissed')
    return { data: await ContentReport.findByPk(id) }
  }

  /**
   * Masque le contenu pendant 30 jours au plus ; passé ce délai il est supprimé par le job de purge.
   *
   * @param {number} id
   * @param {{id:number, roleId:number}} requester
   * @param {string} decisionNote - Motif de la décision
   * @returns {Promise<{data: object}|{error: string}>}
   */
  async hide(id, requester, decisionNote) {
    const loaded = await this._loadForAction(id, requester)
    if (loaded.error) return loaded
    const { report, content } = loaded
    if (!WORKABLE_STATUSES.includes(report.status) || !content || content.hiddenAt) return { error: 'conflict' }

    const now = new Date()
    const purgeAt = dayjs(now).add(HIDE_DAYS, 'day').toDate()
    const siblings = await this._siblings(report, WORKABLE_STATUSES)

    await sequelize.transaction(async (transaction) => {
      await content.update({ hiddenAt: now, hiddenBy: requester.id }, { transaction })
      await this._updateSiblings(report, WORKABLE_STATUSES, {
        status: 'hidden', handledBy: requester.id, decisionNote, hiddenAt: now, purgeAt
      }, transaction)
    })

    await this._audit(requester.id, 'CONTENT_REPORT_HIDDEN', 'ContentReport', report.id, {
      contentType: report.contentType, contentId: report.contentId, purgeAt
    })
    await this._notifyAuthor(report, 'hidden', purgeAt)
    await this._notifyReporters(siblings, 'hidden')
    return { data: await ContentReport.findByPk(id) }
  }

  /**
   * Rétablit un contenu masqué ; ses signalements passent à « rejeté ».
   *
   * @returns {Promise<{data: object}|{error: string}>}
   */
  async restore(id, requester) {
    const loaded = await this._loadForAction(id, requester)
    if (loaded.error) return loaded
    const { report, content } = loaded
    if (report.status !== 'hidden') return { error: 'conflict' }

    const siblings = await this._siblings(report, ['hidden'])
    await sequelize.transaction(async (transaction) => {
      if (content) await content.update({ hiddenAt: null, hiddenBy: null }, { transaction })
      await this._updateSiblings(report, ['hidden'], {
        status: 'dismissed', handledBy: requester.id, decisionNote: 'Contenu rétabli', resolvedAt: new Date(), purgeAt: null
      }, transaction)
    })

    await this._audit(requester.id, 'CONTENT_REPORT_RESTORED', 'ContentReport', report.id, {
      contentType: report.contentType, contentId: report.contentId
    })
    await this._notifyReporters(siblings, 'dismissed')
    return { data: await ContentReport.findByPk(id) }
  }

  /**
   * Supprime définitivement le contenu (y compris s'il est masqué) et clôt ses signalements.
   *
   * @param {number} id
   * @param {{id:number, roleId:number}} requester
   * @param {string} decisionNote - Motif de la décision
   * @returns {Promise<{data: object}|{error: string}>}
   */
  async removeContent(id, requester, decisionNote) {
    const loaded = await this._loadForAction(id, requester)
    if (loaded.error) return loaded
    const { report, content } = loaded
    if (!OPEN_STATUSES.includes(report.status)) return { error: 'conflict' }

    const siblings = await this._siblings(report, OPEN_STATUSES)
    if (content) await this._destroyContent(report.contentType, content)
    await this._updateSiblings(report, OPEN_STATUSES, {
      status: 'actioned', handledBy: requester.id, decisionNote, resolvedAt: new Date(), purgeAt: null
    })

    await this._audit(requester.id, REMOVED_ACTIONS[report.contentType], ENTITY_TYPES[report.contentType], report.contentId, {
      classGroupId: report.classGroupId, reportId: report.id
    })
    await this._audit(requester.id, 'CONTENT_REPORT_ACTIONED', 'ContentReport', report.id, {
      contentType: report.contentType, contentId: report.contentId
    })
    await this._notifyAuthor(report, 'actioned')
    await this._notifyReporters(siblings, 'actioned')
    return { data: await ContentReport.findByPk(id) }
  }

  /**
   * Suspend le compte de l'auteur du contenu signalé (rôles 1 et 4 uniquement), sans clore le dossier :
   * le contenu reste à traiter (masquage ou retrait). Réutilise `UserService.setActive`, qui refuse
   * l'auto-suspension et la suspension d'un admin plateforme par un autre, et révoque les jetons.
   *
   * @param {number} id
   * @param {{id:number, roleId:number}} requester
   * @param {string} decisionNote - Motif de la décision
   * @returns {Promise<{data: object}|{error: string}>}
   */
  async suspendAuthor(id, requester, decisionNote) {
    if (![1, 4].includes(requester.roleId)) return { error: 'target_forbidden' }
    const loaded = await this._loadForAction(id, requester)
    if (loaded.error) return loaded
    const { report, content } = loaded
    if (!OPEN_STATUSES.includes(report.status)) return { error: 'conflict' }

    const authorId = content?.createdBy ?? report.authorId
    const author = authorId ? await User.findByPk(authorId, { attributes: ['userId', 'isActive'] }) : null
    if (!author) return { error: 'author_gone' }
    if (author.isActive === false) return { error: 'already_suspended' }

    const result = await UserService.setActive(authorId, false, requester.roleId, requester.id)
    if (result === false || result === null) return { error: 'target_forbidden' }

    await this._audit(requester.id, 'CONTENT_REPORT_AUTHOR_SUSPENDED', 'ContentReport', report.id, {
      authorId, contentType: report.contentType, contentId: report.contentId, decisionNote
    })
    await this._notifyAuthorSuspended(report)
    return { data: await ContentReport.findByPk(id) }
  }

  // ── Cycle de vie du contenu ──────────────────────────────────────────────

  /**
   * Clôt les signalements ouverts d'un contenu supprimé par une autre voie (auteur, admin d'établissement).
   * Ne bloque jamais la suppression : l'échec est journalisé.
   *
   * @param {'resource'|'section'} contentType
   * @param {number} contentId
   * @returns {Promise<void>}
   */
  async closeForDeletedContent(contentType, contentId) {
    try {
      await ContentReport.update(
        { status: 'actioned', decisionNote: 'Contenu supprimé', resolvedAt: new Date(), purgeAt: null },
        { where: { contentType, contentId: Number(contentId), status: { [Op.in]: OPEN_STATUSES } } }
      )
    } catch (err) {
      logger.warn(`[ContentReport] Clôture des signalements du contenu ${contentType}:${contentId} échouée: ${err?.message}`)
    }
  }

  /**
   * Indique si un fichier de ressource est accessible à l'utilisateur : un fichier de ressource masquée
   * n'est servi qu'à son auteur et aux rôles 1 et 4.
   *
   * @param {string} fileKey
   * @param {number} userId
   * @returns {Promise<boolean>}
   */
  async canAccessFile(fileKey, userId) {
    const hidden = await ClassGroupResource.findOne({
      where: { fileKey, hiddenAt: { [Op.ne]: null } },
      attributes: ['createdBy']
    })
    if (!hidden) return true
    if (hidden.createdBy === userId) return true
    const user = await User.findByPk(userId, { attributes: ['roleId'] })
    return [1, 4, 5].includes(user?.roleId)
  }

  // ── Tâches planifiées ────────────────────────────────────────────────────

  /**
   * Supprime définitivement les contenus masqués dont l'échéance est dépassée.
   *
   * @param {Date} [now]
   * @returns {Promise<{purged: number, failed: number}>}
   */
  async purgeExpired(now = new Date()) {
    const due = await ContentReport.findAll({
      where: { status: 'hidden', purgeAt: { [Op.lte]: now } },
      order: [['id', 'ASC']]
    })
    const groups = new Map()
    for (const r of due) {
      const key = contentKey(r.contentType, r.contentId)
      if (!groups.has(key)) groups.set(key, r)
    }

    let purged = 0
    let failed = 0
    for (const report of groups.values()) {
      try {
        const content = await modelFor(report.contentType).findByPk(report.contentId)
        if (content) await this._destroyContent(report.contentType, content)
        await this._updateSiblings(report, ['hidden'], {
          status: 'actioned', decisionNote: 'Suppression automatique après 30 jours de masquage', resolvedAt: now, purgeAt: null
        })
        await this._audit(null, 'CONTENT_REPORT_PURGED', 'ContentReport', report.id, {
          contentType: report.contentType, contentId: report.contentId
        })
        purged += 1
      } catch (err) {
        failed += 1
        logger.error(`[ContentReport] Purge du contenu ${report.contentType}:${report.contentId} échouée: ${err?.message}`)
      }
    }
    return { purged, failed }
  }

  /**
   * Supprime les dossiers clos depuis plus d'un an (CONTENT_REPORT_RETENTION_DAYS) et leurs entrées d'audit.
   *
   * @param {Date} [now]
   * @returns {Promise<{reports: number, auditLogs: number}>}
   */
  async purgeOldReports(now = new Date()) {
    const cutoff = dayjs(now).subtract(retentionDays(), 'day').toDate()
    const reports = await ContentReport.destroy({
      where: { status: { [Op.in]: ['dismissed', 'actioned'] }, resolvedAt: { [Op.lt]: cutoff } }
    })
    const auditLogs = await AuditLog.destroy({
      where: { entityType: 'ContentReport', createdAt: { [Op.lt]: cutoff } }
    })
    return { reports, auditLogs }
  }
}

module.exports = new ContentReportService()
module.exports.REASONS = REASONS
module.exports.CONTENT_TYPES = CONTENT_TYPES
module.exports.STATUSES = STATUSES
module.exports.HIDE_DAYS = HIDE_DAYS
module.exports.DAILY_REPORT_LIMIT = DAILY_REPORT_LIMIT
