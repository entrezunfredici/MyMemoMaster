const { LeitnerCard, LeitnerBox, Response } = require("../models");

class LeitnerCardService {
  async getCardsByBoxId(leitnerBoxId) {
    return await LeitnerCard.findAll({ where: { idBox: leitnerBoxId } });
  }

  async getCardById(id) {
    return await LeitnerCard.findByPk(id);
  }

  async addCard(data, userRights) {
    // Vérification des droits utilisateur
    if (userRights.canAdd) {
      // Carte ajoutée dans la boîte de niveau 0 avec fifo à true
      const leitnerBox = await LeitnerBox.findOne({ where: { level: 0 } });
      return await LeitnerCard.create({
        ...data,
        fifo: true,
        idBox: leitnerBox.idBox,
      });
    }
    throw new Error("User does not have permission to add a card.");
  }

  async updateCard(id, data, userRights) {
    const card = await LeitnerCard.findByPk(id);
    if (card && userRights.canEdit) {
      await card.update(data);
      return card;
    }
    return null;
  }

  async correctResponse(cardId, responseId) {
    const card = await LeitnerCard.findByPk(cardId);
    const response = await Response.findByPk(responseId);

    if (!card || !response) return null;

    const isCorrect = response.content === response.correction;

    // Mise à jour de la boîte en fonction de la correction
    const newLevel = isCorrect ? card.idBox + 1 : Math.max(card.idBox - 1, 0);
    const nextBox = await LeitnerBox.findOne({ where: { level: newLevel } });

    card.update({
      idBox: nextBox ? nextBox.idBox : card.idBox,
      fifo: true,
      dateTimeFifo: new Date(Date.now() + nextBox.intervall * 1000),
    });

    return { success: isCorrect, correction: response.correction };
  }

  async deleteCard(id, userRights) {
    const card = await LeitnerCard.findByPk(id);
    if (card && userRights.canDelete) {
      await card.destroy();
      return true;
    }
    return false;
  }
}

module.exports = new LeitnerCardService();
