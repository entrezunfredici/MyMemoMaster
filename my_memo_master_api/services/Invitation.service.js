const { Invitation, ClassGroup, ClassGroupUsers, User } = require('../models/index')
const sendEmail = require('../helpers/sendEmail')

class InvitationService {
  /**
   * Invite un utilisateur à rejoindre un groupe par email.
   *
   * - Si l'email correspond à un compte existant → ajout direct dans ClassGroupUsers.
   * - Sinon → création d'une invitation par email + envoi d'un email d'inscription.
   *
   * @param {number} groupId
   * @param {number} requesterId
   * @param {{ targetEmail: string, role: string }} data
   * @returns {Promise<{directlyAdded: boolean, ...}|null|false>}
   */
  async invite(groupId, requesterId, data) {
    const { targetEmail, role } = data

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

    const email = targetEmail.trim().toLowerCase()

    // Cas 1 : l'utilisateur a déjà un compte → ajout direct au groupe
    const existingUser = await User.findOne({
      where: { email },
      attributes: ['userId', 'name', 'email']
    })

    if (existingUser) {
      await ClassGroupUsers.findOrCreate({
        where: { classGroupId: groupId, userId: existingUser.userId },
        defaults: { role }
      })
      return { directlyAdded: true, user: { name: existingUser.name, email: existingUser.email } }
    }

    // Cas 2 : pas de compte → invitation email
    const [invitation] = await Invitation.findOrCreate({
      where: { classGroupId: groupId, targetEmail: email, status: 'pending' },
      defaults: { role, invitedByUserId: requesterId, targetUserId: null, targetEmail: email }
    })

    const roleLabel = role === 'teacher' ? 'enseignant' : 'étudiant'
    const frontUrl = process.env.FRONT_URL || 'http://localhost:5173'

    await sendEmail(
      `Invitation au groupe "${group.name}" sur MyMemoMaster`,
      `Bonjour,\n\nVous avez été invité à rejoindre le groupe "${group.name}" en tant que ${roleLabel} sur MyMemoMaster.\n\nCréez votre compte sur ${frontUrl}/inscription pour accepter automatiquement cette invitation.\n\nUtilisez l'adresse email ${email} lors de votre inscription.\n\nCe message a été envoyé par un membre de la plateforme.`,
      email
    )

    return { directlyAdded: false, invitation }
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
   * @returns {Promise<Invitation|null|false>}
   */
  async respond(invitationId, userId, status) {
    const invitation = await Invitation.findByPk(invitationId)
    if (!invitation) return null
    if (invitation.targetUserId !== userId) return false
    if (invitation.status !== 'pending') return null

    await invitation.update({ status })

    if (status === 'accepted') {
      await ClassGroupUsers.findOrCreate({
        where: { classGroupId: invitation.classGroupId, userId },
        defaults: { role: invitation.role }
      })
    }

    return invitation
  }

  /**
   * Traite les invitations email en attente pour un utilisateur qui vient de s'inscrire.
   * À appeler après la création d'un compte.
   *
   * @param {number} userId
   * @param {string} email
   */
  async processPendingEmailInvitations(userId, email) {
    const pending = await Invitation.findAll({
      where: { targetEmail: email.toLowerCase(), status: 'pending' }
    })
    for (const inv of pending) {
      await ClassGroupUsers.findOrCreate({
        where: { classGroupId: inv.classGroupId, userId },
        defaults: { role: inv.role }
      })
      await inv.update({ status: 'accepted', targetUserId: userId })
    }
  }
}

module.exports = new InvitationService()
