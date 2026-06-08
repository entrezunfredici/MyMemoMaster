const { Op } = require("sequelize");
const dayjs = require("dayjs");
const { LeitnerCard, LeitnerBox, Question, Response, LeitnerSystem, LeitnerSystemsUsers } = require("../models");
const semanticService = require("./Semantic.service");

class LeitnerCardService {
  /**
   * Récupère toutes les cartes d'une boîte.
   *
   * @param {number} leitnerBoxId - ID de la boîte
   * @returns {Promise<LeitnerCard[]>}
   */
  async getCardsByBoxId(leitnerBoxId) {
    return await LeitnerCard.findAll({
      where: { idBox: leitnerBoxId },
      include: [{ model: Question, as: "question" }],
    });
  }

  /**
   * Récupère une carte par son ID.
   *
   * @param {number} id - ID de la carte
   * @returns {Promise<LeitnerCard|null>}
   */
  async getCardById(id) {
    return await LeitnerCard.findByPk(id, {
      include: [
        { model: LeitnerBox, as: "leitnerBox" },
        { model: Question, as: "question" },
      ],
    });
  }

  /**
   * Retourne les cartes d'un système dont la date de révision est atteinte ou dépassée.
   *
   * @param {number} systemId - ID du système Leitner
   * @returns {Promise<LeitnerCard[]>}
   */
  async getDueCards(systemId) {
    const now = dayjs().toDate();
    return await LeitnerCard.findAll({
      include: [
        {
          model: LeitnerBox,
          as: "leitnerBox",
          where: { idSystem: systemId },
          required: true,
        },
        { model: Question, as: "question" },
      ],
      where: {
        [Op.or]: [
          { next_review_at: { [Op.lte]: now } },
          { next_review_at: null },
        ],
      },
    });
  }

  /**
   * Ajoute une carte dans la boîte de niveau 1 du système.
   *
   * @param {object} data - Données de la carte (idQuestion, idSystem...)
   * @param {{ canAdd: boolean }} userRights - Droits de l'utilisateur
   * @returns {Promise<LeitnerCard>}
   * @throws {Error} Si l'utilisateur n'a pas les droits ou si la boîte niveau 1 est introuvable
   */
  async addCard(data, userRights) {
    if (!userRights.canAdd) {
      throw new Error("Droits insuffisants pour ajouter une carte.");
    }

    const box = await LeitnerBox.findOne({ where: { level: 1, idSystem: data.idSystem } });
    if (!box) throw new Error("Boîte de niveau 1 introuvable pour ce système.");

    return await LeitnerCard.create({
      ...data,
      fifo: true,
      idBox: box.idBox,
      next_review_at: null,
      last_review_at: null,
      review_count: 0,
      correct_count: 0,
      incorrect_count: 0,
    });
  }

  /**
   * Met à jour les données d'une carte.
   *
   * @param {number} id - ID de la carte
   * @param {object} data - Nouvelles données
   * @param {{ canEdit: boolean }} userRights - Droits de l'utilisateur
   * @returns {Promise<LeitnerCard|null>}
   */
  async updateCard(id, data, userRights) {
    const card = await LeitnerCard.findByPk(id);
    if (!card || !userRights.canEdit) return null;
    const { idQuestion } = data;
    await card.update({ idQuestion });
    return card;
  }

  /**
   * Traite la réponse à une carte et applique l'algorithme Leitner :
   * - Bonne réponse → boîte suivante (max niveau 5)
   * - Mauvaise réponse → retour boîte niveau 1
   * Met à jour next_review_at, les compteurs et last_review_at.
   * La correction est sémantique : on compare la réponse libre de l'étudiant
   * aux bonnes réponses enregistrées pour la question.
   *
   * @param {number} cardId - ID de la carte
   * @param {string} studentAnswer - Réponse saisie par l'étudiant
   * @returns {Promise<{ success: boolean, correction: string, score: number, explanation: string, decision_zone: string }|null>}
   */
  async correctResponse(cardId, studentAnswer) {
    const card = await LeitnerCard.findByPk(cardId, {
      include: [{ model: LeitnerBox, as: "leitnerBox" }],
    });

    if (!card) return null;

    const correctResponses = await Response.findAll({
      where: { idQuestion: card.idQuestion, correction: true },
    });

    if (correctResponses.length === 0) return null;

    const correctAnswers = correctResponses.map((r) => r.content);
    const gradeResult = await semanticService.gradeSemantic(correctAnswers, studentAnswer);
    const isCorrect = gradeResult.is_correct;

    const currentLevel = card.leitnerBox.level;
    const systemId = card.leitnerBox.idSystem;

    // CHOIX: retour au niveau 1 sur mauvaise réponse (règle Leitner classique)
    // plutôt que niveau - 1, pour renforcer la mémorisation des cartes oubliées
    const newLevel = isCorrect ? Math.min(currentLevel + 1, 5) : 1;

    const nextBox = await LeitnerBox.findOne({
      where: { level: newLevel, idSystem: systemId },
    });

    const now = dayjs();
    const nextReviewAt = nextBox
      ? now.add(nextBox.intervall, "second").toDate()
      : null;

    await card.update({
      idBox: nextBox ? nextBox.idBox : card.idBox,
      fifo: newLevel < 5,
      dateTimeFifo: nextReviewAt,
      next_review_at: nextReviewAt,
      last_review_at: now.toDate(),
      review_count: card.review_count + 1,
      correct_count: isCorrect ? card.correct_count + 1 : card.correct_count,
      incorrect_count: isCorrect ? card.incorrect_count : card.incorrect_count + 1,
    });

    return {
      success: isCorrect,
      correction: correctAnswers.join(" / "),
      score: gradeResult.score,
      explanation: gradeResult.explanation,
      decision_zone: gradeResult.decision_zone,
    };
  }

  /**
   * Résout les droits d'un utilisateur sur un système Leitner.
   * Propriétaire du système → droits complets. Utilisateur partagé → droits depuis LeitnerSystemsUsers.
   *
   * @param {number} userId - ID de l'utilisateur
   * @param {number} idSystem - ID du système Leitner
   * @returns {Promise<{ canAdd: boolean, canEdit: boolean, canDelete: boolean }>}
   */
  async resolveUserRights(userId, idSystem) {
    const owned = await LeitnerSystem.findOne({ where: { idSystem, idUser: userId } });
    if (owned) return { canAdd: true, canEdit: true, canDelete: true };

    const shared = await LeitnerSystemsUsers.findOne({ where: { idUser: userId, idSystem } });
    if (!shared) return { canAdd: false, canEdit: false, canDelete: false };

    return {
      canAdd: shared.writeRight,
      canEdit: shared.writeRight,
      canDelete: shared.shareWithAllRights,
    };
  }

  /**
   * Retourne l'idSystem d'une carte via sa boîte.
   *
   * @param {number} cardId - ID de la carte
   * @returns {Promise<number|null>}
   */
  async getCardSystem(cardId) {
    const card = await LeitnerCard.findByPk(cardId, {
      include: [{ model: LeitnerBox, as: "leitnerBox" }],
    });
    return card?.leitnerBox?.idSystem ?? null;
  }

  /**
   * Supprime une carte.
   *
   * @param {number} id - ID de la carte
   * @param {{ canDelete: boolean }} userRights - Droits de l'utilisateur
   * @returns {Promise<boolean>}
   */
  async deleteCard(id, userRights) {
    const card = await LeitnerCard.findByPk(id);
    if (!card || !userRights.canDelete) return false;
    await card.destroy();
    return true;
  }
}

module.exports = new LeitnerCardService();
