const { spawn } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { Op } = require('sequelize')
const { PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3')
const { BackupRun, User } = require('../models/index')
const logger = require('../helpers/logger')
const sendEmail = require('../helpers/sendEmail')

const ADMIN_ROLE_ID = 1
const DEFAULT_HOUR_UTC = 3
const DEFAULT_KEEP = 14
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000
// Marge ajoutée au délai maximal avant de considérer qu'une exécution « en cours » a été interrompue (pod tué).
const STALE_MARGIN_MS = 5 * 60 * 1000
const MAX_HISTORY = 100
const MAX_ERROR_LENGTH = 2000
// Même préfixe et même nommage que le CronJob Helm (cronjob-backup.yaml) : la rétention est commune.
const NAME_PREFIX = 'mmm-'
const NAME_SUFFIX = '.dump'

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Exécute une commande sans shell et rejette si elle échoue (code ≠ 0, absente, délai dépassé).
 *
 * @param {string} command - Binaire à lancer (pg_dump, pg_restore)
 * @param {string[]} args - Arguments
 * @param {object} env - Variables d'environnement du processus
 * @param {number} timeoutMs - Délai maximal avant arrêt du processus
 * @returns {Promise<void>}
 */
const runCommand = (command, args, env, timeoutMs) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'ignore', 'pipe'], timeout: timeoutMs })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-MAX_ERROR_LENGTH)
    })
    child.on('error', (err) => {
      reject(err.code === 'ENOENT' ? new Error(`${command} est introuvable dans l'image de l'API.`) : err)
    })
    child.on('close', (code, signal) => {
      if (code === 0) return resolve()
      if (signal) return reject(new Error(`${command} interrompu (${signal}) : délai de ${Math.round(timeoutMs / 1000)} s dépassé ?`))
      reject(new Error(`${command} a échoué (code ${code}) : ${stderr.trim() || 'aucun détail'}`))
    })
  })

class BackupService {
  /**
   * Les sauvegardes passent par pg_dump : elles n'existent qu'avec PostgreSQL (la base SQLite de dev est un fichier).
   *
   * @returns {boolean}
   */
  isSupported() {
    // CHOIX: PG_HOST (comme models/index.js, qui choisit le dialecte avec) plutôt que sequelize.getDialect()
    // RAISON: ce test est évalué au chargement de app.js, avant toute connexion ; la valeur reste la même et
    //         ne dépend pas d'une instance Sequelize (absente ou mockée dans de nombreux tests).
    return Boolean(process.env.PG_HOST)
  }

  /**
   * Sauvegardes planifiées actives (désactivables par BACKUP_ENABLED=false).
   *
   * @returns {boolean}
   */
  isScheduleEnabled() {
    return this.isSupported() && process.env.BACKUP_ENABLED !== 'false'
  }

  /**
   * Heure UTC de la sauvegarde quotidienne (BACKUP_HOUR, 0 à 23, défaut 3).
   *
   * @returns {number}
   */
  getScheduleHourUtc() {
    const hour = Number.parseInt(process.env.BACKUP_HOUR, 10)
    return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_HOUR_UTC
  }

  /**
   * Prochain déclenchement planifié, ou null si la planification est désactivée.
   *
   * @param {Date} [now]
   * @returns {Date|null}
   */
  getNextRunAt(now = new Date()) {
    if (!this.isScheduleEnabled()) return null
    const next = new Date(now)
    next.setUTCHours(this.getScheduleHourUtc(), 0, 0, 0)
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
    return next
  }

  /**
   * Destination des dumps : le stockage S3 quand un bucket est configuré, sinon un dossier local.
   *
   * @returns {'s3'|'local'}
   */
  getDestination() {
    return process.env.S3_BUCKET ? 's3' : 'local'
  }

  _timeoutMs() {
    return toPositiveInt(process.env.BACKUP_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)
  }

  _keep() {
    return toPositiveInt(process.env.BACKUP_KEEP, DEFAULT_KEEP)
  }

  /**
   * Résumé pour l'écran d'administration : réglages, dernière exécution, dernier succès et dernier échec.
   *
   * @returns {Promise<object>}
   */
  async getStatus() {
    const [lastRun, lastSuccess, lastFailure, lastAuto] = await Promise.all([
      BackupRun.findOne({ order: [['startedAt', 'DESC']] }),
      BackupRun.findOne({ where: { status: 'success' }, order: [['startedAt', 'DESC']] }),
      BackupRun.findOne({ where: { status: 'failed' }, order: [['startedAt', 'DESC']] }),
      BackupRun.findOne({ where: { trigger: 'auto', status: ['success', 'failed'] }, order: [['startedAt', 'DESC']] })
    ])
    return {
      supported: this.isSupported(),
      scheduleEnabled: this.isScheduleEnabled(),
      scheduleHourUtc: this.getScheduleHourUtc(),
      nextRunAt: this.getNextRunAt(),
      destination: this.getDestination(),
      keep: this._keep(),
      running: lastRun?.status === 'running',
      lastRun,
      lastSuccess,
      lastFailure,
      lastAuto
    }
  }

  /**
   * Historique des exécutions, les plus récentes d'abord.
   *
   * @param {number|string} [limit=30] - Nombre d'entrées (1 à 100)
   * @returns {Promise<BackupRun[]>}
   */
  async findAll(limit) {
    const parsed = Number.parseInt(limit, 10)
    const safeLimit = Number.isFinite(parsed) ? Math.min(MAX_HISTORY, Math.max(1, parsed)) : 30
    return BackupRun.findAll({
      include: [{ model: User, as: 'author', attributes: ['userId', 'name'] }],
      order: [['startedAt', 'DESC']],
      limit: safeLimit
    })
  }

  /**
   * Lance une sauvegarde manuelle : réserve l'exécution puis la déroule en tâche de fond (un dump peut durer
   * plusieurs minutes, bien au-delà d'un délai HTTP raisonnable). L'avancement se lit via getStatus.
   *
   * @param {number} userId - Administrateur qui la déclenche
   * @returns {Promise<BackupRun>} L'exécution créée (statut running)
   * @throws {Error} code UNSUPPORTED (base non PostgreSQL) ou ALREADY_RUNNING (une sauvegarde est déjà en cours)
   */
  async startManual(userId) {
    if (!this.isSupported()) {
      const err = new Error('Les sauvegardes ne sont disponibles qu\'avec PostgreSQL.')
      err.code = 'UNSUPPORTED'
      throw err
    }
    const run = await this._claim({ trigger: 'manual', userId })
    if (!run) {
      const err = new Error('Une sauvegarde est déjà en cours.')
      err.code = 'ALREADY_RUNNING'
      throw err
    }
    // _execute ne rejette jamais : toute erreur y est consignée (base, logs, mail).
    this._execute(run)
    return run
  }

  /**
   * Sauvegarde planifiée. Plusieurs pods déclenchent le même cron : un seul obtient le créneau du jour
   * (contrainte d'unicité sur `slot`), les autres sortent sans rien faire.
   *
   * @param {Date} [now]
   * @returns {Promise<BackupRun|null>} L'exécution terminée, ou null si le créneau est pris ou la base non supportée
   */
  async runScheduled(now = new Date()) {
    if (!this.isScheduleEnabled()) return null
    const run = await this._claim({ trigger: 'auto', slot: `auto-${now.toISOString().slice(0, 10)}` })
    if (!run) {
      logger.info('[backup] Sauvegarde planifiée déjà prise en charge (autre pod ou exécution en cours).')
      return null
    }
    return this._execute(run)
  }

  /**
   * Réserve une exécution. Renvoie null si une autre est en cours ou si le créneau est déjà pris.
   */
  async _claim({ trigger, userId = null, slot = null }) {
    await this._failStaleRuns()
    if (await BackupRun.findOne({ where: { status: 'running' } })) return null
    try {
      return await BackupRun.create({ trigger, status: 'running', slot, triggeredBy: userId, startedAt: new Date() })
    } catch (error) {
      if (error?.name === 'SequelizeUniqueConstraintError') return null
      throw error
    }
  }

  /**
   * Une exécution restée « en cours » bien après le délai maximal a été interrompue (redémarrage du pod) :
   * on la clôt en échec pour ne pas bloquer les suivantes.
   */
  async _failStaleRuns() {
    const limit = new Date(Date.now() - this._timeoutMs() - STALE_MARGIN_MS)
    const stale = await BackupRun.findAll({ where: { status: 'running', startedAt: { [Op.lt]: limit } } })
    for (const run of stale) {
      await run.update({
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: 'Exécution interrompue (redémarrage du serveur ou délai dépassé).'
      })
      logger.error(`[backup] Sauvegarde n°${run.id} marquée en échec : exécution interrompue.`)
    }
  }

  /**
   * Déroule une sauvegarde réservée : dump, contrôle, envoi, rétention. Ne rejette jamais.
   */
  async _execute(run) {
    const startedAt = Date.now()
    const dumpPath = path.join(os.tmpdir(), `mmm-${run.id}${NAME_SUFFIX}`)
    try {
      const pgEnv = {
        ...process.env,
        PGHOST: process.env.PG_HOST,
        PGPORT: process.env.PG_PORT,
        PGUSER: process.env.PG_USER,
        PGPASSWORD: process.env.PG_PASS,
        PGDATABASE: process.env.PG_DB
      }
      await runCommand('pg_dump', ['-Fc', '-f', dumpPath], pgEnv, this._timeoutMs())
      // Un dump vide ou tronqué ne doit jamais être conservé : pg_restore -l lit tout l'index du dump.
      await runCommand('pg_restore', ['-l', dumpPath], pgEnv, this._timeoutMs())
      const { size } = await fs.promises.stat(dumpPath)
      if (size === 0) throw new Error('Le dump produit est vide.')

      const location = await this._store(dumpPath, size)
      const durationMs = Date.now() - startedAt
      await run.update({ status: 'success', finishedAt: new Date(), durationMs, sizeBytes: size, location })
      // CHOIX: logger.warn pour une réussite
      // RAISON: en production le logger ne laisse passer que warn et plus (helpers/logger.js) — un info disparaîtrait,
      //         or l'issue d'une sauvegarde doit rester lisible dans les logs du pod, succès compris.
      logger.warn(`[backup] Sauvegarde ${run.trigger} n°${run.id} réussie : ${location} (${size} octets, ${durationMs} ms)`)
    } catch (error) {
      const message = String(error?.message || error).slice(0, MAX_ERROR_LENGTH)
      logger.error(`[backup] Sauvegarde ${run.trigger} n°${run.id} en échec : ${message}`)
      try {
        await run.update({ status: 'failed', finishedAt: new Date(), durationMs: Date.now() - startedAt, errorMessage: message })
      } catch (updateError) {
        logger.error(`[backup] Impossible d'enregistrer l'échec de la sauvegarde n°${run.id} : ${updateError?.message || updateError}`)
      }
      await this._notifyFailure(run, message)
    } finally {
      await fs.promises.rm(dumpPath, { force: true })
    }
    return run
  }

  /**
   * Dépose le dump sur S3 (ou dans le dossier local) puis applique la rétention.
   *
   * @returns {Promise<string>} Clé S3 ou chemin du fichier
   */
  async _store(dumpPath, size) {
    const environment = process.env.ENVIRONMENT || 'dev'
    // 2026-10-22T03:00:00.123Z → 20261022T030000Z
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
    const fileName = `${NAME_PREFIX}${stamp}-${crypto.randomBytes(12).toString('hex')}${NAME_SUFFIX}`

    if (this.getDestination() === 's3') {
      const { s3Client, bucket } = require('../config/storage.config')
      const prefix = `backups/${environment}/`
      const key = `${prefix}${fileName}`
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fs.createReadStream(dumpPath),
        ContentLength: size,
        ContentType: 'application/octet-stream'
      }))
      await this._purgeS3(s3Client, bucket, prefix)
      return key
    }

    const dir = process.env.BACKUP_LOCAL_DIR || path.join(process.cwd(), 'backups-local')
    await fs.promises.mkdir(dir, { recursive: true })
    const target = path.join(dir, fileName)
    await fs.promises.copyFile(dumpPath, target)
    await this._purgeLocal(dir)
    return target
  }

  /**
   * Ne garde que les `BACKUP_KEEP` dumps les plus récents. Les noms embarquent l'horodatage UTC : le tri
   * alphabétique est chronologique. Une purge ratée ne fait pas échouer une sauvegarde déjà déposée.
   */
  async _purgeS3(s3Client, bucket, prefix) {
    try {
      const keys = []
      let token
      do {
        const page = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${prefix}${NAME_PREFIX}`, ContinuationToken: token }))
        for (const object of page.Contents || []) {
          if (object.Key.endsWith(NAME_SUFFIX)) keys.push(object.Key)
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined
      } while (token)
      keys.sort()
      const old = keys.slice(0, Math.max(0, keys.length - this._keep()))
      if (old.length > 0) {
        await s3Client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: old.map((Key) => ({ Key })) } }))
        logger.warn(`[backup] Rétention : ${old.length} ancienne(s) sauvegarde(s) supprimée(s).`)
      }
    } catch (error) {
      logger.error(`[backup] Rétention S3 impossible : ${error?.message || error}`)
    }
  }

  async _purgeLocal(dir) {
    try {
      const names = (await fs.promises.readdir(dir)).filter((n) => n.startsWith(NAME_PREFIX) && n.endsWith(NAME_SUFFIX)).sort()
      const old = names.slice(0, Math.max(0, names.length - this._keep()))
      await Promise.all(old.map((n) => fs.promises.rm(path.join(dir, n), { force: true })))
    } catch (error) {
      logger.error(`[backup] Rétention locale impossible : ${error?.message || error}`)
    }
  }

  /**
   * Prévient par email tous les comptes administrateur actifs. Un envoi raté est journalisé, jamais propagé.
   */
  async _notifyFailure(run, message) {
    try {
      const admins = await User.findAll({ where: { roleId: ADMIN_ROLE_ID }, attributes: ['email', 'isActive'] })
      const recipients = admins.filter((a) => a.isActive !== false && a.email).map((a) => a.email)
      if (recipients.length === 0) {
        logger.error(`[backup] Aucun administrateur à prévenir pour l'échec de la sauvegarde n°${run.id}.`)
        return
      }
      await sendEmail(
        `[MyMemoMaster] Échec de la sauvegarde (${process.env.ENVIRONMENT || 'dev'})`,
        `La sauvegarde ${run.trigger === 'auto' ? 'automatique' : 'manuelle'} n°${run.id} de la base de données a échoué le ${new Date(run.startedAt).toISOString()}.\n\nErreur : ${message}\n\nLe détail est visible dans Administration > Sauvegardes.`,
        recipients.join(', ')
      )
    } catch (error) {
      logger.error(`[backup] Email d'alerte non envoyé pour la sauvegarde n°${run.id} : ${error?.message || error}`)
    }
  }
}

module.exports = new BackupService()
