const ResponseService = require("../services/Response.service.js");

  exports.findAll = async (req, res) => {
    try {
      const responses = await ResponseService.findAll();
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
      const response = await ResponseService.findOne(req.params.id);
      if (!response) {
        res.status(404).send({
          message: `Réponse introuvable pour l'identifiant ${req.params.id}.`,
        });
      }else{
        res.status(200).send(response);
      }
    } catch (error) {
      console.error(error.message);
      res.status(500).send({
        message: `Erreur lors de la récupération de la reponse avec l'identifiant ${req.params.id}.`,
      });
    }
  };

  exports.create = async (req, res) => {
    try {
      const { name } = req.body
      const data = await ResponseService.create({name});
      res.status(201).send(data);
    } catch (error) {
      console.error(error.message);
      res.status(500).send({
        message: "Une erreur s'est produite lors de la création de la reponse.",
      });
    }
  },

  exports.update = async (req, res) => {
    try {
      const updatedResponse = await ResponseService.update(
        req.params.id,
        req.body
      );
      res.status(200).json(updatedResponse);
    } catch (error) {
      res.status(500).send({
        message: "Une erreur s'est produite lors de la modification de la reponse",
      });
    }
  },

  exports.delete = async (req, res) => {
    try {
      await ResponseService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error(error.message);
      res.status(500).send({
        message: "Une erreur s'est produite lors de la suppression de la reponse",
      });
    }
  };

