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
      // Carte ajoutée dans la boite de niveau 0 avec fifo à true
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

    if (!card || !response || response.idQuestion !== card.idQuestion) {
      return null;
    }

    const currentBox = await LeitnerBox.findByPk(card.idBox);
    if (!currentBox) {
      return null;
    }

    const correction = await Response.findOne({
      where: { idQuestion: card.idQuestion, correction: true },
    });
    if (!correction) {
      return null;
    }

    const isCorrect = response.idResponse === correction.idResponse;

    const targetLevel = isCorrect
      ? currentBox.level + 1
      : Math.max(currentBox.level - 1, 1);

    const targetBox = await LeitnerBox.findOne({
      where: {
        level: targetLevel,
        idSystem: currentBox.idSystem ?? null,
      },
    });

    const destinationBox = targetBox || currentBox;

    await card.update({
      idBox: destinationBox.idBox,
      fifo: false,
      dateTimeFifo: new Date(Date.now() + destinationBox.intervall * 1000),
    });

    return {
      success: isCorrect,
      correction: correction ? correction.content : null,
    };
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
