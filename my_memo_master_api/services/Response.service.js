const { Question, Response } = require('../models/index')
const AnswerQualityService = require('./AnswerQuality.service')

// Sérialise une instance Sequelize en objet brut sans dépendre de `.toJSON()` — les tests
// unitaires mockent `Response.create`/`response.update` avec de simples objets, sans cette
// méthode d'instance ; défensif aussi contre un futur appelant qui passerait déjà un objet brut.
function toPlain(instance) {
  return typeof instance?.toJSON === 'function' ? instance.toJSON() : instance
}

class ResponseService {
  async getAllResponsesByQuestion(idQuestion) {
    return await Response.findAll({
      where: { idQuestion, correction: false }
    })
  }

  async getCorrectionByQuestion(idQuestion) {
    return await Response.findOne({
      where: { idQuestion, correction: true }
    })
  }

  async findOne(id) {
    return await Response.findByPk(id)
  }

  /**
   * Avertissements + niveau global consultatifs (AnswerQuality.service.js) sur une réponse de
   * référence, tenant compte des autres réponses `correction:true` déjà enregistrées pour la même
   * question (comme reformulations alternatives) — jamais bloquant, uniquement une aide à la
   * relecture pour l'écran de création/édition d'une réponse (cf. DECISIONS.md 2026-09-12).
   *
   * @param {string} statement - Énoncé de la question
   * @param {number} idQuestion
   * @param {string} primaryContent - Contenu de la réponse en cours de création/édition
   * @returns {Promise<{ qualityWarnings: string[], qualityLevel: 'high'|'medium'|'low' }>}
   */
  async computeQuality(statement, idQuestion, primaryContent) {
    const siblings = await Response.findAll({ where: { idQuestion, correction: true } })
    const otherContents = siblings.map((r) => r.content).filter((c) => c !== primaryContent)
    const qualityWarnings = AnswerQualityService.assess(statement, [primaryContent, ...otherContents])
    return { qualityWarnings, qualityLevel: AnswerQualityService.levelFromWarnings(qualityWarnings) }
  }

  async create(data) {
    const { content, idQuestion, correction } = data

    //check if question exist
    const question = await Question.findByPk(idQuestion)
    if (!question) {
      throw new Error('Question not found')
    }

    const response = await Response.create({ content, idQuestion, correction })
    const quality = correction
      ? await this.computeQuality(question.statement, idQuestion, content)
      : { qualityWarnings: [], qualityLevel: null }
    return { ...toPlain(response), ...quality }
  }

  async update(id, data) {
    const { content, idQuestion, correction } = data

    const response = await Response.findByPk(id)
    if (!response) {
      throw new Error('Response not found')
    }
    const updated = await response.update({ content, idQuestion, correction })

    let quality = { qualityWarnings: [], qualityLevel: null }
    if (updated.correction) {
      const question = await Question.findByPk(updated.idQuestion)
      if (question) {
        quality = await this.computeQuality(question.statement, updated.idQuestion, updated.content)
      }
    }
    return { ...toPlain(updated), ...quality }
  }

  /**
   * Aperçu de qualité (AnswerQuality.service.js) SANS aucune persistance ni lecture en base —
   * pour un retour en temps réel pendant la saisie, avant même la création de la Question/Response
   * (ex. modale de création d'une carte Leitner : la question n'existe pas encore). Contrairement
   * à `computeQuality`, ne va PAS chercher d'éventuelles reformulations déjà enregistrées en base :
   * l'appelant doit fournir lui-même la liste complète (`acceptedAnswers`), ce qui est justement le
   * cas côté front à ce stade (déjà dans le formulaire, pas encore sauvegardé) — DECISIONS.md 2026-09-12.
   *
   * @param {string} statement
   * @param {string} answer
   * @param {string[]} [acceptedAnswers]
   * @returns {{ qualityWarnings: string[], qualityLevel: 'high'|'medium'|'low' }}
   */
  previewQuality(statement, answer, acceptedAnswers = []) {
    const qualityWarnings = AnswerQualityService.assess(statement, [answer, ...acceptedAnswers])
    return { qualityWarnings, qualityLevel: AnswerQualityService.levelFromWarnings(qualityWarnings) }
  }

  async delete(id) {
    const response = await Response.findByPk(id)
    if (!response) {
      throw new Error('Response not found')
    }
    return await response.destroy()
  }
}

module.exports = new ResponseService()
