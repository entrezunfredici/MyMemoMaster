const { Invitation, ClassGroup, ClassGroupUsers, User } = require('../models/index')

class InvitationService {
  /**
   * Envoie une invitation à rejoindre un groupe.
   * Réservé aux admins (roleId 1 ou 4) ou aux enseignants du groupe.
   *
   * @param {number} groupId
   * @param {number} requesterId
   * @param {{ targetUserId: number, role: string }} data
   * @returns {Promise<Invitation|null|false>} null si groupe introuvable, false si droits insuffisants
   */
  async invite(groupId, requesterId, data) {
    const requester = await User.findByPk(requesterId, { attributes: ['roleId'] })
    const isAdmin = [1, 4].includes(requester?.roleId)

    if (!isAdmin) {
      const membership = await ClassGroupUsers.findOne({
        where: { classGroupId: groupId, userId: requesterId, role: 'teacher' }
      })
      if (!membership) return false
    }

    const group = await ClassGroup.findByPk(groupId)
    if (!group) return null

    // Évite les doublons : si une invitation pending existe déjà, on la retourne
    const [invitation] = await Invitation.findOrCreate({
      where: { classGroupId: groupId, targetUserId: data.targetUserId, status: 'pending' },
      defaults: { role: data.role, invitedByUserId: requesterId }
    })
    return invitation
  }

  /**
   * Liste les invitations d'un groupe (admin et enseignants du groupe).
   *
   * @param {number} groupId
   * @param {number} requesterId
   * @returns {Promise<Invitation[]|false>}
   */
  async findByGroup(groupId, requesterId) {
    const requester = await User.findByPk(requesterId, { attributes: ['roleId'] })
    const isAdmin = [1, 4].includes(requester?.roleId)

    if (!isAdmin) {
      const membership = await ClassGroupUsers.findOne({
        where: { classGroupId: groupId, userId: requesterId, role: 'teacher' }
      })
      if (!membership) return false
    }

    return Invitation.findAll({
      where: { classGroupId: groupId },
      include: [
        { model: User, as: 'targetUser', attributes: ['userId', 'name', 'email'] },
        { model: User, as: 'invitedBy', attributes: ['userId', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    })
  }

  /**
   * Liste les invitations pending de l'utilisateur connecté.
   *
   * @param {number} userId
   * @returns {Promise<Invitation[]>}
   */
  async findMine(userId) {
    return Invitation.findAll({
      where: { targetUserId: userId, status: 'pending' },
      include: [
        { model: ClassGroup, as: 'classGroup', attributes: ['id', 'name', 'description'] },
        { model: User, as: 'invitedBy', attributes: ['userId', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    })
  }

  /**
   * Accepte ou décline une invitation.
   * Seul l'utilisateur ciblé peut répondre.
   *
   * @param {number} invitationId
   * @param {number} userId
   * @param {'accepted'|'declined'} status
   * @returns {Promise<Invitation|null|false>} null si introuvable, false si droits insuffisants
   */
  async respond(invitationId, userId, status) {
    const invitation = await Invitation.findByPk(invitationId)
    if (!invitation) return null
    if (invitation.targetUserId !== userId) return false
    if (invitation.status !== 'pending') return null

    await invitation.update({ status })

    // Si acceptée, ajouter le membre au groupe
    if (status === 'accepted') {
      await ClassGroupUsers.findOrCreate({
        where: { classGroupId: invitation.classGroupId, userId },
        defaults: { role: invitation.role }
      })
    }

    return invitation
  }
}

module.exports = new InvitationService()
