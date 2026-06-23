const dayjs = require('dayjs')
const kpiService = require('../../services/Kpi.service')

jest.mock('../../models', () => ({
  RevisionSession: { findAll: jest.fn() },
  TestResult: { findAll: jest.fn() },
  Test: {},
  Subject: {},
  LeitnerSystem: { findAll: jest.fn() },
  LeitnerBox: {},
  LeitnerCard: {}
}))

const { RevisionSession, TestResult, LeitnerSystem } = require('../../models')

// --- Fixtures ---
const T = dayjs()
const fmt = (d) => d.format('YYYY-MM-DD')
const today = fmt(T)
const yesterday = fmt(T.subtract(1, 'day'))
const daysAgo = (n) => fmt(T.subtract(n, 'day'))

const session = (date, isDone, startTime = '09:00:00', endTime = '10:00:00') =>
  ({ date, isDone, startTime, endTime })

const testResult = (score, total, completedAt = '2026-06-20T10:00:00Z', name = 'Test', subjectId = 1) => ({
  score, total, completedAt,
  test: { testId: 1, name, subjectId, subject: { subjectId, name: 'Maths' } }
})

const card = (correct, reviews, next_review_at = null) =>
  ({ correct_count: correct, review_count: reviews, next_review_at })

const box = (level, cards) => ({ level, leitnerCards: cards })

const leitnerSystem = (boxes, subject = { subjectId: 1, name: 'Maths' }) =>
  ({ leitnerBoxes: boxes, subject })

const emptyKpiInput = (overrides = {}) => ({
  revisionKpi: { streakDays: 0, completedLast30Days: 0 },
  exercisesKpi: { totalTests: 0, scoreHistory: [] },
  leitnerKpi: { mastery: 0 },
  subjectsKpi: { totalUnique: 0 },
  ...overrides
})

describe('KpiService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ─── getMyKpis ────────────────────────────────────────────────────────────────

  describe('getMyKpis', () => {
    it('retourne toutes les sections attendues', async () => {
      RevisionSession.findAll.mockResolvedValue([])
      TestResult.findAll.mockResolvedValue([])
      LeitnerSystem.findAll.mockResolvedValue([])

      const kpis = await kpiService.getMyKpis(1)

      expect(kpis).toHaveProperty('revision')
      expect(kpis).toHaveProperty('exercises')
      expect(kpis).toHaveProperty('leitner')
      expect(kpis).toHaveProperty('subjects')
      expect(kpis).toHaveProperty('discipline')
      expect(kpis).toHaveProperty('badges')
      expect(kpis.badges).toHaveLength(7)
    })

    it('appelle chaque modèle avec le bon userId', async () => {
      RevisionSession.findAll.mockResolvedValue([])
      TestResult.findAll.mockResolvedValue([])
      LeitnerSystem.findAll.mockResolvedValue([])

      await kpiService.getMyKpis(42)

      expect(RevisionSession.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42 } }))
      expect(TestResult.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42 } }))
      expect(LeitnerSystem.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { idUser: 42 } }))
    })

    it('propage l\'erreur si un modèle échoue', async () => {
      RevisionSession.findAll.mockRejectedValue(new Error('DB down'))
      TestResult.findAll.mockResolvedValue([])
      LeitnerSystem.findAll.mockResolvedValue([])

      await expect(kpiService.getMyKpis(1)).rejects.toThrow('DB down')
    })
  })

  // ─── _computeRevision ─────────────────────────────────────────────────────────

  describe('_computeRevision', () => {
    it('aucune session — retourne des zéros et 8 semaines vides', () => {
      const r = kpiService._computeRevision([])

      expect(r.totalPlanned).toBe(0)
      expect(r.totalCompleted).toBe(0)
      expect(r.completionRate).toBe(0)
      expect(r.streakDays).toBe(0)
      expect(r.totalMinutes).toBe(0)
      expect(r.weeklyActivity).toHaveLength(8)
      expect(r.weeklyActivity.every((w) => w.count === 0)).toBe(true)
    })

    it('completionRate = 75 avec 3 sessions sur 4 complétées', () => {
      const sessions = [
        session(today, true),
        session(yesterday, true),
        session(daysAgo(2), true),
        session(daysAgo(3), false)
      ]
      const r = kpiService._computeRevision(sessions)

      expect(r.totalPlanned).toBe(4)
      expect(r.totalCompleted).toBe(3)
      expect(r.completionRate).toBe(75)
    })

    it('streak = 3 avec sessions les 3 derniers jours consécutifs incluant aujourd\'hui', () => {
      const sessions = [session(today, true), session(yesterday, true), session(daysAgo(2), true)]
      const r = kpiService._computeRevision(sessions)

      expect(r.streakDays).toBe(3)
    })

    it('streak = 2 quand le dernier jour complet est hier (pas encore révisé aujourd\'hui)', () => {
      const sessions = [session(yesterday, true), session(daysAgo(2), true)]
      const r = kpiService._computeRevision(sessions)

      expect(r.streakDays).toBe(2)
    })

    it('streak = 1 quand il y a un gap d\'un jour entre deux sessions complétées', () => {
      const sessions = [session(today, true), session(daysAgo(2), true)] // manque hier
      const r = kpiService._computeRevision(sessions)

      expect(r.streakDays).toBe(1)
    })

    it('streak = 0 quand la dernière session complétée date d\'avant-hier', () => {
      const r = kpiService._computeRevision([session(daysAgo(2), true)])

      expect(r.streakDays).toBe(0)
    })

    it('streak ne compte pas les sessions non complétées (isDone = false)', () => {
      const sessions = [session(today, false), session(yesterday, true)]
      const r = kpiService._computeRevision(sessions)

      expect(r.streakDays).toBe(1) // uniquement hier
    })

    it('plusieurs sessions le même jour comptent comme un seul jour de streak', () => {
      const sessions = [session(today, true), session(today, true), session(yesterday, true)]
      const r = kpiService._computeRevision(sessions)

      expect(r.streakDays).toBe(2) // aujourd'hui + hier
    })

    it('totalMinutes additionne les durées des sessions complétées uniquement', () => {
      const sessions = [
        session(today, true, '09:00:00', '10:30:00'),    // 90 min ✓
        session(yesterday, true, '14:00:00', '15:00:00'), // 60 min ✓
        session(daysAgo(2), false, '08:00:00', '09:00:00') // 60 min ✗ (non complétée)
      ]
      const r = kpiService._computeRevision(sessions)

      expect(r.totalMinutes).toBe(150)
    })

    it('weeklyActivity retourne exactement 8 entrées', () => {
      const r = kpiService._computeRevision([])

      expect(r.weeklyActivity).toHaveLength(8)
    })

    it('weeklyActivity — sessions de la semaine courante incrémentent la dernière entrée', () => {
      const sessions = [session(today, true), session(today, true)]
      const r = kpiService._computeRevision(sessions)

      const lastEntry = r.weeklyActivity[r.weeklyActivity.length - 1]
      expect(lastEntry.count).toBe(2)
    })

    it('sessionsLast30Days exclut les sessions de plus de 30 jours', () => {
      const sessions = [
        session(daysAgo(15), true),  // incluse
        session(daysAgo(31), true)   // exclue
      ]
      const r = kpiService._computeRevision(sessions)

      expect(r.sessionsLast30Days).toBe(1)
      expect(r.completedLast30Days).toBe(1)
    })
  })

  // ─── _computeExercises ────────────────────────────────────────────────────────

  describe('_computeExercises', () => {
    it('aucun résultat — retourne des zéros et scoreHistory vide', () => {
      const r = kpiService._computeExercises([])

      expect(r.totalTests).toBe(0)
      expect(r.avgScore).toBe(0)
      expect(r.recentTrend).toBe(0)
      expect(r.scoreHistory).toHaveLength(0)
    })

    it('score parfait — avgScore = 100', () => {
      const r = kpiService._computeExercises([testResult(10, 10)])

      expect(r.avgScore).toBe(100)
      expect(r.maxScore).toBe(100)
      expect(r.minScore).toBe(100)
      expect(r.totalTests).toBe(1)
    })

    it('plusieurs résultats — calcule avgScore, maxScore, minScore correctement', () => {
      // 50%, 80%, 70% → avg = 67%, max = 80%, min = 50%
      const results = [testResult(5, 10), testResult(8, 10), testResult(7, 10)]
      const r = kpiService._computeExercises(results)

      expect(r.avgScore).toBe(67)
      expect(r.maxScore).toBe(80)
      expect(r.minScore).toBe(50)
    })

    it('recentTrend positif quand les scores récents progressent', () => {
      // [50%, 50%, 80%, 80%] — seconde moitié meilleure de +30
      const results = [testResult(5, 10), testResult(5, 10), testResult(8, 10), testResult(8, 10)]
      const r = kpiService._computeExercises(results)

      expect(r.recentTrend).toBe(30)
    })

    it('recentTrend = 0 avec moins de 4 résultats', () => {
      const r = kpiService._computeExercises([testResult(5, 10), testResult(8, 10)])

      expect(r.recentTrend).toBe(0)
    })

    it('scoreHistory limité aux 10 derniers résultats (plus récent en premier)', () => {
      const results = Array.from({ length: 12 }, (_, i) => ({
        score: 7, total: 10,
        completedAt: `2026-06-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        test: { testId: i, name: `Test ${i}`, subjectId: 1, subject: { subjectId: 1, name: 'Maths' } }
      }))
      const r = kpiService._computeExercises(results)

      expect(r.scoreHistory).toHaveLength(10)
      // Le plus récent est en tête (résultat du 12 juin, index 11 après reverse)
      expect(r.scoreHistory[0].date).toBe('2026-06-12T10:00:00Z')
    })
  })

  // ─── _computeLeitner ──────────────────────────────────────────────────────────

  describe('_computeLeitner', () => {
    it('aucun système — retourne des zéros', () => {
      const r = kpiService._computeLeitner([])

      expect(r.totalCards).toBe(0)
      expect(r.globalSuccessRate).toBe(0)
      expect(r.mastery).toBe(0)
      expect(r.cardsDue).toBe(0)
      expect(r.cardsByBox).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
    })

    it('répartition correcte des cartes dans cardsByBox', () => {
      const sys = leitnerSystem([
        box(1, [card(0, 0), card(0, 0)]),  // 2 en B1
        box(3, [card(0, 0)]),               // 1 en B3
        box(5, [card(0, 0), card(0, 0)])    // 2 en B5
      ])
      const r = kpiService._computeLeitner([sys])

      expect(r.totalCards).toBe(5)
      expect(r.cardsByBox[1]).toBe(2)
      expect(r.cardsByBox[2]).toBe(0)
      expect(r.cardsByBox[3]).toBe(1)
      expect(r.cardsByBox[5]).toBe(2)
    })

    it('globalSuccessRate calculé depuis correct_count / review_count', () => {
      const sys = leitnerSystem([box(1, [card(8, 10), card(6, 10)])])
      // (8+6) / (10+10) = 70%
      const r = kpiService._computeLeitner([sys])

      expect(r.globalSuccessRate).toBe(70)
    })

    it('mastery = % de cartes en boîte 4 ou 5', () => {
      const sys = leitnerSystem([
        box(1, [card(0, 0), card(0, 0)]),  // 2 cartes B1
        box(4, [card(0, 0)]),              // 1 carte B4
        box(5, [card(0, 0)])               // 1 carte B5
      ])
      // 2 avancées / 4 total = 50%
      const r = kpiService._computeLeitner([sys])

      expect(r.mastery).toBe(50)
    })

    it('cardsDue compte les cartes sans next_review_at (null)', () => {
      const sys = leitnerSystem([box(1, [card(0, 0, null), card(0, 0, null)])])
      const r = kpiService._computeLeitner([sys])

      expect(r.cardsDue).toBe(2)
    })

    it('cardsDue compte les cartes avec next_review_at dans le passé, mais pas dans le futur', () => {
      const past = new Date(Date.now() - 86_400_000).toISOString()   // hier
      const future = new Date(Date.now() + 86_400_000).toISOString() // demain
      const sys = leitnerSystem([box(1, [card(0, 0, past), card(0, 0, future)])])
      const r = kpiService._computeLeitner([sys])

      expect(r.cardsDue).toBe(1)
    })

    it('fusionne correctement plusieurs systèmes', () => {
      const sys1 = leitnerSystem([box(1, [card(0, 0)])])
      const sys2 = leitnerSystem([box(5, [card(0, 0), card(0, 0)])])
      const r = kpiService._computeLeitner([sys1, sys2])

      expect(r.totalCards).toBe(3)
      expect(r.cardsByBox[1]).toBe(1)
      expect(r.cardsByBox[5]).toBe(2)
    })
  })

  // ─── _computeSubjects ─────────────────────────────────────────────────────────

  describe('_computeSubjects', () => {
    it('aucune donnée — totalUnique = 0', () => {
      const r = kpiService._computeSubjects([], [])

      expect(r.totalUnique).toBe(0)
      expect(r.list).toHaveLength(0)
    })

    it('même sujet dans TestResult et LeitnerSystem — compté une seule fois', () => {
      const results = [testResult(5, 10)]
      const systems = [leitnerSystem([box(1, [])], { subjectId: 1, name: 'Maths' })]
      const r = kpiService._computeSubjects(results, systems)

      expect(r.totalUnique).toBe(1)
      expect(r.list[0].tests).toBe(1)
      expect(r.list[0].systems).toBe(1)
    })

    it('sujets différents — chacun compté séparément', () => {
      const results = [
        { score: 5, total: 10, completedAt: '2026-06-01T10:00:00Z', test: { testId: 1, name: 'A', subjectId: 1, subject: { subjectId: 1, name: 'Maths' } } },
        { score: 5, total: 10, completedAt: '2026-06-02T10:00:00Z', test: { testId: 2, name: 'B', subjectId: 2, subject: { subjectId: 2, name: 'Physique' } } }
      ]
      const r = kpiService._computeSubjects(results, [])

      expect(r.totalUnique).toBe(2)
    })

    it('système Leitner sans sujet (subject = null) — ignoré', () => {
      const systems = [{ leitnerBoxes: [], subject: null }]
      const r = kpiService._computeSubjects([], systems)

      expect(r.totalUnique).toBe(0)
    })

    it('résultat sans test.subject — ignoré', () => {
      const results = [{ score: 5, total: 10, completedAt: '2026-06-01T10:00:00Z', test: null }]
      const r = kpiService._computeSubjects(results, [])

      expect(r.totalUnique).toBe(0)
    })
  })

  // ─── _computeDiscipline ───────────────────────────────────────────────────────

  describe('_computeDiscipline', () => {
    it('aucune session — retourne des zéros', () => {
      const r = kpiService._computeDiscipline([])

      expect(r.disciplineScore).toBe(0)
      expect(r.plannedThisWeek).toBe(0)
      expect(r.completedThisWeek).toBe(0)
    })

    it('toutes les sessions complétées — disciplineScore = 100', () => {
      const sessions = [session(daysAgo(5), true), session(daysAgo(10), true)]
      const r = kpiService._computeDiscipline(sessions)

      expect(r.disciplineScore).toBe(100)
    })

    it('sessions de la semaine courante comptées dans plannedThisWeek', () => {
      const sessions = [session(today, true), session(today, false)]
      const r = kpiService._computeDiscipline(sessions)

      expect(r.plannedThisWeek).toBe(2)
      expect(r.completedThisWeek).toBe(1)
    })

    it('sessions de plus de 30 jours ignorées dans disciplineScore', () => {
      const sessions = [
        session(daysAgo(15), true),  // dans les 30 jours — incluse
        session(daysAgo(31), false)  // hors des 30 jours — ignorée
      ]
      const r = kpiService._computeDiscipline(sessions)

      expect(r.disciplineScore).toBe(100) // 1/1 = 100%
    })
  })

  // ─── _computeBadges ───────────────────────────────────────────────────────────

  describe('_computeBadges', () => {
    it('retourne exactement 7 badges', () => {
      expect(kpiService._computeBadges(emptyKpiInput())).toHaveLength(7)
    })

    it('streak7 — débloqué si streakDays >= 7', () => {
      const badges = kpiService._computeBadges(emptyKpiInput({ revisionKpi: { streakDays: 7, completedLast30Days: 0 } }))
      expect(badges.find((b) => b.id === 'streak7').unlocked).toBe(true)
    })

    it('streak7 — verrouillé si streakDays < 7', () => {
      const badges = kpiService._computeBadges(emptyKpiInput())
      expect(badges.find((b) => b.id === 'streak7').unlocked).toBe(false)
    })

    it('streak30 — débloqué si streakDays >= 30', () => {
      const badges = kpiService._computeBadges(emptyKpiInput({ revisionKpi: { streakDays: 30, completedLast30Days: 0 } }))
      expect(badges.find((b) => b.id === 'streak30').unlocked).toBe(true)
    })

    it('perfectScore — débloqué si un score à 100% dans l\'historique', () => {
      const badges = kpiService._computeBadges(emptyKpiInput({
        exercisesKpi: { totalTests: 2, scoreHistory: [{ percentage: 80 }, { percentage: 100 }] }
      }))
      expect(badges.find((b) => b.id === 'perfectScore').unlocked).toBe(true)
    })

    it('perfectScore — verrouillé si aucun score à 100%', () => {
      const badges = kpiService._computeBadges(emptyKpiInput({
        exercisesKpi: { totalTests: 2, scoreHistory: [{ percentage: 80 }, { percentage: 90 }] }
      }))
      expect(badges.find((b) => b.id === 'perfectScore').unlocked).toBe(false)
    })

    it('tenTests — débloqué si totalTests >= 10', () => {
      const badges = kpiService._computeBadges(emptyKpiInput({
        exercisesKpi: { totalTests: 10, scoreHistory: [] }
      }))
      expect(badges.find((b) => b.id === 'tenTests').unlocked).toBe(true)
    })

    it('tenTests — verrouillé si totalTests < 10', () => {
      const badges = kpiService._computeBadges(emptyKpiInput({
        exercisesKpi: { totalTests: 9, scoreHistory: [] }
      }))
      expect(badges.find((b) => b.id === 'tenTests').unlocked).toBe(false)
    })

    it('fiveSubjects — débloqué si totalUnique >= 5', () => {
      const badges = kpiService._computeBadges(emptyKpiInput({ subjectsKpi: { totalUnique: 5 } }))
      expect(badges.find((b) => b.id === 'fiveSubjects').unlocked).toBe(true)
    })

    it('leitnerMastery — débloqué si mastery >= 50', () => {
      const badges = kpiService._computeBadges(emptyKpiInput({ leitnerKpi: { mastery: 50 } }))
      expect(badges.find((b) => b.id === 'leitnerMastery').unlocked).toBe(true)
    })

    it('leitnerMastery — verrouillé si mastery < 50', () => {
      const badges = kpiService._computeBadges(emptyKpiInput({ leitnerKpi: { mastery: 49 } }))
      expect(badges.find((b) => b.id === 'leitnerMastery').unlocked).toBe(false)
    })

    it('regular — débloqué si completedLast30Days >= 20', () => {
      const badges = kpiService._computeBadges(emptyKpiInput({ revisionKpi: { streakDays: 0, completedLast30Days: 20 } }))
      expect(badges.find((b) => b.id === 'regular').unlocked).toBe(true)
    })

    it('regular — verrouillé si completedLast30Days < 20', () => {
      const badges = kpiService._computeBadges(emptyKpiInput({ revisionKpi: { streakDays: 0, completedLast30Days: 19 } }))
      expect(badges.find((b) => b.id === 'regular').unlocked).toBe(false)
    })
  })
})
