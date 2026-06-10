const LeitnerCardService = require("../../services/LeitnerCard.service");
const { LeitnerCard, LeitnerBox, Response, LeitnerSystem, LeitnerSystemsUsers } = require("../../models");

jest.mock("../../models", () => ({
  LeitnerCard: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    update: jest.fn(),
  },
  LeitnerBox: {
    findOne: jest.fn(),
  },
  Question: {},
  Response: {
    findAll: jest.fn(),
  },
  LeitnerSystem: {
    findOne: jest.fn(),
  },
  LeitnerSystemsUsers: {
    findOne: jest.fn(),
  },
}));

jest.mock("../../services/Semantic.service", () => ({
  gradeSemantic: jest.fn(),
}));

const semanticService = require("../../services/Semantic.service");

describe("LeitnerCardService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── getCardsByBoxId ────────────────────────────────────────────────────────

  test("getCardsByBoxId - données valides - retourne les cartes de la boîte", async () => {
    LeitnerCard.findAll.mockResolvedValue([{ idCard: 1, idBox: 2 }]);

    const result = await LeitnerCardService.getCardsByBoxId(2);

    expect(LeitnerCard.findAll).toHaveBeenCalledWith({
      where: { idBox: 2 },
      include: [expect.objectContaining({ as: "question" })],
    });
    expect(result).toEqual([{ idCard: 1, idBox: 2 }]);
  });

  // ─── getCardById ────────────────────────────────────────────────────────────

  test("getCardById - ID valide - retourne la carte avec ses associations", async () => {
    const mockCard = { idCard: 1, fifo: true };
    LeitnerCard.findByPk.mockResolvedValue(mockCard);

    const result = await LeitnerCardService.getCardById(1);

    expect(LeitnerCard.findByPk).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({ as: "leitnerBox" }),
          expect.objectContaining({ as: "question" }),
        ]),
      })
    );
    expect(result).toEqual(mockCard);
  });

  // ─── getDueCards ────────────────────────────────────────────────────────────

  test("getDueCards - données valides - retourne les cartes dues pour un système", async () => {
    const mockCards = [
      { idCard: 1, next_review_at: new Date("2026-06-09") },
      { idCard: 2, next_review_at: null },
    ];
    LeitnerCard.findAll.mockResolvedValue(mockCards);

    const result = await LeitnerCardService.getDueCards(1);

    expect(LeitnerCard.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({ as: "leitnerBox", where: { idSystem: 1 } }),
        ]),
      })
    );
    expect(result).toEqual(mockCards);
  });

  // ─── addCard ────────────────────────────────────────────────────────────────

  test("addCard - droits valides - crée une carte en boîte niveau 1 du système", async () => {
    const mockBox = { idBox: 1, level: 1 };
    const mockCard = { idCard: 1, fifo: true, idBox: 1 };
    LeitnerBox.findOne.mockResolvedValue(mockBox);
    LeitnerCard.create.mockResolvedValue(mockCard);

    const result = await LeitnerCardService.addCard(
      { idQuestion: 1, idSystem: 5 },
      { canAdd: true }
    );

    expect(LeitnerBox.findOne).toHaveBeenCalledWith({
      where: { level: 1, idSystem: 5 },
    });
    expect(LeitnerCard.create).toHaveBeenCalledWith({
      idQuestion: 1,
      idSystem: 5,
      fifo: true,
      idBox: mockBox.idBox,
      next_review_at: null,
      last_review_at: null,
      review_count: 0,
      correct_count: 0,
      incorrect_count: 0,
    });
    expect(result).toEqual(mockCard);
  });

  test("addCard - droits insuffisants - lève une erreur", async () => {
    await expect(
      LeitnerCardService.addCard({ idQuestion: 1, idSystem: 5 }, { canAdd: false })
    ).rejects.toThrow("Droits insuffisants pour ajouter une carte.");

    expect(LeitnerBox.findOne).not.toHaveBeenCalled();
  });

  test("addCard - boîte niveau 1 introuvable - lève une erreur", async () => {
    LeitnerBox.findOne.mockResolvedValue(null);

    await expect(
      LeitnerCardService.addCard({ idQuestion: 1, idSystem: 5 }, { canAdd: true })
    ).rejects.toThrow("Boîte de niveau 1 introuvable pour ce système.");
  });

  // ─── updateCard ─────────────────────────────────────────────────────────────

  test("updateCard - droits valides - met à jour la carte", async () => {
    const mockCard = {
      idCard: 1,
      idQuestion: 10,
      update: jest.fn().mockResolvedValue(true),
    };
    LeitnerCard.findByPk.mockResolvedValue(mockCard);

    const result = await LeitnerCardService.updateCard(1, { idQuestion: 42 }, { canEdit: true });

    expect(LeitnerCard.findByPk).toHaveBeenCalledWith(1);
    expect(mockCard.update).toHaveBeenCalledWith({ idQuestion: 42 });
    expect(result).toEqual(mockCard);
  });

  test("updateCard - droits insuffisants - retourne null sans modifier", async () => {
    const mockCard = { idCard: 1, idQuestion: 10, update: jest.fn() };
    LeitnerCard.findByPk.mockResolvedValue(mockCard);

    const result = await LeitnerCardService.updateCard(1, { idQuestion: 42 }, { canEdit: false });

    expect(mockCard.update).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test("updateCard - carte introuvable - retourne null", async () => {
    LeitnerCard.findByPk.mockResolvedValue(null);

    const result = await LeitnerCardService.updateCard(999, { idQuestion: 42 }, { canEdit: true });

    expect(result).toBeNull();
  });

  // ─── correctResponse ────────────────────────────────────────────────────────

  test("correctResponse - bonne réponse - avance à la boîte suivante et incrémente correct_count", async () => {
    const mockCard = {
      idCard: 1,
      idBox: 1,
      idQuestion: 42,
      leitnerBox: { level: 1, idSystem: 10 },
      review_count: 0,
      correct_count: 0,
      incorrect_count: 0,
      update: jest.fn(),
    };
    const mockBox = { idBox: 2, intervall: 1000 };
    const mockGradeResult = {
      is_correct: true,
      score: 0.92,
      explanation: "Correct (similarity=0.92).",
      decision_zone: "high",
    };

    LeitnerCard.findByPk.mockResolvedValue(mockCard);
    Response.findAll.mockResolvedValue([{ content: "La bonne réponse" }]);
    semanticService.gradeSemantic.mockResolvedValue(mockGradeResult);
    LeitnerBox.findOne.mockResolvedValue(mockBox);

    const result = await LeitnerCardService.correctResponse(1, "ma réponse");

    expect(LeitnerBox.findOne).toHaveBeenCalledWith({ where: { level: 2, idSystem: 10 } });
    expect(mockCard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        idBox: 2,
        review_count: 1,
        correct_count: 1,
        incorrect_count: 0,
      })
    );
    expect(result).toEqual({
      success: true,
      correction: "La bonne réponse",
      score: 0.92,
      explanation: "Correct (similarity=0.92).",
      decision_zone: "high",
      newLevel: 2,
    });
  });

  test("correctResponse - mauvaise réponse - retour boîte 1 et incrémente incorrect_count", async () => {
    const mockCard = {
      idCard: 1,
      idBox: 3,
      idQuestion: 42,
      leitnerBox: { level: 3, idSystem: 10 },
      review_count: 5,
      correct_count: 3,
      incorrect_count: 1,
      update: jest.fn(),
    };
    const mockBox = { idBox: 1, intervall: 5 };
    const mockGradeResult = {
      is_correct: false,
      score: 0.2,
      explanation: "Incorrect (similarity=0.2).",
      decision_zone: "low",
    };

    LeitnerCard.findByPk.mockResolvedValue(mockCard);
    Response.findAll.mockResolvedValue([{ content: "La bonne réponse" }]);
    semanticService.gradeSemantic.mockResolvedValue(mockGradeResult);
    LeitnerBox.findOne.mockResolvedValue(mockBox);

    const result = await LeitnerCardService.correctResponse(1, "mauvaise réponse");

    // règle Leitner : retour au niveau 1 sur erreur, quel que soit le niveau actuel
    expect(LeitnerBox.findOne).toHaveBeenCalledWith({ where: { level: 1, idSystem: 10 } });
    expect(mockCard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        idBox: 1,
        review_count: 6,
        correct_count: 3,
        incorrect_count: 2,
      })
    );
    expect(result).toMatchObject({
      success: false,
      score: 0.2,
      newLevel: 1,
    });
  });

  test("correctResponse - bonne réponse en boîte 5 - reste en boîte 5 (plafonnement)", async () => {
    const mockCard = {
      idCard: 1,
      idBox: 5,
      idQuestion: 42,
      leitnerBox: { level: 5, idSystem: 10 },
      review_count: 10,
      correct_count: 8,
      incorrect_count: 2,
      update: jest.fn(),
    };
    const mockBox = { idBox: 5, intervall: 30 };
    const mockGradeResult = {
      is_correct: true,
      score: 0.98,
      explanation: "Correct.",
      decision_zone: "high",
    };

    LeitnerCard.findByPk.mockResolvedValue(mockCard);
    Response.findAll.mockResolvedValue([{ content: "Bonne réponse" }]);
    semanticService.gradeSemantic.mockResolvedValue(mockGradeResult);
    LeitnerBox.findOne.mockResolvedValue(mockBox);

    const result = await LeitnerCardService.correctResponse(1, "bonne réponse");

    // Math.min(5+1, 5) = 5 → reste sur la boîte 5
    expect(LeitnerBox.findOne).toHaveBeenCalledWith({ where: { level: 5, idSystem: 10 } });
    expect(mockCard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fifo: false, // niveau 5 → plus dans la file FIFO
        correct_count: 9,
        review_count: 11,
      })
    );
    expect(result).toMatchObject({ success: true, newLevel: 5 });
  });

  test("correctResponse - carte introuvable - retourne null", async () => {
    LeitnerCard.findByPk.mockResolvedValue(null);

    const result = await LeitnerCardService.correctResponse(999, "réponse");

    expect(result).toBeNull();
    expect(semanticService.gradeSemantic).not.toHaveBeenCalled();
  });

  test("correctResponse - aucune réponse correcte en base - retourne null sans grading", async () => {
    const mockCard = {
      idCard: 1,
      idBox: 1,
      idQuestion: 42,
      leitnerBox: { level: 1, idSystem: 10 },
      update: jest.fn(),
    };

    LeitnerCard.findByPk.mockResolvedValue(mockCard);
    Response.findAll.mockResolvedValue([]);

    const result = await LeitnerCardService.correctResponse(1, "réponse");

    expect(result).toBeNull();
    expect(semanticService.gradeSemantic).not.toHaveBeenCalled();
    expect(mockCard.update).not.toHaveBeenCalled();
  });

  test("correctResponse - next_review_at calculé depuis l'intervalle de la boîte cible", async () => {
    jest.useFakeTimers();
    const fixedNow = new Date("2026-06-10T12:00:00.000Z");
    jest.setSystemTime(fixedNow);

    const mockCard = {
      idCard: 1,
      idBox: 1,
      idQuestion: 42,
      leitnerBox: { level: 1, idSystem: 10 },
      review_count: 0,
      correct_count: 0,
      incorrect_count: 0,
      update: jest.fn(),
    };
    // intervalle = 3600 secondes (1 heure)
    const mockBox = { idBox: 2, intervall: 3600 };

    LeitnerCard.findByPk.mockResolvedValue(mockCard);
    Response.findAll.mockResolvedValue([{ content: "Bonne réponse" }]);
    semanticService.gradeSemantic.mockResolvedValue({
      is_correct: true,
      score: 0.9,
      explanation: "Correct.",
      decision_zone: "high",
    });
    LeitnerBox.findOne.mockResolvedValue(mockBox);

    await LeitnerCardService.correctResponse(1, "bonne réponse");

    const expectedNextReview = new Date(fixedNow.getTime() + 3600 * 1000);
    expect(mockCard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        next_review_at: expectedNextReview,
        last_review_at: fixedNow,
      })
    );

    jest.useRealTimers();
  });

  // ─── deleteCard ─────────────────────────────────────────────────────────────

  test("deleteCard - droits valides - supprime la carte et retourne true", async () => {
    const mockCard = { idCard: 1, destroy: jest.fn().mockResolvedValue(true) };
    LeitnerCard.findByPk.mockResolvedValue(mockCard);

    const result = await LeitnerCardService.deleteCard(1, { canDelete: true });

    expect(LeitnerCard.findByPk).toHaveBeenCalledWith(1);
    expect(mockCard.destroy).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test("deleteCard - droits insuffisants - retourne false sans supprimer", async () => {
    const mockCard = { idCard: 1, destroy: jest.fn() };
    LeitnerCard.findByPk.mockResolvedValue(mockCard);

    const result = await LeitnerCardService.deleteCard(1, { canDelete: false });

    expect(mockCard.destroy).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  test("deleteCard - carte introuvable - retourne false", async () => {
    LeitnerCard.findByPk.mockResolvedValue(null);

    const result = await LeitnerCardService.deleteCard(999, { canDelete: true });

    expect(result).toBe(false);
  });

  // ─── resolveUserRights ──────────────────────────────────────────────────────

  test("resolveUserRights - propriétaire du système - droits complets", async () => {
    LeitnerSystem.findOne.mockResolvedValue({ idSystem: 1, idUser: 2 });

    const rights = await LeitnerCardService.resolveUserRights(2, 1);

    expect(LeitnerSystem.findOne).toHaveBeenCalledWith({
      where: { idSystem: 1, idUser: 2 },
    });
    expect(rights).toEqual({ canAdd: true, canEdit: true, canDelete: true });
  });

  test("resolveUserRights - utilisateur partagé avec écriture - canAdd et canEdit true", async () => {
    LeitnerSystem.findOne.mockResolvedValue(null);
    LeitnerSystemsUsers.findOne.mockResolvedValue({
      writeRight: true,
      shareWithAllRights: false,
    });

    const rights = await LeitnerCardService.resolveUserRights(3, 1);

    expect(rights).toEqual({ canAdd: true, canEdit: true, canDelete: false });
  });

  test("resolveUserRights - utilisateur sans accès - aucun droit", async () => {
    LeitnerSystem.findOne.mockResolvedValue(null);
    LeitnerSystemsUsers.findOne.mockResolvedValue(null);

    const rights = await LeitnerCardService.resolveUserRights(99, 1);

    expect(rights).toEqual({ canAdd: false, canEdit: false, canDelete: false });
  });

  // ─── getCardSystem ──────────────────────────────────────────────────────────

  test("getCardSystem - carte valide - retourne l'idSystem via sa boîte", async () => {
    LeitnerCard.findByPk.mockResolvedValue({
      leitnerBox: { idSystem: 42 },
    });

    const result = await LeitnerCardService.getCardSystem(1);

    expect(LeitnerCard.findByPk).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({ as: "leitnerBox" }),
        ]),
      })
    );
    expect(result).toBe(42);
  });

  test("getCardSystem - carte introuvable - retourne null", async () => {
    LeitnerCard.findByPk.mockResolvedValue(null);

    const result = await LeitnerCardService.getCardSystem(999);

    expect(result).toBeNull();
  });
});
