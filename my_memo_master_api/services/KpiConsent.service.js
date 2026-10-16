const { KpiConsent, ClassGroupUsers, User, ClassGroup, Subject } = require('../models/index')
const KpiService = require('./Kpi.service')

class KpiConsentService {
  /**
   * Vérifie si userId est enseignant de ce groupe spécifique.
   * Aucun bypass admin : seul un membre avec role='teacher' dans ce groupe est autorisé.
   */
  async _isTeacherInGroup(groupId, userId) {
    const membership = await ClassGroupUsers.findOne({ where: { classGroupId: groupId, userId, role: 'teacher' } })
    return !!membership
  }

  /**
   * Vérifie si userId est étudiant dans le groupe (rôle 'student' strict).
   */
  async _isStudentInGroup(groupId, userId) {
    const membership = await ClassGroupUsers.findOne({ where: { classGroupId: groupId, userId, role: 'student' } })
    return !!membership
  }

  /**
   * L'étudiant accorde l'accès à ses KPI à un enseignant dans un groupe.
   * subjectId null = tous les KPI personnels.
   * subjectId renseigné = uniquement les KPI liés à cette matière.
   *
   * @param {number} studentId
   * @param {number} teacherId
   * @param {number} classGroupId
   * @param {number|null} subjectId
   * @returns {Promise<KpiConsent|'not_student'|'not_teacher'>}
   */
  async grantConsent(studentId, teacherId, classGroupId, subjectId = null) {
    if (!(await this._isStudentInGroup(classGroupId, studentId))) return 'not_student'
    if (!(await this._isTeacherInGroup(classGroupId, teacherId))) return 'not_teacher'

    const [consent] = await KpiConsent.findOrCreate({
      where: { studentId, teacherId, classGroupId, subjectId },
      defaults: { studentId, teacherId, classGroupId, subjectId }
    })
    return consent
  }

  /**
   * L'étudiant révoque le consentement accordé à un enseignant.
   * Si subjectId est null : révoque TOUS les consentements pour cet enseignant/groupe.
   * Si subjectId est renseigné : révoque uniquement le consentement pour cette matière.
   *
   * @param {number} studentId
   * @param {number} teacherId
   * @param {number} classGroupId
   * @param {number|null} subjectId
   * @returns {Promise<true|null>} true si révoqué, null si consentement introuvable
   */
  async revokeConsent(studentId, teacherId, classGroupId, subjectId = null) {
    if (subjectId !== null) {
      const consent = await KpiConsent.findOne({ where: { studentId, teacherId, classGroupId, subjectId } })
      if (!consent) return null
      await consent.destroy()
      return true
    }

    const count = await KpiConsent.destroy({ where: { studentId, teacherId, classGroupId } })
    return count > 0 ? true : null
  }

  /**
   * Retourne la liste des consentements accordés par un étudiant,
   * avec les informations sur l'enseignant, le groupe et la matière concernée.
   *
   * @param {number} studentId
   * @returns {Promise<KpiConsent[]>}
   */
  async getMyConsents(studentId) {
    return KpiConsent.findAll({
      where: { studentId },
      include: [
        { model: User, as: 'teacher', attributes: ['userId', 'name', 'email'] },
        { model: ClassGroup, as: 'classGroup', attributes: ['id', 'name'] },
        { model: Subject, as: 'subject', attributes: ['subjectId', 'name'] }
      ]
    })
  }

  /**
   * Un enseignant consulte les KPI d'un étudiant consentant.
   * Si un consentement global (subjectId null) existe → tous les KPI.
   * Sinon → KPI filtrés par les matières consenties.
   *
   * @param {number} teacherId
   * @param {number} studentId
   * @param {number} classGroupId
   * @returns {Promise<object|'not_teacher'|'no_consent'>}
   */
  async getStudentKpis(teacherId, studentId, classGroupId) {
    if (!(await this._isTeacherInGroup(classGroupId, teacherId))) return 'not_teacher'

    const consents = await KpiConsent.findAll({ where: { studentId, teacherId, classGroupId } })
    if (consents.length === 0) return 'no_consent'

    const hasGlobalConsent = consents.some((c) => c.subjectId === null)
    if (hasGlobalConsent) return KpiService.getMyKpis(studentId)

    const subjectIds = consents.map((c) => c.subjectId)
    return KpiService.getPersonalKpisForSubjects(studentId, subjectIds)
  }
}

module.exports = new KpiConsentService()
