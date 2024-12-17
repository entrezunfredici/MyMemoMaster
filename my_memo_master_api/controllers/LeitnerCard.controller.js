const leitnerCardService = require("../services/LeitnerCard.service");

exports.getCardsByBoxId = async (req, res) => {
  const { leitnerboxid } = req.params;
  const cards = await leitnerCardService.getCardsByBoxId(leitnerboxid);
  res.status(200).json(cards);
};

exports.getCardById = async (req, res) => {
  const card = await leitnerCardService.getCardById(req.params.id);
  if (!card) res.status(404).json({ message: "Card not found" });
  else res.status(200).json(card);
};

exports.addCard = async (req, res) => {
  try {
    const card = await leitnerCardService.addCard(req.body, req.user.rights);
    res.status(201).json(card);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

exports.updateCard = async (req, res) => {
  const card = await leitnerCardService.updateCard(
    req.params.id,
    req.body,
    req.user.rights
  );
  if (!card)
    res.status(403).json({ message: "No permission or card not found" });
  else res.status(200).json(card);
};

exports.correctResponse = async (req, res) => {
  const result = await leitnerCardService.correctResponse(
    req.body.cardId,
    req.body.responseId,
    req.body.responseTime
  );
  res.status(200).json(result);
};

exports.deleteCard = async (req, res) => {
  const result = await leitnerCardService.deleteCard(
    req.params.id,
    req.user.rights
  );
  if (!result)
    res.status(403).json({ message: "No permission or card not found" });
  else res.status(200).json({ message: "Card deleted" });
};
