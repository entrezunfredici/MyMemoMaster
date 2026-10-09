const request = require('supertest')
const express = require('express')

jest.mock('../../middlewares/Auth.middleware', () => (req, res, next) => {
  if (!req.headers.authorization) return res.status(401).send({ message: 'Non authentifié.' })
  next()
})
jest.mock('../../services/MistralGrading.service', () => ({ grade: jest.fn() }))

const mistralGradingService = require('../../services/MistralGrading.service')
const mistralGradingRoutes = require('../../routes/MistralGrading.routes')

const app = express()
app.use(express.json())
mistralGradingRoutes(app)

describe('POST /grading/mistral', () => {
  beforeEach(() => jest.clearAllMocks())

  it('POST /grading/mistral - données valides - 200 et verdict du service', async () => {
    mistralGradingService.grade.mockResolvedValue({ is_correct: true, score: 0.67, strategy: 'mistral' })
    const res = await request(app)
      .post('/grading/mistral')
      .set('Authorization', 'Bearer x')
      .send({ question: 'Q ?', correct_answers: ['ref'], student_answer: 'rep' })
    expect(res.status).toBe(200)
    expect(res.body.strategy).toBe('mistral')
    expect(mistralGradingService.grade).toHaveBeenCalledWith(['ref'], 'rep', 'Q ?')
  })

  it('POST /grading/mistral - sans token - 401', async () => {
    const res = await request(app).post('/grading/mistral').send({ correct_answers: 'ref', student_answer: 'rep' })
    expect(res.status).toBe(401)
    expect(mistralGradingService.grade).not.toHaveBeenCalled()
  })

  it('POST /grading/mistral - correct_answers manquant - 400', async () => {
    const res = await request(app).post('/grading/mistral').set('Authorization', 'Bearer x').send({ student_answer: 'rep' })
    expect(res.status).toBe(400)
  })

  it('POST /grading/mistral - question non textuelle - 400', async () => {
    const res = await request(app)
      .post('/grading/mistral')
      .set('Authorization', 'Bearer x')
      .send({ question: 12, correct_answers: 'ref', student_answer: 'rep' })
    expect(res.status).toBe(400)
  })

  it('POST /grading/mistral - erreur du service - 500 en français', async () => {
    mistralGradingService.grade.mockRejectedValue(new Error('boom'))
    const res = await request(app)
      .post('/grading/mistral')
      .set('Authorization', 'Bearer x')
      .send({ correct_answers: 'ref', student_answer: 'rep' })
    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Erreur lors de la correction par Mistral.')
  })
})
