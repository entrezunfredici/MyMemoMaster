const { ClassGroupSection, ClassGroupUsers, User } = require('../models/index')

class ClassGroupSectionService {
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
    return ClassGroupSection.findAll({
      where: { classGroupId: groupId },
      include: [{ model: User, as: 'creator', attributes: ['userId', 'name'] }],
      order: [['createdAt', 'ASC']]
    })
  }

  async create(groupId, requesterId, data) {
    if (!(await this._canWrite(groupId, requesterId))) return false
    return ClassGroupSection.create({ ...data, classGroupId: groupId, createdBy: requesterId })
  }

  async update(groupId, sectionId, requesterId, data) {
    if (!(await this._canWrite(groupId, requesterId))) return false
    const section = await ClassGroupSection.findOne({ where: { id: sectionId, classGroupId: groupId } })
    if (!section) return null
    const { title, type, description, dueDate } = data
    await section.update({ title, type, description, dueDate })
    return section
  }

  async delete(groupId, sectionId, requesterId) {
    if (!(await this._canWrite(groupId, requesterId))) return false
    const section = await ClassGroupSection.findOne({ where: { id: sectionId, classGroupId: groupId } })
    if (!section) return null
    await section.destroy()
    return true
  }
}

module.exports = new ClassGroupSectionService()
