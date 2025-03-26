const fieldService = require("../services/Fields.service.js");

exports.findAll = async (req, res) => {
    try {
        const data = await fieldService.findAll();
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({
            message: error.message || "Une erreur s'est produite lors de la récupération des champs.",
        });
    }
};

exports.findOne = async (req, res) => {
    try {
        const data = await fieldService.findOne(req.params.id);
        if (!data) {
            res.status(404).send({
                message: `Champ introuvable pour l'identifiant ${req.params.id}.`,
            });
        } else {
            res.status(200).send(data);
        }
    } catch (error) {
        res.status(500).send({
            message: error.message || `Erreur lors de la récupération du champ avec l'identifiant ${req.params.id}.`,
        });
    }
};

exports.create = async (req, res) => {
    try {
        const { fieldletter, idType, data } = req.body;
        if (!fieldletter || !idType) {
            return res.status(400).send({ message: "Les champs 'fieldletter' et 'idType' sont requis." });
        }

        const newField = await fieldService.create({ fieldletter, idType, data });
        res.status(201).send(newField);
    } catch (error) {
        res.status(500).send({
            message: error.message || "Une erreur s'est produite lors de la création du champ.",
        });
    }
};

exports.update = async (req, res) => {
    try {
        const updatedField = await fieldService.update(req.params.id, req.body);
        if (!updatedField) {
            res.status(404).send({
                message: `Champ introuvable pour l'identifiant ${req.params.id}.`,
            });
        } else {
            res.status(200).send(updatedField);
        }
    } catch (error) {
        res.status(500).send({
            message: error.message || "Une erreur s'est produite lors de la mise à jour du champ.",
        });
    }
};

exports.delete = async (req, res) => {
    try {
        const deleted = await fieldService.delete(req.params.id);
        if (!deleted) {
            res.status(404).send({
                message: `Champ introuvable pour l'identifiant ${req.params.id}.`,
            });
        } else {
            res.status(204).send();
        }
    } catch (error) {
        res.status(500).send({
            message: error.message || "Une erreur s'est produite lors de la suppression du champ.",
        });
    }
};
