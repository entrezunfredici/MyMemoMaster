const express = require("express");
const leitnerSystemService = require("../services/LeitnerSystem.service.js");
exports.findAll = async (req, res) => {
  try {
    const data = await leitnerSystemService.findAll();
    res.status(200).send(data);
  } catch (error) {
    console.error(error.message);
    res.status(500).send({
      message:
        "Une erreur s'est produite lors de la récupération des systèmes de Leitner.",
    });
  }
};

exports.findBySubject = async (req, res) => {
  try {
    const { subjectid } = req.params;
    const data = await leitnerSystemService.findBySubject(subjectid);
    if (!data.length) {
      res.status(404).send({ message: "Aucun système trouvé pour ce sujet." });
    } else {
      res.status(200).send(data);
    }
  } catch (error) {
    res
      .status(500)
      .send({ message: "Erreur serveur lors de la récupération." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await leitnerSystemService.findOne(id);
    if (!data) {
      res.status(404).send({ message: `Système introuvable avec l'ID ${id}` });
    } else {
      res.status(200).send(data);
    }
  } catch (error) {
    res.status(500).send({ message: "Erreur serveur." });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, idUser, idMindMap, sujet } = req.body;

    // Validation des données reçues
    if (!name || !idUser) {
      return res
        .status(400)
        .json({ message: "Les champs name et idUser sont obligatoires." });
    }

    // Création du système dans la base de données
    const newSystem = await leitnerSystemService.create({
      name,
      idUser,
      idMindMap,
      sujet, // Sequelize gère JSON directement si la colonne est déclarée comme JSON
    });

    // Réponse avec le nouveau système créé
    return res.status(201).json(newSystem);
  } catch (error) {
    console.error("Erreur Sequelize :", error.message, error);
    return res.status(500).json({
      message: "Erreur lors de la création du système.",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { idUser, name, idMindMap } = req.body;

    const updated = await leitnerSystemService.update({
      idSystem: id,
      idUser,
      name,
      idMindMap,
    });

    if (!updated) {
      return res
        .status(404)
        .send({ message: `Système introuvable pour l'ID ${id}.` });
    }

    res.status(200).send({ message: "Système modifié avec succès." });
  } catch (error) {
    console.error("Erreur lors de la modification :", error.message);
    res.status(500).send({
      message: "Erreur lors de la modification.",
      error: error.message,
    });
  }
};

exports.share = async (req, res) => {
  try {
    const result = await leitnerSystemService.shareSystem(req.body);
    res.status(200).send(result);
  } catch (error) {
    res.status(403).send({ message: error.message || "Erreur de partage." });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const { idUser } = req.body;
    const deleted = await leitnerSystemService.delete(id, idUser);
    if (!deleted) {
      return res
        .status(403)
        .send({ message: "Accès refusé ou suppression impossible." });
    }
    res.status(200).send({ message: "Système supprimé avec succès." });
  } catch (error) {
    res.status(500).send({ message: "Erreur serveur lors de la suppression." });
  }
};
