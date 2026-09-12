const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { Question, Test, Response, LeitnerCard } = require('../models/index')
const { s3Client, bucket } = require('../config/storage.config')
const logger = require('../helpers/logger')

// Champs image transmis par le client (le front uploade d'abord via POST /storage/upload, puis
// envoie ces champs — même pattern que ClassGroupResource, voir Question.validators.js). `imageSource`
// n'en fait pas partie : fixé par le serveur, jamais par le client.
const IMAGE_FIELDS = ['imageUrl', 'imageKey', 'imageMimeType', 'imageOriginalName', 'imageSize']

/**
 * Extrait les champs image d'un payload client et détermine `imageSource`.
 *
 * @param {object} data
 * @returns {{ imageUrl: string|null, imageKey: string|null, imageMimeType: string|null, imageOriginalName: string|null, imageSize: number|null, imageSource: 'manual'|null }}
 */
function extractImageFields(data) {
  const hasImage = IMAGE_FIELDS.some((field) => data[field] !== undefined)
  if (!hasImage) return {}
  const image = {}
  for (const field of IMAGE_FIELDS) {
    image[field] = data[field] ?? null
  }
  // Une URL vide/nulle envoyée explicitement retire l'image (imageSource repasse à null).
  image.imageSource = image.imageUrl ? 'manual' : null
  return image
}

class QuestionService {
  async getAllQuestions() {
    return await Question.findAll()
  }

  async getQuestionsByTest(testId) {
    return await Question.findAll({
      include: [
        {
          model: Test,
          as: 'test',
          where: { testId }
        }
      ]
    })
  }

  async getQuestionByCard(cardId) {
    return await Question.findOne({
      include: [
        {
          model: LeitnerCard,
          as: 'leitnerCard',
          where: { idCard: cardId }
        }
      ]
    })
  }

  async findOne(id) {
    return await Question.findByPk(id)
  }

  async getCorrectionByQuestion(idQuestion) {
    return await Response.findOne({
      where: { idQuestion, correction: true }
    })
  }

  async create(data) {
    const { statement, questionPosition, type, content = null, idTest } = data
    const question = await Question.create({
      statement,
      questionPosition,
      type,
      content,
      ...extractImageFields(data)
    })
    if (idTest) {
      const test = await Test.findByPk(idTest)
      if (test) await question.addTest(test)
    }
    return question
  }

  async update(id, data) {
    const question = await Question.findByPk(id)
    if (!question) {
      throw Object.assign(new Error('Question introuvable'), { code: 'NOT_FOUND' })
    }
    const { statement, questionPosition, type, content } = data
    const imageFields = extractImageFields(data)
    // Remplacement/retrait d'image : l'ancien objet S3 devient orphelin, on le nettoie — même
    // raisonnement que ClassGroupResourceService.delete.
    if ('imageKey' in imageFields && question.imageKey && question.imageKey !== imageFields.imageKey) {
      await this._deleteImageObject(question.imageKey)
    }
    return await question.update({ statement, questionPosition, type, content, ...imageFields })
  }

  /**
   * Retire l'image rattachée à une question (et supprime l'objet S3 correspondant, best-effort).
   *
   * @param {number|string} id
   * @returns {Promise<import('../models/Question.model')>}
   * @throws {Error} Question introuvable (code NOT_FOUND)
   */
  async removeImage(id) {
    const question = await Question.findByPk(id)
    if (!question) {
      throw Object.assign(new Error('Question introuvable'), { code: 'NOT_FOUND' })
    }
    if (question.imageKey) {
      await this._deleteImageObject(question.imageKey)
    }
    return await question.update({
      imageUrl: null,
      imageKey: null,
      imageMimeType: null,
      imageOriginalName: null,
      imageSize: null,
      imageSource: null
    })
  }

  /**
   * Supprime un objet S3 sans faire échouer l'appelant en cas d'erreur (fichier déjà supprimé,
   * bucket indisponible...) — même politique que ClassGroupResourceService.delete.
   *
   * @param {string} key
   * @returns {Promise<void>}
   */
  async _deleteImageObject(key) {
    if (!bucket) return
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    } catch (err) {
      logger.warn(`[Question] Impossible de supprimer l'image S3 ${key}: ${err?.message}`)
    }
  }

  async delete(id) {
    const question = await Question.findByPk(id)
    if (!question) {
      throw Object.assign(new Error('Question introuvable'), { code: 'NOT_FOUND' })
    }
    if (question.imageKey) {
      await this._deleteImageObject(question.imageKey)
    }
    return await question.destroy()
  }
}

module.exports = new QuestionService()
