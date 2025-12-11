const eventService = require("../services/Event.service");

exports.create = async (req, res) => {
  try {
    const { title, description, startAt, endAt, type, location } = req.body;
    await eventService.create({ title, description, startAt, endAt, type, location });
    res.status(201).json({ message: "Êvénement créer avec succès." })
  } catch (error) {
    console.log(error?.message || error);
    res.status(500).send({ message: "Erreur lors de la création de l'évenement" });
  }
}