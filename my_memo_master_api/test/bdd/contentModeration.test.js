// Modération de contenu (S-07.02) : signalement, file de traitement, masquage réversible, retrait, purge.
// Base SQLite in-memory, aucune couche mockée hors envoi d'email (controller → service → model → DB réelle).

process.env.AUTH_JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'
process.env.VITE_FRONT_URL = 'http://localhost:5173'
process.env.DB_STORAGE = ':memory:'

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }))
jest.mock('../../jobs/reminder.worker', () => ({ startReminderWorker: jest.fn() }))
jest.mock('../../jobs/reminder.queue', () => ({ getReminderQueue: jest.fn(), closeReminderQueue: jest.fn() }))
jest.mock('../../jobs/kpiAlert.cron', () => ({ startKpiAlertCron: jest.fn() }))
jest.mock('../../jobs/contentModeration.cron', () => ({ startContentModerationCron: jest.fn() }))
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }))
jest.mock('../../helpers/sendEmail', () => jest.fn().mockResolvedValue())

const request = require('supertest')
const jwt = require('jsonwebtoken')
const dayjs = require('dayjs')
const sendEmail = require('../../helpers/sendEmail')
const app = require('../../app')
const ContentReportService = require('../../services/ContentReport.service')
const ClassGroupResourceService = require('../../services/ClassGroupResource.service')
const ClassGroupSubmissionService = require('../../services/ClassGroupSubmission.service')
const {
  syncModels, Role, User, ClassGroup, ClassGroupUsers, ClassGroupResource, ClassGroupSection,
  ContentReport, Etablissement, AuditLog
} = require('../../models')

const BASE = '/api/v1'
const tokenOf = (user) => jwt.sign({ id: user.userId }, 'test-secret', { expiresIn: '1d' })
const as = (method, url, user) => request(app)[method](`${BASE}${url}`).set('Authorization', `Bearer ${tokenOf(user)}`)

let seq = 0
const makeUser = (name, roleId) => {
  seq += 1
  return User.create({
    name, email: `${name.toLowerCase()}${seq}@test.fr`, password: 'x', roleId,
    hasValidatedEmail: true, createdAt: new Date(), updatedAt: new Date()
  })
}
const makeResource = (group, author, title = 'Cours') =>
  ClassGroupResource.create({ classGroupId: group.id, createdBy: author.userId, title, type: 'cours', description: 'Texte' })

describe('Modération de contenu (test fonctionnel DB réelle)', () => {
  let admin, admin4, moderator, teacher, student, student2, student3, outsider, group, otherGroup

  beforeAll(async () => {
    await syncModels({ force: true })
    await Role.bulkCreate([1, 2, 3, 4, 5].map((roleId) => ({ roleId, name: `Rôle ${roleId}` })))
    admin = await makeUser('Admin', 1)
    admin4 = await makeUser('Admin4', 4)
    moderator = await makeUser('Moderateur', 5)
    teacher = await makeUser('Prof', 3)
    student = await makeUser('Eleve', 2)
    student2 = await makeUser('Eleve', 2)
    student3 = await makeUser('Eleve', 2)
    outsider = await makeUser('Externe', 2)

    group = await ClassGroup.create({ name: 'Maths', createdBy: admin4.userId })
    otherGroup = await ClassGroup.create({ name: 'Histoire', createdBy: admin.userId })
    await Etablissement.create({ name: 'Lycée', code: 'LYC', adminId: admin4.userId })
    await ClassGroupUsers.bulkCreate([
      { classGroupId: group.id, userId: teacher.userId, role: 'teacher' },
      { classGroupId: group.id, userId: student.userId, role: 'student' },
      { classGroupId: group.id, userId: student2.userId, role: 'student' },
      { classGroupId: group.id, userId: student3.userId, role: 'student' },
      { classGroupId: otherGroup.id, userId: teacher.userId, role: 'teacher' }
    ])
  })

  beforeEach(() => sendEmail.mockClear())

  // Un signalant neuf par scénario : le plafond de 10 signalements par 24 h est propre à chaque utilisateur.
  const newMember = async () => {
    const member = await makeUser('Membre', 2)
    await ClassGroupUsers.create({ classGroupId: group.id, userId: member.userId, role: 'student' })
    return member
  }

  describe('POST /content-reports', () => {
    it('signalement valide — membre du groupe — 201 et dossier en attente avec copie du contenu', async () => {
      const resource = await makeResource(group, teacher, 'Cours litigieux')
      const res = await as('post', '/content-reports', student)
        .send({ contentType: 'resource', contentId: resource.id, reason: 'spam' })

      expect(res.status).toBe(201)
      expect(res.body.data).toMatchObject({ status: 'pending', authorId: teacher.userId, reporterId: student.userId })
      expect(res.body.data.contentSnapshot).toMatchObject({ title: 'Cours litigieux' })
    })

    it('signalement en double — même utilisateur, même contenu — 409', async () => {
      const resource = await makeResource(group, teacher)
      const body = { contentType: 'resource', contentId: resource.id, reason: 'spam' }
      expect((await as('post', '/content-reports', student).send(body)).status).toBe(201)
      expect((await as('post', '/content-reports', student).send(body)).status).toBe(409)
    })

    it('signalement de son propre contenu — 400', async () => {
      const resource = await makeResource(group, teacher)
      const res = await as('post', '/content-reports', teacher)
        .send({ contentType: 'resource', contentId: resource.id, reason: 'spam' })
      expect(res.status).toBe(400)
    })

    it("signalement d'un contenu d'un groupe dont on n'est pas membre — 403", async () => {
      const resource = await makeResource(group, teacher)
      const res = await as('post', '/content-reports', outsider)
        .send({ contentType: 'resource', contentId: resource.id, reason: 'spam' })
      expect(res.status).toBe(403)
    })

    it('contenu inexistant — 404', async () => {
      const res = await as('post', '/content-reports', student).send({ contentType: 'section', contentId: 99999, reason: 'spam' })
      expect(res.status).toBe(404)
    })

    it("motif 'other' sans commentaire — 400 ; avec commentaire — 201", async () => {
      const resource = await makeResource(group, teacher)
      const base = { contentType: 'resource', contentId: resource.id, reason: 'other' }
      expect((await as('post', '/content-reports', student).send(base)).status).toBe(400)
      expect((await as('post', '/content-reports', student).send({ ...base, comment: 'Précision' })).status).toBe(201)
    })

    it('motif inconnu ou commentaire de plus de 500 caractères — 400', async () => {
      const resource = await makeResource(group, teacher)
      const base = { contentType: 'resource', contentId: resource.id }
      expect((await as('post', '/content-reports', student).send({ ...base, reason: 'nope' })).status).toBe(400)
      expect((await as('post', '/content-reports', student).send({ ...base, reason: 'spam', comment: 'x'.repeat(501) })).status).toBe(400)
    })

    it('sans authentification — 401', async () => {
      const res = await request(app).post(`${BASE}/content-reports`).send({})
      expect(res.status).toBe(401)
    })

    it('plus de 10 signalements en 24 h — le 11e répond 429', async () => {
      const reporter = await makeUser('Bavard', 2)
      await ClassGroupUsers.create({ classGroupId: group.id, userId: reporter.userId, role: 'student' })
      for (let i = 0; i < 10; i += 1) {
        const resource = await makeResource(group, teacher, `R${i}`)
        const res = await as('post', '/content-reports', reporter)
          .send({ contentType: 'resource', contentId: resource.id, reason: 'spam' })
        expect(res.status).toBe(201)
      }
      const extra = await makeResource(group, teacher, 'R10')
      const res = await as('post', '/content-reports', reporter)
        .send({ contentType: 'resource', contentId: extra.id, reason: 'spam' })
      expect(res.status).toBe(429)
    })
  })

  describe('file de traitement', () => {
    it('étudiant — 403 ; modérateur — 200 avec un seul regroupement par contenu', async () => {
      const resource = await makeResource(group, teacher, 'Très signalé')
      for (const reporter of [student, student2, student3]) {
        await as('post', '/content-reports', reporter).send({ contentType: 'resource', contentId: resource.id, reason: 'harassment' })
      }

      expect((await as('get', '/content-reports', student)).status).toBe(403)

      const res = await as('get', '/content-reports?contentType=resource&limit=100', moderator)
      expect(res.status).toBe(200)
      const row = res.body.data.items.find((i) => i.contentId === resource.id)
      expect(row).toMatchObject({ reportCount: 3, reporterCount: 3, priority: 'high', status: 'pending' })
      expect(res.body.data.items.filter((i) => i.contentId === resource.id)).toHaveLength(1)
      expect(res.body.data.items[0].priority).toBe('high')
    })

    it('motif illégal — priorité haute dès le premier signalement', async () => {
      const resource = await makeResource(group, teacher, 'Illégal')
      await as('post', '/content-reports', student).send({ contentType: 'resource', contentId: resource.id, reason: 'illegal' })
      const res = await as('get', '/content-reports?reason=illegal', moderator)
      expect(res.body.data.items.find((i) => i.contentId === resource.id).priority).toBe('high')
    })

    it('filtre de statut invalide — 400', async () => {
      expect((await as('get', '/content-reports?status=nope', moderator)).status).toBe(400)
    })

    it("admin d'établissement — ne voit que les groupes de son établissement", async () => {
      const foreign = await makeResource(otherGroup, teacher, 'Hors établissement')
      await ClassGroupUsers.findOrCreate({ where: { classGroupId: otherGroup.id, userId: student.userId }, defaults: { role: 'student' } })
      await as('post', '/content-reports', student).send({ contentType: 'resource', contentId: foreign.id, reason: 'spam' })

      const mine = await as('get', '/content-reports?limit=100', admin4)
      expect(mine.status).toBe(200)
      expect(mine.body.data.items.every((i) => i.classGroupId === group.id)).toBe(true)
      expect(mine.body.data.items.some((i) => i.contentId === foreign.id)).toBe(false)

      const all = await as('get', '/content-reports?limit=100', moderator)
      expect(all.body.data.items.some((i) => i.contentId === foreign.id)).toBe(true)

      const report = await ContentReport.findOne({ where: { contentId: foreign.id } })
      expect((await as('get', `/content-reports/${report.id}`, admin4)).status).toBe(404)
    })
  })

  describe('masquage, restauration, retrait', () => {
    const reportAndGetId = async (resource, reporter) => {
      reporter = reporter || (await newMember())
      const res = await as('post', '/content-reports', reporter)
        .send({ contentType: 'resource', contentId: resource.id, reason: 'copyright' })
      return res.body.data.id
    }

    it('masquer — la décision exige un motif (400) ; contenu invisible des membres, visible de son auteur', async () => {
      const resource = await makeResource(group, teacher, 'À masquer')
      const id = await reportAndGetId(resource)

      expect((await as('patch', `/content-reports/${id}/hide`, moderator).send({})).status).toBe(400)

      const res = await as('patch', `/content-reports/${id}/hide`, moderator).send({ decisionNote: 'Copie de cours' })
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('hidden')
      expect(dayjs(res.body.data.purgeAt).diff(dayjs(), 'day')).toBeGreaterThanOrEqual(29)

      const seenByStudent = await ClassGroupResourceService.findAll(group.id, student2.userId)
      expect(seenByStudent.map((r) => r.id)).not.toContain(resource.id)
      const seenByAuthor = await ClassGroupResourceService.findAll(group.id, teacher.userId)
      expect(seenByAuthor.map((r) => r.id)).toContain(resource.id)
      const seenByAdmin = await ClassGroupResourceService.findAll(group.id, admin4.userId)
      expect(seenByAdmin.map((r) => r.id)).toContain(resource.id)
    })

    it("masquer — email motivé à l'auteur (sans nom ni commentaire du signalant) et information du signalant", async () => {
      const resource = await makeResource(group, teacher, 'Mail')
      const res = await as('post', '/content-reports', student2)
        .send({ contentType: 'resource', contentId: resource.id, reason: 'harassment', comment: 'Secret du signalant' })
      await as('patch', `/content-reports/${res.body.data.id}/hide`, moderator).send({ decisionNote: 'Ok' })

      const toAuthor = sendEmail.mock.calls.find((c) => c[2] === teacher.email)
      expect(toAuthor).toBeDefined()
      expect(toAuthor[1]).toContain('support@my-memo-master.com')
      expect(toAuthor[1]).toContain('Mail')
      expect(toAuthor[1]).not.toContain('Secret du signalant')
      expect(toAuthor[1]).not.toContain(student2.name)
      expect(sendEmail.mock.calls.some((c) => c[2] === student2.email)).toBe(true)
    })

    it('masquer deux fois — 409 ; nouveau signalement sur un contenu masqué par un membre — 404', async () => {
      const resource = await makeResource(group, teacher)
      const id = await reportAndGetId(resource)
      await as('patch', `/content-reports/${id}/hide`, moderator).send({ decisionNote: 'Ok' })

      expect((await as('patch', `/content-reports/${id}/hide`, moderator).send({ decisionNote: 'Ok' })).status).toBe(409)
      const res = await as('post', '/content-reports', student3).send({ contentType: 'resource', contentId: resource.id, reason: 'spam' })
      expect(res.status).toBe(404)
    })

    it('restaurer — contenu de nouveau visible, signalements rejetés ; restaurer un contenu non masqué — 409', async () => {
      const resource = await makeResource(group, teacher)
      const id = await reportAndGetId(resource)
      expect((await as('patch', `/content-reports/${id}/restore`, moderator)).status).toBe(409)

      await as('patch', `/content-reports/${id}/hide`, moderator).send({ decisionNote: 'Ok' })
      const res = await as('patch', `/content-reports/${id}/restore`, moderator)

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('dismissed')
      const visible = await ClassGroupResourceService.findAll(group.id, student2.userId)
      expect(visible.map((r) => r.id)).toContain(resource.id)
      expect((await ClassGroupResource.findByPk(resource.id)).hiddenAt).toBeNull()
    })

    it('retirer définitivement depuis un contenu masqué — contenu supprimé, tous les signalements clos', async () => {
      const resource = await makeResource(group, teacher)
      const id = await reportAndGetId(resource)
      await reportAndGetId(resource)
      await as('patch', `/content-reports/${id}/hide`, moderator).send({ decisionNote: 'Ok' })

      const res = await as('patch', `/content-reports/${id}/remove-content`, moderator).send({ decisionNote: 'Confirmé' })

      expect(res.status).toBe(200)
      expect(await ClassGroupResource.findByPk(resource.id)).toBeNull()
      const reports = await ContentReport.findAll({ where: { contentId: resource.id, contentType: 'resource' } })
      expect(reports.map((r) => r.status)).toEqual(['actioned', 'actioned'])
      const audit = await AuditLog.findAll({ where: { entityType: 'ContentReport', entityId: id } })
      expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(['CONTENT_REPORT_HIDDEN', 'CONTENT_REPORT_ACTIONED']))
      expect((await as('patch', `/content-reports/${id}/remove-content`, moderator).send({ decisionNote: 'Encore' })).status).toBe(409)
    })

    it('rejeter — contenu inchangé, signalement clos ; prendre en charge un dossier clos — 409', async () => {
      const resource = await makeResource(group, teacher)
      const id = await reportAndGetId(resource)

      const claimed = await as('patch', `/content-reports/${id}/claim`, moderator)
      expect(claimed.body.data).toMatchObject({ status: 'in_review', handledBy: moderator.userId })

      const res = await as('patch', `/content-reports/${id}/dismiss`, moderator).send({ decisionNote: 'Conforme' })
      expect(res.body.data.status).toBe('dismissed')
      expect(await ClassGroupResource.findByPk(resource.id)).not.toBeNull()
      expect((await as('patch', `/content-reports/${id}/claim`, moderator)).status).toBe(409)
    })

    it('contenu supprimé par son auteur — ses signalements ouverts sont clos', async () => {
      const resource = await makeResource(group, teacher)
      const id = await reportAndGetId(resource)

      await ClassGroupResourceService.delete(group.id, resource.id, teacher.userId)

      const report = await ContentReport.findByPk(id)
      expect(report).toMatchObject({ status: 'actioned', decisionNote: 'Contenu supprimé' })
    })

    it('nul ne traite un signalement visant son propre contenu — 403', async () => {
      const resource = await makeResource(group, admin, 'Contenu admin')
      await ClassGroupUsers.findOrCreate({ where: { classGroupId: group.id, userId: admin.userId }, defaults: { role: 'teacher' } })
      const id = await reportAndGetId(resource)

      expect((await as('get', `/content-reports/${id}`, admin)).status).toBe(403)
      expect((await as('patch', `/content-reports/${id}/hide`, admin).send({ decisionNote: 'Ok' })).status).toBe(403)
      const queue = await as('get', '/content-reports?limit=100', admin)
      expect(queue.body.data.items.some((i) => i.contentId === resource.id)).toBe(false)
      expect((await as('get', `/content-reports/${id}`, moderator)).status).toBe(200)
    })

    it('section masquée — un rendu ne peut plus y être déposé', async () => {
      const section = await ClassGroupSection.create({ classGroupId: group.id, createdBy: teacher.userId, title: 'Devoir', type: 'rendu' })
      expect(await ClassGroupSubmissionService._sectionBelongsToGroup(section.id, group.id)).toBe(true)
      await section.update({ hiddenAt: new Date() })
      expect(await ClassGroupSubmissionService._sectionBelongsToGroup(section.id, group.id)).toBe(false)
    })

    it("fichier d'une ressource masquée — refusé aux membres, servi à l'auteur et aux modérateurs", async () => {
      const resource = await ClassGroupResource.create({
        classGroupId: group.id, createdBy: teacher.userId, title: 'Fichier', type: 'cours', fileKey: 'uploads/1/fichier.pdf', hiddenAt: new Date()
      })
      expect(await ContentReportService.canAccessFile(resource.fileKey, student.userId)).toBe(false)
      expect(await ContentReportService.canAccessFile(resource.fileKey, teacher.userId)).toBe(true)
      expect(await ContentReportService.canAccessFile(resource.fileKey, moderator.userId)).toBe(true)
      expect(await ContentReportService.canAccessFile('uploads/1/autre.pdf', student.userId)).toBe(true)

      const refused = await as('get', `/storage/presign?key=${encodeURIComponent(resource.fileKey)}`, student)
      expect(refused.status).toBe(404)
      expect(refused.body.message).toBe('Fichier introuvable.')
    })
  })

  describe('suspension du compte de l’auteur', () => {
    const reportFor = async (resource) => {
      const reporter = await newMember()
      const res = await as('post', '/content-reports', reporter)
        .send({ contentType: 'resource', contentId: resource.id, reason: 'harassment' })
      return res.body.data.id
    }

    it('admin d’établissement — suspend l’auteur, le dossier reste ouvert, audit et email', async () => {
      const author = await makeUser('Prof', 3)
      await ClassGroupUsers.create({ classGroupId: group.id, userId: author.userId, role: 'teacher' })
      const resource = await makeResource(group, author, 'Contenu abusif')
      const id = await reportFor(resource)

      expect((await as('patch', `/content-reports/${id}/suspend-author`, admin4).send({})).status).toBe(400)
      const res = await as('patch', `/content-reports/${id}/suspend-author`, admin4).send({ decisionNote: 'Propos répétés' })

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('pending')
      expect((await User.findByPk(author.userId)).isActive).toBe(false)
      expect(await ClassGroupResource.findByPk(resource.id)).not.toBeNull()
      const audit = await AuditLog.findAll({ where: { entityId: id } })
      expect(audit.map((a) => a.action)).toContain('CONTENT_REPORT_AUTHOR_SUSPENDED')
      expect((await AuditLog.findOne({ where: { action: 'USER_ACCOUNT_DEACTIVATED', entityId: author.userId } })).actorId).toBe(admin4.userId)
      const mail = sendEmail.mock.calls.find((c) => c[2] === author.email)
      expect(mail[0]).toContain('suspension')
      expect(mail[1]).toContain('support@my-memo-master.com')

      const detail = await as('get', `/content-reports/${id}`, moderator)
      expect(detail.body.data.author).toMatchObject({ userId: author.userId, isActive: false })
    })

    it('suspendre deux fois — 409 ; modérateur (rôle 5) ou étudiant — 403', async () => {
      const author = await makeUser('Prof', 3)
      await ClassGroupUsers.create({ classGroupId: group.id, userId: author.userId, role: 'teacher' })
      const id = await reportFor(await makeResource(group, author))

      expect((await as('patch', `/content-reports/${id}/suspend-author`, moderator).send({ decisionNote: 'x' })).status).toBe(403)
      expect((await as('patch', `/content-reports/${id}/suspend-author`, student).send({ decisionNote: 'x' })).status).toBe(403)
      expect((await as('patch', `/content-reports/${id}/suspend-author`, admin4).send({ decisionNote: 'x' })).status).toBe(200)
      expect((await as('patch', `/content-reports/${id}/suspend-author`, admin4).send({ decisionNote: 'x' })).status).toBe(409)
    })

    it('auteur admin plateforme suspendu par un autre admin plateforme — 403, compte inchangé', async () => {
      const otherAdmin = await makeUser('AdminBis', 1)
      await ClassGroupUsers.create({ classGroupId: group.id, userId: otherAdmin.userId, role: 'teacher' })
      const id = await reportFor(await makeResource(group, otherAdmin))

      const res = await as('patch', `/content-reports/${id}/suspend-author`, admin).send({ decisionNote: 'x' })

      expect(res.status).toBe(403)
      expect((await User.findByPk(otherAdmin.userId)).isActive).not.toBe(false)
    })

    it('dossier d’un autre établissement — 404 pour l’admin d’établissement', async () => {
      const author = await makeUser('Prof', 3)
      await ClassGroupUsers.create({ classGroupId: otherGroup.id, userId: author.userId, role: 'teacher' })
      const resource = await makeResource(otherGroup, author)
      const reporter = await makeUser('Membre', 2)
      await ClassGroupUsers.create({ classGroupId: otherGroup.id, userId: reporter.userId, role: 'student' })
      const created = await as('post', '/content-reports', reporter).send({ contentType: 'resource', contentId: resource.id, reason: 'spam' })

      const res = await as('patch', `/content-reports/${created.body.data.id}/suspend-author`, admin4).send({ decisionNote: 'x' })

      expect(res.status).toBe(404)
      expect((await User.findByPk(author.userId)).isActive).not.toBe(false)
    })

    it('dossier clos — 409', async () => {
      const author = await makeUser('Prof', 3)
      await ClassGroupUsers.create({ classGroupId: group.id, userId: author.userId, role: 'teacher' })
      const id = await reportFor(await makeResource(group, author))
      await as('patch', `/content-reports/${id}/dismiss`, moderator).send({ decisionNote: 'Conforme' })

      const res = await as('patch', `/content-reports/${id}/suspend-author`, admin4).send({ decisionNote: 'x' })

      expect(res.status).toBe(409)
    })
  })

  describe('tâches planifiées', () => {
    it('purgeExpired — supprime à l’échéance, pas avant', async () => {
      const resource = await makeResource(group, teacher, 'À purger')
      const created = await as('post', '/content-reports', await newMember()).send({ contentType: 'resource', contentId: resource.id, reason: 'spam' })
      await as('patch', `/content-reports/${created.body.data.id}/hide`, moderator).send({ decisionNote: 'Ok' })

      const early = await ContentReportService.purgeExpired(dayjs().add(29, 'day').toDate())
      expect(early.purged).toBe(0)
      expect(await ClassGroupResource.findByPk(resource.id)).not.toBeNull()

      const late = await ContentReportService.purgeExpired(dayjs().add(31, 'day').toDate())
      expect(late.purged).toBeGreaterThanOrEqual(1)
      expect(await ClassGroupResource.findByPk(resource.id)).toBeNull()
      const report = await ContentReport.findByPk(created.body.data.id)
      expect(report.status).toBe('actioned')
      const audit = await AuditLog.findOne({ where: { action: 'CONTENT_REPORT_PURGED', entityId: report.id } })
      expect(audit.actorId).toBeNull()
    })

    it('purgeExpired — contenu restauré avant l’échéance : jamais supprimé', async () => {
      const resource = await makeResource(group, teacher, 'Sauvé')
      const created = await as('post', '/content-reports', await newMember()).send({ contentType: 'resource', contentId: resource.id, reason: 'spam' })
      const id = created.body.data.id
      await as('patch', `/content-reports/${id}/hide`, moderator).send({ decisionNote: 'Ok' })
      await as('patch', `/content-reports/${id}/restore`, moderator)

      await ContentReportService.purgeExpired(dayjs().add(60, 'day').toDate())

      expect(await ClassGroupResource.findByPk(resource.id)).not.toBeNull()
    })

    it("purgeOldReports — supprime dossiers et audit clos depuis plus d'un an, garde les récents et les ouverts", async () => {
      const make = (status, resolvedAt) => ContentReport.create({
        contentType: 'resource', contentId: 1, reporterId: student.userId, reason: 'spam', status, resolvedAt
      })
      const old = await make('actioned', dayjs().subtract(400, 'day').toDate())
      const recent = await make('dismissed', dayjs().subtract(10, 'day').toDate())
      const open = await make('pending', null)
      await AuditLog.create({ actorId: null, action: 'CONTENT_REPORT_PURGED', entityType: 'ContentReport', entityId: old.id, createdAt: dayjs().subtract(400, 'day').toDate() })

      const result = await ContentReportService.purgeOldReports()

      expect(result.reports).toBeGreaterThanOrEqual(1)
      expect(result.auditLogs).toBeGreaterThanOrEqual(1)
      expect(await ContentReport.findByPk(old.id)).toBeNull()
      expect(await ContentReport.findByPk(recent.id)).not.toBeNull()
      expect(await ContentReport.findByPk(open.id)).not.toBeNull()
    })
  })
})
