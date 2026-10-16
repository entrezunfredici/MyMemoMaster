const dayjs = require('dayjs')
const kpiService = require('../../services/Kpi.service')

jest.mock('../../models', () => ({
  RevisionSession: { findAll: jest.fn() },
  TestResult: { findAll: jest.fn() },
  Test: {},
  Subject: {},
  LeitnerSystem: { findAll: jest.fn() },
  LeitnerBox: {},
  LeitnerCard: {},
  LeitnerReviewSession: { findAll: jest.fn() },
  Diagramme: {},
  MindMapViewSession: { findAll: jest.fn() }
}))

const { RevisionSession, TestResult, LeitnerSystem, LeitnerReviewSession, MindMapViewSession } = require('../../models')

// --- Fixtures ---
const T = dayjs()
const fmt = (d) => d.format('YYYY-MM-DD')
const today = fmt(T)
const yesterday = fmt(T.subtract(1, 'day'))
const daysAgo = (n) => fmt(T.subtract(n, 'day'))

const session = (date, isDone, startTime = '09:00:00', endTime = '10:00:00') =>
  ({ date, isDone, startTime, endTime })

const testResult = (score, total, completedAt = '2026-06-20T10:00:00Z', name = 'Test', subjectId = 1, durationSeconds = null) => ({
  score, total, completedAt, durationSeconds,
  test: { testId: 1, name, subjectId, subject: { subjectId, name: 'Maths' } }
})

const leitnerReviewSession = (durationSeconds) => ({ durationSeconds })

const mindMapViewSession = (durationSeconds) => ({ durationSeconds })

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
      LeitnerReviewSession.findAll.mockResolvedValue([])
      MindMapViewSession.findAll.mockResolvedValue([])

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
      LeitnerReviewSession.findAll.mockResolvedValue([])
      MindMapViewSession.findAll.mockResolvedValue([])

      await kpiService.getMyKpis(42)

      expect(RevisionSession.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42 } }))
      expect(TestResult.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42 } }))
      expect(LeitnerSystem.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { idUser: 42 } }))
      expect(LeitnerReviewSession.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42 } }))
      expect(MindMapViewSession.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42 } }))
    })

    it('propage l\'erreur si un modèle échoue', async () => {
      RevisionSession.findAll.mockRejectedValue(new Error('DB down'))
      TestResult.findAll.mockResolvedValue([])
      LeitnerSystem.findAll.mockResolvedValue([])
      LeitnerReviewSession.findAll.mockResolvedValue([])
      MindMapViewSession.findAll.mockResolvedValue([])

      await expect(kpiService.getMyKpis(1)).rejects.toThrow('DB down')
    })

    // Régression : "Temps total de révision" affichait toujours 0 min quand seuls les
    // créneaux planifiés dans RevisionSession étaient comptés (quasiment jamais renseignés en
    // pratique) — le temps réel chronométré (exercices + sessions Leitner) a d'abord été ajouté
    // au temps planifié, puis le temps planifié a été abandonné (une case cochée par
    // l'utilisateur ne garantit ni qu'il a révisé, ni combien de temps) : totalMinutes ne
    // reflète plus désormais que le temps réellement chronométré, cartes mentales incluses.
    it('totalMinutes ne compte que le temps réel chronométré (exercices + Leitner + cartes mentales), pas les créneaux planifiés', async () => {
      RevisionSession.findAll.mockResolvedValue([session(today, true, '09:00:00', '09:30:00')]) // 30 min planifiées — ignorées
      TestResult.findAll.mockResolvedValue([
        testResult(8, 10, '2026-06-20T10:00:00Z', 'Test', 1, 300), // 5 min
        testResult(5, 10, '2026-06-21T10:00:00Z', 'Test', 1, 120)  // 2 min
      ])
      LeitnerSystem.findAll.mockResolvedValue([])
      LeitnerReviewSession.findAll.mockResolvedValue([leitnerReviewSession(180)]) // 3 min
      MindMapViewSession.findAll.mockResolvedValue([mindMapViewSession(60)]) // 1 min

      const kpis = await kpiService.getMyKpis(1)

      expect(kpis.revision.totalMinutes).toBe(11) // 5 + 2 + 3 + 1 réelles, sans les 30 planifiées
    })

    it('totalMinutes ignore les durationSeconds absents (null) plutôt que de les compter comme 0 fautif', async () => {
      RevisionSession.findAll.mockResolvedValue([])
      TestResult.findAll.mockResolvedValue([testResult(8, 10, '2026-06-20T10:00:00Z', 'Test', 1, null)])
      LeitnerSystem.findAll.mockResolvedValue([])
      LeitnerReviewSession.findAll.mockResolvedValue([leitnerReviewSession(null)])
      MindMapViewSession.findAll.mockResolvedValue([mindMapViewSession(null)])

      const kpis = await kpiService.getMyKpis(1)

      expect(kpis.revision.totalMinutes).toBe(0)
    })
  })

  // ─── getPersonalKpisForSubjects ──────────────────────────────────────────────

  describe('getPersonalKpisForSubjects', () => {
    it('totalMinutes reflète le temps réel, restreint aux matières consenties', async () => {
      RevisionSession.findAll.mockResolvedValue([])
      TestResult.findAll.mockResolvedValue([testResult(8, 10, '2026-06-20T10:00:00Z', 'Test', 1, 60)])
      LeitnerSystem.findAll.mockResolvedValue([])
      LeitnerReviewSession.findAll.mockResolvedValue([leitnerReviewSession(60)])
      MindMapViewSession.findAll.mockResolvedValue([mindMapViewSession(60)])

      const kpis = await kpiService.getPersonalKpisForSubjects(1, [1])

      expect(kpis.revision.totalMinutes).toBe(3)
      // Le filtre par matière consentie doit être répercuté sur la requête Leitner
      // (via le système rattaché) et sur la requête cartes mentales (via la carte
      // rattachée), pas seulement sur les exercices.
      expect(LeitnerReviewSession.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 1 },
        include: [expect.objectContaining({ where: { subjectId: [1] } })]
      }))
      expect(MindMapViewSession.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 1 },
        include: [expect.objectContaining({ where: { subjectId: [1] } })]
      }))
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

    // totalMinutes n'est plus renvoyé par _computeRevision (voir NOTE dans le code) — il est
    // désormais calculé par l'appelant depuis _computeRealMinutes, testé plus bas.
    it('ne renvoie plus totalMinutes — calculé séparément par _computeRealMinutes', () => {
      const sessions = [session(today, true, '09:00:00', '10:30:00')]
      const r = kpiService._computeRevision(sessions)

      expect(r.totalMinutes).toBeUndefined()
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

  // ─── _computeRealMinutes ──────────────────────────────────────────────────────

  describe('_computeRealMinutes', () => {
    it('aucune donnée — retourne 0', () => {
      expect(kpiService._computeRealMinutes([], [], [])).toBe(0)
    })

    it('additionne les durées des exercices, des sessions Leitner et des consultations de cartes mentales, arrondies en minutes', () => {
      const testResults = [testResult(1, 1, undefined, 'T', 1, 90), testResult(1, 1, undefined, 'T', 1, 45)] // 135 s
      const sessions = [leitnerReviewSession(60)] // 60 s
      const mindMapSessions = [mindMapViewSession(30)] // 30 s
      // 225 s / 60 = 3.75 → arrondi à 4 min
      expect(kpiService._computeRealMinutes(testResults, sessions, mindMapSessions)).toBe(4)
    })

    it('ignore les durationSeconds null (résultats antérieurs au champ) sans les compter comme 0 fautif', () => {
      const testResults = [testResult(1, 1, undefined, 'T', 1, null), testResult(1, 1, undefined, 'T', 1, 120)]
      const sessions = [leitnerReviewSession(null)]
      const mindMapSessions = [mindMapViewSession(null)]
      expect(kpiService._computeRealMinutes(testResults, sessions, mindMapSessions)).toBe(2)
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
