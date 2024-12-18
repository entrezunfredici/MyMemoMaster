const subjectService = require("../services/Subject.service.js");

exports.findAll = async (req, res) => {
  try {
    const data = await subjectService.findAll();
    res.status(200).send(data);
  } catch (error) {
    res
      .status(500)
      .send({ message: "Erreur lors de la récupération des sujets." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const data = await subjectService.findOne(req.params.id);
    if (!data) {
      res
        .status(404)
        .send({ message: `Sujet introuvable pour l'ID ${req.params.id}.` });
    } else {
      res.status(200).send(data);
    }
  } catch (error) {
    res.status(500).send({ message: "Erreur interne du serveur." });
  }
};

exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    const data = await subjectService.create({ name });
    res.status(201).send(data);
  } catch (error) {
    res.status(500).send({ message: "Erreur lors de la création du sujet." });
  }
};

exports.update = async (req, res) => {
  try {
    const updatedSubject = await subjectService.update(req.params.id, req.body);
    if (!updatedSubject) {
      res
        .status(404)
        .send({ message: `Sujet introuvable pour l'ID ${req.params.id}.` });
    } else {
      res.status(200).send(updatedSubject);
    }
  } catch (error) {
    res
      .status(500)
      .send({ message: "Erreur lors de la mise à jour du sujet." });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await subjectService.delete(req.params.id);
    if (!deleted) {
      res
        .status(404)
        .send({ message: `Sujet introuvable pour l'ID ${req.params.id}.` });
    } else {
      res.status(200).send({ message: "Sujet supprimé avec succès." });
    }
  } catch (error) {
    res
      .status(500)
      .send({ message: "Erreur lors de la suppression du sujet." });
  }
};
