const { Question, Test, LeitnerCard, Response } = require('../../models/index')
const QuestionService = require('../../services/Question.service')

jest.mock('../../models/index', () => ({
  Question: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  Test: {
    findAll: jest.fn(),
    findByPk: jest.fn()
  },
  LeitnerCard: {
    findOne: jest.fn()
  },
  Response: {
    findOne: jest.fn()
  }
}))

jest.mock('@aws-sdk/client-s3', () => ({
  DeleteObjectCommand: jest.fn()
}))

jest.mock('../../config/storage.config', () => ({
  s3Client: { send: jest.fn() },
  bucket: 'test-bucket'
}))

jest.mock('../../helpers/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }))

describe('QuestionService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should retrieve all questions', async () => {
    const mockQuestions = [
      { idQuestion: 1, statement: 'Question 1', questionPosition: 1, type: 'Type 1' },
      { idQuestion: 2, statement: 'Question 2', questionPosition: 2, type: 'Type 2' }
    ]
    Question.findAll.mockResolvedValue(mockQuestions)

    const questions = await QuestionService.getAllQuestions()

    expect(Question.findAll).toHaveBeenCalledTimes(1)
    expect(questions).toEqual(mockQuestions)
  })

  test('should retrieve questions by test ID', async () => {
    const testId = 1
    const mockQuestions = [
      { idQuestion: 1, statement: 'Question 1', questionPosition: 1, type: 'Type 1' },
      { idQuestion: 2, statement: 'Question 2', questionPosition: 2, type: 'Type 2' }
    ]
    Question.findAll.mockResolvedValue(mockQuestions)

    const questions = await QuestionService.getQuestionsByTest(testId)

    expect(Question.findAll).toHaveBeenCalledWith({
      include: [{ model: Test, as: 'test', where: { testId: testId } }]
    })
    expect(questions).toEqual(mockQuestions)
  })

  test('should retrieve question by card ID', async () => {
    const cardId = 1
    const mockQuestion = {
      idQuestion: 1,
      statement: 'Question 1',
      questionPosition: 1,
      type: 'Type 1'
    }
    Question.findOne.mockResolvedValue(mockQuestion)

    const question = await QuestionService.getQuestionByCard(cardId)

    expect(Question.findOne).toHaveBeenCalledWith({
      include: [{ model: LeitnerCard, as: 'leitnerCard', where: { idCard: cardId } }]
    })
    expect(question).toEqual(mockQuestion)
  })

  test('should retrieve a question by ID', async () => {
    const mockQuestion = {
      idQuestion: 1,
      statement: 'Question 1',
      questionPosition: 1,
      type: 'Type 1'
    }
    Question.findByPk.mockResolvedValue(mockQuestion)

    const question = await QuestionService.findOne(1)

    expect(Question.findByPk).toHaveBeenCalledWith(1)
    expect(question).toEqual(mockQuestion)
  })

  test('should retrieve the correction for a specific question', async () => {
    const idQuestion = 1
    const mockResponse = {
      idResponse: 1,
      content: 'Correction',
      correction: true,
      idQuestion: idQuestion
    }
    Response.findOne.mockResolvedValue(mockResponse)

    const correction = await QuestionService.getCorrectionByQuestion(idQuestion)

    expect(Response.findOne).toHaveBeenCalledWith({
      where: { idQuestion: idQuestion, correction: true }
    })
    expect(correction).toEqual(mockResponse)
  })

  test('should create a new question', async () => {
    const newQuestion = {
      statement: 'New Question',
      questionPosition: 1,
      type: 'Type 1',
      idTest: 1,
      idCard: 1
    }
    const mockQuestion = { idQuestion: 3, ...newQuestion }
    Question.create.mockResolvedValue(mockQuestion)

    const question = await QuestionService.create(newQuestion)

    expect(Question.create).toHaveBeenCalledWith({ statement: 'New Question', questionPosition: 1, type: 'Type 1', content: null })
    expect(question).toEqual(mockQuestion)
  })

  test('should create a question with an image - sets imageSource to manual', async () => {
    const newQuestion = {
      statement: 'New Question',
      questionPosition: 1,
      type: 'Type 1',
      imageUrl: 'https://bucket.s3.amazonaws.com/uploads/1/img.png',
      imageKey: 'uploads/1/img.png',
      imageMimeType: 'image/png',
      imageOriginalName: 'schema.png',
      imageSize: 12345
    }
    Question.create.mockResolvedValue({ idQuestion: 4, ...newQuestion })

    await QuestionService.create(newQuestion)

    expect(Question.create).toHaveBeenCalledWith({
      statement: 'New Question',
      questionPosition: 1,
      type: 'Type 1',
      content: null,
      imageUrl: 'https://bucket.s3.amazonaws.com/uploads/1/img.png',
      imageKey: 'uploads/1/img.png',
      imageMimeType: 'image/png',
      imageOriginalName: 'schema.png',
      imageSize: 12345,
      imageSource: 'manual'
    })
  })

  test('should create a question with imageSource "ai" - preserves it (Ticket B)', async () => {
    const newQuestion = {
      statement: 'New Question',
      questionPosition: 1,
      type: 'Type 1',
      imageUrl: 'https://bucket.s3.amazonaws.com/uploads/1/img.png',
      imageKey: 'uploads/1/img.png',
      imageSource: 'ai'
    }
    Question.create.mockResolvedValue({ idQuestion: 5, ...newQuestion })

    await QuestionService.create(newQuestion)

    expect(Question.create).toHaveBeenCalledWith(
      expect.objectContaining({ imageSource: 'ai', imageUrl: newQuestion.imageUrl })
    )
  })

  test('should create a question with an unrecognized imageSource - falls back to manual', async () => {
    const newQuestion = {
      statement: 'New Question',
      questionPosition: 1,
      type: 'Type 1',
      imageUrl: 'https://bucket.s3.amazonaws.com/uploads/1/img.png',
      imageSource: 'something-else'
    }
    Question.create.mockResolvedValue({ idQuestion: 6, ...newQuestion })

    await QuestionService.create(newQuestion)

    expect(Question.create).toHaveBeenCalledWith(expect.objectContaining({ imageSource: 'manual' }))
  })

  test('should update an existing question', async () => {
    const mockQuestion = {
      update: jest.fn().mockResolvedValue({
        idQuestion: 1,
        statement: 'Updated Question',
        questionPosition: 1,
        type: 'Type 1'
      })
    }
    Question.findByPk.mockResolvedValue(mockQuestion)

    const updatedQuestion = await QuestionService.update(1, {
      statement: 'Updated Question',
      questionPosition: 1,
      type: 'Type 1'
    })

    expect(Question.findByPk).toHaveBeenCalledWith(1)
    expect(mockQuestion.update).toHaveBeenCalledWith({
      statement: 'Updated Question',
      questionPosition: 1,
      type: 'Type 1'
    })
    expect(updatedQuestion).toEqual({
      idQuestion: 1,
      statement: 'Updated Question',
      questionPosition: 1,
      type: 'Type 1'
    })
  })

  test('should delete the previous S3 image when the image is replaced', async () => {
    const { s3Client } = require('../../config/storage.config')
    s3Client.send.mockResolvedValue({})
    const mockQuestion = {
      imageKey: 'uploads/1/old.png',
      update: jest.fn().mockResolvedValue({ idQuestion: 1, imageKey: 'uploads/1/new.png' })
    }
    Question.findByPk.mockResolvedValue(mockQuestion)

    await QuestionService.update(1, {
      statement: 'Question',
      questionPosition: 1,
      type: 'Type 1',
      imageUrl: 'https://bucket.s3.amazonaws.com/uploads/1/new.png',
      imageKey: 'uploads/1/new.png'
    })

    expect(s3Client.send).toHaveBeenCalledTimes(1)
    expect(mockQuestion.update).toHaveBeenCalledWith(
      expect.objectContaining({ imageKey: 'uploads/1/new.png', imageSource: 'manual' })
    )
  })

  test('should not delete the S3 image when the image key is unchanged', async () => {
    const { s3Client } = require('../../config/storage.config')
    const mockQuestion = {
      imageKey: 'uploads/1/same.png',
      update: jest.fn().mockResolvedValue({ idQuestion: 1 })
    }
    Question.findByPk.mockResolvedValue(mockQuestion)

    await QuestionService.update(1, { statement: 'Question', imageKey: 'uploads/1/same.png', imageUrl: 'https://x/uploads/1/same.png' })

    expect(s3Client.send).not.toHaveBeenCalled()
  })

  test('should delete a question by ID', async () => {
    const mockQuestion = {
      destroy: jest.fn().mockResolvedValue(true)
    }
    Question.findByPk.mockResolvedValue(mockQuestion)

    const result = await QuestionService.delete(1)

    expect(Question.findByPk).toHaveBeenCalledWith(1)
    expect(mockQuestion.destroy).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  test('should delete the S3 image when deleting a question that has one', async () => {
    const { s3Client } = require('../../config/storage.config')
    s3Client.send.mockResolvedValue({})
    const mockQuestion = {
      imageKey: 'uploads/1/img.png',
      destroy: jest.fn().mockResolvedValue(true)
    }
    Question.findByPk.mockResolvedValue(mockQuestion)

    const result = await QuestionService.delete(1)

    expect(s3Client.send).toHaveBeenCalledTimes(1)
    expect(mockQuestion.destroy).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  test('should delete a question by ID - NOT_FOUND', async () => {
    Question.findByPk.mockResolvedValue(null)

    await expect(QuestionService.delete(99)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  describe('removeImage', () => {
    test('should remove the image and delete the S3 object', async () => {
      const { s3Client } = require('../../config/storage.config')
      s3Client.send.mockResolvedValue({})
      const mockQuestion = {
        imageKey: 'uploads/1/img.png',
        update: jest.fn().mockResolvedValue({ idQuestion: 1, imageUrl: null })
      }
      Question.findByPk.mockResolvedValue(mockQuestion)

      const result = await QuestionService.removeImage(1)

      expect(s3Client.send).toHaveBeenCalledTimes(1)
      expect(mockQuestion.update).toHaveBeenCalledWith({
        imageUrl: null,
        imageKey: null,
        imageMimeType: null,
        imageOriginalName: null,
        imageSize: null,
        imageSource: null
      })
      expect(result).toEqual({ idQuestion: 1, imageUrl: null })
    })

    test('should not call S3 when the question has no image', async () => {
      const { s3Client } = require('../../config/storage.config')
      const mockQuestion = {
        imageKey: null,
        update: jest.fn().mockResolvedValue({ idQuestion: 1 })
      }
      Question.findByPk.mockResolvedValue(mockQuestion)

      await QuestionService.removeImage(1)

      expect(s3Client.send).not.toHaveBeenCalled()
      expect(mockQuestion.update).toHaveBeenCalled()
    })

    test('should throw NOT_FOUND when the question does not exist', async () => {
      Question.findByPk.mockResolvedValue(null)

      await expect(QuestionService.removeImage(99)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })
})
