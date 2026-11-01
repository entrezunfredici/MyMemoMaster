const { Op } = require('sequelize')
const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { s3Client, bucket } = require('../config/storage.config')
const { ClassGroupResource, ClassGroupUsers, User } = require('../models/index')
const logger = require('../helpers/logger')
const ContentReportService = require('./ContentReport.service')

class ClassGroupResourceService {
  async _canWrite(groupId, userId) {
    const user = await User.findByPk(userId, { attributes: ['roleId'] })
    if ([1, 4].includes(user?.roleId)) return true
    const membership = await ClassGroupUsers.findOne({
      where: { classGroupId: groupId, userId, role: 'teacher' }
    })
    return !!membership
  }

  async _isMember(groupId, userId) {
    const user = await User.findByPk(userId, { attributes: ['roleId'] })
    if ([1, 4].includes(user?.roleId)) return true
    const membership = await ClassGroupUsers.findOne({ where: { classGroupId: groupId, userId } })
    return !!membership
  }

  async findAll(groupId, requesterId) {
    if (!(await this._isMember(groupId, requesterId))) return false
    return ClassGroupResource.findAll({
      where: { classGroupId: groupId, ...(await this._hiddenFilter(requesterId)) },
      include: [{ model: User, as: 'creator', attributes: ['userId', 'name'] }],
      order: [['createdAt', 'DESC']]
    })
  }

  /**
   * Filtre des contenus masqués par la modération : invisibles des membres, visibles de leur auteur
   * et des rôles 1 et 4 (qui portent `hiddenAt` pour afficher un bandeau).
   */
  async _hiddenFilter(requesterId) {
    const user = await User.findByPk(requesterId, { attributes: ['roleId'] })
    if ([1, 4].includes(user?.roleId)) return {}
    return { [Op.or]: [{ hiddenAt: null }, { createdBy: requesterId }] }
  }

  async create(groupId, requesterId, data) {
    if (!(await this._canWrite(groupId, requesterId))) return false
    return ClassGroupResource.create({ ...data, classGroupId: groupId, createdBy: requesterId })
  }

  async update(groupId, resourceId, requesterId, data) {
    if (!(await this._canWrite(groupId, requesterId))) return false
    const resource = await ClassGroupResource.findOne({ where: { id: resourceId, classGroupId: groupId } })
    if (!resource) return null
    await resource.update(data)
    return resource
  }

  async delete(groupId, resourceId, requesterId) {
    if (!(await this._canWrite(groupId, requesterId))) return false
    const resource = await ClassGroupResource.findOne({ where: { id: resourceId, classGroupId: groupId } })
    if (!resource) return null
    if (resource.fileKey && bucket) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: resource.fileKey }))
      } catch (err) {
        logger.warn(`[ClassGroupResource] Impossible de supprimer le fichier S3 ${resource.fileKey}: ${err?.message}`)
      }
    }
    await resource.destroy()
    await ContentReportService.closeForDeletedContent('resource', resourceId)
    return true
  }
}

module.exports = new ClassGroupResourceService()
