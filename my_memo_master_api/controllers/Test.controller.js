const testService = require("../services/Test.service.js");

exports.findAll = async (req, res) => {
    try {
        const data = await testService.findAll();
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({
            message:
                error.message ||
                "Une erreur s'est produite lors de la récupération des tests.",
        });
    }
};

exports.findOne = async (req, res) => {
    try {
        const data = await testService.findOne(req.params.id);
        if (!data) {
            res.status(404).send({
                message: `Test introuvable pour l'identifiant ${req.params.id}.`,
            });
        } else {
            res.status(200).send(data);
        }
    } catch (error) {
        res.status(500).send({
            message: `Erreur lors de la récupération du test avec l'identifiant ${req.params.id}.`,
            error: error.message,
        });
    }
};

exports.create = async (req, res) => {
    try {
        const { subjectId,name } = req.body;
        const data = await testService.create({ subjectId,name });
        res.status(201).send(data);
    } catch (error) {
        res.status(500).send({
            message: "Une erreur s'est produite lors de la création du test.",
            error: error.message,
        });
    }
};

exports.update = async (req, res) => {
    try {
      const updatedTest = await testService.update(
        req.params.id,
        req.body
      );
      res.status(200).json(updatedTest);
    } catch (error) {
      res.status(500).send({
        message: "Une erreur s'est produite lors de la modification du test",
        error: error.message,
      });
    }
  },

  exports.delete = async (req, res) => {
    try {
      await testService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).send({
        message: "Une erreur s'est produite lors de la suppression du test",
        error: error.message,
      });
    }
  };