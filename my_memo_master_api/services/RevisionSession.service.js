const dayjs = require('dayjs')
const { RevisionSession, LeitnerSystem, Test } = require('../models/index')

const include = [
  { model: LeitnerSystem, as: 'leitnerSystem', attributes: ['idSystem', 'name'] },
  { model: Test, as: 'test', attributes: ['testId', 'name'] }
]

class RevisionSessionService {
  async findAll(userId) {
    return RevisionSession.findAll({
      where: { userId },
      include,
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC']
      ]
    })
  }

  async findToday(userId) {
    const today = dayjs().format('YYYY-MM-DD')
    return RevisionSession.findAll({
      where: { userId, date: today },
      include,
      order: [['startTime', 'ASC']]
    })
  }

  async findOne(id, userId) {
    return RevisionSession.findOne({ where: { id, userId }, include })
  }

  async create(userId, data) {
    return RevisionSession.create({ ...data, userId })
  }

  async update(id, userId, data) {
    const session = await RevisionSession.findOne({ where: { id, userId } })
    if (!session) return null
    await session.update(data)
    return session.reload({ include })
  }

  async markDone(id, userId, isDone) {
    const session = await RevisionSession.findOne({ where: { id, userId } })
    if (!session) return null
    await session.update({ isDone })
    return session.reload({ include })
  }

  async delete(id, userId) {
    const session = await RevisionSession.findOne({ where: { id, userId } })
    if (!session) return false
    await session.destroy()
    return true
  }
}

module.exports = new RevisionSessionService()
