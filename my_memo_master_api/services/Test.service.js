const { Op } = require('sequelize')
const { Test, Subject, Question, TestResult, Tag, ClassGroup, ClassGroupUsers, TestClassGroup } = require('../models/index')

const TAG_INCLUDE = { model: Tag, as: 'tags', attributes: ['tagId', 'name'], through: { attributes: [] } }
const CLASS_GROUPS_INCLUDE = { model: ClassGroup, as: 'classGroups', attributes: ['id', 'name'], through: { attributes: [] }, required: false }
const semanticService = require('./Semantic.service')

class TestService {
  /**
   * Retourne les tests accessibles à l'utilisateur :
   * - ses propres tests (privés ou assignés)
   * - les tests assignés aux groupes dont il est membre
   * - les tests legacy (userId null)
   */
  async findAll(userId) {
    const memberships = await ClassGroupUsers.findAll({
      where: { userId },
      attributes: ['classGroupId'],
      raw: true
    })
    const groupIds = memberships.map((m) => m.classGroupId)

    let groupTestIds = []
    if (groupIds.length > 0) {
      const assignments = await TestClassGroup.findAll({
        where: { classGroupId: groupIds },
        attributes: ['testId'],
        raw: true
      })
      groupTestIds = [...new Set(assignments.map((a) => a.testId))]
    }

    const orClauses = [{ userId }, { userId: null }]
    if (groupTestIds.length > 0) {
      orClauses.push({ testId: { [Op.in]: groupTestIds } })
    }

    return await Test.findAll({
      where: { [Op.or]: orClauses },
      include: [
        { model: Subject, as: 'subject', attributes: ['subjectId', 'name'] },
        TAG_INCLUDE,
        CLASS_GROUPS_INCLUDE
      ]
    })
  }

  /**
   * Retourne un test si l'utilisateur est propriétaire ou membre d'un groupe assigné.
   */
  async findOne(id, userId) {
    const test = await Test.findByPk(id, {
      include: [
        { model: Subject, as: 'subject', attributes: ['subjectId', 'name'] },
        { model: Question, as: 'question', attributes: ['idQuestion', 'statement', 'type', 'content', 'questionPosition'] },
        TAG_INCLUDE,
        CLASS_GROUPS_INCLUDE
      ],
      order: [[{ model: Question, as: 'question' }, 'questionPosition', 'ASC']]
    })
    if (!test) return null

    // Propriétaire ou test legacy
    if (test.userId === userId || test.userId === null) return test

    // Membre d'un groupe assigné
    const groupIds = (test.classGroups ?? []).map((g) => g.id)
    if (groupIds.length > 0) {
      const membership = await ClassGroupUsers.findOne({
        where: { userId, classGroupId: groupIds }
      })
      if (membership) return test
    }

    return null // pas d'accès
  }

  async create(data) {
    return await Test.create(data)
  }

  /**
   * Mise à jour réservée au propriétaire.
   * Retourne 'NOT_FOUND' ou 'FORBIDDEN' comme erreur signalée.
   */
  async update(id, data, userId) {
    const test = await Test.findByPk(id)
    if (!test) throw Object.assign(new Error('Test introuvable'), { code: 'NOT_FOUND' })
    if (test.userId !== null && test.userId !== userId) throw Object.assign(new Error('Accès interdit'), { code: 'FORBIDDEN' })
    return await test.update(data)
  }

  /**
   * Suppression réservée au propriétaire.
   */
  async delete(id, userId) {
    const test = await Test.findByPk(id)
    if (!test) throw Object.assign(new Error('Test introuvable'), { code: 'NOT_FOUND' })
    if (test.userId !== null && test.userId !== userId) throw Object.assign(new Error('Accès interdit'), { code: 'FORBIDDEN' })
    return await test.destroy()
  }

  /**
   * Assigne (ou désassigne) un test à des groupes.
   * Seul le propriétaire peut modifier les assignations.
   * @param {number} testId
   * @param {number} userId
   * @param {number[]} groupIds - tableau vide = test redevient privé
   */
  async assignGroups(testId, userId, groupIds) {
    const test = await Test.findByPk(testId)
    if (!test) throw Object.assign(new Error('Test introuvable'), { code: 'NOT_FOUND' })
    if (test.userId !== userId) throw Object.assign(new Error('Accès interdit'), { code: 'FORBIDDEN' })

    const groups = groupIds.length > 0 ? await ClassGroup.findAll({ where: { id: groupIds } }) : []
    await test.setClassGroups(groups)

    return test.reload({ include: [CLASS_GROUPS_INCLUDE] })
  }

  /**
   * Évalue les réponses d'un utilisateur, sauvegarde le TestResult et retourne la correction.
   * Accès identique à findOne : propriétaire, test legacy (userId null) ou membre d'un groupe assigné.
   */
  async submitAnswers(testId, userId, answers) {
    const test = await Test.findByPk(testId, {
      include: [
        {
          model: Question,
          as: 'question',
          attributes: ['idQuestion', 'type', 'content', 'questionPosition']
        },
        CLASS_GROUPS_INCLUDE
      ],
      order: [[{ model: Question, as: 'question' }, 'questionPosition', 'ASC']]
    })
    if (!test) return null

    // Vérification d'accès (même logique que findOne)
    if (test.userId !== userId && test.userId !== null) {
      const groupIds = (test.classGroups ?? []).map((g) => g.id)
      if (groupIds.length === 0) return null
      const membership = await ClassGroupUsers.findOne({ where: { userId, classGroupId: groupIds } })
      if (!membership) return null
    }

    const questions = test.question ?? []
    const results = await Promise.all(questions.map(async q => {
      const submission = answers.find(a => a.questionId === q.idQuestion)
      const { correct, explanation, semanticScore, points } = await this._checkAnswer(q, submission?.answer ?? null)
      return {
        questionId: q.idQuestion,
        correct,
        correctAnswer: this._formatCorrectAnswer(q),
        explanation,
        semanticScore,
        points
      }
    }))

    const score = parseFloat(results.reduce((acc, r) => acc + r.points, 0).toFixed(2))
    const testResult = await TestResult.create({ testId, userId, score, total: questions.length })
    return { score, total: questions.length, results, resultId: testResult.resultId }
  }

  async _checkAnswer(question, answer) {
    const content = question.content ?? {}
    switch (question.type) {
      case 'open': {
        const user = (answer ?? '').trim()
        if (!user) return { correct: false, explanation: null, semanticScore: null, points: 0 }
        const correctAnswer = (content.correct_answer ?? '').trim()
        if (!correctAnswer) return { correct: false, explanation: null, semanticScore: null, points: 0 }
        const result = await semanticService.gradeSemantic(correctAnswer, user)
        return { correct: result.is_correct, explanation: result.explanation, semanticScore: result.score, points: result.score }
      }
      case 'mcq': {
        if (answer === null || answer === undefined) return { correct: false, explanation: null, semanticScore: null, points: 0 }
        const idx = Number(answer)
        const opts = content.options ?? []
        const correct = !isNaN(idx) && opts[idx]?.correct === true
        return { correct, explanation: null, semanticScore: null, points: correct ? 1 : 0 }
      }
      case 'fill_blank': {
        const blanks = content.blanks ?? []
        const userBlanks = Array.isArray(answer) ? answer : []
        const correct = (
          blanks.length > 0 &&
          blanks.every((b, i) => (userBlanks[i] ?? '').trim().toLowerCase() === b.trim().toLowerCase())
        )
        return { correct, explanation: null, semanticScore: null, points: correct ? 1 : 0 }
      }
      case 'reorder': {
        const fragments = content.fragments ?? []
        const userOrder = Array.isArray(answer) ? answer : []
        const correct = (
          fragments.length > 0 &&
          fragments.length === userOrder.length &&
          fragments.every((f, i) => f === userOrder[i])
        )
        return { correct, explanation: null, semanticScore: null, points: correct ? 1 : 0 }
      }
      default:
        return { correct: false, explanation: null, semanticScore: null, points: 0 }
    }
  }

  _formatCorrectAnswer(question) {
    const content = question.content ?? {}
    switch (question.type) {
      case 'open': return content.correct_answer ?? '—'
      case 'mcq': {
        const correct = (content.options ?? []).find(o => o.correct)
        return correct?.text ?? '—'
      }
      case 'fill_blank': return (content.blanks ?? []).join(' / ')
      case 'reorder': return (content.fragments ?? []).join(' ')
      default: return '—'
    }
  }
}

module.exports = new TestService()
