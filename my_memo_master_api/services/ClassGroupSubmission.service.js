const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { s3Client, bucket } = require('../config/storage.config')
const { ClassGroupSubmission, ClassGroupSection, ClassGroupUsers, User } = require('../models/index')
const logger = require('../helpers/logger')
const { Op } = require('sequelize')

class ClassGroupSubmissionService {
  async _isMember(groupId, userId) {
    const user = await User.findByPk(userId, { attributes: ['roleId'] })
    if ([1, 4].includes(user?.roleId)) return true
    const m = await ClassGroupUsers.findOne({ where: { classGroupId: groupId, userId } })
    return !!m
  }

  async _isTeacher(groupId, userId) {
    const user = await User.findByPk(userId, { attributes: ['roleId'] })
    if ([1, 4].includes(user?.roleId)) return true
    const m = await ClassGroupUsers.findOne({ where: { classGroupId: groupId, userId, role: 'teacher' } })
    return !!m
  }

  async _sectionBelongsToGroup(sectionId, groupId) {
    const section = await ClassGroupSection.findOne({ where: { id: sectionId, classGroupId: groupId, type: 'rendu' } })
    return !!section
  }

  async findBySection(sectionId, groupId, requesterId) {
    if (!(await this._isMember(groupId, requesterId))) return false
    const isTeacher = await this._isTeacher(groupId, requesterId)
    const where = isTeacher
      ? { sectionId, classGroupId: groupId }
      : { sectionId, classGroupId: groupId, studentId: requesterId }

    return ClassGroupSubmission.findAll({
      where,
      include: [{ model: User, as: 'student', attributes: ['userId', 'name', 'email'] }],
      order: [['submittedAt', 'DESC']]
    })
  }

  async upsert(sectionId, groupId, studentId, data) {
    if (!(await this._isMember(groupId, studentId))) return false
    if (!(await this._sectionBelongsToGroup(sectionId, groupId))) return null

    const existing = await ClassGroupSubmission.findOne({ where: { sectionId, studentId } })
    if (existing) {
      // Supprime l'ancien fichier S3 si le fileKey change
      if (existing.fileKey && data.fileKey && existing.fileKey !== data.fileKey && bucket) {
        try {
          await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: existing.fileKey }))
        } catch (err) {
          logger.warn(`[ClassGroupSubmission] Impossible de supprimer l'ancien fichier S3: ${err?.message}`)
        }
      }
      await existing.update({ ...data, submittedAt: new Date() })
      return existing
    }
    return ClassGroupSubmission.create({ sectionId, classGroupId: groupId, studentId, ...data })
  }

  /**
   * Retourne le statut de soumission pour chaque étudiant du groupe (enseignant uniquement).
   *
   * @param {number} sectionId
   * @param {number} groupId
   * @param {number} requesterId
   * @returns {Promise<{submitted: Array, notSubmitted: Array}|false|null>}
   */
  async getSubmissionStatus(sectionId, groupId, requesterId) {
    if (!(await this._isTeacher(groupId, requesterId))) return false
    if (!(await this._sectionBelongsToGroup(sectionId, groupId))) return null

    const studentMemberships = await ClassGroupUsers.findAll({
      where: { classGroupId: groupId, role: 'student' },
      include: [{ model: User, as: 'user', attributes: ['userId', 'name', 'email'] }]
    })

    const submissions = await ClassGroupSubmission.findAll({
      where: { sectionId, classGroupId: groupId },
      order: [['submittedAt', 'DESC']]
    })

    const submittedByStudentId = new Map(submissions.map((s) => [s.studentId, s]))

    const submitted = []
    const notSubmitted = []

    for (const m of studentMemberships) {
      const sub = submittedByStudentId.get(m.userId)
      if (sub) {
        submitted.push({
          studentId: m.userId,
          name: m.user?.name,
          email: m.user?.email,
          submittedAt: sub.submittedAt,
          fileKey: sub.fileKey,
          originalName: sub.originalName,
          mimeType: sub.mimeType,
          fileSize: sub.fileSize,
          submissionId: sub.id
        })
      } else {
        notSubmitted.push({
          studentId: m.userId,
          name: m.user?.name,
          email: m.user?.email
        })
      }
    }

    return { submitted, notSubmitted }
  }

  async delete(sectionId, groupId, submissionId, requesterId) {
    if (!(await this._isMember(groupId, requesterId))) return false
    const sub = await ClassGroupSubmission.findOne({ where: { id: submissionId, sectionId, classGroupId: groupId } })
    if (!sub) return null
    const isTeacher = await this._isTeacher(groupId, requesterId)
    if (!isTeacher && sub.studentId !== requesterId) return false

    if (sub.fileKey && bucket) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: sub.fileKey }))
      } catch (err) {
        logger.warn(`[ClassGroupSubmission] Impossible de supprimer le fichier S3: ${err?.message}`)
      }
    }
    await sub.destroy()
    return true
  }
}

module.exports = new ClassGroupSubmissionService()
