const subjectService = require("../services/Subject.service.js");

exports.findAll = async (req, res) => {
  try {
    const data = await subjectService.findAll();
    res.status(200).send(data);
  } catch (error) {
    res.status(500).send({
      message:
        error ||
        "Une erreur s'est produite lors de la récupération des sujets.",
    });
  }
};

exports.findOne = async (req, res) => {
  try {
    const data = await subjectService.findOne(req.params.id);
    if (!data) {
      res.status(404).send({
        message: `Sujet introuvable pour l'identifiant ${req.params.id}.`,
      });
    } else {
      res.status(200).send(data);
    }
  } catch (error) {
    res.status(500).send({
      message: error || `Erreur lors de la récupération du sujet avec l'identifiant ${req.params.id}.`,
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    const data = await subjectService.create({ name });
    res.status(201).send(data);
  } catch (error) {
    res.status(500).send({
      message: error || "Une erreur s'est produite lors de la création du sujet.",
    });
  }
};
