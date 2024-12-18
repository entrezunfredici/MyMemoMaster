const DiagrammeService = require("../services/Diagramme.service.js");

  exports.findAll = async (req, res) => {
    try {
      const responses = await DiagrammeService.findAll();
      res.status(200).json(responses);
    } catch (error) {
      res.status(500).send({
        message:
          error.message || "Une erreur s'est produite lors de la récupération des réponses",
      });
    }
  };

  exports.findOne = async (req, res) => {
    try {
      const response = await DiagrammeService.findOne(req.params.id);
      if (!response) {
        res.status(404).send({
          message: `Réponse introuvable pour l'identifiant ${req.params.id}.`,
        });
      }else{
        res.status(200).send(response);
      }
    } catch (error) {
      res.status(500).send({
        message: `Erreur lors de la récupération du diagramme avec l'identifiant ${req.params.id}.`,
      });
    }
  };

  exports.create = async (req, res) => {
    try {
      const { name } = req.body
      const data = await DiagrammeService.create({name});
      res.status(201).send(data);
    } catch (error) {
      res.status(500).send({
        message: "Une erreur s'est produite lors de la création du diagramme.",
      });
    }
  },

  exports.update = async (req, res) => {
    try {
      const updatedDiagramme = await DiagrammeService.update(
        req.params.id,
        req.body
      );
      res.status(200).json(updatedDiagramme);
    } catch (error) {
      res.status(500).send({
        message: "Une erreur s'est produite lors de la modification du diagramme",
      });
    }
  },

  exports.delete = async (req, res) => {
    try {
      await DiagrammeService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).send({
        message: "Une erreur s'est produite lors de la suppression du diagramme",
      });
    }
  };

